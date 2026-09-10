import { DEFAULT_SUBBOOST_CONFIG } from "@subboost/core/config/defaults";
import type {
  CustomProxyGroup,
  CustomRule,
  CustomRuleSet,
  ProxyGroupMemberRef,
  ProxyGroupRuleTarget,
} from "@subboost/core/types/config";
import {
  MY_ROUTING_CUSTOM_PROXY_GROUPS,
  MY_ROUTING_CUSTOM_RULES,
  MY_ROUTING_CUSTOM_RULE_SETS,
  MY_ROUTING_FALLBACK_POLICY_TARGET,
  MY_ROUTING_RULE_ORDER,
} from "../templates/my-routing-template";
import type {
  SurgeConfig,
  SurgePolicyRef,
  SurgeProxyGroup,
  SurgeProxyGroupType,
  SurgeRegionPolicyGroup,
  SurgeRule,
  SurgeRuleSet,
  SurgeRuleSetResourceType,
  SurgeRuleType,
} from "./types";

export const DEFAULT_SURGE_GENERAL_TEXT = [
  "loglevel = notify",
  "ipv6 = false",
  "show-error-page-for-reject = true",
].join("\n");

export const SURGE_PROXY_GROUP_TYPES: SurgeProxyGroupType[] = [
  "select",
  "url-test",
  "fallback",
  "load-balance",
  "smart",
];

export const SURGE_RULE_TYPES: SurgeRuleType[] = [
  "DOMAIN",
  "DOMAIN-SUFFIX",
  "DOMAIN-KEYWORD",
  "IP-CIDR",
  "IP-CIDR6",
  "GEOIP",
  "PROCESS-NAME",
  "DST-PORT",
  "SRC-PORT",
  "FINAL",
];

export const SURGE_RULE_SET_RESOURCE_TYPES: SurgeRuleSetResourceType[] = [
  "rule-set",
  "domain-set",
];

export const DEFAULT_SURGE_REGION_GROUPS: SurgeRegionPolicyGroup[] = [
  {
    id: "region-hk",
    name: "香港 Smart",
    enabled: true,
    type: "smart",
    keywords: ["香港", "HK", "Hong Kong", "HongKong"],
    includeInProxy: true,
    policyPriority: "香港:0.9;HK:0.8;Hong Kong:0.8",
  },
  {
    id: "region-tw",
    name: "台湾 Smart",
    enabled: true,
    type: "smart",
    keywords: ["台湾", "TW", "Taiwan"],
    includeInProxy: true,
    policyPriority: "台湾:0.9;TW:0.8;Taiwan:0.8",
  },
  {
    id: "region-jp",
    name: "日本 Smart",
    enabled: true,
    type: "smart",
    keywords: ["日本", "JP", "Japan", "Tokyo", "Osaka"],
    includeInProxy: true,
    policyPriority: "日本:0.9;JP:0.8;Japan:0.8",
  },
  {
    id: "region-sg",
    name: "新加坡 Smart",
    enabled: true,
    type: "smart",
    keywords: ["新加坡", "SG", "Singapore"],
    includeInProxy: true,
    policyPriority: "新加坡:0.9;SG:0.8;Singapore:0.8",
  },
  {
    id: "region-us",
    name: "美国 Smart",
    enabled: true,
    type: "smart",
    keywords: ["美国", "US", "USA", "United States", "Los Angeles", "LA"],
    includeInProxy: true,
    policyPriority: "美国:0.9;US:0.8;USA:0.8",
  },
  {
    id: "region-kr",
    name: "韩国 Smart",
    enabled: false,
    type: "smart",
    keywords: ["韩国", "KR", "Korea", "Seoul"],
    includeInProxy: false,
    policyPriority: "韩国:0.9;KR:0.8;Korea:0.8",
  },
  {
    id: "region-uk",
    name: "英国 Smart",
    enabled: false,
    type: "smart",
    keywords: ["英国", "UK", "United Kingdom", "London"],
    includeInProxy: false,
    policyPriority: "英国:0.9;UK:0.8;United Kingdom:0.8",
  },
  {
    id: "region-de",
    name: "德国 Smart",
    enabled: false,
    type: "smart",
    keywords: ["德国", "DE", "Germany", "Frankfurt"],
    includeInProxy: false,
    policyPriority: "德国:0.9;DE:0.8;Germany:0.8",
  },
  {
    id: "region-fr",
    name: "法国 Smart",
    enabled: false,
    type: "smart",
    keywords: ["法国", "FR", "France", "Paris"],
    includeInProxy: false,
    policyPriority: "法国:0.9;FR:0.8;France:0.8",
  },
  {
    id: "region-ca",
    name: "加拿大 Smart",
    enabled: false,
    type: "smart",
    keywords: ["加拿大", "CA", "Canada"],
    includeInProxy: false,
    policyPriority: "加拿大:0.9;CA:0.8;Canada:0.8",
  },
  {
    id: "region-au",
    name: "澳大利亚 Smart",
    enabled: false,
    type: "smart",
    keywords: ["澳大利亚", "澳洲", "AU", "Australia", "Sydney"],
    includeInProxy: false,
    policyPriority: "澳大利亚:0.9;AU:0.8;Australia:0.8",
  },
];

