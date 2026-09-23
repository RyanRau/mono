import { useCallback, useEffect, useState } from "react";
import { ClientResponseError } from "pocketbase";
import type { RecordModel } from "pocketbase";
import {
  Alert,
  Badge,
  Breadcrumbs,
  Button,
  ConfirmDialog,
  Drawer,
  Dropdown,
  EmptyState,
  FileDropzone,
  Flexbox,
  Form,
  Link,
  MediaTile,
  Modal,
  Spinner,
  SubmitButton,
  Switch,
  Text,
  TextAreaInput,
  TextInput,
  TokenSelect,
  useForm,
  useToast,
} from "bluestar";
import { pb } from "./pb";
import { cdnApi, encodePath, fileUrl, formatBytes, isPublic, joinPath, parentOf } from "./cdn";
import type { CdnFile, CdnListing, PublicRule } from "./cdn";

// Same pattern cdn_public.collection enforces server-side.
const COLLECTION_RE = /^[a-z0-9][a-z0-9-]*$/;

type Visibility = "private" | "shared" | "app" | "public";
type CdnRecord = RecordModel & {
  path: string;
  app: string;
  owner: string;
  visibility: Visibility;
  shared_with: string[];
  description: string;
  tags: string[];
  taken_at: string;
  width: number;
  height: number;
  camera: string;
  location: { lat: number; lon: number };
};
type Tag = { id: string; name: string };
type UserOption = { id: string; email: string; name: string };

const VISIBILITY_OPTIONS: { label: string; value: Visibility }[] = [
  { label: "Private: only the owner (and admins)", value: "private" },
  { label: "Shared: the owner and chosen people", value: "shared" },
  { label: "App: everyone with access to its app", value: "app" },
  { label: "Public: anyone, no sign-in", value: "public" },
];

function pathFromUrl() {
  return new URLSearchParams(window.location.search).get("path") ?? "";
}

function adminHref(path: string) {
  const params = new URLSearchParams({ tab: "cdn" });
  if (path) params.set("path", path);
  return `/admin?${params}`;
}

function errorMessage(error: unknown) {
  if (error instanceof ClientResponseError || error instanceof Error) return error.message;
  return "Something went wrong.";
}

/**
 * Which named public collections one exact path (a file, or a folder and
 * everything under it) belongs to. Edits cdn_public directly -- the
 * gateway re-pulls the rules every public_refresh_seconds, so a change
 * takes effect on the CDN within about half a minute.
 */
