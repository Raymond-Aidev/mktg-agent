import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // During local dev, proxy API calls to the Express server on :8080.
    proxy: {
      "/api": "http://localhost:8080",
      "/admin": "http://localhost:8080",
      "/webhooks": "http://localhost:8080",
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    emptyOutDir: true,
  },
});
