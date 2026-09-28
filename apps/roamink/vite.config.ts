import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@appdeploy/client': fileURLToPath(new URL('./src/appdeploy-client.js', import.meta.url)),
    },
  },
  base: './',
  build: {
    outDir: process.env.APPDEPLOY_VITE_OUT_DIR || 'dist',
    sourcemap:
      process.env.APPDEPLOY_VITE_SOURCEMAP === 'hidden' ? 'hidden' : false,
    rollupOptions: {
      maxParallelFileOps: 128,
    },
  },
});
