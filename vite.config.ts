import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.svg", "icon.svg", "robots.txt"],
        manifest: {
          name: "CipherSolve AI — Captcha Decoder",
          short_name: "CipherSolve",
          description:
            "An intelligent utility to solve text and mathematical CAPTCHAs from uploaded or pasted images.",
          theme_color: "#0F0F11",
          background_color: "#0F0F11",
          display: "standalone",
          orientation: "portrait-primary",
          scope: "/",
          start_url: "/",
          categories: ["utilities", "productivity"],
          icons: [
            {
              src: "/icon.svg",
              sizes: "any",
              type: "image/svg+xml",
              purpose: "any",
            },
            {
              src: "/icon.svg",
              sizes: "512x512",
              type: "image/svg+xml",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,svg,woff2}"],
          navigateFallback: "/index.html",
          runtimeCaching: [
            {
              urlPattern: /^\/api\/.*/i,
              handler: "NetworkOnly",
            },
          ],
        },
        devOptions: {
          enabled: true,
        },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== "true",
      watch: process.env.DISABLE_HMR === "true" ? null : {},
    },
  };
});
