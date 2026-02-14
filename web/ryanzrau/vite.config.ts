import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@myorg/ui-components": path.resolve(
        __dirname,
        "../../packages/ui-components/src",
      ),
      "@myorg/utils": path.resolve(__dirname, "../../packages/utils/src"),
    },
    preserveSymlinks: true,
  },
});
