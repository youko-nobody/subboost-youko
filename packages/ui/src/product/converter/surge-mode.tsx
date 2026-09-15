"use client";

import * as React from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ExternalLink,
  FileCode2,
  Globe2,
  GripVertical,
  ListPlus,
  Plus,
  Route,
  RotateCcw,
  Search,
  Server,
  Settings2,
  Trash2,
  WandSparkles,
  X,
} from "lucide-react";
import { Badge } from "@subboost/ui/components/ui/badge";
import { Button } from "@subboost/ui/components/ui/button";
import { IconButton } from "@subboost/ui/components/ui/icon-button";
import { Input } from "@subboost/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@subboost/ui/components/ui/select";
import { Switch } from "@subboost/ui/components/ui/switch";
import { Textarea } from "@subboost/ui/components/ui/textarea";
import { cn } from "@subboost/ui/lib/utils";
import { useConfigStore } from "@subboost/ui/store/config-store";
import {
  createYoukoSurgeConfig,
  generateSurgeProfile,
  SURGE_PROXY_GROUP_TYPES,
  SURGE_RULE_SET_RESOURCE_TYPES,
  SURGE_RULE_TYPES,
  type SurgeConfig,
  type SurgePolicyRef,
  type SurgeProxyGroup,
  type SurgeProxyGroupType,
  type SurgeRegionPolicyGroup,
  type SurgeRule,
  type SurgeRuleSet,
  type SurgeRuleSetResourceType,
  type SurgeRuleType,
} from "@subboost/core/surge";
import { SectionHeader } from "./advanced-mode/section-header";
import { InputSection } from "./advanced-mode/sections/input-section";
import { NodeManagementSection } from "./advanced-mode/sections/node-management-section";
import { ProxyGroupIconUrlEditor } from "./advanced-mode/sections/proxy-group-icon-url-editor";

type SectionKey =
  "input" | "nodes" | "general" | "regions" | "groups" | "rules";

type PolicyOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SurgeRuleOrderItem =
  | { key: string; kind: "rule-set"; ruleSet: SurgeRuleSet }
  | { key: string; kind: "rule"; rule: SurgeRule };

const GROUP_TYPE_LABELS: Record<SurgeProxyGroupType, string> = {
  select: "手动选择",
  "url-test": "自动测速",
  fallback: "故障切换",
  "load-balance": "负载均衡",
  smart: "Smart 智能",
};

const RULE_SET_RESOURCE_TYPE_LABELS: Record<SurgeRuleSetResourceType, string> =
  {
    "rule-set": "RULE-SET",
    "domain-set": "DOMAIN-SET",
  };

const SURGE_EDITABLE_RULE_TYPES = SURGE_RULE_TYPES.filter(
  (type) => type !== "FINAL",
);

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function encodePolicyRef(ref: SurgePolicyRef | string | undefined): string {
  if (!ref) return "";
  if (typeof ref === "string") {
    const normalized = ref.trim().toUpperCase();
    if (normalized === "DIRECT") return "direct";
    if (normalized === "REJECT") return "reject";
    return `raw:${ref}`;
  }
  if (ref.kind === "direct") return "direct";
  if (ref.kind === "reject") return "reject";
  if (ref.kind === "group") return `group:${ref.id}`;
  if (ref.kind === "node") return `node:${ref.name}`;
  return "";
}

function decodePolicyRef(value: string): SurgePolicyRef | string | null {
  if (value === "direct") return { kind: "direct" };
  if (value === "reject") return { kind: "reject" };
  if (value.startsWith("group:")) {
    const id = value.slice("group:".length).trim();
    return id ? { kind: "group", id } : null;
  }
  if (value.startsWith("node:")) {
    const name = value.slice("node:".length).trim();
    return name ? { kind: "node", name } : null;
  }
  if (value.startsWith("raw:")) {
    const name = value.slice("raw:".length).trim();
    return name || null;
  }
  return null;
}

function policyRefLabel(
  ref: SurgePolicyRef | string,
  groupNameById: Map<string, string>,
): string {
  if (typeof ref === "string") return ref;
  if (ref.kind === "direct") return "DIRECT";
  if (ref.kind === "reject") return "REJECT";
  if (ref.kind === "node") return ref.name;
  if (ref.kind === "group") return groupNameById.get(ref.id) ?? ref.id;
  return "UNKNOWN";
}

function splitKeywords(value: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value.split(/[,，\n]/)) {
    const keyword = item.trim();
    if (!keyword || seen.has(keyword)) continue;
    seen.add(keyword);
    out.push(keyword);
  }
  return out;
}

function typeLabel(type: SurgeProxyGroupType): string {
  return GROUP_TYPE_LABELS[type] ?? type;
}

function buildGroupNameById(config: SurgeConfig): Map<string, string> {
  const out = new Map<string, string>();
  for (const group of [...config.regionGroups, ...config.proxyGroups]) {
    if (!group.id || !group.name) continue;
    out.set(group.id, group.name);
  }
  return out;
}

function buildPolicyOptions(params: {
  config: SurgeConfig;
  nodeNames: string[];
  excludeGroupId?: string;
  nodesOnly?: boolean;
}): PolicyOption[] {
  const options: PolicyOption[] = params.nodesOnly
    ? []
    : [
        { value: "direct", label: "DIRECT" },
        { value: "reject", label: "REJECT" },
      ];

  if (!params.nodesOnly) {
    for (const group of [
      ...params.config.regionGroups,
      ...params.config.proxyGroups,
    ]) {
      if (!group.id || group.id === params.excludeGroupId) continue;
      options.push({
        value: `group:${group.id}`,
        label: `策略组 / ${group.name}`,
        disabled: group.enabled === false,
      });
    }
  }

  for (const name of params.nodeNames) {
    options.push({ value: `node:${name}`, label: `节点 / ${name}` });
  }

  return options;
}

function updateArrayItem<T extends { id: string }>(
  items: T[],
  id: string,
  patch: Partial<T>,
): T[] {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

function removeArrayItem<T extends { id: string }>(
  items: T[],
  id: string,
): T[] {
  return items.filter((item) => item.id !== id);
}

function moveArrayItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= items.length) return items;

  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item);
  return next;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function moveArrayItemToIndex<T>(
  items: T[],
  index: number,
  targetIndex: number,
): T[] {
  if (index < 0 || index >= items.length || items.length <= 1) return items;
  const nextIndex = clamp(Math.floor(targetIndex), 0, items.length - 1);
  if (nextIndex === index) return items;

  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item);
  return next;
}

function moveArrayItemById<T extends { id: string }>(
  items: T[],
  id: string,
  direction: -1 | 1,
): T[] {
  return moveArrayItem(
    items,
    items.findIndex((item) => item.id === id),
    direction,
  );
}

function ruleSetOrderKey(id: string): string {
  return `rule-set:${id}`;
}

function ruleOrderKey(id: string): string {
  return `rule:${id}`;
}

function buildSurgeRuleOrderItems(
  config: SurgeConfig,
  preferredOrder: string[] = config.ruleOrder ?? [],
): SurgeRuleOrderItem[] {
  const items: SurgeRuleOrderItem[] = [
    ...config.ruleSets.map((ruleSet) => ({
      key: ruleSetOrderKey(ruleSet.id),
      kind: "rule-set" as const,
      ruleSet,
    })),
    ...config.rules
      .filter((rule) => rule.type !== "FINAL")
      .map((rule) => ({
        key: ruleOrderKey(rule.id),
        kind: "rule" as const,
        rule,
      })),
  ];
  const itemByKey = new Map(items.map((item) => [item.key, item]));
  const seen = new Set<string>();
  const ordered: SurgeRuleOrderItem[] = [];

  for (const key of preferredOrder) {
    const item = itemByKey.get(key);
    if (!item || seen.has(key)) continue;
    seen.add(key);
    ordered.push(item);
  }

  for (const item of items) {
    if (seen.has(item.key)) continue;
    seen.add(item.key);
    ordered.push(item);
  }

  return ordered;
}

function normalizeSurgeRuleOrder(
  config: SurgeConfig,
  preferredOrder: string[] = config.ruleOrder ?? [],
): string[] {
  return buildSurgeRuleOrderItems(config, preferredOrder).map(
    (item) => item.key,
  );
}

function ruleOrderItemTitle(item: SurgeRuleOrderItem): string {
  if (item.kind === "rule-set")
    return item.ruleSet.name || item.ruleSet.url || item.ruleSet.id;
  return item.rule.value
    ? `${item.rule.type} / ${item.rule.value}`
    : item.rule.type;
}

function ruleOrderItemDetail(item: SurgeRuleOrderItem): string {
  if (item.kind === "rule-set")
    return item.ruleSet.url || "未填写远程规则集 URL";
  return item.rule.value || "未填写匹配内容";
}

function ruleSetResourceType(ruleSet: SurgeRuleSet): SurgeRuleSetResourceType {
  return ruleSet.resourceType ?? "rule-set";
}

function ruleOrderItemTarget(
  item: SurgeRuleOrderItem,
): SurgePolicyRef | string {
  return item.kind === "rule-set" ? item.ruleSet.target : item.rule.target;
}

