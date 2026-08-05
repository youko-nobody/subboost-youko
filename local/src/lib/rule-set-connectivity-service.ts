import { generateClashConfig } from "@subboost/core/generator";
import { PROXY_GROUP_MODULES } from "@subboost/core/generator/proxy-groups";
import { EXPERIMENTAL_CN_RULE } from "@subboost/core/generator/rules";
import { buildGenerateOptionsFromConfig, getEffectiveTestOptions } from "@subboost/core/subscription/config-utils";
import { buildProxyProvidersFromConfig } from "@subboost/core/subscription/proxy-providers";
import type { ParsedNode } from "@subboost/core/types/node";
import { SUBSCRIPTION_IMPORT_USER_AGENTS } from "@subboost/server-core/subscription";
import { createMyRoutingTemplateParts } from "@subboost/core/templates/my-routing-template";
import { prisma } from "./prisma";
import { probePublicUrlDirect, type PublicUrlProbeResult } from "./source-import";
import { readSubscriptionSecrets } from "./subscription-service";

export type RuleSetConnectivityStatus = "healthy" | "degraded" | "failed";
export type RuleSetSourceType = "builtin" | "custom" | "template" | "generated";

export type RuleSetConnectivityItem = {
  id: string;
  name: string;
  source: RuleSetSourceType;
  url?: string;
  finalUrl?: string;
  behavior?: string;
  format?: string;
  path?: string;
  result: "ok" | "failed" | "skipped";
  method?: "GET" | "HEAD";
  statusCode?: number;
  contentType?: string;
  contentLengthBytes?: number;
  error?: string;
  publicReason?: string | null;
  errorCategory?: string;
};

export type RuleSetConnectivityResult = {
  status: RuleSetConnectivityStatus;
  checkedAt: string;
  message: string;
  total: number;
  checkedCount: number;
  okCount: number;
  failedCount: number;
  skippedCount: number;
  results: RuleSetConnectivityItem[];
};

type ProbeUrl = (request: {
  url: string;
  method: "GET" | "HEAD";
  userAgent: string;
  timeoutMs: number;
}) => Promise<PublicUrlProbeResult>;

const RULE_SET_CHECK_TIMEOUT_MS = 8000;
const RULE_SET_CHECK_CONCURRENCY = 8;
const RULE_SET_CHECK_USER_AGENT = SUBSCRIPTION_IMPORT_USER_AGENTS[0] || "SubBoost";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readContentLength(headers: Record<string, string>): number | undefined {
  const raw = headers["content-length"];
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

function collectRuleSetLabels(config: Record<string, unknown>): Map<string, { name: string; source: RuleSetSourceType }> {
  const labels = new Map<string, { name: string; source: RuleSetSourceType }>();
  for (const proxyModule of PROXY_GROUP_MODULES) {
    for (const rule of proxyModule.rules) {
      if (!labels.has(rule.id)) labels.set(rule.id, { name: rule.name, source: "builtin" });
    }
  }
  if (!labels.has(EXPERIMENTAL_CN_RULE.id)) {
    labels.set(EXPERIMENTAL_CN_RULE.id, { name: EXPERIMENTAL_CN_RULE.name, source: "builtin" });
  }

  if (toTrimmedString(config.template) === "my-routing" && !Array.isArray(config.customRuleSets)) {
    for (const ruleSet of createMyRoutingTemplateParts().customRuleSets) {
      if (!labels.has(ruleSet.id)) labels.set(ruleSet.id, { name: ruleSet.name, source: "template" });
    }
  }

  if (Array.isArray(config.customRuleSets)) {
    for (const raw of config.customRuleSets) {
      if (!isRecord(raw)) continue;
      const id = toTrimmedString(raw.id);
      if (!id || labels.has(id)) continue;
      labels.set(id, { name: toTrimmedString(raw.name) || id, source: "custom" });
    }
  }
  return labels;
}

export function collectGeneratedRuleSetProviders(params: {
  config: Record<string, unknown>;
  nodes: ParsedNode[];
}): RuleSetConnectivityItem[] {
  const { testUrl, testInterval } = getEffectiveTestOptions(params.config);
  const proxyProviders = buildProxyProvidersFromConfig(params.config, { testUrl, testInterval });
  const generated = generateClashConfig(
    buildGenerateOptionsFromConfig(params.config, {
      nodes: params.nodes,
      proxyProviders,
    })
  ) as unknown as Record<string, unknown>;
  const providers = isRecord(generated["rule-providers"]) ? generated["rule-providers"] : {};
  const labels = collectRuleSetLabels(params.config);

  return Object.entries(providers).map(([id, raw]) => {
    const provider = isRecord(raw) ? raw : {};
    const label = labels.get(id);
    const url = toTrimmedString(provider["url"]);
    return {
      id,
      name: label?.name || id,
      source: label?.source || "generated",
      ...(url ? { url } : {}),
      ...(toTrimmedString(provider["behavior"]) ? { behavior: toTrimmedString(provider["behavior"]) } : {}),
      ...(toTrimmedString(provider["format"]) ? { format: toTrimmedString(provider["format"]) } : {}),
      ...(toTrimmedString(provider["path"]) ? { path: toTrimmedString(provider["path"]) } : {}),
      result: url ? "failed" : "skipped",
      ...(url ? {} : { error: "规则集没有生成 URL" }),
    };
  });
}

function shouldFallbackToGet(probe: PublicUrlProbeResult): boolean {
  if (!probe.ok) return false;
  return probe.status === 403 || probe.status === 405 || probe.status === 501;
}

function itemFromProbe(
  item: RuleSetConnectivityItem,
  probe: PublicUrlProbeResult
): RuleSetConnectivityItem {
  if (probe.ok && probe.status >= 200 && probe.status < 300) {
    return {
      ...item,
      result: "ok",
      method: probe.method,
      statusCode: probe.status,
      finalUrl: probe.finalUrl,
      contentType: probe.headers["content-type"],
      ...(readContentLength(probe.headers) !== undefined ? { contentLengthBytes: readContentLength(probe.headers) } : {}),
      error: undefined,
      publicReason: undefined,
      errorCategory: undefined,
    };
  }

  if (probe.ok) {
    return {
      ...item,
      result: "failed",
      method: probe.method,
      statusCode: probe.status,
      finalUrl: probe.finalUrl,
      contentType: probe.headers["content-type"],
      ...(readContentLength(probe.headers) !== undefined ? { contentLengthBytes: readContentLength(probe.headers) } : {}),
      error: `HTTP ${probe.status}`,
      publicReason: `HTTP ${probe.status}`,
    };
  }

  return {
    ...item,
    result: "failed",
    method: probe.method,
    ...(probe.responseStatus ? { statusCode: probe.responseStatus } : {}),
    error: probe.error,
    ...(probe.publicReason !== undefined ? { publicReason: probe.publicReason } : {}),
    ...(probe.errorCategory ? { errorCategory: probe.errorCategory } : {}),
  };
}

async function checkOneRuleSet(
  item: RuleSetConnectivityItem,
  probeUrl: ProbeUrl
): Promise<RuleSetConnectivityItem> {
  if (!item.url) return { ...item, result: "skipped", error: item.error || "规则集没有生成 URL" };

  const head = await probeUrl({
    url: item.url,
    method: "HEAD",
    userAgent: RULE_SET_CHECK_USER_AGENT,
    timeoutMs: RULE_SET_CHECK_TIMEOUT_MS,
  });
  if (!shouldFallbackToGet(head)) return itemFromProbe(item, head);

  const get = await probeUrl({
    url: item.url,
    method: "GET",
    userAgent: RULE_SET_CHECK_USER_AGENT,
    timeoutMs: RULE_SET_CHECK_TIMEOUT_MS,
  });
  return itemFromProbe(item, get);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      out[index] = await mapper(items[index]);
    }
  });
  await Promise.all(workers);
  return out;
}

