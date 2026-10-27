import { describe, expect, it } from "vitest";
import { createYoukoLoonConfig } from "./youko-template";
import { generateLoonProfile } from "./generator";
import { createDefaultLoonConfig, DEFAULT_LOON_GENERAL_TEXT } from "./defaults";

describe("Youko Loon template", () => {
  it("uses the requested base configuration by default and in the Youko template", () => {
    const expected = [
      "ip-mode = v4-only",
      "ipv6-vif = off",
      "dns-server = system",
      "sni-sniffing = true",
      "disable-stun = true",
      "dns-reject-mode = LoopbackIP",
      "domain-reject-mode = DNS",
      "udp-fallback-mode = REJECT",
      "wifi-access-http-port = 7222",
      "wifi-access-socks5-port = 7221",
      "allow-wifi-access = false",
      "interface-mode = auto",
      "test-timeout = 5",
      "disconnect-on-policy-change = false",
      "internet-test-url = http://connectivitycheck.platform.hicloud.com/generate_204",
      "proxy-test-url = http://www.gstatic.com/generate_204",
      "resource-parser = https://raw.githubusercontent.com/sub-store-org/Sub-Store/release/sub-store-parser.loon.min.js",
      "geoip-url = https://geodata.kelee.one/Country-Masaiki.mmdb",
      "ipasn-url = https://geodata.kelee.one/GeoLite2-ASN-P3TERX.mmdb",
      "skip-proxy = 192.168.0.0/16,10.0.0.0/8,172.16.0.0/12,localhost,*.local,e.crashlynatics.com",
      "bypass-tun = 10.0.0.0/8,100.64.0.0/10,127.0.0.0/8,169.254.0.0/16,172.16.0.0/12,192.0.0.0/24,192.0.2.0/24,192.88.99.0/24,192.168.0.0/16,198.51.100.0/24,203.0.113.0/24,224.0.0.0/4,255.255.255.255/32",
    ].join("\n");
    const template = createYoukoLoonConfig();

    expect(DEFAULT_LOON_GENERAL_TEXT).toBe(expected);
    expect(createDefaultLoonConfig().generalText).toBe(expected);
    expect(template.generalText).toBe(expected);
    expect(generateLoonProfile({ nodes: [], config: template }).content).toContain(`[General]\n${expected}\n`);
  });

  it("maps the Clash Youko groups and supported remote rules to native Loon lists", () => {
    const config = createYoukoLoonConfig();

    expect(config.proxyGroups.map((group) => group.name)).toEqual([
      "PROXY", "Emby代理", "TG", "AI", "YOUTUBE", "TIKTOK", "FINAL", "BLOCK", "APPLE", "♻️ 自动测速",
    ]);
    expect(config.proxyGroups.find((group) => group.id === "my-proxy")).toMatchObject({
      includeRegex: ".*",
      policies: [{ kind: "group", id: "my-auto-speedtest" }, { kind: "direct" }],
      icon: "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Proxy.png",
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

    for (const [id, path] of [
      ["LOON_NETFLIX", "/rule/Loon/Netflix/Netflix.list"],
      ["LOON_DISNEY", "/rule/Loon/Disney/Disney.list"],
      ["LOON_SPOTIFY", "/rule/Loon/Spotify/Spotify.list"],
      ["LOON_GOOGLE", "/rule/Loon/Google/Google.list"],
      ["LOON_GLOBAL_MEDIA", "/rule/Loon/GlobalMedia/GlobalMedia.list"],
      ["LOON_CHINA_MEDIA", "/rule/Loon/ChinaMedia/ChinaMedia.list"],
    ]) {
      expect(config.remoteRules.find((rule) => rule.id === id)?.url).toContain(path);
    }

    expect(config.remoteRules.find((rule) => rule.id === "MICROSOFT_APPS_DOMAIN")?.target)
      .toEqual({ kind: "group", id: "my-proxy" });
    expect(config.remoteRules.filter((rule) => rule.url.endsWith("/Microsoft/Microsoft.list"))).toHaveLength(1);
    expect(config.remoteRules.filter((rule) => rule.url.endsWith("/TikTok/TikTok.list"))).toHaveLength(1);
    expect(config.remoteRules.filter((rule) => rule.url.endsWith("/Apple/Apple.list"))).toHaveLength(1);
    expect(config.remoteRules.filter((rule) => rule.url.endsWith("/BiliBili/BiliBili.list"))).toHaveLength(1);
    expect(config.remoteRules.map((rule) => rule.id).indexOf("LOON_NETFLIX"))
      .toBeLessThan(config.remoteRules.map((rule) => rule.id).indexOf("APPLE_NEWS_DOMAIN"));
    expect(config.remoteRules.map((rule) => rule.id).indexOf("LOON_CHINA_MEDIA"))
      .toBeLessThan(config.remoteRules.map((rule) => rule.id).indexOf("BM_BILIBILI"));
  });

  it("converts unavailable Loon sources into ordered native local rules", () => {
    const config = createYoukoLoonConfig();
    const rules = config.rules;

    expect(rules.filter((rule) => rule.id.startsWith("loon-china_dns_ip-")).length).toBe(43);
    const telegramAsnRules = rules.filter((rule) => rule.id.startsWith("loon-rabbit_telegram_asn-"));
    expect(telegramAsnRules).toHaveLength(11);
    expect(telegramAsnRules.every((rule) => typeof rule.target !== "string"
      && rule.target.kind === "group"
      && rule.target.id === "my-tg")).toBe(true);
    expect(telegramAsnRules).toContainEqual(expect.objectContaining({ type: "IP-ASN", value: "44907", noResolve: true }));
    expect(telegramAsnRules.some((rule) => (rule.type as string) === "PROCESS-NAME")).toBe(false);
    expect(rules).toContainEqual(expect.objectContaining({
      type: "URL-REGEX",
      value: "^https?://([A-Za-z0-9-]+\\.)*pornhub\\.[A-Za-z0-9.-]*(:[0-9]+)?(/|$)",
    }));
    expect(rules).toContainEqual(expect.objectContaining({ type: "DOMAIN-SUFFIX", value: "kwai.net" }));
    expect(rules).toContainEqual(expect.objectContaining({ type: "GEOIP", value: "CN", target: { kind: "direct" } }));
    expect(rules.every((rule) => rule.value.length > 0)).toBe(true);
    expect(rules.some((rule) => rule.id === "my-routing-rule-25")).toBe(true);

    const output = generateLoonProfile({ nodes: [], config }).content;
    expect(output).toContain("https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/Telegram/Telegram.list,policy=TG,enabled=true");
    expect(output).toContain("https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/Privacy/Privacy_Domain.list,policy=BLOCK,enabled=true");
    expect(output).toContain("https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/Apple/Apple_Domain.list,policy=APPLE,enabled=true");
    expect(output).toContain("img-url=https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Proxy.png");
    expect(output).toContain("https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/Netflix/Netflix.list,policy=PROXY,enabled=true");
    expect(output).toContain("https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/ChinaMedia/ChinaMedia.list,policy=DIRECT,enabled=true");
    expect(output).toContain("IP-ASN,44907,TG,no-resolve");
    expect(output).not.toContain("PROCESS-NAME,");
    expect(output).toContain("URL-REGEX,^https?://([A-Za-z0-9-]+\\.)*pornhub\\.[A-Za-z0-9.-]*(:[0-9]+)?(/|$),PROXY");
    expect(output).not.toContain("DOMAIN-WILDCARD,");
    expect(output).toContain("IP-CIDR,114.114.114.114/32,BLOCK,no-resolve");
    expect(output).toContain("FINAL,FINAL");
  });
});
