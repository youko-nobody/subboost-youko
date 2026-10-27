import {
  MY_ROUTING_CUSTOM_PROXY_GROUPS,
  MY_ROUTING_CUSTOM_RULES,
  MY_ROUTING_CUSTOM_RULE_SETS,
  MY_ROUTING_FALLBACK_POLICY_TARGET,
  MY_ROUTING_RULE_ORDER,
} from "../templates/my-routing-template";
import type {
  CustomProxyGroup,
  CustomRule,
  CustomRuleSet,
  ProxyGroupMemberRef,
  ProxyGroupRuleTarget,
} from "../types/config";
import { createDefaultLoonConfig } from "./defaults";
import type { LoonConfig, LoonPolicyRef, LoonRemoteRule, LoonRule, LoonRuleType } from "./types";

const LOON_RULE_BASE =
  "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon";
const YOUKO_RULE_BASE = "https://raw.githubusercontent.com/youko-nobody/rules/main/rules/surge";

const REMOTE_RULE_URLS: Record<string, string> = {
  EMBY_DIRECT: `${YOUKO_RULE_BASE}/emby-direct.list`,
  EMBY_PROXY: `${YOUKO_RULE_BASE}/emby-proxy.list`,
  BM_ADVERTISING_LITE: `${LOON_RULE_BASE}/AdvertisingLite/AdvertisingLite.list`,
  BM_EASYPRIVACY: `${LOON_RULE_BASE}/Privacy/Privacy.list`,
  BLOCK_HTTP_DNS_PLUS: `${LOON_RULE_BASE}/BlockHttpDNS/BlockHttpDNS.list`,
  CHINA_DNS_DOMAIN: `${LOON_RULE_BASE}/ChinaDNS/ChinaDNS.list`,
  HIJACKING_PLUS: `${LOON_RULE_BASE}/Hijacking/Hijacking.list`,
  GEMINI_DOMAIN: `${LOON_RULE_BASE}/Gemini/Gemini.list`,
  COPILOT_DOMAIN: `${LOON_RULE_BASE}/Copilot/Copilot.list`,
  BM_OPENAI: `${LOON_RULE_BASE}/OpenAI/OpenAI.list`,
  BM_CLAUDE: `${LOON_RULE_BASE}/Claude/Claude.list`,
  BM_TELEGRAM: `${LOON_RULE_BASE}/Telegram/Telegram.list`,
  BM_YOUTUBE: `${LOON_RULE_BASE}/YouTube/YouTube.list`,
  APPLE_NEWS_DOMAIN: `${LOON_RULE_BASE}/AppleNews/AppleNews.list`,
  GLOBAL_DNS_DOMAIN: `${LOON_RULE_BASE}/DNS/DNS.list`,
  APPLE_DOMAIN: `${LOON_RULE_BASE}/Apple/Apple.list`,
  MICROSOFT_APPS_DOMAIN: `${LOON_RULE_BASE}/Microsoft/Microsoft.list`,
  BAIDU_NETDISK_DOMAIN: `${LOON_RULE_BASE}/Cloud/BaiduCloud/BaiduCloud.list`,
  BM_BILIBILI: `${LOON_RULE_BASE}/BiliBili/BiliBili.list`,
  BM_XIAOHONGSHU: `${LOON_RULE_BASE}/XiaoHongShu/XiaoHongShu.list`,
  BM_TIKTOK: `${LOON_RULE_BASE}/TikTok/TikTok.list`,
  GEOSITE_CN_DOMAIN: `${LOON_RULE_BASE}/China/China.list`,
  CHINA_DOMAIN: `${LOON_RULE_BASE}/China/China_Domain.list`,
  CHINA_MAX_DOMAIN: `${LOON_RULE_BASE}/ChinaMax/ChinaMax.list`,
  CN_ASN: `${LOON_RULE_BASE}/ChinaASN/ChinaASN.list`,
};

