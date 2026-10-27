"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, List, Network, Plus, Settings2, Trash2 } from "lucide-react";
import { Button } from "@subboost/ui/components/ui/button";
import { Input } from "@subboost/ui/components/ui/input";
import { IconButton } from "@subboost/ui/components/ui/icon-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@subboost/ui/components/ui/select";
import { Textarea } from "@subboost/ui/components/ui/textarea";
import { Switch } from "@subboost/ui/components/ui/switch";
import { useConfigStore, type ConfigState } from "@subboost/ui/store/config-store";
import type { LoonPolicyRef, LoonProxyGroupType, LoonRuleType } from "@subboost/core/loon";
import { InputSection } from "./advanced-mode/sections/input-section";
import { NodeManagementSection } from "./advanced-mode/sections/node-management-section";
import { SectionHeader } from "./advanced-mode/section-header";

const RULE_TYPES: LoonRuleType[] = ["DOMAIN", "DOMAIN-SUFFIX", "DOMAIN-KEYWORD", "DOMAIN-WILDCARD", "URL-REGEX", "USER-AGENT", "IP-CIDR", "IP-CIDR6", "IP-ASN", "GEOIP", "DEST-PORT", "SRC-PORT"];
type LoonSectionKey = "input" | "nodes" | "groups" | "rules" | "base";

