/// <reference path="../pb_data/types.d.ts" />

// Backs home-server/cdn-gateway, the shared file store for every app (see
// pb_migrations/1789200000_cdn_files.js for the schema and who can see what):
//   - POST /authorize: the gateway's per-request permission check, asked
//     with the viewer's own session token
//   - public paths and public collections (cdn_public)
//   - the service-only index routes the gateway and indexer.py use to keep
//     cdn_files in step with the NAS
//
// The admin/service checks are inlined into each handler rather than shared
// via a top-level helper -- PocketBase's JSVM does not reliably expose a
// `.pb.js` file's top-level declarations inside its own routerAdd callbacks
// (same constraint as llm.pb.js/admin.pb.js).

// Gateway-facing, but authenticated as the *viewer*: the gateway forwards
// the Authorization/pb_auth token it was sent, unchanged, so this answers
// for whoever holds that token -- never the gateway's own service account.
// Body: { op, path?, app? }:
//   - "session": just who this is ({ user_id, admin })
//   - "read":    may they view the file at `path`? Evaluates cdn_files'
//                own viewRule against the row, so the gateway and the
//                collection API always agree. No row (not indexed yet)
//                means admins only.
//   - "manage":  may they delete the file at `path`? Its owner, or admin.
//   - "upload":  may they upload into app `app`? Anyone granted that app
//                in registry_grants, or admin.
// Always 200 with { allowed, admin, user_id }; the gateway caches it.
routerAdd(
  "POST",
  "/api/custom/cdn/authorize",
  (e) => {
    const auth = e.requestInfo().auth;
    if (!auth || auth.collection().name !== "users" || auth.get("is_service") === true) {
      throw new ForbiddenError("A user session is required.");
    }
    const body = e.requestInfo().body;
    const admin = auth.get("is_admin") === true;
    const answer = (allowed) => e.json(200, { allowed: allowed, admin: admin, user_id: auth.id });

    if (admin || body.op === "session") {
      return answer(true);
    }

    if (body.op === "upload") {
      const grants = e.app.findRecordsByFilter(
        "registry_grants",
        "user = {:user} && app.slug = {:app}",
        "",
        1,
        0,
        { user: auth.id, app: body.app || "" }
      );
      return answer(grants.length > 0);
    }

    let record;
    try {
      record = e.app.findFirstRecordByData("cdn_files", "path", body.path || "");
    } catch (_) {
      return answer(false);
    }
    if (record.getBool("missing")) {
      return answer(false);
    }
    if (body.op === "manage") {
      return answer(record.getString("owner") === auth.id);
    }
    if (body.op === "read") {
      const rule = record.collection().viewRule;
      return answer(e.app.canAccessRecord(record, e.requestInfo(), rule));
    }
    throw new BadRequestError("Unknown op.");
  },
  $apis.requireAuth()
);

// Indexer-facing: what's already indexed, so the indexer only reads EXIF
// for new or changed files. Raw column select rather than records -- this
// is every row in the library, and only four columns are needed.
routerAdd(
  "GET",
  "/api/custom/cdn/index/state",
  (e) => {
    const auth = e.requestInfo().auth;
    if (!auth || auth.get("is_service") !== true) {
      throw new ForbiddenError("Service account access required.");
    }

    // DynamicModel infers each column's Go type from its placeholder, and a
    // bare 0 means int64 -- mtime is fractional seconds, so it needs a
    // non-integer placeholder to scan as a float.
    const rows = arrayOf(new DynamicModel({ path: "", size: 0, mtime: 0.5, missing: false }));
    e.app.db().select("path", "size", "mtime", "missing").from("cdn_files").all(rows);
    return e.json(200, {
      files: rows.map((r) => ({
        path: r.path,
        size: r.size,
        mtime: r.mtime,
        missing: r.missing,
      })),
    });
  },
  $apis.requireAuth()
);

