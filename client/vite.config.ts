import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
const proxy = {
  '/api': 'http://localhost:3001', // Express backend
};

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Essay Pig',
        short_name: 'Essay Pig',
        description: 'Read and organize your essays',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  server: { proxy },
  // `vite preview` serves the real production bundle. Without this it can't
  // reach the API, so bundling bugs that only exist in the built output —
  // chunk ordering, asset MIME types — stay invisible until deploy.
  preview: { proxy },
});
