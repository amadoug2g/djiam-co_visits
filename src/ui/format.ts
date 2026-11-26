/* Calculs et formats affichés par l'interface (testés dans tests/format.test.ts). */
import type { Pt, Rect } from '../data/types';

/** nombre au format français, 2 décimales par défaut : 19,70 */
export const fmt = (n: number, d = 2) => n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
/** aire d'un polygone (formule du lacet) */
export const area = (p: Pt[]) => Math.abs(p.reduce((s, [x, y], i) => { const [u, v] = p[(i + 1) % p.length]; return s + x * v - u * y; }, 0)) / 2;
/** rectangle englobant [x0, z0, x1, z1] */
export const bbox = (p: Pt[]): Rect => {
  const xs = p.map(q => q[0]), ys = p.map(q => q[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
};
/** aimantation de la mesure tous les 5 cm */
export const snap = ([x, y]: Pt): Pt => [Math.round(x * 20) / 20, Math.round(y * 20) / 20];
export const plural = (n: number, w: string) => `${n} ${w}${n > 1 ? 's' : ''}`;