function newId(prefix: string): string {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

function policyValue(policy: LoonPolicyRef): string {
  if (policy.kind === "direct") return "direct";
  if (policy.kind === "reject") return "reject";
  return `${policy.kind}:${policy.kind === "group" ? policy.id : policy.name}`;
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

function policyOptions(state: ConfigState) {
  return [
    { value: "direct", label: "DIRECT 直连" },
    { value: "reject", label: "REJECT 拒绝" },
    ...state.loonConfig.proxyGroups.map((group) => ({ value: `group:${group.id}`, label: `策略组 · ${group.name}` })),
    ...state.nodes.map((node) => ({ value: `node:${node.name}`, label: `节点 · ${node.name}` })),
  ];
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function LoonMode() {
  const state = useConfigStore();
  const { loonConfig, nodes, setLoonConfig } = state;
  const targets = policyOptions(state);
  const [expandedSections, setExpandedSections] = React.useState<Set<LoonSectionKey>>(
    new Set(["input", "nodes", "groups", "rules", "base"]),
  );
  const toggleSection = (section: LoonSectionKey) => {
    setExpandedSections((current) => {
      const next = new Set(current);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const updateGroup = (id: string, patch: Record<string, unknown>) => setLoonConfig({
    ...loonConfig,
    proxyGroups: loonConfig.proxyGroups.map((group) => group.id === id ? { ...group, ...patch } : group),
  });
  const updateRemoteRule = (id: string, patch: Record<string, unknown>) => setLoonConfig({
    ...loonConfig,
    remoteRules: loonConfig.remoteRules.map((rule) => rule.id === id ? { ...rule, ...patch } : rule),
  });
  const updateRule = (id: string, patch: Record<string, unknown>) => setLoonConfig({
    ...loonConfig,
    rules: loonConfig.rules.map((rule) => rule.id === id ? { ...rule, ...patch } : rule),
  });

  const addGroup = () => setLoonConfig({
    ...loonConfig,
    proxyGroups: [{ id: newId("loon-group"), name: "新策略组", type: "select", policies: [] }, ...loonConfig.proxyGroups],
  });
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
        {expandedSections.has("groups") && <div className="mt-2 space-y-3 pl-6">
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={addGroup}><Plus className="mr-1 h-4 w-4" />添加策略组</Button>
          </div>
        {loonConfig.proxyGroups.map((group, index) => (
          <div key={group.id} className="min-w-0 space-y-2 border-b border-white/10 pb-3">
            <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_auto]">
              <Input value={group.name} onChange={(event) => updateGroup(group.id, { name: event.target.value })} aria-label="策略组名称" />
              <Select value={group.type} onValueChange={(value) => updateGroup(group.id, { type: value as LoonProxyGroupType })}>
                <SelectTrigger aria-label="策略组类型"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="select">手动选择</SelectItem>
                  <SelectItem value="url-test">自动测速</SelectItem>
                  <SelectItem value="fallback">故障转移</SelectItem>
                  <SelectItem value="load-balance">负载均衡</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center justify-end gap-1">
                <Switch checked={group.enabled !== false} onCheckedChange={(enabled) => updateGroup(group.id, { enabled })} aria-label={`启用策略组 ${group.name}`} />
                <IconButton type="button" label="上移策略组" variant="ghost" disabled={index === 0} onClick={() => setLoonConfig({ ...loonConfig, proxyGroups: moveItem(loonConfig.proxyGroups, index, -1) })}><ChevronUp className="h-4 w-4" /></IconButton>
                <IconButton type="button" label="下移策略组" variant="ghost" disabled={index === loonConfig.proxyGroups.length - 1} onClick={() => setLoonConfig({ ...loonConfig, proxyGroups: moveItem(loonConfig.proxyGroups, index, 1) })}><ChevronDown className="h-4 w-4" /></IconButton>
                <IconButton type="button" label="删除策略组" variant="ghost" onClick={() => setLoonConfig({ ...loonConfig, proxyGroups: loonConfig.proxyGroups.filter((item) => item.id !== group.id) })}><Trash2 className="h-4 w-4" /></IconButton>
              </div>
            </div>
            <Textarea
              value={group.policies.map((policy) => policy.kind === "node" ? policy.name : policy.kind === "group" ? `@${loonConfig.proxyGroups.find((item) => item.id === policy.id)?.name ?? policy.id}` : policy.kind.toUpperCase()).join("\n")}
              onChange={(event) => {
                const policies = event.target.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).flatMap((line): LoonPolicyRef[] => {
                  if (line.toUpperCase() === "DIRECT") return [{ kind: "direct" as const }];
                  if (line.toUpperCase() === "REJECT") return [{ kind: "reject" as const }];
                  if (line.startsWith("@")) {
                    const match = loonConfig.proxyGroups.find((item) => item.name === line.slice(1));
                    return match ? [{ kind: "group" as const, id: match.id }] : [];
                  }
                  return nodes.some((node) => node.name === line) ? [{ kind: "node" as const, name: line }] : [];
                });
                updateGroup(group.id, { policies });
              }}
              placeholder="每行一个成员：节点名称、@策略组名称、DIRECT 或 REJECT"
              className="min-h-20 font-mono text-xs"
              aria-label={`${group.name} 策略组成员`}
            />
            <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
              <Input value={group.includeRegex || ""} onChange={(event) => updateGroup(group.id, { includeRegex: event.target.value })} placeholder="包含节点正则（可选）" aria-label="包含节点正则" />
              <Input value={group.excludeRegex || ""} onChange={(event) => updateGroup(group.id, { excludeRegex: event.target.value })} placeholder="排除节点正则（可选）" aria-label="排除节点正则" />
            </div>
            {group.type !== "select" && (
              <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                <Input value={group.url || loonConfig.testUrl} onChange={(event) => updateGroup(group.id, { url: event.target.value })} placeholder="测速 URL" aria-label="测速 URL" />
                <Input type="number" min={1} value={group.interval || loonConfig.testInterval} onChange={(event) => updateGroup(group.id, { interval: Number(event.target.value) || loonConfig.testInterval })} aria-label="测速间隔秒数" />
                {group.type === "url-test" && <Input type="number" min={0} value={group.tolerance ?? 0} onChange={(event) => updateGroup(group.id, { tolerance: Number(event.target.value) || 0 })} placeholder="切换容差（毫秒）" aria-label="切换容差毫秒" />}
                {group.type !== "url-test" && <Input type="number" min={1} value={group.maxTimeout ?? 3000} onChange={(event) => updateGroup(group.id, { maxTimeout: Number(event.target.value) || 3000 })} placeholder="最大测速超时（毫秒）" aria-label="最大测速超时毫秒" />}
                {group.type === "load-balance" && (
                  <Select value={group.algorithm || "pcc"} onValueChange={(value) => updateGroup(group.id, { algorithm: value })}>
                    <SelectTrigger aria-label="负载均衡算法"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="random">Random 随机</SelectItem>
                      <SelectItem value="pcc">PCC 主机粘性</SelectItem>
                      <SelectItem value="round-robin">Round-Robin 轮询</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>
        ))}
        </div>}
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
            <Select value={typeof rule.target === "string" ? rule.target : policyValue(rule.target)} onValueChange={(value) => updateRemoteRule(rule.id, { target: parsePolicy(value, state) })}>
              <SelectTrigger aria-label="远程规则目标"><SelectValue /></SelectTrigger>
              <SelectContent>{targets.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
            </Select>
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
            <Select value={typeof rule.target === "string" ? rule.target : policyValue(rule.target)} onValueChange={(value) => updateRule(rule.id, { target: parsePolicy(value, state) })}>
              <SelectTrigger aria-label="本地规则目标"><SelectValue /></SelectTrigger>
              <SelectContent>{targets.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
            </Select>
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
        <Select value={typeof loonConfig.finalTarget === "string" ? loonConfig.finalTarget : policyValue(loonConfig.finalTarget)} onValueChange={(value) => setLoonConfig({ ...loonConfig, finalTarget: parsePolicy(value, state) })}>
          <SelectTrigger className="max-w-full sm:max-w-sm" aria-label="最终兜底策略"><SelectValue /></SelectTrigger>
          <SelectContent>{targets.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
        </Select>
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
          <h3 className="text-sm font-semibold">Loon 基础设置</h3>
          <Textarea value={loonConfig.generalText} onChange={(event) => setLoonConfig({ ...loonConfig, generalText: event.target.value })} className="min-h-20 font-mono text-xs" aria-label="Loon General 配置" />
        </div>}
      </section>
    </div>
  );
}
