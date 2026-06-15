import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // 0.0.0.0 is required in WSL so the dev server is reachable
    // from the Windows browser at http://localhost:5173
    host: '0.0.0.0',
    port: 5173,
    // Proxy API calls to the backend so you don't need CORS config in dev
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        // Rewrite is NOT needed; path already starts with /api
      },
    },
  },
  // Needed for hot module reload to work reliably in WSL2
  watch: {
    usePolling: true,
    interval: 500,
  },
});