const defaultProxyPolicies: SurgePolicyRef[] = [
  { kind: "group", id: "region-hk" },
  { kind: "group", id: "region-tw" },
  { kind: "group", id: "region-jp" },
  { kind: "group", id: "region-sg" },
  { kind: "group", id: "region-us" },
  { kind: "direct" },
  { kind: "reject" },
];

const SURGE_RULE_SET_BASE_URL =
  "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge";

type YoukoSurgeRuleSetSource = {
  url: string;
  resourceType?: SurgeRuleSetResourceType;
};

function surgeRuleSet(
  url: string,
  resourceType: SurgeRuleSetResourceType = "rule-set",
): YoukoSurgeRuleSetSource {
  return { url, resourceType };
}

function surgeDomainSet(url: string): YoukoSurgeRuleSetSource {
  return surgeRuleSet(url, "domain-set");
}

const YOUKO_SURGE_RULE_SET_URLS: Record<string, YoukoSurgeRuleSetSource> = {
  BM_ADVERTISING_LITE: surgeRuleSet(
    `${SURGE_RULE_SET_BASE_URL}/AdvertisingLite/AdvertisingLite.list`,
  ),
  BM_EASYPRIVACY: surgeRuleSet(
    `${SURGE_RULE_SET_BASE_URL}/Privacy/Privacy.list`,
  ),
  BLOCK_HTTP_DNS_PLUS: surgeRuleSet(
    `${SURGE_RULE_SET_BASE_URL}/BlockHttpDNS/BlockHttpDNS.list`,
  ),
  CHINA_DNS_DOMAIN: surgeRuleSet(
    `${SURGE_RULE_SET_BASE_URL}/ChinaDNS/ChinaDNS.list`,
  ),
  CHINA_DNS_IP: surgeRuleSet(
    `${SURGE_RULE_SET_BASE_URL}/ChinaDNS/ChinaDNS.list`,
  ),
  HIJACKING_PLUS: surgeRuleSet(
    `${SURGE_RULE_SET_BASE_URL}/Hijacking/Hijacking.list`,
  ),
  GEMINI_DOMAIN: surgeRuleSet(`${SURGE_RULE_SET_BASE_URL}/Gemini/Gemini.list`),
  COPILOT_DOMAIN: surgeRuleSet(
    `${SURGE_RULE_SET_BASE_URL}/Copilot/Copilot.list`,
  ),
  BM_OPENAI: surgeRuleSet(`${SURGE_RULE_SET_BASE_URL}/OpenAI/OpenAI.list`),
  BM_CLAUDE: surgeRuleSet(`${SURGE_RULE_SET_BASE_URL}/Claude/Claude.list`),
  BM_TELEGRAM: surgeRuleSet(
    `${SURGE_RULE_SET_BASE_URL}/Telegram/Telegram.list`,
  ),
  BM_YOUTUBE: surgeRuleSet(`${SURGE_RULE_SET_BASE_URL}/YouTube/YouTube.list`),
  APPLE_NEWS_DOMAIN: surgeRuleSet(
    `${SURGE_RULE_SET_BASE_URL}/AppleNews/AppleNews.list`,
  ),
  KWAI_DOMAIN: surgeRuleSet(
    `${SURGE_RULE_SET_BASE_URL}/KuaiShou/KuaiShou.list`,
  ),
  GLOBAL_DNS_DOMAIN: surgeRuleSet(`${SURGE_RULE_SET_BASE_URL}/DNS/DNS.list`),
  APPLE_DOMAIN: surgeDomainSet(
    `${SURGE_RULE_SET_BASE_URL}/Apple/Apple_Domain.list`,
  ),
  APPLE_IP: surgeRuleSet(
    `${SURGE_RULE_SET_BASE_URL}/Apple/Apple_All_No_Resolve.list`,
  ),
  MICROSOFT_APPS_DOMAIN: surgeRuleSet(
    `${SURGE_RULE_SET_BASE_URL}/Microsoft/Microsoft.list`,
  ),
  WEIYUN_DOMAIN: surgeDomainSet(
    `${SURGE_RULE_SET_BASE_URL}/Tencent/Tencent_Domain.list`,
  ),
  BAIDU_NETDISK_DOMAIN: surgeRuleSet(
    `${SURGE_RULE_SET_BASE_URL}/Cloud/BaiduCloud/BaiduCloud.list`,
  ),
  BM_BILIBILI: surgeRuleSet(
    `${SURGE_RULE_SET_BASE_URL}/BiliBili/BiliBili.list`,
  ),
  BM_XIAOHONGSHU: surgeRuleSet(
    `${SURGE_RULE_SET_BASE_URL}/XiaoHongShu/XiaoHongShu.list`,
  ),
  BM_TIKTOK: surgeRuleSet(`${SURGE_RULE_SET_BASE_URL}/TikTok/TikTok.list`),
  AQARA_CN_DOMAIN: surgeRuleSet(
    `${SURGE_RULE_SET_BASE_URL}/LvMiLianChuang/LvMiLianChuang.list`,
  ),
  AQARA_GLOBAL_DOMAIN: surgeRuleSet(
    `${SURGE_RULE_SET_BASE_URL}/LvMiLianChuang/LvMiLianChuang.list`,
  ),
  GEO_ROUTING_ASIA_CHINA_CCTLD_DOMAIN: surgeDomainSet(
    `${SURGE_RULE_SET_BASE_URL}/China/China_Domain.list`,
  ),
  GEO_ROUTING_ASIA_CHINA_GEOIP: surgeRuleSet(
    `${SURGE_RULE_SET_BASE_URL}/ChinaIPs/ChinaIPs.list`,
  ),
  GEOSITE_CN_DOMAIN: surgeDomainSet(
    `${SURGE_RULE_SET_BASE_URL}/China/China_Domain.list`,
  ),
  CHINA_DOMAIN: surgeDomainSet(
    `${SURGE_RULE_SET_BASE_URL}/China/China_Domain.list`,
  ),
  CHINA_MAX_DOMAIN: surgeDomainSet(
    `${SURGE_RULE_SET_BASE_URL}/ChinaMax/ChinaMax_Domain.list`,
  ),
};

