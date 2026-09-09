import yaml from "js-yaml";
import { generateClashYaml } from "@subboost/core/generator";
import { generateSurgeProfile, normalizeSurgeConfig, SURGE_PROXY_GROUP_TYPES, SURGE_RULE_TYPES } from "@subboost/core/surge";
import { getModulesForTemplate, PROXY_GROUP_MODULES } from "@subboost/core/generator/proxy-groups";
import { buildGenerateOptionsFromConfig, getEffectiveTestOptions } from "@subboost/core/subscription/config-utils";
import { buildProxyProvidersFromConfig } from "@subboost/core/subscription/proxy-providers";
import { normalizeSubscriptionProfileType } from "@subboost/core/subscription/profile-type";
import {
  isValidRuleSetBehaviorFormat,
  isValidRuleSetPathOrUrl,
  normalizeRuleModelFromConfig,
  normalizeRuleSetFormat,
} from "@subboost/core/rules/rule-model";
import { resolveProxyGroupModuleName } from "@subboost/core/proxy-group-name";
import type { ParsedNode } from "@subboost/core/types/node";

export type SubscriptionConfigValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  generatedYamlBytes?: number;
  proxyGroupCount?: number;
  ruleCount?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function hasMeaningfulTarget(value: unknown): boolean {
  return !(typeof value === "string" && value.trim() === "");
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(toTrimmedString).filter(Boolean);
}

function addDuplicateErrors(values: string[], label: string, errors: string[]) {
  const seen = new Set<string>();
  const duplicated = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicated.add(value);
    seen.add(value);
  }
  for (const value of duplicated) {
    errors.push(`${label}「${value}」重复`);
  }
}

function getProxyGroupNameOverrides(config: Record<string, unknown>): Record<string, string> {
  if (!isRecord(config.proxyGroupNameOverrides)) return {};
  return Object.fromEntries(
    Object.entries(config.proxyGroupNameOverrides)
      .map(([key, value]) => [key.trim(), toTrimmedString(value)] as const)
      .filter(([key, value]) => key && value)
  );
}

function resolveModuleNames(config: Record<string, unknown>): Record<string, string> {
  const overrides = getProxyGroupNameOverrides(config);
  return Object.fromEntries(
    PROXY_GROUP_MODULES.map((module) => [
      module.id,
      resolveProxyGroupModuleName(module, overrides[module.id]),
    ])
  );
}

