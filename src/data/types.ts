/* Gabarit de villa : tout ce qui sert à générer le plan 2D et la 3D.
   Coordonnées en mètres, repère du PDF (X = x du plan, Z = y du plan, Y = hauteur).
   src : 'plan' = relevé sur le PDF, 'est' = estimé (à valider). */

export type Src = 'plan' | 'est';
/** Rectangle [x0, z0, x1, z1] */
export type Rect = [number, number, number, number];
export type Pt = [number, number];

export interface Label { x: number; z: number; w: number; h: number }

export type ZoneType = 'deck' | 'lawn' | 'paving' | 'parking' | 'pool' | 'covered';
export interface Zone { id: string; type: ZoneType; r: Rect; name?: string; src: Src; label?: Label; note?: string }

export interface Room {
  id: string; name: string; grp: 'int' | 'ann'; poly: Pt[];
  planArea: number | null; note?: string; covered?: boolean;
  /** position de l'étiquette sur le plan 2D, si le centre du rectangle englobant ne convient pas */
  label?: Label;
  /** couleur de sol particulière */
  floor?: string;
}

export interface Wall { r: Rect; /** hauteur, 3D : défaut = heights.rdc */ h?: number }

export interface Window {
  id: string; r: Rect; room: string; src: Src; label?: string; glass?: boolean;
  /** allège et linteau (m), estimés */
  sill: number; head: number;
}
/** Fente verticale de façade (ouverture étroite dans un mur) */
export interface Slit { id: string; ax: 'h' | 'v'; c: number; a: number; b: number; sill: number; head: number; src: Src }

/** Porte : axe h/v, c = coordonnée du mur, a-b = ouverture, gond a/b, side = sens d'ouverture */
export interface Door {
  id: string; ax: 'h' | 'v'; c: number; a: number; b: number;
  hinge?: 'a' | 'b'; side?: number; double?: boolean; passage?: boolean;
  src: Src; room: string; label?: string; head: number; leaf?: 'dark';
}

/** Escalier en U : marches de « from » (côté hall) à « to », palier au-delà de « to ».
    first = moitié de la première volée (east = côté x croissant), src = source de ce sens de montée */
export interface Stairs { r: Rect; mid: number; from: number; to: number; step: number; first: 'east' | 'west'; src: Src }
export interface Steps { r: Rect; ax: 'h' | 'v'; at: number[] }
export interface Gate { a: number; b: number; label: string; src: Src; z: [number, number]; bars?: boolean }
export interface Dim { p: Pt; q: Pt; t: string }
export interface Car { x: number; z0: number; L: number; W: number; H: number; label: string; src: Src }

/** Noms des motifs de matériau du moteur */
export type MatName =
  | 'uni' | 'lames' | 'gazon' | 'eau' | 'mosaique' | 'carrelage' | 'bois' | 'paves'
  | 'lumineux' | 'verre' | 'pierre' | 'ecorce' | 'enduit' | 'feuillage';
/** Couleur : nom de la palette du moteur ou valeur hexadécimale */
export type Couleur = string;
export type Calque = 'base' | 'roof' | 'glassR';

/** Objets placés en coordonnées absolues (mobilier, annexes, végétation, étage indicatif, éclairages) */
export type Objet =
  | { type: 'boite'; calque: Calque; r: [number, number, number, number, number, number]; couleur: Couleur; mat: MatName; collision?: boolean }
  | { type: 'plan-travail'; r: Rect; src: Src }
  | { type: 'transat'; x: number; z: number; rot: number; src: Src }
  | { type: 'canape'; x: number; z: number; l: number; p: number; rot: number; src: Src }
  | { type: 'jardiniere'; r: Rect; couleur: Couleur; src: Src }
  | { type: 'palmier'; x: number; z: number; h: number; inclinaison: [number, number]; src: Src }
  | { type: 'acacia'; x: number; z: number; echelle: number; src: Src }
  | { type: 'pot'; x: number; z: number; fleurs: boolean; src: Src }
  | { type: 'barbecue'; x: number; z: number; src: Src }
  | { type: 'douche'; x: number; z: number; src: Src }
  | { type: 'claustra'; calque: Calque; x0: number; x1: number; z0: number; z1: number; y0: number; y1: number; pas: number; lame: number; src: Src }
  | { type: 'spot'; calque: Calque; x: number; y: number; z: number; I: number; eclaire: 'roof' | 'both' };

export interface Check { id: string; t: string; d: string; focus: string | null; focusRect?: Rect }

export interface Gabarit {
  id: string; name: string; level: string; subtitle: string; repere: string;
  heights: { rdc: number; floor: number; src: Src };
  site: { x: number; y: number; w: number; h: number; planW: number; planH: number };
  zones: Zone[]; rooms: Room[]; fence: Rect[]; walls: Wall[]; windows: Window[]; slits: Slit[];
  doors: Door[]; stairs: Stairs; steps: Steps[]; gates: Gate[]; dims: Dim[]; cars: Car[];
  objects: Objet[]; checks: Check[];
}
