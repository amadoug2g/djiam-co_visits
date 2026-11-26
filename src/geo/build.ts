/* Construction de la géométrie 3D depuis un gabarit (navigateur et Node).
   Repère : X = x du plan, Z = y du plan, Y = hauteur (m).
   Sortie : des lots de sommets (BATCH) par calque, les rectangles de collision et les éclairages. */
import type { Gabarit, MatName, Objet, Rect } from '../data/types';
import { cross, dot, hex, mRx, mRy, mRz, mS, mT, mul, norm, sub, tp, type M4, type V3 } from './math';

export type BatchKey = 'base' | 'roof' | 'glass' | 'water' | 'glassR';
export const BATCH_ORDER: BatchKey[] = ['base', 'roof', 'glass', 'water', 'glassR'];

export interface Batch {
  p: number[]; n: number[]; c: number[]; m: number[]; i: number[]; nv: number;
  /** grilles de faces subdivisées [premier sommet, largeur, hauteur], pour lisser la lumière */
  g?: [number, number, number][];
}
export interface Light { p: V3; I: number; st: 'roof' | 'both' }
export interface SceneGeo { BATCH: Partial<Record<BatchKey, Batch>>; COLL: Rect[]; LIGHTS: Light[] }

/** motifs de matériau : l'indice est lu par les shaders et le calcul de lumière */
export const MAT: Record<MatName, number> = {
  uni: 0, lames: 1, gazon: 2, eau: 3, mosaique: 4, carrelage: 5, bois: 6, paves: 7,
  lumineux: 8, verre: 9, pierre: 10, ecorce: 11, enduit: 12, feuillage: 13,
};
/** palette nommée utilisable dans les données */
export const PALETTE: Record<string, string> = {
  wall: '#f2f0ea', fence: '#ecebe5', frame: '#3a3d41', glass: '#9fb6c2', floor: '#d9d3c8', deck: '#9b968f',
  lawn: '#557d38', sand: '#c9a27a', paving: '#c3bcb0', park: '#8f8b85', terr: '#dcd7cf', wood: '#8a5a36',
  dark: '#2a2a2c', stone: '#8d8a84', spot: '#fff3d6', door: '#ebe5db',
};
const C = PALETTE;
type Col = string | V3;
const col = (c: Col): V3 => typeof c === 'string' ? hex(c.startsWith('#') ? c : PALETTE[c] ?? '#ff00ff') : c;

const CORN: V3[] = [[-.5, -.5, -.5], [.5, -.5, -.5], [.5, .5, -.5], [-.5, .5, -.5], [-.5, -.5, .5], [.5, -.5, .5], [.5, .5, .5], [-.5, .5, .5]];
const FACES = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 4, 7, 3], [1, 2, 6, 5], [3, 7, 6, 2], [0, 1, 5, 4]];
/** taille des mailles de subdivision des faces (pour la lumière par sommet) */
const CELL = .3, MAXC = 48;

/** Rectangles d'un polygone orthogonal (pour les sols) */
export function rectsOfPoly(poly: [number, number][]): Rect[] {
  const xs = [...new Set(poly.map(p => p[0]))].sort((a, b) => a - b), ys = [...new Set(poly.map(p => p[1]))].sort((a, b) => a - b), out: Rect[] = [];
  const inside = (x: number, y: number) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < ys.length - 1; j++)
    if (inside((xs[i] + xs[i + 1]) / 2, (ys[j] + ys[j + 1]) / 2)) out.push([xs[i], ys[j], xs[i + 1], ys[j + 1]]);
  return out;
}
/** rectangle moins un trou rectangulaire */
function minus(r: Rect, h: Rect): Rect[] {
  const [a, b, c, d] = r, [e, f, g, k] = h;
  if (g <= a || e >= c || k <= b || f >= d) return [r];
  const o: Rect[] = [];
  if (f > b) o.push([a, b, c, f]); if (k < d) o.push([a, k, c, d]);
  const yb = Math.max(b, f), yt = Math.min(d, k);
  if (e > a) o.push([a, yb, e, yt]); if (g < c) o.push([g, yb, c, yt]);
  return o;
}

interface Opening { ax: 'h' | 'v'; c: number; a: number; b: number; sill: number; head: number; win?: boolean; door?: boolean; id: string }