const REMOTE_RULE_COMPANIONS: Record<string, { suffix: string; url: string }> = {
  BM_ADVERTISING_LITE: {
    suffix: "domain",
    url: `${LOON_RULE_BASE}/AdvertisingLite/AdvertisingLite_Domain.list`,
  },
  BM_EASYPRIVACY: {
    suffix: "domain",
    url: `${LOON_RULE_BASE}/Privacy/Privacy_Domain.list`,
  },
  APPLE_DOMAIN: {
    suffix: "domain",
    url: `${LOON_RULE_BASE}/Apple/Apple_Domain.list`,
  },
  CHINA_MAX_DOMAIN: {
    suffix: "domain",
    url: `${LOON_RULE_BASE}/ChinaMax/ChinaMax_Domain.list`,
  },
};

const LOON_EXTRA_REMOTE_RULES: LoonRemoteRule[] = [
  {
    id: "LOON_NETFLIX",
    name: "Netflix",
    url: `${LOON_RULE_BASE}/Netflix/Netflix.list`,
    target: { kind: "group", id: "my-proxy" },
    enabled: true,
  },
  {
    id: "LOON_DISNEY",
    name: "Disney",
    url: `${LOON_RULE_BASE}/Disney/Disney.list`,
    target: { kind: "group", id: "my-proxy" },
    enabled: true,
  },
  {
    id: "LOON_SPOTIFY",
    name: "Spotify",
    url: `${LOON_RULE_BASE}/Spotify/Spotify.list`,
    target: { kind: "group", id: "my-proxy" },
    enabled: true,
  },
  {
    id: "LOON_GOOGLE",
    name: "Google",
    url: `${LOON_RULE_BASE}/Google/Google.list`,
    target: { kind: "group", id: "my-proxy" },
    enabled: true,
  },
  {
    id: "LOON_GLOBAL_MEDIA",
    name: "GlobalMedia",
    url: `${LOON_RULE_BASE}/GlobalMedia/GlobalMedia.list`,
    target: { kind: "group", id: "my-proxy" },
    enabled: true,
  },
  {
    id: "LOON_CHINA_MEDIA",
    name: "ChinaMedia",
    url: `${LOON_RULE_BASE}/ChinaMedia/ChinaMedia.list`,
    target: { kind: "direct" },
    enabled: true,
  },
];

const LOON_REMOTE_RULE_INSERTS: Record<string, string[]> = {
  APPLE_NEWS_DOMAIN: [
    "LOON_NETFLIX",
    "LOON_DISNEY",
    "LOON_SPOTIFY",
    "LOON_GOOGLE",
    "LOON_GLOBAL_MEDIA",
  ],
  BM_BILIBILI: ["LOON_CHINA_MEDIA"],
};

type ExtraRuleSource = {
  sourceId: string;
  entries: string[];
  target?: LoonRule["target"];
};

