import { randomBytes, randomUUID } from "node:crypto";
import { generateClashYaml } from "@subboost/core/generator";
import { buildNodeContentKey } from "@subboost/core/node-identity";
import { buildGenerateOptionsFromConfig, getEffectiveTestOptions } from "@subboost/core/subscription/config-utils";
import { getNodeOriginName } from "@subboost/core/subscription/node-source-state";
import { buildProxyProvidersFromConfig } from "@subboost/core/subscription/proxy-providers";
import type { SubscriptionResponseInfo } from "@subboost/core/subscription/subscription-response-info";
import type { ParsedNode } from "@subboost/core/types/node";
import {
  buildManualRefreshFailureResponse,
  buildManualRefreshSuccessResponseBody,
  mergeConfigWithUpdateLock,
  normalizeSubscriptionConfigForPersistence,
  normalizeSubscriptionInfoForPersistence,
  normalizeSubscriptionName,
  normalizeSubscriptionUrlList,
  prepareRefreshCacheResult,
  refreshNodeSnapshot,
  resolveUpdateLockEnabled,
  serializeSubscriptionDetailData,
  serializeSubscriptionSummaryData,
  validateSubscriptionNodeList,
  type SavedSource,
  type RefreshNodeSnapshotResult,
} from "@subboost/server-core/subscription";
import { decryptJson, decryptJsonObject, encryptJson } from "./crypto";
import { getAppUrl } from "./env";
import { prisma } from "./prisma";
import { fetchSourceUserInfoHeadersDirect, importSourceUrlDirect } from "./source-import";
import { normalizeLocalAutoUpdateIntervalSeconds } from "./auto-update-policy";
import { assertValidLocalSubscriptionConfig } from "./subscription-config-validation";
import { createSubscriptionVersion } from "./subscription-version-service";

export const MAX_NODES_PER_SUBSCRIPTION = 10000;
export const CACHE_TTL_SECONDS = 3600;

export type SubscriptionRow = {
  id: string;
  ownerId: string;
  name: string;
  token: string;
  isPrimary: boolean;
  encryptedUrls: string;
  encryptedNodes: string;
  encryptedConfig: string;
  encryptedSubscriptionInfo: string | null;
  autoUpdateInterval: number | null;
  cacheExpiresAt: Date | null;
  lastAccessedAt: Date | null;
  lastUpdatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  autoUpdateState?: {
    externalFailureCount: number;
    failureSourceState: string | null;
    lastFailedAt: Date | null;
    lastAttemptedAt: Date | null;
    disabledAt: Date | null;
    disabledReason: string | null;
    disabledPreviousInterval: number | null;
  } | null;
};

export type SubscriptionSummary = {
  id: string;
  name: string;
  token: string;
  subscriptionUrl: string;
  nodeCount: number;
  sourceCount: number;
  yamlUrl: string;
  isPrimary: boolean;
  autoUpdateInterval: number | null;
  smartNodeMatchingEnabled: boolean;
  updateLockEnabled: boolean;
  cacheExpiresAt: string | null;
  lastAccessedAt: string | null;
  lastUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  autoUpdateState: {
    externalFailureCount: number;
    lastFailedAt: string | null;
    lastAttemptedAt: string | null;
    disabledAt: string | null;
    disabledReason: string | null;
    disabledPreviousInterval: number | null;
  };
};

export type SubscriptionDetail = SubscriptionSummary & {
  urls: string[];
  nodes: ParsedNode[];
  config: Record<string, unknown>;
  subscriptionInfo: Record<string, unknown>;
};

export type GeneratedSubscriptionYaml = {
  yaml: string;
  name: string;
  subscriptionInfo: SubscriptionResponseInfo;
  cacheExpirySeconds: number;
  autoUpdateIntervalSeconds: number | null;
  isAdmin: boolean;
};

