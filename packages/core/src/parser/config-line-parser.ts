import type {
  AnyTLSNode,
  HttpNode,
  Hysteria2Node,
  ParsedNode,
  SSNode,
  SocksNode,
  SshNode,
  TrojanNode,
  TuicNode,
  VLESSNode,
  VMessNode,
} from "@subboost/core/types/node";
import { canonicalizeParsedNode } from "./canonical-fields";
import { buildVlessXhttpOpts } from "./protocols/vless";

import {
  applyCommonNodeParams,
  applyTransport,
  inferSkipCertVerify,
  isUuidLike,
  parseBooleanish,
  parseIntParam,
  parseStringList,
  parseWsHeaders,
  tokenizeConfigLine,
} from "./config-line-tokenizer";
export { looksLikeConfigLine } from "./config-line-tokenizer";

function buildSimpleProxyNode(
  type: "socks5" | "socks4" | "http" | "https" | "ssh",
  name: string,
  host: string,
  port: number,
  params: Record<string, string>
): ParsedNode {
  if (type === "ssh") {
    const node: SshNode = {
      name,
      type: "ssh",
      server: host,
      port,
      username: params.username,
      password: params.password,
    };
    applyCommonNodeParams(node as unknown as Record<string, unknown>, params);
    return node;
  }

  if (type === "socks5" || type === "socks4") {
    const node: SocksNode = {
      name,
      type,
      server: host,
      port,
      username: params.username,
      password: params.password,
      udp: type === "socks5",
      tls: parseBooleanish(params.tls) ?? parseBooleanish(params["over-tls"]),
    };
    applyCommonNodeParams(node as unknown as Record<string, unknown>, params);
    return node;
  }

  const node: HttpNode = {
    name,
    type,
    server: host,
    port,
    username: params.username,
    password: params.password,
    tls: type === "https" || parseBooleanish(params.tls) === true || parseBooleanish(params["over-tls"]) === true,
  };
  if (params.headers) {
    node.headers = parseWsHeaders(params.headers);
  }
  applyCommonNodeParams(node as unknown as Record<string, unknown>, params);
  return node;
}

function buildSsNode(name: string, host: string, port: number, params: Record<string, string>): SSNode {
  const node: SSNode = {
    name,
    type: "ss",
    server: host,
    port,
    cipher: params["encrypt-method"] || params.method || "aes-256-gcm",
    password: params.password || "",
    udp: parseBooleanish(params["udp-relay"]),
  };
  const obfs = params.obfs;
  if (obfs === "http" || obfs === "tls") {
    node.plugin = "obfs";
    node["plugin-opts"] = {
      mode: obfs,
      ...(params["obfs-host"] ? { host: params["obfs-host"] } : {}),
      ...(params["obfs-uri"] ? { path: params["obfs-uri"] } : {}),
    };
  }
  applyCommonNodeParams(node as unknown as Record<string, unknown>, params);
  return node;
}

function buildTrojanNode(name: string, host: string, port: number, params: Record<string, string>): TrojanNode {
  const node: TrojanNode = {
    name,
    type: "trojan",
    server: host,
    port,
    password: params.password || "",
    sni: params.sni || params.peer || params["tls-name"],
    "skip-cert-verify": inferSkipCertVerify(params),
  };
  if (params.fp || params.fingerprint) node["client-fingerprint"] = params.fp || params.fingerprint;
  if (params.alpn) node.alpn = parseStringList(params.alpn);
  applyTransport(node as unknown as Record<string, unknown>, params, {
    allowedTransports: ["tcp", "ws", "httpupgrade", "grpc"],
    protocolName: "trojan",
  });
  applyCommonNodeParams(node as unknown as Record<string, unknown>, params);
  return node;
}

function buildSnellNode(name: string, host: string, port: number, params: Record<string, string>): ParsedNode {
  const node = {
    name,
    type: "snell",
    server: host,
    port,
    psk: params.psk || params.password || "",
  } as Record<string, unknown>;

  const version = Number.parseInt(params.version || "", 10);
  if (Number.isInteger(version)) node.version = version;

  const obfs = params.obfs;
  if (obfs === "http" || obfs === "tls") {
    node["obfs-opts"] = {
      mode: obfs,
      ...(params["obfs-host"] ? { host: params["obfs-host"] } : {}),
      ...(params["obfs-uri"] ? { path: params["obfs-uri"] } : {}),
    };
  }

  const udp = parseBooleanish(params["udp-relay"]);
  if (udp !== undefined) node.udp = udp;

  applyCommonNodeParams(node as unknown as Record<string, unknown>, params);

  return node as unknown as ParsedNode;
}