// Gateway/indexer-facing: create-or-update rows by path. Body: { files: [{
// path, name, kind, mime, size, mtime, taken_at?, width?, height?,
// location?: { lat, lon }, camera?, app?, owner?, visibility? }] }.
// File-derived fields are written every time. app/owner/visibility only
// apply when the row is created (the uploader and the app it came from),
// and tags/description/sharing are never touched, so re-indexing a changed
// file keeps who can see it. A file that changed on disk does get its
// EXIF-derived fields (taken_at/location/camera/dimensions) overwritten.
// Returns { created, updated, ids: { path: record id } }.
routerAdd(
  "POST",
  "/api/custom/cdn/index/upsert",
  (e) => {
    const auth = e.requestInfo().auth;
    if (!auth || auth.get("is_service") !== true) {
      throw new ForbiddenError("Service account access required.");
    }

    const files = e.requestInfo().body.files || [];
    if (files.length > 500) {
      throw new BadRequestError("At most 500 files per request.");
    }
    const fileFields = [
      "name",
      "kind",
      "mime",
      "size",
      "mtime",
      "taken_at",
      "width",
      "height",
      "location",
      "camera",
    ];

    let created = 0;
    let updated = 0;
    const ids = {};
    e.app.runInTransaction((txApp) => {
      const collection = txApp.findCollectionByNameOrId("cdn_files");
      files.forEach((f) => {
        if (!f.path) {
          throw new BadRequestError("Every file needs a path.");
        }
        let record;
        try {
          record = txApp.findFirstRecordByData("cdn_files", "path", f.path);
          updated++;
        } catch (_) {
          record = new Record(collection, {
            path: f.path,
            app: f.app || "",
            owner: f.owner || "",
            visibility: f.visibility || "private",
          });
          created++;
        }
        fileFields.forEach((field) => {
          // Explicit null clears a field the new file no longer has (e.g.
          // GPS stripped on re-export); undefined leaves it alone.
          if (f[field] === null) {
            record.set(field, field === "location" ? { lon: 0, lat: 0 } : "");
          } else if (f[field] !== undefined) {
            record.set(field, f[field]);
          }
        });
        record.set("missing", false);
        txApp.save(record);
        ids[f.path] = record.id;
      });
    });

    return e.json(200, { created: created, updated: updated, ids: ids });
  },
  $apis.requireAuth()
);

// Indexer-facing: after a complete scan, the full set of paths that exist
// right now. Rows not in it are flagged missing; flagged rows that are back
// get unflagged. Only rows whose flag actually changes are written.
routerAdd(
  "POST",
  "/api/custom/cdn/index/sweep",
  (e) => {
    const auth = e.requestInfo().auth;
    if (!auth || auth.get("is_service") !== true) {
      throw new ForbiddenError("Service account access required.");
    }

    const present = {};
    (e.requestInfo().body.present || []).forEach((p) => {
      present[p] = true;
    });

    const rows = arrayOf(new DynamicModel({ id: "", path: "", missing: false }));
    e.app.db().select("id", "path", "missing").from("cdn_files").all(rows);

    let flagged = 0;
    let restored = 0;
    e.app.runInTransaction((txApp) => {
      rows.forEach((r) => {
        const isPresent = present[r.path] === true;
        if (isPresent === !r.missing) {
          return;
        }
        const record = txApp.findRecordById("cdn_files", r.id);
        record.set("missing", !isPresent);
        txApp.save(record);
        if (isPresent) {
          restored++;
        } else {
          flagged++;
        }
      });
    });

    return e.json(200, { flagged_missing: flagged, restored: restored });
  },
  $apis.requireAuth()
);

// Gateway-facing: everything anyone may read without signing in -- every
// cdn_public rule plus every file whose visibility is "public" -- for the
// gateway's local, deny-by-default public check. Service-only: the list
// itself is only something the owner needs to see.
routerAdd(
  "GET",
  "/api/custom/cdn/public-paths",
  (e) => {
    const auth = e.requestInfo().auth;
    if (!auth || auth.get("is_service") !== true) {
      throw new ForbiddenError("Service account access required.");
    }

    const rules = e.app.findRecordsByFilter("cdn_public", "", "", 0, 0).map((r) => ({
      path: r.getString("path"),
      folder: r.getBool("folder"),
    }));
    const rows = arrayOf(new DynamicModel({ path: "" }));
    e.app
      .db()
      .select("path")
      .from("cdn_files")
      .where($dbx.hashExp({ visibility: "public", missing: false }))
      .all(rows);
    rows.forEach((r) => rules.push({ path: r.path, folder: false }));
    return e.json(200, { rules: rules });
  },
  $apis.requireAuth()
);

