import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    strictPort: true,
  },
  resolve: {
    conditions: ['development'],
  },
  optimizeDeps: {
    exclude: [
      '@lehrunterlagen/schema',
      '@lehrunterlagen/llm',
      '@lehrunterlagen/renderer',
      '@lehrunterlagen/qa',
      '@lehrunterlagen/input',
    ],
  },
});
