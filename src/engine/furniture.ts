/* Meubles 3D génériques, générés depuis leurs dimensions et leur coloris.
   Origine au sol, au centre de l'emprise ; l = largeur (x local), p = profondeur (z local), l'avant regarde +z. */
import * as THREE from 'three';
import type { MeubleRendu } from '../amenagement/model';

const mats = new Map<string, THREE.MeshStandardMaterial>();
function mat(hex: string, rough = .8, metal = 0, emissive?: string) {
  const k = hex + rough + metal + (emissive ?? '');
  let m = mats.get(k);
  if (!m) { m = new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: metal }); if (emissive) { m.emissive.set(emissive); m.emissiveIntensity = .9; } mats.set(k, m); }
  return m;
}
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 20);
const sphGeo = new THREE.IcosahedronGeometry(1, 1);
/** nuance plus claire ou plus foncée d'une couleur */
const shade = (hex: string, f: number) => '#' + new THREE.Color(hex).multiplyScalar(f).getHexString();

type G = THREE.Group;
/** boîte posée : (x, z) centre, y0 bas */
function box(g: G, w: number, h: number, d: number, x: number, y0: number, z: number, m: THREE.Material) {
  const o = new THREE.Mesh(boxGeo, m); o.scale.set(w, h, d); o.position.set(x, y0 + h / 2, z); o.castShadow = o.receiveShadow = true; g.add(o); return o;
}
function cyl(g: G, r: number, h: number, x: number, y0: number, z: number, m: THREE.Material, r2 = r) {
  const o = new THREE.Mesh(r2 === r ? cylGeo : new THREE.CylinderGeometry(r2, r, 1, 20), m); o.scale.set(r2 === r ? r : 1, h, r2 === r ? r : 1); o.position.set(x, y0 + h / 2, z); o.castShadow = o.receiveShadow = true; g.add(o); return o;
}
const DARK = '#2a2a2c', METAL = '#8d8f92', OAK = '#c49a6c', WHITE = '#f2efe9';
function legs(g: G, l: number, p: number, h: number, t: number, m: THREE.Material, inset = .04) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, t, h, t, sx * (l / 2 - inset - t / 2), 0, sz * (p / 2 - inset - t / 2), m);
}
function chaise(g: G, x: number, z: number, rot: number, hex: string) {
  const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = rot; g.add(c);
  const m = mat(hex, .7);
  box(c, .44, .05, .44, 0, .43, 0, m); box(c, .44, .45, .04, 0, .48, -.2, m); legs(c, .44, .44, .43, .035, m, .01);
}

