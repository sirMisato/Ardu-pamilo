const readOnlyTenantRouteNames = new Set([
  "tenant-dashboard",
  "tenant-ai-recommendation",
  "tenant-weather",
  "tenant-chart",
  "tenant-report"
]);

const readOnlyTenantPaths = new Set([
  "/dashboard",
  "/ai-recommendation",
  "/weather",
  "/chart",
  "/report"
]);

export function canReadOnlyTenantAccessRoute(routeName: unknown): boolean {
  return typeof routeName === "string" && readOnlyTenantRouteNames.has(routeName);
}

export function canReadOnlyTenantAccessPath(path: string): boolean {
  return readOnlyTenantPaths.has(path);
}
