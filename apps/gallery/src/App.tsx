import { useAuthenticationStatus } from "@nhost/react";
import { ThemeProvider, Spinner, Flexbox } from "bluestar";
import Gallery from "./Gallery";

export default function App() {
  const { isAuthenticated, isLoading } = useAuthenticationStatus();

  if (isLoading) {
    return (
      <ThemeProvider>
        <Flexbox justifyContent="center" alignItems="center" height="100vh">
          <Spinner size={32} />
        </Flexbox>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <Gallery isAuthenticated={isAuthenticated} />
    </ThemeProvider>
  );
}
