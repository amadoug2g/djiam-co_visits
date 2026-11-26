import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';

/** écrit dist/sw.js avec la liste des fichiers du build et une version tirée de leur contenu */
function serviceWorker(): Plugin {
  return {
    name: 'villa-service-worker',
    apply: 'build',
    closeBundle() {
      const dist = join(__dirname, 'dist'), files: string[] = [];
      const walk = (d: string) => readdirSync(d).forEach(f => { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else files.push(relative(dist, p).split('\\').join('/')); });
      walk(dist);
      const list = files.filter(f => f !== 'sw.js' && f !== '.nojekyll').sort();
      const h = createHash('sha256'); for (const f of list) { h.update(f); h.update(readFileSync(join(dist, f))); }
      const tpl = readFileSync(join(__dirname, 'scripts/sw-template.js'), 'utf8'); h.update(tpl);
      const sw = tpl
        .replace('__VERSION__', h.digest('hex').slice(0, 12))
        .replace('__FILES__', JSON.stringify(['./', ...list.filter(f => f !== 'index.html')]));
      if (sw.includes('__VERSION__') || sw.includes('__FILES__')) throw new Error('sw.js : marqueur non remplacé');
      writeFileSync(join(dist, 'sw.js'), sw);
    },
  };
}

export default defineConfig({
  plugins: [react(), serviceWorker()],
  base: './',
  build: { target: 'es2022', chunkSizeWarningLimit: 900 },
  test: { include: ['tests/**/*.test.ts'], testTimeout: 60000 },
});
