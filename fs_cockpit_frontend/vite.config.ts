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
          manualChunks: (id) => {
            // Core React vendor bundle
            if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
              return "vendor-react";
            }
            // React Router
            if (id.includes("node_modules/react-router-dom")) {
              return "vendor-router";
            }
            // MSAL authentication
            if (id.includes("node_modules/@azure/msal")) {
              return "msal";
            }
            // Radix UI components (all together for shared dependencies)
            if (id.includes("node_modules/@radix-ui")) {
              return "radix-ui";
            }
            // Lucide icons
            if (id.includes("node_modules/lucide-react")) {
              return "icons";
            }
            // Axios HTTP client
            if (id.includes("node_modules/axios")) {
              return "vendor-axios";
            }
            // Utility libraries (clsx, tailwind-merge, class-variance-authority)
            if (
              id.includes("node_modules/clsx") ||
              id.includes("node_modules/tailwind-merge") ||
              id.includes("node_modules/class-variance-authority")
            ) {
              return "utils";
            }
            // Application pages
            if (id.includes("/src/pages/")) {
              return "pages";
            }
            // Ticket components (largest component group)
            if (id.includes("/src/components/tickets/")) {
              return "components-tickets";
            }
            // Other components
            if (id.includes("/src/components/")) {
              return "components";
            }
            // Services (API, etc.)
            if (id.includes("/src/services/")) {
              return "services";
            }
            // Context providers
            if (id.includes("/src/context/")) {
              return "context";
            }
            // Other vendor packages
            if (id.includes("node_modules")) {
              return "vendor-misc";
            }
          },
        },
      },
      chunkSizeWarningLimit: 1000,
      cssCodeSplit: true,
    },
  };
});