export type SubscriptionRefreshPreview = {
  subscriptionId: string;
  status: "ready" | "blocked";
  message: string;
  wouldSave: boolean;
  updateLockEnabled: boolean;
  smartNodeMatchingEnabled: boolean;
  nodeChanges: {
    beforeCount: number;
    afterCount: number;
    addedCount: number;
    removedCount: number;
    keptCount: number;
    renamedCount: number;
    changedCount: number;
    added: string[];
    removed: string[];
    renamed: Array<{ from: string; to: string }>;
    changed: string[];
  };
  sourceChanges: {
    attemptedUrlFetch: boolean;
    usedUrlFetch: boolean;
    refreshableSourceCount: number;
    refreshedSourceCount: number;
    refreshedUrlSourceCount: number;
    refreshedStaticSourceCount: number;
    failedSourceCount: number;
    failedSources: RefreshNodeSnapshotResult["failedSources"];
  };
  subscriptionInfoChanges: Array<{
    key: string;
    before: number | string | null;
    after: number | string | null;
  }>;
  configProtection: {
    protectedSections: string[];
    sourcesWillUpdate: boolean;
  };
  generatedYamlBytes?: number;
  failureReason?: string;
};

type FormatSubscriptionOptions = {
  appUrl?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validateLocalSubscriptionNodes(value: unknown): ParsedNode[] {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value) && value.length > MAX_NODES_PER_SUBSCRIPTION) {
    throw new Error(`Node count cannot exceed ${MAX_NODES_PER_SUBSCRIPTION}.`);
  }
  return validateSubscriptionNodeList(value);
}

function buildLocalSubscriptionUrl(token: string, appUrl?: string): string {
  const baseUrl = (appUrl?.trim() || getAppUrl()).replace(/\/+$/, "");
  return `${baseUrl}/api/subscriptions/${token}/config.yaml`;
}

function buildLocalSubscriptionConfig(
  body: Record<string, unknown>,
  existingConfig: Record<string, unknown> = {}
): Record<string, unknown> {
  const submittedConfig =
    body.config && typeof body.config === "object" && !Array.isArray(body.config)
      ? (body.config as Record<string, unknown>)
      : undefined;
  const protectLockedConfig =
    submittedConfig !== undefined &&
    Object.keys(existingConfig).length > 0 &&
    resolveUpdateLockEnabled(existingConfig) &&
    body.updateLockEnabled !== false;
  const config = protectLockedConfig
    ? mergeConfigWithUpdateLock(existingConfig, submittedConfig)
    : body.config;

  return normalizeSubscriptionConfigForPersistence(
    {
      config,
      smartNodeMatchingEnabled: body.smartNodeMatchingEnabled,
      updateLockEnabled: body.updateLockEnabled,
    },
    {
      existingConfig,
      idFactory: randomUUID,
      splitUrlLines: true,
      mergeExistingConfig: false,
      defaultSmartNodeMatchingEnabled: true,
      defaultUpdateLockEnabled: true,
    }
  );
}

function assertNodeNameFilterKeepsOutput(
  nodes: ParsedNode[],
  config: Record<string, unknown>
): void {
  if (nodes.length === 0) return;
  const options = buildGenerateOptionsFromConfig(config, { nodes });
  const hasProxyProviders = Boolean(
    options.proxyProviders && Object.keys(options.proxyProviders).length > 0
  );
  if (options.nodes.length === 0 && !hasProxyProviders) {
    throw new Error("过滤后没有可用节点");
  }
}

function displayNodeName(node: ParsedNode): string {
  return typeof node.name === "string" && node.name.trim() ? node.name.trim() : "未命名节点";
}

function nodeOrigin(node: ParsedNode): string {
  const origin = getNodeOriginName(node).trim();
  return origin || displayNodeName(node);
}

function firstValues(values: string[], limit = 8): string[] {
  return values.slice(0, limit);
}