function buildVmessNode(
  name: string,
  host: string,
  port: number,
  params: Record<string, string>,
  extras: string[]
): ParsedNode {
  const uuid = params.username || params.uuid || params.id || extras.find(isUuidLike) || extras[1] || extras[0] || "";
  const cipher = extras.length >= 2 ? extras[0] : params.cipher || params.scy || params.encryption || "none";
  if (!uuid) throw new Error("vmess 配置行缺少 uuid");

  const node: VMessNode = {
    name,
    type: "vmess",
    server: host,
    port,
    uuid,
    alterId: parseIntParam(params.alterid || params["alter-id"] || params.aid) || 0,
    cipher,
    udp: parseBooleanish(params["udp-relay"]) ?? true,
    tls: parseBooleanish(params.tls) === true || parseBooleanish(params["over-tls"]) === true,
    servername: params.sni || params.peer || params["tls-name"],
    "skip-cert-verify": inferSkipCertVerify(params),
  };
  const fp = params["tls-fingerprint"] || params["server-cert-fingerprint-sha256"] || params.fp;
  if (fp) node["client-fingerprint"] = fp;
  applyTransport(node as unknown as Record<string, unknown>, params, {
    defaultTransport: parseBooleanish(params.ws) ? "ws" : undefined,
    allowedTransports: ["tcp", "ws", "httpupgrade", "grpc", "http", "h2"],
    protocolName: "vmess",
  });
  applyCommonNodeParams(node as unknown as Record<string, unknown>, params);
  return node;
}

function buildVlessNode(
  name: string,
  host: string,
  port: number,
  params: Record<string, string>,
  extras: string[]
): ParsedNode {
  const uuid = params.username || params.uuid || extras[0] || "";
  if (!uuid) throw new Error("vless 配置行缺少 uuid");
  const publicKey = params["reality-public-key"] || params.pbk || params["public-key"] || params["public_key"] || params.publickey;

  const node: VLESSNode = {
    name,
    type: "vless",
    server: host,
    port,
    uuid,
    udp: parseBooleanish(params["udp-relay"]) ?? true,
    tls: Boolean(publicKey) || (parseBooleanish(params.tls) ?? parseBooleanish(params["over-tls"]) ?? Boolean(params["tls-name"])),
    servername: params.sni || params.peer || params["tls-name"],
    "skip-cert-verify": inferSkipCertVerify(params),
  };
  if (params.flow) node.flow = params.flow;
  if (params.encryption) node.encryption = params.encryption;
  const packetEncoding = params["packet-encoding"] || params["packet_encoding"] || params.packetencoding;
  if (packetEncoding) node["packet-encoding"] = packetEncoding;
  const clientFingerprint = params.fp || params.fingerprint || params["client-fingerprint"] || params.clientfingerprint;
  if (clientFingerprint) node["client-fingerprint"] = clientFingerprint;
  const shortId = params["reality-short-id"] || params.sid || params["short-id"] || params.shortid || params["short_id"];
  if (publicKey) {
    node["reality-opts"] = {
      "public-key": publicKey,
      ...(shortId ? { "short-id": shortId } : {}),
    };
    node["client-fingerprint"] = (clientFingerprint || "chrome") as string;
  }
  const transports = ["ws", "grpc", "xhttp"].filter((key) => parseBooleanish(params[key]) === true);
  if (transports.length > 1) throw new Error("VLESS 配置行不能同时启用 ws/grpc/xhttp");
  const transport = (params.transport || params.network || params.type || transports[0] || "tcp").toLowerCase();
  const transportParams = {
    ...params,
    transport: transport === "raw" ? "tcp" : transport === "splithttp" ? "xhttp" : transport,
    mode: params["grpc-mode"] || params.mode,
    authority: params["grpc-authority"] || params.authority,
  };
  applyTransport(node as unknown as Record<string, unknown>, transportParams, {
    defaultTransport: parseBooleanish(params.ws) ? "ws" : undefined,
    allowedTransports: ["tcp", "ws", "httpupgrade", "grpc", "http", "h2", "xhttp"],
    protocolName: "vless",
  });
  if (node.network === "xhttp") {
    node["xhttp-opts"] = buildVlessXhttpOpts(new URLSearchParams(params), params["transport-path"] || params["ws-path"] || "/", params["transport-host"] || params["ws-host"] || "");
    if (node["xhttp-opts"]._extra) {
      node._vlessXhttpExtra = node["xhttp-opts"]._extra;
      delete node["xhttp-opts"]._extra;
    }
  }
  if (node.network === "grpc" && params["grpc-service-name"]?.startsWith("/")) {
    node._surgeGrpcServicePath = params["grpc-service-name"];
  }
  if (params["server-cert-fingerprint-sha256"]) node.pcs = params["server-cert-fingerprint-sha256"];
  if (params["server-cert-verify-name"]) node._serverCertVerifyName = params["server-cert-verify-name"];
  if (params.alpn) node.alpn = parseStringList(params.alpn);
  applyCommonNodeParams(node as unknown as Record<string, unknown>, params);
  return node;
}

