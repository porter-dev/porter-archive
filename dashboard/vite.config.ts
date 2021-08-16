import { defineConfig, loadEnv } from "vite";
import reactRefresh from "@vitejs/plugin-react-refresh";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "./");
  return {
    assetsInclude: path.resolve(__dirname, "/src/assets"),
    server: {
      host: "0.0.0.0",
      port: 8080,
      proxy: {
        "/api": {
          target: env.VITE_API_SERVER,
          changeOrigin: true,
          ws: true,
        },
      },
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
  };
});
