/* Aménagement : meubles placés dans la villa (données, emprises, contrôles, sauvegarde).
   Coordonnées en mètres dans le repère du plan. rot en degrés ; à 0, l'avant du meuble regarde +z (vers la rue). */
import type { Gabarit, Pt, Rect } from '../data/types';
import CAT from '../data/catalogue.json';
import PROPOSE_M3 from '../data/amenagements/m3-propose.json';

export type Modele =
  | 'canape' | 'canape-angle' | 'fauteuil' | 'table-basse' | 'meuble-tv' | 'bibliotheque' | 'table-repas' | 'ilot' | 'tabouret'
  | 'lit' | 'chevet' | 'armoire' | 'commode' | 'bureau' | 'chaise' | 'tapis' | 'plante' | 'lampadaire';
export interface Coloris { id: string; nom: string; hex: string }
export interface CatalogueItem { id: string; nom: string; cat: string; modele: Modele; l: number; p: number; h: number; coloris: string }
export interface Categorie { id: string; nom: string }

/** un meuble placé */
export interface Meuble { id: string; ref: string; x: number; z: number; rot: number; l: number; p: number; coloris: string }

export const CATALOGUE = CAT.items as CatalogueItem[];
export const CATEGORIES = CAT.categories as Categorie[];
export const COLORIS = CAT.coloris as Record<string, Coloris[]>;
const byId = new Map(CATALOGUE.map(i => [i.id, i]));
export const item = (ref: string) => byId.get(ref);
export const colorisDe = (it: CatalogueItem) => COLORIS[it.coloris] ?? [];
export const hexDe = (m: Meuble) => { const it = item(m.ref); const c = it && colorisDe(it).find(c => c.id === m.coloris); return c?.hex ?? '#999999'; };

/** meuble prêt pour le rendu (2D ou 3D) */
export interface MeubleRendu extends Meuble { modele: Modele; h: number; hex: string; nom: string }
export function rendu(m: Meuble): MeubleRendu | null {
  const it = item(m.ref); if (!it) return null;
  return { ...m, modele: it.modele, h: it.h, hex: hexDe(m), nom: it.nom };
}

let seq = 0;
export const nouvelId = () => 'm' + Date.now().toString(36) + (seq++).toString(36);
export function nouveauMeuble(ref: string, x: number, z: number, rot = 0): Meuble {
  const it = item(ref)!;
  return { id: nouvelId(), ref, x: snap(x), z: snap(z), rot, l: it.l, p: it.p, coloris: colorisDe(it)[0]?.id ?? '' };
}
/** aimantation tous les 5 cm */
export const snap = (v: number) => Math.round(v * 20) / 20;
export const normRot = (r: number) => ((Math.round(r) % 360) + 360) % 360;

/** passage repère du meuble -> repère du plan (même convention que la 3D : rotation autour de Y) */
export function versPlan(m: Pick<Meuble, 'x' | 'z' | 'rot'>, lx: number, lz: number): Pt {
  const a = m.rot * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  return [m.x + lx * c + lz * s, m.z - lx * s + lz * c];
}
/** les 4 coins de l'emprise au sol */
export function emprise(m: Pick<Meuble, 'x' | 'z' | 'rot' | 'l' | 'p'>): Pt[] {
  const a = m.l / 2, b = m.p / 2;
  return [versPlan(m, -a, -b), versPlan(m, a, -b), versPlan(m, a, b), versPlan(m, -a, b)];
}

/** deux polygones convexes se chevauchent-ils ? (séparation par axes) ; marge > 0 tolère un contact */
export function chevauche(A: Pt[], B: Pt[], marge = .005): boolean {
  for (const P of [A, B]) for (let i = 0; i < P.length; i++) {
    const [x1, z1] = P[i], [x2, z2] = P[(i + 1) % P.length], nx = z1 - z2, nz = x2 - x1;
    const proj = (Q: Pt[]) => Q.map(([x, z]) => x * nx + z * nz), a = proj(A), b = proj(B), L = Math.hypot(nx, nz);
    if (Math.max(...a) <= Math.min(...b) + marge * L || Math.max(...b) <= Math.min(...a) + marge * L) return false;
  }
  return true;
}
const rectPoly = ([x0, z0, x1, z1]: Rect): Pt[] => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
/** murs (et cloisons) touchés par le meuble ; les tapis passent sous tout */
export function toucheUnMur(G: Gabarit, m: Meuble): boolean {
  const it = item(m.ref); if (!it || it.modele === 'tapis') return false;
  const E = emprise(m);
  return G.walls.some(w => chevauche(E, rectPoly(w.r)));
}
/** pièce qui contient un point (pour poser un meuble au bon endroit) */
export function pieceEn(G: Gabarit, x: number, z: number) {
  return G.rooms.find(r => {
    let c = false; const P = r.poly;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > z) !== (yj > z) && x < (xj - xi) * (z - yi) / (yj - yi) + xi) c = !c; }
    return c;
  });
}

/* ---------- sauvegarde sur l'appareil ---------- */
const cle = (G: Gabarit) => 'villa-amenagement-' + G.id;
export function charger(G: Gabarit): Meuble[] | null {
  try {
    const s = localStorage.getItem(cle(G)); if (!s) return null;
    const v = JSON.parse(s); if (!Array.isArray(v.meubles)) return null;
    return (v.meubles as Meuble[]).filter(m => item(m.ref));
  } catch { return null; }
}
export function enregistrer(G: Gabarit, meubles: Meuble[]) {
  try { localStorage.setItem(cle(G), JSON.stringify({ v: 1, meubles })); } catch { /* stockage indisponible : l'aménagement reste en mémoire */ }
}

/* ---------- aménagement proposé ---------- */
const PROPOSES: Record<string, { meubles: { ref: string; x: number; z: number; rot: number; coloris: string }[] }> = { m3: PROPOSE_M3 };
/** meubles de l'aménagement proposé pour un gabarit (nouveaux identifiants à chaque appel) */
export function propose(G: Gabarit): Meuble[] {
  return (PROPOSES[G.id]?.meubles ?? []).filter(m => item(m.ref)).map(m => ({ ...nouveauMeuble(m.ref, m.x, m.z, m.rot), coloris: m.coloris }));
}