function collectCustomGroupFacts(config: Record<string, unknown>, errors: string[], warnings: string[]) {
  const rawGroups = Array.isArray(config.customProxyGroups) ? config.customProxyGroups : [];
  const ids: string[] = [];
  const activeNames: string[] = [];
  const activeById = new Map<string, string>();
  const activeByName = new Set<string>();
  const validTypes = new Set(["select", "url-test", "fallback", "load-balance", "direct-first", "reject-first"]);

  rawGroups.forEach((raw, index) => {
    if (!isRecord(raw)) {
      errors.push(`自定义策略组 #${index + 1} 必须是对象`);
      return;
    }
    const id = toTrimmedString(raw.id);
    const name = toTrimmedString(raw.name);
    const groupType = toTrimmedString(raw.groupType);
    const enabled = raw.enabled !== false;
    if (!id) errors.push(`自定义策略组 #${index + 1} 缺少 ID`);
    if (!name) errors.push(`自定义策略组 #${index + 1} 缺少名称`);
    if (!validTypes.has(groupType)) errors.push(`自定义策略组「${name || id || index + 1}」类型无效`);
    const icon = toTrimmedString(raw.icon);
    if (icon && !/^https?:\/\//i.test(icon)) warnings.push(`自定义策略组「${name || id}」的图标不是 HTTP/HTTPS URL`);
    if (id) ids.push(id);
    if (enabled && id && name) {
      activeNames.push(name);
      activeById.set(id, name);
      activeByName.add(name);
    }
  });

  addDuplicateErrors(ids, "自定义策略组 ID", errors);
  addDuplicateErrors(activeNames, "自定义策略组名称", errors);
  return { activeById, activeByName, activeNames };
}

function collectDialerGroupFacts(config: Record<string, unknown>, errors: string[], warnings: string[]) {
  const rawGroups = Array.isArray(config.dialerProxyGroups) ? config.dialerProxyGroups : [];
  const ids: string[] = [];
  const activeNames: string[] = [];
  const activeById = new Set<string>();
  const activeByName = new Set<string>();
  const validTypes = new Set(["select", "url-test", "fallback", "load-balance", "direct-first", "reject-first"]);

  rawGroups.forEach((raw, index) => {
    if (!isRecord(raw)) {
      errors.push(`中转策略组 #${index + 1} 必须是对象`);
      return;
    }
    const id = toTrimmedString(raw.id);
    const name = toTrimmedString(raw.name);
    const type = toTrimmedString(raw.type);
    const enabled = raw.enabled !== false;
    if (!id) errors.push(`中转策略组 #${index + 1} 缺少 ID`);
    if (!name) errors.push(`中转策略组 #${index + 1} 缺少名称`);
    if (!validTypes.has(type)) errors.push(`中转策略组「${name || id || index + 1}」类型无效`);
    const icon = toTrimmedString(raw.icon);
    if (icon && !/^https?:\/\//i.test(icon)) warnings.push(`中转策略组「${name || id}」的图标不是 HTTP/HTTPS URL`);
    if (id) ids.push(id);
    if (enabled && name) {
      activeNames.push(name);
      if (id) activeById.add(id);
      activeByName.add(name);
    }
  });

  addDuplicateErrors(ids, "中转策略组 ID", errors);
  addDuplicateErrors(activeNames, "中转策略组名称", errors);
  return { activeById, activeByName, activeNames };
}

function getEnabledModuleIds(config: Record<string, unknown>): string[] {
  const explicit = stringList(config.enabledGroups);
  if (explicit.length > 0) return explicit;
  const template = toTrimmedString(config.template);
  if (
    template === "blank" ||
    template === "minimal" ||
    template === "standard" ||
    template === "full" ||
    template === "my-routing"
  ) {
    return getModulesForTemplate(template);
  }
  return [];
}

function createTargetValidator(params: {
  config: Record<string, unknown>;
  nodes: ParsedNode[];
  activeCustomById: Map<string, string>;
  activeCustomByName: Set<string>;
  activeDialerByName: Set<string>;
}) {
  const enabledModules = new Set(getEnabledModuleIds(params.config));
  const moduleNames = resolveModuleNames(params.config);
  const nodeNames = new Set(params.nodes.map((node) => toTrimmedString(node.name)).filter(Boolean));
  const directTargets = new Set(["DIRECT", "REJECT"]);
  const availableNames = new Set<string>([
    ...directTargets,
    ...Array.from(enabledModules).map((id) => moduleNames[id]).filter(Boolean),
    ...params.activeCustomByName,
    ...params.activeDialerByName,
    ...nodeNames,
  ]);

  return (target: unknown, label: string, errors: string[]) => {
    if (typeof target === "string") {
      const name = target.trim();
      if (!name) {
        errors.push(`${label}缺少策略目标`);
        return;
      }
      if (!availableNames.has(name)) {
        errors.push(`${label}指向不存在或未启用的策略目标「${name}」`);
      }
      return;
    }

    if (!isRecord(target)) {
      errors.push(`${label}缺少策略目标`);
      return;
    }

    const kind = target.kind;
    const id = toTrimmedString(target.id);
    if (kind === "module") {
      if (!PROXY_GROUP_MODULES.some((module) => module.id === id)) {
        errors.push(`${label}指向不存在的内置策略组「${id || "空"}」`);
      } else if (!enabledModules.has(id)) {
        errors.push(`${label}指向未启用的内置策略组「${moduleNames[id] || id}」`);
      }
      return;
    }
    if (kind === "custom") {
      if (!params.activeCustomById.has(id)) {
        errors.push(`${label}指向不存在或已停用的自定义策略组「${id || "空"}」`);
      }
      return;
    }
    errors.push(`${label}策略目标类型无效`);
  };
}

function validateCustomRules(
  config: Record<string, unknown>,
  validateTarget: (target: unknown, label: string, errors: string[]) => void,
  errors: string[]
) {
  const rules = Array.isArray(config.customRules) ? config.customRules : [];
  const ids: string[] = [];
  const allowedTypes = new Set([
    "DOMAIN",
    "DOMAIN-SUFFIX",
    "DOMAIN-KEYWORD",
    "IP-CIDR",
    "IP-CIDR6",
    "GEOIP",
    "GEOSITE",
    "PROCESS-NAME",
    "DST-PORT",
    "SRC-PORT",
  ]);
  rules.forEach((raw, index) => {
    if (!isRecord(raw)) {
      errors.push(`自定义规则 #${index + 1} 必须是对象`);
      return;
    }
    const id = toTrimmedString(raw.id);
    const type = toTrimmedString(raw.type);
    const value = toTrimmedString(raw.value);
    if (id) ids.push(id);
    if (!allowedTypes.has(type)) errors.push(`自定义规则 #${index + 1} 类型无效`);
    if (!value) errors.push(`自定义规则 #${index + 1} 缺少匹配内容`);
    validateTarget(raw.target, `自定义规则「${value || id || index + 1}」`, errors);
  });
  addDuplicateErrors(ids, "自定义规则 ID", errors);
}

function validateCustomRuleSets(
  config: Record<string, unknown>,
  validateTarget: (target: unknown, label: string, errors: string[]) => void,
  errors: string[]
) {
  const ruleSets = Array.isArray(config.customRuleSets) ? config.customRuleSets : [];
  const ids: string[] = [];
  ruleSets.forEach((raw, index) => {
    if (!isRecord(raw)) {
      errors.push(`远程规则集 #${index + 1} 必须是对象`);
      return;
    }
    const id = toTrimmedString(raw.id);
    const name = toTrimmedString(raw.name) || id || `#${index + 1}`;
    const path = toTrimmedString(raw.path);
    const behavior = toTrimmedString(raw.behavior);
    if (id) ids.push(id);
    if (!id) errors.push(`远程规则集 ${name} 缺少 ID`);
    if (behavior !== "domain" && behavior !== "ipcidr" && behavior !== "classical") {
      errors.push(`远程规则集「${name}」behavior 无效`);
    }
    if (!path || !isValidRuleSetPathOrUrl(path)) {
      errors.push(`远程规则集「${name}」路径或 URL 无效`);
    } else if (behavior === "domain" || behavior === "ipcidr" || behavior === "classical") {
      const format = normalizeRuleSetFormat(raw.format, path);
      if (!isValidRuleSetBehaviorFormat(behavior, format)) {
        errors.push(`远程规则集「${name}」不能使用 classical + mrs 组合`);
      }
    }
    validateTarget(raw.target, `远程规则集「${name}」`, errors);
  });
  addDuplicateErrors(ids, "远程规则集 ID", errors);
}

function validateBuiltinRuleEdits(
  config: Record<string, unknown>,
  validateTarget: (target: unknown, label: string, errors: string[]) => void,
  errors: string[]
) {
  if (!isRecord(config.builtinRuleEdits)) return;
  for (const [key, raw] of Object.entries(config.builtinRuleEdits)) {
    if (!isRecord(raw)) {
      errors.push(`内置规则覆盖「${key}」必须是对象`);
      continue;
    }
    if (raw.enabled === false && raw.target === undefined) continue;
    validateTarget(raw.target, `内置规则覆盖「${key}」`, errors);
  }
}

function validateDialerReferences(
  config: Record<string, unknown>,
  nodes: ParsedNode[],
  groupNames: string[],
  warnings: string[]
) {
  const nodeNames = new Set(nodes.map((node) => toTrimmedString(node.name)).filter(Boolean));
  const relayTargets = new Set(["DIRECT", "REJECT", ...nodeNames, ...groupNames]);
  const groups = Array.isArray(config.dialerProxyGroups) ? config.dialerProxyGroups : [];
  groups.forEach((raw, index) => {
    if (!isRecord(raw) || raw.enabled === false) return;
    const name = toTrimmedString(raw.name) || `#${index + 1}`;
    const relayNodes = stringList(raw.relayNodes);
    const targetNodes = stringList(raw.targetNodes);
    if (relayNodes.length === 0) warnings.push(`中转策略组「${name}」没有中转节点`);
    for (const relay of relayNodes) {
      if (!relayTargets.has(relay)) warnings.push(`中转策略组「${name}」引用了当前不存在的中转节点或策略组「${relay}」`);
    }
    for (const target of targetNodes) {
      if (!nodeNames.has(target)) warnings.push(`中转策略组「${name}」引用了当前不存在的落地节点「${target}」`);
    }
  });
}

function validateGroupListeners(
  config: Record<string, unknown>,
  errors: string[],
  warnings: string[],
  activeCustomById: Map<string, string>,
  activeDialerById: Set<string>
) {
  const listeners = Array.isArray(config.groupListeners) ? config.groupListeners : [];
  const enabledModules = new Set(getEnabledModuleIds(config));
  const usedPorts = new Set<number>();
  listeners.forEach((raw, index) => {
    if (!isRecord(raw)) {
      errors.push(`分组监听 #${index + 1} 必须是对象`);
      return;
    }
    const port = raw.port;
    if (typeof port !== "number" || !Number.isInteger(port) || port < 1 || port > 65535) {
      errors.push(`分组监听 #${index + 1} 端口无效`);
    } else if (usedPorts.has(port)) {
      warnings.push(`分组监听端口 ${port} 重复，生成时后面的绑定可能会被忽略`);
    } else {
      usedPorts.add(port);
    }
    const target = isRecord(raw.target) ? raw.target : null;
    const kind = target?.kind;
    const id = toTrimmedString(target?.id);
    if (kind === "module" && !enabledModules.has(id)) warnings.push(`分组监听 #${index + 1} 指向未启用的内置策略组`);
    if (kind === "custom" && !activeCustomById.has(id)) warnings.push(`分组监听 #${index + 1} 指向不存在或已停用的自定义策略组`);
    if (kind === "dialer" && !activeDialerById.has(id)) warnings.push(`分组监听 #${index + 1} 指向的中转策略组可能未启用`);
  });
}

function collectSurgePolicyTargets(config: ReturnType<typeof normalizeSurgeConfig>, nodes: ParsedNode[]) {
  const groupIds = new Set<string>();
  const groupNames = new Set<string>();
  for (const group of config.regionGroups) {
    if (group.enabled === false) continue;
    groupIds.add(group.id);
    groupNames.add(group.name);
  }
  for (const group of config.proxyGroups) {
    if (group.enabled === false) continue;
    groupIds.add(group.id);
    groupNames.add(group.name);
  }
  return {
    groupIds,
    groupNames,
    nodeNames: new Set(nodes.map((node) => toTrimmedString(node.name)).filter(Boolean)),
  };
}

function validateSurgeTarget(
  target: unknown,
  label: string,
  facts: ReturnType<typeof collectSurgePolicyTargets>,
  errors: string[]
) {
  if (typeof target === "string") {
    const name = target.trim();
    if (!name) {
      errors.push(`${label}缺少策略目标`);
      return;
    }
    if (name !== "DIRECT" && name !== "REJECT" && !facts.groupNames.has(name) && !facts.nodeNames.has(name)) {
      errors.push(`${label}指向不存在的策略目标「${name}」`);
    }
    return;
  }
  if (!isRecord(target)) {
    errors.push(`${label}缺少策略目标`);
    return;
  }
  if (target.kind === "direct" || target.kind === "reject") return;
  if (target.kind === "group") {
    const id = toTrimmedString(target.id);
    if (!facts.groupIds.has(id)) errors.push(`${label}指向不存在或已停用的 Surge 策略组「${id || "空"}」`);
    return;
  }
  if (target.kind === "node") {
    const name = toTrimmedString(target.name);
    if (!facts.nodeNames.has(name)) errors.push(`${label}指向不存在的节点「${name || "空"}」`);
    return;
  }
  errors.push(`${label}策略目标类型无效`);
}

function validateSurgeSubscriptionConfig(params: {
  nodes: ParsedNode[];
  config: Record<string, unknown>;
}): SubscriptionConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const surgeConfig = normalizeSurgeConfig(params.config.surgeConfig);
  const facts = collectSurgePolicyTargets(surgeConfig, params.nodes);
  const groupIds: string[] = [];
  const groupNames: string[] = [];

  for (const group of [...surgeConfig.regionGroups, ...surgeConfig.proxyGroups]) {
    groupIds.push(group.id);
    if (group.enabled !== false) groupNames.push(group.name);
    if (!SURGE_PROXY_GROUP_TYPES.includes(group.type)) {
      errors.push(`Surge 策略组「${group.name}」类型无效`);
    }
    if (group.type === "smart" && "policies" in group) {
      const policies = Array.isArray((group as { policies?: unknown }).policies)
        ? ((group as { policies?: unknown[] }).policies ?? [])
        : [];
      const invalid = policies.some((policy) => isRecord(policy) && policy.kind !== "node");
      if (invalid) warnings.push(`Surge smart 策略组「${group.name}」只会使用真实节点，DIRECT/REJECT/嵌套组会被生成器忽略`);
    }
  }
  addDuplicateErrors(groupIds, "Surge 策略组 ID", errors);
  addDuplicateErrors(groupNames, "Surge 策略组名称", errors);

  for (const ruleSet of surgeConfig.ruleSets) {
    if (!/^https?:\/\//i.test(ruleSet.url)) warnings.push(`Surge 远程规则集「${ruleSet.name}」不是 HTTP/HTTPS URL`);
    validateSurgeTarget(ruleSet.target, `Surge 远程规则集「${ruleSet.name}」`, facts, errors);
  }
  for (const rule of surgeConfig.rules) {
    if (!SURGE_RULE_TYPES.includes(rule.type)) errors.push(`Surge 规则「${rule.id}」类型无效`);
    validateSurgeTarget(rule.target, `Surge 规则「${rule.value || rule.id}」`, facts, errors);
  }
  validateSurgeTarget(surgeConfig.finalTarget, "Surge FINAL 兜底", facts, errors);

  let generatedYamlBytes: number | undefined;
  let proxyGroupCount: number | undefined;
  let ruleCount: number | undefined;
  try {
    const output = generateSurgeProfile({ nodes: params.nodes, config: surgeConfig });
    generatedYamlBytes = new TextEncoder().encode(output.content).byteLength;
    proxyGroupCount = output.policyGroupCount;
    ruleCount = output.ruleCount;
    if (params.nodes.length > 0 && output.proxyCount === 0) {
      errors.push("当前节点没有 Surge 可用协议或缺少必要字段");
    }
    if (output.skippedNodes.length > 0) {
      warnings.push(`有 ${output.skippedNodes.length} 个节点暂未进入 Surge 配置`);
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Surge 配置生成失败");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    ...(generatedYamlBytes !== undefined ? { generatedYamlBytes } : {}),
    ...(proxyGroupCount !== undefined ? { proxyGroupCount } : {}),
    ...(ruleCount !== undefined ? { ruleCount } : {}),
  };
}

export function validateLocalSubscriptionConfig(params: {
  urls: string[];
  nodes: ParsedNode[];
  config: Record<string, unknown>;
}): SubscriptionConfigValidationResult {
  if (normalizeSubscriptionProfileType(params.config.profileType) === "surge") {
    return validateSurgeSubscriptionConfig({ nodes: params.nodes, config: params.config });
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const config = isRecord(params.config) ? params.config : {};
  const customFacts = collectCustomGroupFacts(config, errors, warnings);
  const dialerFacts = collectDialerGroupFacts(config, errors, warnings);
  const validateTarget = createTargetValidator({
    config,
    nodes: params.nodes,
    activeCustomById: customFacts.activeById,
    activeCustomByName: customFacts.activeByName,
    activeDialerByName: dialerFacts.activeByName,
  });

  validateCustomRules(config, validateTarget, errors);
  validateCustomRuleSets(config, validateTarget, errors);
  validateBuiltinRuleEdits(config, validateTarget, errors);
  if (config.fallbackPolicyTarget !== undefined && hasMeaningfulTarget(config.fallbackPolicyTarget)) {
    validateTarget(config.fallbackPolicyTarget, "兜底策略", errors);
  }
  validateDialerReferences(config, params.nodes, [...customFacts.activeNames, ...dialerFacts.activeNames], warnings);
  validateGroupListeners(config, errors, warnings, customFacts.activeById, dialerFacts.activeById);

  let generatedYamlBytes: number | undefined;
  let proxyGroupCount: number | undefined;
  let ruleCount: number | undefined;
  try {
    const { testUrl, testInterval } = getEffectiveTestOptions(config);
    const proxyProviders = buildProxyProvidersFromConfig(config, { testUrl, testInterval });
    const generatedYaml = generateClashYaml(buildGenerateOptionsFromConfig(config, {
      nodes: params.nodes,
      proxyProviders,
    }));
    generatedYamlBytes = new TextEncoder().encode(generatedYaml).byteLength;
    const parsed = yaml.load(generatedYaml);
    if (isRecord(parsed)) {
      proxyGroupCount = Array.isArray(parsed["proxy-groups"]) ? parsed["proxy-groups"].length : 0;
      ruleCount = Array.isArray(parsed.rules) ? parsed.rules.length : 0;
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "配置生成失败");
  }

  const ruleModel = normalizeRuleModelFromConfig(config);
  if (Array.isArray(config.customRuleSets) && ruleModel.customRuleSets.length < config.customRuleSets.length) {
    warnings.push("部分远程规则集未通过规范化，保存前请检查路径、behavior、format 和目标策略");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    ...(generatedYamlBytes !== undefined ? { generatedYamlBytes } : {}),
    ...(proxyGroupCount !== undefined ? { proxyGroupCount } : {}),
    ...(ruleCount !== undefined ? { ruleCount } : {}),
  };
}

export function assertValidLocalSubscriptionConfig(params: {
  urls: string[];
  nodes: ParsedNode[];
  config: Record<string, unknown>;
}): void {
  const validation = validateLocalSubscriptionConfig(params);
  if (validation.ok) return;
  throw new Error(`配置校验失败：${validation.errors.slice(0, 5).join("；")}`);
}