function summarizeNodeChanges(before: ParsedNode[], after: ParsedNode[]): SubscriptionRefreshPreview["nodeChanges"] {
  const beforeNames = new Map<string, ParsedNode>();
  const afterNames = new Map<string, ParsedNode>();
  const beforeOrigins = new Map<string, ParsedNode>();
  const afterOrigins = new Map<string, ParsedNode>();

  for (const node of before) {
    const name = displayNodeName(node);
    if (!beforeNames.has(name)) beforeNames.set(name, node);
    const origin = nodeOrigin(node);
    if (!beforeOrigins.has(origin)) beforeOrigins.set(origin, node);
  }
  for (const node of after) {
    const name = displayNodeName(node);
    if (!afterNames.has(name)) afterNames.set(name, node);
    const origin = nodeOrigin(node);
    if (!afterOrigins.has(origin)) afterOrigins.set(origin, node);
  }

  const added = [...afterNames.keys()].filter((name) => !beforeNames.has(name)).sort();
  const removed = [...beforeNames.keys()].filter((name) => !afterNames.has(name)).sort();
  const kept = [...afterNames.keys()].filter((name) => beforeNames.has(name));
  const changed = kept
    .filter((name) => {
      const beforeNode = beforeNames.get(name);
      const afterNode = afterNames.get(name);
      return Boolean(beforeNode && afterNode && buildNodeContentKey(beforeNode) !== buildNodeContentKey(afterNode));
    })
    .sort();

  const renamed: Array<{ from: string; to: string }> = [];
  for (const [origin, beforeNode] of beforeOrigins) {
    const afterNode = afterOrigins.get(origin);
    if (!afterNode) continue;
    const from = displayNodeName(beforeNode);
    const to = displayNodeName(afterNode);
    if (from !== to) renamed.push({ from, to });
  }
  renamed.sort((a, b) => `${a.from}\u0000${a.to}`.localeCompare(`${b.from}\u0000${b.to}`));

  return {
    beforeCount: before.length,
    afterCount: after.length,
    addedCount: added.length,
    removedCount: removed.length,
    keptCount: kept.length,
    renamedCount: renamed.length,
    changedCount: changed.length,
    added: firstValues(added),
    removed: firstValues(removed),
    renamed: renamed.slice(0, 8),
    changed: firstValues(changed),
  };
}

function summarizeSubscriptionInfoChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): SubscriptionRefreshPreview["subscriptionInfoChanges"] {
  const keys = ["upload", "download", "total", "expire", "planName", "profileWebPageUrl"];
  const normalize = (value: unknown): number | string | null =>
    typeof value === "number" || typeof value === "string" ? value : null;
  return keys
    .map((key) => ({ key, before: normalize(before[key]), after: normalize(after[key]) }))
    .filter((item) => item.before !== item.after);
}

