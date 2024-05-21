import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig(({ mode }) => ({
  plugins: [react(), nodePolyfills()],
  resolve: {
    alias: {
      assets: "/src/assets",
      components: "/src/components",
      legacy: "/src/legacy",
      lib: "/src/lib",
      main: "/src/main",
      shared: "/src/shared",
      utils: "/src/utils",
    },
  },
  build: {
    outDir: "build",
  },
  server: {
    port: 8081,
    proxy: {
      ...(mode === "development" && {
        "/api": {
          target: "http://localhost:8080",
          changeOrigin: true,
          ws: true,
        },
      }),
    },
  },
}));
