import { defineConfig } from "vite";
import reactRefresh from "@vitejs/plugin-react-refresh";

// https://vitejs.dev/config/
export default defineConfig({
  assetsInclude: "./src/assets",
  server: {
    port: 8080,
  },
  resolve: {
    alias: {
      shared: "./src/shared",
      main: "./src/main",
      components: "./src/components",
      assets: "./src/assets",
    },
  },
  plugins: [reactRefresh()],
});