function buildAnyTlsNode(
  name: string,
  host: string,
  port: number,
  params: Record<string, string>,
  extras: string[]
): ParsedNode {
  const password = params.password || params.auth || extras[0] || "";
  if (!password) throw new Error("anytls 配置行缺少 password");
  const transport = (params.transport || params.network || params.type || "tcp").trim().toLowerCase();
  if (transport && transport !== "tcp" && transport !== "none") {
    throw new Error(`anytls 配置行不支持 transport=${transport}（Mihomo 仅支持纯 TCP）`);
  }
  if (params["public-key"] || params["short-id"] || params.shortid || params.sid || params.pbk || params.spx) {
    throw new Error("anytls 配置行不支持 Reality 参数（Mihomo 不支持）");
  }

  const node: AnyTLSNode = {
    name,
    type: "anytls",
    server: host,
    port,
    password,
    udp: parseBooleanish(params["udp-relay"]) ?? true,
    sni: params.sni || params.peer || params["tls-name"],
    "skip-cert-verify": inferSkipCertVerify(params),
  };
  if (params.fp || params.fingerprint) node["client-fingerprint"] = params.fp || params.fingerprint;
  if (params.alpn) node.alpn = parseStringList(params.alpn);
  applyCommonNodeParams(node as unknown as Record<string, unknown>, params);
  return node;
}

function buildHysteria2Node(
  name: string,
  host: string,
  port: number,
  params: Record<string, string>,
  extras: string[]
): ParsedNode {
  const password = params.password || params.auth || extras[0] || "";
  if (!password) throw new Error("hysteria2 配置行缺少 password");

  const node: Hysteria2Node = {
    name,
    type: "hysteria2",
    server: host,
    port,
    password,
    sni: params.sni || params.peer || params["tls-name"],
    "skip-cert-verify": inferSkipCertVerify(params),
  };
  if (params["download-bandwidth"]) node.down = params["download-bandwidth"];
  if (params["salamander-password"]) {
    node.obfs = "salamander";
    node["obfs-password"] = params["salamander-password"];
  }
  if (params["tls-fingerprint"] || params["server-cert-fingerprint-sha256"]) {
    node.fingerprint = params["tls-fingerprint"] || params["server-cert-fingerprint-sha256"];
  }
  const portHop = parseIntParam(params["port-hopping-interval"] || params["port_hopping_interval"]);
  if (portHop !== undefined) node["hop-interval"] = portHop;
  applyCommonNodeParams(node as unknown as Record<string, unknown>, params);
  return node;
}

function buildHysteriaNode(
  name: string,
  host: string,
  port: number,
  params: Record<string, string>,
  extras: string[]
): ParsedNode {
  const auth = params["auth-str"] || params.auth || params.password || extras[0] || "";
  const node = {
    name,
    type: "hysteria",
    server: host,
    port,
    protocol: params.protocol || "udp",
    ...(auth ? { "auth-str": auth } : {}),
  } as Record<string, unknown>;

  if (params.sni || params.peer || params["tls-name"]) node.sni = params.sni || params.peer || params["tls-name"];
  if (inferSkipCertVerify(params) !== undefined) node["skip-cert-verify"] = inferSkipCertVerify(params);
  if (params.alpn) node.alpn = parseStringList(params.alpn);
  if (params.up || params.upmbps) node.up = params.up || params.upmbps;
  if (params.down || params.downmbps) node.down = params.down || params.downmbps;
  if (params.mport || params.ports) node.ports = params.mport || params.ports;
  if (params["obfs-param"] || params.obfsparam) node.obfs = params["obfs-param"] || params.obfsparam;
  if (params.obfs !== undefined) node["_obfs"] = params.obfs;
  applyCommonNodeParams(node, params);
  return node as unknown as ParsedNode;
}