const B: Record<MeubleRendu['modele'], (g: G, l: number, p: number, h: number, hex: string) => void> = {
  canape(g, l, p, h, hex) {
    const m = mat(hex, .95), light = mat(shade(hex, 1.12), .95);
    box(g, l, .3, p, 0, .08, 0, m);
    box(g, l - .36, .14, p - .28, 0, .38, .1, light);
    box(g, l, h - .08, .22, 0, .08, -p / 2 + .11, m);
    for (const s of [-1, 1]) box(g, .18, .55, p, s * (l / 2 - .09), .08, 0, m);
    legs(g, l, p, .08, .05, mat(DARK, .5), .06);
  },
  fauteuil(g, l, p, h, hex) { B.canape(g, l, p, h, hex); },
  'canape-angle'(g, l, p, h, hex) {
    const m = mat(hex, .95), light = mat(shade(hex, 1.12), .95), d = .92;
    box(g, l, .3, d, 0, .08, -p / 2 + d / 2, m); box(g, l - .2, .14, d - .26, .02, .38, -p / 2 + d / 2 + .1, light);
    box(g, l, h - .08, .22, 0, .08, -p / 2 + .11, m);
    box(g, .18, .55, d, -l / 2 + .09, .08, -p / 2 + d / 2, m);
    const zc = (-p / 2 + d + p / 2) / 2, lc = p - d;
    box(g, d, .3, lc, l / 2 - d / 2, .08, zc, m); box(g, d - .26, .14, lc - .1, l / 2 - d / 2 - .04, .38, zc, light);
    box(g, .18, .55, p, l / 2 - .09, .08, 0, m);
    legs(g, l, p, .08, .05, mat(DARK, .5), .06);
  },
  'table-basse'(g, l, p, h, hex) { const m = mat(hex, .55); box(g, l, .05, p, 0, h - .05, 0, m); legs(g, l, p, h - .05, .045, m); },
  'meuble-tv'(g, l, p, h, hex) {
    box(g, l, h - .08, p, 0, .08, 0, mat(hex, .6)); legs(g, l, p, .08, .04, mat(DARK, .5));
    box(g, Math.min(1.4, l - .2), .8, .05, 0, h + .06, -p / 2 + .12, mat('#111214', .25, .2)); box(g, .3, .06, .2, 0, h, -p / 2 + .12, mat(DARK, .5));
  },
  bibliotheque(g, l, p, h, hex) {
    const m = mat(hex, .6), t = .03;
    box(g, t, h, p, -l / 2 + t / 2, 0, 0, m); box(g, t, h, p, l / 2 - t / 2, 0, 0, m); box(g, l, h, .015, 0, 0, -p / 2 + .008, m);
    const n = 5; for (let i = 0; i <= n; i++) box(g, l - 2 * t, t, p, 0, i * (h - t) / n, 0, m);
    const cols = ['#7a2f3a', '#2f4a6d', '#c9a27a', '#4f6b4a', '#d8d2c4'];
    for (let i = 0; i < n; i++) { let x = -l / 2 + t + .02; let k = i; while (x < l / 2 - t - .1) { const w = .03 + ((k * 7) % 5) * .008; box(g, w, (h - t) / n * .7, p * .75, x + w / 2, i * (h - t) / n + t, .02, mat(cols[k % 5], .9)); x += w + .006; k += 3; } }
  },
  'table-repas'(g, l, p, h, hex) {
    const m = mat(hex, .55); box(g, l, .05, p, 0, h - .05, 0, m); legs(g, l, p, h - .05, .06, m, .06);
    const n = Math.max(1, Math.floor((l - .1) / .6));
    for (let i = 0; i < n; i++) { const x = -l / 2 + (i + .5) * l / n; chaise(g, x, p / 2 + .22, Math.PI, hex); chaise(g, x, -p / 2 - .22, 0, hex); }
    if (l >= 1.7) { chaise(g, -l / 2 - .22, 0, Math.PI / 2, hex); chaise(g, l / 2 + .22, 0, -Math.PI / 2, hex); }
  },
  ilot(g, l, p, h, hex) { box(g, l, h - .04, p, 0, 0, 0, mat(hex, .6)); box(g, l + .04, .04, p + .04, 0, h - .04, 0, mat('#e8e4dc', .3)); },
  tabouret(g, _l, _p, h, hex) { cyl(g, .18, .05, 0, h - .05, 0, mat(hex, .6)); cyl(g, .025, h - .05, 0, 0, 0, mat(METAL, .35, .6)); cyl(g, .2, .02, 0, 0, 0, mat(METAL, .35, .6)); },
  lit(g, l, p, _h, hex) {
    const wood = mat(OAK, .6);
    box(g, l + .06, .3, p, 0, .05, 0, wood); box(g, l, .22, p - .05, 0, .35, .02, mat(WHITE, .9));
    box(g, l + .04, .07, p * .62, 0, .56, p * .19, mat(hex, .95));
    const n = l > 1.2 ? 2 : 1; for (let i = 0; i < n; i++) box(g, l / n - .12, .13, .36, -l / 2 + (i + .5) * l / n, .57, -p / 2 + .28, mat(shade(hex, 1.08), .95));
    box(g, l + .1, 1.0, .08, 0, .05, -p / 2 - .04, wood);
  },
  chevet(g, l, p, h, hex) { const m = mat(hex, .6); box(g, l, h - .06, p, 0, .06, 0, m); legs(g, l, p, .06, .03, m); box(g, l * .6, .015, .01, 0, h * .6, p / 2, mat(DARK, .5)); cyl(g, .07, .25, 0, h, 0, mat('#f3e6cc', .6, 0, '#f3e6cc')); },
  armoire(g, l, p, h, hex) { const m = mat(hex, .6); box(g, l, h, p, 0, 0, 0, m); box(g, .008, h - .1, .01, 0, .05, p / 2, mat(shade(hex, .7), .6)); for (const s of [-1, 1]) box(g, .02, .3, .03, s * .06, h * .5, p / 2 + .01, mat(METAL, .35, .6)); },
  commode(g, l, p, h, hex) { const m = mat(hex, .6); box(g, l, h - .08, p, 0, .08, 0, m); legs(g, l, p, .08, .04, m); for (let i = 1; i < 3; i++) box(g, l - .04, .008, .01, 0, .08 + i * (h - .08) / 3, p / 2, mat(shade(hex, .7), .6)); },
  bureau(g, l, p, h, hex) { box(g, l, .04, p, 0, h - .04, 0, mat(hex, .55)); legs(g, l, p, h - .04, .035, mat(DARK, .4, .3), .03); },
  chaise(g, _l, _p, _h, hex) { chaise(g, 0, 0, 0, hex); },
  tapis(g, l, p, _h, hex) { const o = box(g, l, .012, p, 0, 0, 0, mat(hex, 1)); o.castShadow = false; },
  plante(g, _l, _p, h, hex) {
    cyl(g, .2, .42, 0, 0, 0, mat(hex, .8), .17);
    const leaf = mat('#4f7f36', .9);
    [[0, .75, 0, .32], [.12, h - .3, .05, .26], [-.1, h - .45, -.06, .24]].forEach(([x, y, z, r]) => { const o = new THREE.Mesh(sphGeo, leaf); o.scale.setScalar(r); o.position.set(x, y, z); o.castShadow = true; g.add(o); });
  },
  lampadaire(g, _l, _p, h, hex) { cyl(g, .16, .03, 0, 0, 0, mat(DARK, .4, .3)); cyl(g, .015, h - .3, 0, .03, 0, mat(DARK, .4, .3)); cyl(g, .2, .3, 0, h - .3, 0, mat(hex, .7, 0, hex), .14); },
};

/** construit un meuble ; userData.fid = identifiant pour la sélection */
export function buildMeuble(m: MeubleRendu, floor: number): THREE.Group {
  const g = new THREE.Group();
  B[m.modele](g, m.l, m.p, m.h, m.hex);
  g.position.set(m.x, floor, m.z); g.rotation.y = m.rot * Math.PI / 180;
  g.userData.fid = m.id;
  g.traverse(o => { o.userData.fid = m.id; });
  return g;
}
