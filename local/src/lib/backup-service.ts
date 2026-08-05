import { normalizeSubscriptionInfoForPersistence } from "@subboost/server-core/subscription";
import type { ParsedNode } from "@subboost/core/types/node";
import { decryptJson, decryptJsonObject, encryptJson } from "./crypto";
import { prisma } from "./prisma";
import { createSubscription, readSubscriptionSecrets } from "./subscription-service";
import { createTemplate } from "./template-service";

const BACKUP_SCHEMA = "subboost-youko-backup/v1";

export type BackupImportResult = {
  importedSubscriptions: number;
  importedTemplates: number;
  skippedSubscriptions: number;
  skippedTemplates: number;
  errors: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asDate(value: unknown): Date | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : undefined;
}

function sourceCountFromConfig(config: Record<string, unknown>): number {
  return Array.isArray(config.sources) ? config.sources.length : 0;
}

function formatVersionForBackup(row: {
  id: string;
  subscriptionId: string;
  name: string;
  reason: string;
  encryptedUrls: string;
  encryptedNodes: string;
  encryptedConfig: string;
  encryptedSubscriptionInfo: string | null;
  autoUpdateInterval: number | null;
  createdAt: Date;
}) {
  return {
    originalId: row.id,
    name: row.name,
    reason: row.reason,
    urls: decryptJson<string[]>(row.encryptedUrls, []),
    nodes: decryptJson<ParsedNode[]>(row.encryptedNodes, []),
    config: decryptJsonObject(row.encryptedConfig),
    subscriptionInfo: normalizeSubscriptionInfoForPersistence(decryptJson<unknown>(row.encryptedSubscriptionInfo, {})) ?? {},
    autoUpdateInterval: row.autoUpdateInterval,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function exportLocalBackup(ownerId: string) {
  const [subscriptions, versions, templates] = await Promise.all([
    prisma.subscription.findMany({
      where: { ownerId },
      include: { autoUpdateState: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.subscriptionVersion.findMany({
      where: { ownerId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.localTemplate.findMany({
      where: { ownerId },
      orderBy: { updatedAt: "desc" },
    }),
  ]);
  const versionsBySubscriptionId = new Map<string, typeof versions>();
  for (const version of versions) {
    const list = versionsBySubscriptionId.get(version.subscriptionId) || [];
    list.push(version);
    versionsBySubscriptionId.set(version.subscriptionId, list);
  }

  return {
    schema: BACKUP_SCHEMA,
    exportedAt: new Date().toISOString(),
    subscriptions: subscriptions.map((row) => {
      const secrets = readSubscriptionSecrets(row);
      return {
        originalId: row.id,
        name: row.name,
        urls: secrets.urls,
        nodes: secrets.nodes,
        config: secrets.config,
        subscriptionInfo: secrets.subscriptionInfo,
        autoUpdateInterval: row.autoUpdateInterval,
        versions: (versionsBySubscriptionId.get(row.id) || []).map(formatVersionForBackup),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      };
    }),
    templates: templates.map((row) => ({
      originalId: row.id,
      name: row.name,
      description: row.description || "",
      config: decryptJsonObject(row.encryptedConfig),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
  };
}

async function importSubscriptionVersions(ownerId: string, subscriptionId: string, rawVersions: unknown): Promise<void> {
  if (!Array.isArray(rawVersions) || rawVersions.length === 0) return;

  for (const raw of rawVersions.slice(-50)) {
    if (!isRecord(raw)) continue;
    const name = asString(raw.name);
    const reason = asString(raw.reason) || "backup_restore";
    const urls = Array.isArray(raw.urls) ? raw.urls.filter((item): item is string => typeof item === "string") : [];
    const nodes = Array.isArray(raw.nodes) ? raw.nodes : [];
    const config = isRecord(raw.config) ? raw.config : {};
    const subscriptionInfo = normalizeSubscriptionInfoForPersistence(raw.subscriptionInfo) ?? {};
    const createdAt = asDate(raw.createdAt);
    await prisma.subscriptionVersion.create({
      data: {
        subscriptionId,
        ownerId,
        name: name || "恢复的历史版本",
        reason,
        encryptedUrls: encryptJson(urls),
        encryptedNodes: encryptJson(nodes),
        encryptedConfig: encryptJson(config),
        encryptedSubscriptionInfo: encryptJson(subscriptionInfo),
        autoUpdateInterval: asNullableNumber(raw.autoUpdateInterval),
        nodeCount: nodes.length,
        sourceCount: sourceCountFromConfig(config),
        ...(createdAt ? { createdAt } : {}),
      },
    });
  }
}

function normalizeBackupPayload(body: unknown): Record<string, unknown> {
  if (!isRecord(body)) throw new Error("备份文件必须是 JSON 对象。");
  if (isRecord(body.backup)) return body.backup;
  return body;
}

export async function importLocalBackup(ownerId: string, body: unknown): Promise<BackupImportResult> {
  const backup = normalizeBackupPayload(body);
  const subscriptions = Array.isArray(backup.subscriptions) ? backup.subscriptions : [];
  const templates = Array.isArray(backup.templates) ? backup.templates : [];
  const result: BackupImportResult = {
    importedSubscriptions: 0,
    importedTemplates: 0,
    skippedSubscriptions: 0,
    skippedTemplates: 0,
    errors: [],
  };

  for (let index = 0; index < subscriptions.length; index += 1) {
    const raw = subscriptions[index];
    if (!isRecord(raw)) {
      result.skippedSubscriptions += 1;
      result.errors.push(`订阅 #${index + 1} 格式无效`);
      continue;
    }
    try {
      const subscription = await createSubscription(ownerId, {
        name: asString(raw.name) || `恢复的订阅 ${index + 1}`,
        urls: Array.isArray(raw.urls) ? raw.urls : [],
        nodes: Array.isArray(raw.nodes) ? raw.nodes : [],
        config: isRecord(raw.config) ? raw.config : {},
        subscriptionInfo: normalizeSubscriptionInfoForPersistence(raw.subscriptionInfo) ?? {},
        autoUpdateInterval: asNullableNumber(raw.autoUpdateInterval),
      });
      await importSubscriptionVersions(ownerId, subscription.id, raw.versions);
      result.importedSubscriptions += 1;
    } catch (error) {
      result.skippedSubscriptions += 1;
      result.errors.push(`订阅「${asString(raw.name) || index + 1}」恢复失败：${error instanceof Error ? error.message : "未知错误"}`);
    }
  }

  for (let index = 0; index < templates.length; index += 1) {
    const raw = templates[index];
    if (!isRecord(raw)) {
      result.skippedTemplates += 1;
      result.errors.push(`模板 #${index + 1} 格式无效`);
      continue;
    }
    try {
      await createTemplate(ownerId, {
        name: asString(raw.name) || `恢复的模板 ${index + 1}`,
        description: asString(raw.description),
        config: raw.config,
      });
      result.importedTemplates += 1;
    } catch (error) {
      result.skippedTemplates += 1;
      result.errors.push(`模板「${asString(raw.name) || index + 1}」恢复失败：${error instanceof Error ? error.message : "未知错误"}`);
    }
  }

  return result;
}
