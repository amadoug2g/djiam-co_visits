/* Application : plan 2D, 3D en maquette et visite, panneaux et outils. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Check, Gabarit, Rect } from '../data/types';
import { DIAG, diagEnabled } from '../diag';
import type { Engine } from '../engine/engine';
import { bbox } from './format';
import { DiagPanel, InfoCard, KeysDialog, SidePanel, type Tab } from './Panels';
import { CataloguePane, MeubleCard } from './Amenagement';
import { charger, enregistrer, normRot, nouveauMeuble, nouvelId, pieceEn, propose, rendu, snap, toucheUnMur, type Meuble, type MeubleRendu } from '../amenagement/model';
import { Plan2D, type Plan2DHandle } from './Plan2D';

type View = 'plan' | '3d';
const coarse = () => matchMedia('(pointer:coarse)').matches;

export function App({ G }: { G: Gabarit }) {
  const [view, setView] = useState<View>('plan');
  const [sel, setSel] = useState<string | null>(null);
  const [focus, setFocus] = useState<Rect | null>(null);
  const [dims, setDims] = useState(true), [est, setEst] = useState(true), [measure, setMeasure] = useState(false);
  const [roof, setRoof] = useState(false), [panel, setPanel] = useState(true), [sheet, setSheet] = useState(false), [keys, setKeys] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const plan = useRef<Plan2DHandle>(null), canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<Engine | null>(null), engineState = useRef<'loading' | 'ok' | 'failed'>('loading');
  const [ready, setReady] = useState(false), [tab, setTab] = useState<Tab>('rooms');

  /* ---------- aménagement : meubles enregistrés sur l'appareil, sinon l'aménagement proposé ---------- */
  const [meubles, setMeubles] = useState<Meuble[]>(() => charger(G) ?? propose(G));
  const [selM, setSelM] = useState<string | null>(null), [amenager, setAmenager] = useState(false);
  useEffect(() => { enregistrer(G, meubles); }, [G, meubles]);
  const rendus = useMemo(() => meubles.map(rendu).filter((m): m is MeubleRendu => !!m), [meubles]);
  const mur = useMemo(() => new Set(meubles.filter(m => toucheUnMur(G, m)).map(m => m.id)), [G, meubles]);
  const meuble = meubles.find(m => m.id === selM) ?? null;
  const patch = useCallback((id: string, p: Partial<Meuble>) => setMeubles(ms => ms.map(m => m.id === id ? { ...m, ...p } : m)), []);
  const pickM = useCallback((id: string | null) => { setSelM(id); if (id) { setSel(null); setFocus(null); } }, []);
  const moveM = useCallback((id: string, x: number, z: number) => patch(id, { x: snap(x), z: snap(z) }), [patch]);
  const cb = useRef({ pickM, moveM }); cb.current = { pickM, moveM };
  const startAmenager = (on: boolean) => { setAmenager(on); setMeasure(false); if (on) { setTab('meubles'); setPanel(true); if (innerWidth <= 820) setSheet(true); } else setSelM(null); };
  const addMeuble = (ref: string) => {
    /* pièce sélectionnée, sinon centre de la vue ; à défaut, le séjour */
    const r = sel ? G.rooms.find(r => r.id === sel) : null;
    let [x, z] = r ? [(bbox(r.poly)[0] + bbox(r.poly)[2]) / 2, (bbox(r.poly)[1] + bbox(r.poly)[3]) / 2]
      : view === 'plan' ? plan.current?.center() ?? [0, 0] : engine.current?.target() ?? [0, 0];
    if (pieceEn(G, x, z)?.grp !== 'int') {
      const s = bbox(G.rooms.find(r => r.id === 'sejour')?.poly ?? G.rooms[0].poly); [x, z] = [(s[0] + s[2]) / 2, (s[1] + s[3]) / 2];
      /* le meuble doit rester visible : on recadre sur la pièce où il est posé */
      if (view === 'plan') plan.current?.fit([s[0] - 2, s[1] - 2, s[2] + 2, s[3] + 2]); else engine.current?.focus('sejour');
    }
    const m = nouveauMeuble(ref, x, z);
    setMeubles(ms => [...ms, m]); setAmenager(true); setSelM(m.id); setSel(null); closeSheet();
  };
  const duplicate = (m: Meuble) => { const c = { ...m, id: nouvelId(), x: snap(m.x + .3), z: snap(m.z + .3) }; setMeubles(ms => [...ms, c]); setSelM(c.id); };
  const removeM = (id: string) => { setMeubles(ms => ms.filter(m => m.id !== id)); setSelM(null); };

  /* moteur 3D : chargé à part, au démarrage, pour que le plan s'affiche tout de suite */
  useEffect(() => {
    let alive = true, e: Engine | null = null;
    import('../engine/engine').then(({ createEngine }) => {
      if (!alive) return;
      e = createEngine(canvas.current!, G, {
        bakeUrl: 'bake/' + G.id, mobile: coarse() || innerWidth < 820, onError: m => DIAG.err(m),
        onFurniturePick: id => cb.current.pickM(id), onFurnitureMove: (id, x, z) => cb.current.moveM(id, x, z),
      });
      engine.current = e; engineState.current = 'ok'; setReady(true);
    }).catch(err => { engineState.current = 'failed'; DIAG.err('moteur 3D : ' + (err?.message || err)); });
    return () => { alive = false; e?.dispose(); engine.current = null; };
  }, [G]);

  const select = useCallback((id: string | null) => { setSel(id); setFocus(null); }, []);
  const closeSheet = () => setSheet(false);

  const go = useCallback((v: View) => {
    if (v !== 'plan' && engineState.current === 'loading') { setMsg('Chargement de la 3D…'); setTimeout(() => { setMsg(null); go(v); }, 400); return; }
    if (v !== 'plan' && engineState.current === 'failed') { setMsg('La 3D n’a pas pu démarrer sur cet appareil ou ce navigateur (WebGL 2 requis). Le plan reste disponible.'); return; }
    setMsg(null); setMeasure(false); setView(v);
  }, []);
  /* la vue 3D démarre après l'affichage du canvas */
  useEffect(() => {
    const e = engine.current; if (!e) return;
    if (view === 'plan') e.hide(); else e.show('orbit');
  }, [view]);
  useEffect(() => { engine.current?.setRoof(roof); }, [roof]);
  useEffect(() => { engine.current?.setFurniture(rendus, amenager ? selM : null); }, [ready, rendus, selM, amenager]);
  useEffect(() => { engine.current?.setFurnitureEdit(amenager); }, [ready, amenager]);

  const onRoom = (id: string) => {
    select(id); closeSheet();
    if (view !== 'plan') { engine.current?.focus(id); return; }
    const [x0, y0, x1, y1] = bbox(G.rooms.find(r => r.id === id)!.poly); plan.current?.fit([x0 - 3, y0 - 3, x1 + 3, y1 + 3]);
  };
  const onCheck = (c: Check) => {
    select(null); closeSheet(); setEst(true);
    if (view !== 'plan') setView('plan');
    const o = c.focusRect ? null : [...G.doors, ...G.windows, ...G.zones].find(o => o.id === c.focus);
    if (!o && !c.focusRect) { setTimeout(() => plan.current?.fit(), 0); return; }
    const r: Rect = c.focusRect ?? (!o ? G.stairs.r : 'r' in o ? o.r : o.ax === 'h' ? [o.a, o.c - .1, o.b, o.c + .1] : [o.c - .1, o.a, o.c + .1, o.b]);
    setTimeout(() => { setFocus(r); plan.current?.fit([r[0] - 3, r[1] - 3, r[2] + 3, r[3] + 3]); }, 0);
  };
  const zoom = (f: number) => view === 'plan' ? plan.current?.zoom(f) : engine.current?.zoom(f);
  const fitAll = () => { if (view !== 'plan') return engine.current?.reset(); setFocus(null); plan.current?.fit(); };

  /* raccourcis */
  const st = useRef({ view, measure, keys, amenager, meuble }); st.current = { view, measure, keys, amenager, meuble };
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.('input')) return;
      const k = e.key.toLowerCase(), s = st.current;
      if (k === 'escape') { if (s.keys) setKeys(false); else if (s.measure) setMeasure(false); else if (s.meuble) setSelM(null); else { select(null); closeSheet(); } return; }
      /* meuble sélectionné : tourner, déplacer, dupliquer, retirer */
      if (s.amenager && s.meuble) {
        const m = s.meuble, step = e.shiftKey ? .25 : .05;
        const nudge: Record<string, [number, number]> = { arrowleft: [-step, 0], arrowright: [step, 0], arrowup: [0, -step], arrowdown: [0, step] };
        if (k === 'r') { patch(m.id, { rot: normRot(m.rot + (e.shiftKey ? -15 : 90)) }); e.preventDefault(); return; }
        if (k === 'delete' || k === 'backspace') { removeM(m.id); e.preventDefault(); return; }
        if (k === 'd' && !e.metaKey && !e.ctrlKey) { duplicate(m); return; }
        if (nudge[k] && s.view === 'plan') { patch(m.id, { x: snap(m.x + nudge[k][0]), z: snap(m.z + nudge[k][1]) }); e.preventDefault(); return; }
      }
      if (s.view !== 'plan') { if (k === 'f' && !e.shiftKey) engine.current?.reset(); return; }
      if (k === 'a') { startAmenager(!s.amenager); return; }
      if (k === 'm') { setAmenager(false); setSelM(null); setMeasure(m => !m); } else if (k === 'c') setDims(d => !d); else if (k === 'e') setEst(x => !x);
      else if (k === 'f') { setFocus(null); plan.current?.fit(); } else if (k === '+' || k === '=') plan.current?.zoom(1 / 1.3); else if (k === '-') plan.current?.zoom(1.3);
    };
    addEventListener('keydown', kd); return () => removeEventListener('keydown', kd);
  }, [select]);

  const pressed = (b: boolean) => ({ 'aria-pressed': b });
  const stats = useCallback(() => engine.current?.stats() ?? null, []);

  return <div className={(panel ? '' : 'noPanel') + (amenager ? ' amenager' : '')} data-view={view} id="app">
    <Plan2D ref={plan} G={G} hidden={view !== 'plan'} sel={sel} dims={dims} est={est} measure={measure} focus={focus} onSelect={select}
      meubles={rendus} selMeuble={amenager ? selM : null} amenager={amenager} mur={mur} onMeublePick={pickM} onMeubleMove={moveM} />
    <canvas id="gl" ref={canvas} hidden={view === 'plan'} />
    {msg && <div id="noGL" className="card">{msg}</div>}

    <header id="title" className="card">
      <h1 className="serif">{G.name}</h1>
      <p>{G.subtitle}</p>
    </header>

    <nav id="tools" aria-label="Outils">
      <div className="grp card">
        <button className="btn" {...pressed(view === 'plan')} onClick={() => go('plan')}>Plan</button>
        <button className="btn" {...pressed(view === '3d')} onClick={() => go('3d')}>3D</button>
      </div>
      <div className="grp card">
        <button className="btn planOnly" {...pressed(measure)} onClick={() => { setAmenager(false); setSelM(null); setMeasure(m => !m); }}>Mesure</button>
        <button className="btn planOnly" {...pressed(dims)} onClick={() => setDims(d => !d)}>Cotes</button>
        <button className="btn planOnly" {...pressed(est)} onClick={() => setEst(x => !x)}>Estimés</button>
        <button className="btn only3d" {...pressed(roof)} title="Volume de l'étage, indicatif" onClick={() => setRoof(r => !r)}>Étage</button>
        <button className="btn" {...pressed(amenager)} onClick={() => startAmenager(!amenager)} title="Placer et modifier des meubles (A)">Aménager</button>
        <button className="btn" id="tPanel" {...pressed(panel)} onClick={() => setPanel(p => !p)}>Panneau</button>
        <button className="btn" onClick={() => setKeys(true)}>Raccourcis</button>
      </div>
    </nav>

    <SidePanel G={G} sel={sel} open={sheet} onClose={closeSheet} tab={tab} setTab={t => { setTab(t); if (t === 'meubles' && !amenager) startAmenager(true); }} onRoom={onRoom} onCheck={onCheck}
      nMeubles={meubles.length} meubles={<CataloguePane n={meubles.length} onAdd={addMeuble}
        onPropose={() => { setMeubles(propose(G)); setSelM(null); }} onClear={() => { setMeubles([]); setSelM(null); }} />} />
    <button id="sheetBtn" className="btn card" onClick={() => setSheet(true)}>{amenager ? 'Meubles' : 'Pièces et vérifications'}</button>

    <div id="legend" className="card planOnly">
      <span><i className="sw" />Relevé sur le plan</span>
      <span><i className="sw e" />Estimé, à valider</span>
      <span><i className="sw w" />Fenêtre, baie</span>
    </div>

    {amenager && meuble
      ? <MeubleCard m={meuble} mur={mur.has(meuble.id)} onChange={p => patch(meuble.id, p)} onDuplicate={() => duplicate(meuble)} onRemove={() => removeM(meuble.id)} onClose={() => setSelM(null)} />
      : <InfoCard G={G} id={sel} onClose={() => select(null)} />}
    <div id="zoom" className="card">
      <button className="btn" id="zIn" aria-label="Zoomer" onClick={() => zoom(view === 'plan' ? 1 / 1.3 : 1 / 1.25)}>+</button>
      <button className="btn" id="zOut" aria-label="Dézoomer" onClick={() => zoom(view === 'plan' ? 1.3 : 1.25)}>−</button>
      <button className="btn" id="zFit" aria-label="Recentrer" title="Recentrer" onClick={fitAll}>⤢</button>
    </div>
    <div id="hint" className={'card' + (measure || (amenager && !sheet) ? ' on' : '') + (!measure && amenager ? ' am' : '')}>
      {measure ? <>Mesure : clique deux points. <kbd>Échap</kbd> pour sortir.</>
        : coarse() ? <>Aménager : glisse un meuble pour le déplacer, touche-le pour le modifier.</>
        : <>Aménager : glisse un meuble pour le déplacer. <kbd>R</kbd> tourner, <kbd>D</kbd> dupliquer, <kbd>Suppr</kbd> retirer.</>}
    </div>
    <KeysDialog open={keys} onClose={() => setKeys(false)} />
    {diagEnabled() && <DiagPanel stats={stats} />}
  </div>;
}
