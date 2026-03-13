import { useState } from "react";
import { css } from "goober";
import { Flexbox, Header, Text, TextInput, Button, useTheme } from "bluestar";
import { updatePhoto } from "./graphql";
import type { Photo } from "./graphql";

type Props = {
  photo: Photo;
  onClose: () => void;
  onSave: () => Promise<void>;
};

export default function EditModal({ photo, onClose, onSave }: Props) {
  const theme = useTheme();
  const [altText, setAltText] = useState(photo.alt_text);
  const [isPublic, setIsPublic] = useState(photo.is_public);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!altText.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updatePhoto({ id: photo.id, alt_text: altText.trim(), is_public: isPublic });
      await onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update photo.");
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
          <Header variant="h2">Edit Photo</Header>

          <div
            className={css`
              border-radius: ${theme.radius};
              overflow: hidden;
            `}
          >
            <img
              src={photo.cdn_url}
              alt={photo.alt_text}
              className={css`
                width: 100%;
                max-height: 300px;
                object-fit: contain;
              `}
            />
          </div>

          <TextInput label="Name" value={altText} onChange={setAltText} />

          <Flexbox alignItems="center" gap={8}>
            <input
              type="checkbox"
              id="edit-is-public"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            <label
              htmlFor="edit-is-public"
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

          {error && <Text color={theme.colors.error}>{error}</Text>}

          <Flexbox justifyContent="flex-end" gap={8}>
            <Button label="Cancel" type="secondary" onClick={onClose} isDisabled={saving} />
            <Button
              label={saving ? "Saving..." : "Save"}
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
