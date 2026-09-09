import { describe, expect, it } from "vitest";
import {
  buildClashSubscriptionUrl,
  buildSurgeSubscriptionUrl,
  normalizeSubscriptionProfileType,
} from "@subboost/core/subscription/profile-type";

describe("subscription profile type helpers", () => {
  it("normalizes unknown profile types to clash", () => {
    expect(normalizeSubscriptionProfileType("surge")).toBe("surge");
    expect(normalizeSubscriptionProfileType("mihomo")).toBe("clash");
    expect(normalizeSubscriptionProfileType(undefined)).toBe("clash");
  });

  it("switches terminal subscription filenames", () => {
    expect(buildSurgeSubscriptionUrl("https://sub.example/api/subscriptions/t/config.yaml")).toBe(
      "https://sub.example/api/subscriptions/t/surge.conf"
    );
    expect(buildClashSubscriptionUrl("https://sub.example/api/subscriptions/t/surge.conf")).toBe(
      "https://sub.example/api/subscriptions/t/config.yaml"
    );
    expect(buildSurgeSubscriptionUrl("/api/subscriptions/t?x=1")).toBe("/api/subscriptions/t/surge.conf?x=1");
  });
});
