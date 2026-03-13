import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

interface RouteFamilyCoverage {
  family: string;
  coreRoutes: number;
  sdkStatus: string;
}

interface RouteParityReport {
  summary: {
    publicAsyncMethods: number;
    directHttpMethods: number;
    implementedCoreRoutes: number;
    missingCoreRoutes: number;
    compositeHelpers: string[];
    sdkOnlyDirectMethods: string[];
    authoredTestFiles: number;
    testedPublicMethods: number;
    untestedPublicMethods: number;
    testedDirectHttpMethods: number;
    untestedDirectHttpMethods: number;
  };
  routeFamilies: RouteFamilyCoverage[];
  publicMethodTestCoverage: {
    authoredTestFiles: string[];
    testedMethods: string[];
    untestedMethods: string[];
  };
  directMethodTestCoverage: {
    authoredTestFiles: string[];
    testedMethods: string[];
    untestedMethods: string[];
  };
  whitepaperSections: string[];
}

const repoRoot = join(import.meta.dir, "..");

function runAudit(args: string[] = []): string {
  const result = Bun.spawnSync({
    cmd: ["node", "scripts/route-parity-audit.mjs", ...args],
    cwd: repoRoot,
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = Buffer.from(result.stdout).toString("utf8");
  const stderr = Buffer.from(result.stderr).toString("utf8");

  expect(result.exitCode).toBe(0);
  expect(stderr).toBe("");

  return stdout;
}

function loadAuditReport(): RouteParityReport {
  return JSON.parse(runAudit(["--json"])) as RouteParityReport;
}

describe("route parity audit script", () => {
  it("computes the audited SDK/core parity summary", () => {
    const report = loadAuditReport();

    expect(report.summary.publicAsyncMethods).toBe(172);
    expect(report.summary.directHttpMethods).toBe(171);
    expect(report.summary.implementedCoreRoutes).toBe(167);
    expect(report.summary.missingCoreRoutes).toBe(0);
    expect(report.summary.compositeHelpers).toEqual(["querySettlementReconciliationRecords"]);
    expect(report.summary.sdkOnlyDirectMethods).toEqual([
      "getAntiSpamStake",
      "recordCanonicalBlock",
      "recordOnchainTransactionInclusion",
      "trackOnchainTransaction",
    ]);
    expect(report.summary.authoredTestFiles).toBe(18);
    expect(report.summary.testedPublicMethods).toBe(172);
    expect(report.summary.untestedPublicMethods).toBe(0);
    expect(report.summary.testedDirectHttpMethods).toBe(171);
    expect(report.summary.untestedDirectHttpMethods).toBe(0);
    expect(report.publicMethodTestCoverage.untestedMethods).toEqual([]);
    expect(report.directMethodTestCoverage.untestedMethods).toEqual([]);
  });

  it("keeps the family-level coverage counts stable", () => {
    const report = loadAuditReport();
    expect(report.routeFamilies).toEqual([
      { family: "health", coreRoutes: 1, sdkStatus: "covered" },
      { family: "observability + admin", coreRoutes: 16, sdkStatus: "covered" },
      { family: "identity + security + ZK", coreRoutes: 39, sdkStatus: "covered" },
      { family: "tasks + missions", coreRoutes: 14, sdkStatus: "covered" },
      { family: "payments + economics + governance", coreRoutes: 44, sdkStatus: "covered" },
      {
        family: "platform extensions (`compute`, `heartbeat`, `data`, `dev`, `disputes`)",
        coreRoutes: 53,
        sdkStatus: "covered",
      },
    ]);
  });

  it("maps to real whitepaper sections", () => {
    const report = loadAuditReport();
    const headings = new Set(report.whitepaperSections);

    expect(headings.has("4.1 Complete Ecosystem Overview")).toBe(true);
    expect(headings.has("5.1 PactTasks — Task Market (Core Application)")).toBe(true);
    expect(headings.has("5.2 PactPay — Agent Payment Network")).toBe(true);
    expect(headings.has("5.3 PactID — Decentralized Identity System")).toBe(true);
    expect(headings.has("5.4 PactData — Data Marketplace")).toBe(true);
    expect(headings.has("5.5 PactCompute — Agent Compute Services")).toBe(true);
    expect(headings.has("5.6 PactDev — Developer Platform")).toBe(true);
    expect(headings.has("6.1 Complete Role Matrix")).toBe(true);
    expect(headings.has("6.4 Reputation System")).toBe(true);
    expect(headings.has("7.1 ZK Proof Application Scenarios")).toBe(true);
    expect(headings.has("8.3 Auction Mechanism Design")).toBe(true);
  });

  it("keeps the generated markdown doc in sync", () => {
    const generated = runAudit();
    const committed = readFileSync(join(import.meta.dir, "../docs/route-parity-audit.md"), "utf8");

    expect(committed).toBe(generated);
  });
});
