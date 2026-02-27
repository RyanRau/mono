import { css } from "goober";
import { useTheme } from "../../../theme";
import Flexbox from "../Flexbox/Flexbox";

export type AppShellProps = {
  /** The main page content. */
  children: React.ReactNode;
  /**
   * Top navigation bar. Pass a `<NavBar />` component.
   * When provided it is rendered sticky at the top of the viewport.
   */
  topNav?: React.ReactNode;
  /**
   * Side navigation panel. Pass a `<SideNav />` component.
   * Rendered in a fixed-height column to the left of the main content.
   */
  sideNav?: React.ReactNode;
};

export default function AppShell({ children, topNav, sideNav }: AppShellProps) {
  const theme = useTheme();

  return (
    <Flexbox
      direction="column"
      height="100vh"
      style={{ backgroundColor: theme.colors.background, overflow: "hidden" }}
    >
      {topNav && (
        <div
          className={css`
            flex-shrink: 0;
            z-index: 10;
          `}
        >
          {topNav}
        </div>
      )}
      <Flexbox grow={1} style={{ overflow: "hidden" }}>
        {sideNav && (
          <div
            className={css`
              flex-shrink: 0;
              height: 100%;
              overflow-y: auto;
            `}
          >
            {sideNav}
          </div>
        )}
        <main
          className={css`
            flex: 1;
            overflow-y: auto;
            background-color: ${theme.colors.background};
          `}
        >
          {children}
        </main>
      </Flexbox>
    </Flexbox>
  );
}
