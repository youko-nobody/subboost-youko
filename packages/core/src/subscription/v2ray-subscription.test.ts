import { describe, expect, it } from "vitest";
import { decodeBase64 } from "@subboost/core/parser/base64";
import type { ParsedNode } from "@subboost/core/types/node";
import {
  buildV2RaySubscriptionContent,
  buildV2RaySubscriptionUrl,
  serializeNodeAsV2RayUri,
} from "./v2ray-subscription";

describe("V2Ray subscription serialization", () => {
  it("serializes common nodes to importable URI links and Base64 content", () => {
    const nodes: ParsedNode[] = [
      {
        name: "SS Tokyo",
        type: "ss",
        server: "ss.example.com",
        port: 8388,
        cipher: "aes-128-gcm",
        password: "secret",
      },
      {
        name: "VMess WS",
        type: "vmess",
        server: "vmess.example.com",
        port: 443,
        uuid: "11111111-1111-4111-8111-111111111111",
        alterId: 0,
        cipher: "auto",
        tls: true,
        servername: "cdn.example.com",
        network: "ws",
        "ws-opts": { path: "/ws", headers: { Host: "cdn.example.com" } },
      },
      {
        name: "VLESS Reality",
        type: "vless",
        server: "2001:db8::1",
        port: 443,
        uuid: "22222222-2222-4222-8222-222222222222",
        network: "grpc",
        "grpc-opts": { "grpc-service-name": "grpc-service", _grpcType: "multi" },
        "client-fingerprint": "chrome",
        "reality-opts": {
          "public-key": "public-key",
          "short-id": "1234abcd",
          "_spider-x": "/",
        },
      } as ParsedNode,
      {
        name: "Mieru",
        type: "mieru",
        server: "mieru.example.com",
        port: 2999,
        username: "user",
        password: "pass",
      },
    ];

    const result = buildV2RaySubscriptionContent(nodes);

    expect(result.links).toHaveLength(3);
    expect(result.skippedNodeCount).toBe(1);
    expect(decodeBase64(result.content).split("\n")).toEqual(result.links);
    expect(result.links[0]).toBe("ss://YWVzLTEyOC1nY206c2VjcmV0@ss.example.com:8388#SS%20Tokyo");

    const vmess = JSON.parse(decodeBase64(result.links[1].slice("vmess://".length)));
    expect(vmess).toMatchObject({
      ps: "VMess WS",
      add: "vmess.example.com",
      port: "443",
      net: "ws",
      host: "cdn.example.com",
      path: "/ws",
      tls: "tls",
    });

    const vless = new URL(result.links[2]);
    expect(vless.host).toBe("[2001:db8::1]:443");
    expect(vless.searchParams.get("security")).toBe("reality");
    expect(vless.searchParams.get("type")).toBe("grpc");
    expect(vless.searchParams.get("serviceName")).toBe("grpc-service");
    expect(vless.searchParams.get("pbk")).toBe("public-key");
    expect(vless.searchParams.get("sid")).toBe("1234abcd");
  });

  it("serializes additional V2Ray URI-compatible protocols and skips Mihomo-only nodes", () => {
    const nodes: ParsedNode[] = [
      {
        name: "Trojan",
        type: "trojan",
        server: "trojan.example.com",
        port: 443,
        password: "secret",
        sni: "cdn.example.com",
      },
      {
        name: "Hysteria2",
        type: "hysteria2",
        server: "hy2.example.com",
        port: 443,
        password: "secret",
        sni: "cdn.example.com",
      },
      {
        name: "TUIC",
        type: "tuic",
        server: "tuic.example.com",
        port: 443,
        uuid: "33333333-3333-4333-8333-333333333333",
        password: "secret",
        sni: "cdn.example.com",
      },
      {
        name: "SOCKS",
        type: "socks5",
        server: "socks.example.com",
        port: 1080,
        username: "user",
        password: "pass",
      },
      {
        name: "WireGuard",
        type: "wireguard",
        server: "wg.example.com",
        port: 51820,
        "private-key": "private-key",
      },
    ];

    expect(serializeNodeAsV2RayUri(nodes[0])).toMatch(/^trojan:\/\/secret@trojan\.example\.com:443\?/);
    expect(serializeNodeAsV2RayUri(nodes[1])).toMatch(/^hysteria2:\/\/secret@hy2\.example\.com:443\?/);
    expect(serializeNodeAsV2RayUri(nodes[2])).toMatch(/^tuic:\/\/33333333-3333-4333-8333-333333333333:secret@tuic\.example\.com:443\?/);
    expect(serializeNodeAsV2RayUri(nodes[3])).toBe("socks5://user:pass@socks.example.com:1080#SOCKS");
    expect(serializeNodeAsV2RayUri(nodes[4])).toBeNull();
  });

  it("derives the V2Ray endpoint from current and legacy YAML URLs", () => {
    expect(buildV2RaySubscriptionUrl("https://sub.example.com/api/subscriptions/token/config.yaml")).toBe(
      "https://sub.example.com/api/subscriptions/token/v2ray"
    );
    expect(buildV2RaySubscriptionUrl("https://sub.example.com/api/subscriptions/token/config.yaml?source=ui")).toBe(
      "https://sub.example.com/api/subscriptions/token/v2ray?source=ui"
    );
    expect(buildV2RaySubscriptionUrl("https://sub.example.com/s/token")).toBe("https://sub.example.com/s/token/v2ray");
  });
});
