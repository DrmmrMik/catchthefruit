import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Base './' ensures relative asset resolution on GitHub Pages and local PWA
  base: './',

  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/phaser/')) {
            return 'phaser';
          }
          if (id.includes('node_modules/zod/')) {
            return 'zod';
          }
          if (id.includes('node_modules/idb-keyval/')) {
            return 'idb';
          }
        }
      }
    }
  },

  server: {
    port: 3000,
    host: true,
    open: false
  },

  preview: {
    port: 4173,
    host: true
  },

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/**', 'dist/**', 'tests/**']
    }
  }
});
