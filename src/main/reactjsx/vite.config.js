import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "../../../target/generated-webapp",
    emptyOutDir: true
  },
  server: {
    proxy: {
      "/drmcd/rest": "http://localhost:8080",
      "/drmcd/ws": {
        target: "ws://localhost:8080",
        ws: true
      }
    }
  }
});