// Public, no auth: the files in one named collection, for a page to render
// (e.g. ryanzrau.dev's home page listing "homepage"). Only ever returns
// files a cdn_public rule already makes servable by the gateway, and
// only display fields -- never tags, camera or location. A file is served
// at https://cdn.ryanzrau.dev/files/<path>.
routerAdd("GET", "/api/custom/cdn/public/{collection}", (e) => {
  const name = e.request.pathValue("collection");
  const rules = e.app.findRecordsByFilter("cdn_public", "collection = {:name}", "", 0, 0, {
    name: name,
  });
  if (rules.length === 0) {
    return e.json(200, { files: [] });
  }

  // One OR'd filter over every rule. A folder rule's LIKE pattern can
  // over-match (`_` is a LIKE wildcard, and paths may contain it), so
  // results are re-checked exactly below.
  const params = {};
  const clauses = rules.map((r, i) => {
    if (r.getBool("folder")) {
      params["p" + i] = r.getString("path") + "/%";
      return "path ~ {:p" + i + "}";
    }
    params["p" + i] = r.getString("path");
    return "path = {:p" + i + "}";
  });
  const covered = (path) =>
    rules.some((r) =>
      r.getBool("folder")
        ? path.startsWith(r.getString("path") + "/")
        : path === r.getString("path")
    );

  const records = e.app.findRecordsByFilter(
    "cdn_files",
    "missing = false && (" + clauses.join(" || ") + ")",
    "-taken_at,path",
    500,
    0,
    params
  );
  const files = records
    .filter((r) => covered(r.getString("path")))
    .map((r) => ({
      path: r.getString("path"),
      name: r.getString("name"),
      kind: r.getString("kind"),
      mime: r.getString("mime"),
      width: r.getInt("width"),
      height: r.getInt("height"),
      taken_at: r.getString("taken_at"),
      description: r.getString("description"),
    }));
  return e.json(200, { files: files });
});

// Gateway-facing: a file or folder was moved/renamed through the gateway.
// Body: { from, to }. Rewrites the path of the row itself and of every row
// under it (for a folder), and of any cdn_public rule pointing there, so
// tags, descriptions and sharing follow the file instead of being orphaned.
// A stale `missing` row already sitting at a destination path (a file
// deleted from there earlier) is replaced.
routerAdd(
  "POST",
  "/api/custom/cdn/index/move",
  (e) => {
    const auth = e.requestInfo().auth;
    if (!auth || auth.get("is_service") !== true) {
      throw new ForbiddenError("Service account access required.");
    }

    const body = e.requestInfo().body;
    const from = body.from || "";
    const to = body.to || "";
    if (!from || !to) {
      throw new BadRequestError("from and to are required.");
    }
    const renamed = (path) => (path === from ? to : to + path.substring(from.length));

    let moved = 0;
    e.app.runInTransaction((txApp) => {
      ["cdn_files", "cdn_public"].forEach((collection) => {
        const records = txApp.findRecordsByFilter(
          collection,
          "path = {:from} || path ~ {:prefix}",
          "",
          0,
          0,
          { from: from, prefix: from + "/%" }
        );
        records
          .filter((r) => r.getString("path") === from || r.getString("path").startsWith(from + "/"))
          .forEach((r) => {
            const dest = renamed(r.getString("path"));
            if (collection === "cdn_files") {
              try {
                const stale = txApp.findFirstRecordByData("cdn_files", "path", dest);
                txApp.delete(stale);
              } catch (_) {
                // nothing at the destination -- the usual case
              }
              moved++;
            }
            r.set("path", dest);
            txApp.save(r);
          });
      });
    });

    return e.json(200, { moved: moved });
  },
  $apis.requireAuth()
);

// Gateway-facing: a file or folder was deleted (moved to the gateway's
// trash) through the gateway. Body: { path }. Flags its rows missing --
// same as the indexer would on its next sweep, just immediately -- and
// drops any public-sharing rule for it, so a new file later created at the
// same path doesn't silently inherit being public.
routerAdd(
  "POST",
  "/api/custom/cdn/index/remove",
  (e) => {
    const auth = e.requestInfo().auth;
    if (!auth || auth.get("is_service") !== true) {
      throw new ForbiddenError("Service account access required.");
    }

    const path = e.requestInfo().body.path || "";
    if (!path) {
      throw new BadRequestError("path is required.");
    }
    const under = (p) => p === path || p.startsWith(path + "/");

    let flagged = 0;
    e.app.runInTransaction((txApp) => {
      ["cdn_files", "cdn_public"].forEach((collection) => {
        txApp
          .findRecordsByFilter(collection, "path = {:path} || path ~ {:prefix}", "", 0, 0, {
            path: path,
            prefix: path + "/%",
          })
          .filter((r) => under(r.getString("path")))
          .forEach((r) => {
            if (collection === "cdn_public") {
              txApp.delete(r);
            } else if (!r.getBool("missing")) {
              r.set("missing", true);
              txApp.save(r);
              flagged++;
            }
          });
      });
    });

    return e.json(200, { flagged_missing: flagged });
  },
  $apis.requireAuth()
);