// Sources without a directly compatible Loon list are embedded as native Loon rules.
const EXTRA_LOCAL_RULE_SOURCES: ExtraRuleSource[] = [
  {
    sourceId: "RABBIT_TELEGRAM_ASN",
    target: { kind: "group", id: "my-tg" },
    entries: [
      "DOMAIN-SUFFIX,comments.app",
      "DOMAIN-SUFFIX,telegra.ph",
      "DOMAIN-SUFFIX,telesco.pe",
      "IP-CIDR,109.239.140.0/24,no-resolve",
      "IP-CIDR,5.28.192.0/18,no-resolve",
      "IP-CIDR6,2a0a:f280::/32,no-resolve",
      "IP-ASN,44907,no-resolve",
      "IP-ASN,62014,no-resolve",
      "IP-ASN,62041,no-resolve",
      "IP-ASN,59930,no-resolve",
      "IP-ASN,211157,no-resolve",
    ],
  },
  {
    sourceId: "CHINA_DNS_IP",
    entries: [
      "IP-CIDR,114.114.114.114/32,no-resolve", "IP-CIDR,114.114.115.115/32,no-resolve",
      "IP-CIDR,1.2.4.8/32,no-resolve", "IP-CIDR,210.2.4.8/32,no-resolve",
      "IP-CIDR6,240c::6666/64,no-resolve", "IP-CIDR6,240c::6644/64,no-resolve",
      "IP-CIDR6,2001:dc7:1000::1/64,no-resolve", "IP-CIDR,223.5.5.5/32,no-resolve",
      "IP-CIDR,223.6.6.6/32,no-resolve", "IP-CIDR6,2400:3200::1/64,no-resolve",
      "IP-CIDR6,2400:3200:baba::1/64,no-resolve", "IP-CIDR,119.29.29.29/32,no-resolve",
      "IP-CIDR,119.28.28.28/32,no-resolve", "IP-CIDR,182.254.116.116/32,no-resolve",
      "IP-CIDR,182.254.118.118/32,no-resolve", "IP-CIDR6,2402:4e00::/64,no-resolve",
      "IP-CIDR,1.12.12.12/32,no-resolve", "IP-CIDR,120.53.53.53/32,no-resolve",
      "IP-CIDR,180.76.76.76/32,no-resolve", "IP-CIDR6,2400:da00::6666/64,no-resolve",
      "IP-CIDR,101.198.198.198/32,no-resolve", "IP-CIDR,101.198.199.200/32,no-resolve",
      "IP-CIDR,101.226.4.6/32,no-resolve", "IP-CIDR,218.30.118.6/32,no-resolve",
      "IP-CIDR,123.125.81.6/32,no-resolve", "IP-CIDR,140.207.198.6/32,no-resolve",
      "IP-CIDR,117.50.11.11/32,no-resolve", "IP-CIDR,117.50.22.22/32,no-resolve",
      "IP-CIDR,117.50.10.10/32,no-resolve", "IP-CIDR,117.50.20.20/32,no-resolve",
      "IP-CIDR,52.80.52.52/32,no-resolve", "IP-CIDR,52.80.66.66/32,no-resolve",
      "IP-CIDR,112.124.47.27/32,no-resolve", "IP-CIDR,114.215.126.16/32,no-resolve",
      "IP-CIDR6,2400:7fc0:849e:200::8/128,no-resolve", "IP-CIDR6,2404:c2c0:85d8:901::8/128,no-resolve",
      "IP-CIDR6,2400:7fc0:849e:200::4/128,no-resolve", "IP-CIDR6,2404:c2c0:85d8:901::4/128,no-resolve",
      "IP-CIDR,118.89.110.78/32,no-resolve", "IP-CIDR,47.96.179.163/32,no-resolve",
      "IP-CIDR,115.159.131.230/32,no-resolve", "IP-CIDR,101.6.6.6/32,no-resolve",
      "IP-CIDR6,2001:da8::666/128,no-resolve",
    ],
  },
  { sourceId: "GROK_DOMAIN", entries: ["DOMAIN-SUFFIX,x.ai", "DOMAIN-SUFFIX,grok.com", "DOMAIN-SUFFIX,featureassets.org", "DOMAIN-SUFFIX,xai.chronosphere.io"] },
  {
    sourceId: "APPLE_AI_DOMAIN",
    entries: [
      "DOMAIN-SUFFIX,smoot.apple.com", "DOMAIN,guzzoni.apple.com", "DOMAIN,gspe1-ssl.ls.apple.com",
      "DOMAIN,apple-relay.mask.apple-dns.net", "DOMAIN,apple-relay.fastly-edge.com",
      "DOMAIN,apple-relay.apple.com", "DOMAIN,apple-relay.cloudflare.com", "DOMAIN,cp4.cloudflare.com",
    ],
  },
  { sourceId: "SIGNAL_DOMAIN", entries: ["DOMAIN-SUFFIX,signal.org", "DOMAIN-SUFFIX,whispersystems.org"] },
  {
    sourceId: "KWAI_DOMAIN",
    entries: [
      "DOMAIN-SUFFIX,kwai-pro.com", "DOMAIN-SUFFIX,kwaipros.com", "DOMAIN-SUFFIX,kwai.net",
      "DOMAIN-SUFFIX,kwaionline.com", "DOMAIN-SUFFIX,mythad.com", "DOMAIN-SUFFIX,appsflyersdk.com",
      "DOMAIN-SUFFIX,config-proxy.kwd.100.app", "DOMAIN-SUFFIX,akamai.net",
      "DOMAIN-SUFFIX,kwai.net.queniulf.com", "DOMAIN-SUFFIX,kwai.net.cdn20.com",
      "DOMAIN-SUFFIX,kwai.net.queniuco.com", "DOMAIN-SUFFIX,ap4r.com",
    ],
  },
  {
    sourceId: "PORNHUB_DOMAIN",
    entries: [
      "DOMAIN-WILDCARD,pornhub.*", "DOMAIN-SUFFIX,phncdn.com", "DOMAIN-SUFFIX,phprcdn.com",
      "DOMAIN-SUFFIX,pornhubpremium.com", "DOMAIN-SUFFIX,pronstore.com", "DOMAIN-SUFFIX,pornhubapparel.com",
      "DOMAIN-SUFFIX,pornhub-deutsch.net", "DOMAIN-WILDCARD,avmiss.*", "DOMAIN-WILDCARD,missav.*",
      "DOMAIN-SUFFIX,myavlive.com", "DOMAIN-WILDCARD,*-missav.recombee.com", "DOMAIN-SUFFIX,xxxvjmp.com",
      "DOMAIN-SUFFIX,xxxivjmp.com", "DOMAIN-SUFFIX,mavrtracktor.com", "DOMAIN-WILDCARD,*hls.saawsedge.com",
      "DOMAIN-SUFFIX,nineyu.com", "DOMAIN-SUFFIX,surrit.com", "DOMAIN-SUFFIX,hotzcam.com",
      "DOMAIN-SUFFIX,e-hentai.org", "DOMAIN-WILDCARD,hanime.*", "DOMAIN-WILDCARD,hanime1.*",
      "DOMAIN-WILDCARD,hanimeone.*", "DOMAIN-SUFFIX,hembed.com", "DOMAIN-SUFFIX,kbnmnl.com",
      "DOMAIN-SUFFIX,img.doppiocdn.com", "DOMAIN-SUFFIX,cdn.impactserving.com",
    ],
  },
  { sourceId: "WAYBACK_MACHINE_DOMAIN", entries: ["DOMAIN-SUFFIX,archive.org"] },
  {
    sourceId: "WAYBACK_MACHINE_IP",
    entries: [
      "IP-CIDR,207.241.224.0/20,no-resolve", "IP-CIDR,208.70.24.0/21,no-resolve",
      "IP-CIDR,149.20.65.0/24,no-resolve", "IP-CIDR,142.104.123.0/24,no-resolve",
      "IP-CIDR,184.105.203.0/24,no-resolve", "IP-CIDR,165.22.30.252/32,no-resolve",
    ],
  },
  { sourceId: "PARSEC_DOMAIN", entries: ["DOMAIN-SUFFIX,parsec.app"] },
  {
    sourceId: "RUSTDESK_DOMAIN",
    entries: ["DOMAIN-SUFFIX,rs-ny.rustdesk.com", "DOMAIN-SUFFIX,rs-sg.rustdesk.com", "DOMAIN-SUFFIX,rs-cn.rustdesk.com"],
  },
  {
    sourceId: "ALIPAN_DOMAIN",
    entries: [
      "DOMAIN-SUFFIX,httpdns.aliyun.com", "DOMAIN-SUFFIX,httpdns.console.aliyun.com",
      "DOMAIN-SUFFIX,httpdns.aliyuncs.com", "DOMAIN-SUFFIX,httpdns-api.aliyuncs.com",
      "DOMAIN-SUFFIX,httpdns-sc.aliyuncs.com", "DOMAIN-SUFFIX,httpdns.alicdn.com",
      "DOMAIN-SUFFIX,aliyundrive.com", "DOMAIN-SUFFIX,aliyundrive.net", "DOMAIN-SUFFIX,alipan.com",
      "DOMAIN-SUFFIX,alicdn.com", "DOMAIN-SUFFIX,beacon-api.aliyuncs.com",
      "DOMAIN-SUFFIX,arms-retcode.aliyuncs.com", "DOMAIN-SUFFIX,oss-enet.aliyuncs.com",
      "DOMAIN-SUFFIX,data.alicloudccp.com", "DOMAIN-SUFFIX,fourier.alibaba.com",
      "DOMAIN-SUFFIX,unpm-upaas.uc.cn", "DOMAIN-SUFFIX,userver-upaas.uc.cn",
    ],
  },
  {
    sourceId: "WEIYUN_DOMAIN",
    entries: [
      "DOMAIN-SUFFIX,weiyun.com", "DOMAIN-SUFFIX,imgcache.qq.com", "DOMAIN-SUFFIX,aegis.qq.com",
      "DOMAIN-SUFFIX,tianshu.gtimg.cn", "DOMAIN-SUFFIX,qzonestyle.gtimg.cn",
      "DOMAIN-SUFFIX,jsonschema.gpic.cn", "DOMAIN-SUFFIX,imgcache.aq.com",
    ],
  },
  {
    sourceId: "WEIYUN_IP",
    entries: [
      "IP-CIDR,9.141.65.110/32,no-resolve", "IP-CIDR,9.141.66.219/32,no-resolve",
      "IP-CIDR,9.141.65.29/32,no-resolve", "IP-CIDR,9.141.66.244/32,no-resolve",
      "IP-CIDR,9.141.121.7/32,no-resolve", "IP-CIDR,9.146.200.61/32,no-resolve",
      "IP-CIDR,9.146.200.81/32,no-resolve", "IP-CIDR,9.146.202.27/32,no-resolve",
      "IP-CIDR,9.146.202.35/32,no-resolve", "IP-CIDR,9.146.205.191/32,no-resolve",
      "IP-CIDR,61.181.203.248/32,no-resolve",
    ],
  },
  {
    sourceId: "AQARA_CN_DOMAIN",
    entries: [
      "DOMAIN-SUFFIX,track-cn.aqara.com", "DOMAIN-SUFFIX,aiot-rpc-cn.aqara.com",
      "DOMAIN-SUFFIX,aiot-coap-cn.aqara.com", "DOMAIN-SUFFIX,coap-cn.aqara.com",
      "DOMAIN-SUFFIX,rpc-cn.aqara.com", "DOMAIN-SUFFIX,open-cn.aqara.com",
      "DOMAIN-SUFFIX,aiot-rpc-3rd.aqara.cn", "DOMAIN-SUFFIX,aiot-rpc.aqara.cn",
      "DOMAIN-SUFFIX,coap.aqara.cn", "DOMAIN-SUFFIX,rpc.aqara.cn", "DOMAIN-SUFFIX,aiot-coap.aqara.cn",
      "DOMAIN-SUFFIX,opencloud.aqara.cn", "DOMAIN-SUFFIX,aiot-rpc.ankasa.cn",
      "DOMAIN-WILDCARD,*aqara-camera-cn.*", "DOMAIN-SUFFIX,cdn.aqara.cn",
    ],
  },
  {
    sourceId: "AQARA_GLOBAL_DOMAIN",
    entries: [
      "DOMAIN-SUFFIX,track-us.aqara.com", "DOMAIN-SUFFIX,track-ger.aqara.com",
      "DOMAIN-SUFFIX,track-sg.aqara.com", "DOMAIN-SUFFIX,track-ru.aqara.com",
      "DOMAIN-SUFFIX,track-au.aqara.com", "DOMAIN-SUFFIX,aiot-rpc-usa.aqara.com",
      "DOMAIN-SUFFIX,aiot-coap-usa.aqara.com", "DOMAIN-SUFFIX,coap-usa.aqara.com",
      "DOMAIN-SUFFIX,rpc-usa.aqara.com", "DOMAIN-SUFFIX,open-usa.aqara.com",
      "DOMAIN-SUFFIX,aiot-rpc-ger.aqara.com", "DOMAIN-SUFFIX,aiot-coap-ger.aqara.com",
      "DOMAIN-SUFFIX,coap-ger.aqara.com", "DOMAIN-SUFFIX,rpc-ger.aqara.com", "DOMAIN-SUFFIX,open-ger.aqara.com",
      "DOMAIN-SUFFIX,aiot-rpc-ru.aqara.com", "DOMAIN-SUFFIX,aiot-coap-ru.aqara.com",
      "DOMAIN-SUFFIX,coap-ru.aqara.com", "DOMAIN-SUFFIX,rpc-ru.aqara.com", "DOMAIN-SUFFIX,open-ru.aqara.com",
      "DOMAIN-SUFFIX,aiot-rpc-sg.aqara.com", "DOMAIN-SUFFIX,aiot-coap-sg.aqara.com",
      "DOMAIN-SUFFIX,coap-sg.aqara.com", "DOMAIN-SUFFIX,rpc-sg.aqara.com", "DOMAIN-SUFFIX,open-sg.aqara.com",
      "DOMAIN-SUFFIX,aiot-rpc-au.aqara.com", "DOMAIN-SUFFIX,aiot-coap-au.aqara.com",
      "DOMAIN-SUFFIX,coap-au.aqara.com", "DOMAIN-SUFFIX,rpc-au.aqara.com", "DOMAIN-SUFFIX,open-au.aqara.com",
      "DOMAIN-SUFFIX,aiot-rpc-kr.aqara.com", "DOMAIN-SUFFIX,aiot-coap-kr.aqara.com",
      "DOMAIN-SUFFIX,coap-kr.aqara.com", "DOMAIN-SUFFIX,rpc-kr.aqara.com", "DOMAIN-SUFFIX,open-kr.aqara.com",
      "DOMAIN-WILDCARD,*aqara-camera-usa.*", "DOMAIN-WILDCARD,*aqara-camera-ru.*",
      "DOMAIN-WILDCARD,*aqara-camera-kr.*", "DOMAIN-WILDCARD,*aqara-camera-ger.*",
      "DOMAIN-WILDCARD,*aqara-camera-au.*", "DOMAIN-WILDCARD,*aqara-camera-sg.*",
      "DOMAIN-SUFFIX,cdn.aqara.com",
    ],
  },
  {
    sourceId: "AQARA_GLOBAL_IP",
    entries: [
      "IP-CIDR,3.23.78.166/32,no-resolve", "IP-CIDR,54.214.103.243/32,no-resolve",
      "IP-CIDR,54.71.80.151/32,no-resolve",
    ],
  },
  { sourceId: "UNSUPPORT_VPN_DOMAIN", entries: ["DOMAIN-SUFFIX,avito.ru"] },
  { sourceId: "GEO_ROUTING_ASIA_CHINA_CCTLD_DOMAIN", entries: ["DOMAIN-SUFFIX,cn"] },
];

