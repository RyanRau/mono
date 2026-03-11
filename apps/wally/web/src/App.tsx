import { useAuthenticationStatus } from "@nhost/react";
import { ThemeProvider, Spinner, Flexbox } from "bluestar";
import Login from "./Login";
import Dashboard from "./Dashboard";

export default function App() {
  const { isAuthenticated, isLoading } = useAuthenticationStatus();

  return (
    <ThemeProvider>
      {isLoading ? (
        <Flexbox justifyContent="center" alignItems="center" height="100vh">
          <Spinner size={32} />
        </Flexbox>
      ) : isAuthenticated ? (
        <Dashboard />
      ) : (
        <Login />
      )}
    </ThemeProvider>
  );
}
