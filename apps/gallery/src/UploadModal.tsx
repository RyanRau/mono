import { useState, useRef } from "react";
import { css } from "goober";
import { Flexbox, Header, Text, TextInput, Button, Spinner, useTheme } from "bluestar";
import { insertPhoto } from "./graphql";
import { uploadImage } from "./spaces";

type Props = {
  onClose: () => void;
  onSave: () => Promise<void>;
};

export default function UploadModal({ onClose, onSave }: Props) {
  const theme = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);
  const [altText, setAltText] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(selected);
  };

  const handleSave = async () => {
    if (!file) {
      setError("Please select an image.");
      return;
    }
    if (!altText.trim()) {
      setError("Please provide a name for the photo.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const cdnUrl = await uploadImage(file);
      await insertPhoto({
        cdn_url: cdnUrl,
        alt_text: altText.trim(),
        is_public: isPublic,
      });
      await onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={css`
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100;
      `}
      onClick={onClose}
    >
      <div
        className={css`
          background: ${theme.colors.background};
          border-radius: ${theme.radius};
          padding: 24px;
          width: 480px;
          max-width: 90vw;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: ${theme.shadow};
        `}
        onClick={(e) => e.stopPropagation()}
      >
        <Flexbox direction="column" gap={16}>
          <Header variant="h2">Upload Photo</Header>

          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className={css`
                display: none;
              `}
            />
            {preview ? (
              <div
                className={css`
                  position: relative;
                  width: 100%;
                  border-radius: ${theme.radius};
                  overflow: hidden;
                  cursor: pointer;
                `}
                onClick={() => fileRef.current?.click()}
              >
                <img
                  src={preview}
                  alt="Preview"
                  className={css`
                    width: 100%;
                    max-height: 300px;
                    object-fit: contain;
                  `}
                />
              </div>
            ) : (
              <div
                className={css`
                  border: 2px dashed ${theme.colors.border};
                  border-radius: ${theme.radius};
                  padding: 48px 24px;
                  text-align: center;
                  cursor: pointer;
                  &:hover {
                    border-color: ${theme.colors.primary};
                  }
                `}
                onClick={() => fileRef.current?.click()}
              >
                <Text variant="body" color={theme.colors.textMuted}>
                  Click to select an image
                </Text>
              </div>
            )}
          </div>

          <TextInput
            label="Name"
            value={altText}
            onChange={setAltText}
            placeholder="Photo name or description"
          />

          <Flexbox alignItems="center" gap={8}>
            <input
              type="checkbox"
              id="is-public"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            <label
              htmlFor="is-public"
              className={css`
                font-family: ${theme.fonts.body};
                font-size: ${theme.textTypes.body.size};
                color: ${theme.colors.text};
                cursor: pointer;
              `}
            >
              Public
            </label>
          </Flexbox>

          {saving && (
            <Flexbox alignItems="center" gap={8}>
              <Spinner size={16} />
              <Text variant="caption">Uploading...</Text>
            </Flexbox>
          )}

          {error && <Text color={theme.colors.error}>{error}</Text>}

          <Flexbox justifyContent="flex-end" gap={8}>
            <Button label="Cancel" type="secondary" onClick={onClose} isDisabled={saving} />
            <Button
              label={saving ? "Uploading..." : "Upload"}
              type="creation"
              onClick={handleSave}
              isDisabled={saving}
            />
          </Flexbox>
        </Flexbox>
      </div>
    </div>
  );
}
