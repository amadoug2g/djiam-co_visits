/* Règles de déplacement de la visite, sans dépendance au rendu (testables). */
import type { Gabarit, Rect } from '../data/types';

/** rayon du visiteur (m) */
export const RAD = .22;

/** limites de la parcelle pour la visite : intérieur de la clôture, comme dans le prototype */
export function walkBounds(G: Gabarit): Rect {
  const S = G.site;
  return [S.x + .13, S.y + .16, S.x + S.w - .15, S.y + S.h - .13];
}

/** vrai si un point (x, z) touche un obstacle ou sort de la parcelle */
export function makeHit(COLL: Rect[], bounds: Rect) {
  return (x: number, z: number) =>
    COLL.some(r => x > r[0] - RAD && x < r[2] + RAD && z > r[1] - RAD && z < r[3] + RAD) ||
    x < bounds[0] || x > bounds[2] || z < bounds[1] || z > bounds[3];
}

/** rectangle englobant des pièces intérieures : sert à régler l'exposition quand on entre dans la maison */
export function houseBox(G: Gabarit): Rect {
  const pts = G.rooms.filter(r => r.grp === 'int').flatMap(r => r.poly);
  const xs = pts.map(p => p[0]), zs = pts.map(p => p[1]);
  return [Math.min(...xs) - .02, Math.min(...zs) - .02, Math.max(...xs) + .02, Math.max(...zs) + .02];
}

/** point libre le plus proche du centre d'une pièce (pour y placer le visiteur) */
export function freeSpotNear(hit: (x: number, z: number) => boolean, x: number, z: number): [number, number] {
  if (!hit(x, z)) return [x, z];
  for (let r = .2; r < 2; r += .1) {
    const t = ([[x + r, z], [x - r, z], [x, z + r], [x, z - r]] as [number, number][]).find(p => !hit(p[0], p[1]));
    if (t) return t;
  }
  return [x, z];
}
