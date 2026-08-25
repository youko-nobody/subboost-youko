import { encodeBase64 } from "@subboost/core/parser/base64";
import type { ParsedNode } from "@subboost/core/types/node";

type NodeRecord = Record<string, unknown>;
type QueryValue = string | number | boolean | null | undefined;

export type V2RaySubscriptionContent = {
  content: string;
  links: string[];
  skippedNodeCount: number;
};

function asRecord(value: unknown): NodeRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as NodeRecord) : {};
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(stringValue).filter(Boolean);
  }
  const single = stringValue(value);
  return single ? [single] : [];
}

function booleanValue(value: unknown): boolean {
  return value === true;
}

function toBase64Url(value: string): string {
  return encodeBase64(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function formatHost(server: string): string {
  const value = server.trim();
  if (value.includes(":") && !value.startsWith("[") && !value.endsWith("]")) {
    return `[${value}]`;
  }
  return value;
}

function encodeFragment(name: string): string {
  return encodeURIComponent(name.trim() || "Proxy");
}

function buildQuery(entries: Array<[string, QueryValue]>): string {
  const params = new URLSearchParams();
  for (const [key, value] of entries) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, typeof value === "boolean" ? (value ? "1" : "0") : String(value));
  }
  return params.toString();
}

function appendQueryAndName(base: string, name: string, entries: Array<[string, QueryValue]> = []): string {
  const query = buildQuery(entries);
  return `${base}${query ? `?${query}` : ""}#${encodeFragment(name)}`;
}

function getHeaderValue(headers: unknown, name: string): string {
  const record = asRecord(headers);
  for (const [key, value] of Object.entries(record)) {
    if (key.toLowerCase() !== name.toLowerCase()) continue;
    return stringList(value).join(",");
  }
  return "";
}

function getWsHost(record: NodeRecord): string {
  return getHeaderValue(asRecord(record["ws-opts"]).headers, "host");
}

function getHttpHost(record: NodeRecord): string {
  return getHeaderValue(asRecord(record["http-opts"]).headers, "host");
}

function getFirstPath(value: unknown, fallback = "/"): string {
  return stringList(value)[0] || fallback;
}

function getGrpcServiceName(record: NodeRecord): string {
  return stringValue(asRecord(record["grpc-opts"])["grpc-service-name"]);
}

function hasHttpUpgrade(record: NodeRecord): boolean {
  return booleanValue(asRecord(record["ws-opts"])["v2ray-http-upgrade"]);
}

function getAlpn(record: NodeRecord): string {
  return stringList(record.alpn).join(",");
}

function getSkipCertVerify(record: NodeRecord): boolean {
  return booleanValue(record["skip-cert-verify"]);
}

function pluginValue(plugin: string, rawOptions: unknown): string {
  const options = asRecord(rawOptions);
  const escape = (value: string) => value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/=/g, "\\=");
  const parts = [plugin.trim()];
  for (const [key, rawValue] of Object.entries(options)) {
    if (!key.trim() || rawValue === undefined || rawValue === null || rawValue === false) continue;
    if (rawValue === true) {
      parts.push(key.trim());
      continue;
    }
    const value = stringValue(rawValue) || (numberValue(rawValue) !== undefined ? String(rawValue) : "");
    if (value) parts.push(`${key.trim()}=${escape(value)}`);
  }
  return parts.filter(Boolean).join(";");
}

function serializeSs(node: NodeRecord): string | null {
  const cipher = stringValue(node.cipher);
  const password = stringValue(node.password);
  const server = stringValue(node.server);
  const port = numberValue(node.port);
  if (!cipher || !password || !server || !port) return null;

  const plugin = stringValue(node.plugin);
  const pluginOptions = plugin ? pluginValue(plugin, node["plugin-opts"]) : "";
  return appendQueryAndName(
    `ss://${toBase64Url(`${cipher}:${password}`)}@${formatHost(server)}:${port}`,
    stringValue(node.name),
    [
      ["plugin", pluginOptions],
      ["uot", booleanValue(node["udp-over-tcp"]) ? "1" : undefined],
      ["tfo", booleanValue(node.tfo) ? "1" : undefined],
    ]
  );
}

