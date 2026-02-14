import React from "react";
import ReactDOM from "react-dom/client";
import { setup } from "goober";
import App from "./App";

// Setup goober for CSS-in-JS styling
setup(React.createElement);

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
