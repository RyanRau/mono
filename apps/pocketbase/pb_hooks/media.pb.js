/// <reference path="../pb_data/types.d.ts" />

// Backs home-server/cdn-gateway: an access check the gateway calls with a
// viewer's own session token, the public-sharing routes (media_public), and
// the service-only routes the gateway and its indexer use to keep
// media_files in step with the NAS (see
// pb_migrations/1789200000_media_files_and_tags.js for the schema).
//
// The admin/service checks are inlined into each handler rather than shared
// via a top-level helper -- PocketBase's JSVM does not reliably expose a
// `.pb.js` file's top-level declarations inside its own routerAdd callbacks
// (same constraint as llm.pb.js/admin.pb.js).

// Gateway-facing, but authenticated as the *viewer*: the gateway forwards
// the Authorization/pb_auth token it was sent, unchanged, so this answers
// "may whoever holds this token read the library" -- never the gateway's
// own service account. Admin-only, the same audience as the media_*
// collection rules; everyone else only sees what media_public shares.
routerAdd(
  "GET",
  "/api/custom/media/access",
  (e) => {
    const auth = e.requestInfo().auth;
    if (!auth || auth.get("is_admin") !== true) {
      throw new ForbiddenError("Media library access required.");
    }
    return e.json(200, { user_id: auth.id });
  },
  $apis.requireAuth()
);

// Indexer-facing: what's already indexed, so the indexer only reads EXIF
// for new or changed files. Raw column select rather than records -- this
// is every row in the library, and only four columns are needed.
routerAdd(
  "GET",
  "/api/custom/media/index/state",
  (e) => {
    const auth = e.requestInfo().auth;
    if (!auth || auth.get("is_service") !== true) {
      throw new ForbiddenError("Service account access required.");
    }

    // DynamicModel infers each column's Go type from its placeholder, and a
    // bare 0 means int64 -- mtime is fractional seconds, so it needs a
    // non-integer placeholder to scan as a float.
    const rows = arrayOf(new DynamicModel({ path: "", size: 0, mtime: 0.5, missing: false }));
    e.app.db().select("path", "size", "mtime", "missing").from("media_files").all(rows);
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

// Indexer-facing: create-or-update rows by path. Body: { files: [{ path,
// name, kind, mime, size, mtime, taken_at?, width?, height?,
// location?: { lat, lon }, camera? }] }. Only file-derived fields are written -- tags and
// description are never touched, so re-indexing a changed file keeps them.
// A file that changed on disk does get its EXIF-derived fields
// (taken_at/location/camera/dimensions) overwritten from the new file.
routerAdd(
  "POST",
  "/api/custom/media/index/upsert",
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
    e.app.runInTransaction((txApp) => {
      const collection = txApp.findCollectionByNameOrId("media_files");
      files.forEach((f) => {
        if (!f.path) {
          throw new BadRequestError("Every file needs a path.");
        }
        let record;
        try {
          record = txApp.findFirstRecordByData("media_files", "path", f.path);
          updated++;
        } catch (_) {
          record = new Record(collection, { path: f.path });
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
      });
    });

    return e.json(200, { created: created, updated: updated });
  },
  $apis.requireAuth()
);

// Indexer-facing: after a complete scan, the full set of paths that exist
// right now. Rows not in it are flagged missing; flagged rows that are back
// get unflagged. Only rows whose flag actually changes are written.
routerAdd(
  "POST",
  "/api/custom/media/index/sweep",
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
    e.app.db().select("id", "path", "missing").from("media_files").all(rows);

    let flagged = 0;
    let restored = 0;
    e.app.runInTransaction((txApp) => {
      rows.forEach((r) => {
        const isPresent = present[r.path] === true;
        if (isPresent === !r.missing) {
          return;
        }
        const record = txApp.findRecordById("media_files", r.id);
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

// Gateway-facing: every public-sharing rule, for the gateway's local
// "is this path public" check. Service-only rather than public -- the list
// of shared folders is itself something only the owner needs to see.
routerAdd(
  "GET",
  "/api/custom/media/public-rules",
  (e) => {
    const auth = e.requestInfo().auth;
    if (!auth || auth.get("is_service") !== true) {
      throw new ForbiddenError("Service account access required.");
    }

    const rules = e.app.findRecordsByFilter("media_public", "", "", 0, 0).map((r) => ({
      path: r.getString("path"),
      folder: r.getBool("folder"),
    }));
    return e.json(200, { rules: rules });
  },
  $apis.requireAuth()
);

// Public, no auth: the files in one named collection, for a page to render
// (e.g. ryanzrau.dev's home page listing "homepage"). Only ever returns
// files a media_public rule already makes servable by the gateway, and
// only display fields -- never tags, camera or location. A file is served
// at https://cdn.ryanzrau.dev/files/<path>.
routerAdd("GET", "/api/custom/media/public/{collection}", (e) => {
  const name = e.request.pathValue("collection");
  const rules = e.app.findRecordsByFilter("media_public", "collection = {:name}", "", 0, 0, {
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
    "media_files",
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
// under it (for a folder), and of any media_public rule pointing there, so
// tags, descriptions and sharing follow the file instead of being orphaned.
// A stale `missing` row already sitting at a destination path (a file
// deleted from there earlier) is replaced.
routerAdd(
  "POST",
  "/api/custom/media/index/move",
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
      ["media_files", "media_public"].forEach((collection) => {
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
            if (collection === "media_files") {
              try {
                const stale = txApp.findFirstRecordByData("media_files", "path", dest);
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
  "/api/custom/media/index/remove",
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
      ["media_files", "media_public"].forEach((collection) => {
        txApp
          .findRecordsByFilter(collection, "path = {:path} || path ~ {:prefix}", "", 0, 0, {
            path: path,
            prefix: path + "/%",
          })
          .filter((r) => under(r.getString("path")))
          .forEach((r) => {
            if (collection === "media_public") {
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
