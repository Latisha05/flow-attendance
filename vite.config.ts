import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    // Cloudflare must run before tanstackStart and own the "ssr" environment.
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    // Redirect the bundled server entry to src/server.ts (our SSR error wrapper).
    tanstackStart({ server: { entry: "server" } }),
    react(),
    tailwindcss(),
    // Provides the "@/..." path alias from tsconfig.
    tsConfigPaths(),
  ],
});
