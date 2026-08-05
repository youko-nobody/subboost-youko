import { describe, expect, it } from "vitest";
import type { ParsedNode } from "@subboost/core/types/node";
import { validateLocalSubscriptionConfig } from "./subscription-config-validation";

function node(name = "Node"): ParsedNode {
  return {
    name,
    type: "ss",
    server: "node.example.com",
    port: 443,
    cipher: "aes-128-gcm",
    password: "secret",
  };
}

describe("local subscription config validation", () => {
  it("accepts a basic custom routing setup", () => {
    const validation = validateLocalSubscriptionConfig({
      urls: [],
      nodes: [node()],
      config: {
        template: "blank",
        customProxyGroups: [
          {
            id: "custom-proxy",
            name: "PROXY",
            emoji: "",
            groupType: "select",
            memberSource: "filtered-nodes",
          },
        ],
        customRuleSets: [
          {
            id: "youtube",
            name: "YouTube",
            behavior: "domain",
            format: "mrs",
            path: "geosite/youtube.mrs",
            target: { kind: "custom", id: "custom-proxy" },
          },
        ],
        customRules: [
          {
            id: "direct-example",
            type: "DOMAIN-SUFFIX",
            value: "example.cn",
            target: "DIRECT",
          },
        ],
      },
    });

    expect(validation.ok).toBe(true);
    expect(validation.errors).toEqual([]);
    expect(validation.proxyGroupCount).toBeGreaterThan(0);
    expect(validation.ruleCount).toBeGreaterThan(0);
  });

  it("reports invalid rule targets and rule-set format combinations", () => {
    const validation = validateLocalSubscriptionConfig({
      urls: [],
      nodes: [node()],
      config: {
        template: "blank",
        customProxyGroups: [
          { id: "dup", name: "Dup", emoji: "", groupType: "select" },
          { id: "dup", name: "Dup", emoji: "", groupType: "select" },
        ],
        customRuleSets: [
          {
            id: "bad",
            name: "Bad",
            behavior: "classical",
            format: "mrs",
            path: "rules/bad.mrs",
            target: { kind: "custom", id: "missing" },
          },
        ],
        customRules: [
          {
            id: "bad-target",
            type: "DOMAIN",
            value: "bad.example",
            target: "Missing Group",
          },
        ],
      },
    });

    expect(validation.ok).toBe(false);
    expect(validation.errors.join("\n")).toContain("自定义策略组 ID「dup」重复");
    expect(validation.errors.join("\n")).toContain("远程规则集「Bad」不能使用 classical + mrs 组合");
    expect(validation.errors.join("\n")).toContain("指向不存在或已停用的自定义策略组");
    expect(validation.errors.join("\n")).toContain("Missing Group");
  });
});
