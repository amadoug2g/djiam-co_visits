/* Non-régression : la géométrie générée depuis m3.json doit être identique à celle du prototype corrigé
   (reference/prototype-corrige), aux écarts voulus près, listés et vérifiés un par un ci-dessous.

   Méthode :
   1. on compare les triangles un à un (sommets arrondis au 1/10 mm, motif, couleur) ;
   2. ce qui reste (même surface découpée autrement, arrondis) doit avoir, par calque, motif et couleur,
      la même aire et les mêmes moments d'ordre 1 et 2 : une surface déplacée ou retaillée est détectée. */
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { buildScene, type SceneGeo } from '../src/geo/build';
import { GABARITS } from '../src/data';

const require = createRequire(import.meta.url);
require('../reference/prototype-corrige/model.js');
const REF_GEO = require('../reference/prototype-corrige/geo.js') as { buildScene: (m: unknown) => SceneGeo };
const REF_MODEL = (globalThis as unknown as { VILLA_MODEL: unknown }).VILLA_MODEL;

type Tri = { batch: string; mat: number; col: string; v: number[][]; key: string };
const f4 = (x: number) => (Math.round(x * 1e4) / 1e4 + 0).toFixed(4);

function triangles(S: SceneGeo): Tri[] {
  const out: Tri[] = [];
  for (const [batch, b] of Object.entries(S.BATCH)) {
    if (!b) continue;
    for (let t = 0; t < b.i.length; t += 3) {
      const ids = [b.i[t], b.i[t + 1], b.i[t + 2]];
      const v = ids.map(i => [b.p[i * 3], b.p[i * 3 + 1], b.p[i * 3 + 2]]);
      const mat = b.m[ids[0]], col = [0, 1, 2].map(k => b.c[ids[0] * 3 + k].toFixed(4)).join(',');
      const key = batch + '|' + mat + '|' + col + '|' + v.map(p => p.map(f4).join(',')).sort().join(';');
      out.push({ batch, mat, col, v, key });
    }
  }
  return out;
}
function diff(a: Tri[], b: Tri[]): Tri[] {
  const cnt = new Map<string, number>();
  for (const t of b) cnt.set(t.key, (cnt.get(t.key) || 0) + 1);
  const out: Tri[] = [];
  for (const t of a) { const n = cnt.get(t.key) || 0; if (n > 0) cnt.set(t.key, n - 1); else out.push(t); }
  return out;
}
/** aire, moments d'ordre 1 et 2, par calque, motif et couleur */
function moments(T: Tri[]) {
  const M = new Map<string, number[]>();
  for (const t of T) {
    const [a, b, c] = t.v, e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const A = Math.hypot(e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]) / 2;
    const k = t.batch + '|' + t.mat + '|' + t.col, m = M.get(k) || new Array(10).fill(0);
    m[0] += A;
    for (let i = 0; i < 3; i++) m[1 + i] += A * (a[i] + b[i] + c[i]) / 3;
    let j = 4;
    for (let p = 0; p < 3; p++) for (let q = p; q < 3; q++, j++)
      m[j] += A / 12 * (a[p] * a[q] + b[p] * b[q] + c[p] * c[q] + (a[p] + b[p] + c[p]) * (a[q] + b[q] + c[q]));
    M.set(k, m);
  }
  return M;
}

