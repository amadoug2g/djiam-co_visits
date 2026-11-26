/* Recalcule la lumière d'un gabarit : npm run bake -- [gabarit] [rayons]
   Écrit public/bake/<gabarit>.bin et <gabarit>.json. À relancer après toute modification de géométrie. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { GABARITS } from '../src/data';
import { buildScene } from '../src/geo/build';
import { bakeScene } from './bake-core';

const id = process.argv[2] || 'm3', rays = +(process.argv[3] || 100);
const G = GABARITS[id];
if (!G) { console.error('gabarit inconnu : ' + id); process.exit(1); }
const t0 = Date.now();
const { bin, meta } = await bakeScene(buildScene(G), rays, new URL('./bake-worker.ts', import.meta.url));
const dir = new URL('../public/bake/', import.meta.url);
mkdirSync(dir, { recursive: true });
writeFileSync(new URL(id + '.bin', dir), bin);
writeFileSync(new URL(id + '.json', dir), JSON.stringify(meta) + '\n');
console.log(`${id} : ${bin.length} octets, ${rays} rayons, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