function buildTuicNode(
  name: string,
  host: string,
  port: number,
  params: Record<string, string>,
  extras: string[],
  versionOverride?: number
): ParsedNode {
  const token = params.token || extras[0] || undefined;
  const uuid = params.uuid || params.username || undefined;
  const password = params.password || undefined;
  if (!token && (!uuid || !password)) {
    throw new Error("tuic 配置行缺少 token 或 uuid/password");
  }

  const node = {
    name,
    type: "tuic",
    server: host,
    port,
    ...(token ? { token } : { uuid, password }),
    ...(versionOverride ? { version: versionOverride } : {}),
  } as TuicNode & Record<string, unknown>;
  if (params.sni || params.peer || params["tls-name"]) node.sni = params.sni || params.peer || params["tls-name"];
  if (params.alpn) node.alpn = parseStringList(params.alpn);
  if (params["congestion-controller"] || params.congestioncontrol) {
    node["congestion-controller"] = params["congestion-controller"] || params.congestioncontrol;
  }
  if (params["udp-relay-mode"] || params.udprelaymode) {
    node["udp-relay-mode"] = params["udp-relay-mode"] || params.udprelaymode;
  }
  if (inferSkipCertVerify(params)) node["skip-cert-verify"] = true;
  if (parseBooleanish(params["disable-sni"])) node["disable-sni"] = true;
  applyCommonNodeParams(node as unknown as Record<string, unknown>, params);
  return node as unknown as ParsedNode;
}

function buildWireguardNode(name: string, host: string, port: number, params: Record<string, string>): ParsedNode {
  const privateKey = params["private-key"] || params.privatekey || "";
  if (!privateKey) throw new Error("wireguard 配置行缺少 private-key");

  const node = {
    name,
    type: "wireguard",
    server: host,
    port,
    "private-key": privateKey,
    udp: parseBooleanish(params.udp) ?? true,
  } as Record<string, unknown>;
  if (params["public-key"] || params.publickey) node["public-key"] = params["public-key"] || params.publickey;
  if (params["pre-shared-key"] || params.presharedkey) node["pre-shared-key"] = params["pre-shared-key"] || params.presharedkey;
  if (params.ip || params["interface-ip"]) node.ip = params.ip || params["interface-ip"];
  if (params.ipv6 || params["interface-ipv6"]) node.ipv6 = params.ipv6 || params["interface-ipv6"];
  if (params["section-name"]) node["section-name"] = params["section-name"];
  const mtu = parseIntParam(params.mtu);
  if (mtu !== undefined) node.mtu = mtu;
  applyCommonNodeParams(node as unknown as Record<string, unknown>, params);
  return node as unknown as ParsedNode;
}

function parseConfigLineRaw(line: string): ParsedNode | null {
  const { name, type, host, port, params, extras } = tokenizeConfigLine(line);

  if (type === "socks" || type === "socks5" || type === "socks4" || type === "socks5+tls" || type === "socks5-tls") {
    const normalizedType = type === "socks" ? "socks5" : type === "socks5+tls" || type === "socks5-tls" ? "socks5" : type;
    const nextParams =
      type === "socks5+tls" || type === "socks5-tls"
        ? { ...params, tls: params.tls || params["over-tls"] || "true" }
        : params;
    return buildSimpleProxyNode(normalizedType as "socks5" | "socks4", name, host, port, nextParams);
  }
  if (type === "http" || type === "https") {
    return buildSimpleProxyNode(type, name, host, port, params);
  }
  if (type === "ssh") {
    return buildSimpleProxyNode("ssh", name, host, port, params);
  }
  if (type === "ss") {
    return buildSsNode(name, host, port, params);
  }
  if (type === "trojan") {
    return buildTrojanNode(name, host, port, params);
  }
  if (type === "vmess") {
    return buildVmessNode(name, host, port, params, extras);
  }
  if (type === "vless") {
    return buildVlessNode(name, host, port, params, extras);
  }
  if (type === "anytls") {
    return buildAnyTlsNode(name, host, port, params, extras);
  }
  if (type === "hysteria2") {
    return buildHysteria2Node(name, host, port, params, extras);
  }
  if (type === "hysteria" || type === "hy") {
    return buildHysteriaNode(name, host, port, params, extras);
  }
  if (type === "tuic" || type === "tuic-v5") {
    return buildTuicNode(name, host, port, params, extras, type === "tuic-v5" ? 5 : undefined);
  }
  if (type === "wireguard") {
    return buildWireguardNode(name, host, port, params);
  }
  if (type === "snell") {
    return buildSnellNode(name, host, port, params);
  }

  throw new Error(`不支持的配置行协议: ${type}`);
}

export function parseConfigLine(line: string): ParsedNode | null {
  const node = parseConfigLineRaw(line);
  return node ? canonicalizeParsedNode(node) : null;
}

