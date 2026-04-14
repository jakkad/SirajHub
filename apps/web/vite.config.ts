import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [
    // Must be before react() — generates routeTree.gen.ts from route files
    TanStackRouterVite({
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/routeTree.gen.ts",
    }),
    react(),
    tailwindcss(),
    // Runs the Hono Worker in the Vite dev server via Miniflare.
    // configPath is relative to the root where `vite build` / `pnpm dev` runs (apps/web/).
    cloudflare({
      configPath: "../../wrangler.toml",
    }),
  ],
});
