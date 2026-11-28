/* Diagnostic local : erreurs et mesures du moteur, affichés dans le panneau ?diag=1. Rien n'est envoyé. */
export interface DiagStats {
  engine: string; mode: string; fps: number; post: boolean; gtao: boolean; degraded: string; baked: boolean;
  w: number; h: number; dpr: number; gpu: string; furniture?: number;
}
type Listener = () => void;
const errs: string[] = [];
const listeners = new Set<Listener>();
const emit = () => listeners.forEach(l => l());

export const DIAG = {
  errs,
  err(m: unknown) { errs.push(String(m).slice(0, 400)); if (errs.length > 50) errs.shift(); emit(); },
  subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; },
};

export const diagEnabled = () => new URLSearchParams(location.search).has('diag');

export function installGlobalHandlers() {
  addEventListener('error', e => DIAG.err((e.message || '') + ' @' + (e.filename || '').split('/').pop() + ':' + (e.lineno || '')));
  addEventListener('unhandledrejection', e => DIAG.err('promise: ' + ((e.reason && e.reason.message) || e.reason)));
}
