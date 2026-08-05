import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkSubscriptionHealth, validateExistingSubscriptionConfig } from "./subscription-health-service";

const mocks = vi.hoisted(() => ({
  prepareRefreshCacheResult: vi.fn(),
  refreshNodeSnapshot: vi.fn(),
  prisma: {
    subscription: { findFirst: vi.fn() },
  },
  buildSubscriptionFetchCallbacks: vi.fn(),
  readSubscriptionSecrets: vi.fn(),
  validateLocalSubscriptionConfig: vi.fn(),
}));

vi.mock("@subboost/server-core/subscription", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@subboost/server-core/subscription")>();
  return {
    ...actual,
    prepareRefreshCacheResult: mocks.prepareRefreshCacheResult,
    refreshNodeSnapshot: mocks.refreshNodeSnapshot,
  };
});

vi.mock("./prisma", () => ({ prisma: mocks.prisma }));
vi.mock("./subscription-service", () => ({
  buildSubscriptionFetchCallbacks: mocks.buildSubscriptionFetchCallbacks,
  MAX_NODES_PER_SUBSCRIPTION: 10000,
  readSubscriptionSecrets: mocks.readSubscriptionSecrets,
}));
vi.mock("./subscription-config-validation", () => ({
  validateLocalSubscriptionConfig: mocks.validateLocalSubscriptionConfig,
}));

describe("subscription health service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.subscription.findFirst.mockResolvedValue({ id: "sub-1", ownerId: "owner-1" });
    mocks.readSubscriptionSecrets.mockReturnValue({
      urls: ["https://example.com/sub"],
      nodes: [{ name: "Node" }],
      config: { template: "blank" },
    });
    mocks.buildSubscriptionFetchCallbacks.mockReturnValue({
      fetchUrlNodes: vi.fn(),
      fetchUrlUserInfo: vi.fn(),
    });
    mocks.refreshNodeSnapshot.mockResolvedValue({
      nodes: [{ name: "Node" }],
      subscriptionInfo: {},
      savedSources: [],
      attemptedUrlFetch: true,
      usedUrlFetch: true,
      refreshableSourceCount: 1,
      refreshedSourceCount: 1,
      refreshedUrlSourceCount: 1,
      refreshedStaticSourceCount: 0,
      detachedSourceCount: 0,
      failedSourceCount: 0,
      failedSources: [],
    });
    mocks.prepareRefreshCacheResult.mockReturnValue({ ok: true, nodeCount: 1 });
    mocks.validateLocalSubscriptionConfig.mockReturnValue({
      ok: true,
      errors: [],
      warnings: [],
      proxyGroupCount: 1,
      ruleCount: 1,
      generatedYamlBytes: 100,
    });
  });

  it("runs a non-persistent health check", async () => {
    await expect(checkSubscriptionHealth("owner-1", "sub-1")).resolves.toMatchObject({
      status: "healthy",
      nodeCount: 1,
      failedSourceCount: 0,
      validation: { ok: true },
    });
    expect(mocks.prisma.subscription.findFirst).toHaveBeenCalledWith({
      where: { id: "sub-1", ownerId: "owner-1" },
      include: { autoUpdateState: true },
    });
    expect(mocks.refreshNodeSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      urls: ["https://example.com/sub"],
      storedNodes: [{ name: "Node" }],
    }));
  });

  it("marks failed validation and failed sources clearly", async () => {
    mocks.validateLocalSubscriptionConfig.mockReturnValueOnce({
      ok: false,
      errors: ["bad target"],
      warnings: [],
    });
    await expect(checkSubscriptionHealth("owner-1", "sub-1")).resolves.toMatchObject({
      status: "failed",
      message: "配置校验未通过，请先修复错误后再更新订阅。",
    });

    mocks.validateLocalSubscriptionConfig.mockReturnValueOnce({ ok: true, errors: [], warnings: [] });
    mocks.prepareRefreshCacheResult.mockReturnValueOnce({ ok: false, reason: "all_sources_failed", nodeCount: 0 });
    mocks.refreshNodeSnapshot.mockResolvedValueOnce({
      nodes: [],
      subscriptionInfo: {},
      savedSources: [],
      attemptedUrlFetch: true,
      usedUrlFetch: false,
      refreshableSourceCount: 1,
      refreshedSourceCount: 0,
      refreshedUrlSourceCount: 0,
      refreshedStaticSourceCount: 0,
      detachedSourceCount: 0,
      failedSourceCount: 1,
      failedSources: [{ id: "s1", type: "url", content: "https://bad.example", errorMessage: "HTTP 500" }],
    });
    await expect(checkSubscriptionHealth("owner-1", "sub-1")).resolves.toMatchObject({
      status: "failed",
      failedSourceCount: 1,
      failedSources: [{ errorMessage: "HTTP 500" }],
    });
  });

  it("validates existing configs and returns null for missing subscriptions", async () => {
    await expect(validateExistingSubscriptionConfig("owner-1", "sub-1")).resolves.toMatchObject({ ok: true });
    mocks.prisma.subscription.findFirst.mockResolvedValueOnce(null);
    await expect(validateExistingSubscriptionConfig("owner-1", "missing")).resolves.toBeNull();
  });
});
