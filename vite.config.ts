import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    hmr: {
      overlay: true,
    },
    proxy: {
      "/supabase-api": {
        target: "https://wyvqgdmnaxwwyduwgzff.supabase.co",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/supabase-api/, ""),
        configure: (proxy) => {
          proxy.on("error", (err) => console.warn("Supabase proxy error:", err.message));
        },
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