/* ---------- écarts voulus par rapport au prototype corrigé ---------- */
type Box3 = [number, number, number, number, number, number]; // x0,y0,z0,x1,y1,z1
const IN = (t: Tri, r: Box3) => {
  const c = [0, 1, 2].map(i => (t.v[0][i] + t.v[1][i] + t.v[2][i]) / 3);
  return c[0] >= r[0] && c[0] <= r[3] && c[1] >= r[1] && c[1] <= r[4] && c[2] >= r[2] && c[2] <= r[5];
};
const ANY = 1e9;
interface Ecart { id: string; why: string; ref?: (t: Tri) => boolean; port?: (t: Tri) => boolean }
const POTS: [number, number][] = [[19.4, 3.6], [18.6, 3.55], [6.4, 3.6], [12.9, 9.75], [19.05, 9.7]];
const vegetation = (t: Tri) => t.mat === 13 && (IN(t, [-2.5, -ANY, 3.5, 7.5, ANY, 26]) || POTS.some(([x, z]) => IN(t, [x - .8, -ANY, z - .8, x + .8, ANY, z + .8])));
const annexWalls = (t: Tri) => t.batch === 'base' && t.mat === 12 && (IN(t, [19.2, -ANY, 3.0, 20.9, ANY, 5.3]) || IN(t, [4.6, -ANY, 5.98, 5.15, ANY, 6.15]) || IN(t, [20.0, -ANY, 6.6, 20.85, ANY, 6.8]));
const stairs = (t: Tri) => t.batch === 'base' && (t.mat === 5 || t.mat === 0) && IN(t, [6.42, -ANY, 18.49, 8.82, ANY, 22.27]);
const ECARTS: Ecart[] = [
  { id: 'claustra', why: 'Claustra de façade placée selon les données (devant l’escalier). Le prototype la retournait une seconde fois, devant la suite.',
    ref: t => t.mat === 6 && IN(t, [12.0, -ANY, 22.8, 14.1, ANY, 22.95]), port: t => t.mat === 6 && IN(t, [6.69, -ANY, 22.8, 8.78, ANY, 22.95]) },
  { id: 'palier', why: 'Palier de l’ancienne sortie latérale, resté à l’ancienne place dans la buanderie : supprimé.',
    ref: t => t.mat === 7 && IN(t, [3.27, -ANY, 16.6, 4.69, ANY, 18.51]) },
  { id: 'murs-annexes', why: 'Hauteurs des murs du local technique (2,4 m), du pool house (2,8 m) et de la douche (2,2 m) : la règle du prototype visait l’ancien côté.',
    ref: annexWalls, port: annexWalls },
  { id: 'spot-porche', why: 'Plafonnier du porche, resté à l’ancienne place du porche (dans l’escalier).',
    ref: t => t.mat === 8 && IN(t, [8.0, -ANY, 21.7, 8.3, ANY, 21.9]), port: t => t.mat === 8 && IN(t, [10.5, -ANY, 21.7, 10.8, ANY, 21.9]) },
  { id: 'escalier', why: 'Escalier remis dans le sens du plan : marches depuis le hall, palier côté façade. Le prototype posait le palier de 1,70 m à l’entrée, côté hall.',
    ref: stairs, port: stairs },
  { id: 'vegetation', why: 'Feuillage des 3 palmiers et 5 pots du fond : même position, même taille, mais tirage au hasard non symétrique (le prototype les obtenait par symétrie).',
    ref: vegetation, port: vegetation },
];

describe('géométrie M3 contre le prototype corrigé', () => {
  const ref = REF_GEO.buildScene(REF_MODEL), port = buildScene(GABARITS.m3);
  const TR = triangles(ref), TP = triangles(port);
  const onlyRef = diff(TR, TP), onlyPort = diff(TP, TR);

  it('chaque écart voulu est bien présent', () => {
    for (const e of ECARTS) {
      const n = (e.ref ? onlyRef.filter(e.ref).length : 0) + (e.port ? onlyPort.filter(e.port).length : 0);
      expect(n, e.id).toBeGreaterThan(0);
    }
  });

  it('en dehors des écarts voulus, les surfaces sont identiques', () => {
    const restR = onlyRef.filter(t => !ECARTS.some(e => e.ref?.(t))), restP = onlyPort.filter(t => !ECARTS.some(e => e.port?.(t)));
    const MR = moments(restR), MP = moments(restP), keys = new Set([...MR.keys(), ...MP.keys()]);
    const bad: string[] = [];
    for (const k of keys) {
      const a = MR.get(k) || new Array(10).fill(0), b = MP.get(k) || new Array(10).fill(0);
      if (a.some((v, i) => Math.abs(v - b[i]) > 1e-4 * (1 + Math.abs(v)))) bad.push(`${k} aire ${a[0].toFixed(5)} / ${b[0].toFixed(5)}`);
    }
    console.log(`triangles : prototype ${TR.length}, portage ${TP.length} ; différents un à un : ${onlyRef.length} / ${onlyPort.length} ; reste après écarts voulus : ${restR.length} / ${restP.length}`);
    for (const e of ECARTS) console.log(`  écart ${e.id} : ${e.ref ? onlyRef.filter(e.ref).length : 0} triangles retirés, ${e.port ? onlyPort.filter(e.port).length : 0} ajoutés`);
    expect(bad).toEqual([]);
  });

  it('mêmes zones de collision', () => {
    const k = (r: number[]) => r.map(f4).join(',');
    expect(port.COLL.map(k).sort()).toEqual(ref.COLL.map(k).sort());
  });

  it('mêmes éclairages, sauf le plafonnier du porche', () => {
    const k = (l: SceneGeo['LIGHTS'][number]) => [...l.p.map(f4), l.I, l.st].join(',');
    const R = ref.LIGHTS.map(k).sort(), P = port.LIGHTS.map(k).sort();
    expect(R.filter(x => !P.includes(x))).toEqual(['8.1400,2.9700,21.8000,2.6,roof']);
    expect(P.filter(x => !R.includes(x))).toEqual(['10.6300,2.9700,21.8000,2.6,roof']);
  });
});