function mapYoukoTarget(target: ProxyGroupRuleTarget): SurgePolicyRef | string {
  if (typeof target === "string") {
    const normalized = target.trim().toUpperCase();
    if (normalized === "DIRECT") return { kind: "direct" };
    if (normalized === "REJECT") return { kind: "reject" };
    return target.trim();
  }
  if (target.kind === "custom" || target.kind === "module")
    return { kind: "group", id: target.id };
  return { kind: "direct" };
}

function mapYoukoMember(target: ProxyGroupMemberRef): SurgePolicyRef {
  if (target.kind === "custom" || target.kind === "module")
    return { kind: "group", id: target.id };
  if (target.kind === "node") return { kind: "node", name: target.name };
  if (target.kind === "reject") return { kind: "reject" };
  return { kind: "direct" };
}

function mapYoukoGroupType(group: CustomProxyGroup): SurgeProxyGroupType {
  if (group.groupType === "direct-first" || group.groupType === "reject-first")
    return "select";
  return group.groupType;
}

function mapYoukoProxyGroup(group: CustomProxyGroup): SurgeProxyGroup {
  const configuredMembers =
    group.advanced?.memberOrder ?? group.advanced?.extraMembers ?? [];
  const policies = configuredMembers.map(mapYoukoMember);
  const includeAllNodes = group.advanced?.includeRegex !== "(?!)";
  return {
    id: group.id,
    name: group.name,
    type: mapYoukoGroupType(group),
    policies,
    ...(group.icon?.trim() ? { icon: group.icon.trim() } : {}),
    ...(includeAllNodes ? { includeAllNodes: true } : {}),
    ...(group.enabled === false ? { enabled: false } : {}),
  };
}

function mapYoukoRuleSet(ruleSet: CustomRuleSet): SurgeRuleSet {
  const source = YOUKO_SURGE_RULE_SET_URLS[ruleSet.id];
  return {
    id: ruleSet.id,
    name: ruleSet.name,
    url: source?.url ?? "",
    target: mapYoukoTarget(ruleSet.target),
    ...(source?.resourceType && source.resourceType !== "rule-set"
      ? { resourceType: source.resourceType }
      : {}),
    ...(ruleSet.noResolve ? { noResolve: true } : {}),
    enabled: true,
  };
}