export function buildScene(M: Gabarit): SceneGeo {
  const H_RDC = M.heights.rdc, FL = M.heights.floor;
  const LIGHTS: Light[] = [], COLL: Rect[] = [];
  const BATCH: Partial<Record<BatchKey, Batch>> = {};
  const bat = (k: BatchKey) => BATCH[k] || (BATCH[k] = { p: [], n: [], c: [], m: [], i: [], nv: 0 });

  /* ---------- primitives ---------- */
  function vtx(b: Batch, p: V3, n: V3, c: V3, mat: number) { b.p.push(p[0], p[1], p[2]); b.n.push(n[0], n[1], n[2]); b.c.push(c[0], c[1], c[2]); b.m.push(mat); return b.nv++; }
  /** boîte unité transformée par m, faces subdivisées */
  function boxM(k: BatchKey, m: M4, color: Col, mat: number) {
    const b = bat(k), Cn = CORN.map(p => tp(m, p)), ctr = tp(m, [0, 0, 0]), c = col(color);
    for (const f of FACES) {
      const q = f.map(i => Cn[i]);
      let n = norm(cross(sub(q[1], q[0]), sub(q[3], q[0])));
      if (!isFinite(n[0])) continue;
      const fc: V3 = [(q[0][0] + q[2][0]) / 2, (q[0][1] + q[2][1]) / 2, (q[0][2] + q[2][2]) / 2];
      let flip = false; if (dot(n, sub(fc, ctr)) < 0) { n = [-n[0], -n[1], -n[2]]; flip = true; }
      const eu = sub(q[1], q[0]), ev = sub(q[3], q[0]);
      const nu = Math.min(MAXC, Math.max(1, Math.ceil(Math.hypot(...eu) / CELL))), nvv = Math.min(MAXC, Math.max(1, Math.ceil(Math.hypot(...ev) / CELL)));
      const base = b.nv;
      for (let j = 0; j <= nvv; j++) for (let i = 0; i <= nu; i++) {
        const u = i / nu, v = j / nvv;
        vtx(b, [q[0][0] + eu[0] * u + ev[0] * v, q[0][1] + eu[1] * u + ev[1] * v, q[0][2] + eu[2] * u + ev[2] * v], n, c, mat);
      }
      const W = nu + 1; if (nu > 1 || nvv > 1) (b.g || (b.g = [])).push([base, W, nvv + 1]);
      for (let j = 0; j < nvv; j++) for (let i = 0; i < nu; i++) {
        const a = base + j * W + i, bb = a + 1, cc = a + W + 1, d = a + W;
        if (flip) b.i.push(a, cc, bb, a, d, cc); else b.i.push(a, bb, cc, a, cc, d);
      }
    }
  }
  /** boîte alignée sur les axes */
  function bx(k: BatchKey, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, color: Col, mat = 0) {
    if (x1 - x0 < 1e-4 || y1 - y0 < 1e-4 || z1 - z0 < 1e-4) return;
    boxM(k, mul(mT((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), mS(x1 - x0, y1 - y0, z1 - z0)), color, mat);
  }
  function tri(k: BatchKey, a: V3, b: V3, c: V3, color: Col, mat: number) {
    const B = bat(k), cc = col(color); const n = norm(cross(sub(b, a), sub(c, a)));
    if (!isFinite(n[0])) return;
    for (const p of [a, b, c]) B.i.push(vtx(B, p, n, cc, mat));
  }
  /** prisme à n côtés (troncs, pots, colonnes), sommet décalé de (ox, oz) */
  function prism(k: BatchKey, cx: number, cz: number, r0: number, r1: number, y0: number, y1: number, n: number, color: Col, mat = 0, cap = true, ox = 0, oz = 0) {
    const c = col(color);
    for (let i = 0; i < n; i++) {
      const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
      const p0: V3 = [cx + Math.cos(a0) * r0, y0, cz + Math.sin(a0) * r0], p1: V3 = [cx + Math.cos(a1) * r0, y0, cz + Math.sin(a1) * r0];
      const q0: V3 = [cx + ox + Math.cos(a0) * r1, y1, cz + oz + Math.sin(a0) * r1], q1: V3 = [cx + ox + Math.cos(a1) * r1, y1, cz + oz + Math.sin(a1) * r1];
      tri(k, p0, q0, q1, c, mat); tri(k, p0, q1, p1, c, mat);
      if (cap) tri(k, [cx + ox, y1, cz + oz], q1, q0, c, mat);
    }
  }
  /** boîte le long d'un segment du plan (vantaux de porte) */
  function seg(k: BatchKey, x0: number, z0: number, x1: number, z1: number, th: number, y0: number, y1: number, color: Col, mat = 0) {
    const L = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(z1 - z0, x1 - x0);
    boxM(k, mul(mT((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), mul(mRy(-a), mS(L, y1 - y0, th))), color, mat);
  }

  /* ---------- ouvertures ---------- */
  const OPS: Opening[] = [];
  M.windows.forEach(w => {
    const [x0, y0, x1, y1] = w.r, hz = (x1 - x0) > (y1 - y0);
    OPS.push({ ax: hz ? 'h' : 'v', c: hz ? (y0 + y1) / 2 : (x0 + x1) / 2, a: hz ? x0 : y0, b: hz ? x1 : y1, sill: w.sill, head: w.head, win: true, id: w.id });
  });
  M.doors.forEach(d => OPS.push({ ax: d.ax, c: d.c, a: d.a, b: d.b, sill: 0, head: d.head, door: true, id: d.id }));
  M.slits.forEach(s => OPS.push({ ax: s.ax, c: s.c, a: s.a, b: s.b, sill: s.sill, head: s.head, win: true, id: s.id }));

  /* ---------- murs ---------- */
  function buildWall(wall: Gabarit['walls'][number]) {
    const [x0, y0, x1, y1] = wall.r, hz = (x1 - x0) >= (y1 - y0), H = wall.h ?? H_RDC;
    const cs = hz ? (y0 + y1) / 2 : (x0 + x1) / 2, ht = (hz ? y1 - y0 : x1 - x0) / 2, A = hz ? x0 : y0, B = hz ? x1 : y1;
    const ops = OPS.filter(o => o.ax === (hz ? 'h' : 'v') && Math.abs(o.c - cs) <= ht + .04 && o.b > A + .01 && o.a < B - .01)
      .map(o => ({ ...o, a: Math.max(o.a, A), b: Math.min(o.b, B) })).sort((p, q) => p.a - q.a);
    const put = (a: number, b: number, ya: number, yb: number) => {
      if (b - a < .005) return;
      if (hz) bx('base', a, ya, y0, b, yb, y1, C.wall, MAT.enduit); else bx('base', x0, ya, a, x1, yb, b, C.wall, MAT.enduit);
      if (ya < 1) COLL.push(hz ? [a, y0, b, y1] : [x0, a, x1, b]);
    };
    let cur = A;
    for (const o of ops) {
      put(cur, o.a, 0, H); if (o.sill > 0) put(o.a, o.b, 0, o.sill); if (o.head < H) put(o.a, o.b, o.head, H);
      if (o.win) {
        const t = .05, fr = (a: number, b: number, ya: number, yb: number) => {
          if (hz) bx('base', a, ya, cs - t, b, yb, cs + t, C.frame); else bx('base', cs - t, ya, a, cs + t, yb, b, C.frame);
        };
        fr(o.a, o.a + .05, o.sill, o.head); fr(o.b - .05, o.b, o.sill, o.head); fr(o.a, o.b, o.sill, o.sill + .05); fr(o.a, o.b, o.head - .05, o.head);
        const W = o.b - o.a;
        if (W > 1.6) { const n = Math.round(W / 1.5); for (let i = 1; i < n; i++) { const m = o.a + W * i / n; fr(m - .025, m + .025, o.sill, o.head); } }
        if (hz) bx('glass', o.a, o.sill, cs - .012, o.b, o.head, cs + .012, '#7f8f97', MAT.verre);
        else bx('glass', cs - .012, o.sill, o.a, cs + .012, o.head, o.b, '#7f8f97', MAT.verre);
        /* une fenêtre bloque le passage ; une baie toute hauteur aussi (on ne traverse pas une vitre fermée) */
        if (o.sill > 0) COLL.push(hz ? [o.a, y0, o.b, y1] : [x0, o.a, x1, o.b]);
        if (o.sill === 0 && o.id !== 'g1') COLL.push(hz ? [o.a, y0, o.b, y1] : [x0, o.a, x1, o.b]);
      }
      cur = o.b;
    }
    put(cur, B, 0, H);
  }
  M.walls.forEach(buildWall);

  /* vantaux de porte, ouverts à 90° */
  M.doors.forEach(d => {
    if (d.passage) return;
    const P = (u: number, v: number): [number, number] => d.ax === 'h' ? [u, v] : [v, u];
    const color = d.leaf === 'dark' ? C.dark : C.door, w = d.b - d.a, side = d.side ?? 1;
    const leaf = (hv: number, len: number) => { const Hn = P(hv, d.c), L = P(hv, d.c + side * len); seg('base', Hn[0], Hn[1], L[0], L[1], .04, FL, 2.18, color); };
    if (d.double) { leaf(d.a, w / 2); leaf(d.b, w / 2); } else leaf(d.hinge === 'a' ? d.a : d.b, w);
  });

  /* ---------- sols ---------- */
  M.rooms.forEach(r => rectsOfPoly(r.poly).forEach(([a, b, c, d]) => bx('base', a - .06, 0, b - .06, c + .06, FL, d + .06, r.floor ?? C.floor, MAT.carrelage)));
  const pool = M.zones.find(z => z.type === 'pool')?.r ?? [0, 0, 0, 0] as Rect;
  minus([-40, -30, 62, 60], pool).forEach(r => bx('base', r[0], -.3, r[1], r[2], -.02, r[3], C.sand, MAT.gazon));
  const S = M.site, siteR: Rect = [S.x, S.y, S.x + S.w, S.y + S.h];
  minus(siteR, pool).forEach(r => bx('base', r[0], -.1, r[1], r[2], -.005, r[3], '#7d6a55', 0));
  const ZS: Record<string, [string, number, number]> = {
    deck: [C.deck, MAT.lames, .06], lawn: [C.lawn, MAT.gazon, .015], paving: [C.paving, MAT.paves, .03],
    parking: [C.park, MAT.paves, .025], covered: [C.terr, MAT.carrelage, .08],
  };
  M.zones.forEach(z => {
    if (z.type === 'pool') return;
    const [c, mat, h] = ZS[z.type];
    (z.type === 'deck' ? minus(z.r, pool) : [z.r]).forEach(r => bx('base', r[0], -.01, r[1], r[2], h, r[3], c, mat));
  });
  /* piscine */
  if (pool[2] > pool[0]) {
    const [px0, pz0, px1, pz1] = pool, PD = -1.4;
    bx('base', px0, PD - .1, pz0, px1, PD, pz1, '#2f7fb4', MAT.mosaique);
    ([[px0, pz0, px1, pz0 + .15], [px0, pz1 - .15, px1, pz1], [px0, pz0, px0 + .15, pz1], [px1 - .15, pz0, px1, pz1]] as Rect[])
      .forEach(r => bx('base', r[0], PD, r[1], r[2], -.02, r[3], '#2f7fb4', MAT.mosaique));
    ([[px0 - .32, pz0 - .32, px1 + .32, pz0], [px0 - .32, pz1, px1 + .32, pz1 + .32], [px0 - .32, pz0, px0, pz1], [px1, pz0, px1 + .32, pz1]] as Rect[])
      .forEach(r => bx('base', r[0], -.02, r[1], r[2], .1, r[3], '#efece6', 0));
    bx('water', px0 + .15, -.17, pz0 + .15, px1 - .15, -.16, pz1 - .15, '#0f7590', MAT.eau);
    COLL.push(pool);
  }
  /* marches */
  M.steps.forEach(s => {
    const n = s.at.length - 1;
    for (let i = 0; i < n; i++) {
      const h = FL * (i + 1) / (n + 1) + .02;
      if (s.ax === 'v') { const a = s.at[n - 1 - i], b = s.at[n - i]; bx('base', Math.min(a, b), 0, s.r[1], Math.max(a, b), h + .03, s.r[3], C.paving, MAT.paves); }
      else bx('base', s.r[0], 0, s.at[i], s.r[2], FL * (n - i) / (n + 1) + .02, s.at[i + 1], C.paving, MAT.paves);
    }
  });
  /* escalier intérieur en U : volée montante, palier, volée retour */
  {
    const st = M.stairs, [sx0, sz0, sx1] = st.r, mid = st.mid, zTop = st.to, zLand = st.from + .5;
    const n1 = 10, d1 = (zTop - zLand) / n1;
    for (let i = 0; i < n1; i++) { const z = zTop - (i + 1) * d1; bx('base', mid + .05, FL, z, sx1, FL + (i + 1) * .17, z + d1, C.floor, MAT.carrelage); }
    bx('base', sx0, FL, sz0, sx1, FL + 1.7, zLand, C.floor, MAT.carrelage);
    const n2 = 8, d2 = (zTop - zLand) / n2;
    for (let i = 0; i < n2; i++) { const z = zLand + i * d2; bx('base', sx0, FL, z, mid - .05, FL + 1.7 + (i + 1) * .1625, z + d2, C.floor, MAT.carrelage); }
    bx('base', mid - .05, 0, zLand, mid + .05, H_RDC, zTop, C.wall);
  }
  /* clôture et portails */
  M.fence.forEach(f => { bx('base', f[0], 0, f[1], f[2], 2.2, f[3], C.fence, MAT.enduit); bx('base', f[0] - .02, 2.2, f[1] - .02, f[2] + .02, 2.26, f[3] + .02, '#dedbd4'); COLL.push(f); });
  M.gates.forEach(g => {
    if (!g.bars) return;
    const [z0, z1] = g.z;
    for (let x = g.a + .05; x < g.b - .03; x += .14) bx('base', x, .05, z0 + .02, x + .08, 2.0, z1 - .02, C.dark);
    bx('base', g.a, 1.95, z0 + .01, g.b, 2.02, z1 - .01, C.dark); COLL.push([g.a, z0, g.b, z1]);
  });

  /* ---------- objets ---------- */
  let SEED = 7; const rnd = () => { SEED = (SEED * 16807) % 2147483647; return SEED / 2147483647; };
  const deg = (d: number) => d * Math.PI / 180;
  const OBJ: { [T in Objet['type']]: (o: Extract<Objet, { type: T }>) => void } = {
    boite: o => { const [x0, y0, z0, x1, y1, z1] = o.r; bx(o.calque, x0, y0, z0, x1, y1, z1, o.couleur, MAT[o.mat]); if (o.collision) COLL.push([x0, z0, x1, z1]); },
    'plan-travail': o => {
      const [x0, z0, x1, z1] = o.r;
      bx('base', x0, FL, z0, x1, .88, z1, '#f4f2ee'); bx('base', x0 - .02, .88, z0 - .02, x1 + .02, .92, z1 + .02, '#3b3936', 0); COLL.push([x0, z0, x1, z1]);
    },
    transat: o => {
      const m0 = mul(mT(o.x, 0, o.z), mRy(deg(o.rot)));
      boxM('base', mul(m0, mul(mT(0, .18, 0), mS(.68, .22, 1.9))), '#f1efea', 0);
      boxM('base', mul(m0, mul(mT(0, .34, .15), mS(.62, .08, 1.5))), '#b4373f', 0);
      boxM('base', mul(m0, mul(mT(0, .5, -.72), mul(mRx(-.6), mS(.62, .08, .55)))), '#b4373f', 0);
    },
    canape: o => {
      const m0 = mul(mT(o.x, 0, o.z), mRy(deg(o.rot))), w = o.l, d = o.p;
      boxM('base', mul(m0, mul(mT(0, .22, 0), mS(w, .3, d))), '#e8e6e1', 0);
      boxM('base', mul(m0, mul(mT(0, .44, 0), mS(w - .1, .16, d - .1))), '#6a5fc4', 0);
      boxM('base', mul(m0, mul(mT(0, .6, -d / 2 + .12), mS(w, .5, .22))), '#e8e6e1', 0);
    },
    jardiniere: o => { const [x0, z0, x1, z1] = o.r; bx('base', x0, 0, z0, x1, .42, z1, '#f2f0ea'); bx('base', x0 + .06, .42, z0 + .06, x1 - .06, .62, z1 - .06, o.couleur, MAT.gazon); },
    palmier: o => {
      const n = 12, h = o.h, lean = o.inclinaison; let px = o.x, pz = o.z, y = 0;
      for (let i = 0; i < n; i++) {
        const t = i / n, t2 = (i + 1) / n, r0 = .2 - .07 * t, r1 = .2 - .07 * t2;
        const nx = o.x + lean[0] * t2 * t2 * h * .13, nz = o.z + lean[1] * t2 * t2 * h * .13;
        prism('base', px, pz, r0, r1 * .96, y, y + h / n, 8, i % 2 ? '#8a7a66' : '#7d6d5a', MAT.ecorce, false, nx - px, nz - pz); px = nx; pz = nz; y += h / n;
      }
      prism('base', px, pz, .2, .08, y, y + .35, 8, '#6f6a3a', MAT.gazon);
      const F = 15;
      for (let i = 0; i < F; i++) {
        const a = i / F * Math.PI * 2 + rnd() * .3, len = 2.3 + rnd() * .8, up = .55 - (i % 3) * .32 - rnd() * .15;
        let cx = px, cy = y + .2, cz = pz, pitch = up; const segs = 5, sl = len / segs;
        const g = .85 + rnd() * .25, c: V3 = [.22 * g, .42 * g, .15 * g];
        for (let j = 0; j < segs; j++) {
          const w = (.62 - j * .1) * (j === 0 ? .6 : 1), dx = Math.cos(a) * Math.cos(pitch) * sl, dy = Math.sin(pitch) * sl, dz = Math.sin(a) * Math.cos(pitch) * sl;
          boxM('base', mul(mT(cx + dx / 2, cy + dy / 2, cz + dz / 2), mul(mRy(-a), mul(mRz(pitch), mS(sl * 1.05, .02, w)))), c, MAT.feuillage);
          cx += dx; cy += dy; cz += dz; pitch -= .28;
        }
      }
    },
    acacia: o => {
      const { x, z } = o, s = o.echelle;
      prism('base', x, z, .18 * s, .13 * s, 0, 1.6 * s, 7, '#5d4a3a', MAT.ecorce, false);
      [[.9, .6], [-.8, .4], [.1, -.9]].forEach(([dx, dz]) => prism('base', x, z, .12 * s, .07 * s, 1.6 * s, 2.8 * s, 6, '#5d4a3a', MAT.ecorce, false, dx * s, dz * s));
      for (let i = 0; i < 4; i++) {
        const ox = (rnd() - .5) * 2.2 * s, oz = (rnd() - .5) * 2.2 * s, r = (1.6 + rnd() * .8) * s, y = (2.7 + rnd() * .35) * s;
        prism('base', x + ox, z + oz, r, r * .92, y, y + .32 * s, 10, [.24, .33, .15], MAT.feuillage);
        prism('base', x + ox, z + oz, r * .55, r * .5, y - .14 * s, y, 10, [.2, .28, .13], MAT.feuillage, false);
      }
    },
    pot: o => {
      const { x, z } = o;
      prism('base', x, z, .26, .32, 0, .55, 10, '#8b6b4c', MAT.bois); prism('base', x, z, .3, .3, .5, .55, 10, '#6f5440', 0, true);
      for (let i = 0; i < 26; i++) {
        const a = rnd() * 6.28, t = .15 + rnd() * .55, h = .35 + rnd() * .45;
        boxM('base', mul(mT(x + Math.cos(a) * (.06 + t * h * .5), .52 + h / 2 * Math.cos(t), z + Math.sin(a) * (.06 + t * h * .5)), mul(mRy(-a), mul(mRz(-t), mS(.015, h, .045)))),
          o.fleurs && i % 3 === 0 ? '#8a6fd0' : '#4f7f36', MAT.feuillage);
      }
    },
    barbecue: o => { prism('base', o.x, o.z, .22, .22, .75, .95, 10, '#7a2f3a', 0); prism('base', o.x, o.z, .03, .03, 0, .75, 6, C.dark, 0); },
    douche: o => { prism('base', o.x, o.z, .03, .03, 0, 2.2, 6, '#b8b6b0', 0); bx('base', o.x - .05, 2.1, o.z - .2, o.x + .05, 2.14, o.z + .1, '#b8b6b0'); },
    claustra: o => { for (let x = o.x0; x < o.x1; x += o.pas) bx(o.calque, x, o.y0, o.z0, x + o.lame, o.y1, o.z1, C.wood, MAT.bois); },
    spot: o => { bx(o.calque, o.x - .07, o.y - .015, o.z - .07, o.x + .07, o.y, o.z + .07, C.spot, MAT.lumineux); LIGHTS.push({ p: [o.x, o.y - .03, o.z], I: o.I, st: o.eclaire }); },
  };
  for (const o of M.objects) (OBJ[o.type] as (o: Objet) => void)(o);

  /* voiture type, pour juger la place du parking */
  M.cars.forEach(c => {
    const x0 = c.x - c.W / 2, x1 = c.x + c.W / 2, z0 = c.z0, z1 = c.z0 + c.L;
    bx('base', x0, .32, z0, x1, .85, z1, '#8e9aa4', 0); bx('base', x0 + .12, .85, z0 + 1.1, x1 - .12, 1.4, z1 - 1.0, '#2e3a42', MAT.verre); bx('base', x0 + .14, 1.4, z0 + 1.2, x1 - .14, c.H, z1 - 1.1, '#8e9aa4', 0);
    [z0 + .75, z1 - .8].forEach(z => { bx('base', x0 - .02, 0, z - .33, x0 + .24, .66, z + .33, '#1c1c1c', 0); bx('base', x1 - .24, 0, z - .33, x1 + .02, .66, z + .33, '#1c1c1c', 0); });
  });
  return { BATCH, COLL, LIGHTS };
}
