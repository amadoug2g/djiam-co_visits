import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/instrument-serif/latin-400.css';
import './ui/styles.css';
import { GABARITS } from './data';
import { DIAG, installGlobalHandlers } from './diag';
import { App } from './ui/App';

installGlobalHandlers();
/* application installable et utilisable hors ligne (seulement sur le site publié) */
if (import.meta.env.PROD && 'serviceWorker' in navigator)
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(e => DIAG.err('hors ligne : ' + e.message)));
createRoot(document.getElementById('root')!).render(<StrictMode><App G={GABARITS.m3} /></StrictMode>);
