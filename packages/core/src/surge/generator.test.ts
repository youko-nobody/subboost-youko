import { describe, expect, it } from "vitest";
import { createDefaultSurgeConfig, generateSurgeProfile } from "@subboost/core/surge";
import type { ParsedNode } from "@subboost/core/types/node";

const ssNode: ParsedNode = {
  name: "香港 01",
  type: "ss",
  server: "hk.example.com",
  port: 443,
  cipher: "chacha20-ietf-poly1305",
  password: "secret",
};

describe("generateSurgeProfile", () => {
  it("generates proxies, region smart groups, manual groups, rule sets, and final rule", () => {
    const config = createDefaultSurgeConfig();
    const output = generateSurgeProfile({
      nodes: [ssNode],
      config: {
        ...config,
        ruleSets: [
          {
            id: "ads",
            name: "广告",
            url: "https://example.com/ads.list",
            target: { kind: "reject" },
            noResolve: true,
          },
        ],
      },
    });

    expect(output.content).toContain("[Proxy]");
    expect(output.content).toContain("香港 01 = ss, hk.example.com, 443");
    expect(output.content).toContain("香港 Smart = smart, include-all-proxies=true");
    expect(output.content).toContain("PROXY = select, 香港 Smart");
    expect(output.content).toContain("RULE-SET,https://example.com/ads.list,REJECT,no-resolve");
    expect(output.content).toContain("FINAL,PROXY");
    expect(output.proxyCount).toBe(1);
    expect(output.policyGroupCount).toBeGreaterThan(1);
  });

  it("filters non-node members from smart manual groups", () => {
    const output = generateSurgeProfile({
      nodes: [ssNode],
      config: {
        ...createDefaultSurgeConfig(),
        proxyGroups: [
          {
            id: "smart-manual",
            name: "手动 Smart",
            type: "smart",
            policies: [
              { kind: "node", name: "香港 01" },
              { kind: "direct" },
              { kind: "reject" },
              { kind: "group", id: "region-hk" },
            ],
          },
        ],
        finalTarget: { kind: "group", id: "smart-manual" },
      },
    });

    expect(output.content).toContain("手动 Smart = smart, 香港 01");
    expect(output.content).not.toContain("手动 Smart = smart, 香港 01, DIRECT");
    expect(output.content).toContain("FINAL,手动 Smart");
  });

  it("does not emit url-test parameters for smart groups", () => {
    const output = generateSurgeProfile({
      nodes: [ssNode],
      config: {
        ...createDefaultSurgeConfig(),
        proxyGroups: [
          {
            id: "smart-manual",
            name: "Smart",
            type: "smart",
            policies: [{ kind: "node", name: "香港 01" }],
            url: "https://example.com/ping",
            interval: 30,
            policyPriority: "香港:0.9",
          },
        ],
      },
    });

    expect(output.content).toContain("Smart = smart, 香港 01, policy-priority=香港:0.9");
    expect(output.content).not.toContain("Smart = smart, 香港 01, url=");
    expect(output.content).not.toContain("interval=30");
  });

  it("does not emit smart-only policy priority for other group types", () => {
    const output = generateSurgeProfile({
      nodes: [ssNode],
      config: {
        ...createDefaultSurgeConfig(),
        regionGroups: [
          {
            id: "region",
            name: "地区测速",
            enabled: true,
            type: "url-test",
            keywords: ["香港"],
            includeInProxy: false,
            policyPriority: "香港:0.9",
          },
        ],
        proxyGroups: [],
      },
    });

    expect(output.content).toContain("地区测速 = url-test, include-all-proxies=true");
    expect(output.content).not.toContain("policy-priority");
  });

  it("skips unsupported protocols instead of emitting invalid Surge proxy lines", () => {
    const output = generateSurgeProfile({
      nodes: [
        ssNode,
        {
          name: "VLESS",
          type: "vless",
          server: "vless.example.com",
          port: 443,
          uuid: "11111111-1111-4111-8111-111111111111",
        } as ParsedNode,
      ],
      config: createDefaultSurgeConfig(),
    });

    expect(output.proxyCount).toBe(1);
    expect(output.skippedNodes).toEqual([
      expect.objectContaining({ name: "VLESS", type: "vless" }),
    ]);
    expect(output.content).toContain("SubBoost 已跳过 1 个");
  });
});