function SharingEditor({
  path,
  folder,
  rules,
  onChange,
}: {
  path: string;
  folder: boolean;
  rules: PublicRule[];
  onChange: () => void;
}) {
  const toast = useToast();
  const [newName, setNewName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const own = rules.filter((r) => r.path === path && r.folder === folder);
  const allNames = [...new Set(rules.map((r) => r.collection))].sort();
  const inherited = rules.filter((r) => r.folder && path.startsWith(`${r.path}/`));

  async function setCollections(next: string[]) {
    setIsSaving(true);
    try {
      for (const name of next.filter((n) => !own.some((r) => r.collection === n))) {
        await pb.collection("cdn_public").create({ path, folder, collection: name });
      }
      for (const rule of own.filter((r) => !next.includes(r.collection))) {
        await pb.collection("cdn_public").delete(rule.id);
      }
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setIsSaving(false);
      onChange();
    }
  }

  const trimmed = newName.trim().toLowerCase();
  return (
    <Flexbox direction="column" gap={8}>
      <TokenSelect
        label={
          folder ? "Public collections (this folder and everything in it)" : "Public collections"
        }
        description="Anyone can view what's in a public collection, without signing in."
        isDisabled={isSaving}
        options={allNames.map((n) => ({ label: n, value: n }))}
        value={own.map((r) => r.collection)}
        onChange={setCollections}
      />
      <Flexbox direction="row" gap={8} alignItems="flex-end">
        <Flexbox direction="column" grow={1}>
          <TextInput
            label="New collection"
            hideLabel
            placeholder="New collection, e.g. homepage"
            value={newName}
            onChange={setNewName}
            error={
              trimmed && !COLLECTION_RE.test(trimmed)
                ? "Lowercase letters, digits and dashes"
                : undefined
            }
          />
        </Flexbox>
        <Button
          label="Add"
          variant="secondary"
          isDisabled={
            isSaving || !COLLECTION_RE.test(trimmed) || own.some((r) => r.collection === trimmed)
          }
          onClick={() => {
            setNewName("");
            void setCollections([...own.map((r) => r.collection), trimmed]);
          }}
        />
      </Flexbox>
      {inherited.length > 0 && (
        <Text variant="caption">
          Already public through {inherited.map((r) => `${r.path}/ (${r.collection})`).join(", ")}.
        </Text>
      )}
    </Flexbox>
  );
}

function TagEditor({
  record,
  tags,
  onTagsChanged,
  onRecordChanged,
}: {
  record: CdnRecord;
  tags: Tag[];
  onTagsChanged: () => void;
  onRecordChanged: (next: CdnRecord) => void;
}) {
  const toast = useToast();
  const [newTag, setNewTag] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function save(next: string[]) {
    setIsSaving(true);
    try {
      onRecordChanged(
        await pb.collection("cdn_files").update<CdnRecord>(record.id, { tags: next })
      );
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function addNew() {
    const name = newTag.trim().toLowerCase();
    if (!name) return;
    setNewTag("");
    let tag = tags.find((t) => t.name === name);
    if (!tag) {
      try {
        tag = await pb.collection("cdn_tags").create<Tag>({ name });
        onTagsChanged();
      } catch (error) {
        toast.error(errorMessage(error));
        return;
      }
    }
    if (!record.tags.includes(tag.id)) await save([...record.tags, tag.id]);
  }

  return (
    <Flexbox direction="column" gap={8}>
      <TokenSelect
        label="Tags"
        isDisabled={isSaving}
        options={tags.map((t) => ({ label: t.name, value: t.id }))}
        value={record.tags}
        onChange={save}
      />
      <Flexbox direction="row" gap={8} alignItems="flex-end">
        <Flexbox direction="column" grow={1}>
          <TextInput
            label="New tag"
            hideLabel
            placeholder="New tag"
            value={newTag}
            onChange={setNewTag}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void addNew();
              }
            }}
          />
        </Flexbox>
        <Button
          label="Add"
          variant="secondary"
          isDisabled={isSaving || !newTag.trim()}
          onClick={addNew}
        />
      </Flexbox>
    </Flexbox>
  );
}

/**
 * Who can see one file: its cdn_files visibility and shared_with. The
 * gateway re-checks per file, so a change applies to signed-in viewers
 * within session_cache_seconds and to signed-out ones within
 * public_refresh_seconds.
 */
