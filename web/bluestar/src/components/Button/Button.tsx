import { css } from "goober";

type ButtonProps = {
  /** Button contents */
  label: string;
  onClick: () => void;
};

export default function Button({ label, ...props }: ButtonProps) {
  return (
    <button
      className={css`
        border-radius: 4px;
        border: none;
        font-size: 14px;
        color: #ffffff;
        padding: 8px 20px;
        display: inline-block;
        background-color: #7da7d9;

        &:hover {
          box-shadow: 0 8px 16px 0 rgba(0, 0, 0, 0.6);
        }
      `}
      {...props}
    >
      <span
        className={css`
          font-size: 14px;
          color: #ffffff;
        `}
      >
        {label}
      </span>
    </button>
  );
}
