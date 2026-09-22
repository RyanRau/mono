/// <reference path="../pb_data/types.d.ts" />

// Backs home-server/cdn-gateway: an access check the gateway calls with a
// viewer's own session token, and the service-only routes its indexer uses
// to keep media_files in step with the NAS (see
// pb_migrations/1789200000_media_files_and_tags.js for the schema).
//
// The admin/service checks are inlined into each handler rather than shared
// via a top-level helper -- PocketBase's JSVM does not reliably expose a
// `.pb.js` file's top-level declarations inside its own routerAdd callbacks
// (same constraint as llm.pb.js/admin.pb.js).

// Gateway-facing, but authenticated as the *viewer*: the gateway forwards
// the Authorization/pb_auth token it was sent, unchanged, so this answers
// "may whoever holds this token read the library" -- the gateway itself
// holds no credentials at all. Admin-only for now, the same audience as the
// media_files/media_tags collection rules.
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
