import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vite.dev/config/
const proxy = {
  '/api': 'http://localhost:3001', // Express backend
};

export default defineConfig({
  plugins: [react()],
  server: { proxy },
  // `vite preview` serves the real production bundle. Without this it can't
  // reach the API, so bundling bugs that only exist in the built output —
  // chunk ordering, asset MIME types — stay invisible until deploy.
  preview: { proxy },
});
