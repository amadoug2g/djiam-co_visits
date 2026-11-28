/* Aménagement : catalogue (onglet Meubles) et fiche du meuble sélectionné. */
import { useEffect, useState } from 'react';
import { CATALOGUE, CATEGORIES, colorisDe, item, normRot, type Meuble } from '../amenagement/model';

const cm = (m: number) => Math.round(m * 100);

/** bouton à double clic de confirmation (pas de fenêtre système) */
function Confirm({ label, ask, onOk, className = 'mini' }: { label: string; ask: string; onOk(): void; className?: string }) {
  const [arm, setArm] = useState(false);
  useEffect(() => { if (!arm) return; const t = setTimeout(() => setArm(false), 3500); return () => clearTimeout(t); }, [arm]);
  return <button className={className + (arm ? ' warn' : '')} onClick={() => { if (arm) { setArm(false); onOk(); } else setArm(true); }}>{arm ? ask : label}</button>;
}

export function CataloguePane({ n, onAdd, onPropose, onClear }: { n: number; onAdd(ref: string): void; onPropose(): void; onClear(): void }) {
  return <>
    <div className="cat-actions">
      <span>{n} meuble{n > 1 ? 's' : ''} placé{n > 1 ? 's' : ''}</span>
      <Confirm label="Proposer un aménagement" ask="Remplacer l’actuel ?" onOk={onPropose} />
      {n > 0 && <Confirm label="Tout retirer" ask="Confirmer" onOk={onClear} />}
    </div>
    <p className="note">Touche un meuble pour l’ajouter dans la pièce sélectionnée, ou au centre de la vue. Meubles génériques, pas de vrais articles.</p>
    {CATEGORIES.map(c => <div key={c.id}>
      <h3>{c.nom}</h3>
      {CATALOGUE.filter(i => i.cat === c.id).map(i => <button key={i.id} className="row" onClick={() => onAdd(i.id)} aria-label={'Ajouter : ' + i.nom}>
        <i className="dot" style={{ background: colorisDe(i)[0]?.hex }} />
        <span className="nm">{i.nom}</span><span className="v">{cm(i.l)} × {cm(i.p)}</span>
      </button>)}
    </div>)}
  </>;
}

export function MeubleCard({ m, mur, onChange, onDuplicate, onRemove, onClose }: {
  m: Meuble; mur: boolean; onChange(p: Partial<Meuble>): void; onDuplicate(): void; onRemove(): void; onClose(): void;
}) {
  const it = item(m.ref)!; const cat = CATEGORIES.find(c => c.id === it.cat)?.nom;
  const dim = (k: 'l' | 'p') => <input id={'dim-' + k} type="number" inputMode="numeric" min={20} max={600} step={5} value={cm(m[k])}
    onChange={e => { const v = +e.target.value; if (v >= 20 && v <= 600) onChange({ [k]: v / 100 } as Partial<Meuble>); }} />;
  return <section id="info" className="card on meuble-card" aria-live="polite" aria-label={'Meuble : ' + it.nom}>
    <button className="x" aria-label="Fermer" onClick={onClose}>×</button>
    <h2 className="serif">{it.nom}</h2>
    <p className="sub">{cat} · hauteur {cm(it.h)} cm</p>
    {mur && <p className="chip warn">Touche un mur</p>}
    <div className="field"><span>Coloris</span>
      <div className="swatches">{colorisDe(it).map(c => <button key={c.id} className="sw-btn" style={{ background: c.hex }} title={c.nom} aria-label={c.nom} aria-pressed={m.coloris === c.id} onClick={() => onChange({ coloris: c.id })} />)}</div>
    </div>
    <div className="field"><span>Dimensions</span><label className="dims">{dim('l')}<b>×</b>{dim('p')}<em>cm</em></label></div>
    <div className="field"><span>Orientation</span>
      <div className="rot">
        <button className="mini" aria-label="Tourner de 90° à gauche" onClick={() => onChange({ rot: normRot(m.rot + 90) })}>⟲</button>
        <input id="rot" type="range" min={0} max={355} step={5} value={m.rot} onChange={e => onChange({ rot: +e.target.value })} aria-label="Orientation en degrés" />
        <button className="mini" aria-label="Tourner de 90° à droite" onClick={() => onChange({ rot: normRot(m.rot - 90) })}>⟳</button>
        <output>{m.rot}°</output>
      </div>
    </div>
    <div className="actions"><button className="mini" onClick={onDuplicate}>Dupliquer</button><button className="mini danger" onClick={onRemove}>Supprimer</button></div>
  </section>;
}
