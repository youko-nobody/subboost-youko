import type { ConfigState } from "./definitions";
import { safeParseJsonObject } from "@subboost/core/json";
import { normalizePersistedRuleOrder } from "@subboost/core/generator/rules";
import { ensureCustomRulesHaveIds } from "@subboost/core/rules/custom-rule-utils";
import { normalizeRuleModelFromConfig } from "@subboost/core/rules/rule-model";
import { normalizeProxyGroupTargetRef } from "@subboost/core/proxy-group-targets";
import { normalizeNodeNameFilterConfig } from "@subboost/core/subscription/node-name-filter";
import {
  DEFAULT_LOAD_BALANCE_STRATEGY,
  isLoadBalanceStrategy,
  isProxyGroupGroupType,
} from "@subboost/core/types/config";
import { getConfigDraftStorageNameForUser } from "./draft-storage";

export {
  CONFIG_DRAFT_GUEST_STORAGE_NAME,
  getConfigDraftStorageNameForUser,
} from "./draft-storage";

export const CONFIG_DRAFT_STORAGE_VERSION = 10;

type ConfigDraftStorage = Pick<Storage, "getItem" | "setItem">;

type PersistedEnvelope = {
  state?: unknown;
  version?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    const trimmed = normalizeString(item);
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

function normalizeDialerProxyGroups(value: unknown): ConfigState["dialerProxyGroups"] {
  if (!Array.isArray(value)) return [];
  const out: ConfigState["dialerProxyGroups"] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const id = normalizeString(item.id);
    const name = normalizeString(item.name);
    const type = isProxyGroupGroupType(item.type) ? item.type : null;
    if (!id || !name || !type) continue;
    const icon = normalizeString(item.icon);
    out.push({
      id,
      name,
      ...(icon && /^https?:\/\//i.test(icon) ? { icon } : {}),
      type,
      ...(type === "load-balance"
        ? {
            strategy: isLoadBalanceStrategy(item.strategy)
              ? item.strategy
              : DEFAULT_LOAD_BALANCE_STRATEGY,
          }
        : {}),
      relayNodes: normalizeStringArray(item.relayNodes),
      targetNodes: normalizeStringArray(item.targetNodes),
      ...(typeof item.enabled === "boolean" ? { enabled: item.enabled } : {}),
    });
  }
  return out;
}

function normalizeTemplateType(value: unknown): ConfigState["template"] | undefined {
  if (
    value === "blank" ||
    value === "minimal" ||
    value === "standard" ||
    value === "full" ||
    value === "my-routing"
  ) {
    return value;
  }
  return undefined;
}

function normalizeRuleTarget(value: unknown): ConfigState["fallbackPolicyTarget"] | undefined {
  const ref = normalizeProxyGroupTargetRef(value);
  if (ref) return ref;
  if (typeof value !== "string") return undefined;
  const target = value.trim();
  return target ? target : undefined;
}

export function normalizePersistedConfigState(
  persistedState: unknown,
  options: { discardDraft?: boolean } = {}
): Partial<ConfigState> {
  if (options.discardDraft) return {};
  const state = (isRecord(persistedState) ? persistedState : {}) as Partial<ConfigState>;
  const template = normalizeTemplateType(state.template);
  const ruleModel = normalizeRuleModelFromConfig(state);
  const customRules = Array.isArray(state.customRules)
    ? ensureCustomRulesHaveIds(state.customRules)
    : [];
  const proxyGroupNameOverrides = isRecord(state.proxyGroupNameOverrides)
    ? Object.fromEntries(
        Object.entries(state.proxyGroupNameOverrides)
          .filter(([, value]) => typeof value === "string")
          .map(([key, value]) => [key.trim(), (value as string).trim()])
          .filter(([key, value]) => key && value)
      )
    : {};
  const ruleOrder = normalizePersistedRuleOrder({
    enabledModules: Array.isArray(state.enabledProxyGroups)
      ? state.enabledProxyGroups.filter((item): item is string => typeof item === "string")
      : [],
    customProxyGroups: ruleModel.customProxyGroups,
    customRules,
    customRuleSets: ruleModel.customRuleSets,
    builtinRuleEdits: ruleModel.builtinRuleEdits,
    proxyGroupNameOverrides,
    experimentalCnUseCnRuleSet:
      typeof state.experimentalCnUseCnRuleSet === "boolean"
        ? state.experimentalCnUseCnRuleSet
        : template === "blank"
          ? false
          : true,
    cnIpNoResolve: typeof state.cnIpNoResolve === "boolean" ? state.cnIpNoResolve : true,
    ruleOrder: Array.isArray(state.ruleOrder) ? state.ruleOrder : [],
  });
  const fallbackPolicyTarget = normalizeRuleTarget(state.fallbackPolicyTarget);
  const dialerProxyGroups = normalizeDialerProxyGroups(state.dialerProxyGroups);
  const experimentalCnUseCnRuleSet =
    typeof state.experimentalCnUseCnRuleSet === "boolean"
      ? state.experimentalCnUseCnRuleSet
      : template === "blank"
        ? false
        : template
          ? true
          : undefined;

  return {
    ...(template ? { template } : {}),
    ...(Array.isArray(state.enabledProxyGroups)
      ? { enabledProxyGroups: state.enabledProxyGroups.filter((item): item is string => typeof item === "string") }
      : {}),
    hiddenProxyGroups: normalizeStringArray(state.hiddenProxyGroups),
    ...(ruleModel.customProxyGroups.length > 0 ? { customProxyGroups: ruleModel.customProxyGroups } : {}),
    ...(ruleModel.customRuleSets.length > 0 ? { customRuleSets: ruleModel.customRuleSets } : {}),
    ...(Object.keys(ruleModel.builtinRuleEdits).length > 0 ? { builtinRuleEdits: ruleModel.builtinRuleEdits } : {}),
    ...(customRules.length > 0 ? { customRules } : {}),
    ...(dialerProxyGroups.length > 0 ? { dialerProxyGroups } : {}),
    ...(ruleOrder.length > 0 ? { ruleOrder } : {}),
    ...(fallbackPolicyTarget ? { fallbackPolicyTarget } : {}),
    ...(Object.keys(proxyGroupNameOverrides).length > 0 ? { proxyGroupNameOverrides } : {}),
    proxyGroupOrder: normalizeStringArray(state.proxyGroupOrder),
    ...(typeof state.dnsYaml === "string" ? { dnsYaml: state.dnsYaml } : {}),
    ...(typeof state.mixedPort === "number" ? { mixedPort: state.mixedPort } : {}),
    ...(typeof state.allowLan === "boolean" ? { allowLan: state.allowLan } : {}),
    ...(typeof state.testUrl === "string" ? { testUrl: state.testUrl } : {}),
    ...(typeof state.testInterval === "number" ? { testInterval: state.testInterval } : {}),
    ...(typeof state.ruleProviderBaseUrl === "string" ? { ruleProviderBaseUrl: state.ruleProviderBaseUrl } : {}),
    ...(typeof state.proxyGroupAdvancedModeEnabled === "boolean"
      ? { proxyGroupAdvancedModeEnabled: state.proxyGroupAdvancedModeEnabled }
      : {}),
    nodeNameFilter: normalizeNodeNameFilterConfig(state.nodeNameFilter),
    cnIpNoResolve: typeof state.cnIpNoResolve === "boolean" ? state.cnIpNoResolve : true,
    ...(experimentalCnUseCnRuleSet !== undefined ? { experimentalCnUseCnRuleSet } : {}),
  } as Partial<ConfigState>;
}

export function partializeConfigState(state: ConfigState): Partial<ConfigState> {
  return {
    template: state.template,
    enabledProxyGroups: state.enabledProxyGroups,
    hiddenProxyGroups: state.hiddenProxyGroups,
    customProxyGroups: state.customProxyGroups,
    customRuleSets: state.customRuleSets,
    builtinRuleEdits: state.builtinRuleEdits,
    customRules: state.customRules,
    dialerProxyGroups: state.dialerProxyGroups,
    ruleOrder: state.ruleOrder,
    fallbackPolicyTarget: state.fallbackPolicyTarget,
    proxyGroupNameOverrides: state.proxyGroupNameOverrides,
    proxyGroupOrder: state.proxyGroupOrder,
    dnsYaml: state.dnsYaml,
    mixedPort: state.mixedPort,
    allowLan: state.allowLan,
    testUrl: state.testUrl,
    testInterval: state.testInterval,
    ruleProviderBaseUrl: state.ruleProviderBaseUrl,
    proxyGroupAdvancedModeEnabled: state.proxyGroupAdvancedModeEnabled,
    nodeNameFilter: normalizeNodeNameFilterConfig(state.nodeNameFilter),
    cnIpNoResolve: state.cnIpNoResolve,
    experimentalCnUseCnRuleSet: state.experimentalCnUseCnRuleSet,
  };
}

function parsePersistedEnvelope(raw: string | null): PersistedEnvelope | null {
  if (!raw) return null;
  return safeParseJsonObject(raw) as PersistedEnvelope | null;
}

function readPersistedConfigState(storage: ConfigDraftStorage, storageName: string): Partial<ConfigState> | null {
  const envelope = parsePersistedEnvelope(storage.getItem(storageName));
  if (!envelope) return null;
  return normalizePersistedConfigState(envelope.state, {
    discardDraft: envelope.version !== CONFIG_DRAFT_STORAGE_VERSION,
  });
}

export function prepareConfigDraftScope(storage: ConfigDraftStorage, userId: string | null | undefined) {
  const storageName = getConfigDraftStorageNameForUser(userId);

  return {
    storageName,
    state: readPersistedConfigState(storage, storageName) ?? {},
  };
}
