import type { ConfigActions } from "../definitions";
import { parseNodeNameFilterConfig } from "@subboost/core/subscription/node-name-filter";
import { normalizeSubscriptionProfileType } from "@subboost/core/subscription/profile-type";
import {
  createDefaultSurgeConfig,
  createYoukoSurgeConfig,
  normalizeSurgeConfig,
} from "@subboost/core/surge";
import type { GetState, SetAndGenerateConfig, SetState } from "../store-types";

type SettingsActions = Pick<
  ConfigActions,
  | "setProfileType"
  | "setSurgeConfig"
  | "setDnsYaml"
  | "setMixedPort"
  | "setAllowLan"
  | "setTestUrl"
  | "setTestInterval"
  | "setRuleProviderBaseUrl"
  | "setExposeSubscriptionUserInfo"
  | "setFallbackPolicyTarget"
  | "setNodeNameFilter"
  | "setProxyGroupAdvancedModeEnabled"
  | "setCnIpNoResolve"
  | "setExperimentalCnUseCnRuleSet"
>;

function isUnmodifiedDefaultSurgeConfig(value: unknown): boolean {
  return (
    JSON.stringify(normalizeSurgeConfig(value)) ===
    JSON.stringify(normalizeSurgeConfig(createDefaultSurgeConfig()))
  );
}

export function createSettingsActions(
  _set: SetState,
  _get: GetState,
  setAndGenerateConfig: SetAndGenerateConfig
): SettingsActions {
  return {
    setProfileType: (profileType) => {
      const normalizedProfileType = normalizeSubscriptionProfileType(profileType);
      setAndGenerateConfig((state) => ({
        profileType: normalizedProfileType,
        ...(normalizedProfileType === "surge" && isUnmodifiedDefaultSurgeConfig(state.surgeConfig)
          ? { surgeConfig: createYoukoSurgeConfig() }
          : {}),
      }));
    },

    setSurgeConfig: (config) => {
      setAndGenerateConfig((state) => ({
        surgeConfig: normalizeSurgeConfig({
          ...state.surgeConfig,
          ...(config && typeof config === "object" ? config : {}),
        }),
      }));
    },

    setDnsYaml: (yaml: string) => {
      setAndGenerateConfig(() => ({ dnsYaml: yaml }));
    },

    setMixedPort: (port: number) => {
      setAndGenerateConfig(() => ({ mixedPort: port }));
    },

    setAllowLan: (allow: boolean) => {
      setAndGenerateConfig(() => ({ allowLan: allow }));
    },

    setTestUrl: (url: string) => {
      setAndGenerateConfig(() => ({ testUrl: url }));
    },

    setTestInterval: (interval: number) => {
      setAndGenerateConfig(() => ({ testInterval: interval }));
    },

    setRuleProviderBaseUrl: (url: string) => {
      setAndGenerateConfig(() => ({ ruleProviderBaseUrl: url }));
    },

    setExposeSubscriptionUserInfo: (value: boolean) => {
      setAndGenerateConfig(() => ({ exposeSubscriptionUserInfo: Boolean(value) }));
    },

    setFallbackPolicyTarget: (target) => {
      setAndGenerateConfig(() => ({ fallbackPolicyTarget: target }));
    },

    setNodeNameFilter: (config) => {
      setAndGenerateConfig(() => ({
        nodeNameFilter: parseNodeNameFilterConfig(config),
      }));
    },

    setProxyGroupAdvancedModeEnabled: (value: boolean) => {
      setAndGenerateConfig(() => ({ proxyGroupAdvancedModeEnabled: Boolean(value) }));
    },

    setCnIpNoResolve: (value: boolean) => {
      setAndGenerateConfig(() => ({ cnIpNoResolve: Boolean(value) }));
    },

    setExperimentalCnUseCnRuleSet: (value: boolean) => {
      setAndGenerateConfig(() => ({ experimentalCnUseCnRuleSet: Boolean(value) }));
    },
  };
}
