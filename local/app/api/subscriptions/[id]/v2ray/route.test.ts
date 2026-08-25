import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consumeLocalRateLimit: vi.fn(),
  generateV2RaySubscription: vi.fn(),
  getTrustedClientRateLimitKey: vi.fn(),
  hashLocalRateLimitKey: vi.fn(() => "token-hash"),
  localRateLimitResponse: vi.fn(
    () => new Response(JSON.stringify({ error: "limited", code: "RATE_LIMITED" }), { status: 429 })
  ),
}));

vi.mock("@local/lib/rate-limit", () => ({
  consumeLocalRateLimit: mocks.consumeLocalRateLimit,
  getTrustedClientRateLimitKey: mocks.getTrustedClientRateLimitKey,
  hashLocalRateLimitKey: mocks.hashLocalRateLimitKey,
  localRateLimitResponse: mocks.localRateLimitResponse,
}));
vi.mock("@local/lib/subscription-service", () => ({
  generateV2RaySubscription: mocks.generateV2RaySubscription,
}));

import { GET } from "./route";

describe("local V2Ray subscription route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.consumeLocalRateLimit.mockReturnValue({ allowed: true, retryAfterSeconds: 0 });
    mocks.getTrustedClientRateLimitKey.mockReturnValue("client-hash");
    mocks.generateV2RaySubscription.mockResolvedValue({
      content: "c3M6Ly9leGFtcGxl",
      name: "Test",
      subscriptionInfo: { total: 1024 },
      cacheExpirySeconds: 3600,
      autoUpdateIntervalSeconds: null,
      isAdmin: true,
      nodeCount: 1,
      skippedNodeCount: 0,
    });
  });

  it("applies limits and returns Base64 URI content", async () => {
    const response = await GET(new Request("https://local.test/v2ray"), {
      params: Promise.resolve({ id: "secret-token" }),
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("c3M6Ly9leGFtcGxl");
    expect(response.headers.get("content-type")).toBe("text/plain;charset=utf-8");
    expect(response.headers.get("subscription-userinfo")).toBe("total=1024");
    expect(mocks.hashLocalRateLimitKey).toHaveBeenCalledWith("secret-token");
    expect(mocks.consumeLocalRateLimit).toHaveBeenNthCalledWith(
      1,
      "subscription-v2ray-client",
      "client-hash",
      { limit: 600, windowMs: 60_000 }
    );
    expect(mocks.consumeLocalRateLimit).toHaveBeenNthCalledWith(
      2,
      "subscription-v2ray-token",
      "token-hash",
      { limit: 120, windowMs: 60_000 }
    );
    expect(mocks.generateV2RaySubscription).toHaveBeenCalledWith("secret-token");
  });

  it("returns 429 before touching subscription data", async () => {
    mocks.consumeLocalRateLimit.mockReturnValueOnce({ allowed: false, retryAfterSeconds: 17 });

    const response = await GET(new Request("https://local.test/v2ray"), {
      params: Promise.resolve({ id: "secret-token" }),
    });

    expect(response.status).toBe(429);
    expect(mocks.localRateLimitResponse).toHaveBeenCalledWith(
      "Too many subscription requests. Try again later.",
      17
    );
    expect(mocks.generateV2RaySubscription).not.toHaveBeenCalled();
  });

  it("returns 404 when the subscription has no URI-compatible nodes", async () => {
    mocks.generateV2RaySubscription.mockResolvedValueOnce(null);

    const response = await GET(new Request("https://local.test/v2ray"), {
      params: Promise.resolve({ id: "secret-token" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ code: "NOT_FOUND" });
  });
});
