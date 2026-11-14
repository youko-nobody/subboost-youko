type RecordValue = Record<string, unknown>;
export type SurgeVlessParam = [string, string | number | boolean];

function record(value: unknown): RecordValue {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function surgeVlessTransport(node: RecordValue): string {
  const network = text(node.network).toLowerCase() || "tcp";
  return network === "raw" ? "tcp" : network === "splithttp" ? "xhttp" : network;
}

// Only check the documented structure here; Surge validates the cryptographic keys.
function validEncryption(value: string): boolean {
  const [algorithm, mode, handshake, ...segments] = value.split(".");
  if (algorithm !== "mlkem768x25519plus" || !["native", "xorpub", "random"].includes(mode) || !["0rtt", "1rtt"].includes(handshake)) return false;
  let paddingIndex = 0;
  while (segments.length && /^\d+-\d+-\d+$/.test(segments[0])) {
    const [probability, min, max] = segments.shift()!.split("-").map(Number);
    if (probability > 100 || min > max || !Number.isSafeInteger(max)) return false;
    if (paddingIndex === 0 && (probability !== 100 || min < 35)) return false;
    paddingIndex += 1;
  }
  return segments.length > 0 && segments.every((key) => /^[A-Za-z0-9_-]+={0,2}$/.test(key));
}

const XHTTP_FIELDS = [
  ["xhttp-padding-bytes", "x-padding-bytes", "xPaddingBytes", "range"],
  ["xhttp-padding-obfs", "x-padding-obfs-mode", "xPaddingObfsMode", "boolean"],
  ["xhttp-padding-key", "x-padding-key", "xPaddingKey", "text"],
  ["xhttp-padding-header", "x-padding-header", "xPaddingHeader", "text"],
  ["xhttp-padding-placement", "x-padding-placement", "xPaddingPlacement", "queryInHeader|header|cookie|query"],
  ["xhttp-padding-method", "x-padding-method", "xPaddingMethod", "repeat-x|tokenish"],
  ["xhttp-uplink-method", "uplink-http-method", "uplinkHTTPMethod", "text"],
  ["xhttp-session-placement", "session-id-placement", "sessionIDPlacement", "path|query|header|cookie"],
  ["xhttp-session-key", "session-id-key", "sessionIDKey", "text"],
  ["xhttp-session-table", "session-id-table", "sessionIDTable", "text"],
  ["xhttp-session-length", "session-id-length", "sessionIDLength", "range"],
  ["xhttp-seq-placement", "seq-placement", "seqPlacement", "path|query|header|cookie"],
  ["xhttp-seq-key", "seq-key", "seqKey", "text"],
  ["xhttp-uplink-data-placement", "uplink-data-placement", "uplinkDataPlacement", "auto|body|header|cookie"],
  ["xhttp-uplink-data-key", "uplink-data-key", "uplinkDataKey", "text"],
  ["xhttp-uplink-chunk-size", "uplink-chunk-size", "uplinkChunkSize", "range"],
  ["xhttp-no-grpc-header", "no-grpc-header", "noGRPCHeader", "boolean"],
  ["xhttp-max-each-post-bytes", "sc-max-each-post-bytes", "scMaxEachPostBytes", "range"],
  ["xhttp-min-posts-interval", "sc-min-posts-interval-ms", "scMinPostsIntervalMs", "range"],
] as const;

const XMUX_FIELDS = [
  ["xhttp-xmux-max-concurrency", "max-concurrency", "maxConcurrency"],
  ["xhttp-xmux-max-connections", "max-connections", "maxConnections"],
  ["xhttp-xmux-max-reuse-times", "c-max-reuse-times", "cMaxReuseTimes"],
  ["xhttp-xmux-max-request-times", "h-max-request-times", "hMaxRequestTimes"],
  ["xhttp-xmux-max-reusable-secs", "h-max-reusable-secs", "hMaxReusableSecs"],
  ["xhttp-xmux-keep-alive", "h-keep-alive-period", "hKeepAlivePeriod"],
] as const;

function isRange(value: string): boolean {
  if (!/^\d+(?:-\d+)?$/.test(value)) return false;
  const [min, max = min] = value.split("-").map(Number);
  return Number.isSafeInteger(min) && Number.isSafeInteger(max) && min <= max;
}

export function surgeVlessXhttpParams(node: RecordValue): { params: SurgeVlessParam[]; error: string | null } {
  const opts = record(node["xhttp-opts"]);
  const extra = record(node._vlessXhttpExtra ?? opts.extra);
  const params: SurgeVlessParam[] = [["xhttp", true]];
  const fail = (reason: string) => ({ params: [], error: `Surge VLESS XHTTP ${reason}` });
  if (opts["download-settings"] != null || opts.downloadSettings != null || extra.downloadSettings != null) {
    return fail("不支持 downloadSettings 上下行分离");
  }
  const mode = text(opts.mode ?? extra.mode) || "auto";
  if (!["auto", "packet-up", "stream-up", "stream-one"].includes(mode)) return fail(`不支持 mode=${mode}`);
  params.push(["xhttp-path", text(opts.path ?? extra.path) || "/"]);
  const headers = record(opts.headers ?? extra.headers);
  const hostHeader = Object.entries(headers).find(([key]) => key.toLowerCase() === "host")?.[1];
  const host = text(opts.host ?? extra.host) || text(hostHeader);
  if (host) params.push(["xhttp-host", host]);
  if (opts.mode || extra.mode) params.push(["xhttp-mode", mode]);
  const headerText = Object.entries(headers)
    .filter(([key]) => key.toLowerCase() !== "host")
    .map(([key, value]) => `${key}:${Array.isArray(value) ? value.join(",") : String(value)}`)
    .join("|");
  if (headerText) params.push(["xhttp-headers", headerText]);

  for (const [surgeKey, nodeKey, xrayKey, type] of XHTTP_FIELDS) {
    const value = opts[nodeKey] ?? opts[xrayKey] ?? extra[xrayKey];
    if (value === undefined || value === null || value === "") continue;
    if (!["string", "number", "boolean"].includes(typeof value)) return fail(`${surgeKey} 参数格式无效`);
    const normalized = String(value).trim();
    if (type === "boolean") {
      if (!["true", "false", "0", "1"].includes(normalized.toLowerCase())) return fail(`${surgeKey} 需要布尔值`);
      params.push([surgeKey, normalized === "1" || normalized.toLowerCase() === "true"]);
    } else {
      if (type === "range" && !isRange(normalized)) return fail(`${surgeKey} 需要非负整数或范围`);
      if (type !== "text" && type !== "range" && !type.split("|").includes(normalized)) return fail(`${surgeKey} 参数值无效`);
      params.push([surgeKey, normalized]);
    }
  }
  const reuse = record(opts["reuse-settings"]);
  const xmux = record(opts.xmux ?? extra.xmux);
  for (const [surgeKey, nodeKey, xrayKey] of XMUX_FIELDS) {
    const value = reuse[nodeKey] ?? xmux[xrayKey];
    if (value === undefined || value === null || value === "") continue;
    if (!isRange(String(value))) return fail(`${surgeKey} 需要非负整数或范围`);
    params.push([surgeKey, String(value)]);
  }
  const effectiveMode = mode === "auto" ? (text(record(node["reality-opts"])["public-key"]) ? "stream-one" : "packet-up") : mode;
  const values = new Map(params);
  if (text(values.get("xhttp-uplink-method")).toUpperCase() === "GET" && effectiveMode !== "packet-up") return fail("GET 上传仅支持 packet-up 模式");
  if (["header", "cookie"].includes(text(values.get("xhttp-uplink-data-placement"))) && effectiveMode !== "packet-up") return fail("header/cookie 上传仅支持 packet-up 模式");
  return { params, error: null };
}

export function surgeVlessError(node: RecordValue): string | null {
  const network = surgeVlessTransport(node);
  const reality = record(node["reality-opts"]);
  const publicKey = text(reality["public-key"]);
  const flow = text(node.flow);
  const encryption = text(node.encryption);
  const encrypted = Boolean(encryption && encryption.toLowerCase() !== "none");
  if (encrypted && !validEncryption(encryption)) return "Surge VLESS Encryption 参数格式无效，需要 mlkem768x25519plus.<mode>.<handshake>.<key>";
  if (!["tcp", "ws", "grpc", "xhttp"].includes(network)) return `Surge VLESS 不支持 ${network} 传输层`;
  if (record(node["ws-opts"])["v2ray-http-upgrade"] === true) return "Surge VLESS 不支持 HTTPUpgrade 传输层";
  if (flow && !["xtls-rprx-vision", "xtls-rprx-vision-udp443"].includes(flow)) return `Surge VLESS 不支持 flow=${flow}`;
  if (Object.keys(reality).length > 0 && !publicKey) return "Surge VLESS REALITY 缺少 reality-public-key";
  if (network === "ws" && publicKey) return "Surge VLESS WebSocket 不支持与 REALITY 组合";
  if (flow && network === "grpc") return "Surge VLESS gRPC 不支持 Vision flow";
  if (flow && !encrypted && (network !== "tcp" || (!node.tls && !publicKey))) return "Surge VLESS Vision 需要 RAW + TLS/REALITY，或启用 VLESS Encryption（不支持 gRPC）";
  if (network === "grpc" && !node.tls && !publicKey) return "Surge VLESS gRPC 需要 TLS 或 REALITY";
  const grpcMode = text(record(node["grpc-opts"])._grpcType);
  if (network === "grpc" && grpcMode && !["gun", "multi"].includes(grpcMode)) return `Surge VLESS 不支持 grpc-mode=${grpcMode}`;
  return network === "xhttp" ? surgeVlessXhttpParams(node).error : null;
}
