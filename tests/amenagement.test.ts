/* Aménagement : catalogue cohérent, emprises justes, aménagement proposé réaliste. */
import { describe, expect, it } from 'vitest';
import { GABARITS } from '../src/data';
import { CATALOGUE, CATEGORIES, chevauche, colorisDe, emprise, item, pieceEn, propose, toucheUnMur, versPlan } from '../src/amenagement/model';

const G = GABARITS.m3;

describe('catalogue', () => {
  it('identifiants uniques, catégorie connue, dimensions et coloris valides', () => {
    const ids = CATALOGUE.map(i => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const i of CATALOGUE) {
      expect(CATEGORIES.some(c => c.id === i.cat), i.id).toBe(true);
      expect(i.l > 0 && i.p > 0 && i.h > 0, i.id).toBe(true);
      expect(colorisDe(i).length, i.id).toBeGreaterThan(0);
      for (const c of colorisDe(i)) expect(c.hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe('emprise au sol', () => {
  it('rot 0 : l’avant regarde +z ; rot 90 : l’avant regarde +x', () => {
    const [x0, z0] = versPlan({ x: 0, z: 0, rot: 0 }, 0, 1), [x9, z9] = versPlan({ x: 0, z: 0, rot: 90 }, 0, 1);
    expect(x0).toBeCloseTo(0); expect(z0).toBeCloseTo(1); expect(x9).toBeCloseTo(1); expect(z9).toBeCloseTo(0);
  });
  it('un lit tourné de 90° occupe sa longueur selon x', () => {
    const E = emprise({ x: 10, z: 10, rot: 90, l: 1.6, p: 2 }), xs = E.map(p => p[0]), zs = E.map(p => p[1]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(2); expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(1.6);
  });
  it('chevauchement : séparés, collés, croisés', () => {
    const sq = (x: number, z: number): [number, number][] => [[x, z], [x + 1, z], [x + 1, z + 1], [x, z + 1]];
    expect(chevauche(sq(0, 0), sq(2, 0))).toBe(false);
    expect(chevauche(sq(0, 0), sq(1, 0))).toBe(false);
    expect(chevauche(sq(0, 0), sq(.5, .5))).toBe(true);
    expect(chevauche(emprise({ x: 0, z: 0, rot: 45, l: 1, p: 1 }), sq(.6, -.5))).toBe(true);
  });
});

describe('aménagement proposé (M3)', () => {
  const M = propose(G);
  it('ne contient que des meubles du catalogue', () => { expect(M.length).toBeGreaterThan(15); expect(M.every(m => item(m.ref))).toBe(true); });
  it('aucun meuble ne touche un mur', () => { expect(M.filter(m => toucheUnMur(G, m)).map(m => `${m.ref} ${m.x},${m.z}`)).toEqual([]); });
  it('chaque meuble est posé dans une pièce intérieure', () => {
    expect(M.filter(m => pieceEn(G, m.x, m.z)?.grp !== 'int').map(m => `${m.ref} ${m.x},${m.z}`)).toEqual([]);
  });
  it('les meubles ne se chevauchent pas (hors tapis)', () => {
    const S = M.filter(m => item(m.ref)!.modele !== 'tapis'), bad: string[] = [];
    for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) if (chevauche(emprise(S[i]), emprise(S[j]))) bad.push(`${S[i].ref} / ${S[j].ref}`);
    expect(bad).toEqual([]);
  });
  it('les coloris existent pour chaque meuble', () => {
    expect(M.filter(m => !colorisDe(item(m.ref)!).some(c => c.id === m.coloris)).map(m => m.ref)).toEqual([]);
  });
});