function buildRuleSetConnectivityMessage(params: {
  total: number;
  okCount: number;
  failedCount: number;
  skippedCount: number;
}): string {
  if (params.total === 0) return "当前配置没有生成远程规则集。";
  if (params.failedCount === 0 && params.skippedCount === 0) return `规则集连通性正常，${params.okCount} 个 URL 可访问。`;
  if (params.okCount > 0) return `部分规则集无法访问：成功 ${params.okCount} 个，失败 ${params.failedCount} 个。`;
  return "规则集连通性检查失败，当前生成的规则集 URL 均不可访问。";
}

function resolveRuleSetConnectivityStatus(params: {
  total: number;
  okCount: number;
  failedCount: number;
  skippedCount: number;
}): RuleSetConnectivityStatus {
  if (params.total === 0) return "degraded";
  if (params.failedCount === 0 && params.skippedCount === 0) return "healthy";
  if (params.okCount > 0) return "degraded";
  return "failed";
}

export async function checkRuleSetConnectivityForConfig(
  params: {
    config: Record<string, unknown>;
    nodes: ParsedNode[];
  },
  deps: { probeUrl?: ProbeUrl } = {}
): Promise<RuleSetConnectivityResult> {
  let initialResults: RuleSetConnectivityItem[];
  try {
    initialResults = collectGeneratedRuleSetProviders(params);
  } catch (error) {
    const message = error instanceof Error ? error.message : "配置生成失败";
    return {
      status: "failed",
      checkedAt: new Date().toISOString(),
      message: `配置生成失败，暂时无法检查规则集：${message}`,
      total: 1,
      checkedCount: 0,
      okCount: 0,
      failedCount: 1,
      skippedCount: 0,
      results: [
        {
          id: "config-generation",
          name: "配置生成",
          source: "generated",
          result: "failed",
          error: message,
        },
      ],
    };
  }
  const probeUrl = deps.probeUrl ?? probePublicUrlDirect;
  const results = await mapWithConcurrency(
    initialResults,
    RULE_SET_CHECK_CONCURRENCY,
    (item) => checkOneRuleSet(item, probeUrl)
  );
  const total = results.length;
  const okCount = results.filter((item) => item.result === "ok").length;
  const failedCount = results.filter((item) => item.result === "failed").length;
  const skippedCount = results.filter((item) => item.result === "skipped").length;
  const checkedCount = total - skippedCount;
  const status = resolveRuleSetConnectivityStatus({ total, okCount, failedCount, skippedCount });

  return {
    status,
    checkedAt: new Date().toISOString(),
    message: buildRuleSetConnectivityMessage({ total, okCount, failedCount, skippedCount }),
    total,
    checkedCount,
    okCount,
    failedCount,
    skippedCount,
    results,
  };
}

export async function checkSubscriptionRuleSetConnectivity(
  ownerId: string,
  subscriptionId: string
): Promise<RuleSetConnectivityResult | null> {
  const row = await prisma.subscription.findFirst({
    where: { id: subscriptionId, ownerId },
    include: { autoUpdateState: true },
  });
  if (!row) return null;

  const secrets = readSubscriptionSecrets(row);
  return checkRuleSetConnectivityForConfig({
    config: secrets.config,
    nodes: secrets.nodes,
  });
}
