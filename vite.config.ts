import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
// If deploying to GitHub Pages as a project site, set base to the repo name so
// built assets are requested from /<repo>/assets/... instead of /. For local
// dev we keep base as '/'. Hardcoding the GitHub repo name is gross but for now let's keep it simple
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
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
