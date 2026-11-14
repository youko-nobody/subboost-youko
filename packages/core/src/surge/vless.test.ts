import { describe, expect, it } from "vitest";
import { parseSubscription, parseClashYaml } from "@subboost/core/parser";
import { parseVLESS } from "@subboost/core/parser/protocols/vless";
import { parseConfigLine } from "@subboost/core/parser/config-line-parser";
import { generateClashYaml } from "@subboost/core/generator";
import { generateSurgeProfile } from "./generator";
import type { VLESSNode } from "@subboost/core/types/node";

const UUID = "11111111-1111-4111-8111-111111111111";
const KEY = "A".repeat(43);
const ENCRYPTION = `mlkem768x25519plus.native.0rtt.${KEY}`;
const base: VLESSNode = { name: "Example", type: "vless", server: "proxy.example.com", port: 443, uuid: UUID };
const render = (node: VLESSNode) => generateSurgeProfile({ nodes: [node] });
const proxyLine = (content: string) => content.split("\n").find((line) => line.startsWith("Example = "))!;

describe("Surge VLESS official compatibility matrix", () => {
  for (const network of ["tcp", "ws", "grpc", "xhttp"] as const) {
    for (const security of ["none", "tls", "reality"]) {
      for (const encrypted of [false, true]) {
        for (const vision of [false, true]) {
          it(`${network}, ${security}, encryption=${encrypted}, vision=${vision}`, () => {
            const output = render({
              ...base, network,
              tls: security !== "none",
              ...(security === "reality" ? { "reality-opts": { "public-key": KEY, "short-id": "01234567" }, servername: "front.example.com" } : {}),
              ...(encrypted ? { encryption: ENCRYPTION } : {}),
              ...(vision ? { flow: "xtls-rprx-vision" } : {}),
            });
            const supported = !(network === "ws" && security === "reality") &&
              !(network === "grpc" && (security === "none" || vision)) &&
              (!vision || encrypted || (network === "tcp" && security !== "none"));
            expect(output.proxyCount).toBe(supported ? 1 : 0);
            expect(output.skippedNodes).toHaveLength(supported ? 0 : 1);
            if (supported && encrypted) expect(proxyLine(output.content)).toContain(`encryption=${ENCRYPTION}`);
            if (supported && network === "xhttp") expect(proxyLine(output.content)).toContain("xhttp=true, xhttp-path=/");
          });
        }
      }
    }
  }
});