function ruleOrderItemEnabled(item: SurgeRuleOrderItem): boolean {
  return item.kind === "rule-set"
    ? item.ruleSet.enabled !== false
    : item.rule.enabled !== false;
}

function ruleOrderItemNoResolve(item: SurgeRuleOrderItem): boolean {
  return item.kind === "rule-set"
    ? ruleSetResourceType(item.ruleSet) === "rule-set" &&
        item.ruleSet.noResolve === true
    : item.rule.noResolve === true;
}

function PolicyTargetSelect({
  value,
  options,
  onChange,
  className,
}: {
  value: SurgePolicyRef | string;
  options: PolicyOption[];
  onChange: (value: SurgePolicyRef | string) => void;
  className?: string;
}) {
  const encoded = encodePolicyRef(value);
  return (
    <Select
      value={encoded}
      onValueChange={(next) => {
        const decoded = decodePolicyRef(next);
        if (decoded) onChange(decoded);
      }}
    >
      <SelectTrigger className={cn("h-8 text-xs", className)}>
        <SelectValue placeholder="选择策略" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function GroupTypeSelect({
  value,
  onChange,
}: {
  value: SurgeProxyGroupType;
  onChange: (value: SurgeProxyGroupType) => void;
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next as SurgeProxyGroupType)}
    >
      <SelectTrigger className="h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SURGE_PROXY_GROUP_TYPES.map((type) => (
          <SelectItem key={type} value={type}>
            {typeLabel(type)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs leading-5 text-white/45">
      {children}
    </div>
  );
}

type SurgeVisualIssue = {
  tone: "error" | "warning";
  title: string;
  detail?: string;
};

function isHttpUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function duplicateValues(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) continue;
    if (seen.has(normalized)) duplicates.add(normalized);
    seen.add(normalized);
  }
  return [...duplicates];
}

function targetSearchText(
  target: SurgePolicyRef | string,
  groupNameById: Map<string, string>,
): string {
  if (typeof target === "string") return target;
  if (target.kind === "direct") return "DIRECT direct";
  if (target.kind === "reject") return "REJECT reject";
  if (target.kind === "node") return target.name;
  if (target.kind === "group")
    return `${target.id} ${groupNameById.get(target.id) ?? ""}`;
  return "";
}

function matchesTextFilter(parts: Array<string | undefined>, filter: string) {
  if (!filter) return true;
  return parts.join("\n").toLowerCase().includes(filter);
}

function matchesRuleSetFilter(
  ruleSet: SurgeRuleSet,
  filter: string,
  groupNameById: Map<string, string>,
): boolean {
  return matchesTextFilter(
    [
      ruleSet.id,
      ruleSet.name,
      ruleSet.url,
      ruleSetResourceType(ruleSet),
      ruleSet.noResolve ? "no-resolve" : "",
      targetSearchText(ruleSet.target, groupNameById),
    ],
    filter,
  );
}

function matchesRuleFilter(
  rule: SurgeRule,
  filter: string,
  groupNameById: Map<string, string>,
): boolean {
  return matchesTextFilter(
    [
      rule.id,
      rule.type,
      rule.value,
      rule.noResolve ? "no-resolve" : "",
      targetSearchText(rule.target, groupNameById),
    ],
    filter,
  );
}

function describePolicyRef(
  target: SurgePolicyRef | string,
  groupNameById: Map<string, string>,
): string {
  return policyRefLabel(target, groupNameById);
}

function buildVisualIssues(params: {
  config: SurgeConfig;
  groupNameById: Map<string, string>;
  nodeNames: string[];
  skippedNodeNames: string[];
  generatedError: string | null;
  skippedNodes: number;
}): SurgeVisualIssue[] {
  const issues: SurgeVisualIssue[] = [];
  if (params.generatedError) {
    issues.push({
      tone: "error",
      title: "Surge 配置生成失败",
      detail: params.generatedError,
    });
    return issues;
  }

  if (params.nodeNames.length === 0) {
    issues.push({
      tone: "warning",
      title: "还没有可用节点",
      detail: "导入订阅或手动添加节点后，右侧才能生成完整 Surge 配置。",
    });
  }

  if (params.skippedNodes > 0) {
    issues.push({
      tone: "warning",
      title: `${params.skippedNodes} 个节点暂未进入 Surge 配置`,
      detail: "这些节点协议不支持 Surge，或缺少生成所需字段。",
    });
  }

  const allGroups = [
    ...params.config.regionGroups,
    ...params.config.proxyGroups,
  ];
  const activeGroupIds = new Set(
    allGroups
      .filter((group) => group.enabled !== false)
      .map((group) => group.id),
  );
  const skippedNodeNameSet = new Set(params.skippedNodeNames);
  const availableNodeNames = new Set(
    params.nodeNames.filter((name) => !skippedNodeNameSet.has(name)),
  );

  const invalidPolicyTarget = (
    target: SurgePolicyRef | string,
  ): string | null => {
    if (typeof target === "string") return target.trim() ? null : "目标为空";
    if (target.kind === "direct" || target.kind === "reject") return null;
    if (target.kind === "group") {
      return activeGroupIds.has(target.id)
        ? null
        : `策略组不存在或已停用：${params.groupNameById.get(target.id) ?? target.id}`;
    }
    if (target.kind === "node") {
      return availableNodeNames.has(target.name)
        ? null
        : `节点不存在或未生成：${target.name}`;
    }
    return "目标类型无法识别";
  };

  const invalidTargets: string[] = [];
  for (const ruleSet of params.config.ruleSets) {
    if (ruleSet.enabled === false) continue;
    const reason = invalidPolicyTarget(ruleSet.target);
    if (reason) invalidTargets.push(`${ruleSet.name || ruleSet.id}：${reason}`);
  }
  for (const rule of params.config.rules) {
    if (rule.enabled === false) continue;
    const reason = invalidPolicyTarget(rule.target);
    if (reason) invalidTargets.push(`${rule.type}：${reason}`);
  }
  const finalTargetReason = invalidPolicyTarget(params.config.finalTarget);
  if (finalTargetReason) {
    issues.push({
      tone: "error",
      title: "FINAL 兜底目标无效",
      detail: finalTargetReason,
    });
  }
  if (invalidTargets.length > 0) {
    issues.push({
      tone: "error",
      title: `${invalidTargets.length} 条规则的目标策略无效`,
      detail: invalidTargets.slice(0, 5).join("、"),
    });
  }

  const emptySmartGroups = params.config.proxyGroups.filter((group) => {
    if (group.enabled === false || group.type !== "smart") return false;
    const hasExplicitNodes = group.policies.some(
      (policy) =>
        policy.kind === "node" && availableNodeNames.has(policy.name),
    );
    return !hasExplicitNodes && !group.includeAllNodes;
  });
  if (emptySmartGroups.length > 0) {
    issues.push({
      tone: "warning",
      title: `${emptySmartGroups.length} 个 Smart 组没有可用节点`,
      detail: emptySmartGroups
        .slice(0, 5)
        .map((group) => group.name)
        .join("、"),
    });
  }

  const emptyRegionGroups = params.config.regionGroups.filter(
    (group) =>
      group.enabled !== false &&
      group.type === "smart" &&
      group.keywords.length === 0,
  );
  if (emptyRegionGroups.length > 0) {
    issues.push({
      tone: "warning",
      title: `${emptyRegionGroups.length} 个地区 Smart 组没有匹配关键词`,
      detail: emptyRegionGroups
        .slice(0, 5)
        .map((group) => group.name)
        .join("、"),
    });
  }

  const duplicateGroupIds = duplicateValues(allGroups.map((group) => group.id));
  if (duplicateGroupIds.length > 0) {
    issues.push({
      tone: "error",
      title: "策略组 ID 重复",
      detail: duplicateGroupIds.slice(0, 5).join("、"),
    });
  }

  const duplicateGroupNames = duplicateValues(
    allGroups.map((group) => group.name),
  );
  if (duplicateGroupNames.length > 0) {
    issues.push({
      tone: "warning",
      title: "策略组名称重复",
      detail: duplicateGroupNames.slice(0, 5).join("、"),
    });
  }

  const emptyRuleSets = params.config.ruleSets.filter(
    (ruleSet) => ruleSet.enabled !== false && !ruleSet.url.trim(),
  );
  if (emptyRuleSets.length > 0) {
    issues.push({
      tone: "warning",
      title: `${emptyRuleSets.length} 个启用的远程规则集没有 URL`,
      detail: emptyRuleSets
        .slice(0, 4)
        .map((ruleSet) => ruleSet.name || ruleSet.id)
        .join("、"),
    });
  }

  const invalidRuleSetUrls = params.config.ruleSets.filter(
    (ruleSet) =>
      ruleSet.enabled !== false &&
      Boolean(ruleSet.url.trim()) &&
      !isHttpUrl(ruleSet.url),
  );
  if (invalidRuleSetUrls.length > 0) {
    issues.push({
      tone: "warning",
      title: `${invalidRuleSetUrls.length} 个远程规则集 URL 格式可能无效`,
      detail: invalidRuleSetUrls
        .slice(0, 4)
        .map((ruleSet) => ruleSet.name || ruleSet.id)
        .join("、"),
    });
  }

  const emptyRules = params.config.rules.filter(
    (rule) =>
      rule.enabled !== false &&
      rule.type !== "FINAL" &&
      !(rule.value || "").trim(),
  );
  if (emptyRules.length > 0) {
    issues.push({
      tone: "warning",
      title: `${emptyRules.length} 条启用的本地规则没有匹配内容`,
      detail: emptyRules
        .slice(0, 4)
        .map((rule) => rule.type)
        .join("、"),
    });
  }

  if (params.config.managedConfigEnabled === true) {
    const managedConfigUrl = (params.config.managedConfigUrl || "").trim();
    const managedConfigInterval = params.config.managedConfigInterval ?? 0;
    if (!managedConfigUrl) {
      issues.push({
        tone: "warning",
        title: "MANAGED-CONFIG 已开启但 URL 为空",
        detail: "生成结果不会写入托管配置头，请填写 Surge 配置地址。",
      });
    } else if (!isHttpUrl(managedConfigUrl)) {
      issues.push({
        tone: "warning",
        title: "MANAGED-CONFIG URL 格式可能无效",
        detail: "托管地址应使用 http:// 或 https://。",
      });
    }
    if (
      !Number.isInteger(managedConfigInterval) ||
      managedConfigInterval < 1
    ) {
      issues.push({
        tone: "warning",
        title: "MANAGED-CONFIG 更新间隔无效",
        detail: "更新间隔必须是大于 0 的整数秒。",
      });
    }
  }

  const groupIds = activeGroupIds;
  const nodeNameSet = availableNodeNames;
  const invalidMembers = params.config.proxyGroups.flatMap((group) =>
    group.policies
      .map((policy) => {
        if (policy.kind === "group" && !groupIds.has(policy.id))
          return `${group.name} -> ${policy.id}`;
        if (policy.kind === "node" && !nodeNameSet.has(policy.name))
          return `${group.name} -> ${policy.name}`;
        if (group.type === "smart" && policy.kind !== "node")
          return `${group.name} -> ${describePolicyRef(policy, params.groupNameById)}`;
        return "";
      })
      .filter(Boolean),
  );
  if (invalidMembers.length > 0) {
    issues.push({
      tone: "warning",
      title: "策略组成员需要检查",
      detail: invalidMembers.slice(0, 5).join("、"),
    });
  }

  return issues;
}