function mapYoukoRule(rule: CustomRule): SurgeRule | null {
  if (!SURGE_RULE_TYPES.includes(rule.type as SurgeRuleType)) return null;
  return {
    id: rule.id,
    type: rule.type as SurgeRuleType,
    value: rule.value,
    target: mapYoukoTarget(rule.target),
    ...(rule.noResolve ? { noResolve: true } : {}),
    enabled: true,
  };
}

function mapYoukoRuleOrder(key: string): string {
  if (key.startsWith("custom-rule-set:"))
    return `rule-set:${key.slice("custom-rule-set:".length)}`;
  if (key.startsWith("custom-rule:"))
    return `rule:${key.slice("custom-rule:".length)}`;
  return key;
}

export function createDefaultSurgeConfig(): SurgeConfig {
  return {
    generalText: DEFAULT_SURGE_GENERAL_TEXT,
    proxyGroups: [
      {
        id: "proxy",
        name: "PROXY",
        type: "select",
        policies: [...defaultProxyPolicies],
        enabled: true,
      },
    ],
    regionGroups: DEFAULT_SURGE_REGION_GROUPS.map((group) => ({
      ...group,
      keywords: [...group.keywords],
    })),
    ruleSets: [],
    rules: [],
    finalTarget: { kind: "group", id: "proxy" },
    testUrl: DEFAULT_SUBBOOST_CONFIG.testUrl,
    testInterval: DEFAULT_SUBBOOST_CONFIG.testInterval,
    managedConfigEnabled: false,
    managedConfigUrl: "",
  };
}

