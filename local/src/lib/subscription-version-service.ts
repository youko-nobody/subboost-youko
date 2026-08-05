import { decryptJson, decryptJsonObject } from "./crypto";
import { prisma } from "./prisma";

const VERSION_HISTORY_LIMIT = 50;

type SubscriptionVersionClient = {
  subscriptionVersion: {
    create: typeof prisma.subscriptionVersion.create;
    findMany: typeof prisma.subscriptionVersion.findMany;
    deleteMany: typeof prisma.subscriptionVersion.deleteMany;
  };
};

type VersionableSubscriptionRow = {
  id: string;
  ownerId: string;
  name: string;
  encryptedUrls: string;
  encryptedNodes: string;
  encryptedConfig: string;
  encryptedSubscriptionInfo: string | null;
  autoUpdateInterval: number | null;
};

export type SubscriptionVersionSummary = {
  id: string;
  subscriptionId: string;
  name: string;
  reason: string;
  nodeCount: number;
  sourceCount: number;
  autoUpdateInterval: number | null;
  createdAt: string;
};

function countNodes(encryptedNodes: string): number {
  const nodes = decryptJson<unknown[]>(encryptedNodes, []);
  return Array.isArray(nodes) ? nodes.length : 0;
}

function countSources(encryptedConfig: string): number {
  const config = decryptJsonObject(encryptedConfig);
  return Array.isArray(config.sources) ? config.sources.length : 0;
}

function formatVersion(row: {
  id: string;
  subscriptionId: string;
  name: string;
  reason: string;
  nodeCount: number;
  sourceCount: number;
  autoUpdateInterval: number | null;
  createdAt: Date;
}): SubscriptionVersionSummary {
  return {
    id: row.id,
    subscriptionId: row.subscriptionId,
    name: row.name,
    reason: row.reason,
    nodeCount: row.nodeCount,
    sourceCount: row.sourceCount,
    autoUpdateInterval: row.autoUpdateInterval,
    createdAt: row.createdAt.toISOString(),
  };
}

async function pruneSubscriptionVersions(client: SubscriptionVersionClient, subscriptionId: string): Promise<void> {
  const staleRows = await client.subscriptionVersion.findMany({
    where: { subscriptionId },
    orderBy: { createdAt: "desc" },
    skip: VERSION_HISTORY_LIMIT,
    select: { id: true },
  });
  const staleIds = staleRows.map((row) => row.id);
  if (staleIds.length === 0) return;
  await client.subscriptionVersion.deleteMany({ where: { id: { in: staleIds } } });
}

export async function createSubscriptionVersion(
  client: SubscriptionVersionClient,
  row: VersionableSubscriptionRow,
  reason: string
): Promise<void> {
  await client.subscriptionVersion.create({
    data: {
      subscriptionId: row.id,
      ownerId: row.ownerId,
      name: row.name,
      reason,
      encryptedUrls: row.encryptedUrls,
      encryptedNodes: row.encryptedNodes,
      encryptedConfig: row.encryptedConfig,
      encryptedSubscriptionInfo: row.encryptedSubscriptionInfo,
      autoUpdateInterval: row.autoUpdateInterval,
      nodeCount: countNodes(row.encryptedNodes),
      sourceCount: countSources(row.encryptedConfig),
    },
  });
  await pruneSubscriptionVersions(client, row.id);
}

export async function listSubscriptionVersions(
  ownerId: string,
  subscriptionId: string
): Promise<SubscriptionVersionSummary[] | null> {
  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, ownerId },
    select: { id: true },
  });
  if (!subscription) return null;

  const rows = await prisma.subscriptionVersion.findMany({
    where: { subscriptionId, ownerId },
    orderBy: { createdAt: "desc" },
    take: VERSION_HISTORY_LIMIT,
  });
  return rows.map(formatVersion);
}

export async function restoreSubscriptionVersion(ownerId: string, subscriptionId: string, versionId: string) {
  const current = await prisma.subscription.findFirst({
    where: { id: subscriptionId, ownerId },
    include: { autoUpdateState: true },
  });
  if (!current) return null;

  const version = await prisma.subscriptionVersion.findFirst({
    where: { id: versionId, subscriptionId, ownerId },
  });
  if (!version) return null;

  const restoredAt = new Date();
  return prisma.$transaction(async (tx) => {
    await createSubscriptionVersion(tx, current, "before_restore");
    const row = await tx.subscription.update({
      where: { id: current.id },
      data: {
        name: version.name,
        encryptedUrls: version.encryptedUrls,
        encryptedNodes: version.encryptedNodes,
        encryptedConfig: version.encryptedConfig,
        encryptedSubscriptionInfo: version.encryptedSubscriptionInfo,
        autoUpdateInterval: version.autoUpdateInterval,
        cacheExpiresAt: null,
        lastUpdatedAt: restoredAt,
        updatedAt: restoredAt,
      },
      include: { autoUpdateState: true },
    });
    await createSubscriptionVersion(tx, row, "restore");
    return row;
  });
}
