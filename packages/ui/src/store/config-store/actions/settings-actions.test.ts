import { describe, expect, it, vi } from "vitest";
import { createDefaultSurgeConfig, createYoukoSurgeConfig } from "@subboost/core/surge";
import { createSettingsActions } from "./settings-actions";

function createStore(initial: Record<string, unknown> = {}) {
  let state = { ...initial };
  const set = vi.fn((next: any) => {
    const patch = typeof next === "function" ? next(state) : next;
    state = { ...state, ...patch };
  });
  const setAndGenerateConfig = vi.fn((updater: any) => {
    state = { ...state, ...updater(state) };
  });
  const get = vi.fn(() => state);
  return { get, set, setAndGenerateConfig, state: () => state };
}

describe("config store settings actions", () => {
  it("updates generated config settings through the generation path", () => {
    const store = createStore();
    const actions = createSettingsActions(store.set as any, store.get as any, store.setAndGenerateConfig as any);

    actions.setDnsYaml("dns: {}");
    actions.setMixedPort(7890);
    actions.setAllowLan(true);
    actions.setTestUrl("https://cp.cloudflare.com/generate_204");
    actions.setTestInterval(600);
    actions.setRuleProviderBaseUrl("https://rules.example.com");
    actions.setExposeSubscriptionUserInfo(false);
    actions.setNodeNameFilter({
      enabled: true,
      excludeRegexes: ["  expire  ", "expire", ""],
    });
    actions.setCnIpNoResolve(true);
    actions.setExperimentalCnUseCnRuleSet(1 as unknown as boolean);

    expect(store.state()).toEqual({
      dnsYaml: "dns: {}",
      mixedPort: 7890,
      allowLan: true,
      testUrl: "https://cp.cloudflare.com/generate_204",
      testInterval: 600,
      ruleProviderBaseUrl: "https://rules.example.com",
      exposeSubscriptionUserInfo: false,
      nodeNameFilter: {
        enabled: true,
        excludeRegexes: ["expire"],
      },
      cnIpNoResolve: true,
      experimentalCnUseCnRuleSet: true,
    });
    expect(store.setAndGenerateConfig).toHaveBeenCalledTimes(10);
    expect(store.set).not.toHaveBeenCalled();
  });

  it("rejects invalid node-name filters before updating generated config", () => {
    const store = createStore();
    const actions = createSettingsActions(
      store.set as any,
      store.get as any,
      store.setAndGenerateConfig as any
    );

    expect(() =>
      actions.setNodeNameFilter({
        enabled: true,
        excludeRegexes: ["("],
      })
    ).toThrow("第 1 行");
    expect(store.state()).toEqual({});
  });

  it("applies the native Youko Surge template when entering an untouched Surge profile", () => {
    const store = createStore({ surgeConfig: createDefaultSurgeConfig() });
    const actions = createSettingsActions(store.set as any, store.get as any, store.setAndGenerateConfig as any);

    actions.setProfileType("surge");

    expect(store.state().profileType).toBe("surge");
    expect(store.state().surgeConfig).toEqual(createYoukoSurgeConfig());
  });

  it("does not overwrite a manually edited Surge profile", () => {
    const edited = {
      ...createDefaultSurgeConfig(),
      generalText: "loglevel = verbose",
    };
    const store = createStore({ surgeConfig: edited });
    const actions = createSettingsActions(store.set as any, store.get as any, store.setAndGenerateConfig as any);

    actions.setProfileType("surge");

    expect(store.state().surgeConfig).toEqual(edited);
  });
});
