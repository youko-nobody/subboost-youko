"use client";

import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronDown, ChevronRight, ChevronUp, List, Network, Plus, Settings2, Trash2, WandSparkles } from "lucide-react";
import { Button } from "@subboost/ui/components/ui/button";
import { Input } from "@subboost/ui/components/ui/input";
import { IconButton } from "@subboost/ui/components/ui/icon-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@subboost/ui/components/ui/select";
import { Textarea } from "@subboost/ui/components/ui/textarea";
import { Switch } from "@subboost/ui/components/ui/switch";
import { useConfigStore, type ConfigState } from "@subboost/ui/store/config-store";
import { createYoukoLoonConfig, type LoonPolicyRef, type LoonProxyGroupType, type LoonRuleType } from "@subboost/core/loon";
import { ProxyGroupIconPreview, ProxyGroupIconUrlEditor, isValidOptionalHttpIconUrl } from "./advanced-mode/sections/proxy-group-icon-url-editor";
import { InputSection } from "./advanced-mode/sections/input-section";
import { NodeManagementSection } from "./advanced-mode/sections/node-management-section";
import { SectionHeader } from "./advanced-mode/section-header";

const RULE_TYPES: LoonRuleType[] = ["DOMAIN", "DOMAIN-SUFFIX", "DOMAIN-KEYWORD", "URL-REGEX", "USER-AGENT", "IP-CIDR", "IP-CIDR6", "IP-ASN", "GEOIP", "DEST-PORT", "SRC-PORT"];
type LoonSectionKey = "input" | "nodes" | "groups" | "rules" | "base";

function newId(prefix: string): string {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

function policyValue(policy: LoonPolicyRef): string {
  if (policy.kind === "direct") return "direct";
  if (policy.kind === "reject") return "reject";
  return `${policy.kind}:${policy.kind === "group" ? policy.id : policy.name}`;
}

function policyLabel(value: string, state: ConfigState): string {
  if (value === "direct") return "DIRECT 直连";
  if (value === "reject") return "REJECT 拒绝";
  if (value.startsWith("group:")) {
    const id = value.slice(6);
    return `策略组 · ${state.loonConfig.proxyGroups.find((group) => group.id === id)?.name ?? id}`;
  }
  if (value.startsWith("node:")) return `节点 · ${value.slice(5)}`;
  return value;
}

function parsePolicy(value: string, state: ConfigState): LoonPolicyRef | string {
  if (value === "direct") return { kind: "direct" };
  if (value === "reject") return { kind: "reject" };
  if (value.startsWith("group:")) return { kind: "group", id: value.slice(6) };
  if (value.startsWith("node:")) return { kind: "node", name: value.slice(5) };
  return state.nodes.some((node) => node.name === value)
    ? { kind: "node", name: value }
    : value;
}

function policyOptions(
  nodes: ConfigState["nodes"],
  groups: ConfigState["loonConfig"]["proxyGroups"],
  excludeGroupId?: string,
) {
  return [
    { value: "direct", label: "DIRECT 直连" },
    { value: "reject", label: "REJECT 拒绝" },
    ...groups.filter((group) => group.id !== excludeGroupId).map((group) => ({ value: `group:${group.id}`, label: `策略组 · ${group.name}` })),
    ...nodes.map((node) => ({ value: `node:${node.name}`, label: `节点 · ${node.name}` })),
  ];
}

const GROUP_TYPE_LABELS: Record<LoonProxyGroupType, string> = {
  select: "手动选择",
  "url-test": "自动测速",
  fallback: "故障转移",
  "load-balance": "负载均衡",
};

function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

type LoonProxyGroup = ConfigState["loonConfig"]["proxyGroups"][number];
type LoonPolicyOption = { value: string; label: string };

function LoonPolicySelect({
  value,
  getOptions,
  onValueChange,
  ariaLabel,
  label,
  placeholder,
  emptyMessage = "暂无可选策略",
  className,
}: {
  value: string;
  getOptions: () => LoonPolicyOption[];
  onValueChange: (value: string) => void;
  ariaLabel: string;
  label?: React.ReactNode;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [options, setOptions] = React.useState<LoonPolicyOption[]>([]);
  return (
    <Select
      value={value}
      open={open}
      onOpenChange={(nextOpen) => {
        setOptions(nextOpen ? getOptions() : []);
        setOpen(nextOpen);
      }}
      onValueChange={onValueChange}
    >
      <SelectTrigger className={className} aria-label={ariaLabel}>
        {label ? <SelectValue>{label}</SelectValue> : <SelectValue placeholder={placeholder} />}
      </SelectTrigger>
      <SelectContent>
        {open && (options.length > 0
          ? options.map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))
          : <div className="px-2 py-1.5 text-xs text-white/40">{emptyMessage}</div>)}
      </SelectContent>
    </Select>
  );
}

