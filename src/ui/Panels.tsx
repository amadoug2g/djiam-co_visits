/* Panneau latéral (pièces, points à vérifier), fiche pièce, raccourcis, diagnostic. */
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import type { Check, Gabarit } from '../data/types';
import { DIAG, type DiagStats } from '../diag';
import { area, bbox, fmt, plural } from './format';

const GRP = { int: 'Maison', ann: 'Annexes' } as const;

export type Tab = 'rooms' | 'check' | 'meubles';
export function SidePanel({ G, sel, open, onClose, tab, setTab, onRoom, onCheck, meubles, nMeubles }: {
  G: Gabarit; sel: string | null; open: boolean; onClose(): void; tab: Tab; setTab(t: Tab): void; onRoom(id: string): void; onCheck(c: Check): void;
  /** contenu de l'onglet Meubles (catalogue) */
  meubles: ReactNode; nMeubles: number;
}) {
  const calc = useMemo(() => Object.fromEntries(G.rooms.map(r => [r.id, area(r.poly)])), [G]);
  const tot = G.rooms.filter(r => r.grp === 'int').reduce((s, r) => s + calc[r.id], 0);
  return <aside id="side" className={'card' + (open ? ' open' : '')} aria-label="Panneau">
    <div className="tabs" role="tablist">
      <button className="tab" role="tab" aria-selected={tab === 'rooms'} onClick={() => setTab('rooms')}>Pièces</button>
      <button className="tab" role="tab" aria-selected={tab === 'check'} onClick={() => setTab('check')}>À vérifier<span className="n">{G.checks.length}</span></button>
      <button className="tab" role="tab" aria-selected={tab === 'meubles'} onClick={() => setTab('meubles')}>Meubles<span className="n m">{nMeubles}</span></button>
      <button className="sheet-x" aria-label="Fermer le panneau" onClick={onClose}>×</button>
    </div>
    <div className="pane" hidden={tab !== 'rooms'}>
      {(['int', 'ann'] as const).map(k => <div key={k}>
        <h3>{GRP[k]}</h3>
        {G.rooms.filter(r => r.grp === k).map(r => <button key={r.id} className="row" aria-pressed={sel === r.id} onClick={() => onRoom(r.id)}>
          <span className="nm">{r.name}</span><span className={'v' + (r.planArea ? '' : ' calc')}>{fmt(r.planArea || calc[r.id])} m²</span>
        </button>)}
      </div>)}
      <p className="note">Surfaces en clair : relevées sur le plan. En gris : calculées sur le dessin. Total intérieur calculé : {fmt(tot, 1)} m².</p>
    </div>
    <div className="pane" hidden={tab !== 'meubles'}>{meubles}</div>
    <div className="pane" hidden={tab !== 'check'}>
      <p className="note" style={{ marginTop: 6 }}>Ce qui ne vient pas du plan. Valide ou corrige chaque point.</p>
      {G.checks.map(c => <button key={c.id} className="chk" onClick={() => onCheck(c)}><i /><div><b>{c.t}</b><span>{c.d}</span></div></button>)}
    </div>
  </aside>;
}

export function InfoCard({ G, id, onClose }: { G: Gabarit; id: string | null; onClose(): void }) {
  const r = G.rooms.find(r => r.id === id);
  if (!r) return <section id="info" className="card" aria-live="polite" />;
  const [x0, y0, x1, y1] = bbox(r.poly), rect = r.poly.length === 4;
  const doors = G.doors.filter(d => d.room === r.id), wins = G.windows.filter(w => w.room === r.id);
  const estN = doors.filter(d => d.src === 'est').length + wins.filter(w => w.src === 'est').length;
  return <section id="info" className="card on" aria-live="polite">
    <button className="x" aria-label="Fermer" onClick={onClose}>×</button>
    <h2 className="serif">{r.name}</h2>
    <dl>
      <dt>Dimensions intérieures</dt><dd>{rect ? `${fmt(x1 - x0)} × ${fmt(y1 - y0)} m` : 'forme en L'}</dd>
      <dt>Surface du plan</dt><dd>{r.planArea ? fmt(r.planArea) + ' m²' : 'non indiquée'}</dd>
      <dt>Surface calculée</dt><dd>{fmt(area(r.poly))} m²</dd>
      <dt>Ouvertures</dt><dd>{plural(doors.length, 'porte')}, {plural(wins.length, 'fenêtre')}</dd>
    </dl>
    <p className="src">{r.note ? r.note + ' ' : ''}{estN ? `${plural(estN, 'ouverture')} ${estN > 1 ? 'estimées' : 'estimée'}, à valider.` : 'Tout vient du plan.'}</p>
  </section>;
}

export function KeysDialog({ open, onClose }: { open: boolean; onClose(): void }) {
  const rows: [string, React.ReactNode][] = [
    ['Déplacer le plan', 'glisser'], ['Zoomer', <>molette, pincer, <kbd>+</kbd> <kbd>−</kbd></>], ['Recentrer', <kbd>F</kbd>],
    ['Outil mesure', <kbd>M</kbd>], ['Afficher les cotes', <kbd>C</kbd>], ['Afficher les estimés', <kbd>E</kbd>], ['Fermer, annuler', <kbd>Échap</kbd>],
    ['3D : tourner, décaler', <>glisser, clic droit ou <kbd>Maj</kbd></>], ['3D : zoomer', 'molette, pincer'],
    ['Aménager', <kbd>A</kbd>], ['Meuble : déplacer', <>glisser, flèches (<kbd>Maj</kbd> : 25 cm)</>], ['Meuble : tourner', <><kbd>R</kbd> (90°), <kbd>Maj</kbd>+<kbd>R</kbd> (15°)</>],
    ['Meuble : dupliquer, retirer', <><kbd>D</kbd>, <kbd>Suppr</kbd></>],
  ];
  return <div id="keys" role="dialog" aria-modal="true" aria-label="Raccourcis" className={open ? 'on' : ''} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="card">
      <h2 className="serif">Raccourcis</h2>
      <table><tbody>{rows.map(([a, b]) => <tr key={a}><td>{a}</td><td>{b}</td></tr>)}</tbody></table>
      <p className="note" style={{ margin: '12px 0 0' }}>Mesure aimantée tous les 5 cm.</p>
    </div>
  </div>;
}

/** panneau de diagnostic local, affiché avec ?diag=1 */
export function DiagPanel({ stats }: { stats: () => DiagStats | null }) {
  const errs = useSyncExternalStore(DIAG.subscribe, () => DIAG.errs.length);
  const [s, setS] = useState<DiagStats | null>(null);
  useEffect(() => { const t = setInterval(() => setS(stats()), 1000); return () => clearInterval(t); }, [stats]);
  const rows: [string, string][] = s ? [['moteur', s.engine], ['vue', s.mode], ['images/s', String(s.fps)], ['post-traitement', s.post ? 'oui' : 'non'],
    ['occlusion', s.gtao ? 'oui' : 'non'], ['dégradé', s.degraded || 'non'], ['lumière', s.baked ? 'chargée' : 'absente'], ['taille', `${s.w} × ${s.h} @${s.dpr}`], ['GPU', s.gpu || '?']] : [];
  return <section id="diag" className="card" aria-label="Diagnostic">
    <h2>Diagnostic</h2>
    {s ? <dl>{rows.map(([a, b]) => <div key={a} style={{ display: 'contents' }}><dt>{a}</dt><dd>{b}</dd></div>)}</dl> : <p className="note">3D pas encore démarrée.</p>}
    {errs > 0 && <ol>{DIAG.errs.map((e, i) => <li key={i}>{e}</li>)}</ol>}
  </section>;
}
