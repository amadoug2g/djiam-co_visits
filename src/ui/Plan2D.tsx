/* Plan 2D en SVG : pièces, murs, ouvertures, cotes, mesure aimantée. Coordonnées du SVG = mètres du plan. */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Door, Gabarit, Pt, Rect } from '../data/types';
import { area, bbox, fmt, snap } from './format';
import { snap as snap1, type MeubleRendu } from '../amenagement/model';
import { Furniture2D } from './Furniture2D';

export interface Plan2DHandle { fit(rect?: Rect): void; zoom(f: number): void; /** centre de la vue, en mètres */ center(): Pt }
interface Props {
  G: Gabarit; hidden: boolean; sel: string | null; dims: boolean; est: boolean; measure: boolean; focus: Rect | null;
  onSelect(id: string | null): void;
  /** aménagement : meubles, sélection, mode édition, meubles qui touchent un mur */
  meubles: MeubleRendu[]; selMeuble: string | null; amenager: boolean; mur: Set<string>;
  onMeublePick(id: string | null): void; onMeubleMove(id: string, x: number, z: number): void;
}
interface VB { x: number; y: number; w: number; h: number }

const DEFS = `
 <pattern id="pDeck" width=".6" height=".15" patternUnits="userSpaceOnUse"><rect width=".6" height=".15" fill="#3a2e24"/><path d="M0 .145H.6M.3 0V.15" stroke="#2c231b" stroke-width=".012"/></pattern>
 <pattern id="pLawn" width=".5" height=".5" patternUnits="userSpaceOnUse"><rect width=".5" height=".5" fill="#1e2b1b"/><circle cx=".12" cy=".14" r=".018" fill="#2f4229"/><circle cx=".36" cy=".38" r=".016" fill="#2a3b25"/></pattern>
 <pattern id="pPool" width=".25" height=".25" patternUnits="userSpaceOnUse"><rect width=".25" height=".25" fill="#1c4a66"/><path d="M0 .248H.25M.248 0V.25" stroke="#245a7a" stroke-width=".01"/></pattern>
 <pattern id="pPark" width=".4" height=".2" patternUnits="userSpaceOnUse"><rect width=".4" height=".2" fill="#262523"/><path d="M0 .195H.4M.2 0V.1M0 .1V.2M.4 .1V.2" stroke="#1f1e1c" stroke-width=".01"/></pattern>
 <pattern id="pCov" width=".6" height=".6" patternUnits="userSpaceOnUse"><rect width=".6" height=".6" fill="#3d3127"/><path d="M0 .595H.6" stroke="#2c231b" stroke-width=".012"/><path d="M0 .6L.6 0" stroke="rgba(255,255,255,.05)" stroke-width=".02"/></pattern>
 <pattern id="pFloor" width=".6" height=".6" patternUnits="userSpaceOnUse"><rect width=".6" height=".6" fill="#2b2926"/><path d="M0 .598H.6M.598 0V.6" stroke="#25231f" stroke-width=".01"/></pattern>`;
const FILL: Record<string, string> = { deck: 'url(#pDeck)', lawn: 'url(#pLawn)', paving: '#2b2a27', parking: 'url(#pPark)', pool: 'url(#pPool)', covered: 'url(#pCov)' };

const R = ([x0, y0, x1, y1]: Rect, p: React.SVGProps<SVGRectElement> = {}, key?: string | number) =>
  <rect key={key} x={x0} y={y0} width={+(x1 - x0).toFixed(3)} height={+(y1 - y0).toFixed(3)} {...p} />;

