import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSubscriptionVersion,
  listSubscriptionVersions,
  restoreSubscriptionVersion,
} from "./subscription-version-service";

const mocks = vi.hoisted(() => ({
  prisma: {
    subscription: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    subscriptionVersion: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("./prisma", () => ({ prisma: mocks.prisma }));
vi.mock("./crypto", () => ({
  decryptJson: (value: string | null | undefined, fallback: unknown) => (value ? JSON.parse(value) : fallback),
  decryptJsonObject: (value: string | null | undefined) => (value ? JSON.parse(value) : {}),
}));

function row() {
  return {
    id: "sub-1",
    ownerId: "owner-1",
    name: "Main",
    encryptedUrls: JSON.stringify(["https://example.com/sub"]),
    encryptedNodes: JSON.stringify([{ name: "Node" }]),
    encryptedConfig: JSON.stringify({ sources: [{ id: "source-1" }] }),
    encryptedSubscriptionInfo: JSON.stringify({ total: 1024 }),
    autoUpdateInterval: 86400,
  };
}

describe("subscription version service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.subscription.findFirst.mockResolvedValue({ ...row(), autoUpdateState: null });
    mocks.prisma.subscription.update.mockResolvedValue({ ...row(), name: "Restored", autoUpdateState: null });
    mocks.prisma.subscriptionVersion.create.mockResolvedValue({});
    mocks.prisma.subscriptionVersion.findMany.mockResolvedValue([]);
    mocks.prisma.subscriptionVersion.findFirst.mockResolvedValue({
      ...row(),
      id: "ver-1",
      subscriptionId: "sub-1",
      reason: "manual_update",
      nodeCount: 1,
      sourceCount: 1,
      createdAt: new Date("2026-01-02T00:00:00.000Z"),
    });
    mocks.prisma.subscriptionVersion.deleteMany.mockResolvedValue({ count: 0 });
    mocks.prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        subscription: mocks.prisma.subscription,
        subscriptionVersion: mocks.prisma.subscriptionVersion,
      })
    );
  });

  it("creates counted snapshots and prunes old versions", async () => {
    mocks.prisma.subscriptionVersion.findMany.mockResolvedValueOnce([{ id: "old-1" }]);
    await createSubscriptionVersion(mocks.prisma as any, row(), "manual_update");

    expect(mocks.prisma.subscriptionVersion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        subscriptionId: "sub-1",
        ownerId: "owner-1",
        reason: "manual_update",
        nodeCount: 1,
        sourceCount: 1,
      }),
    });
    expect(mocks.prisma.subscriptionVersion.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["old-1"] } } });
  });

  it("lists versions only for the owner subscription", async () => {
    mocks.prisma.subscriptionVersion.findMany.mockResolvedValueOnce([
      {
        id: "ver-1",
        subscriptionId: "sub-1",
        name: "Main",
        reason: "manual_update",
        nodeCount: 1,
        sourceCount: 1,
        autoUpdateInterval: 86400,
        createdAt: new Date("2026-01-02T00:00:00.000Z"),
      },
    ]);

    await expect(listSubscriptionVersions("owner-1", "sub-1")).resolves.toEqual([
      expect.objectContaining({
        id: "ver-1",
        createdAt: "2026-01-02T00:00:00.000Z",
      }),
    ]);

    mocks.prisma.subscription.findFirst.mockResolvedValueOnce(null);
    await expect(listSubscriptionVersions("owner-1", "missing")).resolves.toBeNull();
  });

  it("restores a version while keeping the subscription token outside the snapshot", async () => {
    await expect(restoreSubscriptionVersion("owner-1", "sub-1", "ver-1")).resolves.toMatchObject({
      name: "Restored",
    });

    expect(mocks.prisma.subscription.update).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: expect.objectContaining({
        name: "Main",
        encryptedUrls: JSON.stringify(["https://example.com/sub"]),
        cacheExpiresAt: null,
        lastUpdatedAt: expect.any(Date),
      }),
      include: { autoUpdateState: true },
    });
    expect(mocks.prisma.subscriptionVersion.create).toHaveBeenCalledTimes(2);
  });
});