function serializeSsr(node: NodeRecord): string | null {
  const server = stringValue(node.server);
  const port = numberValue(node.port);
  const protocol = stringValue(node.protocol);
  const cipher = stringValue(node.cipher);
  const obfs = stringValue(node.obfs);
  const password = stringValue(node.password);
  if (!server || !port || !protocol || !cipher || !obfs || !password) return null;

  const params = buildQuery([
    ["remarks", toBase64Url(stringValue(node.name) || "SSR")],
    ["protoparam", stringValue(node["protocol-param"]) ? toBase64Url(stringValue(node["protocol-param"])) : undefined],
    ["obfsparam", stringValue(node["obfs-param"]) ? toBase64Url(stringValue(node["obfs-param"])) : undefined],
  ]);
  const payload = `${formatHost(server)}:${port}:${protocol}:${cipher}:${obfs}:${toBase64Url(password)}/?${params}`;
  return `ssr://${toBase64Url(payload)}`;
}

function serializeVmess(node: NodeRecord): string | null {
  const server = stringValue(node.server);
  const port = numberValue(node.port);
  const uuid = stringValue(node.uuid);
  if (!server || !port || !uuid) return null;

  const network = stringValue(node.network) || "tcp";
  const wsOptions = asRecord(node["ws-opts"]);
  const h2Options = asRecord(node["h2-opts"]);
  const httpOptions = asRecord(node["http-opts"]);
  const grpcOptions = asRecord(node["grpc-opts"]);
  const host =
    network === "ws"
      ? getHeaderValue(wsOptions.headers, "host")
      : network === "h2"
        ? stringList(h2Options.host).join(",")
        : network === "http"
          ? getHeaderValue(httpOptions.headers, "host")
          : "";
  const path =
    network === "ws"
      ? stringValue(wsOptions.path) || "/"
      : network === "h2"
        ? stringValue(h2Options.path) || "/"
        : network === "http"
          ? getFirstPath(httpOptions.path)
          : network === "grpc"
            ? stringValue(grpcOptions["grpc-service-name"])
            : "";
  const payload: Record<string, string> = {
    v: "2",
    ps: stringValue(node.name) || `VMess-${server}:${port}`,
    add: server,
    port: String(port),
    id: uuid,
    aid: String(numberValue(node.alterId) ?? 0),
    scy: stringValue(node.cipher) || "auto",
    net: network === "http" ? "tcp" : network,
    type: network === "http" ? "http" : "none",
    host,
    path,
    tls: booleanValue(node.tls) ? "tls" : "",
    sni: stringValue(node.servername),
    alpn: getAlpn(node),
    fp: stringValue(node["client-fingerprint"]),
    allowInsecure: getSkipCertVerify(node) ? "1" : "0",
    "packet-encoding": stringValue(node["packet-encoding"]),
    "authenticated-length": booleanValue(node["authenticated-length"]) ? "1" : "",
    "global-padding": booleanValue(node["global-padding"]) ? "1" : "",
  };
  return `vmess://${encodeBase64(JSON.stringify(payload))}`;
}

