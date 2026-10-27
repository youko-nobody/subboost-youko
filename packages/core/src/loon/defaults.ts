import type {
  LoonConfig,
  LoonPolicyRef,
  LoonProxyGroup,
  LoonRemoteRule,
  LoonRule,
} from "./types";

export const DEFAULT_LOON_GENERAL_TEXT = [
  "ip-mode = v4-only",
  "ipv6-vif = off",
  "dns-server = system",
  "sni-sniffing = true",
  "disable-stun = true",
  "dns-reject-mode = LoopbackIP",
  "domain-reject-mode = DNS",
  "udp-fallback-mode = REJECT",
  "wifi-access-http-port = 7222",
  "wifi-access-socks5-port = 7221",
  "allow-wifi-access = false",
  "interface-mode = auto",
  "test-timeout = 5",
  "disconnect-on-policy-change = false",
  "internet-test-url = http://connectivitycheck.platform.hicloud.com/generate_204",
  "proxy-test-url = http://www.gstatic.com/generate_204",
  "resource-parser = https://raw.githubusercontent.com/sub-store-org/Sub-Store/release/sub-store-parser.loon.min.js",
  "geoip-url = https://geodata.kelee.one/Country-Masaiki.mmdb",
  "ipasn-url = https://geodata.kelee.one/GeoLite2-ASN-P3TERX.mmdb",
  "skip-proxy = 192.168.0.0/16,10.0.0.0/8,172.16.0.0/12,localhost,*.local,e.crashlynatics.com",
  "bypass-tun = 10.0.0.0/8,100.64.0.0/10,127.0.0.0/8,169.254.0.0/16,172.16.0.0/12,192.0.0.0/24,192.0.2.0/24,192.88.99.0/24,192.168.0.0/16,198.51.100.0/24,203.0.113.0/24,224.0.0.0/4,255.255.255.255/32",
].join("\n");

const DEFAULT_FINAL_TARGET: LoonPolicyRef = { kind: "direct" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function positiveInt(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : undefined;
}

function normalizePolicy(value: unknown): LoonPolicyRef | string | null {
  if (typeof value === "string") return value.trim() || null;
  if (!isRecord(value)) return null;
  if (value.kind === "direct" || value.kind === "reject") return { kind: value.kind };
  if (value.kind === "node" && text(value.name)) return { kind: "node", name: text(value.name) };
  if (value.kind === "group" && text(value.id)) return { kind: "group", id: text(value.id) };
  return null;
}

function normalizePolicyList(value: unknown): LoonPolicyRef[] {
  if (!Array.isArray(value)) return [];
  return value.map(normalizePolicy).filter((item): item is LoonPolicyRef =>
    Boolean(item && typeof item !== "string"),
  );
}

function normalizeProxyGroups(value: unknown): LoonProxyGroup[] {
  if (!Array.isArray(value)) return [];
  const out: LoonProxyGroup[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const id = text(item.id);
    const name = text(item.name);
    if (!id || !name) continue;
    const type = item.type === "url-test" || item.type === "fallback" || item.type === "load-balance"
      ? item.type
      : "select";
    const includeRegex = text(item.includeRegex);
    const excludeRegex = text(item.excludeRegex);
    const url = text(item.url);
    out.push({
      id,
      name,
      type,
      policies: normalizePolicyList(item.policies),
      ...(text(item.icon) ? { icon: text(item.icon) } : {}),
      ...(item.enabled === false ? { enabled: false } : {}),
      ...(includeRegex ? { includeRegex } : {}),
      ...(excludeRegex ? { excludeRegex } : {}),
      ...(url ? { url } : {}),
      ...(positiveInt(item.interval) ? { interval: positiveInt(item.interval) } : {}),
      ...(positiveInt(item.tolerance) ? { tolerance: positiveInt(item.tolerance) } : {}),
      ...(positiveInt(item.maxTimeout) ? { maxTimeout: positiveInt(item.maxTimeout) } : {}),
      ...(item.algorithm === "pcc" || item.algorithm === "round-robin" || item.algorithm === "random"
        ? { algorithm: item.algorithm }
        : {}),
    });
  }
  return out;
}

function normalizeRemoteRules(value: unknown): LoonRemoteRule[] {
  if (!Array.isArray(value)) return [];
  const out: LoonRemoteRule[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const id = text(item.id);
    const url = text(item.url);
    const target = normalizePolicy(item.target);
    if (!id || !target) continue;
    out.push({
      id,
      name: text(item.name) || id,
      url,
      target,
      ...(item.enabled === false ? { enabled: false } : {}),
    });
  }
  return out;
}

const RULE_TYPES = new Set([
  "DOMAIN", "DOMAIN-SUFFIX", "DOMAIN-KEYWORD", "IP-CIDR", "IP-CIDR6",
  "IP-ASN", "GEOIP", "URL-REGEX", "USER-AGENT", "DEST-PORT", "SRC-PORT",
]);

function domainWildcardToUrlRegex(value: string): string {
  const pattern = value
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, "[A-Za-z0-9.-]*");
  return `^https?://([A-Za-z0-9-]+\\.)*${pattern}(:[0-9]+)?(/|$)`;
}

function normalizeRules(value: unknown): LoonRule[] {
  if (!Array.isArray(value)) return [];
  const out: LoonRule[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const id = text(item.id);
    const rawType = text(item.type);
    const isLegacyDomainWildcard = rawType === "DOMAIN-WILDCARD";
    const type = isLegacyDomainWildcard ? "URL-REGEX" : rawType;
    const ruleValue = text(item.value);
    const target = normalizePolicy(item.target);
    if (!id || !RULE_TYPES.has(type) || !target || (isLegacyDomainWildcard && !ruleValue)) continue;
    out.push({
      id,
      type: type as LoonRule["type"],
      value: isLegacyDomainWildcard ? domainWildcardToUrlRegex(ruleValue) : ruleValue,
      target,
      ...(item.noResolve === true ? { noResolve: true } : {}),
      ...(item.enabled === false ? { enabled: false } : {}),
    });
  }
  return out;
}

export function createDefaultLoonConfig(): LoonConfig {
  return {
    generalText: DEFAULT_LOON_GENERAL_TEXT,
    proxyGroups: [],
    remoteRules: [],
    rules: [],
    finalTarget: DEFAULT_FINAL_TARGET,
    testUrl: "http://www.gstatic.com/generate_204",
    testInterval: 300,
  };
}

export function normalizeLoonConfig(value: unknown): LoonConfig {
  const defaults = createDefaultLoonConfig();
  if (!isRecord(value)) return defaults;
  return {
    generalText: typeof value.generalText === "string" ? value.generalText : defaults.generalText,
    proxyGroups: normalizeProxyGroups(value.proxyGroups),
    remoteRules: normalizeRemoteRules(value.remoteRules),
    rules: normalizeRules(value.rules),
    finalTarget: normalizePolicy(value.finalTarget) ?? defaults.finalTarget,
    testUrl: text(value.testUrl) || defaults.testUrl,
    testInterval: positiveInt(value.testInterval) ?? defaults.testInterval,
  };
}
