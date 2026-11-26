/* La lumière pré-calculée doit correspondre à la géométrie actuelle (sinon : npm run bake). */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GABARITS } from '../src/data';
import { buildScene } from '../src/geo/build';
import { geoHash } from '../scripts/bake-core';

describe('lumière pré-calculée', () => {
  for (const id of Object.keys(GABARITS)) {
    it(`${id} : à jour avec la géométrie (sinon relancer npm run bake -- ${id})`, () => {
      const meta = JSON.parse(readFileSync(`public/bake/${id}.json`, 'utf8'));
      const S = buildScene(GABARITS[id]);
      expect(meta.geo).toBe(geoHash(S));
      for (const [k, n] of Object.entries(meta.batches)) expect(S.BATCH[k as keyof typeof S.BATCH]?.nv).toBe(n);
    });
  }
});
