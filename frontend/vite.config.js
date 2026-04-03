import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  // Vite 8 uses oxc by default; enable JSX parsing for .js files.
  oxc: {
    parser: {
      jsx: true,
    },
    jsx: {
      runtime: "automatic",
      development: true,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    host: "127.0.0.1",
    strictPort: true,
  },
});

