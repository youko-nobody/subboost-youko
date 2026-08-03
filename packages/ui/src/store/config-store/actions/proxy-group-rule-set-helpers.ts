import { PROXY_GROUP_MODULES } from "@subboost/core/generator/proxy-groups";
import { normalizePersistedRuleOrder } from "@subboost/core/generator/rules";
import { resolveProxyGroupModuleName } from "@subboost/core/proxy-group-name";
import { normalizeProxyGroupTargetRef } from "@subboost/core/proxy-group-targets";
import {
  inferRuleSetFormatFromPath,
  isValidRuleSetBehaviorFormat,
  isValidRuleSetPathOrUrl,
  normalizeRuleSetFormat,
  normalizeRuleSetPathInput,
} from "@subboost/core/rules/rule-model";
import type {
  BuiltinRuleEdits,
  CustomProxyGroup,
  CustomRuleSet,
  ProxyGroupRuleTarget,
  ProxyGroupTargetRef,
  RuleSetBehavior,
  RuleSetFormat,
} from "@subboost/core/types/config";
import type { RuleSetDraft } from "../definitions";

export type RuleSetContainerTargetRef =
  | ProxyGroupTargetRef
  | { kind: "direct"; id: "DIRECT" }
  | { kind: "reject"; id: "REJECT" };

export function normalizeRuleSetDraft(rule: RuleSetDraft): RuleSetDraft | null {
  if (!rule || typeof rule.id !== "string" || typeof rule.path !== "string") return null;
  const id = rule.id.trim();
  const path = normalizeRuleSetPathInput(rule.path);
  if (!id || !path || !isValidRuleSetPathOrUrl(path)) return null;
  const behavior: RuleSetBehavior = rule.behavior === "classical"
    ? "classical"
    : rule.behavior === "ipcidr" || path.toLowerCase().startsWith("geoip/")
    ? "ipcidr"
    : "domain";
  const format: RuleSetFormat = rule.format
    ? normalizeRuleSetFormat(rule.format, path)
    : inferRuleSetFormatFromPath(path);
  if (!isValidRuleSetBehaviorFormat(behavior, format)) return null;
  return {
    id,
    name: typeof rule.name === "string" && rule.name.trim() ? rule.name.trim() : id,
    behavior,
    format,
    path,
    ...(rule.noResolve || behavior === "ipcidr" ? { noResolve: true } : {}),
  };
}

export function normalizeRuleOrderForState(state: {
  enabledProxyGroups: string[];
  customProxyGroups: CustomProxyGroup[];
  customRules: Parameters<typeof normalizePersistedRuleOrder>[0]["customRules"];
  customRuleSets: Parameters<typeof normalizePersistedRuleOrder>[0]["customRuleSets"];
  builtinRuleEdits: Parameters<typeof normalizePersistedRuleOrder>[0]["builtinRuleEdits"];
  proxyGroupNameOverrides: Record<string, string>;
  experimentalCnUseCnRuleSet: boolean;
  cnIpNoResolve: boolean;
  ruleOrder: string[];
}): string[] {
  return normalizePersistedRuleOrder({
    enabledModules: state.enabledProxyGroups,
    customProxyGroups: state.customProxyGroups,
    customRules: state.customRules,
    customRuleSets: state.customRuleSets,
    builtinRuleEdits: state.builtinRuleEdits,
    proxyGroupNameOverrides: state.proxyGroupNameOverrides,
    experimentalCnUseCnRuleSet: state.experimentalCnUseCnRuleSet,
    cnIpNoResolve: state.cnIpNoResolve,
    ruleOrder: state.ruleOrder,
  });
}

export function resolveModuleTargetName(moduleId: string, overrides?: Record<string, string>): string | null {
  const proxyModule = PROXY_GROUP_MODULES.find((item) => item.id === moduleId);
  if (!proxyModule) return null;
  return resolveProxyGroupModuleName(proxyModule, overrides?.[moduleId]);
}

export function resolveMoveTargetName(
  target: { kind: "module" | "custom" | "direct" | "reject"; id: string },
  customProxyGroups: CustomProxyGroup[],
  proxyGroupNameOverrides?: Record<string, string>
): string | null {
  if (target.kind === "direct") return "DIRECT";
  if (target.kind === "reject") return "REJECT";
  if (target.kind === "module") return resolveModuleTargetName(target.id, proxyGroupNameOverrides);
  const group = customProxyGroups.find((item) => item.id === target.id);
  return group?.name?.trim() || null;
}

