import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'node:fs';
import { extractReleaseNotes } from './releaseNotes.mjs';
import tauri from '../../src-tauri/tauri.conf.json';

// Git-Kurz-Hash für die Versionsanzeige im Dev-Build: macht sichtbar, welcher
// Stand gerade läuft (die Versionsnummer ändert sich nur bei Releases).
function gitCommit(): string {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
}

const changelog = path.resolve(__dirname, '../../../../CHANGELOG.md');

export default defineConfig({
  plugins: [react()],
  define: {
    __GIT_COMMIT__: JSON.stringify(gitCommit()),
    __INSTALLED_RELEASE_NOTES__: JSON.stringify(
      existsSync(changelog) ? extractReleaseNotes(readFileSync(changelog, 'utf8'), tauri.version) : '',
    ),
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
