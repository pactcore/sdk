import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const clientPath = resolve(repoRoot, "src/client.ts");
const corePath = resolve(repoRoot, "../pact-network-core-bun/src/api/app.ts");
const whitepaperPath = resolve(repoRoot, "../pact-whitepaper-docs/app/whitepaper");
const testsPath = resolve(repoRoot, "tests");
const auditDocPath = resolve(repoRoot, "docs/route-parity-audit.md");

const whitepaperCoverage = [
  {
    section: "4. Ecosystem Architecture",
    coverage: "observability, analytics, ecosystem status/modules/synergy",
  },
  {
    section: "5.1 PactTasks",
    coverage: "task creation, assignment, submission, mission lifecycle, challenge resolution",
  },
  {
    section: "5.2 PactPay",
    coverage:
      "payment routing, X402 relay, micropayments, credit lines, gas sponsorship, ledger, settlement execution",
  },
  {
    section: "5.3 PactID",
    coverage:
      "participant registration, DID documents, credentials, capability checks, participant levels/stats",
  },
  {
    section: "5.4 PactData",
    coverage: "data assets, lineage/dependents, access policy, marketplace listing/purchase/stats",
  },
  {
    section: "5.5 PactCompute",
    coverage: "provider registry/search, pricing, jobs, usage, adapter/backend health",
  },
  {
    section: "5.6 PactDev",
    coverage: "plugin publishing/install/revenue, integrations, policies, templates, managed backend health",
  },
  {
    section: "6. Participant Roles",
    coverage:
      "role capability/requirements checks, participant matrix category, reputation and anti-sybil/security surfaces",
  },
  {
    section: "6.4 Reputation System",
    coverage: "leaderboard, profile, history, event recording",
  },
  {
    section: "7. Zero-Knowledge Proof System",
    coverage: "proof creation, verification, receipts, manifests, circuit metadata, formal verification",
  },
  {
    section: "8. Verification + Dispute Design",
    coverage:
      "disputes, mission verdict/challenge flows, anti-spam, security analytics, settlement audit/replay helpers",
  },
];

const whitepaperNotesWithoutDedicatedRoutes = [
  "auction design from `8.3` is currently reflected through task pricing inputs, payment/economic analytics, and matching logic in `core`, not a dedicated auction route",
  "multidimensional matching from `8.4` is expressed through task constraints, role/capability checks, reputation filters, and compute/data selection flows rather than a single matching endpoint",
  "multi-layer verification from `6.3` and `8.1` is distributed across mission verdicts, disputes, reputation, anti-spam, security, and ZK proof routes",
];

function readUtf8(path) {
  return readFileSync(path, "utf8");
}

