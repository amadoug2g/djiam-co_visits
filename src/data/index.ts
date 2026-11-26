import type { Gabarit } from './types';
import m3 from './gabarits/m3.json';

/** Gabarits disponibles. Un fichier JSON par gabarit, issu du plan PDF. */
export const GABARITS: Record<string, Gabarit> = { m3: m3 as Gabarit };
export type { Gabarit } from './types';
