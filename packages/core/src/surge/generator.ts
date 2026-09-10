import type { ParsedNode } from "@subboost/core/types/node";
import {
  DEFAULT_SURGE_MANAGED_CONFIG_INTERVAL,
  normalizeSurgeConfig,
} from "./defaults";
import type {
  SurgeConfig,
  SurgeGenerationResult,
  SurgePolicyRef,
  SurgeProxyGroup,
  SurgeRegionPolicyGroup,
  SurgeRule,
  SurgeRuleSet,
  SurgeSkippedNode,
} from "./types";

type NodeRecord = Record<string, unknown>;

export interface GenerateSurgeOptions {
  nodes: ParsedNode[];
  config?: Partial<SurgeConfig> | SurgeConfig;
}

const SUPPORTED_PROXY_TYPES = new Set([
  "ss",
  "vmess",
  "trojan",
  "http",
  "https",
  "socks5",
  "snell",
  "hysteria2",
  "tuic",
  "anytls",
  "ssh",
  "wireguard",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(stringValue).filter(Boolean);
  const single = stringValue(value);
  return single ? [single] : [];
}

function escapeQuoted(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");
}

function formatToken(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '""';
  return /[,#;\r\n]/.test(trimmed) ? `"${escapeQuoted(trimmed)}"` : trimmed;
}

function appendParam(out: string[], key: string, value: unknown) {
  if (value === undefined || value === null || value === "") return;
  if (typeof value === "boolean") {
    out.push(`${key}=${value ? "true" : "false"}`);
    return;
  }
  out.push(`${key}=${formatToken(String(value))}`);
}

function sanitizeName(name: string, fallback: string): string {
  const normalized = name
    .replace(/[\r\n]+/g, " ")
    .replace(/[=,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized || fallback;
}

function ensureUniqueNames<T>(
  items: T[],
  getRawName: (item: T, index: number) => string,
  fallbackPrefix: string,
): Map<T, string> {
  const used = new Set<string>();
  const map = new Map<T, string>();
  items.forEach((item, index) => {
    const base = sanitizeName(
      getRawName(item, index),
      `${fallbackPrefix}${index + 1}`,
    );
    let name = base;
    let suffix = 2;
    while (used.has(name)) {
      name = `${base} (${suffix++})`;
    }
    used.add(name);
    map.set(item, name);
  });
  return map;
}

function buildWsParams(record: NodeRecord, out: string[]) {
  const ws = isRecord(record["ws-opts"]) ? record["ws-opts"] : {};
  if (stringValue(record.network) !== "ws" && Object.keys(ws).length === 0)
    return;
  out.push("ws=true");
  appendParam(out, "ws-path", stringValue(ws.path) || "/");
  const headers = isRecord(ws.headers) ? ws.headers : {};
  const headerText = Object.entries(headers)
    .map(([key, value]) => {
      const headerValue = Array.isArray(value)
        ? value.map(String).join(",")
        : String(value ?? "");
      return key.trim() && headerValue.trim()
        ? `${key.trim()}:${headerValue.trim()}`
        : "";
    })
    .filter(Boolean)
    .join("|");
  appendParam(out, "ws-headers", headerText);
}

function appendCommonProxyParams(record: NodeRecord, out: string[]) {
  appendParam(
    out,
    "sni",
    stringValue(record.sni) || stringValue(record.servername),
  );
  appendParam(
    out,
    "server-cert-fingerprint-sha256",
    stringValue(record.fingerprint),
  );
  const skipCertVerify = booleanValue(record["skip-cert-verify"]);
  if (skipCertVerify !== undefined)
    appendParam(out, "skip-cert-verify", skipCertVerify);
  const udp = booleanValue(record.udp);
  if (udp !== undefined) appendParam(out, "udp-relay", udp);
  const tfo = booleanValue(record.tfo);
  if (tfo !== undefined) appendParam(out, "tfo", tfo);
}

function baseProxyParts(
  name: string,
  surgeType: string,
  record: NodeRecord,
): string[] | null {
  const server = stringValue(record.server);
  const port = numberValue(record.port);
  if (!server || !port) return null;
  return [`${name} = ${surgeType}`, formatToken(server), String(port)];
}

function serializeSs(name: string, record: NodeRecord): string | null {
  const parts = baseProxyParts(name, "ss", record);
  const cipher = stringValue(record.cipher);
  const password = stringValue(record.password);
  if (!parts || !cipher || !password) return null;
  appendParam(parts, "encrypt-method", cipher);
  appendParam(parts, "password", password);

  const plugin = stringValue(record.plugin).toLowerCase();
  const pluginOpts = isRecord(record["plugin-opts"])
    ? record["plugin-opts"]
    : {};
  if (plugin === "obfs") {
    appendParam(parts, "obfs", stringValue(pluginOpts.mode));
    appendParam(parts, "obfs-host", stringValue(pluginOpts.host));
    appendParam(parts, "obfs-uri", stringValue(pluginOpts.path));
  }
  appendCommonProxyParams(record, parts);
  return parts.join(", ");
}

function serializeVmess(name: string, record: NodeRecord): string | null {
  const parts = baseProxyParts(name, "vmess", record);
  const uuid = stringValue(record.uuid);
  if (!parts || !uuid) return null;
  appendParam(parts, "username", uuid);
  const cipher = stringValue(record.cipher);
  if (cipher) appendParam(parts, "encrypt-method", cipher);
  appendParam(parts, "vmess-aead", numberValue(record.alterId) === 0);
  if (record.tls !== undefined)
    appendParam(parts, "tls", booleanValue(record.tls) === true);
  buildWsParams(record, parts);
  appendCommonProxyParams(record, parts);
  return parts.join(", ");
}

function serializeTrojan(name: string, record: NodeRecord): string | null {
  const parts = baseProxyParts(name, "trojan", record);
  const password = stringValue(record.password);
  if (!parts || !password) return null;
  appendParam(parts, "password", password);
  if (record.tls !== undefined)
    appendParam(parts, "tls", booleanValue(record.tls) !== false);
  buildWsParams(record, parts);
  appendCommonProxyParams(record, parts);
  return parts.join(", ");
}

function serializeHttp(name: string, record: NodeRecord): string | null {
  const type =
    stringValue(record.type) === "https" || record.tls === true
      ? "https"
      : "http";
  const parts = baseProxyParts(name, type, record);
  if (!parts) return null;
  appendParam(parts, "username", stringValue(record.username));
  appendParam(parts, "password", stringValue(record.password));
  appendCommonProxyParams(record, parts);
  return parts.join(", ");
}

function serializeSocks5(name: string, record: NodeRecord): string | null {
  const parts = baseProxyParts(
    name,
    record.tls === true ? "socks5-tls" : "socks5",
    record,
  );
  if (!parts) return null;
  appendParam(parts, "username", stringValue(record.username));
  appendParam(parts, "password", stringValue(record.password));
  appendCommonProxyParams(record, parts);
  return parts.join(", ");
}

function serializeSnell(name: string, record: NodeRecord): string | null {
  const parts = baseProxyParts(name, "snell", record);
  const psk = stringValue(record.psk);
  if (!parts || !psk) return null;
  appendParam(parts, "psk", psk);
  appendParam(parts, "version", numberValue(record.version));
  const obfs = isRecord(record["obfs-opts"]) ? record["obfs-opts"] : {};
  appendParam(parts, "obfs", stringValue(obfs.mode));
  appendParam(parts, "obfs-host", stringValue(obfs.host));
  appendParam(parts, "obfs-uri", stringValue(obfs.path));
  const reuse = booleanValue(record.reuse);
  if (reuse !== undefined) appendParam(parts, "reuse", reuse);
  appendCommonProxyParams(record, parts);
  return parts.join(", ");
}

function serializeHysteria2(name: string, record: NodeRecord): string | null {
  const parts = baseProxyParts(name, "hysteria2", record);
  const password = stringValue(record.password);
  if (!parts || !password) return null;
  appendParam(parts, "password", password);
  appendParam(parts, "sni", stringValue(record.sni));
  const skipCertVerify = booleanValue(record["skip-cert-verify"]);
  if (skipCertVerify !== undefined)
    appendParam(parts, "skip-cert-verify", skipCertVerify);
  appendParam(parts, "download-bandwidth", stringValue(record.down));
  if (stringValue(record.obfs) === "salamander") {
    appendParam(
      parts,
      "salamander-password",
      stringValue(record["obfs-password"]),
    );
  }
  appendParam(
    parts,
    "port-hopping-interval",
    numberValue(record["hop-interval"]),
  );
  return parts.join(", ");
}

function serializeTuic(name: string, record: NodeRecord): string | null {
  const token = stringValue(record.token);
  const uuid = stringValue(record.uuid);
  const password = stringValue(record.password);
  const parts = baseProxyParts(name, token ? "tuic" : "tuic-v5", record);
  if (!parts || (!token && (!uuid || !password))) return null;
  appendParam(parts, "token", token);
  appendParam(parts, "uuid", token ? "" : uuid);
  appendParam(parts, "password", token ? "" : password);
  appendParam(parts, "sni", stringValue(record.sni));
  appendParam(parts, "alpn", stringList(record.alpn)[0]);
  appendCommonProxyParams(record, parts);
  return parts.join(", ");
}

function serializeAnyTls(name: string, record: NodeRecord): string | null {
  const parts = baseProxyParts(name, "anytls", record);
  const password = stringValue(record.password);
  if (!parts || !password) return null;
  appendParam(parts, "password", password);
  appendParam(parts, "sni", stringValue(record.sni));
  const skipCertVerify = booleanValue(record["skip-cert-verify"]);
  if (skipCertVerify !== undefined)
    appendParam(parts, "skip-cert-verify", skipCertVerify);
  return parts.join(", ");
}

function serializeSsh(name: string, record: NodeRecord): string | null {
  const parts = baseProxyParts(name, "ssh", record);
  const username = stringValue(record.username);
  const password = stringValue(record.password);
  const privateKey = stringValue(record["private-key"]);
  if (!parts || !username || (!password && !privateKey)) return null;
  appendParam(parts, "username", username);
  appendParam(parts, "password", password);
  appendParam(parts, "private-key", privateKey);
  appendParam(
    parts,
    "server-fingerprint",
    stringValue(record["server-fingerprint"]),
  );
  return parts.join(", ");
}

function serializeWireGuardProxy(
  name: string,
  record: NodeRecord,
  sectionName: string,
  wireGuardSections: string[],
): string | null {
  const privateKey = stringValue(record["private-key"]);
  const server = stringValue(record.server);
  const port = numberValue(record.port);
  const publicKey = stringValue(record["public-key"]);
  if (!privateKey || !server || !port || !publicKey) return null;

  const lines = [`[WireGuard ${sectionName}]`, `private-key = ${privateKey}`];
  const selfIp = stringValue(record.ip);
  if (selfIp) lines.push(`self-ip = ${selfIp}`);
  const selfIpv6 = stringValue(record.ipv6);
  if (selfIpv6) lines.push(`self-ip-v6 = ${selfIpv6}`);
  const dns = stringList(record.dns);
  if (dns.length > 0) lines.push(`dns-server = ${dns.join(", ")}`);
  const mtu = numberValue(record.mtu);
  if (mtu) lines.push(`mtu = ${mtu}`);
  const keepalive = numberValue(record.keepalive);
  if (keepalive) lines.push(`keepalive = ${keepalive}`);
  const peerParts = [
    `public-key = ${publicKey}`,
    stringValue(record["pre-shared-key"])
      ? `pre-shared-key = ${stringValue(record["pre-shared-key"])}`
      : "",
    `endpoint = "${server}:${port}"`,
    stringList(record["allowed-ips"]).length > 0
      ? `allowed-ips = "${stringList(record["allowed-ips"]).join(", ")}"`
      : "",
    Array.isArray(record.reserved)
      ? `client-id = "${record.reserved.join("/")}"`
      : "",
  ].filter(Boolean);
  lines.push(`peer = (${peerParts.join(", ")})`);
  wireGuardSections.push(lines.join("\n"));
  return `${name} = wireguard, section-name=${formatToken(sectionName)}`;
}

function serializeProxyNode(
  node: ParsedNode,
  name: string,
  wireGuardSections: string[],
  wireGuardSectionName: string,
): string | null {
  const record = node as unknown as NodeRecord;
  const type = stringValue(record.type).toLowerCase();
  switch (type) {
    case "ss":
      return serializeSs(name, record);
    case "vmess":
      return serializeVmess(name, record);
    case "trojan":
      return serializeTrojan(name, record);
    case "http":
    case "https":
      return serializeHttp(name, record);
    case "socks5":
      return serializeSocks5(name, record);
    case "snell":
      return serializeSnell(name, record);
    case "hysteria2":
      return serializeHysteria2(name, record);
    case "tuic":
      return serializeTuic(name, record);
    case "anytls":
      return serializeAnyTls(name, record);
    case "ssh":
      return serializeSsh(name, record);
    case "wireguard":
      return serializeWireGuardProxy(
        name,
        record,
        wireGuardSectionName,
        wireGuardSections,
      );
    default:
      return null;
  }
}

function getNodeType(node: ParsedNode): string {
  return stringValue((node as unknown as NodeRecord).type) || "unknown";
}

function isSupportedNode(node: ParsedNode): boolean {
  return SUPPORTED_PROXY_TYPES.has(getNodeType(node).toLowerCase());
}

function resolvePolicyName(
  target: SurgePolicyRef | string | undefined,
  groupNamesById: Map<string, string>,
  nodeNamesByOriginal: Map<string, string>,
): string | null {
  if (!target) return null;
  if (typeof target === "string") {
    const trimmed = target.trim();
    return trimmed ? sanitizeName(trimmed, "PROXY") : null;
  }
  if (target.kind === "direct") return "DIRECT";
  if (target.kind === "reject") return "REJECT";
  if (target.kind === "group") return groupNamesById.get(target.id) ?? null;
  if (target.kind === "node")
    return nodeNamesByOriginal.get(target.name) ?? null;
  return null;
}

function regionRegex(keywords: string[]): string {
  const escaped = keywords
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .map((keyword) => keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return escaped.length > 0 ? `(?i)(${escaped.join("|")})` : "(?!)";
}

function appendPolicyGroupCommonParams(
  parts: string[],
  group: Pick<
    SurgeProxyGroup,
    | "type"
    | "url"
    | "interval"
    | "timeout"
    | "tolerance"
    | "policyPriority"
    | "icon"
  >,
  fallback: { testUrl: string; testInterval: number },
) {
  if (
    group.type === "url-test" ||
    group.type === "fallback" ||
    group.type === "load-balance"
  ) {
    appendParam(parts, "url", stringValue(group.url) || fallback.testUrl);
    appendParam(
      parts,
      "interval",
      numberValue(group.interval) ?? fallback.testInterval,
    );
  }
  appendParam(parts, "timeout", numberValue(group.timeout));
  appendParam(parts, "tolerance", numberValue(group.tolerance));
  if (group.type === "smart") {
    appendParam(parts, "policy-priority", stringValue(group.policyPriority));
  }
  appendParam(parts, "icon-url", stringValue(group.icon));
}

function buildRegionGroupLine(
  group: SurgeRegionPolicyGroup,
  name: string,
  fallback: { testUrl: string; testInterval: number },
): string {
  const parts = [
    `${name} = ${group.type}`,
    "include-all-proxies=true",
    `policy-regex-filter=${formatToken(regionRegex(group.keywords))}`,
  ];
  appendPolicyGroupCommonParams(
    parts,
    {
      type: group.type,
      interval: fallback.testInterval,
      policyPriority: group.policyPriority,
    },
    fallback,
  );
  return parts.join(", ");
}

function buildProxyGroupLine(
  group: SurgeProxyGroup,
  name: string,
  groupNamesById: Map<string, string>,
  nodeNamesByOriginal: Map<string, string>,
  fallback: { testUrl: string; testInterval: number },
): string {
  const resolvedPolicies = group.policies
    .map((policy) => {
      if (group.type === "smart" && policy.kind !== "node") return null;
      return resolvePolicyName(policy, groupNamesById, nodeNamesByOriginal);
    })
    .filter((policy): policy is string => Boolean(policy));
  const allNodePolicies = group.includeAllNodes
    ? Array.from(nodeNamesByOriginal.values())
    : [];
  const uniquePolicies = Array.from(
    new Set([...resolvedPolicies, ...allNodePolicies]),
  );
  const parts = [`${name} = ${group.type}`, ...uniquePolicies.map(formatToken)];
  appendPolicyGroupCommonParams(parts, group, fallback);
  return parts.join(", ");
}

function buildRuleLine(
  rule: SurgeRule,
  groupNamesById: Map<string, string>,
  nodeNamesByOriginal: Map<string, string>,
): string | null {
  if (rule.enabled === false) return null;
  const target = resolvePolicyName(
    rule.target,
    groupNamesById,
    nodeNamesByOriginal,
  );
  if (!target) return null;
  if (rule.type === "FINAL") return `FINAL,${formatToken(target)}`;
  const value = stringValue(rule.value);
  if (!value) return null;
  const base = `${rule.type},${formatToken(value)},${formatToken(target)}`;
  return rule.noResolve ? `${base},no-resolve` : base;
}

function buildRuleSetLine(
  ruleSet: SurgeRuleSet,
  groupNamesById: Map<string, string>,
  nodeNamesByOriginal: Map<string, string>,
): string | null {
  if (ruleSet.enabled === false) return null;
  const url = stringValue(ruleSet.url);
  const target = resolvePolicyName(
    ruleSet.target,
    groupNamesById,
    nodeNamesByOriginal,
  );
  if (!url || !target) return null;
  const directive =
    ruleSet.resourceType === "domain-set" ? "DOMAIN-SET" : "RULE-SET";
  const base = `${directive},${formatToken(url)},${formatToken(target)}`;
  return ruleSet.noResolve && directive === "RULE-SET"
    ? `${base},no-resolve`
    : base;
}

function normalizeGeneralLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(
      (line) =>
        line.trim() &&
        !/^\s*\[(?:general|proxy|proxy group|rule|wireguard\b)/i.test(line),
    );
}

export function generateSurgeProfile(
  options: GenerateSurgeOptions,
): SurgeGenerationResult {
  const config = normalizeSurgeConfig(options.config);
  const nodes = Array.isArray(options.nodes) ? options.nodes : [];
  const supportedNodes = nodes.filter(isSupportedNode);
  const skippedNodes: SurgeSkippedNode[] = nodes
    .filter((node) => !isSupportedNode(node))
    .map((node) => ({
      name: stringValue((node as unknown as NodeRecord).name) || "未命名节点",
      type: getNodeType(node),
      reason: "Surge 不支持或暂未适配该协议",
    }));

  const nodeNamesByNode = ensureUniqueNames(
    supportedNodes,
    (node) => stringValue((node as unknown as NodeRecord).name),
    "Proxy ",
  );
  const nodeNamesByOriginal = new Map<string, string>();
  supportedNodes.forEach((node) => {
    const original = stringValue((node as unknown as NodeRecord).name);
    const finalName = nodeNamesByNode.get(node);
    if (original && finalName && !nodeNamesByOriginal.has(original))
      nodeNamesByOriginal.set(original, finalName);
  });

  const activeRegions = config.regionGroups.filter(
    (group) => group.enabled !== false,
  );
  const activeGroups = config.proxyGroups.filter(
    (group) => group.enabled !== false,
  );
  const regionNamesByGroup = ensureUniqueNames(
    activeRegions,
    (group) => group.name,
    "Region ",
  );
  const groupNamesByGroup = ensureUniqueNames(
    activeGroups,
    (group) => group.name,
    "Group ",
  );
  const groupNamesById = new Map<string, string>();
  activeRegions.forEach((group) => {
    const name = regionNamesByGroup.get(group);
    if (name) groupNamesById.set(group.id, name);
  });
  activeGroups.forEach((group) => {
    const name = groupNamesByGroup.get(group);
    if (name) groupNamesById.set(group.id, name);
  });

  const wireGuardSections: string[] = [];
  const proxyLines = supportedNodes
    .map((node, index) => {
      const name = nodeNamesByNode.get(node);
      if (!name) return null;
      const sectionName = `wg_${index + 1}`;
      const line = serializeProxyNode(
        node,
        name,
        wireGuardSections,
        sectionName,
      );
      if (!line) {
        skippedNodes.push({
          name,
          type: getNodeType(node),
          reason: "缺少 Surge 生成所需字段",
        });
      }
      return line;
    })
    .filter((line): line is string => Boolean(line));

  const fallback = {
    testUrl: config.testUrl,
    testInterval: config.testInterval,
  };
  const regionGroupLines = activeRegions.map((group) =>
    buildRegionGroupLine(
      group,
      regionNamesByGroup.get(group) || group.name,
      fallback,
    ),
  );
  const proxyGroupLines = activeGroups.map((group) => {
    const generatedGroup =
      group.id === "proxy"
        ? {
            ...group,
            policies: [
              ...activeRegions
                .filter((region) => region.includeInProxy !== false)
                .map((region): SurgePolicyRef => ({
                  kind: "group",
                  id: region.id,
                })),
              ...group.policies.filter(
                (policy) =>
                  policy.kind !== "group" ||
                  !activeRegions.some((region) => region.id === policy.id),
              ),
            ],
          }
        : group;
    return buildProxyGroupLine(
      generatedGroup,
      groupNamesByGroup.get(group) || group.name,
      groupNamesById,
      nodeNamesByOriginal,
      fallback,
    );
  });
  const ruleEntries: Array<{ key: string; line: string }> = [];
  for (const ruleSet of config.ruleSets) {
    const line = buildRuleSetLine(ruleSet, groupNamesById, nodeNamesByOriginal);
    if (line) ruleEntries.push({ key: `rule-set:${ruleSet.id}`, line });
  }
  const finalRuleLines: string[] = [];
  for (const rule of config.rules) {
    const line = buildRuleLine(rule, groupNamesById, nodeNamesByOriginal);
    if (!line) continue;
    if (rule.type === "FINAL") finalRuleLines.push(line);
    else ruleEntries.push({ key: `rule:${rule.id}`, line });
  }

  const ruleEntryByKey = new Map(
    ruleEntries.map((entry) => [entry.key, entry]),
  );
  const emittedRuleKeys = new Set<string>();
  const ruleLines: string[] = [];
  for (const key of config.ruleOrder ?? []) {
    const entry = ruleEntryByKey.get(key);
    if (!entry || emittedRuleKeys.has(entry.key)) continue;
    emittedRuleKeys.add(entry.key);
    ruleLines.push(entry.line);
  }
  for (const entry of ruleEntries) {
    if (emittedRuleKeys.has(entry.key)) continue;
    emittedRuleKeys.add(entry.key);
    ruleLines.push(entry.line);
  }
  if (finalRuleLines.length > 0) {
    ruleLines.push(...finalRuleLines);
  } else {
    const finalTarget =
      resolvePolicyName(
        config.finalTarget,
        groupNamesById,
        nodeNamesByOriginal,
      ) || "DIRECT";
    ruleLines.push(`FINAL,${formatToken(finalTarget)}`);
  }

  const lines: string[] = [];
  if (config.managedConfigEnabled && stringValue(config.managedConfigUrl)) {
    const managedConfigInterval =
      numberValue(config.managedConfigInterval) ??
      DEFAULT_SURGE_MANAGED_CONFIG_INTERVAL;
    lines.push(
      `#!MANAGED-CONFIG ${stringValue(config.managedConfigUrl)} interval=${Math.max(1, Math.floor(managedConfigInterval))} strict=false`,
      "",
    );
  }
  lines.push("[General]");
  lines.push(...normalizeGeneralLines(config.generalText));
  lines.push("", "[Proxy]");
  lines.push(...proxyLines);
  if (skippedNodes.length > 0) {
    lines.push(
      `# SubBoost 已跳过 ${skippedNodes.length} 个 Surge 不支持或字段不完整的节点`,
    );
  }
  lines.push("", "[Proxy Group]");
  lines.push(...proxyGroupLines, ...regionGroupLines);
  lines.push("", "[Rule]");
  lines.push(...ruleLines);
  if (wireGuardSections.length > 0) {
    lines.push(
      "",
      ...wireGuardSections.flatMap((section, index) =>
        index === 0 ? [section] : ["", section],
      ),
    );
  }

  return {
    content: lines.join("\n"),
    proxyCount: proxyLines.length,
    policyGroupCount: regionGroupLines.length + proxyGroupLines.length,
    ruleCount: ruleLines.length,
    skippedNodes,
  };
}

export function generateSurgeConfig(options: GenerateSurgeOptions): string {
  return generateSurgeProfile(options).content;
}
