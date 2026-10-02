import { describe, expect, it } from 'vitest';
import {
  ALL_STATE_MACHINES,
  IllegalTransitionError,
  type StateMachine,
  contractStateMachine,
  defineStateMachine,
  paymentStateMachine,
  transferStateMachine,
  vehicleStateMachine,
} from './index';

const machines = ALL_STATE_MACHINES as readonly StateMachine<string>[];

describe.each(machines.map((m) => [m.name, m] as const))('%s state machine', (_, m) => {
  it('defines transitions for every state', () => {
    expect(Object.keys(m.transitions).sort()).toEqual([...m.states].sort());
  });

  const pairs = m.states.flatMap((from) => m.states.map((to) => [from, to] as const));

  it.each(pairs)('%s -> %s matches the transition table', (from, to) => {
    const allowed = m.transitions[from]!.includes(to);
    expect(m.canTransition(from, to)).toBe(allowed);
    if (allowed) {
      expect(m.assertTransition(from, to)).toBe(to);
    } else {
      expect(() => m.assertTransition(from, to)).toThrow(IllegalTransitionError);
    }
  });
});

describe('business-critical transitions', () => {
  it('only lets a contract reach OWNERSHIP_TRANSFERRED via TRANSFER_PENDING', () => {
    const into = contractStateMachine.states.filter((s) =>
      contractStateMachine.canTransition(s, 'OWNERSHIP_TRANSFERRED'),
    );
    expect(into).toEqual(['TRANSFER_PENDING']);
  });

  it('never lets a payment leave a final state or be un-reversed', () => {
    expect(paymentStateMachine.isTerminal('FAILED')).toBe(true);
    expect(paymentStateMachine.isTerminal('REVERSED')).toBe(true);
    expect(paymentStateMachine.canTransition('REVERSED', 'SUCCESSFUL')).toBe(false);
  });

  it('makes completed transfers and transferred vehicles terminal', () => {
    expect(transferStateMachine.isTerminal('COMPLETED')).toBe(true);
    expect(vehicleStateMachine.isTerminal('OWNERSHIP_TRANSFERRED')).toBe(true);
  });

  it('reports the machine and states on illegal transitions', () => {
    try {
      contractStateMachine.assertTransition('CANCELLED', 'ACTIVE');
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(IllegalTransitionError);
      const err = e as IllegalTransitionError;
      expect([err.machine, err.from, err.to]).toEqual(['contract', 'CANCELLED', 'ACTIVE']);
      expect(err.message).toBe('contract: illegal transition CANCELLED -> ACTIVE');
    }
  });
});

describe('defineStateMachine validation', () => {
  type S = 'A' | 'B';
  it('rejects unknown source states', () => {
    expect(() =>
      defineStateMachine<S>('x', ['A'] as S[], { A: [], B: [] } as Record<S, S[]>),
    ).toThrow(/unknown state B/);
  });
  it('rejects unknown targets', () => {
    expect(() =>
      defineStateMachine<S>('x', ['A'] as S[], { A: ['B'] } as unknown as Record<S, S[]>),
    ).toThrow(/unknown target B/);
  });
  it('rejects self transitions', () => {
    expect(() => defineStateMachine<S>('x', ['A', 'B'], { A: ['A'], B: [] })).toThrow(
      /self-transition/,
    );
  });
});
