"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronUp,
  FileCode2,
  Globe2,
  GripVertical,
  ListPlus,
  Plus,
  Route,
  RotateCcw,
  Server,
  Settings2,
  Trash2,
  WandSparkles,
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
  SURGE_PROXY_GROUP_TYPES,
  SURGE_RULE_TYPES,
  type SurgeConfig,
  type SurgePolicyRef,
  type SurgeProxyGroup,
  type SurgeProxyGroupType,
  type SurgeRegionPolicyGroup,
  type SurgeRule,
  type SurgeRuleSet,
  type SurgeRuleType,
} from "@subboost/core/surge";
import { SectionHeader } from "./advanced-mode/section-header";
import { InputSection } from "./advanced-mode/sections/input-section";
import { NodeManagementSection } from "./advanced-mode/sections/node-management-section";
import { ProxyGroupIconUrlEditor } from "./advanced-mode/sections/proxy-group-icon-url-editor";

type SectionKey = "input" | "nodes" | "general" | "regions" | "groups" | "rules";

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

const SURGE_EDITABLE_RULE_TYPES = SURGE_RULE_TYPES.filter((type) => type !== "FINAL");

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

function policyRefLabel(ref: SurgePolicyRef | string, groupNameById: Map<string, string>): string {
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
    for (const group of [...params.config.regionGroups, ...params.config.proxyGroups]) {
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

function updateArrayItem<T extends { id: string }>(items: T[], id: string, patch: Partial<T>): T[] {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

function removeArrayItem<T extends { id: string }>(items: T[], id: string): T[] {
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

function moveArrayItemById<T extends { id: string }>(items: T[], id: string, direction: -1 | 1): T[] {
  return moveArrayItem(items, items.findIndex((item) => item.id === id), direction);
}

function ruleSetOrderKey(id: string): string {
  return `rule-set:${id}`;
}

function ruleOrderKey(id: string): string {
  return `rule:${id}`;
}

function buildSurgeRuleOrderItems(config: SurgeConfig, preferredOrder: string[] = config.ruleOrder ?? []): SurgeRuleOrderItem[] {
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

function normalizeSurgeRuleOrder(config: SurgeConfig, preferredOrder: string[] = config.ruleOrder ?? []): string[] {
  return buildSurgeRuleOrderItems(config, preferredOrder).map((item) => item.key);
}

function ruleOrderItemTitle(item: SurgeRuleOrderItem): string {
  if (item.kind === "rule-set") return item.ruleSet.name || item.ruleSet.url || item.ruleSet.id;
  return item.rule.value ? `${item.rule.type} / ${item.rule.value}` : item.rule.type;
}

function ruleOrderItemDetail(item: SurgeRuleOrderItem): string {
  if (item.kind === "rule-set") return item.ruleSet.url || "未填写远程规则集 URL";
  return item.rule.value || "未填写匹配内容";
}

function ruleOrderItemTarget(item: SurgeRuleOrderItem): SurgePolicyRef | string {
  return item.kind === "rule-set" ? item.ruleSet.target : item.rule.target;
}

function ruleOrderItemEnabled(item: SurgeRuleOrderItem): boolean {
  return item.kind === "rule-set" ? item.ruleSet.enabled !== false : item.rule.enabled !== false;
}

function ruleOrderItemNoResolve(item: SurgeRuleOrderItem): boolean {
  return item.kind === "rule-set" ? item.ruleSet.noResolve === true : item.rule.noResolve === true;
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
          <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
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
    <Select value={value} onValueChange={(next) => onChange(next as SurgeProxyGroupType)}>
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

export function SurgeMode() {
  const [expandedSections, setExpandedSections] = React.useState<Set<SectionKey>>(
    new Set<SectionKey>(["input", "nodes", "general", "regions", "groups", "rules"])
  );
  const { nodes, surgeConfig, setSurgeConfig } = useConfigStore();
  const [memberDrafts, setMemberDrafts] = React.useState<Record<string, string>>({});
  const [draggingRuleKey, setDraggingRuleKey] = React.useState<string | null>(null);

  const nodeNames = React.useMemo(
    () => nodes.map((node) => node.name).filter((name): name is string => typeof name === "string" && Boolean(name.trim())),
    [nodes]
  );
  const groupNameById = React.useMemo(() => buildGroupNameById(surgeConfig), [surgeConfig]);
  const targetOptions = React.useMemo(
    () => buildPolicyOptions({ config: surgeConfig, nodeNames }),
    [nodeNames, surgeConfig]
  );
  const ruleOrderItems = React.useMemo(() => buildSurgeRuleOrderItems(surgeConfig), [surgeConfig]);

  const toggleSection = (section: SectionKey) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
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
        ? { ...patch, policies: current.policies.filter((policy) => policy.kind === "node") }
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
        encodePolicyRef(ruleSet.target) === `group:${id}` ? { ...ruleSet, target: { kind: "direct" } } : ruleSet
      ),
      rules: surgeConfig.rules.map((rule) =>
        encodePolicyRef(rule.target) === `group:${id}` ? { ...rule, target: { kind: "direct" } } : rule
      ),
    });
  };

  const addMember = (group: SurgeProxyGroup) => {
    const value = memberDrafts[group.id] || "";
    const decoded = decodePolicyRef(value);
    if (!decoded || typeof decoded === "string") return;
    if (group.type === "smart" && decoded.kind !== "node") return;
    const key = encodePolicyRef(decoded);
    const exists = group.policies.some((policy) => encodePolicyRef(policy) === key);
    if (exists) return;
    updateGroup(group.id, { policies: [...group.policies, decoded] });
  };

  const removeMember = (group: SurgeProxyGroup, index: number) => {
    updateGroup(group.id, { policies: group.policies.filter((_, i) => i !== index) });
  };

  const moveMember = (group: SurgeProxyGroup, index: number, direction: -1 | 1) => {
    updateGroup(group.id, { policies: moveArrayItem(group.policies, index, direction) });
  };

  const addRuleSet = () => {
    const id = makeId("surge-ruleset");
    const nextRuleSet: SurgeRuleSet = {
      id,
      name: "新远程规则集",
      url: "",
      target: { kind: "group", id: "proxy" },
      enabled: true,
    };
    const nextConfig = {
      ...surgeConfig,
      ruleSets: [...surgeConfig.ruleSets, nextRuleSet],
    };
    setSurgeConfig({
      ...nextConfig,
      ruleOrder: [...normalizeSurgeRuleOrder(surgeConfig), ruleSetOrderKey(id)],
    });
  };

  const updateRuleSet = (id: string, patch: Partial<SurgeRuleSet>) => {
    setSurgeConfig({
      ...surgeConfig,
      ruleSets: updateArrayItem(surgeConfig.ruleSets, id, patch),
    });
  };

  const removeRuleSet = (id: string) => {
    const nextOrder = (surgeConfig.ruleOrder ?? []).filter((key) => key !== ruleSetOrderKey(id));
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
      rules: [...surgeConfig.rules, nextRule],
    };
    setSurgeConfig({
      ...nextConfig,
      ruleOrder: [...normalizeSurgeRuleOrder(surgeConfig), ruleOrderKey(id)],
    });
  };

  const updateRule = (id: string, patch: Partial<SurgeRule>) => {
    const nextConfig = {
      ...surgeConfig,
      rules: updateArrayItem(surgeConfig.rules, id, patch.type === "FINAL" ? { ...patch, value: "", noResolve: false } : patch),
    };
    setSurgeConfig({
      ...nextConfig,
      ruleOrder: normalizeSurgeRuleOrder(nextConfig),
    });
  };

  const removeRule = (id: string) => {
    const nextOrder = (surgeConfig.ruleOrder ?? []).filter((key) => key !== ruleOrderKey(id));
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
  };

  const moveRuleOrderItem = (key: string, direction: -1 | 1) => {
    const index = ruleOrderItems.findIndex((item) => item.key === key);
    setRuleOrderFromItems(moveArrayItem(ruleOrderItems, index, direction));
  };

  const moveRuleOrderItemTo = (sourceKey: string, targetKey: string) => {
    if (!sourceKey || sourceKey === targetKey) return;
    const sourceIndex = ruleOrderItems.findIndex((item) => item.key === sourceKey);
    const targetIndex = ruleOrderItems.findIndex((item) => item.key === targetKey);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const next = [...ruleOrderItems];
    const [source] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, source);
    setRuleOrderFromItems(next);
  };

  const resetRuleOrderToYouko = () => {
    setSurgeConfig({
      ...surgeConfig,
      ruleOrder: normalizeSurgeRuleOrder(surgeConfig, createYoukoSurgeConfig().ruleOrder ?? []),
    });
  };

  return (
    <div className="flex flex-col gap-2 pb-2">
      <InputSection isExpanded={expandedSections.has("input")} onToggle={() => toggleSection("input")} />
      <NodeManagementSection isExpanded={expandedSections.has("nodes")} onToggle={() => toggleSection("nodes")} />

      <div>
        <SectionHeader
          icon={Settings2}
          title="Surge 基础"
          isExpanded={expandedSections.has("general")}
          onToggle={() => toggleSection("general")}
          badge={<Badge variant="outline" className="ml-auto border-cyan-500/40 bg-cyan-500/10 text-cyan-200">独立配置</Badge>}
        />
        {expandedSections.has("general") && (
          <div className="mt-2 space-y-3 pl-6">
            <div className="flex flex-col gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-xs font-medium text-cyan-100">Youko分流模板</div>
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
                onChange={(event) => setSurgeConfig({ ...surgeConfig, testUrl: event.target.value })}
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
                  setSurgeConfig({ ...surgeConfig, testInterval: Number(event.target.value) || surgeConfig.testInterval })
                }
                className="h-8 text-xs"
              />
            </div>
          </div>
            <div className="space-y-1 text-xs text-white/55">
              <span>[General]</span>
              <Textarea
                value={surgeConfig.generalText}
                onChange={(event) => setSurgeConfig({ ...surgeConfig, generalText: event.target.value })}
                className="min-h-[96px] font-mono text-xs"
              />
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between gap-3 text-xs text-white/70">
                <span>启用 MANAGED-CONFIG 头</span>
                <Switch
                  checked={surgeConfig.managedConfigEnabled === true}
                  onCheckedChange={(checked) => setSurgeConfig({ ...surgeConfig, managedConfigEnabled: checked })}
                  aria-label="启用 MANAGED-CONFIG 头"
                />
              </div>
              {surgeConfig.managedConfigEnabled && (
                <Input
                  value={surgeConfig.managedConfigUrl || ""}
                  onChange={(event) => setSurgeConfig({ ...surgeConfig, managedConfigUrl: event.target.value })}
                  placeholder="https://example.com/api/subscriptions/token/surge.conf"
                  className="mt-2 h-8 text-xs"
                />
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
          badge={<Badge variant="outline" className="ml-auto border-green-500/40 bg-green-500/10 text-green-200">{surgeConfig.regionGroups.filter((g) => g.enabled !== false).length} 启用</Badge>}
        />
        {expandedSections.has("regions") && (
          <div className="mt-2 space-y-2 pl-6">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" className="h-7 gap-1.5" onClick={addRegion}>
                <Plus className="h-3.5 w-3.5" />
                新增地区策略组
              </Button>
            </div>
            {surgeConfig.regionGroups.map((group, index) => (
              <div key={group.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-[auto_1fr_9rem_8rem_auto] lg:items-center">
                  <div className="flex items-center gap-2 text-xs text-white/70">
                    <Switch
                      checked={group.enabled !== false}
                      onCheckedChange={(checked) => updateRegion(group.id, { enabled: checked })}
                      aria-label={`启用地区策略组 ${group.name}`}
                    />
                    启用
                  </div>
                  <Input
                    value={group.name}
                    onChange={(event) => updateRegion(group.id, { name: event.target.value })}
                    className="h-8 text-xs"
                  />
                  <GroupTypeSelect value={group.type} onChange={(type) => updateRegion(group.id, { type })} />
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/65">
                    加入 PROXY
                    <Switch
                      checked={group.includeInProxy !== false}
                      onCheckedChange={(checked) => updateRegion(group.id, { includeInProxy: checked })}
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
                </div>
                <div className={cn("mt-2 grid grid-cols-1 gap-2", group.type === "smart" && "lg:grid-cols-2")}>
                  <Input
                    value={group.keywords.join(", ")}
                    onChange={(event) => updateRegion(group.id, { keywords: splitKeywords(event.target.value) })}
                    placeholder="香港, HK, Hong Kong"
                    className="h-8 text-xs"
                  />
                  {group.type === "smart" && (
                    <Input
                      value={group.policyPriority || ""}
                      onChange={(event) => updateRegion(group.id, { policyPriority: event.target.value })}
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
          badge={<Badge variant="outline" className="ml-auto border-indigo-500/40 bg-indigo-500/10 text-indigo-200">{surgeConfig.proxyGroups.length} 个</Badge>}
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
              const selectedDraft = memberDrafts[group.id] || options[0]?.value || "";
              return (
                <div key={group.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="grid grid-cols-1 gap-2 lg:grid-cols-[auto_1fr_9rem_auto_auto] lg:items-center">
                    <div className="flex items-center gap-2 text-xs text-white/70">
                      <Switch
                        checked={group.enabled !== false}
                        onCheckedChange={(checked) => updateGroup(group.id, { enabled: checked })}
                        aria-label={`启用策略组 ${group.name}`}
                      />
                      启用
                    </div>
                    <Input value={group.name} onChange={(event) => updateGroup(group.id, { name: event.target.value })} className="h-8 text-xs" />
                    <GroupTypeSelect value={group.type} onChange={(type) => updateGroup(group.id, { type })} />
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
                        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
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
                  {(group.type === "url-test" || group.type === "fallback" || group.type === "load-balance") && (
                    <div className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-3">
                      <Input
                        value={group.url || surgeConfig.testUrl}
                        onChange={(event) => updateGroup(group.id, { url: event.target.value })}
                        placeholder="测速 URL"
                        className="h-8 text-xs"
                      />
                      <Input
                        type="number"
                        min={1}
                        value={group.interval || surgeConfig.testInterval}
                        onChange={(event) => updateGroup(group.id, { interval: Number(event.target.value) || surgeConfig.testInterval })}
                        placeholder="间隔"
                        className="h-8 text-xs"
                      />
                      <Input
                        value={group.policyPriority || ""}
                        onChange={(event) => updateGroup(group.id, { policyPriority: event.target.value })}
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
                  {group.includeAllNodes && (
                    <div className="mt-2 text-xs leading-5 text-cyan-100/65">
                      自动包含当前所有节点，订阅更新后新增节点也会自动加入此策略组。
                    </div>
                  )}
                  {group.type === "smart" && (
                    <div className="mt-2 space-y-2">
                      <Input
                        value={group.policyPriority || ""}
                        onChange={(event) => updateGroup(group.id, { policyPriority: event.target.value })}
                        placeholder="policy-priority，例如 香港:0.9;备用:1.2"
                        className="h-8 text-xs"
                      />
                      <div className="text-xs leading-5 text-white/40">
                        Smart 使用 Surge 的实时连接质量和站点记忆进行选择，检测周期由 Surge 固定管理，测速 URL 和间隔不会生效。
                      </div>
                    </div>
                  )}
                  <div className="mt-2 space-y-1.5">
                    {group.policies.length === 0 ? (
                      <span className="text-xs text-white/40">暂无成员</span>
                    ) : (
                      group.policies.map((policy, index) => (
                        <div
                          key={`${encodePolicyRef(policy)}-${index}`}
                          className="flex min-w-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1"
                        >
                          <span className="min-w-0 flex-1 truncate text-xs text-white/70">
                            {policyRefLabel(policy, groupNameById)}
                          </span>
                          <IconButton
                            label={`上移成员 ${policyRefLabel(policy, groupNameById)}`}
                            variant="ghost"
                            onClick={() => moveMember(group, index, -1)}
                            disabled={index <= 0}
                            className="h-6 w-6 shrink-0 rounded-md text-white/35 hover:text-indigo-200 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                          </IconButton>
                          <IconButton
                            label={`下移成员 ${policyRefLabel(policy, groupNameById)}`}
                            variant="ghost"
                            onClick={() => moveMember(group, index, 1)}
                            disabled={index >= group.policies.length - 1}
                            className="h-6 w-6 shrink-0 rounded-md text-white/35 hover:text-indigo-200 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                          </IconButton>
                          <IconButton
                            label={`删除成员 ${policyRefLabel(policy, groupNameById)}`}
                            variant="ghost"
                            onClick={() => removeMember(group, index)}
                            className="h-6 w-6 shrink-0 rounded-md text-white/35 hover:text-red-300"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </IconButton>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                    <Select
                      value={selectedDraft}
                      onValueChange={(value) => setMemberDrafts((prev) => ({ ...prev, [group.id]: value }))}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder={group.type === "smart" ? "选择真实节点" : "选择 DIRECT / REJECT / 策略组 / 节点"} />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((option) => (
                          <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" className="h-8" onClick={() => addMember(group)} disabled={!selectedDraft}>
                      <Plus className="h-3.5 w-3.5" />
                      添加
                    </Button>
                  </div>
                  {group.type === "smart" && (
                    <div className="mt-2 text-xs text-white/40">Smart 组只加入真实节点，DIRECT / REJECT / 嵌套策略组不会写入。</div>
                  )}
                </div>
              );
            })}
            <Button variant="outline" size="sm" onClick={addGroup} className="h-8 gap-2">
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
          badge={<Badge variant="outline" className="ml-auto border-amber-500/40 bg-amber-500/10 text-amber-200">{surgeConfig.ruleSets.length + surgeConfig.rules.length} 条</Badge>}
        />
        {expandedSections.has("rules") && (
          <div className="mt-2 space-y-3 pl-6">
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs font-medium text-white/70">规则顺序</div>
                  <div className="mt-1 text-xs text-white/40">远程规则集和本地规则按这里的顺序写入，FINAL 固定在底部。</div>
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
                    const targetLabel = policyRefLabel(ruleOrderItemTarget(item), groupNameById);
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
                          const sourceKey = draggingRuleKey || event.dataTransfer.getData("text/plain");
                          moveRuleOrderItemTo(sourceKey, item.key);
                          setDraggingRuleKey(null);
                        }}
                        onDragEnd={() => setDraggingRuleKey(null)}
                        className={cn(
                          "grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-white/10 px-3 py-2 last:border-b-0",
                          enabled ? "bg-white/5" : "bg-white/[0.02] opacity-55",
                          draggingRuleKey === item.key && "border-cyan-400/40 bg-cyan-500/10"
                        )}
                      >
                        <GripVertical className="h-4 w-4 cursor-grab text-white/30 active:cursor-grabbing" aria-hidden="true" />
                        <div className="w-6 text-right text-[10px] tabular-nums text-white/35">{index + 1}</div>
                        <div className="min-w-0">
                          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className={cn(
                                "shrink-0 text-[10px]",
                                item.kind === "rule-set"
                                  ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
                                  : "border-indigo-500/30 bg-indigo-500/10 text-indigo-200"
                              )}
                            >
                              {item.kind === "rule-set" ? "远程规则集" : item.rule.type}
                            </Badge>
                            <span className="min-w-0 max-w-full truncate text-xs font-medium text-white/75" title={title}>
                              {title}
                            </span>
                            <Badge variant="outline" className="max-w-full border-white/10 bg-white/5 text-white/60">
                              {targetLabel}
                            </Badge>
                            {ruleOrderItemNoResolve(item) && (
                              <Badge variant="outline" className="shrink-0 border-amber-500/30 bg-amber-500/10 text-amber-200">
                                no-resolve
                              </Badge>
                            )}
                            {!enabled && (
                              <Badge variant="outline" className="shrink-0 border-white/10 bg-white/5 text-white/45">
                                已停用
                              </Badge>
                            )}
                          </div>
                          <div className="mt-1 truncate font-mono text-[11px] text-white/40" title={detail}>
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
                            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                          </IconButton>
                          <IconButton
                            label={`下移规则 ${title}`}
                            variant="ghost"
                            onClick={() => moveRuleOrderItem(item.key, 1)}
                            disabled={index >= ruleOrderItems.length - 1}
                            className="h-7 w-7 rounded-md text-white/35 hover:text-indigo-200 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                          </IconButton>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-medium text-white/70">远程规则集</div>
              <Button variant="outline" size="sm" className="h-7 gap-1.5" onClick={addRuleSet}>
                <Plus className="h-3.5 w-3.5" />
                新增
              </Button>
            </div>
            {surgeConfig.ruleSets.length === 0 ? (
              <EmptyHint>还没有远程规则集。</EmptyHint>
            ) : (
              surgeConfig.ruleSets.map((ruleSet) => (
                <div key={ruleSet.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="grid grid-cols-1 gap-2 lg:grid-cols-[auto_1fr_2fr_10rem_auto_auto] lg:items-center">
                    <Switch
                      checked={ruleSet.enabled !== false}
                      onCheckedChange={(checked) => updateRuleSet(ruleSet.id, { enabled: checked })}
                      aria-label={`启用远程规则集 ${ruleSet.name}`}
                    />
                    <Input value={ruleSet.name} onChange={(event) => updateRuleSet(ruleSet.id, { name: event.target.value })} placeholder="名称" className="h-8 text-xs" />
                    <Input value={ruleSet.url} onChange={(event) => updateRuleSet(ruleSet.id, { url: event.target.value })} placeholder="https://example.com/rules.list" className="h-8 text-xs" />
                    <PolicyTargetSelect value={ruleSet.target} options={targetOptions} onChange={(target) => updateRuleSet(ruleSet.id, { target })} />
                    <div className="flex items-center gap-1 text-xs text-white/55">
                      <Switch
                        checked={ruleSet.noResolve === true}
                        onCheckedChange={(checked) => updateRuleSet(ruleSet.id, { noResolve: checked })}
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
              ))
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="text-xs font-medium text-white/70">本地规则</div>
              <Button variant="outline" size="sm" className="h-7 gap-1.5" onClick={addRule}>
                <Plus className="h-3.5 w-3.5" />
                新增
              </Button>
            </div>
            {surgeConfig.rules.length === 0 ? (
              <EmptyHint>还没有本地规则。未添加 FINAL 时会自动使用下方兜底策略。</EmptyHint>
            ) : (
              surgeConfig.rules.map((rule) => (
                <div key={rule.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="grid grid-cols-1 gap-2 lg:grid-cols-[auto_10rem_1fr_10rem_auto_auto] lg:items-center">
                    <Switch
                      checked={rule.enabled !== false}
                      onCheckedChange={(checked) => updateRule(rule.id, { enabled: checked })}
                      aria-label={`启用规则 ${rule.value || rule.id}`}
                    />
                    <Select value={rule.type} onValueChange={(type) => updateRule(rule.id, { type: type as SurgeRuleType })}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(rule.type === "FINAL" ? SURGE_RULE_TYPES : SURGE_EDITABLE_RULE_TYPES).map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={rule.value || ""}
                      onChange={(event) => updateRule(rule.id, { value: event.target.value })}
                      placeholder={rule.type === "FINAL" ? "FINAL 不需要匹配内容" : "example.com / 1.1.1.0/24"}
                      disabled={rule.type === "FINAL"}
                      className="h-8 text-xs"
                    />
                    <PolicyTargetSelect value={rule.target} options={targetOptions} onChange={(target) => updateRule(rule.id, { target })} />
                    <div className="flex items-center gap-1 text-xs text-white/55">
                      <Switch
                        checked={rule.noResolve === true}
                        onCheckedChange={(checked) => updateRule(rule.id, { noResolve: checked })}
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
              ))
            )}

            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-white/70">
                <FileCode2 className="h-3.5 w-3.5 text-indigo-300" />
                FINAL 兜底策略
              </div>
              <PolicyTargetSelect
                value={surgeConfig.finalTarget}
                options={targetOptions}
                onChange={(target) => setSurgeConfig({ ...surgeConfig, finalTarget: target })}
                className="max-w-xs"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
