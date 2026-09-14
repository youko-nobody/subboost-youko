import { describe, expect, it } from "vitest";
import {
  createDefaultSurgeConfig,
  createYoukoSurgeConfig,
  generateSurgeProfile,
  normalizeSurgeConfig,
} from "@subboost/core/surge";
import { parseSS } from "@subboost/core/parser/protocols/ss";
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
    expect(output.content).toContain(
      "香港 Smart = smart, include-all-proxies=true",
    );
    expect(output.content).toContain("PROXY = select, 香港 Smart");
    const proxyGroupSectionStart = output.content.indexOf("[Proxy Group]");
    const proxyLineIndex = output.content.indexOf(
      "PROXY = select",
      proxyGroupSectionStart,
    );
    const regionLineIndex = output.content.indexOf(
      "香港 Smart = smart",
      proxyGroupSectionStart,
    );
    expect(proxyLineIndex).toBeGreaterThan(proxyGroupSectionStart);
    expect(regionLineIndex).toBeGreaterThan(proxyLineIndex);
    expect(output.content).toContain(
      "RULE-SET,https://example.com/ads.list,REJECT,no-resolve",
    );
    expect(output.content).toContain("FINAL,PROXY");
    expect(output.proxyCount).toBe(1);
    expect(output.policyGroupCount).toBeGreaterThan(1);
  });

  it("emits domain-set remote resources with DOMAIN-SET", () => {
    const output = generateSurgeProfile({
      nodes: [ssNode],
      config: {
        ...createDefaultSurgeConfig(),
        ruleSets: [
          {
            id: "apple-domain",
            name: "Apple Domain",
            url: "https://example.com/Apple_Domain.list",
            target: { kind: "direct" },
            resourceType: "domain-set",
            noResolve: true,
          },
        ],
      },
    });

    expect(output.content).toContain(
      "DOMAIN-SET,https://example.com/Apple_Domain.list,DIRECT",
    );
    expect(output.content).not.toContain(
      "RULE-SET,https://example.com/Apple_Domain.list",
    );
    expect(output.content).not.toContain(
      "DOMAIN-SET,https://example.com/Apple_Domain.list,DIRECT,no-resolve",
    );
  });

  it("uses the custom managed config interval", () => {
    const output = generateSurgeProfile({
      nodes: [ssNode],
      config: {
        ...createDefaultSurgeConfig(),
        managedConfigEnabled: true,
        managedConfigUrl: "https://example.com/surge.conf",
        managedConfigInterval: 7200,
      },
    });

    expect(output.content).toContain(
      "#!MANAGED-CONFIG https://example.com/surge.conf interval=7200 strict=false",
    );
  });

  it("generates a valid Surge SS2022 line for provider-tagged links", () => {
    const node = parseSS(
      "ss://MjAyMi1ibGFrZTMtYWVzLTEyOC1nY206dXlXWFlZeFVueGFVZW50QXZTaUo1dz09Ok1UYzFNak0zTWpneE1WUjBTVXhtY1E9PSNCTEFDS1NUT05FQDE1MC4yNDIuODAuMTI5OjEwMTI3?uot=1#%F0%9F%87%AD%F0%9F%87%B0%20%F0%9F%84%B7%20SS%E9%99%90TF%E4%BD%BF%E7%94%A8",
    );
    const output = generateSurgeProfile({
      nodes: [node],
      config: createDefaultSurgeConfig(),
    });

    expect(output.content).toContain(
      "encrypt-method=2022-blake3-aes-128-gcm, password=uyWXYYxUnxaUentAvSiJ5w==:MTc1MjM3MjgxMVR0SUxmcQ==, udp-relay=true",
    );
    expect(output.content).not.toContain("BLACKSTONE");
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

    expect(output.content).toContain(
      "Smart = smart, 香港 01, policy-priority=香港:0.9",
    );
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

    expect(output.content).toContain(
      "地区测速 = url-test, include-all-proxies=true",
    );
    expect(output.content).not.toContain("policy-priority");
  });

  it("keeps empty rule drafts for the editor but skips them in generated output", () => {
    const config = normalizeSurgeConfig({
      ...createDefaultSurgeConfig(),
      ruleSets: [
        {
          id: "draft-ruleset",
          name: "新远程规则集",
          url: "",
          target: { kind: "group", id: "proxy" },
        },
      ],
      rules: [
        {
          id: "draft-rule",
          type: "DOMAIN-SUFFIX",
          value: "",
          target: { kind: "group", id: "proxy" },
        },
      ],
    });

    expect(config.ruleSets).toHaveLength(1);
    expect(config.rules).toHaveLength(1);

    const output = generateSurgeProfile({ nodes: [ssNode], config });
    expect(output.content).not.toContain("新远程规则集");
    expect(output.content).not.toContain("draft-rule");
  });

  it("keeps explicit FINAL rules at the bottom even when ruleOrder tries to move them", () => {
    const output = generateSurgeProfile({
      nodes: [ssNode],
      config: {
        ...createDefaultSurgeConfig(),
        ruleSets: [
          {
            id: "ads",
            name: "广告",
            url: "https://example.com/ads.list",
            target: { kind: "reject" },
          },
        ],
        rules: [
          {
            id: "final",
            type: "FINAL",
            target: { kind: "direct" },
          },
          {
            id: "example",
            type: "DOMAIN-SUFFIX",
            value: "example.com",
            target: { kind: "group", id: "proxy" },
          },
        ],
        ruleOrder: ["rule:final", "rule-set:ads", "rule:example"],
      },
    });

    const ruleSetIndex = output.content.indexOf(
      "RULE-SET,https://example.com/ads.list,REJECT",
    );
    const domainIndex = output.content.indexOf(
      "DOMAIN-SUFFIX,example.com,PROXY",
    );
    const finalIndex = output.content.indexOf("FINAL,DIRECT");

    expect(ruleSetIndex).toBeGreaterThan(output.content.indexOf("[Rule]"));
    expect(domainIndex).toBeGreaterThan(ruleSetIndex);
    expect(finalIndex).toBeGreaterThan(domainIndex);
  });

  it("generates the Youko routing template with native Surge groups and rule sets", () => {
    const config = createYoukoSurgeConfig();
    const output = generateSurgeProfile({ nodes: [ssNode], config });

    expect(config.regionGroups).toEqual([]);
    expect(config.proxyGroups.map((group) => group.name)).toEqual([
      "PROXY",
      "Emby代理",
      "TG",
      "AI",
      "YOUTUBE",
      "TIKTOK",
      "FINAL",
      "BLOCK",
      "APPLE",
      "♻️ 自动测速",
    ]);
    expect(
      config.proxyGroups.every((group) => group.icon?.startsWith("https://")),
    ).toBe(true);
    expect(config.ruleSets.length).toBeGreaterThan(0);
    expect(
      config.ruleSets.every((ruleSet) => ruleSet.url.endsWith(".list")),
    ).toBe(true);
    expect(
      config.ruleSets.every((ruleSet) => !ruleSet.url.includes("/Clash/")),
    ).toBe(true);
    expect(config.ruleSets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "KWAI_DOMAIN",
          url: expect.stringContaining("/KuaiShou/KuaiShou.list"),
        }),
        expect.objectContaining({
          id: "GLOBAL_DNS_DOMAIN",
          url: expect.stringContaining("/DNS/DNS.list"),
        }),
        expect.objectContaining({
          id: "APPLE_DOMAIN",
          url: expect.stringContaining("/Apple/Apple_Domain.list"),
          resourceType: "domain-set",
        }),
        expect.objectContaining({
          id: "WEIYUN_DOMAIN",
          url: expect.stringContaining("/Tencent/Tencent_Domain.list"),
          resourceType: "domain-set",
        }),
        expect.objectContaining({
          id: "AQARA_CN_DOMAIN",
          url: expect.stringContaining("/LvMiLianChuang/LvMiLianChuang.list"),
        }),
        expect.objectContaining({
          id: "AQARA_GLOBAL_DOMAIN",
          url: expect.stringContaining("/LvMiLianChuang/LvMiLianChuang.list"),
        }),
        expect.objectContaining({
          id: "CHINA_DOMAIN",
          url: expect.stringContaining("/China/China_Domain.list"),
          resourceType: "domain-set",
        }),
        expect.objectContaining({
          id: "CHINA_MAX_DOMAIN",
          url: expect.stringContaining("/ChinaMax/ChinaMax_Domain.list"),
          resourceType: "domain-set",
        }),
      ]),
    );
    const ruleSetById = new Map(
      config.ruleSets.map((ruleSet) => [ruleSet.id, ruleSet]),
    );
    expect(ruleSetById.has("RABBIT_CHINA_ASN")).toBe(false);
    expect(ruleSetById.get("RABBIT_APPLE")).toEqual(
      expect.objectContaining({
        url: expect.stringContaining(
          "/Rabbit-Spec/Surge/Master/Rules/Apple.list",
        ),
        target: { kind: "group", id: "my-apple" },
      }),
    );
    for (const id of [
      "RABBIT_MICROSOFT",
      "RABBIT_NETFLIX",
      "RABBIT_DISNEY",
      "RABBIT_SPOTIFY",
      "RABBIT_GOOGLE",
      "RABBIT_FACEBOOK",
      "RABBIT_INSTAGRAM",
      "RABBIT_META",
    ]) {
      expect(ruleSetById.get(id)).toEqual(
        expect.objectContaining({
          target: { kind: "group", id: "my-proxy" },
        }),
      );
    }
    const ruleOrder = config.ruleOrder ?? [];
    const orderIndex = (key: string) => {
      const index = ruleOrder.indexOf(key);
      expect(index).toBeGreaterThanOrEqual(0);
      return index;
    };
    expect(orderIndex("rule-set:RABBIT_AIGC")).toBeLessThan(
      orderIndex("rule-set:GEMINI_DOMAIN"),
    );
    expect(orderIndex("rule-set:RABBIT_TELEGRAM")).toBeLessThan(
      orderIndex("rule-set:BM_TELEGRAM"),
    );
    expect(orderIndex("rule-set:RABBIT_YOUTUBE")).toBeLessThan(
      orderIndex("rule-set:BM_YOUTUBE"),
    );
    expect(orderIndex("rule-set:RABBIT_NETFLIX")).toBeLessThan(
      orderIndex("rule-set:APPLE_NEWS_DOMAIN"),
    );
    expect(orderIndex("rule-set:RABBIT_APPLE")).toBeLessThan(
      orderIndex("rule-set:APPLE_DOMAIN"),
    );
    expect(orderIndex("rule-set:RABBIT_MICROSOFT")).toBeLessThan(
      orderIndex("rule-set:MICROSOFT_APPS_DOMAIN"),
    );
    expect(orderIndex("rule-set:RABBIT_BILIBILI")).toBeLessThan(
      orderIndex("rule-set:BM_BILIBILI"),
    );
    expect(orderIndex("rule-set:RABBIT_TIKTOK")).toBeLessThan(
      orderIndex("rule-set:BM_TIKTOK"),
    );
    expect(orderIndex("rule-set:RABBIT_CHINA")).toBeLessThan(
      orderIndex("rule-set:GEO_ROUTING_ASIA_CHINA_CCTLD_DOMAIN"),
    );
    expect(orderIndex("rule-set:RABBIT_CHINA_CIDR")).toBeLessThan(
      orderIndex("rule-set:CHINA_DNS_IP"),
    );

    expect(output.content).toContain(
      "PROXY = select, ♻️ 自动测速, DIRECT, 香港 01, icon-url=https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Proxy.png",
    );
    expect(output.content).toContain("DOMAIN-SUFFIX,emby.fan,Emby代理");
    expect(output.content).toContain("FINAL,FINAL");
    expect(output.content).toContain(
      "RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/OpenAI/OpenAI.list,AI",
    );
    expect(output.content).toContain(
      "DOMAIN-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/Apple/Apple_Domain.list,APPLE",
    );
    expect(output.content).toContain(
      "DOMAIN-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/Tencent/Tencent_Domain.list,DIRECT",
    );
    expect(output.content).toContain(
      "DOMAIN-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/China/China_Domain.list,DIRECT",
    );
    expect(output.content).toContain(
      "DOMAIN-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/ChinaMax/ChinaMax_Domain.list,DIRECT",
    );
    expect(output.content).not.toContain(
      "RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/Apple/Apple_Domain.list",
    );
    expect(output.content).not.toContain(
      "RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/Tencent/Tencent_Domain.list",
    );
    expect(output.content).not.toContain(
      "RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/China/China_Domain.list",
    );
    expect(output.content).not.toContain(
      "RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/ChinaMax/ChinaMax_Domain.list",
    );
    const rabbitRulesBase =
      "https://raw.githubusercontent.com/Rabbit-Spec/Surge/Master/Rules";
    expect(output.content).toContain(
      `RULE-SET,${rabbitRulesBase}/AIGC.list,AI`,
    );
    expect(output.content).toContain(
      `RULE-SET,${rabbitRulesBase}/Telegram.list,TG`,
    );
    expect(output.content).toContain(
      `RULE-SET,${rabbitRulesBase}/TelegramASN.list,TG`,
    );
    expect(output.content).toContain(
      `RULE-SET,${rabbitRulesBase}/YouTube.list,YOUTUBE`,
    );
    expect(output.content).toContain(
      `RULE-SET,${rabbitRulesBase}/TikTok.list,TIKTOK`,
    );
    expect(output.content).toContain(
      `RULE-SET,${rabbitRulesBase}/Apple.list,APPLE`,
    );
    for (const fileName of [
      "Microsoft",
      "Netflix",
      "Disney",
      "Spotify",
      "Google",
      "Facebook",
      "Instagram",
      "Meta",
      "GlobalMedia",
      "Game",
      "Proxy",
    ]) {
      expect(output.content).toContain(
        `RULE-SET,${rabbitRulesBase}/${fileName}.list,PROXY`,
      );
    }
    for (const fileName of ["BiliBili", "ChinaMedia", "China"]) {
      expect(output.content).toContain(
        `RULE-SET,${rabbitRulesBase}/${fileName}.list,DIRECT`,
      );
    }
    expect(output.content).toContain(
      `RULE-SET,${rabbitRulesBase}/ChinaCIDR.list,DIRECT,no-resolve`,
    );
    expect(output.content).not.toContain(`${rabbitRulesBase}/ChinaASN.list`);
    expect(
      output.content.indexOf(`RULE-SET,${rabbitRulesBase}/AIGC.list,AI`),
    ).toBeLessThan(
      output.content.indexOf(
        "RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/Gemini/Gemini.list,AI",
      ),
    );
    expect(
      output.content.indexOf(`RULE-SET,${rabbitRulesBase}/Apple.list,APPLE`),
    ).toBeLessThan(
      output.content.indexOf(
        "DOMAIN-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/Apple/Apple_Domain.list,APPLE",
      ),
    );
    expect(
      output.content.indexOf(
        `RULE-SET,${rabbitRulesBase}/Microsoft.list,PROXY`,
      ),
    ).toBeLessThan(
      output.content.indexOf(
        "RULE-SET,https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/Microsoft/Microsoft.list,DIRECT",
      ),
    );

    const localRuleIndex = output.content.indexOf(
      "DOMAIN-SUFFIX,emby.fan,Emby代理",
    );
    const remoteRuleIndex = output.content.indexOf("RULE-SET,");
    expect(localRuleIndex).toBeGreaterThan(output.content.indexOf("[Rule]"));
    expect(remoteRuleIndex).toBeGreaterThan(localRuleIndex);
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
