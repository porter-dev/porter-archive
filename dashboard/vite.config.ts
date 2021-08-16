import { defineConfig } from "vite";
import reactRefresh from "@vitejs/plugin-react-refresh";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  assetsInclude: path.resolve(__dirname, "/src/assets"),
  server: {
    port: 8080,
  },
  resolve: {
    alias: {
      shared: path.resolve(__dirname, "/src/shared"),
      main: path.resolve(__dirname, "/src/main"),
      components: path.resolve(__dirname, "/src/components"),
      assets: path.resolve(__dirname, "/src/assets"),
    },
  },
  plugins: [reactRefresh()],
});
