import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { execSync } from 'child_process';

// Git-Kurz-Hash für die Versionsanzeige im Dev-Build: macht sichtbar, welcher
// Stand gerade läuft (die Versionsnummer ändert sich nur bei Releases).
function gitCommit(): string {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
}

export default defineConfig({
  plugins: [react()],
  define: {
    __GIT_COMMIT__: JSON.stringify(gitCommit()),
  },
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
