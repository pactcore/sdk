export interface ClientRouteMethod {
  name: string;
  direct: boolean;
  verb: string | null;
  path: string | null;
  normalized: string | null;
}

export interface CoreRoute {
  verb: string;
  path: string;
  normalized: string;
}

export interface RouteFamilyCoverage {
  family: string;
  coreRoutes: number;
  sdkStatus: string;
}

export interface WhitepaperCoverageRow {
  section: string;
  coverage: string;
}

export interface RouteParityReport {
  auditedOn: string;
  sources: {
    client: string;
    core: string;
    whitepaper: string;
  };
  summary: {
    publicAsyncMethods: number;
    directHttpMethods: number;
    implementedCoreRoutes: number;
    missingCoreRoutes: number;
    compositeHelpers: string[];
    sdkOnlyDirectMethods: string[];
  };
  routeFamilies: RouteFamilyCoverage[];
  missingCoreRoutes: Array<Pick<CoreRoute, "verb" | "path">>;
  sdkOnlyRouteMethods: Array<Pick<ClientRouteMethod, "name" | "verb" | "path">>;
  whitepaperSections: string[];
  whitepaperCoverage: WhitepaperCoverageRow[];
  whitepaperNotesWithoutDedicatedRoutes: string[];
}

export function buildAuditReport(): RouteParityReport;
export function classifyRouteFamily(path: string): string;
export function extractClientSurface(clientSource: string): ClientRouteMethod[];
export function extractCoreRoutes(coreSource: string): CoreRoute[];
export function normalizeRoutePath(path: string): string;
export function renderMarkdown(report: RouteParityReport): string;
