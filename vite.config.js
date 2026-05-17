import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      devOptions: {
        enabled: false,
      },
      manifest: {
        name: "Remindly",
        short_name: "Remindly",
        description: "To-do + Reminder App",
        theme_color: "#000000",
        background_color: "#000000",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/bell.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/bell.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
});