function buildRefreshPreview(params: {
  subscriptionId: string;
  config: Record<string, unknown>;
  beforeNodes: ParsedNode[];
  beforeSubscriptionInfo: Record<string, unknown>;
  snapshot: RefreshNodeSnapshotResult;
  refreshResult: ReturnType<typeof prepareRefreshCacheResult>;
}): SubscriptionRefreshPreview {
  const updateLockEnabled = resolveUpdateLockEnabled(params.config);
  const sourceChanges = {
    attemptedUrlFetch: params.snapshot.attemptedUrlFetch,
    usedUrlFetch: params.snapshot.usedUrlFetch,
    refreshableSourceCount: params.snapshot.refreshableSourceCount,
    refreshedSourceCount: params.snapshot.refreshedSourceCount,
    refreshedUrlSourceCount: params.snapshot.refreshedUrlSourceCount,
    refreshedStaticSourceCount: params.snapshot.refreshedStaticSourceCount,
    failedSourceCount: params.snapshot.failedSourceCount,
    failedSources: params.snapshot.failedSources,
  };

  if (!params.refreshResult.ok) {
    const reason =
      params.refreshResult.reason === "all_sources_failed"
        ? "所有订阅源刷新失败"
        : params.refreshResult.reason === "empty_result"
          ? "刷新后没有可用节点"
          : "刷新后超过节点数量上限";
    return {
      subscriptionId: params.subscriptionId,
      status: "blocked",
      message: `${reason}，不会写入当前订阅。`,
      wouldSave: false,
      updateLockEnabled,
      smartNodeMatchingEnabled: params.config.smartNodeMatchingEnabled !== false,
      nodeChanges: summarizeNodeChanges(params.beforeNodes, params.snapshot.nodes),
      sourceChanges,
      subscriptionInfoChanges: summarizeSubscriptionInfoChanges(params.beforeSubscriptionInfo, params.snapshot.subscriptionInfo),
      configProtection: {
        protectedSections: updateLockEnabled
          ? ["模板", "策略组", "规则集", "规则顺序", "DNS/基础配置", "FINAL 兜底", "图标 URL"]
          : [],
        sourcesWillUpdate: false,
      },
      failureReason: params.refreshResult.reason,
    };
  }

  const nodeChanges = summarizeNodeChanges(params.beforeNodes, params.snapshot.nodes);
  const message =
    params.snapshot.failedSourceCount > 0
      ? "部分订阅源失败；可用订阅源的节点预览如下，确认刷新后会保存成功部分。"
      : "刷新预览正常，确认刷新后会写入这些变化。";

  return {
    subscriptionId: params.subscriptionId,
    status: "ready",
    message,
    wouldSave: true,
    updateLockEnabled,
    smartNodeMatchingEnabled: params.config.smartNodeMatchingEnabled !== false,
    nodeChanges,
    sourceChanges,
    subscriptionInfoChanges: summarizeSubscriptionInfoChanges(params.beforeSubscriptionInfo, params.snapshot.subscriptionInfo),
    configProtection: {
      protectedSections: updateLockEnabled
        ? ["模板", "策略组", "规则集", "规则顺序", "DNS/基础配置", "FINAL 兜底", "图标 URL"]
        : [],
      sourcesWillUpdate: true,
    },
    ...(typeof params.refreshResult.generatedYaml === "string"
      ? { generatedYamlBytes: Buffer.byteLength(params.refreshResult.generatedYaml, "utf8") }
      : {}),
  };
}

export function generateLocalSubscriptionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function readSubscriptionSecrets(row: SubscriptionRow) {
  return {
    urls: decryptJson<string[]>(row.encryptedUrls, []),
    nodes: decryptJson<ParsedNode[]>(row.encryptedNodes, []),
    config: decryptJsonObject(row.encryptedConfig),
    subscriptionInfo:
      normalizeSubscriptionInfoForPersistence(decryptJson<unknown>(row.encryptedSubscriptionInfo, {})) ?? {},
  };
}

export function formatSubscription(
  row: SubscriptionRow,
  options: FormatSubscriptionOptions = {}
): SubscriptionSummary {
  const secrets = readSubscriptionSecrets(row);
  const subscriptionUrl = buildLocalSubscriptionUrl(row.token, options.appUrl);
  return serializeSubscriptionSummaryData(row, secrets, {
    subscriptionUrl,
    yamlUrl: subscriptionUrl,
    dateMode: "iso",
    includeCounts: true,
    includeFailureSourceState: false,
    includeLastAttemptedAt: true,
  }) as SubscriptionSummary;
}

export function formatSubscriptionDetail(
  row: SubscriptionRow,
  options: FormatSubscriptionOptions = {}
): SubscriptionDetail {
  const secrets = readSubscriptionSecrets(row);
  const subscriptionUrl = buildLocalSubscriptionUrl(row.token, options.appUrl);
  return serializeSubscriptionDetailData(row, secrets, {
    subscriptionUrl,
    yamlUrl: subscriptionUrl,
    dateMode: "iso",
    includeCounts: true,
    includeFailureSourceState: false,
    includeLastAttemptedAt: true,
  }) as SubscriptionDetail;
}

