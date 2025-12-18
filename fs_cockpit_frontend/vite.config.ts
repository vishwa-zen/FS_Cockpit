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
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
        "@components": resolve(__dirname, "./src/components"),
        "@ui": resolve(__dirname, "./src/components/ui"),
        "@types": resolve(__dirname, "./src/types"),
        "@hooks": resolve(__dirname, "./src/hooks"),
        "@services": resolve(__dirname, "./src/services"),
        "@lib": resolve(__dirname, "./src/lib"),
        "@config": resolve(__dirname, "./src/config"),
        "@context": resolve(__dirname, "./src/context"),
        "@constants": resolve(__dirname, "./src/constants"),
      },
    },
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
            // Single vendor chunk with ALL node_modules to avoid React instance conflicts
            vendor: [
              "react",
              "react-dom",
              "react-router-dom",
              "@azure/msal-browser",
              "@azure/msal-react",
              "axios",
            ],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
      cssCodeSplit: true,
    },
  };
});
