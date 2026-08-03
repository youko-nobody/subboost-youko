import { describe, expect, it } from "vitest";
import { DEFAULT_NODE_NAME_FILTER_CONFIG } from "@subboost/core/subscription/node-name-filter";
import { initialState } from "./definitions";
import {
  CONFIG_DRAFT_STORAGE_VERSION,
  normalizePersistedConfigState,
  partializeConfigState,
  prepareConfigDraftScope,
} from "./persistence";

describe("config store persistence", () => {
  it("round-trips the normalized node-name filter without persisting node snapshots", () => {
    const state = {
      ...structuredClone(initialState),
      nodes: [{ name: "完整节点快照" }],
      nodeNameFilter: {
        enabled: true,
        excludeRegexes: ["  expire  ", "expire", "", "test"],
      },
    } as typeof initialState;

    const persisted = partializeConfigState(state);

    expect(persisted).toMatchObject({
      nodeNameFilter: {
        enabled: true,
        excludeRegexes: ["expire", "test"],
      },
    });
    expect(persisted).not.toHaveProperty("nodes");
    expect(normalizePersistedConfigState(persisted).nodeNameFilter).toEqual({
      enabled: true,
      excludeRegexes: ["expire", "test"],
    });
  });

  it("round-trips editable rule model fields for local drafts", () => {
    const state = {
      ...structuredClone(initialState),
      enabledProxyGroups: ["auto"],
      customProxyGroups: [{ id: "final", name: "FINAL", emoji: "", groupType: "select" }],
      customRuleSets: [
        {
          id: "tiktok",
          name: "TikTok",
          behavior: "classical",
          format: "yaml",
          path: "https://cdn.example/TikTok.yaml",
          target: { kind: "custom", id: "final" },
        },
      ],
      customRules: [{ id: "rule-1", type: "DOMAIN", value: "example.com", target: "DIRECT" }],
      dialerProxyGroups: [
        {
          id: "dialer-1",
          name: "Relay",
          icon: "https://icons.example/relay.png",
          type: "select",
          relayNodes: ["Node A"],
          targetNodes: ["Node B"],
        },
      ],
      ruleOrder: ["custom-rule:rule-1", "custom-rule-set:tiktok"],
      fallbackPolicyTarget: { kind: "custom", id: "final" },
      proxyGroupNameOverrides: { auto: "Auto" },
      proxyGroupOrder: ["custom:final", "module:auto"],
    } as typeof initialState;

    const persisted = partializeConfigState(state);
    const restored = normalizePersistedConfigState(persisted);

    expect(persisted).toMatchObject({
      customProxyGroups: [{ id: "final", name: "FINAL" }],
      customRuleSets: [{ id: "tiktok", behavior: "classical", format: "yaml" }],
      dialerProxyGroups: [{ id: "dialer-1", name: "Relay", icon: "https://icons.example/relay.png" }],
      fallbackPolicyTarget: { kind: "custom", id: "final" },
    });
    expect(restored).toMatchObject({
      customProxyGroups: [{ id: "final", name: "FINAL", emoji: "", groupType: "select" }],
      customRuleSets: [
        {
          id: "tiktok",
          behavior: "classical",
          format: "yaml",
          path: "https://cdn.example/TikTok.yaml",
          target: { kind: "custom", id: "final" },
        },
      ],
      dialerProxyGroups: [
        {
          id: "dialer-1",
          name: "Relay",
          icon: "https://icons.example/relay.png",
          type: "select",
          relayNodes: ["Node A"],
          targetNodes: ["Node B"],
        },
      ],
      fallbackPolicyTarget: { kind: "custom", id: "final" },
      proxyGroupOrder: ["custom:final", "module:auto"],
    });
  });

  it("defaults missing or malformed node-name filter data without a storage-version bump", () => {
    expect(CONFIG_DRAFT_STORAGE_VERSION).toBe(10);
    expect(normalizePersistedConfigState({}).nodeNameFilter).toEqual(
      DEFAULT_NODE_NAME_FILTER_CONFIG
    );
    expect(normalizePersistedConfigState({})).not.toHaveProperty("experimentalCnUseCnRuleSet");
    expect(
      normalizePersistedConfigState({
        nodeNameFilter: {
          enabled: "yes",
          excludeRegexes: "expire",
        },
      }).nodeNameFilter
    ).toEqual(DEFAULT_NODE_NAME_FILTER_CONFIG);
  });

  it("restores blank templates without turning on built-in CN rule sets", () => {
    expect(normalizePersistedConfigState({ template: "blank" })).toMatchObject({
      template: "blank",
      experimentalCnUseCnRuleSet: false,
    });
    expect(normalizePersistedConfigState({ template: "standard" })).toMatchObject({
      template: "standard",
      experimentalCnUseCnRuleSet: true,
    });
  });

  it("restores the filter only from the current draft envelope", () => {
    const storageName = "subboost-config:user:user-1";
    const storage = {
      getItem: (key: string) =>
        key === storageName
          ? JSON.stringify({
              version: CONFIG_DRAFT_STORAGE_VERSION,
              state: {
                nodeNameFilter: {
                  enabled: true,
                  excludeRegexes: ["test"],
                },
              },
            })
          : null,
      setItem: () => undefined,
    };

    expect(prepareConfigDraftScope(storage, "user-1").state.nodeNameFilter).toEqual({
      enabled: true,
      excludeRegexes: ["test"],
    });
  });
});
