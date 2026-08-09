import { describe, expect, it } from "vitest";
import { normalizeNodeLinkScheme, parseNodeLinkByRegistry } from "./link-parsers";
import { parseNodeLink } from "./parse-node-link";

function mustParseByRegistry(link: string) {
  const node = parseNodeLinkByRegistry(link);
  if (!node) throw new Error(`Expected registry parser to accept: ${link}`);
  return node;
}

describe("node link parser registry", () => {
  it("normalizes schemes before dispatching to protocol parsers", () => {
    expect(normalizeNodeLinkScheme("VLESS://uuid@example.com:443#Node")).toBe(
      "vless://uuid@example.com:443#Node"
    );
    expect(normalizeNodeLinkScheme("socks5+TLS://proxy.example.com:1080")).toBe(
      "socks5+tls://proxy.example.com:1080"
    );

    expect(mustParseByRegistry("HTTP://proxy.example.com:8080#HTTP")).toMatchObject({
      name: "HTTP",
      type: "http",
      server: "proxy.example.com",
      port: 8080,
      tls: false,
    });
  });

  it("routes Telegram web links through the Telegram parser", () => {
    expect(
      mustParseByRegistry("https://t.me/socks?server=socks.example.com&port=1080&user=u&pass=p&remark=Socks+Name")
    ).toMatchObject({
      name: "Socks Name",
      type: "socks5",
      server: "socks.example.com",
      port: 1080,
      username: "u",
      password: "p",
      udp: true,
    });

    expect(mustParseByRegistry("https://t.me/https?server=https.example.com&port=443&remark=HTTPS")).toMatchObject({
      name: "HTTPS",
      type: "https",
      server: "https.example.com",
      port: 443,
      tls: true,
    });
  });

  it("routes SSH links and reports unsupported public entry formats", () => {
    expect(
      mustParseByRegistry(
        "ssh://user:pass@ssh.example.com:22?host-key=key-a,key-b&idle-timeout=30&server-fingerprint=sha256:abc#SSH"
      )
    ).toMatchObject({
      name: "SSH",
      type: "ssh",
      server: "ssh.example.com",
      port: 22,
      username: "user",
      password: "pass",
      "host-key": ["key-a", "key-b"],
      "idle-timeout": 30,
      "server-fingerprint": "sha256:abc",
    });

    expect(parseNodeLinkByRegistry("unknown://proxy.example.com:443#Unknown")).toBeNull();
    expect(parseNodeLink("   ")).toBeNull();
    expect(() => parseNodeLink("proxy.example.com:1080")).toThrow("无法识别的代理格式");
    expect(() => parseNodeLink("ftp://proxy.example.com:21")).toThrow("不支持的协议: ftp");
  });

  it("routes Mieru simple links through the Mieru parser", () => {
    expect(
      mustParseByRegistry(
        "mierus://demo-user:demo-pass@mieru.example.com?handshake-mode=HANDSHAKE_NO_WAIT&mtu=1400&multiplexing=MULTIPLEXING_OFF&port=11301&profile=default&protocol=TCP"
      )
    ).toMatchObject({
      name: "Mieru-mieru.example.com:11301",
      type: "mieru",
      server: "mieru.example.com",
      port: 11301,
      username: "demo-user",
      password: "demo-pass",
      transport: "tcp",
      mtu: 1400,
      multiplexing: "MULTIPLEXING_OFF",
      "handshake-mode": "HANDSHAKE_NO_WAIT",
    });
  });
});
