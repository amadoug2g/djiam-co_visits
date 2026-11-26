import { describe, expect, it } from 'vitest';
import { area, bbox, fmt, plural, snap } from '../src/ui/format';

describe('formats et calculs', () => {
  it('nombres au format français', () => {
    expect(fmt(19.7)).toBe('19,70');
    expect(fmt(1234.5, 1).replace(/\s/g, ' ')).toBe('1 234,5');
  });
  it('aire d’un rectangle et d’un L', () => {
    expect(area([[0, 0], [4, 0], [4, 3], [0, 3]])).toBeCloseTo(12);
    expect(area([[0, 0], [4, 0], [4, 2], [2, 2], [2, 4], [0, 4]])).toBeCloseTo(12);
  });
  it('rectangle englobant', () => { expect(bbox([[1, 5], [3, 2], [2, 4]])).toEqual([1, 2, 3, 5]); });
  it('mesure aimantée tous les 5 cm', () => { expect(snap([1.234, 2.276])).toEqual([1.25, 2.3]); });
  it('pluriel', () => { expect(plural(1, 'porte')).toBe('1 porte'); expect(plural(2, 'porte')).toBe('2 portes'); });
});