export async function listSubscriptions(
  ownerId: string,
  options: FormatSubscriptionOptions = {}
): Promise<SubscriptionSummary[]> {
  const rows = await prisma.subscription.findMany({
    where: { ownerId },
    include: { autoUpdateState: true },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((row) => formatSubscription(row, options));
}

export async function createSubscription(
  ownerId: string,
  body: unknown,
  options: FormatSubscriptionOptions = {}
): Promise<SubscriptionSummary> {
  if (!isRecord(body)) {
    throw new Error("Invalid request body.");
  }
  const name = normalizeSubscriptionName(body.name);
  if (!name) throw new Error("Subscription name is required.");

  const urls = normalizeSubscriptionUrlList(body.urls);
  const nodes = validateLocalSubscriptionNodes(body.nodes);
  if (urls.length === 0 && nodes.length === 0) throw new Error("At least one URL or node is required.");

  const config = buildLocalSubscriptionConfig(body);
  assertNodeNameFilterKeepsOutput(nodes, config);
  assertValidLocalSubscriptionConfig({ urls, nodes, config });
  const autoUpdateInterval = normalizeLocalAutoUpdateIntervalSeconds(body.autoUpdateInterval);
  const subscriptionInfo = normalizeSubscriptionInfoForPersistence(body.subscriptionInfo) ?? {};

  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.subscription.create({
      data: {
        ownerId,
        name,
        token: generateLocalSubscriptionToken(),
        encryptedUrls: encryptJson(urls),
        encryptedNodes: encryptJson(nodes),
        encryptedConfig: encryptJson(config),
        encryptedSubscriptionInfo: encryptJson(subscriptionInfo),
        autoUpdateInterval,
      },
      include: { autoUpdateState: true },
    });
    await createSubscriptionVersion(tx, created, "create");
    return created;
  });
  return formatSubscription(row, options);
}

export async function updateSubscription(
  ownerId: string,
  id: string,
  body: unknown,
  options: FormatSubscriptionOptions = {}
): Promise<SubscriptionSummary | null> {
  if (!isRecord(body)) throw new Error("Invalid request body.");
  const current = await prisma.subscription.findFirst({ where: { id, ownerId }, include: { autoUpdateState: true } });
  if (!current) return null;

  const currentSecrets = readSubscriptionSecrets(current);
  const name = normalizeSubscriptionName(body.name) || current.name;
  const data: Record<string, unknown> = { name };
  const hasUrls = "urls" in body;
  const hasNodes = "nodes" in body;
  const hasConfig = "config" in body || "smartNodeMatchingEnabled" in body || "updateLockEnabled" in body;
  const nextNodes = hasNodes ? validateLocalSubscriptionNodes(body.nodes) : currentSecrets.nodes;
  let nextConfig = currentSecrets.config;

  if (hasUrls) {
    data.encryptedUrls = encryptJson(normalizeSubscriptionUrlList(body.urls));
  }
  if (hasNodes) {
    data.encryptedNodes = encryptJson(nextNodes);
  }
  if (hasConfig) {
    nextConfig = buildLocalSubscriptionConfig(body, currentSecrets.config);
    data.encryptedConfig = encryptJson(nextConfig);
  }
  if ("subscriptionInfo" in body) {
    data.encryptedSubscriptionInfo = encryptJson(normalizeSubscriptionInfoForPersistence(body.subscriptionInfo) ?? {});
  }

  if (hasUrls || hasNodes || hasConfig) {
    const nextUrls = hasUrls ? normalizeSubscriptionUrlList(body.urls) : currentSecrets.urls;
    if (nextUrls.length === 0 && nextNodes.length === 0) {
      throw new Error("At least one URL or node is required.");
    }
    assertNodeNameFilterKeepsOutput(nextNodes, nextConfig);
    assertValidLocalSubscriptionConfig({ urls: nextUrls, nodes: nextNodes, config: nextConfig });
  }

  let resetAutoUpdateState = false;
  if ("autoUpdateInterval" in body) {
    const nextAutoUpdateInterval = normalizeLocalAutoUpdateIntervalSeconds(body.autoUpdateInterval);
    data.autoUpdateInterval = nextAutoUpdateInterval;
    resetAutoUpdateState = current.autoUpdateInterval === null && nextAutoUpdateInterval !== null;
  }

  const row = await prisma.$transaction(async (tx) => {
    await createSubscriptionVersion(tx, current, "before_update");
    if (resetAutoUpdateState) {
      await tx.subscriptionAutoUpdateState.upsert({
        where: { subscriptionId: current.id },
        create: { subscriptionId: current.id },
        update: {
          externalFailureCount: 0,
          failureSourceState: null,
          lastFailedAt: null,
          lastAttemptedAt: null,
          disabledAt: null,
          disabledReason: null,
          disabledPreviousInterval: null,
        },
      });
    }
    const updated = await tx.subscription.update({
      where: { id: current.id },
      data,
      include: { autoUpdateState: true },
    });
    await createSubscriptionVersion(tx, updated, "manual_update");
    return updated;
  });
  return formatSubscription(row, options);
}

