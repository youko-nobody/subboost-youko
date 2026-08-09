import type { MieruNode } from "@subboost/core/types/node";
import { parseUrlWithNeutralScheme, safeDecodeFormUrlEncoded, safeDecodeURIComponent } from "./url-decode";

function pickParam(params: URLSearchParams, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = params.get(key);
    if (typeof value !== "string") continue;
    const trimmed = safeDecodeURIComponent(value).trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

function parseIntegerParam(params: URLSearchParams, keys: string[]): number | undefined {
  const value = pickParam(params, keys);
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : undefined;
}

function parseBooleanParam(params: URLSearchParams, keys: string[]): boolean | undefined {
  const value = pickParam(params, keys);
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return undefined;
}

function normalizeTransport(value: string | undefined): string | undefined {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === "tcp") return "tcp";
  if (normalized === "udp") return "udp";
  return normalized;
}

function ensureValidPort(port: number | undefined): number {
  if (!Number.isInteger(port) || port! <= 0 || port! > 65535) {
    throw new Error("无效的端口号");
  }
  return port!;
}

export function parseMieru(uri: string): MieruNode {
  if (!uri.startsWith("mierus://")) {
    throw new Error("无效的 Mieru 链接");
  }

  const url = parseUrlWithNeutralScheme(uri);
  const params = url.searchParams;
  const server = url.hostname;
  const port = ensureValidPort(
    url.port ? Number.parseInt(url.port, 10) : parseIntegerParam(params, ["port"])
  );
  const username = safeDecodeURIComponent(url.username) || pickParam(params, ["username", "user"]);
  const password = safeDecodeURIComponent(url.password) || pickParam(params, ["password", "passwd", "pass"]);
  const name =
    safeDecodeFormUrlEncoded(url.hash.slice(1)) ||
    pickParam(params, ["remarks", "remark", "name", "tag", "ps"]) ||
    `Mieru-${server}:${port}`;

  if (!server || !username || !password) {
    throw new Error("Mieru 配置缺少必要字段");
  }

  const node: MieruNode = {
    name,
    type: "mieru",
    server,
    port,
    username,
    password,
  };

  const transport = normalizeTransport(pickParam(params, ["protocol", "transport"]));
  if (transport) node.transport = transport;

  const portRange = pickParam(params, ["port-range", "port_range", "portrange"]);
  if (portRange) node["port-range"] = portRange;

  const multiplexing = pickParam(params, ["multiplexing", "multiplexing-level", "multiplexing_level"]);
  if (multiplexing) node.multiplexing = multiplexing;

  const handshakeMode = pickParam(params, ["handshake-mode", "handshake_mode", "handshakemode"]);
  if (handshakeMode) node["handshake-mode"] = handshakeMode;

  const mtu = parseIntegerParam(params, ["mtu"]);
  if (mtu !== undefined) node.mtu = mtu;

  const udp = parseBooleanParam(params, ["udp"]);
  if (udp !== undefined) node.udp = udp;

  return node;
}
