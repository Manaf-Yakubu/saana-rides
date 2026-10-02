export class IllegalTransitionError extends Error {
  constructor(
    readonly machine: string,
    readonly from: string,
    readonly to: string,
  ) {
    super(`${machine}: illegal transition ${from} -> ${to}`);
    this.name = 'IllegalTransitionError';
  }
}

export type TransitionTable<S extends string> = Readonly<Record<S, readonly S[]>>;

export interface StateMachine<S extends string> {
  readonly name: string;
  readonly states: readonly S[];
  readonly transitions: TransitionTable<S>;
  canTransition(from: S, to: S): boolean;
  /** Throws IllegalTransitionError unless from -> to is in the table. Returns `to`. */
  assertTransition(from: S, to: S): S;
  isTerminal(state: S): boolean;
}

export function defineStateMachine<S extends string>(
  name: string,
  states: readonly S[],
  transitions: TransitionTable<S>,
): StateMachine<S> {
  for (const [from, targets] of Object.entries(transitions) as [S, readonly S[]][]) {
    if (!states.includes(from)) throw new Error(`${name}: unknown state ${from}`);
    for (const to of targets) {
      if (!states.includes(to)) throw new Error(`${name}: unknown target ${to} from ${from}`);
      if (to === from) throw new Error(`${name}: self-transition ${from} is not allowed`);
    }
  }
  const canTransition = (from: S, to: S) => transitions[from].includes(to);
  return {
    name,
    states,
    transitions,
    canTransition,
    assertTransition(from, to) {
      if (!canTransition(from, to)) throw new IllegalTransitionError(name, from, to);
      return to;
    },
    isTerminal: (state) => transitions[state].length === 0,
  };
}
