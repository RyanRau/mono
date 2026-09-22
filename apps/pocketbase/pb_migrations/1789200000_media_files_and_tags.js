/// <reference path="../pb_data/types.d.ts" />

// Metadata index for home-server/cdn-gateway: one media_files row per file
// under the NAS library root, keyed by its path relative to that root. The
// bytes themselves never live here -- `path` is the reference, and the
// gateway serves it at https://cdn.ryanzrau.dev/files/<path>.
//
// Rows are written by the indexer (home-server/cdn-gateway/indexer.py) via
// the service-only routes in pb_hooks/media.pb.js, never by collection
// create -- a file exists here because it exists on the NAS, not because
// someone POSTed it. A file that disappears from the NAS is flagged
// `missing` rather than deleted, so its tags and description survive a
// NAS that's briefly unmounted or a file that's moved back.
//
// Admin-only for now (`is_admin`), matching what the gateway itself allows
// -- see /api/custom/media/access in pb_hooks/media.pb.js. Admins may edit
// tags/description and correct EXIF-derived fields (taken_at, location),
// but not the fields that describe the file on disk; the update rule
// rejects a body that sets any of those.
migrate(
  (app) => {
    const adminOnly = "@request.auth.is_admin = true";

    const tags = new Collection({
      type: "base",
      name: "media_tags",
      fields: [
        { type: "text", name: "name", required: true, max: 60 },
        { type: "autodate", name: "created", onCreate: true },
      ],
      indexes: ["CREATE UNIQUE INDEX idx_media_tags_name ON media_tags (name)"],
      listRule: adminOnly,
      viewRule: adminOnly,
      createRule: adminOnly,
      updateRule: adminOnly,
      deleteRule: adminOnly,
    });
    app.save(tags);

    app.save(
      new Collection({
        type: "base",
        name: "media_files",
        fields: [
          { type: "text", name: "path", required: true, max: 1024 },
          { type: "text", name: "name", required: true, max: 255 },
          {
            type: "select",
            name: "kind",
            required: true,
            maxSelect: 1,
            values: ["image", "video", "audio", "document", "other"],
          },
          { type: "text", name: "mime", max: 100 },
          { type: "number", name: "size", min: 0 },
          { type: "number", name: "mtime" },
          { type: "date", name: "taken_at" },
          { type: "number", name: "width", min: 0 },
          { type: "number", name: "height", min: 0 },
          // Searchable by radius with PocketBase's geoDistance() filter
          // function. Unknown location is {lon: 0, lat: 0} -- geoPoint has
          // no null -- so "has a location" is `location.lat != 0`.
          { type: "geoPoint", name: "location" },
          { type: "text", name: "camera", max: 200 },
          { type: "text", name: "description", max: 5000 },
          {
            type: "relation",
            name: "tags",
            collectionId: tags.id,
            maxSelect: 999,
          },
          { type: "bool", name: "missing" },
          { type: "autodate", name: "created", onCreate: true },
          { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
        ],
        indexes: [
          "CREATE UNIQUE INDEX idx_media_files_path ON media_files (path)",
          "CREATE INDEX idx_media_files_taken_at ON media_files (taken_at)",
          "CREATE INDEX idx_media_files_kind ON media_files (kind)",
        ],
        listRule: adminOnly,
        viewRule: adminOnly,
        createRule: null,
        updateRule:
          adminOnly +
          " && @request.body.path:isset = false" +
          " && @request.body.name:isset = false" +
          " && @request.body.kind:isset = false" +
          " && @request.body.mime:isset = false" +
          " && @request.body.size:isset = false" +
          " && @request.body.mtime:isset = false" +
          " && @request.body.missing:isset = false",
        deleteRule: null,
      })
    );
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId("media_files"));
    app.delete(app.findCollectionByNameOrId("media_tags"));
  }
);
