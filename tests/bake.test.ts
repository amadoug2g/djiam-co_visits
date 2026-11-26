/* Le calcul de lumière porté doit produire exactement le même fichier que bake.js du prototype corrigé
   (sur la géométrie du prototype, avec 1 rayon par sommet pour rester rapide). */
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('calcul de lumière', () => {
  it('identique octet pour octet au bake.js du prototype', () => {
    const dir = mkdtempSync(join(tmpdir(), 'bake-ref-'));
    try {
      for (const f of ['bake.js', 'geo.js', 'model.js', 'package.json']) copyFileSync(join('reference/prototype-corrige', f), join(dir, f));
      execFileSync(process.execPath, ['bake.js', '1'], { cwd: dir, stdio: 'pipe' });
      const out = execFileSync(process.execPath, ['--import', 'tsx', 'scripts/bake-ref-check.ts', dir, '1'], { encoding: 'utf8' });
      expect(out).toMatch(/octets différents : 0/);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }, 120000);
});
