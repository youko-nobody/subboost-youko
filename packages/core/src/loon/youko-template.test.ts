import { describe, expect, it } from "vitest";
import { createYoukoLoonConfig } from "./youko-template";
import { generateLoonProfile } from "./generator";

describe("Youko Loon template", () => {
  it("maps the Clash Youko groups and supported remote rules to native Loon lists", () => {
    const config = createYoukoLoonConfig();

    expect(config.proxyGroups.map((group) => group.name)).toEqual([
      "PROXY", "Emby代理", "TG", "AI", "YOUTUBE", "TIKTOK", "FINAL", "BLOCK", "APPLE", "♻️ 自动测速",
    ]);
    expect(config.proxyGroups.find((group) => group.id === "my-proxy")).toMatchObject({
      includeRegex: ".*",
      policies: [{ kind: "group", id: "my-auto-speedtest" }, { kind: "direct" }],
    });
    expect(config.proxyGroups.find((group) => group.id === "my-block")).toMatchObject({
      type: "select",
      includeRegex: "(?!)",
      policies: [{ kind: "reject" }, { kind: "direct" }],
    });
    expect(config.proxyGroups.find((group) => group.id === "my-apple")).toMatchObject({
      type: "select",
      policies: [{ kind: "direct" }, { kind: "group", id: "my-proxy" }],
    });

    expect(config.remoteRules.length).toBeGreaterThan(15);
    expect(config.remoteRules.every((rule) => rule.url.endsWith(".list"))).toBe(true);
    expect(config.remoteRules.find((rule) => rule.id === "BM_TELEGRAM")?.url).toContain("/rule/Loon/Telegram/Telegram.list");
    expect(config.remoteRules.find((rule) => rule.id === "CN_ASN")?.url).toContain("/rule/Loon/ChinaASN/ChinaASN.list");
    expect(config.remoteRules.find((rule) => rule.id === "BM_EASYPRIVACY-domain")?.url).toContain("/rule/Loon/Privacy/Privacy_Domain.list");
    expect(config.remoteRules.find((rule) => rule.id === "CHINA_DOMAIN")?.url).toContain("/rule/Loon/China/China_Domain.list");
    expect(config.remoteRules.find((rule) => rule.id === "CHINA_MAX_DOMAIN-domain")?.url).toContain("/rule/Loon/ChinaMax/ChinaMax_Domain.list");
    expect(config.remoteRules.some((rule) => /rule\/Clash|\.ya?ml/i.test(rule.url))).toBe(false);
    expect(config.remoteRules.map((rule) => rule.id).indexOf("BM_TELEGRAM"))
      .toBeLessThan(config.remoteRules.map((rule) => rule.id).indexOf("BM_YOUTUBE"));
  });

  it("converts unavailable Loon sources into ordered native local rules", () => {
    const config = createYoukoLoonConfig();
    const rules = config.rules;

    expect(rules.filter((rule) => rule.id.startsWith("loon-china_dns_ip-")).length).toBe(43);
    expect(rules).toContainEqual(expect.objectContaining({ type: "DOMAIN-WILDCARD", value: "pornhub.*" }));
    expect(rules).toContainEqual(expect.objectContaining({ type: "DOMAIN-SUFFIX", value: "kwai.net" }));
    expect(rules).toContainEqual(expect.objectContaining({ type: "GEOIP", value: "CN", target: { kind: "direct" } }));
    expect(rules.every((rule) => rule.value.length > 0)).toBe(true);
    expect(rules.some((rule) => rule.id === "my-routing-rule-25")).toBe(true);

    const output = generateLoonProfile({ nodes: [], config }).content;
    expect(output).toContain("https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/Telegram/Telegram.list,policy=TG,enabled=true");
    expect(output).toContain("https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/Privacy/Privacy_Domain.list,policy=BLOCK,enabled=true");
    expect(output).toContain("https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/Apple/Apple_Domain.list,policy=APPLE,enabled=true");
    expect(output).toContain("DOMAIN-WILDCARD,pornhub.*,PROXY");
    expect(output).toContain("IP-CIDR,114.114.114.114/32,BLOCK,no-resolve");
    expect(output).toContain("FINAL,FINAL");
  });
});
