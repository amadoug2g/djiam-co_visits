/* Meubles sur le plan 2D : emprise à l'échelle, symbole simple par type, sélection et alerte mur. */
import type { ReactNode } from 'react';
import { emprise, versPlan, type MeubleRendu } from '../amenagement/model';

const pts = (P: [number, number][]) => P.map(p => p.map(v => +v.toFixed(3)).join(',')).join(' ');

/** rectangle dans le repère du meuble (cx, cz centre local), dessiné sur le plan */
function R(m: MeubleRendu, cx: number, cz: number, w: number, d: number, p: React.SVGProps<SVGPolygonElement>, key?: string) {
  const c = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([x, z]) => versPlan(m, cx + x, cz + z));
  return <polygon key={key} points={pts(c)} {...p} />;
}

function symbole(m: MeubleRendu): ReactNode {
  const { l, p } = m, dk = { fill: 'rgba(0,0,0,.28)' };
  switch (m.modele) {
    case 'canape': case 'fauteuil':
      return <>{R(m, 0, -p / 2 + .11, l, .22, dk)}{R(m, -l / 2 + .09, .11, .18, p - .22, dk)}{R(m, l / 2 - .09, .11, .18, p - .22, dk)}</>;
    case 'canape-angle':
      return <>{R(m, 0, -p / 2 + .11, l, .22, dk)}{R(m, l / 2 - .09, .11, .18, p - .22, dk)}{R(m, -l / 2 + .09, -p / 2 + .46, .18, .7, dk)}</>;
    case 'lit': {
      const n = l > 1.2 ? 2 : 1;
      return <>{R(m, 0, -p / 2 - .04, l + .1, .08, { fill: '#8a6a48' })}
        {Array.from({ length: n }, (_, i) => R(m, -l / 2 + (i + .5) * l / n, -p / 2 + .28, l / n - .14, .32, { fill: 'rgba(255,255,255,.75)' }, 'o' + i))}
        {R(m, 0, p * .19, l + .04, p * .62, { fill: 'rgba(0,0,0,.12)' })}</>;
    }
    case 'table-repas': {
      const n = Math.max(1, Math.floor((l - .1) / .6)), ch: ReactNode[] = [], cf = { fill: '#3a3733', stroke: '#9b978f', strokeWidth: .015 };
      for (let i = 0; i < n; i++) { const x = -l / 2 + (i + .5) * l / n; ch.push(R(m, x, p / 2 + .22, .44, .44, cf, 'a' + i), R(m, x, -p / 2 - .22, .44, .44, cf, 'b' + i)); }
      if (l >= 1.7) ch.push(R(m, -l / 2 - .22, 0, .44, .44, cf, 'g'), R(m, l / 2 + .22, 0, .44, .44, cf, 'd'));
      return <>{ch}</>;
    }
    case 'meuble-tv': return R(m, 0, -p / 2 + .12, Math.min(1.4, l - .2), .06, { fill: '#111' });
    case 'armoire': case 'commode': case 'chevet': return R(m, 0, p / 2 - .02, l - .04, .02, dk);
    case 'bureau': return R(m, 0, p / 2 + .25, .44, .44, { fill: 'none', stroke: '#9b978f', strokeWidth: .015, strokeDasharray: '.05 .04' });
    default: return null;
  }
}

export function Furniture2D({ meubles, sel, mur, edit, k, drag }: {
  meubles: MeubleRendu[]; sel: string | null; mur: Set<string>; edit: boolean; k: number;
  drag: { id: string; x: number; z: number } | null;
}) {
  const list = meubles.map(m => drag && drag.id === m.id ? { ...m, x: drag.x, z: drag.z } : m);
  /* tapis dessous, le reste dessus, le meuble sélectionné en dernier */
  const order = [...list].sort((a, b) => (a.modele === 'tapis' ? -1 : 0) - (b.modele === 'tapis' ? -1 : 0) || (a.id === sel ? 1 : 0) - (b.id === sel ? 1 : 0));
  return <g id="meubles" style={{ pointerEvents: edit ? 'auto' : 'none' }}>
    {order.map(m => {
      const E = emprise(m), round = m.modele === 'plante' || m.modele === 'tabouret' || m.modele === 'lampadaire';
      const isSel = m.id === sel, bad = mur.has(m.id);
      const stroke = bad ? '#e0705a' : isSel ? 'var(--est)' : 'rgba(236,232,224,.75)', sw = (isSel || bad ? 2.2 : 1) / k;
      return <g key={m.id} data-fid={m.id} className="meuble" style={{ cursor: edit ? 'move' : undefined }}>
        <title>{m.nom}</title>
        {round
          ? <circle cx={m.x} cy={m.z} r={Math.min(m.l, m.p) / 2} fill={m.hex} fillOpacity={.9} stroke={stroke} strokeWidth={sw} />
          : <polygon points={pts(E)} fill={m.hex} fillOpacity={m.modele === 'tapis' ? .55 : .92} stroke={stroke} strokeWidth={sw} strokeDasharray={m.modele === 'tapis' ? `${4 / k} ${3 / k}` : undefined} />}
        {!round && symbole(m)}
      </g>;
    })}
  </g>;
}
