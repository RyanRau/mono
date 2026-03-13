import { css } from "goober";
import { useRef, useState, type DragEvent, type ChangeEvent } from "react";
import { useTheme } from "../../../theme";
import Text from "../../text/Text/Text";

export type FileUploadProps = {
  /** Called with the selected or dropped files. */
  onFiles: (files: File[]) => void;
  /**
   * Accepted file types passed to the native `<input accept>` attribute.
   * Accepts MIME types (e.g. `"image/*"`) or extensions (e.g. `".pdf,.docx"`).
   * Defaults to `"*"` (all files).
   */
  accept?: string;
  /** Allow the user to select more than one file. Defaults to `false`. */
  multiple?: boolean;
  /** Text shown inside the drop zone. Defaults to a generic drag-and-drop prompt. */
  label?: string;
  /** Disables the drop zone. */
  isDisabled?: boolean;
};

export default function FileUpload({
  onFiles,
  accept = "*",
  multiple = false,
  label,
  isDisabled = false,
}: FileUploadProps) {
  const theme = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!isDisabled) setIsDraggingOver(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDraggingOver(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDraggingOver(false);
    if (isDisabled) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) onFiles(multiple ? files : [files[0]]);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) onFiles(files);
    // Reset so the same file can be re-selected.
    e.target.value = "";
  }

  const defaultLabel = multiple
    ? "Drag & drop files here, or click to browse"
    : "Drag & drop a file here, or click to browse";

  return (
    <div
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      aria-disabled={isDisabled}
      onClick={() => !isDisabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (!isDisabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={css`
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 32px 24px;
        border-radius: ${theme.radius};
        border: 2px dashed
          ${isDraggingOver ? theme.colors.primary : theme.colors.border};
        background-color: ${isDraggingOver
          ? theme.colors.surface
          : theme.colors.background};
        cursor: ${isDisabled ? "not-allowed" : "pointer"};
        opacity: ${isDisabled ? 0.45 : 1};
        transition:
          border-color 0.15s ease,
          background-color 0.15s ease;
        outline: none;

        &:focus-visible {
          border-color: ${theme.colors.primary};
          box-shadow: ${theme.shadow};
        }
      `}
    >
      <UploadIcon color={isDraggingOver ? theme.colors.primary : theme.colors.textMuted} />
      <Text variant="body" color={theme.colors.textMuted}>
        {label ?? defaultLabel}
      </Text>
      {accept !== "*" && (
        <Text variant="caption" color={theme.colors.textMuted}>
          Accepted: {accept}
        </Text>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        tabIndex={-1}
        className={css`
          display: none;
        `}
      />
    </div>
  );
}

function UploadIcon({ color }: { color: string }) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={css`
        flex-shrink: 0;
        transition: stroke 0.15s ease;
      `}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
