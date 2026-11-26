/* Application : plan 2D, 3D en maquette et visite, panneaux et outils. */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Check, Gabarit, Rect } from '../data/types';
import { DIAG, diagEnabled } from '../diag';
import type { Engine } from '../engine/engine';
import { bbox } from './format';
import { DiagPanel, InfoCard, Joystick, KeysDialog, SidePanel } from './Panels';
import { Plan2D, type Plan2DHandle } from './Plan2D';

type View = 'plan' | '3d' | 'walk';
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

  /* moteur 3D : chargé à part, au démarrage, pour que le plan s'affiche tout de suite */
  useEffect(() => {
    let alive = true, e: Engine | null = null;
    import('../engine/engine').then(({ createEngine }) => {
      if (!alive) return;
      e = createEngine(canvas.current!, G, { bakeUrl: 'bake/' + G.id, mobile: coarse() || innerWidth < 820, onError: m => DIAG.err(m) });
      engine.current = e; engineState.current = 'ok';
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
    if (view === 'plan') e.hide(); else e.show(view === '3d' ? 'orbit' : 'walk');
  }, [view]);
  useEffect(() => { engine.current?.setRoof(roof); }, [roof]);

  const onRoom = (id: string) => {
    select(id); closeSheet();
    if (view !== 'plan') { engine.current?.focus(id); return; }
    const [x0, y0, x1, y1] = bbox(G.rooms.find(r => r.id === id)!.poly); plan.current?.fit([x0 - 3, y0 - 3, x1 + 3, y1 + 3]);
  };
  const onCheck = (c: Check) => {
    select(null); closeSheet(); setEst(true);
    if (view !== 'plan') setView('plan');
    const o = [...G.doors, ...G.windows, ...G.zones].find(o => o.id === c.focus);
    if (!o) { setTimeout(() => plan.current?.fit(), 0); return; }
    const r: Rect = c.focusRect ?? ('r' in o ? o.r : o.ax === 'h' ? [o.a, o.c - .1, o.b, o.c + .1] : [o.c - .1, o.a, o.c + .1, o.b]);
    setTimeout(() => { setFocus(r); plan.current?.fit([r[0] - 3, r[1] - 3, r[2] + 3, r[3] + 3]); }, 0);
  };
  const zoom = (f: number) => view === 'plan' ? plan.current?.zoom(f) : engine.current?.zoom(f);
  const fitAll = () => { if (view !== 'plan') return engine.current?.reset(); setFocus(null); plan.current?.fit(); };

  /* raccourcis */
  const st = useRef({ view, measure, keys }); st.current = { view, measure, keys };
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.('input')) return;
      const k = e.key.toLowerCase(), s = st.current;
      if (k === 'escape') { if (s.keys) setKeys(false); else if (s.measure) setMeasure(false); else { select(null); closeSheet(); } return; }
      if (s.view !== 'plan') { if (k === 'f' && !e.shiftKey && s.view === '3d') engine.current?.reset(); return; }
      if (k === 'm') setMeasure(m => !m); else if (k === 'c') setDims(d => !d); else if (k === 'e') setEst(x => !x);
      else if (k === 'f') { setFocus(null); plan.current?.fit(); } else if (k === '+' || k === '=') plan.current?.zoom(1 / 1.3); else if (k === '-') plan.current?.zoom(1.3);
    };
    addEventListener('keydown', kd); return () => removeEventListener('keydown', kd);
  }, [select]);

  const pressed = (b: boolean) => ({ 'aria-pressed': b });
  const walkHint = coarse() ? 'Joystick pour avancer, glisser pour regarder' : 'Z Q S D ou flèches pour avancer, glisser pour regarder, Maj pour courir';
  const onJoy = useCallback((x: number, y: number) => engine.current?.setJoy(x, y), []);
  const stats = useCallback(() => engine.current?.stats() ?? null, []);

  return <div className={panel ? '' : 'noPanel'} data-view={view} id="app">
    <Plan2D ref={plan} G={G} hidden={view !== 'plan'} sel={sel} dims={dims} est={est} measure={measure} focus={focus} onSelect={select} />
    <canvas id="gl" ref={canvas} hidden={view === 'plan'} />
    {view === 'walk' && <Joystick onMove={onJoy} />}
    <div id="walkHint" className="card">{walkHint}</div>
    {msg && <div id="noGL" className="card">{msg}</div>}

    <header id="title" className="card">
      <h1 className="serif">{G.name} · {G.level}</h1>
      <p>{G.subtitle}</p>
    </header>

    <nav id="tools" aria-label="Outils">
      <div className="grp card">
        <button className="btn" {...pressed(view === 'plan')} onClick={() => go('plan')}>Plan</button>
        <button className="btn" {...pressed(view === '3d')} onClick={() => go('3d')}>3D</button>
        <button className="btn" {...pressed(view === 'walk')} onClick={() => go('walk')}>Visite</button>
      </div>
      <div className="grp card">
        <button className="btn planOnly" {...pressed(measure)} onClick={() => setMeasure(m => !m)}>Mesure</button>
        <button className="btn planOnly" {...pressed(dims)} onClick={() => setDims(d => !d)}>Cotes</button>
        <button className="btn planOnly" {...pressed(est)} onClick={() => setEst(x => !x)}>Estimés</button>
        <button className="btn only3d" {...pressed(roof)} title="Volume de l'étage, indicatif" onClick={() => setRoof(r => !r)}>Étage</button>
        <button className="btn" disabled title="Phase 4">Aménagements</button>
        <button className="btn" id="tPanel" {...pressed(panel)} onClick={() => setPanel(p => !p)}>Panneau</button>
        <button className="btn" onClick={() => setKeys(true)}>Raccourcis</button>
      </div>
    </nav>

    <SidePanel G={G} sel={sel} open={sheet} onRoom={onRoom} onCheck={onCheck} />
    <button id="sheetBtn" className="btn card" onClick={() => setSheet(true)}>Pièces et vérifications</button>

    <div id="legend" className="card planOnly">
      <span><i className="sw" />Plan M3_RDC</span>
      <span><i className="sw e" />Estimé, à valider</span>
      <span><i className="sw w" />Fenêtre, baie</span>
    </div>

    <InfoCard G={G} id={sel} onClose={() => select(null)} />
    <div id="zoom" className="card">
      <button className="btn" id="zIn" aria-label="Zoomer" onClick={() => zoom(view === 'plan' ? 1 / 1.3 : 1 / 1.25)}>+</button>
      <button className="btn" id="zOut" aria-label="Dézoomer" onClick={() => zoom(view === 'plan' ? 1.3 : 1.25)}>−</button>
      <button className="btn" id="zFit" aria-label="Recentrer" title="Recentrer" onClick={fitAll}>⤢</button>
    </div>
    <div id="hint" className={'card' + (measure ? ' on' : '')}>Mesure : clique deux points. <kbd>Échap</kbd> pour sortir.</div>
    <KeysDialog open={keys} onClose={() => setKeys(false)} />
    {diagEnabled() && <DiagPanel stats={stats} />}
  </div>;
}
