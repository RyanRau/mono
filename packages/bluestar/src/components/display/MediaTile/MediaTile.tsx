import { useState } from "react";
import type { ReactNode } from "react";
import { css } from "goober";
import { useTheme } from "../../../theme";
import Text from "../../text/Text/Text";
import Icon from "../Icon/Icon";
import type { IconName } from "../Icon/Icon";

export type MediaTileProps = {
  /** Caption under the preview -- a file or folder name. Truncated to one line. */
  title: string;
  /** Second caption line, e.g. a size or date. Truncated to one line. */
  subtitle?: string;
  /** Image URL for the square preview (cropped to fill). Falls back to `icon` if omitted or it fails to load. */
  src?: string;
  /** Shown in the preview when there's no `src`, or it fails to load. Defaults to `"image"`. */
  icon?: IconName;
  /** Overlaid on the preview's top-right corner -- typically a `Badge`. */
  badge?: ReactNode;
  selected?: boolean;
  onClick: () => void;
};

/**
 * One square, clickable tile in a media grid -- a photo, a file, a folder.
 * The preview is an `<img>` cropped to a square (lazy-loaded, so a grid of
 * hundreds only fetches what's on screen), falling back to an icon for
 * anything without an image. Selection reads the same as `ListRow`'s: the
 * primary color, here as a ring. Lay tiles out with a CSS grid of equal
 * columns; the tile fills whatever width its cell gives it.
 */
export default function MediaTile({
  title,
  subtitle,
  src,
  icon = "image",
  badge,
  selected = false,
  onClick,
}: MediaTileProps) {
  const theme = useTheme();
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = src && failedSrc !== src;

  const truncate = css`
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    min-width: 0;
  `;

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      title={title}
      className={css`
        display: flex;
        flex-direction: column;
        gap: 6px;
        width: 100%;
        min-width: 0;
        padding: 6px;
        border: 1px solid ${selected ? theme.colors.primary : "transparent"};
        border-radius: ${theme.radius.md};
        background-color: ${
          selected ? `color-mix(in srgb, ${theme.colors.primary} 12%, transparent)` : "transparent"
        };
        box-shadow: ${selected ? `0 0 0 1px ${theme.colors.primary}` : "none"};
        text-align: left;
        cursor: pointer;

        &:hover {
          background-color: ${
            selected
              ? `color-mix(in srgb, ${theme.colors.primary} 18%, transparent)`
              : theme.colors.surfaceHover
          };
        }
        &:focus-visible {
          outline: 2px solid ${theme.colors.focusRing};
          outline-offset: 2px;
        }
      `}
    >
      <span
        className={css`
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          aspect-ratio: 1;
          overflow: hidden;
          border-radius: ${theme.radius.sm};
          background-color: ${theme.colors.surface};
          border: 1px solid ${theme.colors.border};
        `}
      >
        {showImage ? (
          <img
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setFailedSrc(src)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <Icon name={icon} size={32} color={theme.colors.textMuted} />
        )}
        {badge && <span style={{ position: "absolute", top: 6, right: 6 }}>{badge}</span>}
      </span>
      <span className={truncate} style={{ display: "block", width: "100%" }}>
        <Text variant="label" as="span" color={selected ? theme.colors.primary : undefined}>
          {title}
        </Text>
      </span>
      {subtitle && (
        <span className={truncate} style={{ display: "block", width: "100%", marginTop: -4 }}>
          <Text variant="caption" as="span">
            {subtitle}
          </Text>
        </span>
      )}
    </button>
  );
}
