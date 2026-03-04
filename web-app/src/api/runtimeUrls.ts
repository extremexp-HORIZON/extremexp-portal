const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function isLoopbackHost(hostname: string): boolean {
  const normalized = hostname.replace(/^\[/, "").replace(/\]$/, "");
  return LOOPBACK_HOSTS.has(normalized);
}

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function getTrimmedEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function resolvePortalApiBaseUrl(): string {
  const configured = getTrimmedEnv(import.meta.env.VITE_PORTAL_API_URL);
  if (configured) {
    return stripTrailingSlash(configured);
  }

  if (!hasWindow() || isLoopbackHost(window.location.hostname)) {
    return "http://localhost:8000";
  }

  return "/portal-api";
}

export function resolveAuthApiBaseUrl(): string {
  const configured = getTrimmedEnv(import.meta.env.VITE_AUTH_API_URL);
  if (configured) {
    return stripTrailingSlash(configured);
  }

  if (!hasWindow() || isLoopbackHost(window.location.hostname)) {
    return "http://localhost:5521/extreme_auth";
  }

  return "/extreme_auth";
}
