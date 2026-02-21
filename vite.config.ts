import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  // Use a relative base for production so assets are referenced relative to
  // the HTML file. This avoids hardcoding the repo name and works both for
  // GitHub Pages project sites and other static hosts where the app is not
  // served from the domain root.
  base: mode === 'production' ? './' : '/',
  server: {
    host: "::",
    port: 8080,
  },
  define: {
    __BUILD_TIMESTAMP__: JSON.stringify(new Date().toISOString().replaceAll("T", " ").replaceAll("Z", "")),
    __README_MD__: JSON.stringify(fs.readFileSync(path.resolve(__dirname, 'README.md'), 'utf-8')),
    __LICENSE__: JSON.stringify(fs.readFileSync(path.resolve(__dirname, 'LICENSE'), 'utf-8')),
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
