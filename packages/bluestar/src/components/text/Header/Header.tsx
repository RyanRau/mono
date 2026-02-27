import { css } from "goober";
import { useTheme } from "../../../theme";

export type HeaderVariant = "h1" | "h2" | "h3";

type HeaderProps = {
  /** The heading content. */
  children: React.ReactNode;
  /**
   * The HTML heading level to render. Controls both the semantic element
   * and the font size / weight.
   */
  variant?: HeaderVariant;
};

export default function Header({ children, variant = "h1" }: HeaderProps) {
  const theme = useTheme();
  const Tag = variant;
  const { size, weight } = theme.headings[variant];

  return (
    <Tag
      className={css`
        font-family: ${theme.fonts.heading};
        font-size: ${size};
        font-weight: ${weight};
        color: ${theme.colors.text};
        margin: 0;
        line-height: 1.2;
      `}
    >
      {children}
    </Tag>
  );
}
