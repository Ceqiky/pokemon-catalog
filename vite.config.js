import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // доступ с телефона по IP в локальной сети
    // Разрешаем адреса быстрых HTTPS-туннелей (нужны для проверки датчика наклона на iPhone)
    allowedHosts: [".trycloudflare.com", ".loca.lt", ".ngrok-free.app", ".ngrok.app"],
  },
  preview: {
    host: true,
    allowedHosts: [".trycloudflare.com", ".loca.lt", ".ngrok-free.app", ".ngrok.app"],
  },
  build: {
    target: "es2022", // современные браузеры: без лишних полифиллов и транспиляции
    rollupOptions: {
      output: {
        // React выносим в отдельный файл: он меняется редко, поэтому кэшируется между обновлениями приложения
        manualChunks: {
          react: ["react", "react-dom"],
        },
      },
    },
  },
});
