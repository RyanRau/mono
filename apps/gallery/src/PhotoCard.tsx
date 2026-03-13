import { css } from "goober";
import { Flexbox, Text, Button, useTheme } from "bluestar";
import type { Photo } from "./graphql";

type Props = {
  photo: Photo;
  isAuthenticated: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

export default function PhotoCard({ photo, isAuthenticated, onEdit, onDelete }: Props) {
  const theme = useTheme();

  return (
    <div
      className={css`
        border: 1px solid ${theme.colors.border};
        border-radius: ${theme.radius};
        background: ${theme.colors.surface};
        box-shadow: ${theme.shadow};
        overflow: hidden;
      `}
    >
      <div
        className={css`
          position: relative;
          width: 100%;
          padding-top: 75%;
          overflow: hidden;
          border-radius: ${theme.radius} ${theme.radius} 0 0;
        `}
      >
        <img
          src={photo.cdn_url}
          alt={photo.alt_text}
          className={css`
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
          `}
        />
        {isAuthenticated && !photo.is_public && (
          <span
            className={css`
              position: absolute;
              top: 8px;
              right: 8px;
              padding: 2px 8px;
              border-radius: 12px;
              background: rgba(0, 0, 0, 0.6);
              color: white;
              font-size: 12px;
              font-family: ${theme.fonts.body};
            `}
          >
            Private
          </span>
        )}
      </div>
      <div
        className={css`
          padding: 12px;
        `}
      >
        <Flexbox justifyContent="space-between" alignItems="center">
          <Text variant="body">{photo.alt_text}</Text>
          {isAuthenticated && (
            <Flexbox gap={8}>
              <Button label="Edit" type="secondary" density="dense" onClick={onEdit} />
              <Button label="Delete" type="destructive" density="dense" onClick={onDelete} />
            </Flexbox>
          )}
        </Flexbox>
      </div>
    </div>
  );
}
