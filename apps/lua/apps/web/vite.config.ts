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
  build: {
    rollupOptions: {
      output: {
        // Schwere, selten/optional genutzte Libs in eigene Chunks — recharts wird nur
        // von den NATASCHA-gegateten Klassen/Schüler-Views geladen, dnd-kit nur im Baukasten.
        manualChunks: {
          recharts: ['recharts'],
          dndkit: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
        },
      },
    },
  },
});