function serializeVless(node: NodeRecord): string | null {
  const uuid = stringValue(node.uuid);
  const server = stringValue(node.server);
  const port = numberValue(node.port);
  if (!uuid || !server || !port) return null;

  const network = stringValue(node.network) || "tcp";
  const reality = asRecord(node["reality-opts"]);
  const hasReality = Object.keys(reality).length > 0;
  const xhttp = asRecord(node["xhttp-opts"]);
  const xhttpHeaders = asRecord(xhttp.headers);
  const xhttpReuse = asRecord(xhttp["reuse-settings"]);
  const xhttpDownload = asRecord(xhttp["download-settings"]);
  const host =
    network === "ws"
      ? getWsHost(node)
      : network === "h2"
        ? stringList(asRecord(node["h2-opts"]).host).join(",")
        : network === "http"
          ? getHttpHost(node)
          : network === "xhttp"
            ? stringValue(xhttp.host)
            : "";
  const path =
    network === "ws"
      ? stringValue(asRecord(node["ws-opts"]).path) || "/"
      : network === "h2"
        ? stringValue(asRecord(node["h2-opts"]).path) || "/"
        : network === "http"
          ? getFirstPath(asRecord(node["http-opts"]).path)
          : network === "grpc"
            ? getGrpcServiceName(node)
            : network === "xhttp"
              ? stringValue(xhttp.path) || "/"
              : "";
  const grpcOptions = asRecord(node["grpc-opts"]);
  const security = hasReality ? "reality" : booleanValue(node.tls) ? "tls" : "none";

  return appendQueryAndName(
    `vless://${encodeURIComponent(uuid)}@${formatHost(server)}:${port}`,
    stringValue(node.name),
    [
      ["encryption", stringValue(node.encryption) || "none"],
      ["flow", stringValue(node.flow)],
      ["security", security],
      ["sni", stringValue(node.servername)],
      ["alpn", getAlpn(node)],
      ["fp", stringValue(node["client-fingerprint"])],
      ["allowInsecure", getSkipCertVerify(node) ? "1" : undefined],
      ["type", network],
      ["host", host],
      ["path", path],
      ["serviceName", network === "grpc" ? getGrpcServiceName(node) : undefined],
      ["mode", network === "grpc" ? stringValue(grpcOptions._grpcType) : undefined],
      ["authority", network === "grpc" ? stringValue(grpcOptions._grpcAuthority) : undefined],
      ["pbk", hasReality ? stringValue(reality["public-key"]) : undefined],
      ["sid", hasReality ? stringValue(reality["short-id"]) : undefined],
      ["spx", hasReality ? stringValue(reality["_spider-x"]) : undefined],
      ["pcs", stringValue(node.pcs)],
      ["pqv", stringValue(node.pqv)],
      ["xhttp-mode", network === "xhttp" ? stringValue(xhttp.mode) : undefined],
      ["xhttp-headers", network === "xhttp" && Object.keys(xhttpHeaders).length > 0 ? JSON.stringify(xhttpHeaders) : undefined],
      ["no-grpc-header", network === "xhttp" && booleanValue(xhttp["no-grpc-header"]) ? "1" : undefined],
      ["x-padding-bytes", network === "xhttp" ? stringValue(xhttp["x-padding-bytes"]) : undefined],
      ["sc-max-each-post-bytes", network === "xhttp" ? numberValue(xhttp["sc-max-each-post-bytes"]) : undefined],
      ["max-concurrency", network === "xhttp" ? stringValue(xhttpReuse["max-concurrency"]) : undefined],
      ["max-connections", network === "xhttp" ? stringValue(xhttpReuse["max-connections"]) : undefined],
      ["c-max-reuse-times", network === "xhttp" ? stringValue(xhttpReuse["c-max-reuse-times"]) : undefined],
      ["h-max-request-times", network === "xhttp" ? stringValue(xhttpReuse["h-max-request-times"]) : undefined],
      ["h-max-reusable-secs", network === "xhttp" ? stringValue(xhttpReuse["h-max-reusable-secs"]) : undefined],
      ["download-path", network === "xhttp" ? stringValue(xhttpDownload.path) : undefined],
      ["download-host", network === "xhttp" ? stringValue(xhttpDownload.host) : undefined],
      [
        "download-headers",
        network === "xhttp" && Object.keys(asRecord(xhttpDownload.headers)).length > 0
          ? JSON.stringify(asRecord(xhttpDownload.headers))
          : undefined,
      ],
    ]
  );
}

function serializeTrojan(node: NodeRecord): string | null {
  const password = stringValue(node.password);
  const server = stringValue(node.server);
  const port = numberValue(node.port);
  if (!password || !server || !port) return null;

  const network = stringValue(node.network) || "tcp";
  const grpcOptions = asRecord(node["grpc-opts"]);
  return appendQueryAndName(
    `trojan://${encodeURIComponent(password)}@${formatHost(server)}:${port}`,
    stringValue(node.name),
    [
      ["security", "tls"],
      ["sni", stringValue(node.sni)],
      ["alpn", getAlpn(node)],
      ["fp", stringValue(node["client-fingerprint"])],
      ["allowInsecure", getSkipCertVerify(node) ? "1" : undefined],
      ["type", network === "ws" && hasHttpUpgrade(node) ? "httpupgrade" : network],
      ["host", network === "ws" ? getWsHost(node) : undefined],
      ["path", network === "ws" ? stringValue(asRecord(node["ws-opts"]).path) || "/" : undefined],
      ["serviceName", network === "grpc" ? getGrpcServiceName(node) : undefined],
      ["mode", network === "grpc" ? stringValue(grpcOptions._grpcType) : undefined],
      ["authority", network === "grpc" ? stringValue(grpcOptions._grpcAuthority) : undefined],
    ]
  );
}