function mapTarget(target: ProxyGroupRuleTarget): LoonPolicyRef | string {
  if (typeof target === "string") {
    const normalized = target.trim().toUpperCase();
    if (normalized === "DIRECT") return { kind: "direct" };
    if (normalized === "REJECT") return { kind: "reject" };
    return target.trim();
  }
  if (target.kind === "custom" || target.kind === "module") return { kind: "group", id: target.id };
  return { kind: "direct" };
}

function mapMember(member: ProxyGroupMemberRef): LoonPolicyRef {
  if (member.kind === "custom" || member.kind === "module") return { kind: "group", id: member.id };
  if (member.kind === "node") return { kind: "node", name: member.name };
  if (member.kind === "reject") return { kind: "reject" };
  return { kind: "direct" };
}

function mapGroupType(group: CustomProxyGroup): LoonConfig["proxyGroups"][number]["type"] {
  if (group.groupType === "url-test" || group.groupType === "fallback" || group.groupType === "load-balance") {
    return group.groupType;
  }
  return "select";
}

function mapGroup(group: CustomProxyGroup): LoonConfig["proxyGroups"][number] {
  const advanced = group.advanced;
  const members = advanced?.memberOrder ?? advanced?.extraMembers ?? [];
  const includeRegex = advanced?.includeRegex?.trim() || (group.includeInGroupMembers === false ? "" : ".*");
  return {
    id: group.id,
    name: group.name,
    type: mapGroupType(group),
    policies: members.map(mapMember),
    ...(group.icon?.trim() ? { icon: group.icon.trim() } : {}),
    ...(group.enabled === false ? { enabled: false } : {}),
    ...(includeRegex ? { includeRegex } : {}),
    ...(advanced?.excludeRegex?.trim() ? { excludeRegex: advanced.excludeRegex.trim() } : {}),
  };
}

