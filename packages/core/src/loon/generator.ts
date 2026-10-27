import type { ParsedNode } from "@subboost/core/types/node";
import { normalizeLoonConfig } from "./defaults";
import type {
  LoonConfig,
  LoonGenerationResult,
  LoonPolicyRef,
  LoonProxyGroup,
  LoonRemoteRule,
  LoonRule,
  LoonSkippedNode,
} from "./types";

type NodeRecord = Record<string, unknown>;

export interface GenerateLoonOptions {
  nodes: ParsedNode[];
  config?: Partial<LoonConfig> | LoonConfig;
}

const SUPPORTED_TYPES = new Set([
  "ss", "ssr", "vmess", "vless", "trojan", "hysteria2", "wireguard", "http", "https",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function bool(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function quote(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/[\r\n]/g, " ")}"`;
}

function token(value: string): string {
  return /[,#;\r\n]/.test(value) ? quote(value) : value;
}

function safeName(value: string, fallback: string): string {
  return value.replace(/[\r\n=,]/g, " ").replace(/\s+/g, " ").trim() || fallback;
}

function uniqueNames<T>(items: T[], getName: (item: T, index: number) => string, prefix: string): Map<T, string> {
  const result = new Map<T, string>();
  const seen = new Set<string>();
  items.forEach((item, index) => {
    const base = safeName(getName(item, index), `${prefix}${index + 1}`);
    let name = base;
    let suffix = 2;
    while (seen.has(name)) name = `${base} (${suffix++})`;
    seen.add(name);
    result.set(item, name);
  });
  return result;
}

function nodeType(node: ParsedNode): string {
  return str((node as unknown as NodeRecord).type).toLowerCase() || "unknown";
}

function parameter(out: string[], name: string, value: unknown, forceQuote = false) {
  if (value === undefined || value === null || value === "") return;
  const rendered = typeof value === "boolean" ? String(value) : String(value);
  out.push(`${name}=${forceQuote ? quote(rendered) : token(rendered)}`);
}

function base(name: string, type: string, record: NodeRecord): string[] | null {
  const server = str(record.server);
  const port = num(record.port);
  if (!server || !port) return null;
  return [`${name} = ${type}`, token(server), String(port)];
}

function appendTls(record: NodeRecord, out: string[]) {
  const tls = bool(record.tls);
  if (tls !== undefined) parameter(out, "over-tls", tls);
  parameter(out, "sni", str(record.sni) || str(record.servername));
  const skip = bool(record["skip-cert-verify"]);
  if (skip !== undefined) parameter(out, "skip-cert-verify", skip);
  const udp = bool(record.udp);
  if (udp !== undefined) parameter(out, "udp", udp);
  const tfo = bool(record.tfo);
  if (tfo !== undefined) parameter(out, "fast-open", tfo);
}

function appendTransport(record: NodeRecord, out: string[]): boolean {
  const transport = str(record.network).toLowerCase() || "tcp";
  if (transport === "tcp") {
    parameter(out, "transport", transport);
    return true;
  }
  if (transport !== "ws" && transport !== "http") return false;
  const optsKey = transport === "ws" ? "ws-opts" : "http-opts";
  const opts = isRecord(record[optsKey]) ? record[optsKey] as NodeRecord : {};
  parameter(out, "transport", transport);
  const path = Array.isArray(opts.path) ? str(opts.path[0]) : str(opts.path);
  parameter(out, "path", path || "/");
  const headers = isRecord(opts.headers) ? opts.headers : {};
  const host = str(headers.Host) || str(headers.host);
  parameter(out, "host", host);
  return true;
}

function serializeNode(name: string, record: NodeRecord): string | null {
  const type = str(record.type).toLowerCase();
  if (type === "wireguard") {
    const peerList = Array.isArray(record.peers) ? record.peers : [];
    const peer = peerList.find(isRecord) ?? record;
    const server = str(peer.server) || str(record.server);
    const port = num(peer.port) || num(record.port);
    const privateKey = str(record["private-key"]);
    const publicKey = str(peer["public-key"]) || str(record["public-key"]);
    if (!server || !port || !privateKey || !publicKey) return null;
    const peerParts = [
      `public-key=${quote(publicKey)}`,
      ...(str(peer["pre-shared-key"]) ? [`preshared-key=${quote(str(peer["pre-shared-key"]))}`] : []),
      ...(Array.isArray(peer.reserved) && peer.reserved.length ? [`reserved=[${peer.reserved.join(",")}]`] : []),
      ...(Array.isArray(peer["allowed-ips"]) && peer["allowed-ips"].length
        ? [`allowed-ips=${quote(peer["allowed-ips"].map(String).join(","))}`]
        : []),
      `endpoint=${server}:${port}`,
    ];
    return [
      `${name} = wireguard`,
      ...(str(record.ip) ? [`interface-ip=${str(record.ip)}`] : []),
      ...(str(record.ipv6) ? [`interface-ipv6=${str(record.ipv6)}`] : []),
      `private-key=${quote(privateKey)}`,
      ...(num(record.mtu) ? [`mtu=${num(record.mtu)}`] : []),
      ...(Array.isArray(record.dns) && record.dns.length ? [`dns=${record.dns.map(String).join(",")}`] : []),
      ...(num(record.keepalive) ? [`keepalive=${num(record.keepalive)}`] : []),
      `peers=[{${peerParts.join(",")}}]`,
    ].join(",");
  }
  if (type === "ss" || type === "ssr") {
    const out = base(name, type === "ss" ? "shadowsocks" : "shadowsocksr", record);
    const cipher = str(record.cipher);
    const password = str(record.password);
    if (!out || !cipher || !password) return null;
    out.push(cipher, quote(password));
    const pluginOpts = isRecord(record["plugin-opts"]) ? record["plugin-opts"] as NodeRecord : {};
    if (type === "ss" && str(record.plugin).toLowerCase() === "obfs") {
      parameter(out, "obfs-name", str(pluginOpts.mode));
      parameter(out, "obfs-host", str(pluginOpts.host));
      parameter(out, "obfs-uri", str(pluginOpts.path));
    }
    if (type === "ssr") {
      parameter(out, "protocol", str(record.protocol));
      parameter(out, "protocol-param", str(record["protocol-param"]));
      parameter(out, "obfs", str(record.obfs));
      parameter(out, "obfs-param", str(record["obfs-param"]));
    }
    appendTls(record, out);
    return out.join(", ");
  }

  if (type === "vmess" || type === "vless") {
    const out = base(name, type, record);
    const uuid = str(record.uuid);
    if (!out || !uuid) return null;
    if (type === "vmess") {
      const cipher = str(record.cipher);
      if (!cipher) return null;
      out.push(cipher, quote(uuid));
      parameter(out, "alterId", num(record.alterId) ?? 0);
    } else {
      out.push(quote(uuid));
      if (!appendTransport(record, out)) return null;
      parameter(out, "flow", str(record.flow));
      const reality = isRecord(record["reality-opts"]) ? record["reality-opts"] as NodeRecord : {};
      parameter(out, "public-key", str(reality["public-key"]), true);
      parameter(out, "short-id", str(reality["short-id"]));
    }
    if (type === "vmess" && !appendTransport(record, out)) return null;
    appendTls(record, out);
    return out.join(", ");
  }

  if (type === "trojan" || type === "hysteria2") {
    const out = base(name, type, record);
    const password = str(record.password);
    if (!out || !password) return null;
    out.push(quote(password));
    if (type === "trojan" && !appendTransport(record, out)) return null;
    if (type === "hysteria2") {
      parameter(out, "download-bandwidth", str(record.down));
      if (str(record.obfs) === "salamander") parameter(out, "salamander-password", str(record["obfs-password"]), true);
    }
    appendTls(record, out);
    return out.join(", ");
  }

  if (type === "http" || type === "https" || type === "socks5") {
    const out = base(name, type === "https" || (type === "http" && record.tls === true) ? "https" : type, record);
    if (!out) return null;
    if (str(record.username)) out.push(token(str(record.username)));
    if (str(record.password)) out.push(quote(str(record.password)));
    appendTls(record, out);
    return out.join(", ");
  }
  return null;
}

function policyName(target: LoonPolicyRef | string | undefined, groupNames: Map<string, string>, nodeNames: Map<string, string>): string | null {
  if (!target) return null;
  if (typeof target === "string") return target.trim() || null;
  if (target.kind === "direct") return "DIRECT";
  if (target.kind === "reject") return "REJECT";
  if (target.kind === "group") return groupNames.get(target.id) ?? null;
  return nodeNames.get(target.name) ?? null;
}

function compileRegex(pattern?: string): RegExp | null {
  if (!pattern?.trim()) return null;
  try { return new RegExp(pattern, "i"); } catch { return null; }
}

function groupMembers(group: LoonProxyGroup, nodeNames: Map<string, string>, groupNames: Map<string, string>): string[] {
  const members = group.policies.map((ref) => policyName(ref, groupNames, nodeNames)).filter((name): name is string => Boolean(name));
  const include = compileRegex(group.includeRegex);
  const exclude = compileRegex(group.excludeRegex);
  if (include) {
    for (const [original, finalName] of nodeNames) {
      if (include.test(original) && !exclude?.test(original)) members.push(finalName);
    }
  }
  return [...new Set(members)];
}

function groupLine(group: LoonProxyGroup, groupName: string, nodeNames: Map<string, string>, groupNames: Map<string, string>, config: LoonConfig): string {
  const members = groupMembers(group, nodeNames, groupNames);
  const fields = [`${groupName} = ${group.type}`, ...members.map(token)];
  if (/^https?:\/\//i.test(str(group.icon))) parameter(fields, "img-url", str(group.icon));
  if (group.type !== "select") {
    parameter(fields, "url", group.url || config.testUrl);
    parameter(fields, "interval", group.interval || config.testInterval);
    if (group.type === "url-test" && group.tolerance) parameter(fields, "tolerance", group.tolerance);
    if (group.type !== "url-test" && group.maxTimeout) parameter(fields, "max-timeout", group.maxTimeout);
    if (group.type === "load-balance") parameter(fields, "algorithm", group.algorithm || "pcc");
  }
  return fields.join(", ");
}

function ruleLine(rule: LoonRule, groupNames: Map<string, string>, nodeNames: Map<string, string>): string | null {
  if (rule.enabled === false || !rule.value.trim()) return null;
  const target = policyName(rule.target, groupNames, nodeNames);
  if (!target) return null;
  const baseLine = `${rule.type},${token(rule.value)},${token(target)}`;
  return rule.noResolve ? `${baseLine},no-resolve` : baseLine;
}

function remoteRuleLine(rule: LoonRemoteRule, groupNames: Map<string, string>, nodeNames: Map<string, string>): string | null {
  if (rule.enabled === false) return null;
  const url = rule.url.trim();
  const target = policyName(rule.target, groupNames, nodeNames);
  if (!url || !target) return null;
  return `${token(url)},policy=${token(target)},enabled=true`;
}

function cleanGeneralText(value: string): string[] {
  return value.split(/\r?\n/).map((line) => line.trimEnd()).filter((line) => line.trim() && !/^\s*\[(?:general|proxy|proxy group|rule|remote rule)\]/i.test(line));
}

export function generateLoonProfile(options: GenerateLoonOptions): LoonGenerationResult {
  const config = normalizeLoonConfig(options.config);
  const nodes = Array.isArray(options.nodes) ? options.nodes : [];
  const supported = nodes.filter((node) => SUPPORTED_TYPES.has(nodeType(node)));
  const skippedNodes: LoonSkippedNode[] = nodes.filter((node) => !SUPPORTED_TYPES.has(nodeType(node))).map((node) => ({
    name: str((node as unknown as NodeRecord).name) || "未命名节点",
    type: nodeType(node),
    reason: "Loon 目前不支持或 SubBoost 尚未适配该节点协议",
  }));
  const nameByNode = uniqueNames(supported, (node) => str((node as unknown as NodeRecord).name), "Proxy ");
  const nodeNames = new Map<string, string>();
  for (const node of supported) {
    const original = str((node as unknown as NodeRecord).name);
    const finalName = nameByNode.get(node);
    if (original && finalName && !nodeNames.has(original)) nodeNames.set(original, finalName);
  }

  const groups = config.proxyGroups.filter((group) => group.enabled !== false);
  const nameByGroup = uniqueNames(groups, (group) => group.name, "Group ");
  const groupNames = new Map(groups.map((group) => [group.id, nameByGroup.get(group)!]));
  const proxyLines: string[] = [];
  for (const node of supported) {
    const name = nameByNode.get(node);
    if (!name) continue;
    const line = serializeNode(name, node as unknown as NodeRecord);
    if (line) proxyLines.push(line);
    else skippedNodes.push({ name, type: nodeType(node), reason: "节点缺少 Loon 生成所需字段" });
  }

  const proxyGroupLines = groups.map((group) => groupLine(group, nameByGroup.get(group)!, nodeNames, groupNames, config));
  const remoteLines = config.remoteRules.map((rule) => remoteRuleLine(rule, groupNames, nodeNames)).filter((line): line is string => Boolean(line));
  const ruleLines = config.rules.map((rule) => ruleLine(rule, groupNames, nodeNames)).filter((line): line is string => Boolean(line));
  const finalTarget = policyName(config.finalTarget, groupNames, nodeNames) || "DIRECT";

  const lines = [
    "[General]",
    ...cleanGeneralText(config.generalText),
    "",
    "[Proxy]",
    ...proxyLines,
    ...(skippedNodes.length ? [`# SubBoost skipped ${skippedNodes.length} unsupported or incomplete node(s)`] : []),
    "",
    "[Proxy Group]",
    ...proxyGroupLines,
    "",
    "[Remote Rule]",
    ...remoteLines,
    "",
    "[Rule]",
    ...ruleLines,
    `FINAL,${token(finalTarget)}`,
  ];

  return {
    content: lines.join("\n"),
    proxyCount: proxyLines.length,
    policyGroupCount: proxyGroupLines.length,
    ruleCount: remoteLines.length + ruleLines.length + 1,
    skippedNodes,
  };
}

export function generateLoonConfig(options: GenerateLoonOptions): string {
  return generateLoonProfile(options).content;
}
