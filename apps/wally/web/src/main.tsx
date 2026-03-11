import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { NhostProvider } from "@nhost/react";
import nhost from "./nhost";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <NhostProvider nhost={nhost}>
      <App />
    </NhostProvider>
  </StrictMode>
);