function serializeAnyTls(node: NodeRecord): string | null {
  const password = stringValue(node.password);
  const server = stringValue(node.server);
  const port = numberValue(node.port);
  if (!password || !server || !port) return null;

  return appendQueryAndName(
    `anytls://${encodeURIComponent(password)}@${formatHost(server)}:${port}`,
    stringValue(node.name),
    [
      ["security", "tls"],
      ["sni", stringValue(node.sni)],
      ["alpn", getAlpn(node)],
      ["fp", stringValue(node["client-fingerprint"])],
      ["allowInsecure", getSkipCertVerify(node) ? "1" : undefined],
      ["pcs", stringValue(node.pcs)],
      ["pqv", stringValue(node.pqv)],
      ["idle-session-check-interval", numberValue(node["idle-session-check-interval"])],
      ["idle-session-timeout", numberValue(node["idle-session-timeout"])],
      ["min-idle-session", numberValue(node["min-idle-session"])],
      ["padding-scheme", stringValue(node["padding-scheme"])],
    ]
  );
}

function serializeHysteria(node: NodeRecord): string | null {
  const server = stringValue(node.server);
  const port = numberValue(node.port);
  if (!server || !port) return null;

  return appendQueryAndName(
    `hysteria://${formatHost(server)}:${port}`,
    stringValue(node.name),
    [
      ["protocol", stringValue(node.protocol) || "udp"],
      ["auth", stringValue(node["auth-str"])],
      ["sni", stringValue(node.sni)],
      ["alpn", getAlpn(node)],
      ["insecure", getSkipCertVerify(node) ? "1" : undefined],
      ["up", stringValue(node.up)],
      ["down", stringValue(node.down)],
      ["mport", stringValue(node.ports)],
      ["obfs", stringValue(node._obfs)],
      ["obfsParam", stringValue(node.obfs)],
      ["fast-open", booleanValue(node.tfo) ? "1" : undefined],
    ]
  );
}

function serializeHysteria2(node: NodeRecord): string | null {
  const password = stringValue(node.password);
  const server = stringValue(node.server);
  const port = numberValue(node.port);
  if (!password || !server || !port) return null;

  return appendQueryAndName(
    `hysteria2://${encodeURIComponent(password)}@${formatHost(server)}:${port}`,
    stringValue(node.name),
    [
      ["sni", stringValue(node.sni)],
      ["alpn", getAlpn(node)],
      ["insecure", getSkipCertVerify(node) ? "1" : undefined],
      ["obfs", stringValue(node.obfs)],
      ["obfs-password", stringValue(node["obfs-password"])],
      ["up", stringValue(node.up)],
      ["down", stringValue(node.down)],
      ["mport", stringValue(node.ports)],
      ["hop-interval", stringValue(node["hop-interval"]) || numberValue(node["hop-interval"])],
      ["fp", stringValue(node.fingerprint)],
      ["mldsa65-seed", stringValue(node["mldsa65-seed"])],
    ]
  );
}

function serializeTuic(node: NodeRecord): string | null {
  const server = stringValue(node.server);
  const port = numberValue(node.port);
  const uuid = stringValue(node.uuid);
  const password = stringValue(node.password);
  const token = stringValue(node.token);
  if (!server || !port || (!token && (!uuid || !password))) return null;

  const auth = token || `${encodeURIComponent(uuid)}:${encodeURIComponent(password)}`;
  return appendQueryAndName(
    `tuic://${auth}@${formatHost(server)}:${port}`,
    stringValue(node.name),
    [
      ["sni", stringValue(node.sni)],
      ["alpn", getAlpn(node)],
      ["congestion_control", stringValue(node["congestion-controller"])],
      ["udp_relay_mode", stringValue(node["udp-relay-mode"])],
      ["request-timeout", numberValue(node["request-timeout"])],
      ["heartbeat-interval", numberValue(node["heartbeat-interval"])],
      ["max-open-streams", numberValue(node["max-open-streams"])],
      ["max-idle-time", numberValue(node["max-idle-time"])],
      ["reduce_rtt", booleanValue(node["reduce-rtt"]) ? "1" : undefined],
      ["fast_open", booleanValue(node.tfo) ? "1" : undefined],
      ["allow_insecure", getSkipCertVerify(node) ? "1" : undefined],
      ["disable_sni", booleanValue(node["disable-sni"]) ? "1" : undefined],
    ]
  );
}

