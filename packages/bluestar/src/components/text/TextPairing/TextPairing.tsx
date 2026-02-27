import Header from "../Header/Header";
import Text from "../Text/Text";
import Flexbox from "../../layout/Flexbox/Flexbox";
import type { HeaderVariant } from "../Header/Header";
import type { TextType } from "../Text/Text";

type TextPairingProps = {
  /** The primary title. */
  title: string;
  /** The supporting subtitle displayed beneath the title. */
  subtitle: string;
  /** Header variant for the title. Defaults to `"h2"`. */
  titleVariant?: HeaderVariant;
  /** Text type for the subtitle. Defaults to `"caption"`. */
  subtitleVariant?: TextType;
};

export default function TextPairing({
  title,
  subtitle,
  titleVariant = "h2",
  subtitleVariant = "caption",
}: TextPairingProps) {
  return (
    <Flexbox direction="column" gap={4}>
      <Header variant={titleVariant}>{title}</Header>
      <Text variant={subtitleVariant}>{subtitle}</Text>
    </Flexbox>
  );
}
