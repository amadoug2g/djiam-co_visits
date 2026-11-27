/* L'escalier doit pouvoir se monter : départ au niveau du hall, marches régulières, arrivée à l'étage. */
import { describe, expect, it } from 'vitest';
import { GABARITS } from '../src/data';
import { stairBoxes } from '../src/geo/build';

const G = GABARITS.m3, B = stairBoxes(G).filter(b => b.kind !== 'limon'), FL = G.heights.floor, st = G.stairs;

describe('escalier M3', () => {
  it('la première marche est côté hall, à hauteur de marche', () => {
    expect(B[0].z0).toBeCloseTo(st.from);
    expect(B[0].y1 - FL).toBeLessThanOrEqual(.2);
  });
  it('en suivant la montée, chaque marche est plus haute que la précédente, d’au plus 20 cm', () => {
    for (let i = 1; i < B.length; i++) {
      const dh = B[i].y1 - B[i - 1].y1;
      if (B[i].kind === 'palier') { expect(dh).toBeCloseTo(0); continue; }
      expect(dh, `marche ${i}`).toBeGreaterThan(0); expect(dh, `marche ${i}`).toBeLessThanOrEqual(.2 + 1e-9);
    }
  });
  it('chaque marche touche la suivante (pas de vide ni de chevauchement)', () => {
    for (let i = 1; i < B.length; i++) {
      const a = B[i - 1], b = B[i];
      const touches = Math.abs(a.z1 - b.z0) < 1e-6 || Math.abs(a.z0 - b.z1) < 1e-6 || (b.kind === 'palier' || a.kind === 'palier');
      expect(touches, `marches ${i - 1} et ${i}`).toBe(true);
    }
  });
  it('le palier est au fond, côté façade, et l’arrivée revient côté hall à hauteur d’étage', () => {
    const pal = B.find(b => b.kind === 'palier')!, last = B[B.length - 1];
    expect(pal.z0).toBeCloseTo(st.to);
    expect(last.z0).toBeCloseTo(st.from);
    expect(last.y1).toBeCloseTo(FL + G.heights.rdc);
  });
});