function ruleSetById(id: string): CustomRuleSet | undefined {
  return MY_ROUTING_CUSTOM_RULE_SETS.find((ruleSet) => ruleSet.id === id);
}

function localRuleTarget(sourceId: string): LoonRule["target"] {
  const ruleSet = ruleSetById(sourceId);
  if (ruleSet) return mapTarget(ruleSet.target);
  const rule = MY_ROUTING_CUSTOM_RULES.find((item) => item.id === sourceId);
  return rule ? mapTarget(rule.target) : { kind: "direct" };
}

function orderIndex(key: string): number {
  const index = MY_ROUTING_RULE_ORDER.indexOf(key);
  if (index >= 0) return index;
  if (key === "custom-rule-set:RABBIT_TELEGRAM_ASN") {
    return orderIndex("custom-rule:my-routing-rule-25") - 0.5;
  }
  return Number.MAX_SAFE_INTEGER;
}

function mapCustomRule(rule: CustomRule): LoonRule | null {
  const type = rule.type as string;
  if (type === "GEOSITE" || type === "PROCESS-NAME" || type === "DST-PORT" || type === "SRC-PORT") return null;
  return {
    id: rule.id,
    type: type as LoonRuleType,
    value: rule.value,
    target: mapTarget(rule.target),
    ...(rule.noResolve ? { noResolve: true } : {}),
  };
}

