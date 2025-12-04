import react from "@vitejs/plugin-react";
import tailwind from "tailwindcss";
import { defineConfig, loadEnv } from "vite";
import { copyFileSync } from "fs";
import { resolve } from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),
      {
        name: "copy-web-config",
        closeBundle: () => {
          try {
            copyFileSync(
              resolve(__dirname, "web.config"),
              resolve(__dirname, "dist", "web.config")
            );
            console.log("✓ web.config copied to dist/");
          } catch (err) {
            console.warn("⚠ Failed to copy web.config:", err);
          }
        },
      },
    ],
    publicDir: "./static",
    base: "/",
    css: {
      postcss: {
        plugins: [tailwind()],
      },
    },
    define: {
      "import.meta.env.VITE_API_BASE_URL": JSON.stringify(
        env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1"
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
