import { useState, useEffect, useCallback } from "react";
import { useSignOut, useUserEmail } from "@nhost/react";
import { css } from "goober";
import { Flexbox, Header, Text, Button, Spinner, useTheme } from "bluestar";
import { fetchPublicPhotos, fetchAllPhotos, deletePhoto } from "./graphql";
import { deleteImage } from "./spaces";
import type { Photo } from "./graphql";
import PhotoCard from "./PhotoCard";
import UploadModal from "./UploadModal";
import EditModal from "./EditModal";
import Login from "./Login";

export default function Gallery({ isAuthenticated }: { isAuthenticated: boolean }) {
  const theme = useTheme();
  const { signOut } = useSignOut();
  const userEmail = useUserEmail();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    try {
      const data = isAuthenticated ? await fetchAllPhotos() : await fetchPublicPhotos();
      setPhotos(data);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const handleDelete = async (photo: Photo) => {
    await deletePhoto(photo.id);
    try {
      await deleteImage(photo.cdn_url);
    } catch {
      // CDN cleanup is best-effort
    }
    await loadPhotos();
  };

  const handleSave = async () => {
    setShowUpload(false);
    setEditingPhoto(null);
    await loadPhotos();
  };

  return (
    <div
      className={css`
        max-width: 1200px;
        margin: 0 auto;
        padding: 24px 16px;
      `}
    >
      <Flexbox justifyContent="space-between" alignItems="center">
        <Header variant="h1">Gallery</Header>
        <Flexbox gap={12} alignItems="center">
          {isAuthenticated ? (
            <>
              <Text variant="caption">{userEmail}</Text>
              <Button
                label="Upload"
                type="creation"
                density="dense"
                onClick={() => setShowUpload(true)}
              />
              <Button label="Sign Out" type="secondary" density="dense" onClick={() => signOut()} />
            </>
          ) : (
            <Button
              label="Sign In"
              type="secondary"
              density="dense"
              onClick={() => setShowLogin(true)}
            />
          )}
        </Flexbox>
      </Flexbox>

      <div
        className={css`
          height: 24px;
        `}
      />

      {loading ? (
        <Flexbox justifyContent="center" style={{ padding: "48px 0" }}>
          <Spinner size={28} />
        </Flexbox>
      ) : photos.length === 0 ? (
        <Flexbox justifyContent="center" style={{ padding: "48px 0" }}>
          <Text variant="body" color={theme.colors.textMuted}>
            {isAuthenticated ? "No photos yet. Upload your first one!" : "No public photos yet."}
          </Text>
        </Flexbox>
      ) : (
        <div
          className={css`
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 16px;
          `}
        >
          {photos.map((photo) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              isAuthenticated={isAuthenticated}
              onEdit={() => setEditingPhoto(photo)}
              onDelete={() => handleDelete(photo)}
            />
          ))}
        </div>
      )}

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSave={handleSave} />}

      {editingPhoto && (
        <EditModal photo={editingPhoto} onClose={() => setEditingPhoto(null)} onSave={handleSave} />
      )}

      {showLogin && <Login onClose={() => setShowLogin(false)} />}
    </div>
  );
}