function SurgeMetric({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
      <div className="text-[10px] text-white/40">{label}</div>
      <div className="mt-1 text-lg font-semibold leading-none text-white/85">
        {value}
      </div>
      <div className="mt-1 truncate text-[10px] text-white/35" title={hint}>
        {hint}
      </div>
    </div>
  );
}

function SurgeVisualIssueList({ issues }: { issues: SurgeVisualIssue[] }) {
  if (issues.length === 0) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100/80">
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
        <span>当前 Surge 可视化配置没有发现明显问题。</span>
      </div>
    );
  }

  const visibleIssues = issues.slice(0, 4);
  const remainingCount = issues.length - visibleIssues.length;

  return (
    <div className="space-y-1.5">
      {visibleIssues.map((issue) => (
        <div
          key={`${issue.tone}:${issue.title}:${issue.detail ?? ""}`}
          className={cn(
            "flex items-start gap-2 rounded-lg border px-3 py-2 text-xs",
            issue.tone === "error"
              ? "border-rose-500/30 bg-rose-500/10 text-rose-100/85"
              : "border-amber-500/25 bg-amber-500/10 text-amber-100/80",
          )}
        >
          <AlertTriangle
            className={cn(
              "mt-0.5 h-3.5 w-3.5 shrink-0",
              issue.tone === "error" ? "text-rose-300" : "text-amber-300",
            )}
          />
          <span className="min-w-0">
            <span className="font-medium">{issue.title}</span>
            {issue.detail && (
              <span className="ml-1 text-white/50">{issue.detail}</span>
            )}
          </span>
        </div>
      ))}
      {remainingCount > 0 && (
        <div className="px-3 text-[11px] text-white/40">
          还有 {remainingCount} 项提醒，请继续检查当前编辑区域。
        </div>
      )}
    </div>
  );
}