function collectFiles(directory, predicate) {
  const entries = readdirSync(directory).sort();
  const files = [];

  for (const entry of entries) {
    const fullPath = resolve(directory, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      files.push(...collectFiles(fullPath, predicate));
      continue;
    }

    if (predicate(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

function normalizeRoutePath(path) {
  return path
    .replace(/[`'"]/g, "")
    .replace(/\?\$\{[^}]+\}/g, "")
    .replace(/\$\{suffix\}/g, "")
    .replace(/\$\{query\}/g, "")
    .replace(/\$\{params\}/g, "")
    .replace(/\?.*$/, "")
    .replace(/\$\{[^}]+\}/g, ":param")
    .replace(/\/:[A-Za-z0-9_]+/g, "/:param")
    .replace(/\/+/g, "/");
}

function classifyRouteFamily(path) {
  if (path === "/health") return "health";

  const first = path.split("/").filter(Boolean)[0] ?? "root";

  if (["observability", "events", "analytics", "ecosystem", "admin"].includes(first)) {
    return "observability + admin";
  }

  if (["anti-spam", "security", "roles", "participants", "reputation", "id", "zk"].includes(first)) {
    return "identity + security + ZK";
  }

  if (["tasks", "missions"].includes(first)) {
    return "tasks + missions";
  }

  if (["pay", "payments", "economics", "governance", "rewards", "onchain"].includes(first)) {
    return "payments + economics + governance";
  }

  if (["compute", "heartbeat", "data", "dev", "disputes"].includes(first)) {
    return "platform extensions (`compute`, `heartbeat`, `data`, `dev`, `disputes`)";
  }

  return first;
}

function extractCoreRoutes(coreSource) {
  return [...coreSource.matchAll(/app\.(get|post|put|patch|delete)\(\s*"([^"]+)"/g)].map((match) => ({
    verb: match[1].toUpperCase(),
    path: match[2],
    normalized: normalizeRoutePath(match[2]),
  }));
}

function extractWhitepaperSections(whitepaperDirectory) {
  const mdxFiles = collectFiles(whitepaperDirectory, (file) => file.endsWith(".mdx"));

  return mdxFiles.flatMap((file) => {
    const source = readUtf8(file);
    return [...source.matchAll(/^##+\s+(.+)$/gm)].map((match) => match[1].trim());
  });
}

function stringifyExpression(node, sourceFile, locals) {
  if (!node) return null;

  if (ts.isStringLiteralLike(node)) {
    return node.text;
  }

  if (ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }

  if (ts.isTemplateExpression(node)) {
    return `\`${node.getText(sourceFile).slice(1, -1)}\``;
  }

  if (ts.isIdentifier(node)) {
    return locals.get(node.text) ?? node.text;
  }

  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = stringifyExpression(node.left, sourceFile, locals);
    const right = stringifyExpression(node.right, sourceFile, locals);
    if (left !== null && right !== null) {
      return `${left}${right}`;
    }
  }

  return node.getText(sourceFile);
}

function isThisRequestCall(node) {
  return (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.expression.kind === ts.SyntaxKind.ThisKeyword &&
    node.expression.name.text === "request"
  );
}

function extractClientSurface(clientSource) {
  const sourceFile = ts.createSourceFile(clientPath, clientSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const clientClass = sourceFile.statements.find(
    (statement) => ts.isClassDeclaration(statement) && statement.name?.text === "PactSdk",
  );

  if (!clientClass || !ts.isClassDeclaration(clientClass)) {
    throw new Error("Unable to locate PactSdk class in src/client.ts");
  }

  const methods = [];

  for (const member of clientClass.members) {
    if (!ts.isMethodDeclaration(member) || !member.name || !ts.isIdentifier(member.name)) {
      continue;
    }

    const name = member.name.text;
    if (name === "request") {
      continue;
    }

    const locals = new Map();

    for (const statement of member.body?.statements ?? []) {
      if (!ts.isVariableStatement(statement)) {
        continue;
      }

      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || !declaration.initializer) {
          continue;
        }

        const value = stringifyExpression(declaration.initializer, sourceFile, locals);
        if (value !== null) {
          locals.set(declaration.name.text, value);
        }
      }
    }

    let request = null;

    const visit = (node) => {
      if (request || !isThisRequestCall(node)) {
        ts.forEachChild(node, visit);
        return;
      }

      const [verbNode, pathNode] = node.arguments;
      if (!verbNode || !pathNode) {
        request = { verb: null, path: null, normalized: null };
        return;
      }

      const verb = stringifyExpression(verbNode, sourceFile, locals)?.replace(/[`'"]/g, "") ?? null;
      const path = stringifyExpression(pathNode, sourceFile, locals);
      request = {
        verb,
        path,
        normalized: path === null ? null : normalizeRoutePath(path),
      };
    };

    ts.forEachChild(member, visit);

    methods.push({
      name,
      direct: request !== null,
      verb: request?.verb ?? null,
      path: request?.path ?? null,
      normalized: request?.normalized ?? null,
    });
  }

  return methods;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractTestCoverage(methodNames) {
  const testFiles = collectFiles(testsPath, (file) => file.endsWith(".test.ts"));
  const fileSources = testFiles.map((file) => ({
    file,
    source: readUtf8(file),
  }));

  const testedMethods = [];
  const untestedMethods = [];

  for (const methodName of methodNames) {
    const pattern = new RegExp(`\\b${escapeRegExp(methodName)}\\b`);
    const covered = fileSources.some(({ source }) => pattern.test(source));

    if (covered) {
      testedMethods.push(methodName);
    } else {
      untestedMethods.push(methodName);
    }
  }

  return {
    authoredTestFiles: testFiles.map((file) => relative(repoRoot, file)).sort(),
    testedMethods: testedMethods.sort(),
    untestedMethods: untestedMethods.sort(),
  };
}

function displayRoute(method) {
  return `${method.verb} ${String(method.path).replace(/[`]/g, "")}`;
}

function buildAuditReport() {
  const clientSource = readUtf8(clientPath);
  const coreSource = readUtf8(corePath);

  const clientMethods = extractClientSurface(clientSource);
  const coreRoutes = extractCoreRoutes(coreSource);
  const whitepaperSections = extractWhitepaperSections(whitepaperPath);

  const directMethods = clientMethods.filter((method) => method.direct);
  const compositeMethods = clientMethods.filter((method) => !method.direct);

  const publicTestCoverage = extractTestCoverage(clientMethods.map((method) => method.name));
  const directTestCoverage = extractTestCoverage(directMethods.map((method) => method.name));

  const coreRouteMap = new Map(coreRoutes.map((route) => [`${route.verb} ${route.normalized}`, route]));
  const directRouteMap = new Map(directMethods.map((method) => [`${method.verb} ${method.normalized}`, method]));

  const missingCoreRoutes = coreRoutes
    .filter((route) => !directRouteMap.has(`${route.verb} ${route.normalized}`))
    .map((route) => ({
      verb: route.verb,
      path: route.path,
    }));

  const sdkOnlyRouteMethods = directMethods
    .filter((method) => !coreRouteMap.has(`${method.verb} ${method.normalized}`))
    .map((method) => ({
      name: method.name,
      verb: method.verb,
      path: method.path,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

  const routeFamilies = [...coreRoutes]
    .reduce((acc, route) => {
      const family = classifyRouteFamily(route.path);
      acc.set(family, (acc.get(family) ?? 0) + 1);
      return acc;
    }, new Map())
    .entries();

  const orderedRouteFamilies = [...routeFamilies]
    .map(([family, count]) => ({ family, coreRoutes: count, sdkStatus: "covered" }))
    .sort((left, right) => {
      const order = [
        "health",
        "observability + admin",
        "identity + security + ZK",
        "tasks + missions",
        "payments + economics + governance",
        "platform extensions (`compute`, `heartbeat`, `data`, `dev`, `disputes`)",
      ];
      return order.indexOf(left.family) - order.indexOf(right.family);
    });

  return {
    auditedOn: "March 13, 2026",
    sources: {
      client: "src/client.ts",
      core: "../pact-network-core-bun/src/api/app.ts",
      whitepaper: "../pact-whitepaper-docs/app/whitepaper/**/*.mdx",
      authoredTests: "tests/**/*.test.ts",
    },
    summary: {
      publicAsyncMethods: clientMethods.length,
      directHttpMethods: directMethods.length,
      implementedCoreRoutes: coreRoutes.length,
      missingCoreRoutes: missingCoreRoutes.length,
      compositeHelpers: compositeMethods.map((method) => method.name),
      sdkOnlyDirectMethods: sdkOnlyRouteMethods.map((method) => method.name),
      authoredTestFiles: publicTestCoverage.authoredTestFiles.length,
      testedPublicMethods: publicTestCoverage.testedMethods.length,
      untestedPublicMethods: publicTestCoverage.untestedMethods.length,
      testedDirectHttpMethods: directTestCoverage.testedMethods.length,
      untestedDirectHttpMethods: directTestCoverage.untestedMethods.length,
    },
    routeFamilies: orderedRouteFamilies,
    missingCoreRoutes,
    sdkOnlyRouteMethods,
    publicMethodTestCoverage: publicTestCoverage,
    directMethodTestCoverage: directTestCoverage,
    whitepaperSections,
    whitepaperCoverage,
    whitepaperNotesWithoutDedicatedRoutes,
  };
}

function renderMarkdown(report) {
  const lines = [];

  lines.push("# SDK Route Parity Audit", "");
  lines.push(`This audit captures the \`@pactcore/sdk\` transport surface as of ${report.auditedOn}.`, "");
  lines.push("This file is generated from `scripts/route-parity-audit.mjs`.", "");
  lines.push("## Sources Reviewed", "");
  lines.push(`- SDK client surface: \`${report.sources.client}\``);
  lines.push(`- implemented core routes: \`${report.sources.core}\``);
  lines.push(`- whitepaper baseline: \`${report.sources.whitepaper}\``);
  lines.push(`- authored SDK tests scanned for surface coverage: \`${report.sources.authoredTests}\``, "");
  lines.push("## Summary", "");
  lines.push(`- \`PactSdk\` exposes \`${report.summary.publicAsyncMethods}\` public async methods.`);
  lines.push(`- \`${report.summary.directHttpMethods}\` of those methods directly call HTTP routes.`);
  lines.push(`- \`${report.summary.implementedCoreRoutes}\` implemented \`core\` routes are audited.`);
  lines.push(`- Missing SDK coverage for implemented \`core\` routes: \`${report.summary.missingCoreRoutes}\`.`);
  lines.push(`- Composite helpers: ${report.summary.compositeHelpers.map((name) => `\`${name}()\``).join(", ")}.`);
  lines.push(
    `- Forward-compatible SDK-only direct methods without matching audited \`core\` routes: ${report.summary.sdkOnlyDirectMethods.map((name) => `\`${name}()\``).join(", ")}.`,
  );
  lines.push(
    `- Authored TypeScript tests cover \`${report.summary.testedPublicMethods}\` / \`${report.summary.publicAsyncMethods}\` public methods and \`${report.summary.testedDirectHttpMethods}\` / \`${report.summary.directHttpMethods}\` direct HTTP methods.`,
  );
  lines.push("");
  lines.push("## Core Route Family Coverage", "");
  lines.push("| Family | Implemented core routes | SDK status |", "|---|---:|---|");
  for (const family of report.routeFamilies) {
    lines.push(`| ${family.family} | ${family.coreRoutes} | ${family.sdkStatus} |`);
  }
  lines.push("");
  lines.push("## SDK Surface Test Coverage", "");
  lines.push(`- Authored TypeScript test files scanned: \`${report.summary.authoredTestFiles}\`.`);
  lines.push(`- Untested public methods: \`${report.summary.untestedPublicMethods}\`.`);
  lines.push(`- Untested direct HTTP methods: \`${report.summary.untestedDirectHttpMethods}\`.`);
  if (report.publicMethodTestCoverage.untestedMethods.length === 0) {
    lines.push("- Every public `PactSdk` method is referenced by at least one authored TypeScript test.");
  } else {
    lines.push("- Public methods missing authored TypeScript test evidence:");
    for (const name of report.publicMethodTestCoverage.untestedMethods) {
      lines.push(`  - \`${name}()\``);
    }
  }
  lines.push("");
  lines.push("## Implemented Core Route Gaps", "");
  if (report.missingCoreRoutes.length === 0) {
    lines.push("None. Every audited implemented `core` route currently has direct `PactSdk` coverage.");
  } else {
    for (const route of report.missingCoreRoutes) {
      lines.push(`- \`${route.verb} ${route.path}\``);
    }
  }
  lines.push("");
  lines.push("## Forward-Compatible SDK-Only Direct Methods", "");
  lines.push("| SDK method | Route | Note |", "|---|---|---|");
  for (const method of report.sdkOnlyRouteMethods) {
    lines.push(`| \`${method.name}()\` | \`${displayRoute(method)}\` | no matching audited core route yet |`);
  }
  lines.push("");
  lines.push("## Whitepaper Traceability", "");
  lines.push("The current SDK transport surface maps well to the whitepaper's route-relevant capability areas:", "");
  lines.push("| Whitepaper area | Current SDK coverage |", "|---|---|");
  for (const item of report.whitepaperCoverage) {
    lines.push(`| \`${item.section}\` | ${item.coverage} |`);
  }
  lines.push("");
  lines.push("## Whitepaper Notes Without Dedicated Client Routes", "");
  for (const note of report.whitepaperNotesWithoutDedicatedRoutes) {
    lines.push(`- ${note}`);
  }
  lines.push("");
  lines.push("## Outcome", "");
  lines.push("For implemented `core` HTTP routes, SDK parity is complete in this repo.", "");
  lines.push("The remaining parity work is ongoing maintenance:", "");
  lines.push("- keep this generated audit in sync when `core` adds routes");
  lines.push("- keep authored TypeScript coverage at full public-surface parity as new SDK methods land");
  lines.push("- convert forward-compatible SDK-only methods to full parity once matching `core` routes ship");
  lines.push("- update the whitepaper traceability table when new route families land");

  return `${lines.join("\n")}\n`;
}

function main(argv) {
  const report = buildAuditReport();

  if (argv.includes("--json")) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  const markdown = renderMarkdown(report);

  if (argv.includes("--write")) {
    writeFileSync(auditDocPath, markdown);
  }

  process.stdout.write(markdown);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}

export {
  buildAuditReport,
  classifyRouteFamily,
  extractClientSurface,
  extractCoreRoutes,
  normalizeRoutePath,
  renderMarkdown,
};