export function resolveRuleSetContainerTargetName(
  id: string,
  customProxyGroups: CustomProxyGroup[],
  proxyGroupNameOverrides?: Record<string, string>
): string | null {
  if (id === "DIRECT") return "DIRECT";
  if (id === "REJECT") return "REJECT";
  return (
    resolveModuleTargetName(id, proxyGroupNameOverrides) ||
    customProxyGroups.find((group) => group.id === id)?.name?.trim() ||
    null
  );
}

export function compactBuiltinRuleEdits(edits: BuiltinRuleEdits): BuiltinRuleEdits {
  const next: BuiltinRuleEdits = {};
  for (const [key, edit] of Object.entries(edits || {})) {
    const target = normalizeProxyGroupTargetRef(edit?.target) ??
      (typeof edit?.target === "string" ? edit.target.trim() : "");
    const enabled = edit?.enabled === false ? false : undefined;
    if (!target && enabled !== false) continue;
    next[key] = {
      ...(target ? { target } : {}),
      ...(enabled === false ? { enabled: false } : {}),
    };
  }
  return next;
}

export function updateBuiltinRuleEdit(
  edits: BuiltinRuleEdits,
  key: string,
  patch: { target?: ProxyGroupRuleTarget | null; enabled?: false | true | null }
): BuiltinRuleEdits {
  const prev = edits?.[key] || {};
  const next = { ...prev };
  if ("target" in patch) {
    const target = normalizeProxyGroupTargetRef(patch.target) ??
      (typeof patch.target === "string" ? patch.target.trim() : "");
    if (target) next.target = target;
    else delete next.target;
  }
  if ("enabled" in patch) {
    if (patch.enabled === false) next.enabled = false;
    else delete next.enabled;
  }
  return compactBuiltinRuleEdits({ ...(edits || {}), [key]: next });
}

export function retargetBuiltinRuleEdits(edits: BuiltinRuleEdits, from: string, to: string): BuiltinRuleEdits {
  if (!from || from === to) return edits;
  let changed = false;
  const next: BuiltinRuleEdits = {};
  for (const [key, edit] of Object.entries(edits || {})) {
    if (edit?.target === from) {
      next[key] = { ...edit, target: to };
      changed = true;
    } else {
      next[key] = edit;
    }
  }
  return changed ? compactBuiltinRuleEdits(next) : edits;
}

export function findBuiltinRuleEditKeyByTarget(
  edits: BuiltinRuleEdits,
  target: RuleSetContainerTargetRef,
  legacyTargetName: string,
  ruleId: string
): string | null {
  if (!target.id || !legacyTargetName || !ruleId) return null;
  for (const [key, edit] of Object.entries(edits || {})) {
    if (!ruleTargetMatchesContainer(edit?.target, target, legacyTargetName)) continue;
    const parts = key.split(":");
    if (parts.length !== 3 || parts[0] !== "module") continue;
    if (parts[2] === ruleId) return key;
  }
  return null;
}

export function appendUniqueCustomRuleSets(
  existing: CustomRuleSet[],
  drafts: RuleSetDraft[],
  target: ProxyGroupRuleTarget
): CustomRuleSet[] {
  const seen = new Set(existing.map((item) => item.id));
  const next = [...existing];
  for (const draft of drafts) {
    const ruleSet = normalizeRuleSetDraft(draft);
    if (!ruleSet || seen.has(ruleSet.id)) continue;
    seen.add(ruleSet.id);
    next.push({ ...ruleSet, target });
  }
  return next;
}

export function ruleTargetMatchesContainer(
  target: ProxyGroupRuleTarget | undefined,
  container: RuleSetContainerTargetRef,
  legacyTargetName: string
): boolean {
  if (container.kind === "direct" || container.kind === "reject") {
    return typeof target === "string" && target.trim() === legacyTargetName.trim();
  }
  const ref = normalizeProxyGroupTargetRef(target);
  if (ref) return ref.kind === container.kind && ref.id === container.id;
  return typeof target === "string" && target.trim() === legacyTargetName.trim();
}