export async function getSubscription(
  ownerId: string,
  id: string,
  options: FormatSubscriptionOptions = {}
): Promise<SubscriptionDetail | null> {
  const row = await prisma.subscription.findFirst({
    where: { id, ownerId },
    include: { autoUpdateState: true },
  });
  return row ? formatSubscriptionDetail(row, options) : null;
}

export async function deleteSubscription(ownerId: string, id: string): Promise<boolean> {
  const row = await prisma.subscription.findFirst({ where: { id, ownerId }, select: { id: true } });
  if (!row) return false;
  await prisma.subscription.delete({ where: { id: row.id } });
  return true;
}

export function buildSubscriptionFetchCallbacks() {
  return {
    fetchUrlNodes: async (source: SavedSource) => {
      const imported = await importSourceUrlDirect({
        url: source.content,
        ...(source.userinfoUrl ? { userinfoUrl: source.userinfoUrl } : {}),
        ...(source.userinfoUserAgent ? { userinfoUserAgent: source.userinfoUserAgent } : {}),
      });
      if (imported.ok) {
        return {
          ok: true,
          nodes: imported.parsedNodes,
          errors: imported.parseErrors,
          headers: imported.headers,
        };
      }
      return {
        ok: false,
        nodes: [],
        responseStatus: imported.responseStatus,
        error: imported.error,
        errorInfo: imported.errorInfo,
        publicReason: imported.publicReason ?? undefined,
      };
    },
    fetchUrlUserInfo: async (source: SavedSource) => {
      return fetchSourceUserInfoHeadersDirect(source);
    },
  };
}

export function buildSubscriptionCacheExpiry(from: Date): Date {
  return new Date(from.getTime() + CACHE_TTL_SECONDS * 1000);
}

async function persistRefreshSuccess(params: {
  subscriptionId: string;
  expectedUpdatedAt: Date;
  snapshot: RefreshNodeSnapshotResult;
  config: Record<string, unknown>;
  cachedAt: Date;
  reason?: string;
}): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.subscription.updateMany({
      where: { id: params.subscriptionId, updatedAt: params.expectedUpdatedAt },
      data: {
        encryptedNodes: encryptJson(params.snapshot.nodes),
        encryptedConfig: encryptJson({ ...params.config, sources: params.snapshot.savedSources }),
        encryptedSubscriptionInfo: encryptJson(params.snapshot.subscriptionInfo),
        lastUpdatedAt: params.cachedAt,
        cacheExpiresAt: buildSubscriptionCacheExpiry(params.cachedAt),
        updatedAt: params.cachedAt,
      },
    });
    if (updated.count !== 1) return false;
    const row = await tx.subscription.findUnique({ where: { id: params.subscriptionId } });
    if (row) {
      await createSubscriptionVersion(tx, row, params.reason ?? "manual_refresh");
    }
    await tx.subscriptionAutoUpdateState.upsert({
      where: { subscriptionId: params.subscriptionId },
      create: { subscriptionId: params.subscriptionId },
      update: {
        externalFailureCount: 0,
        failureSourceState: null,
        lastFailedAt: null,
        lastAttemptedAt: null,
        disabledAt: null,
        disabledReason: null,
        disabledPreviousInterval: null,
      },
    });
    return true;
  });
}