export function createYoukoSurgeConfig(): SurgeConfig {
  return {
    generalText: DEFAULT_SURGE_GENERAL_TEXT,
    proxyGroups: MY_ROUTING_CUSTOM_PROXY_GROUPS.map(mapYoukoProxyGroup),
    regionGroups: [],
    ruleSets: MY_ROUTING_CUSTOM_RULE_SETS.map(mapYoukoRuleSet).filter(
      (ruleSet) => Boolean(ruleSet.url),
    ),
    rules: MY_ROUTING_CUSTOM_RULES.map(mapYoukoRule).filter(
      (rule): rule is SurgeRule => Boolean(rule),
    ),
    ruleOrder: MY_ROUTING_RULE_ORDER.map(mapYoukoRuleOrder),
    finalTarget: mapYoukoTarget(MY_ROUTING_FALLBACK_POLICY_TARGET),
    testUrl: "http://www.google.com/blank.html",
    testInterval: DEFAULT_SUBBOOST_CONFIG.testInterval,
    managedConfigEnabled: false,
    managedConfigUrl: "",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function rawText(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function positiveInt(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : undefined;
}

function bool(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function normalizeGroupType(
  value: unknown,
  fallback: SurgeProxyGroupType = "select",
): SurgeProxyGroupType {
  return SURGE_PROXY_GROUP_TYPES.includes(value as SurgeProxyGroupType)
    ? (value as SurgeProxyGroupType)
    : fallback;
}

function normalizeRuleType(
  value: unknown,
  fallback: SurgeRuleType = "DOMAIN-SUFFIX",
): SurgeRuleType {
  return SURGE_RULE_TYPES.includes(value as SurgeRuleType)
    ? (value as SurgeRuleType)
    : fallback;
}

function normalizeRuleSetResourceType(
  value: unknown,
): SurgeRuleSetResourceType {
  return SURGE_RULE_SET_RESOURCE_TYPES.includes(
    value as SurgeRuleSetResourceType,
  )
    ? (value as SurgeRuleSetResourceType)
    : "rule-set";
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    const normalized = text(item);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function normalizePolicyRef(value: unknown): SurgePolicyRef | string | null {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized ? normalized : null;
  }
  if (!isRecord(value)) return null;
  if (value.kind === "direct") return { kind: "direct" };
  if (value.kind === "reject") return { kind: "reject" };
  if (value.kind === "node") {
    const name = text(value.name);
    return name ? { kind: "node", name } : null;
  }
  if (value.kind === "group") {
    const id = text(value.id);
    return id ? { kind: "group", id } : null;
  }
  return null;
}

function normalizePolicyRefs(value: unknown): SurgePolicyRef[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizePolicyRef)
    .filter(
      (item): item is SurgePolicyRef =>
        Boolean(item) && typeof item !== "string",
    );
}

function normalizeRegionGroups(
  value: unknown,
  defaults: SurgeRegionPolicyGroup[],
): SurgeRegionPolicyGroup[] {
  if (!Array.isArray(value)) return defaults;
  const out: SurgeRegionPolicyGroup[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const id = text(item.id);
    const name = text(item.name);
    if (!id || !name) continue;
    out.push({
      id,
      name,
      enabled: item.enabled !== false,
      type: normalizeGroupType(item.type, "smart"),
      keywords: normalizeStringList(item.keywords),
      includeInProxy: item.includeInProxy !== false,
      ...(text(item.policyPriority)
        ? { policyPriority: text(item.policyPriority) }
        : {}),
    });
  }
  return out;
}

function normalizeProxyGroups(
  value: unknown,
  defaults: SurgeProxyGroup[],
): SurgeProxyGroup[] {
  if (!Array.isArray(value)) return defaults;
  const out: SurgeProxyGroup[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const id = text(item.id);
    const name = text(item.name);
    if (!id || !name) continue;
    const type = normalizeGroupType(item.type);
    out.push({
      id,
      name,
      type,
      policies: normalizePolicyRefs(item.policies),
      ...(text(item.icon) ? { icon: text(item.icon) } : {}),
      ...(item.includeAllNodes === true ? { includeAllNodes: true } : {}),
      ...(item.enabled === false ? { enabled: false } : {}),
      ...(text(item.url) ? { url: text(item.url) } : {}),
      ...(positiveInt(item.interval)
        ? { interval: positiveInt(item.interval) }
        : {}),
      ...(positiveInt(item.timeout)
        ? { timeout: positiveInt(item.timeout) }
        : {}),
      ...(positiveInt(item.tolerance)
        ? { tolerance: positiveInt(item.tolerance) }
        : {}),
      ...(text(item.policyPriority)
        ? { policyPriority: text(item.policyPriority) }
        : {}),
    });
  }
  return out.length > 0 ? out : defaults;
}

function normalizeRuleSets(value: unknown): SurgeRuleSet[] {
  if (!Array.isArray(value)) return [];
  const out: SurgeRuleSet[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const id = text(item.id);
    const name = text(item.name) || id;
    const url = text(item.url);
    const target = normalizePolicyRef(item.target);
    if (!id || !name || !target) continue;
    out.push({
      id,
      name,
      url,
      target,
      ...(normalizeRuleSetResourceType(item.resourceType) !== "rule-set"
        ? { resourceType: normalizeRuleSetResourceType(item.resourceType) }
        : {}),
      ...(item.noResolve === true ? { noResolve: true } : {}),
      ...(item.enabled === false ? { enabled: false } : {}),
    });
  }
  return out;
}

function normalizeRules(value: unknown): SurgeRule[] {
  if (!Array.isArray(value)) return [];
  const out: SurgeRule[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const id = text(item.id);
    const type = normalizeRuleType(item.type);
    const ruleValue = text(item.value);
    const target = normalizePolicyRef(item.target);
    if (!id || !target) continue;
    out.push({
      id,
      type,
      ...(type !== "FINAL" ? { value: ruleValue } : {}),
      target,
      ...(item.noResolve === true ? { noResolve: true } : {}),
      ...(item.enabled === false ? { enabled: false } : {}),
    });
  }
  return out;
}

export function normalizeSurgeConfig(value: unknown): SurgeConfig {
  const defaults = createDefaultSurgeConfig();
  if (!isRecord(value)) return defaults;
  const finalTarget =
    normalizePolicyRef(value.finalTarget) ?? defaults.finalTarget;
  return {
    generalText: rawText(value.generalText) ?? defaults.generalText,
    proxyGroups: normalizeProxyGroups(value.proxyGroups, defaults.proxyGroups),
    regionGroups: normalizeRegionGroups(
      value.regionGroups,
      defaults.regionGroups,
    ),
    ruleSets: normalizeRuleSets(value.ruleSets),
    rules: normalizeRules(value.rules),
    ...(Array.isArray(value.ruleOrder)
      ? { ruleOrder: normalizeStringList(value.ruleOrder) }
      : {}),
    finalTarget,
    testUrl: text(value.testUrl) || defaults.testUrl,
    testInterval: positiveInt(value.testInterval) ?? defaults.testInterval,
    managedConfigEnabled: bool(value.managedConfigEnabled) ?? false,
    managedConfigUrl: text(value.managedConfigUrl),
  };
}
