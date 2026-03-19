import { describe, it, expect } from 'vitest';
import { parseVP, parseMaxVP } from './vpParser';

describe('parseVP', () => {
  it('parses simple VP strings', () => {
    expect(parseVP('3VP')).toBe(3);
    expect(parseVP('4VP')).toBe(4);
    expect(parseVP('5VP')).toBe(5);
  });

  it('parses VP with plus prefix', () => {
    expect(parseVP('+2VP')).toBe(2);
  });

  it('parses VP with extra text', () => {
    expect(parseVP('5VP per objective (up to 15VP)')).toBe(5);
  });

  it('returns 0 for unparseable strings', () => {
    expect(parseVP('none')).toBe(0);
    expect(parseVP('')).toBe(0);
  });

  it('handles whitespace between number and VP', () => {
    expect(parseVP('3 VP')).toBe(3);
  });
});

describe('parseMaxVP', () => {
  it('parses max VP strings', () => {
    expect(parseMaxVP('5VP')).toBe(5);
    expect(parseMaxVP('15VP')).toBe(15);
  });

  it('returns null for undefined', () => {
    expect(parseMaxVP(undefined)).toBeNull();
  });

  it('returns null for unparseable strings', () => {
    expect(parseMaxVP('none')).toBeNull();
  });
});