function mapExtraRules(source: ExtraRuleSource): LoonRule[] {
  const target = source.target ?? localRuleTarget(source.sourceId);
  return source.entries.map((entry, index) => {
    const [rawType, value, ...options] = entry.split(",");
    return {
      id: `loon-${source.sourceId.toLowerCase()}-${index + 1}`,
      type: rawType as LoonRuleType,
      value,
      target,
      ...(options.includes("no-resolve") ? { noResolve: true } : {}),
    };
  });
}

function createLoonRuleOrder(): { remote: LoonRemoteRule[]; local: LoonRule[] } {
  const remoteRules: LoonRemoteRule[] = MY_ROUTING_CUSTOM_RULE_SETS
    .flatMap((ruleSet) => {
      const url = REMOTE_RULE_URLS[ruleSet.id];
      if (!url) return [];
      const base = {
        id: ruleSet.id,
        name: ruleSet.name,
        url,
        // Match the selected Youko policy for Microsoft's Loon-compatible list.
        target: ruleSet.id === "MICROSOFT_APPS_DOMAIN"
          ? { kind: "group" as const, id: "my-proxy" }
          : mapTarget(ruleSet.target),
        enabled: true,
      };
      const companion = REMOTE_RULE_COMPANIONS[ruleSet.id];
      return [
        base,
        ...(companion
          ? [{
              ...base,
              id: `${ruleSet.id}-${companion.suffix}`,
              name: `${ruleSet.name} 域名集`,
              url: companion.url,
            }]
          : []),
      ];
    })
    .sort((a, b) => orderIndex(`custom-rule-set:${a.id}`) - orderIndex(`custom-rule-set:${b.id}`));

  for (const [anchorId, insertedIds] of Object.entries(LOON_REMOTE_RULE_INSERTS)) {
    const anchorIndex = remoteRules.findIndex((rule) => rule.id === anchorId);
    const insertIndex = anchorIndex < 0 ? remoteRules.length : anchorIndex;
    const insertedRules = insertedIds
      .map((id) => LOON_EXTRA_REMOTE_RULES.find((rule) => rule.id === id))
      .filter((rule): rule is LoonRemoteRule => Boolean(rule));
    remoteRules.splice(insertIndex, 0, ...insertedRules);
  }

  const local = [
    ...MY_ROUTING_CUSTOM_RULES.map(mapCustomRule).filter((rule): rule is LoonRule => Boolean(rule)),
    ...EXTRA_LOCAL_RULE_SOURCES.flatMap(mapExtraRules),
  ].sort((a, b) => {
    const aKey = a.id.startsWith("my-routing-rule-")
      ? `custom-rule:${a.id}`
      : `custom-rule-set:${a.id.slice("loon-".length).replace(/-\d+$/, "").toUpperCase()}`;
    const bKey = b.id.startsWith("my-routing-rule-")
      ? `custom-rule:${b.id}`
      : `custom-rule-set:${b.id.slice("loon-".length).replace(/-\d+$/, "").toUpperCase()}`;
    return orderIndex(aKey) - orderIndex(bKey);
  });

  return { remote: remoteRules, local };
}

export function createYoukoLoonConfig(): LoonConfig {
  const { remote, local } = createLoonRuleOrder();
  return {
    ...createDefaultLoonConfig(),
    generalText: ["loglevel = notify", "ipv6 = false"].join("\n"),
    proxyGroups: MY_ROUTING_CUSTOM_PROXY_GROUPS.map(mapGroup),
    remoteRules: remote,
    rules: local,
    finalTarget: mapTarget(MY_ROUTING_FALLBACK_POLICY_TARGET),
    testUrl: "http://www.google.com/blank.html",
    testInterval: 300,
  };
}