function DoorSvg({ d }: { d: Door }) {
  const est = d.src === 'est', col = est ? 'var(--est)' : '#d8d3ca', dash = est ? '.08 .06' : undefined;
  const P = (u: number, v: number): Pt => d.ax === 'h' ? [u, v] : [v, u];
  const w = d.b - d.a, cut: Rect = d.ax === 'h' ? [d.a, d.c - .07, d.b, d.c + .07] : [d.c - .07, d.a, d.c + .07, d.b];
  const side = d.side ?? 1;
  const leaf = (hv: number, fv: number, len: number, k: string) => {
    const H = P(hv, d.c), F = P(fv, d.c), L = P(hv, d.c + side * len);
    const cr = (F[0] - H[0]) * (L[1] - H[1]) - (F[1] - H[1]) * (L[0] - H[0]);
    return <g key={k}><line x1={H[0]} y1={H[1]} x2={L[0]} y2={L[1]} stroke={col} strokeWidth=".04" />
      <path d={`M${F[0]} ${F[1]}A${len} ${len} 0 0 ${cr > 0 ? 1 : 0} ${L[0]} ${L[1]}`} fill="none" stroke={col} strokeWidth=".018" strokeDasharray={dash} /></g>;
  };
  let inner: ReactNode;
  if (d.passage) { const a = P(d.a, d.c), b = P(d.b, d.c); inner = <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={col} strokeWidth=".03" strokeDasharray={dash} />; }
  else if (d.double) { const m = (d.a + d.b) / 2; inner = [leaf(d.a, m, w / 2, 'a'), leaf(d.b, m, w / 2, 'b')]; }
  else inner = d.hinge === 'a' ? leaf(d.a, d.b, w, 'a') : leaf(d.b, d.a, w, 'b');
  return <>{R(cut, { fill: '#2b2926' })}{inner}</>;
}

/** couches fixes du plan (ne dépendent que du gabarit) */
function StaticLayers({ G }: { G: Gabarit }) {
  const S = G.site, st = G.stairs;
  let sl = ''; for (let y = st.from; y <= st.to + .001; y += st.step) sl += `M${st.r[0]} ${y.toFixed(3)}H${st.r[2]}`;
  const pool = G.zones.find(z => z.type === 'pool');
  const ph = G.rooms.find(r => r.id === 'pool-house');
  return <>
    {R([S.x - .6, S.y - .6, S.x + S.w + .6, S.y + S.h + .6], { fill: '#141412' })}
    <g id="zones">{G.zones.map(z => R(z.r, { fill: FILL[z.type], className: z.src === 'est' ? 'estz' : undefined }, z.id))}</g>
    {pool && R(pool.r, { fill: 'none', stroke: '#e8e2d6', strokeWidth: .1 })}
    <path d={`${sl}M${st.mid} ${st.from}V${st.to}`} stroke="#6a655d" strokeWidth=".02" fill="none" />
    {(() => { /* sens de montée : première volée, palier, volée retour */
      const ca = st.first === 'east' ? (st.mid + st.r[2]) / 2 : (st.r[0] + st.mid) / 2, cb = st.first === 'east' ? (st.r[0] + st.mid) / 2 : (st.mid + st.r[2]) / 2;
      const zl = (st.to + st.r[3]) / 2, ze = st.from + .25, est = st.src === 'est' && !st.valide, col = est ? 'var(--est)' : '#c9c4ba', hd = .16, dir = cb > ca ? 1 : -1;
      return <g className={est ? 'estg' : undefined} aria-label="Sens de montée">
        <circle cx={ca} cy={st.from + .15} r=".07" fill={col} />
        <path d={`M${ca} ${st.from + .15}V${zl}H${cb}V${ze}`} stroke={col} strokeWidth=".035" fill="none" strokeDasharray={est ? '.12 .07' : undefined} />
        <path d={`M${cb - hd} ${ze + hd}L${cb} ${ze}L${cb + hd} ${ze + hd}`} stroke={col} strokeWidth=".035" fill="none" data-dir={dir} />
      </g>;
    })()}
    {G.steps.map((s, i) => <path key={i} d={s.at.map(v => s.ax === 'v' ? `M${v} ${s.r[1]}V${s.r[3]}` : `M${s.r[0]} ${v}H${s.r[2]}`).join('')} stroke="#77726a" strokeWidth=".02" />)}
    {ph && R(bbox(ph.poly), { fill: 'none', stroke: '#8b857b', strokeWidth: .025, strokeDasharray: '.15 .1' })}
    {G.cars.map((c, i) => R([c.x - c.W / 2, c.z0, c.x + c.W / 2, c.z0 + c.L], { fill: 'none', stroke: '#e2bd68', strokeWidth: .05, strokeDasharray: '.2 .1' }, 'car' + i))}
    <g fill="var(--wall)">
      {G.fence.map((f, i) => R(f, { fill: '#a9a49b' }, 'f' + i))}
      {G.walls.map((w, i) => R(w.r, {}, 'w' + i))}
    </g>
    <g>{G.windows.map(w => {
      const [x0, y0, x1, y1] = w.r, hz = (x1 - x0) > (y1 - y0), est = w.src === 'est';
      const c = w.glass ? '#7fd3d3' : est ? 'var(--est)' : '#5aa7e0';
      const mid = hz ? `M${x0} ${(y0 + y1) / 2}H${x1}` : `M${(x0 + x1) / 2} ${y0}V${y1}`;
      return <g key={w.id} className={est ? 'estg' : undefined}>{R(w.r, { fill: '#151513' })}<path d={mid} stroke={c} strokeWidth=".035" strokeDasharray={est ? '.12 .07' : undefined} /></g>;
    })}</g>
    <g>{G.doors.map(d => <g key={d.id} className={d.src === 'est' ? 'estg' : undefined}><DoorSvg d={d} /></g>)}</g>
    {G.gates.map((g, i) => <path key={i} d={`M${g.a} ${(g.z[0] + g.z[1]) / 2}H${g.b}`} stroke="#a9a49b" strokeWidth=".03" strokeDasharray=".2 .12" />)}
  </>;
}

