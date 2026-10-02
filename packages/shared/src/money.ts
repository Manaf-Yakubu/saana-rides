export const DEFAULT_CURRENCY = 'GHS' as const;
export type Currency = typeof DEFAULT_CURRENCY;

/**
 * Immutable money value stored as integer minor units (pesewas). 1 GHS = 100 pesewas.
 * Uses bigint so values map 1:1 to Postgres BIGINT and never touch floating point.
 */
export class Money {
  private constructor(
    readonly pesewas: bigint,
    readonly currency: Currency = DEFAULT_CURRENCY,
  ) {}

  static zero(): Money {
    return new Money(0n);
  }

  static fromPesewas(value: bigint | number | string): Money {
    if (typeof value === 'number' && !Number.isSafeInteger(value)) {
      throw new RangeError(`Pesewas must be a safe integer, got ${value}`);
    }
    if (typeof value === 'string' && !/^-?\d+$/.test(value)) {
      throw new RangeError(`Invalid pesewas string: ${value}`);
    }
    return new Money(BigInt(value));
  }

  /** Parses a decimal cedi string such as "12.50" or "-3". At most 2 decimal places. */
  static fromCedis(value: string): Money {
    const match = /^(-)?(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
    if (!match) throw new RangeError(`Invalid cedi amount: ${value}`);
    const [, sign, whole, frac = ''] = match;
    const pesewas = BigInt(whole!) * 100n + BigInt(frac.padEnd(2, '0'));
    return new Money(sign ? -pesewas : pesewas);
  }

  add(other: Money): Money {
    return new Money(this.pesewas + other.pesewas);
  }

  subtract(other: Money): Money {
    return new Money(this.pesewas - other.pesewas);
  }

  multiply(factor: bigint | number): Money {
    if (typeof factor === 'number' && !Number.isInteger(factor)) {
      throw new RangeError('Money can only be multiplied by an integer');
    }
    return new Money(this.pesewas * BigInt(factor));
  }

  /** Percentage in basis points (1% = 100 bps), rounded half-up away from zero. */
  percentBps(bps: number): Money {
    if (!Number.isInteger(bps)) throw new RangeError('Basis points must be an integer');
    const raw = this.pesewas * BigInt(bps);
    const abs = raw < 0n ? -raw : raw;
    const rounded = (abs + 5000n) / 10000n;
    return new Money(raw < 0n ? -rounded : rounded);
  }

  min(other: Money): Money {
    return this.pesewas <= other.pesewas ? this : other;
  }

  max(other: Money): Money {
    return this.pesewas >= other.pesewas ? this : other;
  }

  isZero(): boolean {
    return this.pesewas === 0n;
  }

  isNegative(): boolean {
    return this.pesewas < 0n;
  }

  isPositive(): boolean {
    return this.pesewas > 0n;
  }

  equals(other: Money): boolean {
    return this.pesewas === other.pesewas;
  }

  compare(other: Money): -1 | 0 | 1 {
    if (this.pesewas === other.pesewas) return 0;
    return this.pesewas < other.pesewas ? -1 : 1;
  }

  /** Decimal cedi string, e.g. "1234.50". */
  toCedis(): string {
    const negative = this.pesewas < 0n;
    const abs = negative ? -this.pesewas : this.pesewas;
    const str = `${abs / 100n}.${(abs % 100n).toString().padStart(2, '0')}`;
    return negative ? `-${str}` : str;
  }

  /** Display string, e.g. "GHS 1,234.50". */
  format(): string {
    const [whole, frac] = this.toCedis().replace('-', '').split('.');
    const grouped = whole!.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${this.isNegative() ? '-' : ''}${this.currency} ${grouped}.${frac}`;
  }

  toJSON(): string {
    return this.pesewas.toString();
  }

  static sum(values: Money[]): Money {
    return values.reduce((acc, m) => acc.add(m), Money.zero());
  }
}
