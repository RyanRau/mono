/// <reference path="../pb_data/types.d.ts" />

// The shared file store behind home-server/cdn-gateway: one cdn_files row
// per file under the NAS library root, keyed by its path relative to that
// root. The bytes never live here -- the gateway serves `path` at
// https://cdn.ryanzrau.dev/files/<path>. Every app stores its files here
// (under apps/<app slug>/ on the NAS) and references them by record id, so
// a rename or move never breaks an app.
//
// Rows are written only through the service-only routes in
// pb_hooks/cdn.pb.js (by the gateway after an upload/move/delete, and by
// indexer.py for files that arrive on the NAS some other way), never by
// collection create -- a row exists because a file exists. A file that
// disappears is flagged `missing` rather than deleted, so its metadata
// survives a NAS that's briefly unmounted.
//
// Who can see a file (read by the gateway via /api/custom/cdn/authorize,
// which evaluates this same viewRule, so the two can't disagree):
//   - admins (`is_admin`): everything
//   - the owner (who uploaded it)
//   - visibility "shared": the users in shared_with
//   - visibility "app": everyone granted the file's app (registry_grants)
//   - visibility "public": anyone, signed in or not -- the gateway serves
//     it without a session. Signed-out visitors get the file itself, not
//     this row (its GPS location etc.); only signed-in users can read rows.
//   - "private": the owner (and admins) only.
// cdn_public adds named public collections ("homepage") on top: a file or
// a whole folder, public and listable by
// GET /api/custom/cdn/public/<collection> for a page to render.
//
// The owner or an admin can edit visibility, shared_with, tags,
// description and the EXIF-derived fields; nobody can edit the fields that
// describe the file on disk (the update rule rejects a body setting them),
// and only an admin can change owner or app.
migrate(
  (app) => {
    const adminOnly = "@request.auth.is_admin = true";
    const signedIn = '@request.auth.id != ""';
    const usersId = app.findCollectionByNameOrId("users").id;

    const tags = new Collection({
      type: "base",
      name: "cdn_tags",
      fields: [
        { type: "text", name: "name", required: true, max: 60 },
        { type: "autodate", name: "created", onCreate: true },
      ],
      indexes: ["CREATE UNIQUE INDEX idx_cdn_tags_name ON cdn_tags (name)"],
      // One shared vocabulary: any signed-in user can see and add tag
      // names; only admins rename or delete them.
      listRule: signedIn,
      viewRule: signedIn,
      createRule: signedIn,
      updateRule: adminOnly,
      deleteRule: adminOnly,
    });
    app.save(tags);

    // The alias makes both registry_grants conditions apply to the same
    // grant row, not "some grant for this user" and "some grant for this
    // app" separately.
    //
    // shared_with is matched with `~` (contains, on the stored id list)
    // rather than `shared_with.id ?=`: in PocketBase 0.39 that relation join
    // combined with the registry_grants join above makes list queries
    // return nothing at all (each works alone). `~` is exact here because
    // every record id is 15 random characters, so one id can't match
    // inside another, and signedIn rules out an empty @request.auth.id.
    const readRule =
      signedIn +
      " && (" +
      adminOnly +
      " || owner = @request.auth.id" +
      ' || visibility = "public"' +
      ' || (visibility = "shared" && shared_with ~ @request.auth.id)' +
      ' || (visibility = "app" && app != ""' +
      " && @collection.registry_grants:grant.user ?= @request.auth.id" +
      " && @collection.registry_grants:grant.app.slug ?= app))";

    app.save(
      new Collection({
        type: "base",
        name: "cdn_files",
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
          // The registry_apps slug this file belongs to ("stash"), or ""
          // for the admin's own library (photos etc.).
          { type: "text", name: "app", max: 60, pattern: "^$|^[a-z0-9][a-z0-9_-]*$" },
          { type: "relation", name: "owner", collectionId: usersId, maxSelect: 1 },
          {
            type: "select",
            name: "visibility",
            required: true,
            maxSelect: 1,
            values: ["private", "shared", "app", "public"],
          },
          { type: "relation", name: "shared_with", collectionId: usersId, maxSelect: 999 },
          { type: "text", name: "description", max: 5000 },
          { type: "relation", name: "tags", collectionId: tags.id, maxSelect: 999 },
          // Media metadata, filled from EXIF for images and empty otherwise.
          { type: "date", name: "taken_at" },
          { type: "number", name: "width", min: 0 },
          { type: "number", name: "height", min: 0 },
          // Searchable by radius with PocketBase's geoDistance() filter
          // function. Unknown location is {lon: 0, lat: 0} -- geoPoint has
          // no null -- so "has a location" is `location.lat != 0`.
          { type: "geoPoint", name: "location" },
          { type: "text", name: "camera", max: 200 },
          { type: "bool", name: "missing" },
          { type: "autodate", name: "created", onCreate: true },
          { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
        ],
        indexes: [
          "CREATE UNIQUE INDEX idx_cdn_files_path ON cdn_files (path)",
          "CREATE INDEX idx_cdn_files_owner ON cdn_files (owner)",
          "CREATE INDEX idx_cdn_files_app ON cdn_files (app)",
          "CREATE INDEX idx_cdn_files_taken_at ON cdn_files (taken_at)",
        ],
        listRule: readRule,
        viewRule: readRule,
        createRule: null,
        updateRule:
          "(" +
          adminOnly +
          " || owner = @request.auth.id)" +
          " && @request.body.path:isset = false" +
          " && @request.body.name:isset = false" +
          " && @request.body.kind:isset = false" +
          " && @request.body.mime:isset = false" +
          " && @request.body.size:isset = false" +
          " && @request.body.mtime:isset = false" +
          " && @request.body.missing:isset = false" +
          " && (" +
          adminOnly +
          " || (@request.body.owner:isset = false && @request.body.app:isset = false))",
        // Deleting goes through the gateway (DELETE /api/files/<path>),
        // which moves the file itself to the trash too.
        deleteRule: null,
      })
    );

    app.save(
      new Collection({
        type: "base",
        name: "cdn_public",
        fields: [
          // Library-relative, like cdn_files.path. With `folder`, covers
          // everything under that directory, including files added later.
          { type: "text", name: "path", required: true, max: 1024 },
          { type: "bool", name: "folder" },
          {
            type: "text",
            name: "collection",
            required: true,
            max: 60,
            pattern: "^[a-z0-9][a-z0-9-]*$",
          },
          { type: "autodate", name: "created", onCreate: true },
        ],
        indexes: ["CREATE UNIQUE INDEX idx_cdn_public_rule ON cdn_public (collection, path)"],
        listRule: adminOnly,
        viewRule: adminOnly,
        createRule: adminOnly,
        updateRule: adminOnly,
        deleteRule: adminOnly,
      })
    );
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId("cdn_public"));
    app.delete(app.findCollectionByNameOrId("cdn_files"));
    app.delete(app.findCollectionByNameOrId("cdn_tags"));
  }
);
