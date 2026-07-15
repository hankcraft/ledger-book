import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const apiTarget = process.env.API_PROXY_TARGET ?? "http://localhost:3000";

export default defineConfig({
  plugins: [vue()],
  envDir: "../..",
  server: {
    host: true,
    proxy: {
      "/api": apiTarget,
    },
  },
});
