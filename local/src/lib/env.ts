type RequiredEnvName = "DATABASE_URL" | "ENCRYPTION_KEY" | "JWT_SECRET" | "APP_URL";

const LOCAL_DEVELOPMENT_DEFAULTS: Record<RequiredEnvName, string> = {
  DATABASE_URL:
    "postgresql://subboost_local_dev:subboost_local_dev_password@localhost:5432/subboost_local_dev?schema=public",
  ENCRYPTION_KEY: "subboost-local-dev-encryption-key-0001",
  JWT_SECRET: "subboost-local-dev-jwt-secret-00000001",
  APP_URL: "http://127.0.0.1:3001",
};

export function requireEnv(name: RequiredEnvName): string {
  const value = process.env[name];
  if (typeof value !== "string" || value.trim().length === 0) {
    if (process.env.NODE_ENV === "development") return LOCAL_DEVELOPMENT_DEFAULTS[name];
    throw new Error(`${name} is required`);
  }
  return value.trim();
}

export function getAppUrl(): string {
  return requireEnv("APP_URL").replace(/\/+$/, "");
}

export function isHttpsAppUrl(): boolean {
  return getAppUrl().startsWith("https://");
}

function firstHeaderValue(value: string | null): string {
  return (value || "").split(",")[0]?.trim() || "";
}

function normalizeHeaderHost(value: string): string {
  const host = value.replace(/^https?:\/\//i, "").split("/")[0]?.trim() || "";
  if (!host || /[\s@]/.test(host)) return "";
  try {
    return new URL(`http://${host}`).host;
  } catch {
    return "";
  }
}

function normalizeHeaderProtocol(value: string | null): "http" | "https" | "" {
  const protocol = firstHeaderValue(value).replace(/:$/, "").toLowerCase();
  return protocol === "http" || protocol === "https" ? protocol : "";
}

export function getRequestAppUrl(request?: Request | null): string {
  if (!request) return getAppUrl();

  try {
    const requestUrl = new URL(request.url);
    const forwardedHost = normalizeHeaderHost(firstHeaderValue(request.headers.get("x-forwarded-host")));
    const host = forwardedHost
      || normalizeHeaderHost(firstHeaderValue(request.headers.get("host")))
      || requestUrl.host;
    if (!host) return getAppUrl();

    const forwardedProto = normalizeHeaderProtocol(request.headers.get("x-forwarded-proto"));
    const protocol = forwardedProto || (requestUrl.protocol === "http:" ? "http" : "https");
    return `${protocol}://${host}`.replace(/\/+$/, "");
  } catch {
    return getAppUrl();
  }
}