export async function refreshSubscription(ownerId: string, id: string) {
  const row = await prisma.subscription.findFirst({ where: { id, ownerId }, include: { autoUpdateState: true } });
  if (!row) return null;

  const secrets = readSubscriptionSecrets(row);
  const snapshot = await refreshNodeSnapshot({
    config: secrets.config,
    urls: secrets.urls,
    storedNodes: secrets.nodes,
    ...buildSubscriptionFetchCallbacks(),
  });
  const refreshResult = prepareRefreshCacheResult({
    config: secrets.config,
    snapshot,
    maxNodesPerSubscription: MAX_NODES_PER_SUBSCRIPTION,
  });

  if (!refreshResult.ok) {
    return {
      ok: false as const,
      response: buildManualRefreshFailureResponse({
        refreshResult,
        maxNodesPerSubscription: MAX_NODES_PER_SUBSCRIPTION,
      }),
    };
  }

  const cachedAt = new Date();
  const persisted = await persistRefreshSuccess({
    subscriptionId: row.id,
    expectedUpdatedAt: row.updatedAt,
    snapshot,
    config: secrets.config,
    cachedAt,
    reason: "manual_refresh",
  });
  if (!persisted) {
    return {
      ok: false as const,
      response: {
        body: { error: "Subscription changed while refresh was in progress.", code: "SUBSCRIPTION_CHANGED" },
        status: 409,
      },
    };
  }
  return {
    ok: true as const,
    body: buildManualRefreshSuccessResponseBody({
      subscriptionId: row.id,
      refreshResult,
      snapshot,
      cachedAt,
    }),
  };
}

export async function previewSubscriptionRefresh(ownerId: string, id: string): Promise<SubscriptionRefreshPreview | null> {
  const row = await prisma.subscription.findFirst({ where: { id, ownerId }, include: { autoUpdateState: true } });
  if (!row) return null;

  const secrets = readSubscriptionSecrets(row);
  const snapshot = await refreshNodeSnapshot({
    config: secrets.config,
    urls: secrets.urls,
    storedNodes: secrets.nodes,
    ...buildSubscriptionFetchCallbacks(),
  });
  const refreshResult = prepareRefreshCacheResult({
    config: secrets.config,
    snapshot,
    maxNodesPerSubscription: MAX_NODES_PER_SUBSCRIPTION,
  });

  return buildRefreshPreview({
    subscriptionId: row.id,
    config: secrets.config,
    beforeNodes: secrets.nodes,
    beforeSubscriptionInfo: secrets.subscriptionInfo,
    snapshot,
    refreshResult,
  });
}

export async function generateSubscriptionYaml(token: string): Promise<GeneratedSubscriptionYaml | null> {
  const row = await prisma.subscription.findUnique({ where: { token }, include: { autoUpdateState: true } });
  if (!row) return null;
  const secrets = readSubscriptionSecrets(row);
  const exposeSubscriptionUserInfo = secrets.config.exposeSubscriptionUserInfo !== false;
  const { testUrl, testInterval } = getEffectiveTestOptions(secrets.config);
  const proxyProviders = buildProxyProvidersFromConfig(secrets.config, { testUrl, testInterval });
  if (secrets.nodes.length === 0 && !proxyProviders) return null;
  const yaml = generateClashYaml(
    buildGenerateOptionsFromConfig(secrets.config, {
      nodes: secrets.nodes,
      proxyProviders,
    })
  );
  await prisma.subscription.update({ where: { id: row.id }, data: { lastAccessedAt: new Date() } });
  return {
    yaml,
    name: row.name,
    subscriptionInfo: exposeSubscriptionUserInfo ? secrets.subscriptionInfo : {},
    cacheExpirySeconds: CACHE_TTL_SECONDS,
    autoUpdateIntervalSeconds: row.autoUpdateInterval,
    isAdmin: true,
  };
}
