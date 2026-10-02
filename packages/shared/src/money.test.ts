import { describe, expect, it } from 'vitest';
import { Money } from './money';

describe('Money', () => {
  it('parses cedis into pesewas', () => {
    expect(Money.fromCedis('12.5').pesewas).toBe(1250n);
    expect(Money.fromCedis('12.05').pesewas).toBe(1205n);
    expect(Money.fromCedis('7').pesewas).toBe(700n);
    expect(Money.fromCedis('-3.10').pesewas).toBe(-310n);
  });

  it('rejects invalid cedi strings', () => {
    for (const bad of ['1.234', 'abc', '', '1,000', '.5']) {
      expect(() => Money.fromCedis(bad)).toThrow(RangeError);
    }
  });

  it('builds from pesewas and validates input', () => {
    expect(Money.fromPesewas(100).pesewas).toBe(100n);
    expect(Money.fromPesewas('250').pesewas).toBe(250n);
    expect(Money.fromPesewas(9n).pesewas).toBe(9n);
    expect(() => Money.fromPesewas(1.5)).toThrow(RangeError);
    expect(() => Money.fromPesewas('1.5')).toThrow(RangeError);
  });

  it('does exact arithmetic', () => {
    const a = Money.fromCedis('0.10');
    const b = Money.fromCedis('0.20');
    expect(a.add(b).toCedis()).toBe('0.30');
    expect(b.subtract(a).toCedis()).toBe('0.10');
    expect(a.multiply(3).toCedis()).toBe('0.30');
    expect(a.multiply(3n).toCedis()).toBe('0.30');
    expect(() => a.multiply(1.5)).toThrow(RangeError);
    expect(Money.sum([a, b, a]).toCedis()).toBe('0.40');
  });

  it('computes percentages in basis points with half-up rounding', () => {
    expect(Money.fromPesewas(1000).percentBps(1500).pesewas).toBe(150n);
    expect(Money.fromPesewas(333).percentBps(1500).pesewas).toBe(50n); // 49.95 -> 50
    expect(Money.fromPesewas(-333).percentBps(1500).pesewas).toBe(-50n);
    expect(() => Money.fromPesewas(1).percentBps(1.5)).toThrow(RangeError);
  });

  it('compares values', () => {
    const one = Money.fromPesewas(1);
    const two = Money.fromPesewas(2);
    expect(one.compare(two)).toBe(-1);
    expect(two.compare(one)).toBe(1);
    expect(one.compare(Money.fromPesewas(1))).toBe(0);
    expect(one.min(two)).toBe(one);
    expect(two.min(one)).toBe(one);
    expect(one.max(two)).toBe(two);
    expect(two.max(one)).toBe(two);
    expect(one.equals(Money.fromPesewas(1))).toBe(true);
    expect(Money.zero().isZero()).toBe(true);
    expect(one.isPositive()).toBe(true);
    expect(Money.fromPesewas(-1).isNegative()).toBe(true);
  });

  it('formats for display and JSON', () => {
    expect(Money.fromPesewas(123456789).format()).toBe('GHS 1,234,567.89');
    expect(Money.fromPesewas(-5).format()).toBe('-GHS 0.05');
    expect(Money.fromPesewas(-5).toCedis()).toBe('-0.05');
    expect(JSON.stringify({ m: Money.fromPesewas(42) })).toBe('{"m":"42"}');
  });
});