export const Plan2D = forwardRef<Plan2DHandle, Props>(function Plan2D({ G, hidden, sel, dims, est, measure, focus, onSelect, meubles, selMeuble, amenager, mur, onMeublePick, onMeubleMove }, ref) {
  const [mdrag, setMDrag] = useState<{ id: string; x: number; z: number } | null>(null);
  const stage = useRef<HTMLDivElement>(null), svg = useRef<SVGSVGElement>(null);
  const [vb, setVb] = useState<VB>({ x: 0, y: 0, w: 22, h: 27 });
  const vbRef = useRef(vb); vbRef.current = vb;
  const [pxW, setPxW] = useState(1);
  const [m, setM] = useState<Pt[]>([]), [hover, setHover] = useState<Pt | null>(null);
  const [dragging, setDragging] = useState(false);
  const rooms = useMemo(() => G.rooms.map(r => ({ ...r, calc: area(r.poly), bb: bbox(r.poly) })), [G]);

  const fit = useCallback((rect?: Rect) => {
    const el = stage.current; if (!el) return;
    const W = el.clientWidth, H = el.clientHeight, mob = W <= 820; if (!W || !H) return;
    const pad = mob ? { l: 12, r: 12, t: 126, b: 70 } : { l: 336, r: 24, t: 80, b: 70 };
    const S = G.site, [x0, y0, x1, y1] = rect || [S.x - 1, S.y - 1, S.x + S.w + 1.2, S.y + S.h + .6];
    const aw = Math.max(W - pad.l - pad.r, 100), ah = Math.max(H - pad.t - pad.b, 100);
    const s = Math.min(aw / (x1 - x0), ah / (y1 - y0));
    setVb({ w: W / s, h: H / s, x: x0 - (pad.l + (aw - (x1 - x0) * s) / 2) / s, y: y0 - (pad.t + (ah - (y1 - y0) * s) / 2) / s });
    setPxW(W);
  }, [G]);
  const toWorld = (cx: number, cy: number): Pt => {
    const r = svg.current!.getBoundingClientRect(), v = vbRef.current;
    return [v.x + (cx - r.left) / r.width * v.w, v.y + (cy - r.top) / r.height * v.h];
  };
  const zoomAt = (f: number, cx: number, cy: number) => {
    const [wx, wy] = toWorld(cx, cy), v = vbRef.current, nw = Math.min(Math.max(v.w * f, 2.5), 120), r = nw / v.w;
    const n = { x: wx - (wx - v.x) * r, y: wy - (wy - v.y) * r, w: nw, h: v.h * r };
    vbRef.current = n; setVb(n);
  };
  const center = () => { const r = svg.current!.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  useImperativeHandle(ref, () => ({ fit, zoom: f => { const [x, y] = center(); zoomAt(f, x, y); }, center: () => { const v = vbRef.current; return [v.x + v.w / 2, v.y + v.h / 2]; } }));

  /* recadrage au redimensionnement, comme le prototype */
  useEffect(() => {
    const el = stage.current; if (!el) return; let t = 0;
    const ro = new ResizeObserver(() => { if (!el.clientWidth || hidden) return; clearTimeout(t); t = window.setTimeout(() => fit(), 60); });
    ro.observe(el); return () => { ro.disconnect(); clearTimeout(t); };
  }, [fit, hidden]);
  useEffect(() => { if (!hidden) fit(); }, [hidden, fit]);
  useEffect(() => { setM([]); setHover(null); }, [measure]);

  /* glisser, pincer, molette */
  useEffect(() => {
    const el = stage.current!; const ptrs = new Map<number, Pt>();
    let drag: { x: number; y: number; vx: number; vy: number } | null = null, pinch: { d: number } | null = null, moved = 0;
    /* glisser un meuble (mode aménagement) */
    let fd: { id: string; w0: Pt; x0: number; z0: number; x: number; z: number; sx: number; sy: number } | null = null;
    const wheel = (e: WheelEvent) => { e.preventDefault(); zoomAt(Math.exp(e.deltaY * .0015), e.clientX, e.clientY); };
    const down = (e: PointerEvent) => {
      el.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); moved = 0;
      const fel = amRef.current && ptrs.size === 1 ? (e.target as Element).closest?.('[data-fid]') : null;
      const fm = fel && meublesRef.current.find(m => m.id === fel.getAttribute('data-fid'));
      if (fm) { fd = { id: fm.id, w0: toWorld(e.clientX, e.clientY), x0: fm.x, z0: fm.z, x: fm.x, z: fm.z, sx: e.clientX, sy: e.clientY }; pickRef.current(fm.id); drag = null; return; }
      if (ptrs.size === 1) { const v = vbRef.current; drag = { x: e.clientX, y: e.clientY, vx: v.x, vy: v.y }; }
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) }; drag = null; }
    };
    const move = (e: PointerEvent) => {
      if (measureRef.current && mRef.current.length === 1) setHover(snap(toWorld(e.clientX, e.clientY)));
      if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      if (fd) {
        if (Math.abs(e.clientX - fd.sx) + Math.abs(e.clientY - fd.sy) < 3) return;
        const w = toWorld(e.clientX, e.clientY); fd.x = snap1(fd.x0 + w[0] - fd.w0[0]); fd.z = snap1(fd.z0 + w[1] - fd.w0[1]);
        setMDrag({ id: fd.id, x: fd.x, z: fd.z }); return;
      }
      if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); zoomAt(pinch.d / d, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); pinch.d = d; moved = 99; return; }
      if (drag) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y; moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
        if (moved > 4) {
          setDragging(true); const v = vbRef.current, k = v.w / svg.current!.clientWidth;
          vbRef.current = { ...v, x: drag.vx - dx * k, y: drag.vy - dy * k };
          const n = vbRef.current; svg.current!.setAttribute('viewBox', `${n.x} ${n.y} ${n.w} ${n.h}`);
        }
      }
    };
    const up = (e: PointerEvent) => {
      ptrs.delete(e.pointerId); setDragging(false); if (ptrs.size < 2) pinch = null;
      if (fd) { if (fd.x !== fd.x0 || fd.z !== fd.z0) moveRef.current(fd.id, fd.x, fd.z); fd = null; setMDrag(null); return; }
      if (ptrs.size === 0) { if (drag && moved <= 4) tap(e); else setVb(vbRef.current); drag = null; }
    };
    const cancel = (e: PointerEvent) => { ptrs.delete(e.pointerId); drag = null; pinch = null; fd = null; setMDrag(null); setVb(vbRef.current); };
    const tap = (e: PointerEvent) => {
      if (measureRef.current) { const p = snap(toWorld(e.clientX, e.clientY)); setM(prev => [...(prev.length >= 2 ? [] : prev), p]); setHover(null); return; }
      if (amRef.current) { pickRef.current(null); return; }
      const t = document.elementFromPoint(e.clientX, e.clientY), g = t && t.closest<SVGGElement>('.room');
      selectRef.current(g ? g.dataset.id! : null);
    };
    el.addEventListener('wheel', wheel, { passive: false }); el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', cancel);
    return () => { el.removeEventListener('wheel', wheel); el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', cancel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const measureRef = useRef(measure); measureRef.current = measure;
  const mRef = useRef(m); mRef.current = m;
  const selectRef = useRef(onSelect); selectRef.current = onSelect;
  const amRef = useRef(amenager); amRef.current = amenager;
  const meublesRef = useRef(meubles); meublesRef.current = meubles;
  const pickRef = useRef(onMeublePick); pickRef.current = onMeublePick;
  const moveRef = useRef(onMeubleMove); moveRef.current = onMeubleMove;

  const k = pxW / vb.w; // pixels par mètre
  const staticLayers = useMemo(() => <StaticLayers G={G} />, [G]);

  /* étiquettes : la plus grande taille qui tient dans la pièce */
  const lab = (key: string, cx: number, cy: number, a: string, b: string, w: number, hh: number, col = '#ecebe7') => {
    for (const [px, two] of [[12, 1], [10.5, 1], [10, 0]] as const) {
      const f = px / k, f2 = (px - 1.5) / k, two2 = !!(two && b);
      const tw = Math.max(a.length * f * .53, two2 ? b.length * f2 * .53 : 0);
      if (w * k < tw * k + 8 || hh * k < (two2 ? 32 : 16)) continue;
      return <g key={key}>
        <text x={cx} y={cy - (two2 ? f * .15 : -f * .35)} fontSize={f} fill={col} textAnchor="middle" fontWeight="500">{a}</text>
        {two2 && <text x={cx} y={cy + f * 1.05} fontSize={f2} fill="#9b978f" textAnchor="middle">{b}</text>}
      </g>;
    }
    return null;
  };
  const labels = <g id="labels">
    {rooms.map(r => {
      const [x0, y0, x1, y1] = r.bb, L = r.label ?? { x: (x0 + x1) / 2, z: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
      return lab(r.id, L.x, L.z, r.name, r.planArea ? fmt(r.planArea) + ' m²' : fmt(r.calc) + ' m² calc.', L.w, L.h);
    })}
    {G.zones.filter(z => z.name).map(z => {
      const [x0, y0, x1, y1] = z.r, L = z.label ?? { x: (x0 + x1) / 2, z: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
      return lab('z' + z.id, L.x, L.z, z.name!, '', L.w, L.h, '#b9b4aa');
    })}
  </g>;
  const fs2 = 10.5 / k, S = G.site;
  const dimLayer = dims && <g id="dimg">
    {G.dims.map((d, i) => {
      const [x1, y1] = d.p, [x2, y2] = d.q, hz = y1 === y2, t = .12, cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
      return <g key={i}>
        <path d={`M${x1} ${y1}L${x2} ${y2}${hz ? `M${x1} ${y1 - t}v${2 * t}M${x2} ${y2 - t}v${2 * t}` : `M${x1 - t} ${y1}h${2 * t}M${x2 - t} ${y2}h${2 * t}`}`} stroke="#8d887f" strokeWidth={1 / k} fill="none" />
        {hz ? <text x={cx} y={cy - 4 / k} fontSize={fs2} fill="#c9c4ba" textAnchor="middle">{d.t}</text>
          : <text x={cx - 4 / k} y={cy} fontSize={fs2} fill="#c9c4ba" textAnchor="middle" transform={`rotate(-90 ${cx - 4 / k} ${cy})`}>{d.t}</text>}
      </g>;
    })}
    <path d={`M${S.x} ${S.y - .45}H${S.x + S.w}M${S.x + S.w + .45} ${S.y}V${S.y + S.h}`} stroke="#8d887f" strokeWidth={1 / k} />
    <text x={S.x + S.w / 2} y={S.y - .45 - 4 / k} fontSize={fs2} fill="#c9c4ba" textAnchor="middle">{S.planW} m (plan)</text>
    <text x={S.x + S.w + .45 + 12 / k} y={S.y + S.h / 2} fontSize={fs2} fill="#c9c4ba" textAnchor="middle" transform={`rotate(90 ${S.x + S.w + .45 + 12 / k} ${S.y + S.h / 2})`}>{S.planH} m (plan)</text>
  </g>;
  let meas: ReactNode = null;
  if (m.length) {
    const b = m[1] || hover;
    meas = <g id="meas">
      {m.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={4 / k} fill="var(--wood)" />)}
      {b && (() => {
        const a = m[0], dist = Math.hypot(b[0] - a[0], b[1] - a[1]), cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2, t = fmt(dist) + ' m', w = t.length * 7.2 / k + 12 / k, hh = 20 / k;
        return <>
          <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="var(--wood)" strokeWidth={2 / k} strokeDasharray={`${6 / k} ${4 / k}`} />
          <rect x={cx - w / 2} y={cy - hh - 6 / k} width={w} height={hh} rx={4 / k} fill="#1b1a18" stroke="var(--wood)" strokeWidth={1 / k} />
          <text x={cx} y={cy - 6 / k - hh / 2 + 4.5 / k} fontSize={12.5 / k} fill="#f3d9c3" textAnchor="middle" fontWeight="600" data-testid="mesure">{t}</text>
        </>;
      })()}
    </g>;
  }
  const focusLayer = focus && <g id="focus"><rect x={focus[0] - .25} y={focus[1] - .25} width={focus[2] - focus[0] + .5} height={focus[3] - focus[1] + .5} rx={6 / k} fill="none" stroke="var(--est)" strokeWidth={2 / k} /></g>;

  return <div id="stage" ref={stage} hidden={hidden} className={(measure ? 'measuring ' : '') + (dragging ? 'drag' : '')}>
    <svg id="plan" ref={svg} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}>
      <defs dangerouslySetInnerHTML={{ __html: DEFS }} />
      <style>{`.estg,.estz{opacity:${est ? 1 : .12}}`}</style>
      {staticLayers}
      <g id="rooms">{rooms.map(r => <g key={r.id} className={'room' + (sel === r.id ? ' sel' : '')} data-id={r.id}>
        <polygon className="rf" points={r.poly.map(p => p.join(',')).join(' ')} fill={r.covered ? 'url(#pCov)' : 'url(#pFloor)'} />
      </g>)}</g>
      <Furniture2D meubles={meubles} sel={selMeuble} mur={mur} edit={amenager} k={k} drag={mdrag} />
      {labels}{dimLayer}{meas}{focusLayer}
    </svg>
  </div>;
});
