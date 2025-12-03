import react from "@vitejs/plugin-react";
import tailwind from "tailwindcss";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    publicDir: "./static",
    base: "./",
    css: {
      postcss: {
        plugins: [tailwind()],
      },
    },
    define: {
      "process.env.VITE_API_BASE_URL": JSON.stringify(
        env.VITE_API_BASE_URL || "http://127.0.0.1:8003/api/v1"
      ),
    },
    server: {
      port: 3000,
      strictPort: false,
      host: true,
      cors: true,
    },
    build: {
      outDir: "dist",
      sourcemap: false,
      minify: "esbuild",
      target: "es2020",
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom", "react-router-dom"],
            msal: ["@azure/msal-browser", "@azure/msal-react"],
            ui: [
              "@radix-ui/react-avatar",
              "@radix-ui/react-progress",
              "@radix-ui/react-scroll-area",
              "@radix-ui/react-tabs",
            ],
            icons: ["lucide-react"],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
  };
});
