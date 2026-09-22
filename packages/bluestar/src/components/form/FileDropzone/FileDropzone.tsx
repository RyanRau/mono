import { useRef, useState } from "react";
import type { DragEvent } from "react";
import { css } from "goober";
import { useTheme } from "../../../theme";
import FormInputLayout from "../FormInputLayout/FormInputLayout";
import type { FormFieldProps } from "../FormInputLayout/FormInputLayout";
import Text from "../../text/Text/Text";
import Icon from "../../display/Icon/Icon";
import Button from "../../buttons/Button/Button";

export type FileDropzoneValue = { name: string; dataUrl: string };

type SharedProps = FormFieldProps & {
  /** Native `accept` attribute, e.g. `"image/*"`. */
  accept?: string;
  /** Prompt shown in the empty state. Defaults to "Drag a file here, or click to browse". */
  prompt?: string;
};

/** Controlled single-file mode: holds one file, read to a data URL. */
type ValueProps = {
  value: FileDropzoneValue | null;
  onChange: (value: FileDropzoneValue | null) => void;
  onFiles?: never;
  multiple?: never;
};

/**
 * Raw-files mode: hands every picked/dropped `File` straight to `onFiles`
 * and holds nothing itself -- the dropzone stays empty and ready for the
 * next batch. For uploads too big or too many for data URLs (a batch of
 * photos streamed to a server).
 */
type FilesProps = {
  onFiles: (files: File[]) => void;
  /** Allow picking/dropping more than one file at once. */
  multiple?: boolean;
  value?: never;
  onChange?: never;
};

export type FileDropzoneProps = SharedProps & (ValueProps | FilesProps);

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read file"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * A drag-and-drop file picker with a click-to-browse fallback (a real
 * `<label>` wrapping a hidden native input, so both interactions come free
 * -- no manual keyboard handling to get right). By default it reads the
 * file to a data URL itself and hands back `{ name, dataUrl }` via
 * `value`/`onChange`, so the caller never touches `FileReader`. Pass
 * `onFiles` instead to get raw `File`s (optionally `multiple`) with no
 * reading at all.
 */
export default function FileDropzone({
  value,
  onChange,
  onFiles,
  multiple,
  accept,
  prompt = "Drag a file here, or click to browse",
  label,
  description,
  warning,
  error,
  required,
  name,
  isDisabled,
}: FileDropzoneProps) {
  const theme = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  async function handleFiles(list: FileList | null | undefined) {
    const files = Array.from(list ?? []);
    if (files.length === 0) return;
    if (onFiles) {
      onFiles(multiple ? files : files.slice(0, 1));
      // Clear the input so picking the same file again still fires.
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    const dataUrl = await readAsDataUrl(files[0]);
    onChange?.({ name: files[0].name, dataUrl });
  }

  function handleDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragActive(false);
    if (isDisabled) return;
    void handleFiles(e.dataTransfer.files);
  }

  function removeFile() {
    onChange?.(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <FormInputLayout
      label={label}
      description={description}
      warning={warning}
      error={error}
      required={required}
    >
      {({ id, describedBy, invalid }) => {
        const borderColor = invalid
          ? theme.colors.error
          : dragActive
            ? theme.colors.primary
            : theme.colors.border;

        if (value) {
          const isImage = value.dataUrl.startsWith("data:image/");
          return (
            <div
              className={css`
                display: flex;
                align-items: center;
                gap: 12px;
                border: 1px solid ${theme.colors.border};
                border-radius: ${theme.radius.md};
                padding: 10px 12px;
              `}
            >
              {isImage ? (
                <img
                  src={value.dataUrl}
                  alt={value.name}
                  style={{
                    width: 40,
                    height: 40,
                    objectFit: "cover",
                    borderRadius: theme.radius.sm,
                    flexShrink: 0,
                  }}
                />
              ) : (
                <Icon name="upload" size={20} color={theme.colors.textMuted} />
              )}
              <span style={{ flex: 1, minWidth: 0, wordBreak: "break-all" }}>
                <Text variant="caption">{value.name}</Text>
              </span>
              <Button
                label="Remove"
                variant="secondary"
                density="dense"
                onClick={removeFile}
                isDisabled={isDisabled}
              />
            </div>
          );
        }

        return (
          <label
            htmlFor={id}
            onDragOver={(e) => {
              e.preventDefault();
              if (!isDisabled) setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={css`
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 6px;
              min-height: 96px;
              padding: 16px;
              border: 1.5px dashed ${borderColor};
              border-radius: ${theme.radius.md};
              background: ${dragActive ? theme.colors.surface : "transparent"};
              cursor: ${isDisabled ? "not-allowed" : "pointer"};
              opacity: ${isDisabled ? 0.5 : 1};
              text-align: center;
              transition:
                border-color 0.15s ease,
                background-color 0.15s ease;

              &:focus-within {
                outline: 2px solid ${theme.colors.focusRing};
                outline-offset: 2px;
              }
            `}
          >
            <Icon name="upload" size={20} color={theme.colors.textMuted} />
            <Text variant="caption">{prompt}</Text>
            <input
              ref={inputRef}
              id={id}
              name={name}
              type="file"
              accept={accept}
              multiple={multiple}
              disabled={isDisabled}
              onChange={(e) => void handleFiles(e.target.files)}
              style={{
                position: "absolute",
                width: 1,
                height: 1,
                padding: 0,
                margin: -1,
                overflow: "hidden",
                clip: "rect(0,0,0,0)",
                whiteSpace: "nowrap",
                border: 0,
              }}
            />
          </label>
        );
      }}
    </FormInputLayout>
  );
}