export function LoonPolicyMemberRows({
  group,
  groups,
  getOptions,
  onUpdate,
}: {
  group: LoonProxyGroup;
  groups: LoonProxyGroup[];
  getOptions: () => LoonPolicyOption[];
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  const scrollElementRef = React.useRef<HTMLDivElement>(null);
  const groupNameById = React.useMemo(
    () => new Map(groups.map((item) => [item.id, item.name])),
    [groups],
  );
  // TanStack Virtual needs its mutable instance for measuring and updating scroll ranges.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer<HTMLDivElement, HTMLDivElement>({
    count: group.policies.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => 42,
    getItemKey: (index) => `${group.id}-${index}-${policyValue(group.policies[index])}`,
    overscan: 8,
    initialRect: { width: 0, height: 288 },
  });

  return (
    <div ref={scrollElementRef} className="max-h-72 space-y-1.5 overflow-y-auto pr-1 custom-scrollbar">
      <div style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
        {virtualizer.getVirtualItems().map((row) => {
          const policy = group.policies[row.index];
          if (!policy) return null;
          const selectedValue = policyValue(policy);
          const label = policy.kind === "group"
            ? `策略组 · ${groupNameById.get(policy.id) ?? policy.id}`
            : policy.kind === "node"
              ? `节点 · ${policy.name}`
              : policy.kind === "direct"
                ? "DIRECT 直连"
                : "REJECT 拒绝";
          return (
            <div
              key={row.key}
              data-index={row.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 top-0 w-full pb-1.5"
              style={{ transform: `translateY(${row.start}px)` }}
            >
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5">
                <LoonPolicySelect
                  value={selectedValue}
                  getOptions={getOptions}
                  ariaLabel={`${group.name} 第 ${row.index + 1} 个策略成员`}
                  label={label}
                  className="h-9 min-w-0 rounded-md px-3 text-xs"
                  onValueChange={(value) => {
                    const nextPolicy = parsePolicy(value, useConfigStore.getState());
                    if (typeof nextPolicy !== "string") {
                      onUpdate({
                        policies: group.policies.map((item, itemIndex) => itemIndex === row.index ? nextPolicy : item),
                      });
                    }
                  }}
                />
                <div className="flex shrink-0 items-center gap-0.5">
                  <IconButton type="button" label="上移策略成员" variant="ghost" disabled={row.index === 0} onClick={() => onUpdate({ policies: moveItem(group.policies, row.index, -1) })}><ChevronUp className="h-4 w-4" /></IconButton>
                  <IconButton type="button" label="下移策略成员" variant="ghost" disabled={row.index === group.policies.length - 1} onClick={() => onUpdate({ policies: moveItem(group.policies, row.index, 1) })}><ChevronDown className="h-4 w-4" /></IconButton>
                  <IconButton type="button" label="删除策略成员" variant="ghost" onClick={() => onUpdate({ policies: group.policies.filter((_, itemIndex) => itemIndex !== row.index) })}><Trash2 className="h-4 w-4" /></IconButton>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const LoonProxyGroupCard = React.memo(function LoonProxyGroupCard({
  group,
  index,
  groupCount,
  groups,
  state,
  initiallyExpanded,
  onUpdateGroup,
  onMoveGroup,
  onRemoveGroup,
}: {
  group: LoonProxyGroup;
  index: number;
  groupCount: number;
  groups: LoonProxyGroup[];
  state: ConfigState;
  initiallyExpanded: boolean;
  onUpdateGroup: (id: string, patch: Record<string, unknown>) => void;
  onMoveGroup: (id: string, direction: -1 | 1) => void;
  onRemoveGroup: (id: string) => void;
}) {
  const [expanded, setExpanded] = React.useState(initiallyExpanded);
  const getPolicyOptions = React.useCallback(
    () => policyOptions(state.nodes, state.loonConfig.proxyGroups, group.id),
    [group.id, state.loonConfig.proxyGroups, state.nodes],
  );
  const selected = React.useMemo(
    () => new Set(group.policies.map(policyValue)),
    [group.policies],
  );
  const getOptionsToAdd = React.useCallback(
    () => getPolicyOptions().filter((option) => !selected.has(option.value)),
    [getPolicyOptions, selected],
  );
  const update = React.useCallback(
    (patch: Record<string, unknown>) => onUpdateGroup(group.id, patch),
    [group.id, onUpdateGroup],
  );

  return (
    <article className="min-w-0 overflow-hidden rounded-md border border-white/10 bg-white/[0.035]">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 px-2.5 py-2">
        <button
          type="button"
          className="col-span-2 flex w-full min-w-0 items-center gap-2.5 rounded-sm text-left outline-none transition-colors hover:bg-white/[0.035] focus-visible:ring-2 focus-visible:ring-indigo-500/50 sm:col-span-1"
          aria-expanded={expanded}
          aria-label={`${expanded ? "收起" : "展开"} ${group.name} 策略组`}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded
            ? <ChevronDown className="h-4 w-4 shrink-0 text-white/45" />
            : <ChevronRight className="h-4 w-4 shrink-0 text-white/45" />}
          <ProxyGroupIconPreview src={group.icon} label={`${group.name} 图标预览`} className="h-7 w-7" />
          <span className={`min-w-0 flex-1 text-sm font-medium [overflow-wrap:anywhere] ${group.enabled === false ? "text-white/40" : "text-white"}`}>
            {group.name || "未命名策略组"}
          </span>
          <span className="hidden shrink-0 rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-white/55 sm:inline-flex">
            {GROUP_TYPE_LABELS[group.type]}
          </span>
          <span className="shrink-0 text-xs text-white/45">{group.policies.length} 项</span>
        </button>
        <div className="col-span-2 flex shrink-0 justify-end gap-0.5 sm:col-span-1 sm:col-start-2 sm:row-start-1">
          <Switch checked={group.enabled !== false} onCheckedChange={(enabled) => onUpdateGroup(group.id, { enabled })} aria-label={`启用策略组 ${group.name}`} />
          <IconButton type="button" label="上移策略组" variant="ghost" disabled={index === 0} onClick={() => onMoveGroup(group.id, -1)}><ChevronUp className="h-4 w-4" /></IconButton>
          <IconButton type="button" label="下移策略组" variant="ghost" disabled={index === groupCount - 1} onClick={() => onMoveGroup(group.id, 1)}><ChevronDown className="h-4 w-4" /></IconButton>
          <IconButton type="button" label="删除策略组" variant="ghost" onClick={() => onRemoveGroup(group.id)}><Trash2 className="h-4 w-4" /></IconButton>
        </div>
      </div>
      {expanded && (
        <div className="min-w-0 space-y-4 border-t border-white/10 px-3 py-3 sm:px-4">
          <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,0.45fr)]">
            <Input value={group.name} onChange={(event) => update({ name: event.target.value })} aria-label="策略组名称" placeholder="策略组名称" />
            <Select value={group.type} onValueChange={(value) => update({ type: value as LoonProxyGroupType })}>
              <SelectTrigger aria-label="策略组类型"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="select">手动选择</SelectItem>
                <SelectItem value="url-test">自动测速</SelectItem>
                <SelectItem value="fallback">故障转移</SelectItem>
                <SelectItem value="load-balance">负载均衡</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-0 space-y-1">
            <ProxyGroupIconUrlEditor
              value={group.icon || ""}
              onChange={(icon) => update({ icon })}
              displayName={group.name || "策略组"}
              className="sm:grid-cols-[4.5rem_minmax(0,1fr)]"
            />
            {!isValidOptionalHttpIconUrl(group.icon || "") && (
              <p className="pl-[5rem] text-[11px] text-rose-300">图标地址需以 http:// 或 https:// 开头</p>
            )}
          </div>

          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-semibold text-white/85">策略成员</h3>
              <span className="text-xs text-white/45">{group.policies.length} 项</span>
            </div>
            {group.policies.length === 0 ? (
              <div className="text-xs text-white/40">暂无成员</div>
            ) : (
              <LoonPolicyMemberRows group={group} groups={groups} getOptions={getPolicyOptions} onUpdate={update} />
            )}
            <LoonPolicySelect
              value=""
              getOptions={getOptionsToAdd}
              ariaLabel={`添加 ${group.name} 策略成员`}
              placeholder="添加节点或策略成员"
              emptyMessage="没有可添加的成员"
              className="h-9 rounded-md border-dashed px-3 text-xs text-white/55"
              onValueChange={(value) => {
                const nextPolicy = parsePolicy(value, state);
                if (typeof nextPolicy !== "string") update({ policies: [...group.policies, nextPolicy] });
              }}
            />
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
            <Input value={group.includeRegex || ""} onChange={(event) => update({ includeRegex: event.target.value })} placeholder="包含节点正则（可选）" aria-label="包含节点正则" />
            <Input value={group.excludeRegex || ""} onChange={(event) => update({ excludeRegex: event.target.value })} placeholder="排除节点正则（可选）" aria-label="排除节点正则" />
          </div>
          {group.type !== "select" && (
            <div className="min-w-0 space-y-2 border-t border-white/10 pt-3">
              <h3 className="text-xs font-semibold text-white/75">自动策略参数</h3>
              <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                <Input value={group.url || state.loonConfig.testUrl} onChange={(event) => update({ url: event.target.value })} placeholder="测速 URL" aria-label="测速 URL" />
                <Input type="number" min={1} value={group.interval || state.loonConfig.testInterval} onChange={(event) => update({ interval: Number(event.target.value) || state.loonConfig.testInterval })} aria-label="测速间隔秒数" placeholder="测速间隔（秒）" />
                {group.type === "url-test" && <Input type="number" min={0} value={group.tolerance ?? 0} onChange={(event) => update({ tolerance: Number(event.target.value) || 0 })} placeholder="切换容差（毫秒）" aria-label="切换容差毫秒" />}
                {group.type !== "url-test" && <Input type="number" min={1} value={group.maxTimeout ?? 3000} onChange={(event) => update({ maxTimeout: Number(event.target.value) || 3000 })} placeholder="最大测速超时（毫秒）" aria-label="最大测速超时毫秒" />}
                {group.type === "load-balance" && (
                  <Select value={group.algorithm || "pcc"} onValueChange={(value) => update({ algorithm: value })}>
                    <SelectTrigger aria-label="负载均衡算法"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="random">Random 随机</SelectItem>
                      <SelectItem value="pcc">PCC 主机粘性</SelectItem>
                      <SelectItem value="round-robin">Round-Robin 轮询</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
});

export function LoonMode() {
  const state = useConfigStore();
  const { loonConfig, setLoonConfig } = state;
  const [expandedSections, setExpandedSections] = React.useState<Set<LoonSectionKey>>(
    new Set(["input", "nodes", "groups", "rules", "base"]),
  );
  const getPolicyOptions = React.useCallback(
    () => policyOptions(state.nodes, loonConfig.proxyGroups),
    [loonConfig.proxyGroups, state.nodes],
  );
  const [initiallyExpandedGroupId, setInitiallyExpandedGroupId] = React.useState<string | null>(null);
  const toggleSection = (section: LoonSectionKey) => {
    setExpandedSections((current) => {
      const next = new Set(current);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const updateGroup = React.useCallback((id: string, patch: Record<string, unknown>) => setLoonConfig({
    ...loonConfig,
    proxyGroups: loonConfig.proxyGroups.map((group) => group.id === id ? { ...group, ...patch } : group),
  }), [loonConfig, setLoonConfig]);
  const moveGroup = React.useCallback((id: string, direction: -1 | 1) => {
    const currentConfig = useConfigStore.getState().loonConfig;
    const currentIndex = currentConfig.proxyGroups.findIndex((item) => item.id === id);
    if (currentIndex < 0) return;
    setLoonConfig({
      ...currentConfig,
      proxyGroups: moveItem(currentConfig.proxyGroups, currentIndex, direction),
    });
  }, [setLoonConfig]);
  const removeGroup = React.useCallback((id: string) => {
    const currentConfig = useConfigStore.getState().loonConfig;
    setLoonConfig({
      ...currentConfig,
      proxyGroups: currentConfig.proxyGroups.filter((item) => item.id !== id),
    });
  }, [setLoonConfig]);
  const updateRemoteRule = (id: string, patch: Record<string, unknown>) => setLoonConfig({
    ...loonConfig,
    remoteRules: loonConfig.remoteRules.map((rule) => rule.id === id ? { ...rule, ...patch } : rule),
  });
  const updateRule = (id: string, patch: Record<string, unknown>) => setLoonConfig({
    ...loonConfig,
    rules: loonConfig.rules.map((rule) => rule.id === id ? { ...rule, ...patch } : rule),
  });

  const addGroup = () => {
    const group = { id: newId("loon-group"), name: "新策略组", type: "select" as const, policies: [] };
    setLoonConfig({ ...loonConfig, proxyGroups: [group, ...loonConfig.proxyGroups] });
    setInitiallyExpandedGroupId(group.id);
  };
  const addRemoteRule = () => setLoonConfig({
    ...loonConfig,
    remoteRules: [{ id: newId("loon-remote"), name: "新远程规则集", url: "", target: { kind: "direct" } }, ...loonConfig.remoteRules],
  });
  const addRule = () => setLoonConfig({
    ...loonConfig,
    rules: [{ id: newId("loon-rule"), type: "DOMAIN-SUFFIX", value: "", target: { kind: "direct" } }, ...loonConfig.rules],
  });

  return (
    <div className="min-w-0 space-y-2 overflow-x-hidden text-white">
      <InputSection
        isExpanded={expandedSections.has("input")}
        onToggle={() => toggleSection("input")}
      />
      <NodeManagementSection
        isExpanded={expandedSections.has("nodes")}
        onToggle={() => toggleSection("nodes")}
        showListenerPorts={false}
      />

      <section className="min-w-0">
        <SectionHeader
          icon={Network}
          title="分流代理组"
          badge={<span className="ml-auto text-xs text-white/45">{loonConfig.proxyGroups.length} 个</span>}
          isExpanded={expandedSections.has("groups")}
          onToggle={() => toggleSection("groups")}
        />
        <div hidden={!expandedSections.has("groups")} className="mt-2 min-w-0 space-y-2 pl-6">
          <div className="flex justify-end pb-1">
            <Button type="button" variant="outline" size="sm" onClick={addGroup}><Plus className="mr-1 h-4 w-4" />添加策略组</Button>
          </div>
        {loonConfig.proxyGroups.map((group, index) => (
          <LoonProxyGroupCard
            key={group.id}
            group={group}
            index={index}
            groupCount={loonConfig.proxyGroups.length}
            groups={loonConfig.proxyGroups}
            state={state}
            initiallyExpanded={initiallyExpandedGroupId === group.id}
            onUpdateGroup={updateGroup}
            onMoveGroup={moveGroup}
            onRemoveGroup={removeGroup}
          />
        ))}
        </div>
      </section>

      <section className="min-w-0">
        <SectionHeader
          icon={List}
          title="规则管理"
          badge={<span className="ml-auto text-xs text-white/45">{loonConfig.remoteRules.length + loonConfig.rules.length} 条</span>}
          isExpanded={expandedSections.has("rules")}
          onToggle={() => toggleSection("rules")}
        />
        {expandedSections.has("rules") && <div className="mt-2 space-y-5 pl-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">远程规则集 <span className="text-white/45">{loonConfig.remoteRules.length}</span></h3>
            <Button type="button" variant="outline" size="sm" onClick={addRemoteRule}><Plus className="mr-1 h-4 w-4" />添加远程规则</Button>
          </div>
        {loonConfig.remoteRules.map((rule, index) => (
          <div key={rule.id} className="grid min-w-0 grid-cols-1 gap-2 border-b border-white/10 pb-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(8rem,1fr)_auto]">
            <Input value={rule.name} onChange={(event) => updateRemoteRule(rule.id, { name: event.target.value })} aria-label="远程规则集名称" />
            <Input value={rule.url} onChange={(event) => updateRemoteRule(rule.id, { url: event.target.value })} placeholder="https://example.com/loon.list" aria-label="远程规则集 URL" />
            <LoonPolicySelect
              value={typeof rule.target === "string" ? rule.target : policyValue(rule.target)}
              getOptions={getPolicyOptions}
              label={policyLabel(typeof rule.target === "string" ? rule.target : policyValue(rule.target), state)}
              ariaLabel="远程规则目标"
              onValueChange={(value) => updateRemoteRule(rule.id, { target: parsePolicy(value, state) })}
            />
            <div className="flex items-center justify-end gap-1">
              <Switch checked={rule.enabled !== false} onCheckedChange={(enabled) => updateRemoteRule(rule.id, { enabled })} aria-label={`启用远程规则集 ${rule.name}`} />
              <IconButton type="button" label="上移远程规则集" variant="ghost" disabled={index === 0} onClick={() => setLoonConfig({ ...loonConfig, remoteRules: moveItem(loonConfig.remoteRules, index, -1) })}><ChevronUp className="h-4 w-4" /></IconButton>
              <IconButton type="button" label="下移远程规则集" variant="ghost" disabled={index === loonConfig.remoteRules.length - 1} onClick={() => setLoonConfig({ ...loonConfig, remoteRules: moveItem(loonConfig.remoteRules, index, 1) })}><ChevronDown className="h-4 w-4" /></IconButton>
              <IconButton type="button" label="删除远程规则集" variant="ghost" onClick={() => setLoonConfig({ ...loonConfig, remoteRules: loonConfig.remoteRules.filter((item) => item.id !== rule.id) })}><Trash2 className="h-4 w-4" /></IconButton>
            </div>
          </div>
        ))}
        </div>

        <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">本地规则 <span className="text-white/45">{loonConfig.rules.length}</span></h3>
          <Button type="button" variant="outline" size="sm" onClick={addRule}><Plus className="mr-1 h-4 w-4" />添加本地规则</Button>
        </div>
        {loonConfig.rules.map((rule, index) => (
          <div key={rule.id} className="grid min-w-0 grid-cols-1 gap-2 border-b border-white/10 pb-3 sm:grid-cols-[9rem_minmax(0,1fr)_minmax(8rem,1fr)_auto]">
            <Select value={rule.type} onValueChange={(value) => updateRule(rule.id, { type: value as LoonRuleType })}>
              <SelectTrigger aria-label="本地规则类型"><SelectValue /></SelectTrigger>
              <SelectContent>{RULE_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
            </Select>
            <Input value={rule.value} onChange={(event) => updateRule(rule.id, { value: event.target.value })} placeholder="匹配内容" aria-label="本地规则匹配内容" />
            <LoonPolicySelect
              value={typeof rule.target === "string" ? rule.target : policyValue(rule.target)}
              getOptions={getPolicyOptions}
              label={policyLabel(typeof rule.target === "string" ? rule.target : policyValue(rule.target), state)}
              ariaLabel="本地规则目标"
              onValueChange={(value) => updateRule(rule.id, { target: parsePolicy(value, state) })}
            />
            <div className="flex items-center justify-end gap-1">
              <Switch checked={rule.enabled !== false} onCheckedChange={(enabled) => updateRule(rule.id, { enabled })} aria-label={`启用本地规则 ${rule.value || rule.id}`} />
              <IconButton type="button" label="上移本地规则" variant="ghost" disabled={index === 0} onClick={() => setLoonConfig({ ...loonConfig, rules: moveItem(loonConfig.rules, index, -1) })}><ChevronUp className="h-4 w-4" /></IconButton>
              <IconButton type="button" label="下移本地规则" variant="ghost" disabled={index === loonConfig.rules.length - 1} onClick={() => setLoonConfig({ ...loonConfig, rules: moveItem(loonConfig.rules, index, 1) })}><ChevronDown className="h-4 w-4" /></IconButton>
              <IconButton type="button" label="删除本地规则" variant="ghost" onClick={() => setLoonConfig({ ...loonConfig, rules: loonConfig.rules.filter((item) => item.id !== rule.id) })}><Trash2 className="h-4 w-4" /></IconButton>
            </div>
            {rule.type === "IP-CIDR" || rule.type === "IP-CIDR6" || rule.type === "IP-ASN" ? (
              <div className="flex items-center gap-2 text-xs text-white/55">
                <Switch checked={rule.noResolve === true} onCheckedChange={(noResolve) => updateRule(rule.id, { noResolve })} aria-label={`规则 ${rule.value || rule.id} 使用 no-resolve`} />
                no-resolve
              </div>
            ) : null}
          </div>
        ))}
        </div>

        <div className="space-y-2">
        <h3 className="text-sm font-semibold">最终兜底策略</h3>
        <LoonPolicySelect
          value={typeof loonConfig.finalTarget === "string" ? loonConfig.finalTarget : policyValue(loonConfig.finalTarget)}
          getOptions={getPolicyOptions}
          label={policyLabel(typeof loonConfig.finalTarget === "string" ? loonConfig.finalTarget : policyValue(loonConfig.finalTarget), state)}
          ariaLabel="最终兜底策略"
          className="max-w-full sm:max-w-sm"
          onValueChange={(value) => setLoonConfig({ ...loonConfig, finalTarget: parsePolicy(value, state) })}
        />
        </div>
        </div>}
      </section>

      <section className="min-w-0">
        <SectionHeader
          icon={Settings2}
          title="基础"
          isExpanded={expandedSections.has("base")}
          onToggle={() => toggleSection("base")}
        />
        {expandedSections.has("base") && <div className="mt-2 space-y-2 pl-6">
          <div className="flex min-w-0 flex-col gap-2 rounded-md border border-cyan-500/20 bg-cyan-500/5 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="text-xs font-medium text-cyan-100">Youko分流模板 (Loon)</div>
              <div className="mt-1 text-xs leading-5 text-white/45">导入策略组、图标、远程规则集和本地规则。</div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0 gap-1.5 border-cyan-500/30 text-cyan-100 hover:bg-cyan-500/10"
              onClick={() => setLoonConfig(createYoukoLoonConfig())}
            >
              <WandSparkles className="h-3.5 w-3.5" />
              导入模板
            </Button>
          </div>
          <h3 className="text-sm font-semibold">Loon 基础设置</h3>
          <Textarea value={loonConfig.generalText} onChange={(event) => setLoonConfig({ ...loonConfig, generalText: event.target.value })} className="min-h-20 font-mono text-xs" aria-label="Loon General 配置" />
        </div>}
      </section>
    </div>
  );
}
