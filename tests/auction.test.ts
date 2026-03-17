import { describe, expect, test } from "bun:test";
import { VickreyAuction, FirstPriceAuction, type AuctionBid, type AuctionConfig } from "../src/auction";

function makeBid(overrides: Partial<AuctionBid> = {}): AuctionBid {
  return {
    bidderId: "bidder-1",
    taskId: "task-1",
    bidCents: 1000,
    reputation: 80,
    skills: ["coding"],
    timestamp: 1000,
    ...overrides,
  };
}

describe("VickreyAuction", () => {
  test("no bids → null winner", () => {
    const auction = new VickreyAuction({ taskId: "task-1" });
    const result = auction.resolve();
    expect(result.winnerId).toBeNull();
    expect(result.winningBidCents).toBeNull();
    expect(result.mechanism).toBe("vickrey");
  });

  test("single bid → winner pays own bid (no second price)", () => {
    const auction = new VickreyAuction({ taskId: "task-1" });
    auction.submitBid(makeBid({ bidCents: 500 }));
    const result = auction.resolve();
    expect(result.winnerId).toBe("bidder-1");
    expect(result.winningBidCents).toBe(500);
  });

  test("two bids → winner pays second-highest price", () => {
    const auction = new VickreyAuction({ taskId: "task-1" });
    auction.submitBid(makeBid({ bidderId: "alice", bidCents: 1000 }));
    auction.submitBid(makeBid({ bidderId: "bob", bidCents: 700, timestamp: 2000 }));
    const result = auction.resolve();
    expect(result.winnerId).toBe("alice");
    expect(result.winningBidCents).toBe(700);
  });

  test("three bids → winner pays second-highest", () => {
    const auction = new VickreyAuction({ taskId: "task-1" });
    auction.submitBid(makeBid({ bidderId: "alice", bidCents: 1000 }));
    auction.submitBid(makeBid({ bidderId: "bob", bidCents: 800, timestamp: 2000 }));
    auction.submitBid(makeBid({ bidderId: "charlie", bidCents: 600, timestamp: 3000 }));
    const result = auction.resolve();
    expect(result.winnerId).toBe("alice");
    expect(result.winningBidCents).toBe(800);
  });

  test("minimum reputation filters low-rep bidders", () => {
    const auction = new VickreyAuction({ taskId: "task-1", minimumReputation: 50 });
    auction.submitBid(makeBid({ bidderId: "low-rep", bidCents: 9999, reputation: 30 }));
    auction.submitBid(makeBid({ bidderId: "high-rep", bidCents: 500, reputation: 80, timestamp: 2000 }));
    const result = auction.resolve();
    expect(result.winnerId).toBe("high-rep");
    expect(result.winningBidCents).toBe(500);
  });

  test("all bids below minimum reputation → no winner", () => {
    const auction = new VickreyAuction({ taskId: "task-1", minimumReputation: 90 });
    auction.submitBid(makeBid({ reputation: 50 }));
    auction.submitBid(makeBid({ bidderId: "b2", reputation: 60, timestamp: 2000 }));
    const result = auction.resolve();
    expect(result.winnerId).toBeNull();
  });

  test("tie-breaking by reputation then timestamp then bidderId", () => {
    const auction = new VickreyAuction({ taskId: "task-1" });
    auction.submitBid(makeBid({ bidderId: "alice", bidCents: 1000, reputation: 70, timestamp: 1000 }));
    auction.submitBid(makeBid({ bidderId: "bob", bidCents: 1000, reputation: 80, timestamp: 2000 }));
    const result = auction.resolve();
    // Higher reputation wins (bob has 80 > alice 70)
    expect(result.winnerId).toBe("bob");
  });

  test("throws on mismatched taskId", () => {
    const auction = new VickreyAuction({ taskId: "task-1" });
    expect(() => auction.submitBid(makeBid({ taskId: "task-999" }))).toThrow(/does not match/);
  });

  test("throws on non-positive bidCents", () => {
    const auction = new VickreyAuction({ taskId: "task-1" });
    expect(() => auction.submitBid(makeBid({ bidCents: 0 }))).toThrow(/positive integer/);
    expect(() => auction.submitBid(makeBid({ bidCents: -100 }))).toThrow(/positive integer/);
  });

  test("throws on non-integer bidCents", () => {
    const auction = new VickreyAuction({ taskId: "task-1" });
    expect(() => auction.submitBid(makeBid({ bidCents: 10.5 }))).toThrow(/positive integer/);
  });

  test("throws on invalid timestamp", () => {
    const auction = new VickreyAuction({ taskId: "task-1" });
    expect(() => auction.submitBid(makeBid({ timestamp: 0 }))).toThrow(/positive number/);
    expect(() => auction.submitBid(makeBid({ timestamp: -1 }))).toThrow(/positive number/);
  });

  test("throws on negative reputation", () => {
    const auction = new VickreyAuction({ taskId: "task-1" });
    expect(() => auction.submitBid(makeBid({ reputation: -5 }))).toThrow(/non-negative/);
  });

  test("throws on negative minimumReputation", () => {
    expect(() => new VickreyAuction({ taskId: "task-1", minimumReputation: -1 })).toThrow(
      /non-negative/,
    );
  });
});

describe("FirstPriceAuction", () => {
  test("no bids → null winner", () => {
    const auction = new FirstPriceAuction({ taskId: "task-1" });
    const result = auction.resolve();
    expect(result.winnerId).toBeNull();
    expect(result.mechanism).toBe("first_price");
  });

  test("single bid → winner pays own bid", () => {
    const auction = new FirstPriceAuction({ taskId: "task-1" });
    auction.submitBid(makeBid({ bidCents: 500 }));
    const result = auction.resolve();
    expect(result.winnerId).toBe("bidder-1");
    expect(result.winningBidCents).toBe(500);
  });

  test("highest bidder wins and pays own price", () => {
    const auction = new FirstPriceAuction({ taskId: "task-1" });
    auction.submitBid(makeBid({ bidderId: "alice", bidCents: 1000 }));
    auction.submitBid(makeBid({ bidderId: "bob", bidCents: 700, timestamp: 2000 }));
    const result = auction.resolve();
    expect(result.winnerId).toBe("alice");
    expect(result.winningBidCents).toBe(1000);
  });
});
