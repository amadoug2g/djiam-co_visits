/* Règles de la visite : collisions, limites de la parcelle, placement dans une pièce. */
import { describe, expect, it } from 'vitest';
import { GABARITS } from '../src/data';
import { buildScene } from '../src/geo/build';
import { freeSpotNear, houseBox, makeHit, walkBounds } from '../src/engine/walk';

const G = GABARITS.m3, S = buildScene(G), hit = makeHit(S.COLL, walkBounds(G));

describe('visite M3', () => {
  it('le point de départ (allée côté rue) est libre', () => { expect(hit(12.6, 26.9)).toBe(false); });
  it('on ne traverse pas un mur ni la piscine', () => {
    expect(hit(12.3, 20)).toBe(true);   // mur porche / suite
    expect(hit(12.8, 6)).toBe(true);    // piscine
  });
  it('on ne sort pas de la parcelle', () => { expect(hit(.5, 15)).toBe(true); expect(hit(12, 28.5)).toBe(true); });
  it('les passages latéraux sont praticables', () => { expect(hit(1.75, 18)).toBe(false); expect(hit(20.2, 18)).toBe(false); });
  it('chaque pièce intérieure a un point libre près de son centre', () => {
    const blocked = G.rooms.filter(r => r.grp === 'int').filter(r => {
      const xs = r.poly.map(p => p[0]), zs = r.poly.map(p => p[1]);
      const [x, z] = freeSpotNear(hit, (Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...zs) + Math.max(...zs)) / 2);
      return hit(x, z);
    }).map(r => r.id);
    expect(blocked).toEqual([]);
  });
  it('la maison englobe toutes les pièces intérieures', () => {
    const [x0, z0, x1, z1] = houseBox(G);
    expect(G.rooms.filter(r => r.grp === 'int').every(r => r.poly.every(([x, z]) => x >= x0 && x <= x1 && z >= z0 && z <= z1))).toBe(true);
  });
});
