import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [preact()],
  build: { outDir: 'dist', sourcemap: false, chunkSizeWarningLimit: 1500 },
  test: { include: ['tests/**/*.test.ts'], environment: 'node', testTimeout: 60000 },
} as any);
