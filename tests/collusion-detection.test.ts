import { describe, expect, it } from "bun:test";
import type { AuctionBid, AuctionResult } from "../src/auction";
import { calculateCollusionCost, CollusionDetector } from "../src/collusion-detection";

function createResult(taskId: string, bids: AuctionBid[]): AuctionResult {
  const winner = bids.slice().sort((a, b) => b.bidCents - a.bidCents)[0];
  return {
    taskId,
    winnerId: winner?.bidderId ?? null,
    winningBidCents: winner?.bidCents ?? null,
    bids,
    mechanism: "first_price",
    resolvedAt: 1_700_000_000_000,
  };
}

describe("CollusionDetector", () => {
  it("detects repeated bidder-task-issuer pairings above threshold", () => {
    const detector = new CollusionDetector({ repeatedPairingThreshold: 2 });
    const taskId = "issuer-1:task-42";

    const history: AuctionResult[] = [
      createResult(taskId, [
        { bidderId: "worker-a", taskId, bidCents: 900, reputation: 80, skills: [], timestamp: 1000 },
      ]),
      createResult(taskId, [
        { bidderId: "worker-a", taskId, bidCents: 920, reputation: 81, skills: [], timestamp: 2000 },
      ]),
      createResult(taskId, [
        { bidderId: "worker-a", taskId, bidCents: 940, reputation: 82, skills: [], timestamp: 3000 },
      ]),
    ];

    const signals = detector.analyzeAuctionHistory(history);
    const repeated = signals.find((signal) => signal.type === "repeated_pairing");

    expect(repeated).toBeDefined();
    expect(repeated?.participantIds).toEqual(["issuer-1", "worker-a"]);
    expect(repeated ? repeated.confidence > 0 : false).toBeTrue();
  });

  it("detects suspicious bid clustering in narrow price ranges", () => {
    const detector = new CollusionDetector({
      bidClusteringRangeCents: 10,
      minBidsForClustering: 3,
    });

    const taskId = "issuer-2:task-10";
    const history = [
      createResult(taskId, [
        { bidderId: "a", taskId, bidCents: 1000, reputation: 80, skills: [], timestamp: 1000 },
        { bidderId: "b", taskId, bidCents: 1004, reputation: 80, skills: [], timestamp: 2000 },
        { bidderId: "c", taskId, bidCents: 1007, reputation: 80, skills: [], timestamp: 3000 },
      ]),
    ];

    const signals = detector.analyzeAuctionHistory(history);
    const clustering = signals.find((signal) => signal.type === "bid_clustering");
    expect(clustering).toBeDefined();
    expect(clustering?.participantIds).toEqual(["a", "b", "c"]);
  });

  it("detects suspicious timing correlation within a narrow window", () => {
    const detector = new CollusionDetector({
      timingWindowMs: 500,
      minBidsForTimingCorrelation: 3,
    });

    const taskId = "issuer-3:task-11";
    const history = [
      createResult(taskId, [
        { bidderId: "a", taskId, bidCents: 900, reputation: 80, skills: [], timestamp: 1000 },
        { bidderId: "b", taskId, bidCents: 930, reputation: 80, skills: [], timestamp: 1200 },
        { bidderId: "c", taskId, bidCents: 970, reputation: 80, skills: [], timestamp: 1450 },
        { bidderId: "d", taskId, bidCents: 1200, reputation: 80, skills: [], timestamp: 4000 },
      ]),
    ];

    const signals = detector.analyzeAuctionHistory(history);
    const timing = signals.find((signal) => signal.type === "timing_correlation");

    expect(timing).toBeDefined();
    expect(timing?.participantIds).toEqual(["a", "b", "c"]);
  });

  it("returns no signals for clean non-correlated history", () => {
    const detector = new CollusionDetector({
      repeatedPairingThreshold: 3,
      bidClusteringRangeCents: 3,
      timingWindowMs: 100,
      minBidsForClustering: 4,
      minBidsForTimingCorrelation: 4,
    });

    const history: AuctionResult[] = [
      createResult("issuer-1:task-1", [
        { bidderId: "w1", taskId: "issuer-1:task-1", bidCents: 800, reputation: 70, skills: [], timestamp: 1000 },
        { bidderId: "w2", taskId: "issuer-1:task-1", bidCents: 1300, reputation: 70, skills: [], timestamp: 2500 },
      ]),
      createResult("issuer-2:task-2", [
        { bidderId: "w3", taskId: "issuer-2:task-2", bidCents: 700, reputation: 70, skills: [], timestamp: 4000 },
        { bidderId: "w4", taskId: "issuer-2:task-2", bidCents: 1700, reputation: 70, skills: [], timestamp: 9000 },
      ]),
    ];

    const signals = detector.analyzeAuctionHistory(history);
    expect(signals).toHaveLength(0);
  });

  it("calculates collusion control cost and expected penalty", () => {
    const cost = calculateCollusionCost(100, 10);
    expect(cost.controlCostPercent).toBe(1);
    expect(cost.expectedPenalty).toBe(10);
  });

  it("rejects invalid collusion cost inputs", () => {
    expect(() => calculateCollusionCost(0, 1)).toThrow(/positive integer/);
    expect(() => calculateCollusionCost(10, 0)).toThrow(/positive integer/);
    expect(() => calculateCollusionCost(10, 11)).toThrow(/cannot exceed/);
  });
});
