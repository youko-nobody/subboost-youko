import {
  prepareRefreshCacheResult,
  refreshNodeSnapshot,
  type RefreshNodeSnapshotResult,
} from "@subboost/server-core/subscription";
import {
  buildSubscriptionFetchCallbacks,
  MAX_NODES_PER_SUBSCRIPTION,
  readSubscriptionSecrets,
} from "./subscription-service";
import { prisma } from "./prisma";
import {
  validateLocalSubscriptionConfig,
  type SubscriptionConfigValidationResult,
} from "./subscription-config-validation";

export type SubscriptionHealthStatus = "healthy" | "degraded" | "failed";

export type SubscriptionHealthResult = {
  status: SubscriptionHealthStatus;
  checkedAt: string;
  message: string;
  validation: SubscriptionConfigValidationResult;
  nodeCount: number;
  attemptedUrlFetch: boolean;
  usedUrlFetch: boolean;
  refreshableSourceCount: number;
  refreshedSourceCount: number;
  refreshedUrlSourceCount: number;
  refreshedStaticSourceCount: number;
  failedSourceCount: number;
  failedSources: Array<{
    id: string;
    type: string;
    content: string;
    errorMessage: string;
    errorCategory?: string;
    httpStatus?: number;
    publicReason?: string | null;
  }>;
};

function resolveHealthStatus(params: {
  validation: SubscriptionConfigValidationResult;
  refreshOk: boolean;
  failedSourceCount: number;
  refreshableSourceCount: number;
}): SubscriptionHealthStatus {
  if (!params.validation.ok || !params.refreshOk) return "failed";
  if (params.failedSourceCount > 0) return "degraded";
  if (params.refreshableSourceCount === 0 && params.validation.warnings.length > 0) return "degraded";
  return "healthy";
}

function buildHealthMessage(params: {
  status: SubscriptionHealthStatus;
  validation: SubscriptionConfigValidationResult;
  refreshOk: boolean;
  failedSourceCount: number;
  nodeCount: number;
}): string {
  if (!params.validation.ok) return "配置校验未通过，请先修复错误后再更新订阅。";
  if (!params.refreshOk) return "订阅源刷新失败，当前配置不会被健康检查写入数据库。";
  if (params.failedSourceCount > 0) return `部分订阅源失败，仍解析到 ${params.nodeCount} 个节点。`;
  if (params.status === "degraded") return "配置可生成，但存在需要留意的警告。";
  return `订阅健康，当前可解析 ${params.nodeCount} 个节点。`;
}

function emptySnapshotFailure(error: unknown): RefreshNodeSnapshotResult {
  return {
    nodes: [],
    subscriptionInfo: {},
    savedSources: [],
    attemptedUrlFetch: true,
    usedUrlFetch: false,
    refreshableSourceCount: 0,
    refreshedSourceCount: 0,
    refreshedUrlSourceCount: 0,
    refreshedStaticSourceCount: 0,
    detachedSourceCount: 0,
    failedSourceCount: 1,
    failedSources: [
      {
        id: "health-check",
        type: "url",
        content: "",
        errorMessage: error instanceof Error ? error.message : "健康检查失败",
      },
    ],
  };
}

export async function checkSubscriptionHealth(
  ownerId: string,
  subscriptionId: string
): Promise<SubscriptionHealthResult | null> {
  const row = await prisma.subscription.findFirst({
    where: { id: subscriptionId, ownerId },
    include: { autoUpdateState: true },
  });
  if (!row) return null;

  const secrets = readSubscriptionSecrets(row);
  const snapshot = await refreshNodeSnapshot({
    config: secrets.config,
    urls: secrets.urls,
    storedNodes: secrets.nodes,
    ...buildSubscriptionFetchCallbacks(),
  }).catch(emptySnapshotFailure);
  const validation = validateLocalSubscriptionConfig({
    urls: secrets.urls,
    nodes: snapshot.nodes,
    config: secrets.config,
  });
  const refreshResult = validation.ok
    ? prepareRefreshCacheResult({
        config: secrets.config,
        snapshot,
        maxNodesPerSubscription: MAX_NODES_PER_SUBSCRIPTION,
      })
    : { ok: false as const, reason: "empty_result" as const, nodeCount: snapshot.nodes.length };
  const status = resolveHealthStatus({
    validation,
    refreshOk: refreshResult.ok,
    failedSourceCount: snapshot.failedSourceCount,
    refreshableSourceCount: snapshot.refreshableSourceCount,
  });

  return {
    status,
    checkedAt: new Date().toISOString(),
    message: buildHealthMessage({
      status,
      validation,
      refreshOk: refreshResult.ok,
      failedSourceCount: snapshot.failedSourceCount,
      nodeCount: snapshot.nodes.length,
    }),
    validation,
    nodeCount: snapshot.nodes.length,
    attemptedUrlFetch: snapshot.attemptedUrlFetch,
    usedUrlFetch: snapshot.usedUrlFetch,
    refreshableSourceCount: snapshot.refreshableSourceCount,
    refreshedSourceCount: snapshot.refreshedSourceCount,
    refreshedUrlSourceCount: snapshot.refreshedUrlSourceCount,
    refreshedStaticSourceCount: snapshot.refreshedStaticSourceCount,
    failedSourceCount: snapshot.failedSourceCount,
    failedSources: snapshot.failedSources.map((source) => ({
      id: source.id,
      type: source.type,
      content: source.content,
      errorMessage: source.errorMessage,
      ...(source.errorCategory ? { errorCategory: source.errorCategory } : {}),
      ...(source.httpStatus ? { httpStatus: source.httpStatus } : {}),
      ...(source.publicReason !== undefined ? { publicReason: source.publicReason } : {}),
    })),
  };
}

export async function validateExistingSubscriptionConfig(ownerId: string, subscriptionId: string) {
  const row = await prisma.subscription.findFirst({
    where: { id: subscriptionId, ownerId },
    include: { autoUpdateState: true },
  });
  if (!row) return null;
  const secrets = readSubscriptionSecrets(row);
  return validateLocalSubscriptionConfig({
    urls: secrets.urls,
    nodes: secrets.nodes,
    config: secrets.config,
  });
}