function AccessEditor({
  record,
  users,
  onRecordChanged,
}: {
  record: CdnRecord;
  users: UserOption[];
  onRecordChanged: (next: CdnRecord) => void;
}) {
  const toast = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const owner = users.find((u) => u.id === record.owner);

  async function save(patch: Partial<Pick<CdnRecord, "visibility" | "shared_with">>) {
    setIsSaving(true);
    try {
      onRecordChanged(await pb.collection("cdn_files").update<CdnRecord>(record.id, patch));
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Flexbox direction="column" gap={8}>
      <Text variant="caption">
        Owner: {owner ? owner.name || owner.email : "none (admins only)"}
        {record.app ? ` · App: ${record.app}` : " · Your library"}
      </Text>
      <Dropdown
        label="Who can see it"
        isDisabled={isSaving}
        options={VISIBILITY_OPTIONS.filter((o) => o.value !== "app" || record.app)}
        value={record.visibility}
        onChange={(v) => v && void save({ visibility: v as Visibility })}
      />
      {record.visibility === "shared" && (
        <TokenSelect
          label="Shared with"
          isDisabled={isSaving}
          options={users
            .filter((u) => u.id !== record.owner)
            .map((u) => ({ label: u.name || u.email, value: u.id }))}
          value={record.shared_with}
          onChange={(next) => void save({ shared_with: next })}
        />
      )}
    </Flexbox>
  );
}

function DescriptionForm({
  record,
  onSaved,
}: {
  record: CdnRecord;
  onSaved: (next: CdnRecord) => void;
}) {
  const toast = useToast();
  const form = useForm({
    initialValues: { description: record.description },
    onSubmit: async (values) => {
      onSaved(await pb.collection("cdn_files").update<CdnRecord>(record.id, values));
      toast.success("Saved");
    },
  });
  return (
    <Form form={form} maxWidth={null}>
      <TextAreaInput {...form.field("description")} label="Description" rows={3} />
      <SubmitButton label="Save description" variant="secondary" isDisabled={!form.isDirty} />
    </Form>
  );
}

function FileDetails({
  file,
  rules,
  tags,
  users,
  onRulesChanged,
  onTagsChanged,
  onMove,
  onDelete,
}: {
  file: CdnFile;
  rules: PublicRule[];
  tags: Tag[];
  users: UserOption[];
  onRulesChanged: () => void;
  onTagsChanged: () => void;
  onMove: () => void;
  onDelete: () => void;
}) {
  // undefined = loading, null = not indexed yet.
  const [record, setRecord] = useState<CdnRecord | null | undefined>(undefined);

  // Keyed by file.path at the call site, so this starts over (back to
  // undefined) for each file rather than resetting state here.
  useEffect(() => {
    pb.collection("cdn_files")
      .getFirstListItem<CdnRecord>(pb.filter("path = {:path}", { path: file.path }), {
        requestKey: "cdn-file-details",
      })
      .then(setRecord)
      .catch((error) => {
        if (error instanceof ClientResponseError && error.isAbort) return;
        setRecord(null);
      });
  }, [file.path]);

  const facts = [
    ["Size", formatBytes(file.size)],
    ["Type", file.mime],
    ["Modified", new Date(file.mtime * 1000).toLocaleString()],
  ];
  if (record) {
    if (record.taken_at) facts.push(["Taken", new Date(record.taken_at).toLocaleString()]);
    if (record.width) facts.push(["Dimensions", `${record.width} × ${record.height}`]);
    if (record.camera) facts.push(["Camera", record.camera]);
    if (record.location?.lat) {
      facts.push([
        "Location",
        `${record.location.lat.toFixed(4)}, ${record.location.lon.toFixed(4)}`,
      ]);
    }
  }

  return (
    // Drawer bodies are unpadded (lists run edge to edge); match its header's inset.
    <Flexbox direction="column" gap={20} style={{ padding: 16 }}>
      {file.kind === "image" && (
        <img
          src={fileUrl(file.path, 1024)}
          alt={file.name}
          style={{ width: "100%", maxHeight: 360, objectFit: "contain", borderRadius: 8 }}
        />
      )}
      {file.kind === "video" && (
        <video src={fileUrl(file.path)} controls style={{ width: "100%", borderRadius: 8 }} />
      )}
      <Flexbox direction="column" gap={4}>
        <Text variant="subtitle">{file.name}</Text>
        <Text variant="caption">{file.path}</Text>
        <Link href={fileUrl(file.path)} external>
          Open original
        </Link>
      </Flexbox>
      <Flexbox direction="column" gap={4}>
        {facts.map(([label, value]) => (
          <Flexbox key={label} direction="row" justifyContent="space-between" gap={12}>
            <Text variant="caption">{label}</Text>
            <Text variant="body" as="span">
              {value}
            </Text>
          </Flexbox>
        ))}
      </Flexbox>

      {record && <AccessEditor record={record} users={users} onRecordChanged={setRecord} />}
      <SharingEditor path={file.path} folder={false} rules={rules} onChange={onRulesChanged} />

      {record === undefined && <Spinner />}
      {record === null && (
        <Alert variant="info">
          Not in the index yet, so there are no tags or description to edit. The indexer picks it up
          on its next run.
        </Alert>
      )}
      {record && (
        <>
          <TagEditor
            record={record}
            tags={tags}
            onTagsChanged={onTagsChanged}
            onRecordChanged={setRecord}
          />
          <DescriptionForm key={record.id} record={record} onSaved={setRecord} />
        </>
      )}

      <Flexbox direction="row" gap={8} justifyContent="space-between">
        <Button label="Rename / move" variant="secondary" onClick={onMove} />
        <Button label="Delete" variant="destructive" appearance="outline" onClick={onDelete} />
      </Flexbox>
    </Flexbox>
  );
}

function NameForm({
  label,
  initial,
  submitLabel,
  description,
  onSubmit,
}: {
  label: string;
  initial: string;
  submitLabel: string;
  description?: string;
  onSubmit: (value: string) => Promise<void>;
}) {
  const form = useForm({
    initialValues: { value: initial },
    validate: (v) => ({ value: v.value.trim() ? undefined : "Required" }),
    onSubmit: async (v) => onSubmit(v.value.trim().replace(/^\/+|\/+$/g, "")),
  });
  return (
    <Form form={form}>
      <TextInput {...form.field("value")} label={label} description={description} autoFocus />
      <SubmitButton label={submitLabel} />
    </Form>
  );
}

type UploadStatus = {
  name: string;
  state: "waiting" | "uploading" | "done" | "error";
  error?: string;
};

function UploadPanel({ folder, onUploaded }: { folder: string; onUploaded: () => void }) {
  const [overwrite, setOverwrite] = useState(false);
  const [statuses, setStatuses] = useState<UploadStatus[]>([]);
  const busy = statuses.some((s) => s.state === "waiting" || s.state === "uploading");

  async function upload(files: File[]) {
    const start = statuses.length;
    setStatuses((prev) => [
      ...prev,
      ...files.map((f) => ({ name: f.name, state: "waiting" as const })),
    ]);
    const update = (i: number, patch: Partial<UploadStatus>) =>
      setStatuses((prev) => prev.map((s, j) => (j === start + i ? { ...s, ...patch } : s)));

    // One at a time: the gateway streams each straight to the NAS, and a
    // home upload link gains nothing from parallel requests.
    for (const [i, file] of files.entries()) {
      update(i, { state: "uploading" });
      try {
        const query = overwrite ? "?overwrite=true" : "";
        await cdnApi(`/api/files/${encodePath(joinPath(folder, file.name))}${query}`, {
          method: "PUT",
          body: file,
        });
        update(i, { state: "done" });
      } catch (error) {
        update(i, { state: "error", error: errorMessage(error) });
      }
    }
    onUploaded();
  }

  return (
    <Flexbox direction="column" gap={16}>
      <Text variant="caption">Uploading to {folder ? `${folder}/` : "the library root"}</Text>
      <FileDropzone
        label="Files"
        hideLabel
        multiple
        isDisabled={busy}
        prompt="Drag files here, or click to browse"
        onFiles={(files) => void upload(files)}
      />
      <Switch label="Replace files that already exist" value={overwrite} onChange={setOverwrite} />
      {statuses.length > 0 && (
        <Flexbox direction="column" gap={4}>
          {statuses.map((s, i) => (
            <Flexbox
              key={i}
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              gap={8}
            >
              <Text variant="caption">{s.name}</Text>
              {s.state === "error" ? (
                <Badge variant="error">{s.error}</Badge>
              ) : (
                <Badge variant={s.state === "done" ? "success" : "neutral"}>
                  {s.state === "done"
                    ? "Uploaded"
                    : s.state === "uploading"
                      ? "Uploading…"
                      : "Waiting"}
                </Badge>
              )}
            </Flexbox>
          ))}
        </Flexbox>
      )}
    </Flexbox>
  );
}

type Dialog =
  | { kind: "mkdir" }
  | { kind: "upload" }
  | { kind: "move"; path: string }
  | { kind: "delete"; path: string; isFolder: boolean }
  | null;

/**
 * The CDN tab of /admin: browse home-server/cdn-gateway's NAS library by
 * folder, manage files (upload, new folder, rename/move, delete to trash)
 * through the gateway's admin /api/ routes, and edit what lives in
 * PocketBase -- who can see each file (owner, visibility, shared_with),
 * tags, descriptions, and public collections (cdn_public).
 */
export function CdnAdmin() {
  const toast = useToast();
  const [path, setPath] = useState(pathFromUrl);
  const [listing, setListing] = useState<CdnListing | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rules, setRules] = useState<PublicRule[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);

  const loadListing = useCallback(() => {
    cdnApi<CdnListing>(`/api/list?path=${encodeURIComponent(path)}`)
      .then((next) => {
        setListing(next);
        setLoadError(null);
      })
      .catch((error) => {
        setListing(null);
        setLoadError(errorMessage(error));
      });
  }, [path]);

  const loadRules = useCallback(() => {
    pb.collection("cdn_public")
      .getFullList<PublicRule>({ requestKey: "cdn-rules" })
      .then(setRules)
      .catch(() => setRules([]));
  }, []);

  const loadTags = useCallback(() => {
    pb.collection("cdn_tags")
      .getFullList<Tag>({ sort: "name", requestKey: "cdn-tags" })
      .then(setTags)
      .catch(() => setTags([]));
  }, []);

  useEffect(loadListing, [loadListing]);
  useEffect(() => {
    loadRules();
    loadTags();
  }, [loadRules, loadTags]);

  useEffect(() => {
    // The Access tab's own endpoint -- admins only, which this page is.
    pb.send<{ users: UserOption[] }>("/api/custom/admin/access", {
      method: "GET",
      requestKey: "cdn-users",
    })
      .then((res) => setUsers(res.users))
      .catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    const onPop = () => {
      setPath(pathFromUrl());
      setSelected(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function navigate(next: string) {
    window.history.pushState(null, "", adminHref(next));
    setPath(next);
    setSelected(null);
  }

  async function mkdir(name: string) {
    await cdnApi("/api/mkdir", {
      method: "POST",
      body: JSON.stringify({ path: joinPath(path, name) }),
    });
    setDialog(null);
    loadListing();
  }

  async function move(from: string, to: string) {
    await cdnApi("/api/move", { method: "POST", body: JSON.stringify({ from, to }) });
    setDialog(null);
    loadRules();
    if (from === path) {
      navigate(to);
      return;
    }
    setSelected((s) => (s === from ? null : s));
    loadListing();
  }

  async function remove(target: string) {
    try {
      await cdnApi(`/api/files/${encodePath(target)}`, { method: "DELETE" });
      toast.success(`Moved ${target} to the trash`);
    } catch (error) {
      toast.error(errorMessage(error));
      throw error;
    }
    loadRules();
    if (target === path) {
      navigate(parentOf(path));
      return;
    }
    setSelected(null);
    loadListing();
  }

  const segments = path ? path.split("/") : [];
  const crumbs = [
    { label: "Library", href: adminHref("") },
    ...segments.map((seg, i) => ({
      label: seg,
      href: adminHref(segments.slice(0, i + 1).join("/")),
    })),
  ];
  // A listing for a folder other than the current one is still loading.
  const current = listing?.path === path ? listing : null;
  const selectedFile = current?.files.find((f) => f.path === selected) ?? null;

  return (
    <Flexbox direction="column" gap={16}>
      <Flexbox
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={8}
      >
        <Breadcrumbs items={crumbs} />
        <Flexbox direction="row" gap={8} flexWrap="wrap">
          {path && (
            <>
              <Button
                label="Rename folder"
                variant="secondary"
                appearance="outline"
                onClick={() => setDialog({ kind: "move", path })}
              />
              <Button
                label="Delete folder"
                variant="destructive"
                appearance="outline"
                onClick={() => setDialog({ kind: "delete", path, isFolder: true })}
              />
            </>
          )}
          <Button
            label="New folder"
            variant="secondary"
            onClick={() => setDialog({ kind: "mkdir" })}
          />
          <Button label="Upload" onClick={() => setDialog({ kind: "upload" })} />
        </Flexbox>
      </Flexbox>

      {path && <SharingEditor path={path} folder rules={rules} onChange={loadRules} />}

      {loadError && <Alert variant="error">{loadError}</Alert>}
      {!current && !loadError && <Spinner />}
      {current && current.folders.length === 0 && current.files.length === 0 && (
        <EmptyState
          title="Empty folder"
          description="Upload files or create a folder to get started."
        />
      )}
      {current && (current.folders.length > 0 || current.files.length > 0) && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 8,
          }}
        >
          {current.folders.map((f) => (
            <MediaTile
              key={f.path}
              title={f.name}
              icon="folder"
              badge={
                rules.some((r) => r.folder && r.path === f.path) || isPublic(f.path, rules) ? (
                  <Badge variant="primary" emphasis="solid">
                    Public
                  </Badge>
                ) : undefined
              }
              onClick={() => navigate(f.path)}
            />
          ))}
          {current.files.map((f) => (
            <MediaTile
              key={f.path}
              title={f.name}
              subtitle={formatBytes(f.size)}
              src={f.kind === "image" ? fileUrl(f.path, 256) : undefined}
              icon={f.kind === "image" ? "image" : "docs"}
              badge={
                isPublic(f.path, rules) ? (
                  <Badge variant="primary" emphasis="solid">
                    Public
                  </Badge>
                ) : undefined
              }
              selected={f.path === selected}
              onClick={() => setSelected(f.path)}
            />
          ))}
        </div>
      )}

      <Drawer
        isOpen={selectedFile !== null}
        onClose={() => setSelected(null)}
        title={selectedFile?.name ?? ""}
        side="right"
        width={420}
      >
        {selectedFile && (
          <FileDetails
            key={selectedFile.path}
            file={selectedFile}
            rules={rules}
            tags={tags}
            users={users}
            onRulesChanged={loadRules}
            onTagsChanged={loadTags}
            onMove={() => setDialog({ kind: "move", path: selectedFile.path })}
            onDelete={() => setDialog({ kind: "delete", path: selectedFile.path, isFolder: false })}
          />
        )}
      </Drawer>

      <Modal isOpen={dialog?.kind === "mkdir"} onClose={() => setDialog(null)} title="New folder">
        {dialog?.kind === "mkdir" && (
          <NameForm label="Folder name" initial="" submitLabel="Create" onSubmit={mkdir} />
        )}
      </Modal>

      <Modal
        isOpen={dialog?.kind === "upload"}
        onClose={() => setDialog(null)}
        title="Upload files"
        width={520}
      >
        {dialog?.kind === "upload" && <UploadPanel folder={path} onUploaded={loadListing} />}
      </Modal>

      <Modal
        isOpen={dialog?.kind === "move"}
        onClose={() => setDialog(null)}
        title="Rename or move"
      >
        {dialog?.kind === "move" && (
          <NameForm
            label="New path"
            description="The full path from the library root. Change only the last part to rename. Tags and sharing move with it."
            initial={dialog.path}
            submitLabel="Move"
            onSubmit={(to) => move(dialog.path, to)}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={dialog?.kind === "delete"}
        onClose={() => setDialog(null)}
        onConfirm={async () => {
          if (dialog?.kind === "delete") await remove(dialog.path);
          setDialog(null);
        }}
        title={dialog?.kind === "delete" && dialog.isFolder ? "Delete folder" : "Delete file"}
        message={
          dialog?.kind === "delete"
            ? `Move ${dialog.path}${dialog.isFolder ? " and everything in it" : ""} to the trash? It stays in .trash on the NAS until you empty that by hand, and its public sharing is removed.`
            : ""
        }
        confirmLabel="Delete"
      />
    </Flexbox>
  );
}
