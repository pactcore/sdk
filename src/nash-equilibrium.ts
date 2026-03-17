/**
 * Nash equilibrium calculation per PACT Whitepaper §8.2.
 */

export interface NashEquilibriumState {
  players: string[];
  strategyProfile: Record<string, string>;
  payoffByPlayer: Record<string, number>;
  totalPayoff: number;
  profitableDeviations: string[];
  stable: boolean;
}

/** Keys are serialized strategy profiles ordered by the `players` argument ("honest|dishonest"). */
export type PayoffMatrix = Record<string, number[]>;

const PAYOFF_EPSILON = 1e-9;

export function calculateNashEquilibrium(
  players: string[],
  strategies: string[],
  payoffs: PayoffMatrix,
): NashEquilibriumState | null {
  assertPlayers(players);
  assertStrategies(strategies);

  const profiles = generateProfiles(players.length, strategies);
  let bestState: NashEquilibriumState | null = null;
  let bestProfileKey: string | null = null;

  for (const profile of profiles) {
    const state = evaluateProfile(players, strategies, profile, payoffs);
    if (!state.stable) {
      continue;
    }
    const profileKey = profile.join("|");
    if (
      bestState === null ||
      state.totalPayoff > bestState.totalPayoff ||
      (state.totalPayoff === bestState.totalPayoff &&
        (bestProfileKey === null || profileKey < bestProfileKey))
    ) {
      bestState = state;
      bestProfileKey = profileKey;
    }
  }

  return bestState;
}

export function isStableEquilibrium(state: NashEquilibriumState): boolean {
  return state.stable && state.profitableDeviations.length === 0;
}

function evaluateProfile(
  players: string[],
  strategies: string[],
  profile: string[],
  payoffs: PayoffMatrix,
): NashEquilibriumState {
  const profileKey = profile.join("|");
  const currentPayoffs = getPayoffVector(payoffs, profileKey, players.length);
  const strategyProfile: Record<string, string> = {};
  const payoffByPlayer: Record<string, number> = {};
  const profitableDeviations: string[] = [];
  let totalPayoff = 0;

  for (let i = 0; i < players.length; i++) {
    const player = players[i]!;
    const currentStrategy = profile[i]!;
    const currentPayoff = currentPayoffs[i]!;

    strategyProfile[player] = currentStrategy;
    payoffByPlayer[player] = currentPayoff;
    totalPayoff += currentPayoff;

    for (const candidateStrategy of strategies) {
      if (candidateStrategy === currentStrategy) continue;

      const deviatedProfile = profile.slice();
      deviatedProfile[i] = candidateStrategy;
      const deviatedKey = deviatedProfile.join("|");
      const deviatedPayoff = getPayoffVector(payoffs, deviatedKey, players.length)[i]!;

      if (deviatedPayoff > currentPayoff + PAYOFF_EPSILON) {
        profitableDeviations.push(`${player}:${currentStrategy}->${candidateStrategy}`);
      }
    }
  }

  return {
    players: [...players],
    strategyProfile,
    payoffByPlayer,
    totalPayoff,
    profitableDeviations,
    stable: profitableDeviations.length === 0,
  };
}

function generateProfiles(playerCount: number, strategies: string[]): string[][] {
  const profiles: string[][] = [];
  const current: string[] = [];
  const walk = (depth: number): void => {
    if (depth === playerCount) {
      profiles.push([...current]);
      return;
    }
    for (const strategy of strategies) {
      current.push(strategy);
      walk(depth + 1);
      current.pop();
    }
  };
  walk(0);
  return profiles;
}

function getPayoffVector(payoffs: PayoffMatrix, key: string, expected: number): number[] {
  const vec = payoffs[key];
  if (!vec) throw new Error(`missing payoff vector for "${key}"`);
  if (vec.length !== expected)
    throw new Error(`payoff vector for "${key}" must have length ${expected}, got ${vec.length}`);
  for (let i = 0; i < vec.length; i++) {
    if (!Number.isFinite(vec[i])) throw new Error(`payoff for "${key}" at index ${i} must be finite`);
  }
  return vec;
}

function assertPlayers(players: string[]): void {
  if (players.length === 0) throw new Error("players must include at least one player");
  if (new Set(players).size !== players.length) throw new Error("players must be unique");
  for (const p of players) if (p.trim().length === 0) throw new Error("player identifiers must be non-empty");
}

function assertStrategies(strategies: string[]): void {
  if (strategies.length === 0) throw new Error("strategies must include at least one strategy");
  if (new Set(strategies).size !== strategies.length) throw new Error("strategies must be unique");
  for (const s of strategies) if (s.trim().length === 0) throw new Error("strategy names must be non-empty");
}
