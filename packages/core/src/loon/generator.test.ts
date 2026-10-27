import { describe, expect, it } from "vitest";
import { generateLoonProfile } from "./generator";
import { normalizeLoonConfig } from "./defaults";
import { parsePlatformConfigContent } from "../parser/platform/parse-platform-config";
import type { ParsedNode } from "../types/node";

describe("Loon profile generation", () => {
  it("generates native proxies, groups, remote rules and local rules", () => {
    const nodes = [
      { name: "HK, One", type: "ss", server: "hk.example.com", port: 443, cipher: "aes-128-gcm", password: "p,ass" },
      { name: "JP", type: "vmess", server: "jp.example.com", port: 443, uuid: "11111111-1111-4111-8111-111111111111", alterId: 0, cipher: "auto", tls: true, network: "ws", "ws-opts": { path: "/ws", headers: { Host: "cdn.example.com" } } },
    ] as unknown as ParsedNode[];
    const result = generateLoonProfile({
      nodes,
      config: {
        proxyGroups: [{ id: "proxy", name: "Proxy", type: "select", policies: [{ kind: "node", name: "HK, One" }] }],
        remoteRules: [{ id: "remote", name: "Privacy", url: "https://rules.example/privacy.list", target: { kind: "reject" } }],
        rules: [{ id: "local", type: "DOMAIN-SUFFIX", value: "example.org", target: { kind: "group", id: "proxy" } }],
      },
    });

    expect(result.content).toContain("[Remote Rule]\nhttps://rules.example/privacy.list,policy=REJECT,enabled=true");
    expect(result.content).toContain("DOMAIN-SUFFIX,example.org,Proxy");
    expect(result.content).toContain('HK One = shadowsocks, hk.example.com, 443, aes-128-gcm, "p,ass"');
    expect(result.content).toContain('JP = vmess, jp.example.com, 443, auto, "11111111-1111-4111-8111-111111111111", alterId=0, transport=ws, path=/ws, host=cdn.example.com, over-tls=true');
    expect(result.proxyCount).toBe(2);
  });

  it("keeps an incomplete remote rule editable but omits it from generated output", () => {
    const config = normalizeLoonConfig({
      remoteRules: [{ id: "remote", name: "New rule set", url: "", target: { kind: "direct" } }],
    });
    const result = generateLoonProfile({ nodes: [], config });

    expect(config.remoteRules).toHaveLength(1);
    expect(config.remoteRules[0].url).toBe("");
    expect(result.content).not.toContain("New rule set");
    expect(result.ruleCount).toBe(1);
  });

  it("converts legacy domain wildcard rules to Loon URL-REGEX rules", () => {
    const config = normalizeLoonConfig({
      rules: [{ id: "legacy-wildcard", type: "DOMAIN-WILDCARD", value: "pornhub.*", target: "PROXY" }],
    });
    const result = generateLoonProfile({ nodes: [], config });

    expect(config.rules).toEqual([{
      id: "legacy-wildcard",
      type: "URL-REGEX",
      value: "^https?://([A-Za-z0-9-]+\\.)*pornhub\\.[A-Za-z0-9.-]*(:[0-9]+)?(/|$)",
      target: "PROXY",
    }]);
    expect(result.content).toContain("URL-REGEX,^https?://([A-Za-z0-9-]+\\.)*pornhub\\.[A-Za-z0-9.-]*(:[0-9]+)?(/|$),PROXY");
    expect(result.content).not.toContain("DOMAIN-WILDCARD");
    expect(parsePlatformConfigContent(result.content).errors).toEqual([]);
  });

  it("resolves regex-selected nodes and reports unsupported protocols", () => {
    const result = generateLoonProfile({
      nodes: [
        { name: "Hong Kong 01", type: "ss", server: "hk.example.com", port: 443, cipher: "aes-128-gcm", password: "secret" },
        { name: "US 01", type: "tuic", server: "us.example.com", port: 443, uuid: "id", password: "secret" },
      ] as unknown as ParsedNode[],
      config: {
        proxyGroups: [{ id: "hk", name: "Hong Kong", type: "url-test", policies: [], includeRegex: "Hong Kong" }],
      },
    });
    expect(result.content).toContain("Hong Kong = url-test, Hong Kong 01, url=http://www.gstatic.com/generate_204, interval=300");
    expect(result.skippedNodes).toHaveLength(1);
    expect(result.skippedNodes[0].type).toBe("tuic");
  });

  it("preserves remote group icons and emits Loon img-url parameters", () => {
    const config = normalizeLoonConfig({
      proxyGroups: [{
        id: "proxy",
        name: "Proxy",
        type: "select",
        policies: [{ kind: "direct" }],
        icon: " https://cdn.example/icons/proxy.png ",
      }],
    });
    const result = generateLoonProfile({ nodes: [], config });

    expect(config.proxyGroups[0].icon).toBe("https://cdn.example/icons/proxy.png");
    expect(result.content).toContain("Proxy = select, DIRECT, img-url=https://cdn.example/icons/proxy.png");
  });

  it("omits invalid remote group icon URLs from generated Loon syntax", () => {
    const result = generateLoonProfile({
      nodes: [],
      config: {
        proxyGroups: [{ id: "proxy", name: "Proxy", type: "select", policies: [], icon: "javascript:alert(1)" }],
      },
    });

    expect(result.content).toContain("Proxy = select");
    expect(result.content).not.toContain("img-url=");
  });

  it("emits proxy lines accepted by the existing Loon parser", () => {
    const result = generateLoonProfile({
      nodes: [
        { name: "SS", type: "ss", server: "ss.example.com", port: 443, cipher: "aes-128-gcm", password: "secret" },
        { name: "VMess", type: "vmess", server: "vmess.example.com", port: 443, uuid: "11111111-1111-4111-8111-111111111111", alterId: 0, cipher: "auto" },
        { name: "Trojan", type: "trojan", server: "trojan.example.com", port: 443, password: "secret", sni: "trojan.example.com" },
        {
          name: "VLESS Reality",
          type: "vless",
          server: "vless.example.com",
          port: 443,
          uuid: "22222222-2222-4222-8222-222222222222",
          flow: "xtls-rprx-vision",
          "reality-opts": { "public-key": "reality-public-key", "short-id": "3c8d6139a0270ffc" },
          tls: true,
          sni: "www.sony.com",
        },
      ] as unknown as ParsedNode[],
      config: {},
    });
    const parsed = parsePlatformConfigContent(result.content);
    expect(result.content).toContain('VLESS Reality = vless, vless.example.com, 443, "22222222-2222-4222-8222-222222222222", transport=tcp, flow=xtls-rprx-vision, public-key="reality-public-key", short-id=3c8d6139a0270ffc, over-tls=true, sni=www.sony.com');
    expect(parsed.nodes.map((node) => node.type)).toEqual(["ss", "vmess", "trojan", "vless"]);
    expect(parsed.nodes[3]).toMatchObject({
      name: "VLESS Reality",
      flow: "xtls-rprx-vision",
      servername: "www.sony.com",
      "reality-opts": { "public-key": "reality-public-key", "short-id": "3c8d6139a0270ffc" },
    });
    expect(parsed.errors).toEqual([]);
  });

  it("serializes official Loon WireGuard syntax and round-trips it through the parser", () => {
    const result = generateLoonProfile({
      nodes: [{
        name: "WG",
        type: "wireguard",
        server: "wg.example.com",
        port: 51820,
        "private-key": "private-key",
        ip: "10.0.0.2/32",
        mtu: 1280,
        dns: ["1.1.1.1"],
        peers: [{
          server: "wg.example.com",
          port: 51820,
          "public-key": "public-key",
          "pre-shared-key": "preshared",
          "allowed-ips": ["0.0.0.0/0", "::/0"],
          reserved: [1, 2, 3],
        }],
      }] as unknown as ParsedNode[],
      config: {},
    });
    expect(result.content).toContain('WG = wireguard,interface-ip=10.0.0.2/32,private-key="private-key",mtu=1280,dns=1.1.1.1,peers=[{public-key="public-key",preshared-key="preshared",reserved=[1,2,3],allowed-ips="0.0.0.0/0,::/0",endpoint=wg.example.com:51820}]');
    const parsed = parsePlatformConfigContent(result.content);
    expect(parsed.nodes).toHaveLength(1);
    expect(parsed.nodes[0]).toMatchObject({ type: "wireguard", name: "WG", server: "wg.example.com", port: 51820 });
    expect(parsed.errors).toEqual([]);
  });
});
