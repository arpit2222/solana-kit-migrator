import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const port = Number(process.env.PORT ?? "5173");

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${process.env.PORT ?? "5173"}"`);
}

export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(repoRoot, "artifacts/solana-migrator/src"),
      "@assets": path.resolve(repoRoot, "attached_assets"),
      react: path.resolve(repoRoot, "artifacts/solana-migrator/node_modules/react"),
      "react-dom": path.resolve(
        repoRoot,
        "artifacts/solana-migrator/node_modules/react-dom",
      ),
      "react/jsx-runtime": path.resolve(
        repoRoot,
        "artifacts/solana-migrator/node_modules/react/jsx-runtime.js",
      ),
      "react/jsx-dev-runtime": path.resolve(
        repoRoot,
        "artifacts/solana-migrator/node_modules/react/jsx-dev-runtime.js",
      ),
      "react-dom/client": path.resolve(
        repoRoot,
        "artifacts/solana-migrator/node_modules/react-dom/client.js",
      ),
    },
    dedupe: ["react", "react-dom"],
  },
  root: repoRoot,
  build: {
    outDir: path.resolve(import.meta.dirname, "public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      allow: [repoRoot],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
