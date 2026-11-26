/* Vérifie que le calcul porté donne exactement le même fichier que bake.js du prototype,
   sur la géométrie du prototype corrigé. Usage : node --import tsx scripts/bake-ref-check.ts <dossier> <rayons>
   où <dossier> contient bake.js, geo.js, model.js du prototype et le baked.bin qu'il a produit. */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import type { SceneGeo } from '../src/geo/build';
import { bakeScene } from './bake-core';

const dir = process.argv[2], rays = +(process.argv[3] || 4);
const require = createRequire(import.meta.url);
const M = require(join(dir, 'model.js'));
const { buildScene } = require(join(dir, 'geo.js')) as { buildScene: (m: unknown) => SceneGeo };
const { bin } = await bakeScene(buildScene(M), rays, new URL('./bake-worker.ts', import.meta.url), () => {});
const ref = readFileSync(join(dir, 'baked.bin'));
let diff = 0; for (let i = 0; i < bin.length; i++) if (bin[i] !== ref[i]) diff++;
console.log(`tailles ${bin.length} / ${ref.length}, octets différents : ${diff}`);
process.exit(bin.length === ref.length && diff === 0 ? 0 : 1);