export function SurgeMode() {
  const [expandedSections, setExpandedSections] = React.useState<
    Set<SectionKey>
  >(
    new Set<SectionKey>([
      "input",
      "nodes",
      "general",
      "regions",
      "groups",
      "rules",
    ]),
  );
  const { nodes, surgeConfig, setSurgeConfig } = useConfigStore();
  const [memberDrafts, setMemberDrafts] = React.useState<
    Record<string, string>
  >({});
  const [memberOrderDrafts, setMemberOrderDrafts] = React.useState<
    Record<string, string>
  >({});
  const [regionOrderDrafts, setRegionOrderDrafts] = React.useState<
    Record<string, string>
  >({});
  const [groupOrderDrafts, setGroupOrderDrafts] = React.useState<
    Record<string, string>
  >({});
  const [ruleOrderDrafts, setRuleOrderDrafts] = React.useState<
    Record<string, string>
  >({});
  const [draggingRuleKey, setDraggingRuleKey] = React.useState<string | null>(
    null,
  );
  const [ruleFilter, setRuleFilter] = React.useState("");

  const nodeNames = React.useMemo(
    () =>
      nodes
        .map((node) => node.name)
        .filter(
          (name): name is string =>
            typeof name === "string" && Boolean(name.trim()),
        ),
    [nodes],
  );
  const groupNameById = React.useMemo(
    () => buildGroupNameById(surgeConfig),
    [surgeConfig],
  );
  const targetOptions = React.useMemo(
    () => buildPolicyOptions({ config: surgeConfig, nodeNames }),
    [nodeNames, surgeConfig],
  );
  const ruleOrderItems = React.useMemo(
    () => buildSurgeRuleOrderItems(surgeConfig),
    [surgeConfig],
  );
  const rulePositionByKey = React.useMemo(
    () => new Map(ruleOrderItems.map((item, index) => [item.key, index + 1])),
    [ruleOrderItems],
  );
  const generatedSurgePreview = React.useMemo(() => {
    try {
      return {
        error: null,
        result: generateSurgeProfile({ nodes, config: surgeConfig }),
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Surge 配置生成失败",
        result: null,
      };
    }
  }, [nodes, surgeConfig]);
  const visualIssues = React.useMemo(
    () =>
      buildVisualIssues({
        config: surgeConfig,
        groupNameById,
        nodeNames,
        skippedNodeNames:
          generatedSurgePreview.result?.skippedNodes.map((node) => node.name) ??
          [],
        generatedError: generatedSurgePreview.error,
        skippedNodes: generatedSurgePreview.result?.skippedNodes.length ?? 0,
      }),
    [generatedSurgePreview, groupNameById, nodeNames, surgeConfig],
  );
  const normalizedRuleFilter = ruleFilter.trim().toLowerCase();
  const visibleRuleSets = React.useMemo(
    () =>
      surgeConfig.ruleSets.filter((ruleSet) =>
        matchesRuleSetFilter(ruleSet, normalizedRuleFilter, groupNameById),
      ),
    [groupNameById, normalizedRuleFilter, surgeConfig.ruleSets],
  );
  const visibleRules = React.useMemo(
    () =>
      surgeConfig.rules.filter((rule) =>
        matchesRuleFilter(rule, normalizedRuleFilter, groupNameById),
      ),
    [groupNameById, normalizedRuleFilter, surgeConfig.rules],
  );

  const toggleSection = (section: SectionKey) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const clearRegionOrderDraft = (id: string) => {
    setRegionOrderDrafts((prev) => {
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const moveRegionToPosition = (id: string, position: number) => {
    const index = surgeConfig.regionGroups.findIndex((group) => group.id === id);
    if (index < 0 || !Number.isFinite(position)) return;
    setSurgeConfig({
      ...surgeConfig,
      regionGroups: moveArrayItemToIndex(
        surgeConfig.regionGroups,
        index,
        position - 1,
      ),
    });
  };

  const commitRegionOrderDraft = (id: string) => {
    const value = Number.parseInt(regionOrderDrafts[id] ?? "", 10);
    if (Number.isFinite(value)) moveRegionToPosition(id, value);
    clearRegionOrderDraft(id);
  };

  const clearGroupOrderDraft = (id: string) => {
    setGroupOrderDrafts((prev) => {
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const moveGroupToPosition = (id: string, position: number) => {
    const index = surgeConfig.proxyGroups.findIndex((group) => group.id === id);
    if (index < 0 || !Number.isFinite(position)) return;
    setSurgeConfig({
      ...surgeConfig,
      proxyGroups: moveArrayItemToIndex(
        surgeConfig.proxyGroups,
        index,
        position - 1,
      ),
    });
  };

  const commitGroupOrderDraft = (id: string) => {
    const value = Number.parseInt(groupOrderDrafts[id] ?? "", 10);
    if (Number.isFinite(value)) moveGroupToPosition(id, value);
    clearGroupOrderDraft(id);
  };

  const memberOrderDraftKey = (groupId: string, index: number) =>
    `${groupId}:${index}`;

  const clearMemberOrderDraftsForGroup = (groupId: string) => {
    setMemberOrderDrafts((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        if (key.startsWith(`${groupId}:`)) delete next[key];
      }
      return next;
    });
  };

  const moveMemberToPosition = (
    group: SurgeProxyGroup,
    index: number,
    position: number,
  ) => {
    if (!Number.isFinite(position)) return;
    setSurgeConfig({
      ...surgeConfig,
      proxyGroups: updateArrayItem(surgeConfig.proxyGroups, group.id, {
        policies: moveArrayItemToIndex(group.policies, index, position - 1),
      }),
    });
    clearMemberOrderDraftsForGroup(group.id);
  };

  const commitMemberOrderDraft = (group: SurgeProxyGroup, index: number) => {
    const key = memberOrderDraftKey(group.id, index);
    const value = Number.parseInt(memberOrderDrafts[key] ?? "", 10);
    if (Number.isFinite(value)) moveMemberToPosition(group, index, value);
    else clearMemberOrderDraftsForGroup(group.id);
  };

  const updateRegion = (id: string, patch: Partial<SurgeRegionPolicyGroup>) => {
    setSurgeConfig({
      ...surgeConfig,
      regionGroups: updateArrayItem(surgeConfig.regionGroups, id, patch),
    });
  };

  const moveRegion = (id: string, direction: -1 | 1) => {
    setSurgeConfig({
      ...surgeConfig,
      regionGroups: moveArrayItemById(surgeConfig.regionGroups, id, direction),
    });
    clearRegionOrderDraft(id);
  };

  const removeRegion = (id: string) => {
    const deletedGroupRef = `group:${id}`;
    const isDeletedRegionTarget = (target: SurgePolicyRef | string) =>
      encodePolicyRef(target) === deletedGroupRef;
    setSurgeConfig({
      ...surgeConfig,
      regionGroups: removeArrayItem(surgeConfig.regionGroups, id),
      proxyGroups: surgeConfig.proxyGroups.map((group) => ({
        ...group,
        policies: group.policies.filter(
          (policy) => encodePolicyRef(policy) !== deletedGroupRef,
        ),
      })),
      ruleSets: surgeConfig.ruleSets.map((ruleSet) =>
        isDeletedRegionTarget(ruleSet.target)
          ? { ...ruleSet, target: { kind: "direct" } }
          : ruleSet,
      ),
      rules: surgeConfig.rules.map((rule) =>
        isDeletedRegionTarget(rule.target)
          ? { ...rule, target: { kind: "direct" } }
          : rule,
      ),
      finalTarget: isDeletedRegionTarget(surgeConfig.finalTarget)
        ? { kind: "direct" }
        : surgeConfig.finalTarget,
    });
  };

  const addRegion = () => {
    setSurgeConfig({
      ...surgeConfig,
      regionGroups: [
        ...surgeConfig.regionGroups,
        {
          id: makeId("surge-region"),
          name: "新地区 Smart",
          enabled: true,
          type: "smart",
          keywords: [],
          includeInProxy: true,
          policyPriority: "",
        },
      ],
    });
  };

  const updateGroup = (id: string, patch: Partial<SurgeProxyGroup>) => {
    const current = surgeConfig.proxyGroups.find((group) => group.id === id);
    const nextPatch =
      patch.type === "smart" && current
        ? {
            ...patch,
            policies: current.policies.filter(
              (policy) => policy.kind === "node",
            ),
          }
        : patch;
    setSurgeConfig({
      ...surgeConfig,
      proxyGroups: updateArrayItem(surgeConfig.proxyGroups, id, nextPatch),
    });
  };

  const moveGroup = (id: string, direction: -1 | 1) => {
    setSurgeConfig({
      ...surgeConfig,
      proxyGroups: moveArrayItemById(surgeConfig.proxyGroups, id, direction),
    });
    clearGroupOrderDraft(id);
  };

  const addGroup = () => {
    const id = makeId("surge-group");
    setSurgeConfig({
      ...surgeConfig,
      proxyGroups: [
        ...surgeConfig.proxyGroups,
        {
          id,
          name: "新策略组",
          type: "select",
          policies: [{ kind: "direct" }],
          enabled: true,
        },
      ],
    });
  };

  const removeGroup = (id: string) => {
    setSurgeConfig({
      ...surgeConfig,
      proxyGroups: removeArrayItem(surgeConfig.proxyGroups, id),
      ruleSets: surgeConfig.ruleSets.map((ruleSet) =>
        encodePolicyRef(ruleSet.target) === `group:${id}`
          ? { ...ruleSet, target: { kind: "direct" } }
          : ruleSet,
      ),
      rules: surgeConfig.rules.map((rule) =>
        encodePolicyRef(rule.target) === `group:${id}`
          ? { ...rule, target: { kind: "direct" } }
          : rule,
      ),
    });
  };

  const addMember = (group: SurgeProxyGroup) => {
    const value = memberDrafts[group.id] || "";
    const decoded = decodePolicyRef(value);
    if (!decoded || typeof decoded === "string") return;
    if (group.type === "smart" && decoded.kind !== "node") return;
    const key = encodePolicyRef(decoded);
    const exists = group.policies.some(
      (policy) => encodePolicyRef(policy) === key,
    );
    if (exists) return;
    updateGroup(group.id, { policies: [...group.policies, decoded] });
  };

  const removeMember = (group: SurgeProxyGroup, index: number) => {
    updateGroup(group.id, {
      policies: group.policies.filter((_, i) => i !== index),
    });
    clearMemberOrderDraftsForGroup(group.id);
  };

  const moveMember = (
    group: SurgeProxyGroup,
    index: number,
    direction: -1 | 1,
  ) => {
    updateGroup(group.id, {
      policies: moveArrayItem(group.policies, index, direction),
    });
    clearMemberOrderDraftsForGroup(group.id);
  };

  const addAllNodesToGroup = (group: SurgeProxyGroup) => {
    const existing = new Set(group.policies.map(encodePolicyRef));
    const additions = nodeNames
      .map((name): SurgePolicyRef => ({ kind: "node", name }))
      .filter((policy) => !existing.has(encodePolicyRef(policy)));
    if (additions.length === 0) return;
    updateGroup(group.id, { policies: [...group.policies, ...additions] });
  };

  const clearGroupMembers = (group: SurgeProxyGroup) => {
    updateGroup(group.id, { policies: [] });
    clearMemberOrderDraftsForGroup(group.id);
  };

  const addRuleSet = () => {
    const id = makeId("surge-ruleset");
    const nextRuleSet: SurgeRuleSet = {
      id,
      name: "新远程规则集",
      url: "",
      target: { kind: "group", id: "proxy" },
      resourceType: "rule-set",
      enabled: true,
    };
    const nextConfig = {
      ...surgeConfig,
      ruleSets: [nextRuleSet, ...surgeConfig.ruleSets],
    };
    setSurgeConfig({
      ...nextConfig,
      ruleOrder: [ruleSetOrderKey(id), ...normalizeSurgeRuleOrder(surgeConfig)],
    });
  };

  const updateRuleSet = (id: string, patch: Partial<SurgeRuleSet>) => {
    setSurgeConfig({
      ...surgeConfig,
      ruleSets: updateArrayItem(surgeConfig.ruleSets, id, patch),
    });
  };

  const removeRuleSet = (id: string) => {
    const nextOrder = (surgeConfig.ruleOrder ?? []).filter(
      (key) => key !== ruleSetOrderKey(id),
    );
    const nextConfig = {
      ...surgeConfig,
      ruleSets: removeArrayItem(surgeConfig.ruleSets, id),
    };
    setSurgeConfig({
      ...nextConfig,
      ruleOrder: normalizeSurgeRuleOrder(nextConfig, nextOrder),
    });
  };

  const addRule = () => {
    const id = makeId("surge-rule");
    const nextRule: SurgeRule = {
      id,
      type: "DOMAIN-SUFFIX",
      value: "",
      target: { kind: "group", id: "proxy" },
      enabled: true,
    };
    const nextConfig = {
      ...surgeConfig,
      rules: [nextRule, ...surgeConfig.rules],
    };
    setSurgeConfig({
      ...nextConfig,
      ruleOrder: [ruleOrderKey(id), ...normalizeSurgeRuleOrder(surgeConfig)],
    });
  };

  const updateRule = (id: string, patch: Partial<SurgeRule>) => {
    const nextConfig = {
      ...surgeConfig,
      rules: updateArrayItem(
        surgeConfig.rules,
        id,
        patch.type === "FINAL"
          ? { ...patch, value: "", noResolve: false }
          : patch,
      ),
    };
    setSurgeConfig({
      ...nextConfig,
      ruleOrder: normalizeSurgeRuleOrder(nextConfig),
    });
  };

  const removeRule = (id: string) => {
    const nextOrder = (surgeConfig.ruleOrder ?? []).filter(
      (key) => key !== ruleOrderKey(id),
    );
    const nextConfig = {
      ...surgeConfig,
      rules: removeArrayItem(surgeConfig.rules, id),
    };
    setSurgeConfig({
      ...nextConfig,
      ruleOrder: normalizeSurgeRuleOrder(nextConfig, nextOrder),
    });
  };

  const setRuleOrderFromItems = (items: SurgeRuleOrderItem[]) => {
    setSurgeConfig({
      ...surgeConfig,
      ruleOrder: items.map((item) => item.key),
    });
    setRuleOrderDrafts((prev) => {
      const validKeys = new Set(items.map((item) => item.key));
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        if (!validKeys.has(key)) delete next[key];
      }
      return next;
    });
  };

  const moveRuleOrderItem = (key: string, direction: -1 | 1) => {
    const index = ruleOrderItems.findIndex((item) => item.key === key);
    setRuleOrderFromItems(moveArrayItem(ruleOrderItems, index, direction));
  };

  const moveRuleOrderItemToPosition = (key: string, position: number) => {
    const index = ruleOrderItems.findIndex((item) => item.key === key);
    if (index < 0 || !Number.isFinite(position)) return;
    setRuleOrderFromItems(
      moveArrayItemToIndex(ruleOrderItems, index, position - 1),
    );
  };

  const clearRuleOrderDraft = (key: string) => {
    setRuleOrderDrafts((prev) => {
      const { [key]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const commitRuleOrderDraft = (key: string) => {
    const value = Number.parseInt(ruleOrderDrafts[key] ?? "", 10);
    if (Number.isFinite(value)) moveRuleOrderItemToPosition(key, value);
    clearRuleOrderDraft(key);
  };

  const moveRuleOrderItemTo = (sourceKey: string, targetKey: string) => {
    if (!sourceKey || sourceKey === targetKey) return;
    const sourceIndex = ruleOrderItems.findIndex(
      (item) => item.key === sourceKey,
    );
    const targetIndex = ruleOrderItems.findIndex(
      (item) => item.key === targetKey,
    );
    if (sourceIndex < 0 || targetIndex < 0) return;

    const next = [...ruleOrderItems];
    const [source] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, source);
    setRuleOrderFromItems(next);
  };

  const resetRuleOrderToYouko = () => {
    setSurgeConfig({
      ...surgeConfig,
      ruleOrder: normalizeSurgeRuleOrder(
        surgeConfig,
        createYoukoSurgeConfig().ruleOrder ?? [],
      ),
    });
  };

  return (
    <div className="flex flex-col gap-2 pb-2">
      <InputSection
        isExpanded={expandedSections.has("input")}
        onToggle={() => toggleSection("input")}
      />
      <NodeManagementSection
        isExpanded={expandedSections.has("nodes")}
        onToggle={() => toggleSection("nodes")}
      />

      <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-medium text-white/75">
              Surge 可视化总览
            </div>
            <div className="mt-1 text-xs text-white/40">
              这里按当前编辑内容预估最终 .conf 输出。
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "w-fit border-white/10 bg-white/5 text-white/60",
              visualIssues.some((issue) => issue.tone === "error") &&
                "border-rose-500/30 bg-rose-500/10 text-rose-100",
              visualIssues.length > 0 &&
                !visualIssues.some((issue) => issue.tone === "error") &&
                "border-amber-500/30 bg-amber-500/10 text-amber-100",
            )}
          >
            {visualIssues.length === 0 ? "状态正常" : `${visualIssues.length} 项提醒`}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <SurgeMetric
            label="Surge 节点"
            value={generatedSurgePreview.result?.proxyCount ?? 0}
            hint={`来源节点 ${nodeNames.length} 个`}
          />
          <SurgeMetric
            label="策略组"
            value={generatedSurgePreview.result?.policyGroupCount ?? 0}
            hint={`手动 ${surgeConfig.proxyGroups.length} / 地区 ${surgeConfig.regionGroups.length}`}
          />
          <SurgeMetric
            label="分流规则"
            value={generatedSurgePreview.result?.ruleCount ?? 0}
            hint={`远程 ${surgeConfig.ruleSets.length} / 本地 ${surgeConfig.rules.length}`}
          />
          <SurgeMetric
            label="跳过节点"
            value={generatedSurgePreview.result?.skippedNodes.length ?? 0}
            hint="不支持或字段不完整"
          />
        </div>
        <SurgeVisualIssueList issues={visualIssues} />
      </div>

      <div>
        <SectionHeader
          icon={Settings2}
          title="Surge 基础"
          isExpanded={expandedSections.has("general")}
          onToggle={() => toggleSection("general")}
          badge={
            <Badge
              variant="outline"
              className="ml-auto border-cyan-500/40 bg-cyan-500/10 text-cyan-200"
            >
              独立配置
            </Badge>
          }
        />
        {expandedSections.has("general") && (
          <div className="mt-2 space-y-3 pl-6">
            <div className="flex flex-col gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-xs font-medium text-cyan-100">
                  Youko分流模板
                </div>
                <div className="mt-1 text-xs leading-5 text-white/45">
                  写入 Youko 的策略组、图标、规则顺序和 Surge 原生远程规则集。
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 shrink-0 gap-1.5 border-cyan-500/30 text-cyan-100 hover:bg-cyan-500/10"
                onClick={() => setSurgeConfig(createYoukoSurgeConfig())}
              >
                <WandSparkles className="h-3.5 w-3.5" />
                应用模板
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1 text-xs text-white/55">
                <span>测速 URL</span>
                <Input
                  value={surgeConfig.testUrl}
                  onChange={(event) =>
                    setSurgeConfig({
                      ...surgeConfig,
                      testUrl: event.target.value,
                    })
                  }
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1 text-xs text-white/55">
                <span>测速间隔（秒）</span>
                <Input
                  type="number"
                  min={1}
                  value={surgeConfig.testInterval}
                  onChange={(event) =>
                    setSurgeConfig({
                      ...surgeConfig,
                      testInterval:
                        Number(event.target.value) || surgeConfig.testInterval,
                    })
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="space-y-1 text-xs text-white/55">
              <span>[General]</span>
              <Textarea
                value={surgeConfig.generalText}
                onChange={(event) =>
                  setSurgeConfig({
                    ...surgeConfig,
                    generalText: event.target.value,
                  })
                }
                className="min-h-[96px] font-mono text-xs"
              />
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between gap-3 text-xs text-white/70">
                <span>启用 MANAGED-CONFIG 头</span>
                <Switch
                  checked={surgeConfig.managedConfigEnabled === true}
                  onCheckedChange={(checked) =>
                    setSurgeConfig({
                      ...surgeConfig,
                      managedConfigEnabled: checked,
                    })
                  }
                  aria-label="启用 MANAGED-CONFIG 头"
                />
              </div>
              {surgeConfig.managedConfigEnabled && (
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_11rem]">
                  <div className="space-y-1">
                    <span className="text-xs text-white/45">托管 URL</span>
                    <Input
                      value={surgeConfig.managedConfigUrl || ""}
                      onChange={(event) =>
                        setSurgeConfig({
                          ...surgeConfig,
                          managedConfigUrl: event.target.value,
                        })
                      }
                      placeholder="https://example.com/api/subscriptions/token/surge.conf"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-white/45">
                      更新间隔（秒）
                    </span>
                    <Input
                      type="number"
                      min={1}
                      value={surgeConfig.managedConfigInterval ?? 86400}
                      onChange={(event) =>
                        setSurgeConfig({
                          ...surgeConfig,
                          managedConfigInterval:
                            Number(event.target.value) ||
                            surgeConfig.managedConfigInterval ||
                            86400,
                        })
                      }
                      aria-label="MANAGED-CONFIG 更新间隔（秒）"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div>
        <SectionHeader
          icon={Globe2}
          title="地区策略组"
          isExpanded={expandedSections.has("regions")}
          onToggle={() => toggleSection("regions")}
          badge={
            <Badge
              variant="outline"
              className="ml-auto border-green-500/40 bg-green-500/10 text-green-200"
            >
              {
                surgeConfig.regionGroups.filter((g) => g.enabled !== false)
                  .length
              }{" "}
              启用
            </Badge>
          }
        />
        {expandedSections.has("regions") && (
          <div className="mt-2 space-y-2 pl-6">
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5"
                onClick={addRegion}
              >
                <Plus className="h-3.5 w-3.5" />
                新增地区策略组
              </Button>
            </div>
            {surgeConfig.regionGroups.map((group, index) => (
              <div
                key={group.id}
                className="rounded-lg border border-white/10 bg-white/5 p-3"
              >
                <div className="grid grid-cols-1 gap-2 2xl:grid-cols-[auto_auto_minmax(9rem,1fr)_9rem_8rem_auto_auto] 2xl:items-center">
                  <div className="flex items-center gap-2 text-xs text-white/70">
                    <Switch
                      checked={group.enabled !== false}
                      onCheckedChange={(checked) =>
                        updateRegion(group.id, { enabled: checked })
                      }
                      aria-label={`启用地区策略组 ${group.name}`}
                    />
                    启用
                  </div>
                  <Input
                    value={
                      Object.prototype.hasOwnProperty.call(
                        regionOrderDrafts,
                        group.id,
                      )
                        ? regionOrderDrafts[group.id]
                        : String(index + 1)
                    }
                    onChange={(event) =>
                      setRegionOrderDrafts((prev) => ({
                        ...prev,
                        [group.id]: event.target.value,
                      }))
                    }
                    onBlur={() => commitRegionOrderDraft(group.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        clearRegionOrderDraft(group.id);
                        return;
                      }
                      if (event.key === "Enter") {
                        commitRegionOrderDraft(group.id);
                      }
                    }}
                    inputMode="numeric"
                    title="地区策略组顺序（1=最前）"
                    aria-label={`地区策略组顺序 ${group.name}`}
                    className="h-8 w-14 shrink-0 rounded-md border-white/10 bg-white/10 px-1 text-center text-[11px] tabular-nums"
                  />
                  <Input
                    value={group.name}
                    onChange={(event) =>
                      updateRegion(group.id, { name: event.target.value })
                    }
                    className="h-8 text-xs"
                  />
                  <GroupTypeSelect
                    value={group.type}
                    onChange={(type) => updateRegion(group.id, { type })}
                  />
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/65">
                    加入 PROXY
                    <Switch
                      checked={group.includeInProxy !== false}
                      onCheckedChange={(checked) =>
                        updateRegion(group.id, { includeInProxy: checked })
                      }
                      aria-label={`加入 PROXY：${group.name}`}
                    />
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    <IconButton
                      label={`上移地区策略组 ${group.name}`}
                      variant="ghost"
                      onClick={() => moveRegion(group.id, -1)}
                      disabled={index <= 0}
                      className="h-7 w-7 rounded-md text-white/35 hover:text-indigo-200 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                    </IconButton>
                    <IconButton
                      label={`下移地区策略组 ${group.name}`}
                      variant="ghost"
                      onClick={() => moveRegion(group.id, 1)}
                      disabled={index >= surgeConfig.regionGroups.length - 1}
                      className="h-7 w-7 rounded-md text-white/35 hover:text-indigo-200 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                    </IconButton>
                  </div>
                  <IconButton
                    label={`删除地区策略组 ${group.name}`}
                    variant="ghost"
                    onClick={() => removeRegion(group.id)}
                    className="h-8 w-8 rounded-lg text-white/45 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                </div>
                <div
                  className={cn(
                    "mt-2 grid grid-cols-1 gap-2",
                    group.type === "smart" && "lg:grid-cols-2",
                  )}
                >
                  <Input
                    value={group.keywords.join(", ")}
                    onChange={(event) =>
                      updateRegion(group.id, {
                        keywords: splitKeywords(event.target.value),
                      })
                    }
                    placeholder="香港, HK, Hong Kong"
                    className="h-8 text-xs"
                  />
                  {group.type === "smart" && (
                    <Input
                      value={group.policyPriority || ""}
                      onChange={(event) =>
                        updateRegion(group.id, {
                          policyPriority: event.target.value,
                        })
                      }
                      placeholder="policy-priority，例如 香港:0.9;HK:0.8"
                      className="h-8 text-xs"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <SectionHeader
          icon={Server}
          title="手动策略组"
          isExpanded={expandedSections.has("groups")}
          onToggle={() => toggleSection("groups")}
          badge={
            <Badge
              variant="outline"
              className="ml-auto border-indigo-500/40 bg-indigo-500/10 text-indigo-200"
            >
              {surgeConfig.proxyGroups.length} 个
            </Badge>
          }
        />
        {expandedSections.has("groups") && (
          <div className="mt-2 space-y-2 pl-6">
            {surgeConfig.proxyGroups.map((group, index) => {
              const options = buildPolicyOptions({
                config: surgeConfig,
                nodeNames,
                excludeGroupId: group.id,
                nodesOnly: group.type === "smart",
              });
              const selectedDraft =
                memberDrafts[group.id] || options[0]?.value || "";
              const existingMemberKeys = new Set(
                group.policies.map(encodePolicyRef),
              );
              const canAddAllNodes = nodeNames.some(
                (name) => !existingMemberKeys.has(`node:${name}`),
              );
              return (
                <div
                  key={group.id}
                  className="rounded-lg border border-white/10 bg-white/5 p-3"
                >
                  <div className="grid grid-cols-1 gap-2 2xl:grid-cols-[auto_auto_minmax(9rem,1fr)_9rem_auto_auto] 2xl:items-center">
                    <div className="flex items-center gap-2 text-xs text-white/70">
                      <Switch
                        checked={group.enabled !== false}
                        onCheckedChange={(checked) =>
                          updateGroup(group.id, { enabled: checked })
                        }
                        aria-label={`启用策略组 ${group.name}`}
                      />
                      启用
                    </div>
                    <Input
                      value={
                        Object.prototype.hasOwnProperty.call(
                          groupOrderDrafts,
                          group.id,
                        )
                          ? groupOrderDrafts[group.id]
                          : String(index + 1)
                      }
                      onChange={(event) =>
                        setGroupOrderDrafts((prev) => ({
                          ...prev,
                          [group.id]: event.target.value,
                        }))
                      }
                      onBlur={() => commitGroupOrderDraft(group.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") {
                          clearGroupOrderDraft(group.id);
                          return;
                        }
                        if (event.key === "Enter") {
                          commitGroupOrderDraft(group.id);
                        }
                      }}
                      inputMode="numeric"
                      title="策略组顺序（1=最前）"
                      aria-label={`策略组顺序 ${group.name}`}
                      className="h-8 w-14 shrink-0 rounded-md border-white/10 bg-white/10 px-1 text-center text-[11px] tabular-nums"
                    />
                    <Input
                      value={group.name}
                      onChange={(event) =>
                        updateGroup(group.id, { name: event.target.value })
                      }
                      className="h-8 text-xs"
                    />
                    <GroupTypeSelect
                      value={group.type}
                      onChange={(type) => updateGroup(group.id, { type })}
                    />
                    <div className="flex items-center justify-end gap-1">
                      <IconButton
                        label={`上移策略组 ${group.name}`}
                        variant="ghost"
                        onClick={() => moveGroup(group.id, -1)}
                        disabled={index <= 0}
                        className="h-7 w-7 rounded-md text-white/35 hover:text-indigo-200 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                      </IconButton>
                      <IconButton
                        label={`下移策略组 ${group.name}`}
                        variant="ghost"
                        onClick={() => moveGroup(group.id, 1)}
                        disabled={index >= surgeConfig.proxyGroups.length - 1}
                        className="h-7 w-7 rounded-md text-white/35 hover:text-indigo-200 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ChevronDown
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                      </IconButton>
                    </div>
                    <IconButton
                      label="删除策略组"
                      variant="ghost"
                      onClick={() => removeGroup(group.id)}
                      className="h-8 w-8 rounded-lg text-white/45 hover:text-red-300"
                      disabled={group.id === "proxy"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                  {(group.type === "url-test" ||
                    group.type === "fallback" ||
                    group.type === "load-balance") && (
                    <div className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-3">
                      <Input
                        value={group.url || surgeConfig.testUrl}
                        onChange={(event) =>
                          updateGroup(group.id, { url: event.target.value })
                        }
                        placeholder="测速 URL"
                        className="h-8 text-xs"
                      />
                      <Input
                        type="number"
                        min={1}
                        value={group.interval || surgeConfig.testInterval}
                        onChange={(event) =>
                          updateGroup(group.id, {
                            interval:
                              Number(event.target.value) ||
                              surgeConfig.testInterval,
                          })
                        }
                        placeholder="间隔"
                        className="h-8 text-xs"
                      />
                      <Input
                        value={group.policyPriority || ""}
                        onChange={(event) =>
                          updateGroup(group.id, {
                            policyPriority: event.target.value,
                          })
                        }
                        placeholder="policy-priority"
                        className="h-8 text-xs"
                      />
                    </div>
                  )}
                  <ProxyGroupIconUrlEditor
                    value={group.icon || ""}
                    onChange={(icon) => updateGroup(group.id, { icon })}
                    displayName={group.name}
                    className="mt-2"
                  />
                  <div className="mt-2 grid grid-cols-1 gap-2 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-white/70">
                          包含所有节点
                        </div>
                        <div className="mt-0.5 truncate text-[10px] text-white/35">
                          订阅更新后新增节点也会自动进入此组
                        </div>
                      </div>
                      <Switch
                        checked={group.includeAllNodes === true}
                        onCheckedChange={(checked) =>
                          updateGroup(group.id, {
                            includeAllNodes: checked || undefined,
                          })
                        }
                        aria-label={`包含所有节点：${group.name}`}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5"
                        onClick={() => addAllNodesToGroup(group)}
                        disabled={!canAddAllNodes}
                      >
                        <ListPlus className="h-3.5 w-3.5" />
                        添加全部节点
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 border-white/10 text-white/55 hover:text-red-200"
                        onClick={() => clearGroupMembers(group)}
                        disabled={group.policies.length === 0}
                      >
                        <X className="h-3.5 w-3.5" />
                        清空成员
                      </Button>
                    </div>
                  </div>
                  {group.type === "smart" && (
                    <div className="mt-2 space-y-2">
                      <Input
                        value={group.policyPriority || ""}
                        onChange={(event) =>
                          updateGroup(group.id, {
                            policyPriority: event.target.value,
                          })
                        }
                        placeholder="policy-priority，例如 香港:0.9;备用:1.2"
                        className="h-8 text-xs"
                      />
                      <div className="text-xs leading-5 text-white/40">
                        Smart 使用 Surge
                        的实时连接质量和站点记忆进行选择，检测周期由 Surge
                        固定管理，测速 URL 和间隔不会生效。
                      </div>
                    </div>
                  )}
                  <div className="mt-2 space-y-1.5">
                    {group.policies.length === 0 ? (
                      <span className="text-xs text-white/40">暂无成员</span>
                    ) : (
                      group.policies.map((policy, index) => {
                        const label = policyRefLabel(policy, groupNameById);
                        const draftKey = memberOrderDraftKey(group.id, index);
                        return (
                          <div
                            key={`${encodePolicyRef(policy)}-${index}`}
                            className="flex min-w-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1"
                          >
                            <span
                              className="min-w-0 flex-1 truncate text-xs text-white/70"
                              title={label}
                            >
                              {label}
                            </span>
                            <Input
                              value={
                                Object.prototype.hasOwnProperty.call(
                                  memberOrderDrafts,
                                  draftKey,
                                )
                                  ? memberOrderDrafts[draftKey]
                                  : String(index + 1)
                              }
                              onChange={(event) =>
                                setMemberOrderDrafts((prev) => ({
                                  ...prev,
                                  [draftKey]: event.target.value,
                                }))
                              }
                              onBlur={() =>
                                commitMemberOrderDraft(group, index)
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Escape") {
                                  clearMemberOrderDraftsForGroup(group.id);
                                  return;
                                }
                                if (event.key === "Enter") {
                                  commitMemberOrderDraft(group, index);
                                }
                              }}
                              inputMode="numeric"
                              title="成员顺序（1=最前）"
                              aria-label={`成员顺序 ${label}`}
                              className="h-6 w-12 shrink-0 rounded-md border-white/10 bg-white/10 px-1 text-center text-[10px] tabular-nums"
                            />
                            <IconButton
                              label={`上移成员 ${label}`}
                              variant="ghost"
                              onClick={() => moveMember(group, index, -1)}
                              disabled={index <= 0}
                              className="h-6 w-6 shrink-0 rounded-md text-white/35 hover:text-indigo-200 disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              <ChevronUp
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            </IconButton>
                            <IconButton
                              label={`下移成员 ${label}`}
                              variant="ghost"
                              onClick={() => moveMember(group, index, 1)}
                              disabled={index >= group.policies.length - 1}
                              className="h-6 w-6 shrink-0 rounded-md text-white/35 hover:text-indigo-200 disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              <ChevronDown
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            </IconButton>
                            <IconButton
                              label={`删除成员 ${label}`}
                              variant="ghost"
                              onClick={() => removeMember(group, index)}
                              className="h-6 w-6 shrink-0 rounded-md text-white/35 hover:text-red-300"
                            >
                              <Trash2
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            </IconButton>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                    <Select
                      value={selectedDraft}
                      onValueChange={(value) =>
                        setMemberDrafts((prev) => ({
                          ...prev,
                          [group.id]: value,
                        }))
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue
                          placeholder={
                            group.type === "smart"
                              ? "选择真实节点"
                              : "选择 DIRECT / REJECT / 策略组 / 节点"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            disabled={option.disabled}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => addMember(group)}
                      disabled={!selectedDraft}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      添加
                    </Button>
                  </div>
                  {group.type === "smart" && (
                    <div className="mt-2 text-xs text-white/40">
                      Smart 组只加入真实节点，DIRECT / REJECT /
                      嵌套策略组不会写入。
                    </div>
                  )}
                </div>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={addGroup}
              className="h-8 gap-2"
            >
              <ListPlus className="h-3.5 w-3.5" />
              新增策略组
            </Button>
          </div>
        )}
      </div>

      <div>
        <SectionHeader
          icon={Route}
          title="Surge 分流规则"
          isExpanded={expandedSections.has("rules")}
          onToggle={() => toggleSection("rules")}
          badge={
            <Badge
              variant="outline"
              className="ml-auto border-amber-500/40 bg-amber-500/10 text-amber-200"
            >
              {surgeConfig.ruleSets.length + surgeConfig.rules.length} 条
            </Badge>
          }
        />
        {expandedSections.has("rules") && (
          <div className="mt-2 space-y-3 pl-6">
            <div className="grid grid-cols-1 gap-2 rounded-lg border border-white/10 bg-white/5 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
                <Input
                  value={ruleFilter}
                  onChange={(event) => setRuleFilter(event.target.value)}
                  placeholder="搜索规则名称、URL、类型、目标策略"
                  className="h-8 pl-8 text-xs"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                {normalizedRuleFilter && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 text-white/45 hover:text-white"
                    onClick={() => setRuleFilter("")}
                  >
                    <X className="h-3.5 w-3.5" />
                    清空
                  </Button>
                )}
                <Badge
                  variant="outline"
                  className="w-fit border-white/10 bg-white/5 text-white/55"
                >
                  显示 {visibleRuleSets.length + visibleRules.length} /{" "}
                  {surgeConfig.ruleSets.length + surgeConfig.rules.length}
                </Badge>
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs font-medium text-white/70">
                    规则顺序
                  </div>
                  <div className="mt-1 text-xs text-white/40">
                    远程规则集和本地规则按这里的顺序写入，FINAL 固定在底部。
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 shrink-0 gap-1.5"
                  onClick={resetRuleOrderToYouko}
                  disabled={ruleOrderItems.length === 0}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  恢复 Youko 默认顺序
                </Button>
              </div>
              {ruleOrderItems.length === 0 ? (
                <div className="mt-2">
                  <EmptyHint>还没有可排序规则。</EmptyHint>
                </div>
              ) : (
                <div
                  role="list"
                  className="mt-3 max-h-[420px] overflow-y-auto overflow-x-hidden rounded-lg border border-white/10 bg-black/10 custom-scrollbar"
                >
                  {ruleOrderItems.map((item, index) => {
                    const enabled = ruleOrderItemEnabled(item);
                    const targetLabel = policyRefLabel(
                      ruleOrderItemTarget(item),
                      groupNameById,
                    );
                    const title = ruleOrderItemTitle(item);
                    const detail = ruleOrderItemDetail(item);
                    return (
                      <div
                        key={item.key}
                        role="listitem"
                        draggable={ruleOrderItems.length > 1}
                        onDragStart={(event) => {
                          setDraggingRuleKey(item.key);
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", item.key);
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          const sourceKey =
                            draggingRuleKey ||
                            event.dataTransfer.getData("text/plain");
                          moveRuleOrderItemTo(sourceKey, item.key);
                          setDraggingRuleKey(null);
                        }}
                        onDragEnd={() => setDraggingRuleKey(null)}
                        className={cn(
                          "grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-white/10 px-3 py-2 last:border-b-0",
                          enabled ? "bg-white/5" : "bg-white/[0.02] opacity-55",
                          draggingRuleKey === item.key &&
                            "border-cyan-400/40 bg-cyan-500/10",
                        )}
                      >
                        <GripVertical
                          className="h-4 w-4 cursor-grab text-white/30 active:cursor-grabbing"
                          aria-hidden="true"
                        />
                        <Input
                          value={
                            Object.prototype.hasOwnProperty.call(
                              ruleOrderDrafts,
                              item.key,
                            )
                              ? ruleOrderDrafts[item.key]
                              : String(index + 1)
                          }
                          onChange={(event) =>
                            setRuleOrderDrafts((prev) => ({
                              ...prev,
                              [item.key]: event.target.value,
                            }))
                          }
                          onBlur={() => commitRuleOrderDraft(item.key)}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") {
                              clearRuleOrderDraft(item.key);
                              return;
                            }
                            if (event.key === "Enter") {
                              commitRuleOrderDraft(item.key);
                            }
                          }}
                          onDragStart={(event) => event.stopPropagation()}
                          inputMode="numeric"
                          title="规则顺序（1=最前）"
                          aria-label={`规则顺序 ${title}`}
                          className="h-7 w-14 shrink-0 rounded-md border-white/10 bg-white/10 px-1 text-center text-[11px] tabular-nums"
                        />
                        <div className="min-w-0">
                          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className={cn(
                                "shrink-0 text-[10px]",
                                item.kind === "rule-set"
                                  ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
                                  : "border-indigo-500/30 bg-indigo-500/10 text-indigo-200",
                              )}
                            >
                              {item.kind === "rule-set"
                                ? RULE_SET_RESOURCE_TYPE_LABELS[
                                    ruleSetResourceType(item.ruleSet)
                                  ]
                                : item.rule.type}
                            </Badge>
                            <span
                              className="min-w-0 max-w-full truncate text-xs font-medium text-white/75"
                              title={title}
                            >
                              {title}
                            </span>
                            <Badge
                              variant="outline"
                              className="max-w-full border-white/10 bg-white/5 text-white/60"
                            >
                              {targetLabel}
                            </Badge>
                            {ruleOrderItemNoResolve(item) && (
                              <Badge
                                variant="outline"
                                className="shrink-0 border-amber-500/30 bg-amber-500/10 text-amber-200"
                              >
                                no-resolve
                              </Badge>
                            )}
                            {!enabled && (
                              <Badge
                                variant="outline"
                                className="shrink-0 border-white/10 bg-white/5 text-white/45"
                              >
                                已停用
                              </Badge>
                            )}
                          </div>
                          <div
                            className="mt-1 truncate font-mono text-[11px] text-white/40"
                            title={detail}
                          >
                            {detail}
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-1">
                          <IconButton
                            label={`上移规则 ${title}`}
                            variant="ghost"
                            onClick={() => moveRuleOrderItem(item.key, -1)}
                            disabled={index <= 0}
                            className="h-7 w-7 rounded-md text-white/35 hover:text-indigo-200 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <ChevronUp
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          </IconButton>
                          <IconButton
                            label={`下移规则 ${title}`}
                            variant="ghost"
                            onClick={() => moveRuleOrderItem(item.key, 1)}
                            disabled={index >= ruleOrderItems.length - 1}
                            className="h-7 w-7 rounded-md text-white/35 hover:text-indigo-200 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <ChevronDown
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          </IconButton>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-medium text-white/70">
                远程规则集
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5"
                onClick={addRuleSet}
              >
                <Plus className="h-3.5 w-3.5" />
                新增
              </Button>
            </div>
            {surgeConfig.ruleSets.length === 0 ? (
              <EmptyHint>还没有远程规则集。</EmptyHint>
            ) : visibleRuleSets.length === 0 ? (
              <EmptyHint>没有匹配当前搜索的远程规则集。</EmptyHint>
            ) : (
              visibleRuleSets.map((ruleSet) => {
                const resourceType = ruleSetResourceType(ruleSet);
                const position =
                  rulePositionByKey.get(ruleSetOrderKey(ruleSet.id)) ?? "-";
                const canOpenRuleSet = isHttpUrl(ruleSet.url);
                return (
                  <div
                    key={ruleSet.id}
                    className="rounded-lg border border-white/10 bg-white/5 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <Badge
                        variant="outline"
                        className="border-cyan-500/25 bg-cyan-500/10 text-cyan-100"
                      >
                        顺序 #{position}
                      </Badge>
                      {!ruleSet.url.trim() && ruleSet.enabled !== false && (
                        <Badge
                          variant="outline"
                          className="border-amber-500/30 bg-amber-500/10 text-amber-100"
                        >
                          URL 为空
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-2 2xl:grid-cols-[auto_minmax(8rem,1fr)_minmax(14rem,2fr)_9rem_10rem_auto_auto] 2xl:items-center">
                      <Switch
                        checked={ruleSet.enabled !== false}
                        onCheckedChange={(checked) =>
                          updateRuleSet(ruleSet.id, { enabled: checked })
                        }
                        aria-label={`启用远程规则集 ${ruleSet.name}`}
                      />
                      <Input
                        value={ruleSet.name}
                        onChange={(event) =>
                          updateRuleSet(ruleSet.id, {
                            name: event.target.value,
                          })
                        }
                        placeholder="名称"
                        className="h-8 text-xs"
                      />
                      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-1">
                        <Input
                          value={ruleSet.url}
                          onChange={(event) =>
                            updateRuleSet(ruleSet.id, {
                              url: event.target.value,
                            })
                          }
                          placeholder="https://example.com/rules.list"
                          className="h-8 text-xs"
                        />
                        <IconButton
                          label="打开远程规则集"
                          variant="ghost"
                          onClick={() =>
                            window.open(
                              ruleSet.url,
                              "_blank",
                              "noopener,noreferrer",
                            )
                          }
                          disabled={!canOpenRuleSet}
                          className="h-8 w-8 rounded-lg text-white/45 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </IconButton>
                        <IconButton
                          label="清空远程规则集 URL"
                          variant="ghost"
                          onClick={() => updateRuleSet(ruleSet.id, { url: "" })}
                          disabled={!ruleSet.url}
                          className="h-8 w-8 rounded-lg text-white/45 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <X className="h-4 w-4" />
                        </IconButton>
                      </div>
                      <Select
                        value={resourceType}
                        onValueChange={(next) =>
                          updateRuleSet(ruleSet.id, {
                            resourceType: next as SurgeRuleSetResourceType,
                            ...(next === "domain-set"
                              ? { noResolve: false }
                              : {}),
                          })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SURGE_RULE_SET_RESOURCE_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {RULE_SET_RESOURCE_TYPE_LABELS[type]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <PolicyTargetSelect
                        value={ruleSet.target}
                        options={targetOptions}
                        onChange={(target) =>
                          updateRuleSet(ruleSet.id, { target })
                        }
                      />
                      <div
                        className={cn(
                          "flex items-center gap-1 text-xs text-white/55",
                          resourceType === "domain-set" && "opacity-45",
                        )}
                      >
                        <Switch
                          checked={
                            resourceType === "rule-set" &&
                            ruleSet.noResolve === true
                          }
                          onCheckedChange={(checked) =>
                            updateRuleSet(ruleSet.id, { noResolve: checked })
                          }
                          disabled={resourceType === "domain-set"}
                          aria-label={`规则集 ${ruleSet.name} 使用 no-resolve`}
                        />
                        no-resolve
                      </div>
                      <IconButton
                        label="删除远程规则集"
                        variant="ghost"
                        onClick={() => removeRuleSet(ruleSet.id)}
                        className="h-8 w-8 rounded-lg text-white/45 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </div>
                  </div>
                );
              })
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="text-xs font-medium text-white/70">本地规则</div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5"
                onClick={addRule}
              >
                <Plus className="h-3.5 w-3.5" />
                新增
              </Button>
            </div>
            {surgeConfig.rules.length === 0 ? (
              <EmptyHint>
                还没有本地规则。未添加 FINAL 时会自动使用下方兜底策略。
              </EmptyHint>
            ) : visibleRules.length === 0 ? (
              <EmptyHint>没有匹配当前搜索的本地规则。</EmptyHint>
            ) : (
              visibleRules.map((rule) => {
                const position = rulePositionByKey.get(ruleOrderKey(rule.id));
                return (
                  <div
                    key={rule.id}
                    className="rounded-lg border border-white/10 bg-white/5 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <Badge
                        variant="outline"
                        className="border-indigo-500/25 bg-indigo-500/10 text-indigo-100"
                      >
                        {rule.type === "FINAL"
                          ? "FINAL 固定底部"
                          : `顺序 #${position ?? "-"}`}
                      </Badge>
                      {rule.enabled !== false &&
                        rule.type !== "FINAL" &&
                        !(rule.value || "").trim() && (
                          <Badge
                            variant="outline"
                            className="border-amber-500/30 bg-amber-500/10 text-amber-100"
                          >
                            匹配内容为空
                          </Badge>
                        )}
                    </div>
                    <div className="grid grid-cols-1 gap-2 2xl:grid-cols-[auto_10rem_1fr_10rem_auto_auto] 2xl:items-center">
                      <Switch
                        checked={rule.enabled !== false}
                        onCheckedChange={(checked) =>
                          updateRule(rule.id, { enabled: checked })
                        }
                        aria-label={`启用规则 ${rule.value || rule.id}`}
                      />
                      <Select
                        value={rule.type}
                        onValueChange={(type) =>
                          updateRule(rule.id, { type: type as SurgeRuleType })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(rule.type === "FINAL"
                            ? SURGE_RULE_TYPES
                            : SURGE_EDITABLE_RULE_TYPES
                          ).map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={rule.value || ""}
                        onChange={(event) =>
                          updateRule(rule.id, { value: event.target.value })
                        }
                        placeholder={
                          rule.type === "FINAL"
                            ? "FINAL 不需要匹配内容"
                            : "example.com / 1.1.1.0/24"
                        }
                        disabled={rule.type === "FINAL"}
                        className="h-8 text-xs"
                      />
                      <PolicyTargetSelect
                        value={rule.target}
                        options={targetOptions}
                        onChange={(target) => updateRule(rule.id, { target })}
                      />
                      <div className="flex items-center gap-1 text-xs text-white/55">
                        <Switch
                          checked={rule.noResolve === true}
                          onCheckedChange={(checked) =>
                            updateRule(rule.id, { noResolve: checked })
                          }
                          aria-label={`规则 ${rule.value || rule.id} 使用 no-resolve`}
                        />
                        no-resolve
                      </div>
                      <IconButton
                        label="删除本地规则"
                        variant="ghost"
                        onClick={() => removeRule(rule.id)}
                        className="h-8 w-8 rounded-lg text-white/45 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </div>
                  </div>
                );
              })
            )}

            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-white/70">
                <FileCode2 className="h-3.5 w-3.5 text-indigo-300" />
                FINAL 兜底策略
              </div>
              <PolicyTargetSelect
                value={surgeConfig.finalTarget}
                options={targetOptions}
                onChange={(target) =>
                  setSurgeConfig({ ...surgeConfig, finalTarget: target })
                }
                className="max-w-xs"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
