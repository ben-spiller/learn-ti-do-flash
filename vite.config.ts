import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
// If deploying to GitHub Pages as a project site, set base to the repo name so
// built assets are requested from /<repo>/assets/... instead of /. For local
// dev we keep base as '/'.
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/learn-ti-do-flash/' : '/',
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