describe("Surge VLESS parsing and export", () => {
  it("maps the documented XHTTP extra fields, preserving false, zero, ranges, and quoted headers", () => {
    const extra = {
      headers: { Host: "cdn.example.com", "User-Agent": "safari", "X-Example": "one,two" },
      xPaddingBytes: "100-1000", xPaddingObfsMode: false, xPaddingKey: "padding",
      xPaddingHeader: "X-Padding", xPaddingPlacement: "queryInHeader", xPaddingMethod: "tokenish",
      uplinkHTTPMethod: "GET", sessionIDPlacement: "header", sessionIDKey: "session",
      sessionIDTable: "0123456789abcdef", sessionIDLength: "8-16", seqPlacement: "query", seqKey: "seq",
      uplinkDataPlacement: "header", uplinkDataKey: "data", uplinkChunkSize: 1024,
      noGRPCHeader: true, scMaxEachPostBytes: "16384-32768", scMinPostsIntervalMs: 0,
      xmux: { maxConcurrency: "8-16", maxConnections: 3, cMaxReuseTimes: 0, hMaxRequestTimes: "600-900", hMaxReusableSecs: "1800-3000", hKeepAlivePeriod: 30 },
      serverMaxHeaderBytes: 65536,
    };
    const query = new URLSearchParams({ type: "splithttp", security: "tls", mode: "packet-up", path: "/x?key=value", alpn: "h2,http/1.1", extra: JSON.stringify(extra) });
    const parsed = parseSubscription(`vless://${UUID}@proxy.example.com:443?${query}#Example`);
    expect(parsed.errors).toEqual([]);
    const output = generateSurgeProfile({ nodes: parsed.nodes });
    expect(output.skippedNodes).toEqual([]);
    const line = proxyLine(output.content);
    for (const param of [
      "xhttp=true", "xhttp-path=/x?key=value", "xhttp-host=cdn.example.com", "xhttp-mode=packet-up",
      'xhttp-headers="User-Agent:safari|X-Example:one,two"', "xhttp-padding-bytes=100-1000",
      "xhttp-padding-obfs=false", "xhttp-padding-key=padding", "xhttp-padding-header=X-Padding",
      "xhttp-padding-placement=queryInHeader", "xhttp-padding-method=tokenish", "xhttp-uplink-method=GET",
      "xhttp-session-placement=header", "xhttp-session-key=session", "xhttp-session-table=0123456789abcdef",
      "xhttp-session-length=8-16", "xhttp-seq-placement=query", "xhttp-seq-key=seq",
      "xhttp-uplink-data-placement=header", "xhttp-uplink-data-key=data", "xhttp-uplink-chunk-size=1024",
      "xhttp-no-grpc-header=true", "xhttp-max-each-post-bytes=16384-32768", "xhttp-min-posts-interval=0",
      "xhttp-xmux-max-concurrency=8-16", "xhttp-xmux-max-connections=3", "xhttp-xmux-max-reuse-times=0",
      "xhttp-xmux-max-request-times=600-900", "xhttp-xmux-max-reusable-secs=1800-3000", "xhttp-xmux-keep-alive=30",
      'alpn="h2,http/1.1"',
    ]) expect(line).toContain(param);
    expect(line).not.toContain("serverMaxHeaderBytes");
    const imported = parseConfigLine(line);
    expect(imported).not.toBeNull();
    const roundTrip = generateSurgeProfile({ nodes: [imported!] });
    expect(roundTrip.skippedNodes).toEqual([]);
    expect(proxyLine(roundTrip.content).split(", ").sort()).toEqual(line.split(", ").sort());
    const importedProfile = parseSubscription(output.content);
    expect(importedProfile.errors).toEqual([]);
    expect(importedProfile.nodes).toHaveLength(1);
    expect(proxyLine(generateSurgeProfile({ nodes: importedProfile.nodes }).content).split(", ").sort()).toEqual(line.split(", ").sort());
  });

  it("supports raw and short user IDs, encrypted Vision and relay-chain keys without TLS", () => {
    const encryption = `mlkem768x25519plus.random.1rtt.100-111-1111.75-0-111.50-0-3333.${KEY}.${KEY}`;
    const node = parseVLESS(`vless://my-user@proxy.example.com:80?type=raw&security=none&flow=xtls-rprx-vision-udp443&encryption=${encryption}#Example`);
    const output = render(node);
    expect(output.skippedNodes).toEqual([]);
    expect(proxyLine(output.content)).toContain(`username=my-user, flow=xtls-rprx-vision-udp443, encryption=${encryption}`);
    expect(proxyLine(output.content)).not.toContain("tls=true");
  });

  it.each(["tcp", "ws", "xhttp"] as const)("preserves encryption without TLS when reimporting %s with SNI", (network) => {
    const output = render({ ...base, network, encryption: ENCRYPTION, flow: "xtls-rprx-vision", servername: "front.example.com", tls: false });
    const imported = parseSubscription(output.content);
    expect(imported.errors).toEqual([]);
    expect(imported.nodes).toHaveLength(1);
    expect(imported.nodes[0].tls).toBe(false);
    const roundTrip = generateSurgeProfile({ nodes: imported.nodes });
    expect(roundTrip.skippedNodes).toEqual([]);
    expect(proxyLine(roundTrip.content)).not.toContain("tls=true");
    expect(proxyLine(roundTrip.content)).toContain(`encryption=${ENCRYPTION}`);
  });

  it("supports imported YAML XHTTP settings and certificate parameters", () => {
    const parsed = parseClashYaml(`proxies:
  - name: Example
    type: vless
    server: proxy.example.com
    port: 443
    uuid: ${UUID}
    tls: true
    network: xhttp
    encryption: ${ENCRYPTION}
    flow: xtls-rprx-vision
    xhttp-opts:
      path: /xhttp
      mode: stream-up
      no-grpc-header: false
      sc-max-each-post-bytes: 4096
      reuse-settings:
        max-concurrency: 8-16
`);
    const output = generateSurgeProfile({ nodes: parsed.nodes });
    expect(output.skippedNodes).toEqual([]);
    expect(output.content).toContain("xhttp-mode=stream-up");
    expect(output.content).toContain("xhttp-no-grpc-header=false");
    expect(output.content).toContain("xhttp-max-each-post-bytes=4096");
    expect(output.content).toContain("xhttp-xmux-max-concurrency=8-16");
  });

  it("preserves gRPC custom paths, mode, authority and TLS pinning through imports", () => {
    const node = parseVLESS(`vless://${UUID}@proxy.example.com:443?type=grpc&security=tls&serviceName=%2Fmy%2Fpath%2Ftun%7Ctunmulti&mode=multi&authority=cdn.example.com&pcs=pin&vcn=cert.example.com#Example`);
    const line = proxyLine(render(node).content);
    expect(line).toContain("grpc-service-name=/my/path/tun|tunmulti");
    expect(line).toContain("grpc-mode=multi");
    expect(line).toContain("grpc-authority=cdn.example.com");
    expect(line).toContain("server-cert-fingerprint-sha256=pin");
    expect(line).toContain("server-cert-verify-name=cert.example.com");
    const imported = parseConfigLine(line)!;
    const roundTrip = proxyLine(generateSurgeProfile({ nodes: [imported] }).content);
    expect(roundTrip).toContain("grpc-service-name=/my/path/tun|tunmulti");
    expect(roundTrip).toContain("server-cert-fingerprint-sha256=pin");
  });

  it("keeps REALITY distinct from TLS for Shadowrocket links and omits certificate pinning for REALITY", () => {
    const authority = Buffer.from(`none:${UUID}@proxy.example.com:443`).toString("base64url");
    const tls = parseVLESS(`vless://${authority}?tls=1&obfs=grpc&path=%2Fmy%2Fpath%2Ftun%7Ctunmulti#Example`);
    expect(tls["reality-opts"]).toBeUndefined();
    expect(proxyLine(render(tls).content)).toContain("grpc-service-name=/my/path/tun|tunmulti");
    const reality = parseVLESS(`vless://${authority}?tls=1&pbk=${KEY}&sid=01234567&peer=front.example.com&pcs=pin&vcn=ignored&allowInsecure=1#Example`);
    const line = proxyLine(render(reality).content);
    expect(line).toContain(`reality-public-key=${KEY}`);
    expect(line).not.toContain("skip-cert-verify");
    expect(line).not.toContain("server-cert");
    const reimported = parseConfigLine(line)!;
    expect(reimported["reality-opts"]).toMatchObject({ "public-key": KEY, "short-id": "01234567" });
  });

  it("does not leak Surge metadata or parameters into Clash output", () => {
    const node = parseVLESS(`vless://${UUID}@proxy.example.com:443?type=xhttp&security=tls&vcn=cert.example.com&extra=${encodeURIComponent(JSON.stringify({ xPaddingKey: "pad" }))}#Example`);
    const output = generateClashYaml({ nodes: [node], template: "blank" });
    expect(output).not.toContain("_vlessXhttpExtra");
    expect(output).not.toContain("_extra");
    expect(output).not.toContain("_serverCertVerifyName");
    expect(output).not.toContain("xhttp-padding-key");
    expect(proxyLine(render(node).content)).toContain("xhttp-padding-key=pad");
  });

  it.each([
    ["downloadSettings", { downloadSettings: { address: "download.example.com" } }, "downloadSettings"],
    ["invalid mode", { mode: "invalid" }, "mode=invalid"],
    ["invalid range", { scMaxEachPostBytes: "200-100" }, "非负整数或范围"],
    ["GET stream-up", { mode: "stream-up", uplinkHTTPMethod: "GET" }, "GET 上传"],
    ["cookie stream-one", { mode: "stream-one", uplinkDataPlacement: "cookie" }, "header/cookie"],
  ])("rejects incompatible XHTTP %s", (_name, extra, message) => {
    const node = parseVLESS(`vless://${UUID}@proxy.example.com:443?type=xhttp&security=tls&extra=${encodeURIComponent(JSON.stringify(extra))}#Example`);
    const output = render(node);
    expect(output.proxyCount).toBe(0);
    expect(output.skippedNodes[0].reason).toContain(message);
  });

  it("rejects explicit download settings and HTTPUpgrade instead of changing their meaning", () => {
    const download = render({ ...base, network: "xhttp", "xhttp-opts": { "download-settings": { host: "download.example.com" } } });
    expect(download.skippedNodes[0].reason).toContain("downloadSettings");
    const upgrade = render(parseVLESS(`vless://${UUID}@proxy.example.com:443?type=httpupgrade&security=tls#Example`));
    expect(upgrade.skippedNodes[0].reason).toContain("HTTPUpgrade");
  });

  it("reports malformed extra JSON and encryption strings", () => {
    expect(() => parseVLESS(`vless://${UUID}@proxy.example.com:443?type=xhttp&extra=%7Bbad`)).toThrow("extra 必须是 JSON 对象");
    for (const encryption of ["other", "mlkem768x25519plus.native.1rtt", `mlkem768x25519plus.native.1rtt.50-0-10.${KEY}`]) {
      expect(render({ ...base, encryption }).skippedNodes[0].reason).toContain("Encryption 参数格式无效");
    }
  });
});
