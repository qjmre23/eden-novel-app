import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT ?? "5173";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  // Bridge Replit secrets (stored without VITE_ prefix) into Vite's client bundle.
  // Priority: VITE_* (if set directly) → bare key name (Replit secret) → ''
  define: {
    'import.meta.env.VITE_GROK_API_KEY':     JSON.stringify(process.env.VITE_GROK_API_KEY     || process.env.GROK_API_KEY     || ''),
    'import.meta.env.VITE_GEMINI_API_KEY':   JSON.stringify(process.env.VITE_GEMINI_API_KEY   || process.env.GEMINI_API_KEY   || ''),
    'import.meta.env.VITE_OPENAI_API_KEY':   JSON.stringify(process.env.VITE_OPENAI_API_KEY   || process.env.OPENAI_API_KEY   || ''),
    'import.meta.env.VITE_CLAUDE_API_KEY':   JSON.stringify(process.env.VITE_CLAUDE_API_KEY   || process.env.CLAUDE_API_KEY   || ''),
    'import.meta.env.VITE_DEEPSEEK_API_KEY': JSON.stringify(process.env.VITE_DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY || ''),
    'import.meta.env.VITE_BEDROCK_API_KEY':  JSON.stringify(process.env.VITE_BEDROCK_API_KEY  || process.env.BEDROCK_API_KEY  || ''),
    'import.meta.env.VITE_HF_TOKEN':         JSON.stringify(process.env.VITE_HF_TOKEN         || process.env.HF_TOKEN         || ''),
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
    proxy: {
      // Forward /<basePath>/api/... → api-server (port 8080).
      // API_BASE in services is `${BASE_URL}api`, so when basePath is /eden-novel/
      // the actual request path is /eden-novel/api/...; strip the prefix and
      // rewrite to /api/... so the api-server receives the correct path.
      [`${basePath.replace(/\/$/, "")}/api`]: {
        target: `http://localhost:${process.env.API_SERVER_PORT || 8080}`,
        changeOrigin: true,
        rewrite: (p: string) =>
          "/api" + p.slice(`${basePath.replace(/\/$/, "")}/api`.length),
      },
      "/nova": {
        target: `http://localhost:${process.env.NOVA_SERVER_PORT || 3001}`,
        changeOrigin: true,
        ws: true,
      },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
