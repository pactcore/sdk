import { describe, expect, test } from "bun:test";
import {
  calculateNashEquilibrium,
  isStableEquilibrium,
  type NashEquilibriumState,
  type PayoffMatrix,
} from "../src/nash-equilibrium";

describe("calculateNashEquilibrium", () => {
  test("prisoner's dilemma → both defect is Nash equilibrium", () => {
    // Classic prisoner's dilemma:
    //              Cooperate  Defect
    // Cooperate    (3, 3)     (0, 5)
    // Defect       (5, 0)     (1, 1)
    const payoffs: PayoffMatrix = {
      "cooperate|cooperate": [3, 3],
      "cooperate|defect": [0, 5],
      "defect|cooperate": [5, 0],
      "defect|defect": [1, 1],
    };
    const result = calculateNashEquilibrium(
      ["player1", "player2"],
      ["cooperate", "defect"],
      payoffs,
    );
    expect(result).not.toBeNull();
    expect(result!.stable).toBe(true);
    expect(result!.strategyProfile.player1).toBe("defect");
    expect(result!.strategyProfile.player2).toBe("defect");
    expect(result!.profitableDeviations).toHaveLength(0);
  });

  test("coordination game → picks equilibrium with highest total payoff", () => {
    // Both-A = (2,2), Both-B = (1,1), mixed = (0,0)
    const payoffs: PayoffMatrix = {
      "A|A": [2, 2],
      "A|B": [0, 0],
      "B|A": [0, 0],
      "B|B": [1, 1],
    };
    const result = calculateNashEquilibrium(["p1", "p2"], ["A", "B"], payoffs);
    expect(result).not.toBeNull();
    expect(result!.stable).toBe(true);
    // (A,A) has higher total payoff
    expect(result!.strategyProfile.p1).toBe("A");
    expect(result!.strategyProfile.p2).toBe("A");
    expect(result!.totalPayoff).toBe(4);
  });

  test("no pure Nash equilibrium → returns null", () => {
    // Matching pennies — no pure NE
    const payoffs: PayoffMatrix = {
      "heads|heads": [1, -1],
      "heads|tails": [-1, 1],
      "tails|heads": [-1, 1],
      "tails|tails": [1, -1],
    };
    const result = calculateNashEquilibrium(["p1", "p2"], ["heads", "tails"], payoffs);
    expect(result).toBeNull();
  });

  test("single player, single strategy → trivially stable", () => {
    const payoffs: PayoffMatrix = {
      honest: [10],
    };
    const result = calculateNashEquilibrium(["solo"], ["honest"], payoffs);
    expect(result).not.toBeNull();
    expect(result!.stable).toBe(true);
    expect(result!.players).toEqual(["solo"]);
    expect(result!.totalPayoff).toBe(10);
  });

  test("single player, two strategies → picks dominant", () => {
    const payoffs: PayoffMatrix = {
      honest: [10],
      cheat: [8],
    };
    const result = calculateNashEquilibrium(["solo"], ["honest", "cheat"], payoffs);
    expect(result).not.toBeNull();
    expect(result!.strategyProfile.solo).toBe("honest");
    expect(result!.totalPayoff).toBe(10);
  });

  test("throws on empty players", () => {
    expect(() => calculateNashEquilibrium([], ["A"], { A: [] })).toThrow(/at least one player/);
  });

  test("throws on duplicate players", () => {
    expect(() =>
      calculateNashEquilibrium(["p1", "p1"], ["A"], { "A|A": [1, 1] }),
    ).toThrow(/unique/);
  });

  test("throws on empty strategies", () => {
    expect(() => calculateNashEquilibrium(["p1"], [], {})).toThrow(/at least one strategy/);
  });

  test("throws on duplicate strategies", () => {
    expect(() => calculateNashEquilibrium(["p1"], ["A", "A"], { A: [1] })).toThrow(/unique/);
  });

  test("throws on missing payoff vector", () => {
    expect(() => calculateNashEquilibrium(["p1"], ["A"], {})).toThrow(/missing payoff/);
  });

  test("throws on wrong-length payoff vector", () => {
    expect(() =>
      calculateNashEquilibrium(["p1", "p2"], ["A"], { "A|A": [1] }),
    ).toThrow(/must have length/);
  });

  test("throws on non-finite payoff", () => {
    expect(() => calculateNashEquilibrium(["p1"], ["A"], { A: [NaN] })).toThrow(/finite/);
  });

  test("throws on empty player name", () => {
    expect(() => calculateNashEquilibrium(["  "], ["A"], { A: [1] })).toThrow(/non-empty/);
  });

  test("throws on empty strategy name", () => {
    expect(() => calculateNashEquilibrium(["p1"], [" "], { " ": [1] })).toThrow(/non-empty/);
  });
});

describe("isStableEquilibrium", () => {
  test("stable state returns true", () => {
    const state: NashEquilibriumState = {
      players: ["p1"],
      strategyProfile: { p1: "A" },
      payoffByPlayer: { p1: 10 },
      totalPayoff: 10,
      profitableDeviations: [],
      stable: true,
    };
    expect(isStableEquilibrium(state)).toBe(true);
  });

  test("unstable state returns false", () => {
    const state: NashEquilibriumState = {
      players: ["p1"],
      strategyProfile: { p1: "A" },
      payoffByPlayer: { p1: 5 },
      totalPayoff: 5,
      profitableDeviations: ["p1:A->B"],
      stable: false,
    };
    expect(isStableEquilibrium(state)).toBe(false);
  });
});
