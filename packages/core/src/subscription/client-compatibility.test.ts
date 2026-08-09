import { describe, expect, it } from "vitest";
import {
  buildSubscriptionClientUrl,
  filterNodesForSubscriptionClient,
  normalizeSubscriptionClientProfile,
} from "./client-compatibility";
import type { ParsedNode } from "@subboost/core/types/node";

function node(name: string, type: string): ParsedNode {
  return { name, type, server: "example.com", port: 443 } as ParsedNode;
}

describe("subscription client compatibility", () => {
  it("normalizes unknown profiles to the default profile", () => {
    expect(normalizeSubscriptionClientProfile("stash")).toBe("stash");
    expect(normalizeSubscriptionClientProfile(" STASH ")).toBe("stash");
    expect(normalizeSubscriptionClientProfile("surge")).toBe("default");
    expect(normalizeSubscriptionClientProfile(null)).toBe("default");
  });

  it("filters Mieru nodes from Stash-compatible output only", () => {
    const nodes = [node("SS", "ss"), node("Mieru", "mieru"), node("VLESS", "vless")];
    expect(filterNodesForSubscriptionClient(nodes, "default")).toBe(nodes);
    expect(filterNodesForSubscriptionClient(nodes, "stash").map((item) => item.name)).toEqual(["SS", "VLESS"]);
  });

  it("adds the client query parameter while preserving the base subscription URL", () => {
    expect(buildSubscriptionClientUrl("https://sub.example.com/api/subscriptions/token/config.yaml", "default")).toBe(
      "https://sub.example.com/api/subscriptions/token/config.yaml"
    );
    expect(buildSubscriptionClientUrl("https://sub.example.com/api/subscriptions/token/config.yaml", "stash")).toBe(
      "https://sub.example.com/api/subscriptions/token/config.yaml?client=stash"
    );
    expect(buildSubscriptionClientUrl("https://sub.example.com/config.yaml?foo=1", "stash")).toBe(
      "https://sub.example.com/config.yaml?foo=1&client=stash"
    );
  });
});
