import { describe, expect, it } from "vitest";

import { buildSubscriptionResponseHeaders } from "./response-headers";

describe("subscription response headers", () => {
  it("uses the subscription name without adding yaml to client-visible filenames", () => {
    const headers = buildSubscriptionResponseHeaders("我的配置 2026/06/17.yaml", {}, { isAdmin: false });

    expect(headers["content-disposition"]).not.toContain("filename=");
    expect(headers["content-disposition"]).toContain("filename*=UTF-8''");
    expect(decodeURIComponent(headers["content-disposition"].split("filename*=UTF-8''")[1])).toBe(
      "我的配置 2026/06/17"
    );
    expect(headers["content-disposition"]).not.toContain(".yaml");
  });

  it("keeps a plain filename fallback for safe ASCII subscription names", () => {
    const headers = buildSubscriptionResponseHeaders("Main", {}, { isAdmin: true });

    expect(headers["content-disposition"]).toBe("attachment; filename=\"Main\"; filename*=UTF-8''Main");
  });

  it("serializes traffic and expiry metadata for proxy clients", () => {
    const headers = buildSubscriptionResponseHeaders(
      "Main",
      {
        upload: 1024,
        download: 2048,
        total: 4096,
        expire: 1781635200,
        planName: "Pro",
        profileWebPageUrl: "https://example.com/account",
      },
      {
        cacheControl: "no-store",
        cacheExpirySeconds: 3600,
        autoUpdateIntervalSeconds: 86400,
        isAdmin: true,
      }
    );

    expect(headers["cache-control"]).toBe("no-store");
    expect(headers["subscription-userinfo"]).toBe("upload=1024; download=2048; total=4096; expire=1781635200");
    expect(headers["profile-update-interval"]).toBe("24");
    expect(headers["plan-name"]).toBe("Pro");
    expect(headers["profile-web-page-url"]).toBe("https://example.com/account");
  });

  it("omits subscription metadata headers when no snapshot is exposed", () => {
    const headers = buildSubscriptionResponseHeaders("Main", {}, { isAdmin: true });

    expect(headers).not.toHaveProperty("subscription-userinfo");
    expect(headers).not.toHaveProperty("plan-name");
    expect(headers).not.toHaveProperty("profile-web-page-url");
    expect(headers["content-type"]).toBe("text/yaml;charset=utf-8");
  });
});