function serializeSimpleProxy(node: NodeRecord): string | null {
  const type = stringValue(node.type);
  const server = stringValue(node.server);
  const port = numberValue(node.port);
  if (!server || !port) return null;

  if (type === "socks4" || type === "socks5") {
    const scheme = type === "socks5" && booleanValue(node.tls) ? "socks5+tls" : type;
    const username = stringValue(node.username);
    const password = stringValue(node.password);
    const auth = username ? `${encodeURIComponent(username)}${password ? `:${encodeURIComponent(password)}` : ""}@` : "";
    return appendQueryAndName(`${scheme}://${auth}${formatHost(server)}:${port}`, stringValue(node.name), [
      ["udp", booleanValue(node.udp) ? "1" : undefined],
      ["sni", stringValue(node.sni)],
      ["allowInsecure", getSkipCertVerify(node) ? "1" : undefined],
    ]);
  }

  if (type === "http" || type === "https") {
    const username = stringValue(node.username);
    const password = stringValue(node.password);
    const auth = username ? `${encodeURIComponent(username)}${password ? `:${encodeURIComponent(password)}` : ""}@` : "";
    const headers = asRecord(node.headers);
    return appendQueryAndName(`${type}://${auth}${formatHost(server)}:${port}`, stringValue(node.name), [
      ["sni", stringValue(node.sni)],
      ["allowInsecure", getSkipCertVerify(node) ? "1" : undefined],
      ["headers", Object.keys(headers).length > 0 ? JSON.stringify(headers) : undefined],
    ]);
  }

  return null;
}

export function serializeNodeAsV2RayUri(node: ParsedNode): string | null {
  const record = node as unknown as NodeRecord;
  switch (stringValue(record.type).toLowerCase()) {
    case "ss":
      return serializeSs(record);
    case "ssr":
      return serializeSsr(record);
    case "vmess":
      return serializeVmess(record);
    case "vless":
      return serializeVless(record);
    case "trojan":
      return serializeTrojan(record);
    case "anytls":
      return serializeAnyTls(record);
    case "hysteria":
      return serializeHysteria(record);
    case "hysteria2":
      return serializeHysteria2(record);
    case "tuic":
      return serializeTuic(record);
    case "socks4":
    case "socks5":
    case "http":
    case "https":
      return serializeSimpleProxy(record);
    default:
      return null;
  }
}

export function buildV2RaySubscriptionContent(nodes: ParsedNode[]): V2RaySubscriptionContent {
  const links = nodes
    .map((node) => serializeNodeAsV2RayUri(node))
    .filter((link): link is string => Boolean(link));
  return {
    content: encodeBase64(links.join("\n")),
    links,
    skippedNodeCount: Math.max(0, nodes.length - links.length),
  };
}

export function buildV2RaySubscriptionUrl(subscriptionUrl: string): string {
  try {
    const url = new URL(subscriptionUrl);
    if (/\/config\.ya?ml$/i.test(url.pathname)) {
      url.pathname = url.pathname.replace(/\/config\.ya?ml$/i, "/v2ray");
    } else {
      url.pathname = `${url.pathname.replace(/\/+$/, "")}/v2ray`;
    }
    return url.toString();
  } catch {
    const [base, suffix = ""] = subscriptionUrl.split(/([?#].*)/, 2);
    const next = /\/config\.ya?ml$/i.test(base)
      ? base.replace(/\/config\.ya?ml$/i, "/v2ray")
      : `${base.replace(/\/+$/, "")}/v2ray`;
    return `${next}${suffix}`;
  }
}
