import { css } from "goober";
import { useState } from "react";
import { useTheme } from "../../../theme";
import Spinner from "../../feedback/Spinner/Spinner";

/** Common aspect ratios for the photo container. */
export type AspectRatio = "1/1" | "4/3" | "3/2" | "16/9" | "3/4" | "2/3" | "9/16";

export type PhotoDisplayProps = {
  /** URL of the image to display. */
  url: string;
  /** Accessible description of the image. */
  alt: string;
  /**
   * Aspect ratio of the container.
   * - `"1/1"` — square (default)
   * - `"4/3"` — landscape
   * - `"3/2"` — classic photo
   * - `"16/9"` — widescreen
   * - `"3/4"` — portrait
   * - `"2/3"` — tall portrait
   * - `"9/16"` — vertical / mobile
   */
  aspectRatio?: AspectRatio;
  /** Called when the photo is clicked. Adds a pointer cursor when provided. */
  onClick?: () => void;
};

export default function PhotoDisplay({
  url,
  alt,
  aspectRatio = "1/1",
  onClick,
}: PhotoDisplayProps) {
  const theme = useTheme();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);

  const isClickable = onClick !== undefined;

  return (
    <div
      onClick={onClick}
      className={css`
        position: relative;
        width: 100%;
        aspect-ratio: ${aspectRatio};
        overflow: hidden;
        border-radius: ${theme.radius};
        background-color: ${theme.colors.surface};
        cursor: ${isClickable ? "pointer" : "default"};
        ${isClickable
          ? `
          transition: box-shadow 0.15s ease;
          &:hover { box-shadow: ${theme.shadow}; }
        `
          : ""}
      `}
    >
      {/* Spinner shown while the image is loading */}
      {!isLoaded && !isError && (
        <span
          className={css`
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          `}
        >
          <Spinner />
        </span>
      )}

      {/* Error state */}
      {isError && (
        <span
          className={css`
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            color: ${theme.colors.textMuted};
            font-family: ${theme.fonts.body};
            font-size: 13px;
          `}
        >
          Failed to load image
        </span>
      )}

      <img
        src={url}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        onError={() => setIsError(true)}
        className={css`
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: ${isLoaded ? 1 : 0};
          transition: opacity 0.2s ease;
        `}
      />
    </div>
  );
}
