import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/auth": "http://localhost:8001",
      "/analysis": "http://localhost:8001",
      "/health": "http://localhost:8001",
    },
  },
});
