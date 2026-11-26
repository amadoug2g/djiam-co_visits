/* Intégrité du gabarit : identifiants, renvois, sources, cohérence avec le plan. */
import { describe, expect, it } from 'vitest';
import { GABARITS } from '../src/data';
import { area } from '../src/ui/format';

const G = GABARITS.m3;
const ids = [...G.zones, ...G.rooms, ...G.windows, ...G.doors, ...G.slits].map(o => o.id);

describe('gabarit M3', () => {
  it('identifiants uniques', () => {
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });
  it('chaque donnée issue du plan porte sa source (plan ou est)', () => {
    const all = [...G.zones, ...G.windows, ...G.doors, ...G.slits, ...G.cars, ...G.gates,
      ...G.objects.filter(o => o.type !== 'boite' && o.type !== 'spot')];
    const bad = all.filter(o => !('src' in o) || !['plan', 'est'].includes((o as { src: string }).src));
    expect(bad).toEqual([]);
  });
  it('les fenêtres et portes renvoient à une pièce existante', () => {
    const rooms = new Set(G.rooms.map(r => r.id));
    expect([...G.windows, ...G.doors].filter(o => !rooms.has(o.room)).map(o => o.id)).toEqual([]);
  });
  it('les points à vérifier visent un élément existant', () => {
    expect(G.checks.filter(c => c.focus && !ids.includes(c.focus)).map(c => c.id)).toEqual([]);
  });
  it('les points ouverts du correctif sont estimés et listés', () => {
    expect(G.zones.find(z => z.id === 'parking')).toBeTruthy();
    expect(G.doors.find(d => d.id === 'd-cuis-ext')?.src).toBe('est');
    expect(G.checks.map(c => c.focus)).toEqual(expect.arrayContaining(['parking', 'd-cuis-ext']));
  });
  it('plus aucune trace du mécanisme de symétrie provisoire', () => {
    expect(JSON.stringify(G)).not.toMatch(/mirror|claustraX/);
  });
  it('les surfaces indiquées sur le plan restent proches des surfaces dessinées (moins de 5 %)', () => {
    const far = G.rooms.filter(r => r.planArea && Math.abs(area(r.poly) - r.planArea) / r.planArea > .05).map(r => `${r.id} ${area(r.poly).toFixed(2)} / ${r.planArea}`);
    expect(far).toEqual([]);
  });
  it('les objets restent dans la parcelle (hors arbres d’ambiance)', () => {
    const S = G.site, inSite = (x: number, z: number) => x >= S.x && x <= S.x + S.w && z >= S.y && z <= S.y + S.h;
    const out = G.objects.filter(o => o.type !== 'acacia').filter(o => {
      if ('x' in o && 'z' in o) return !inSite(o.x, o.z);
      if (o.type === 'boite') return !inSite(o.r[0] + .2, o.r[2] + .2) || !inSite(o.r[3] - .2, o.r[5] - .2);
      if ('r' in o) return !inSite(o.r[0], o.r[1]) || !inSite(o.r[2], o.r[3]);
      return !inSite(o.x0, o.z0);
    });
    expect(out).toEqual([]);
  });
});
