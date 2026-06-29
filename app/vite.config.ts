import { defineConfig } from 'vite';

// During `vite dev`, proxy /api to the locally running Functions host
// (started with `func start` in ../api, default port 7071).
export default defineConfig({
  build: {
    outDir: 'dist',
    target: 'es2021',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:7071',
        changeOrigin: true,
      },
    },
  },
});
