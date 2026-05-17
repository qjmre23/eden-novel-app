import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss()],
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
    outDir: path.resolve(import.meta.dirname, "dist/android"),
    emptyOutDir: true,
    minify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          framer: ["framer-motion"],
          dexie: ["dexie", "dexie-react-hooks"],
        },
      },
    },
  },
});
