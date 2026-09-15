"use client";

import * as React from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Globe2,
  Layers3,
  ListTree,
  Network,
  Route,
  Server,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { ProtocolBadge } from "@subboost/ui/components/ui/protocol-badge";
import { SafeImage } from "@subboost/ui/components/ui/safe-image";
import { cn } from "@subboost/ui/lib/utils";
import { useConfigStore } from "@subboost/ui/store/config-store";
import {
  generateSurgeProfile,
  type SurgePolicyRef,
  type SurgeProxyGroup,
  type SurgeRegionPolicyGroup,
  type SurgeRule,
  type SurgeRuleSet,
} from "@subboost/core/surge";
import { resolveNodeNameFilter } from "@subboost/core/subscription/node-name-filter";

type SurgeGroupView =
  | {
      kind: "proxy";
      group: SurgeProxyGroup;
    }
  | {
      kind: "region";
      group: SurgeRegionPolicyGroup;
    };

type SurgeRuleView =
  | {
      kind: "rule-set";
      key: string;
      rule: SurgeRuleSet;
    }
  | {
      kind: "rule";
      key: string;
      rule: SurgeRule;
    };

const GROUP_TYPE_LABELS: Record<string, string> = {
  select: "手动选择",
  "url-test": "自动测速",
  fallback: "故障切换",
  "load-balance": "负载均衡",
  smart: "Smart 智能",
};

const SUPPORTED_SURGE_NODE_TYPES = new Set([
  "ss",
  "vmess",
  "trojan",
  "http",
  "https",
  "socks5",
  "snell",
  "hysteria2",
  "tuic",
  "anytls",
  "ssh",
  "wireguard",
]);

function getGroupTypeLabel(type: string): string {
  return GROUP_TYPE_LABELS[type] ?? type;
}

function getGroupColor(kind: SurgeGroupView["kind"]): string {
  return kind === "region"
    ? "border-amber-500/35 bg-amber-500/[0.08]"
    : "border-indigo-500/35 bg-indigo-500/[0.08]";
}

function getGroupIcon(type: string) {
  switch (type) {
    case "select":
      return <Globe2 className="h-3.5 w-3.5" />;
    case "url-test":
      return <Sparkles className="h-3.5 w-3.5" />;
    case "fallback":
      return <ShieldCheck className="h-3.5 w-3.5" />;
    case "load-balance":
      return <Network className="h-3.5 w-3.5" />;
    case "smart":
      return <Sparkles className="h-3.5 w-3.5" />;
    default:
      return <Network className="h-3.5 w-3.5" />;
  }
}

function getValidIconSrc(value: string | undefined): string | undefined {
  const trimmed = value?.trim() ?? "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : undefined;
}

function policyRefLabel(
  ref: SurgePolicyRef | string,
  groupNameById: Map<string, string>,
): string {
  if (typeof ref === "string") return ref;
  if (ref.kind === "direct") return "DIRECT";
  if (ref.kind === "reject") return "REJECT";
  if (ref.kind === "group") return groupNameById.get(ref.id) ?? ref.id;
  return ref.name;
}

function policyRefKind(ref: SurgePolicyRef | string): "node" | "group" | "direct" | "reject" | "raw" {
  if (typeof ref === "string") {
    const normalized = ref.trim().toUpperCase();
    if (normalized === "DIRECT") return "direct";
    if (normalized === "REJECT") return "reject";
    return "raw";
  }
  return ref.kind;
}

function ruleTargetLabel(
  target: SurgePolicyRef | string,
  groupNameById: Map<string, string>,
): string {
  return policyRefLabel(target, groupNameById);
}

function buildOrderedRuleItems(
  ruleSets: SurgeRuleSet[],
  rules: SurgeRule[],
  preferredOrder: string[] | undefined,
): SurgeRuleView[] {
  const byKey = new Map<string, SurgeRuleView>();
  for (const ruleSet of ruleSets) {
    if (ruleSet.enabled === false) continue;
    byKey.set(`rule-set:${ruleSet.id}`, {
      kind: "rule-set",
      key: `rule-set:${ruleSet.id}`,
      rule: ruleSet,
    });
  }
  for (const rule of rules) {
    if (rule.enabled === false || rule.type === "FINAL") continue;
    byKey.set(`rule:${rule.id}`, {
      kind: "rule",
      key: `rule:${rule.id}`,
      rule,
    });
  }

  const result: SurgeRuleView[] = [];
  const used = new Set<string>();
  for (const key of preferredOrder ?? []) {
    const item = byKey.get(key);
    if (!item || used.has(key)) continue;
    used.add(key);
    result.push(item);
  }
  for (const item of byKey.values()) {
    if (used.has(item.key)) continue;
    used.add(item.key);
    result.push(item);
  }
  return result;
}

function PreviewMetric({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
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

function PreviewSectionHeader({
  icon,
  title,
  count,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  detail?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs font-medium text-white/65">
      <span className="flex min-w-0 items-center gap-2">
        {icon}
        <span>{title}</span>
        <span className="text-[10px] text-white/40">({count})</span>
      </span>
      {detail && (
        <span className="truncate text-[10px] font-normal text-white/35" title={detail}>
          {detail}
        </span>
      )}
    </div>
  );
}

function MemberChip({
  label,
  kind,
}: {
  label: string;
  kind: ReturnType<typeof policyRefKind>;
}) {
  const colorClass =
    kind === "direct"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200/85"
      : kind === "reject"
        ? "border-rose-400/20 bg-rose-500/10 text-rose-200/85"
        : kind === "group"
          ? "border-indigo-400/20 bg-indigo-500/10 text-indigo-200/85"
          : "border-white/10 bg-white/[0.05] text-white/65";

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded border px-1.5 py-1 text-[10px]",
        colorClass,
      )}
      title={label}
    >
      <span className="max-w-[15rem] truncate">{label}</span>
    </span>
  );
}

function ProxyGroupCard({
  view,
  groupNameById,
  memberRefs,
  expanded,
  onToggle,
}: {
  view: SurgeGroupView;
  groupNameById: Map<string, string>;
  memberRefs: Array<SurgePolicyRef | string>;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isRegion = view.kind === "region";
  const group = view.group;
  const regionGroup = view.kind === "region" ? view.group : undefined;
  const hasDetails = view.kind === "region"
    ? view.group.keywords.length > 0
    : memberRefs.length > 0;
  const icon = view.kind === "proxy" ? view.group.icon : undefined;

  return (
    <div className={cn("rounded-lg border transition-colors", getGroupColor(view.kind))}>
      <button
        type="button"
        onClick={onToggle}
        disabled={!hasDetails}
        className="flex w-full items-center gap-2 p-2.5 text-left disabled:cursor-default"
        aria-expanded={hasDetails ? expanded : undefined}
      >
        {hasDetails ? (
          expanded ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/60" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/60" />
          )
        ) : (
          <Layers3 className="h-3.5 w-3.5 shrink-0 text-white/35" />
        )}
        <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white/[0.06] text-white/70">
          <SafeImage
            src={getValidIconSrc(icon)}
            alt=""
            className="h-full w-full object-contain"
            referrerPolicy="no-referrer"
            fallback={isRegion ? <Globe2 className="h-3.5 w-3.5" /> : getGroupIcon(group.type)}
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium text-white/90">
            {group.name}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-white/45">
            <span>{isRegion ? "地区策略组" : "手动策略组"}</span>
            <span>·</span>
            <span>{getGroupTypeLabel(group.type)}</span>
          </span>
        </span>
        <span className="shrink-0 text-[10px] text-white/40">
          {isRegion ? `${memberRefs.length} 个匹配` : `${memberRefs.length} 个成员`}
        </span>
      </button>

      {expanded && hasDetails && (
        <div className="space-y-2 border-t border-white/10 px-3 pb-3 pt-2">
          {isRegion && regionGroup ? (
            <>
              <div className="flex flex-wrap gap-1">
                {regionGroup.keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded border border-amber-400/20 bg-amber-500/10 px-1.5 py-1 text-[10px] text-amber-100/75"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-white/45">
                <span>{regionGroup.includeInProxy ? "会加入主 Proxy 组" : "不加入主 Proxy 组"}</span>
                {regionGroup.policyPriority && (
                  <>
                    <span>·</span>
                    <span className="truncate" title={group.policyPriority}>
                      优先级 {regionGroup.policyPriority}
                    </span>
                  </>
                )}
              </div>
              {memberRefs.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {memberRefs.map((ref) => (
                    <MemberChip
                      key={typeof ref === "string" ? ref : `${ref.kind}:${ref.kind === "node" ? ref.name : ref.kind === "group" ? ref.id : ref.kind}`}
                      label={policyRefLabel(ref, groupNameById)}
                      kind={policyRefKind(ref)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-[10px] text-white/40">当前没有匹配到节点。</div>
              )}
            </>
          ) : memberRefs.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {memberRefs.map((ref) => (
                <MemberChip
                  key={typeof ref === "string" ? ref : `${ref.kind}:${ref.kind === "node" ? ref.name : ref.kind === "group" ? ref.id : ref.kind}`}
                  label={policyRefLabel(ref, groupNameById)}
                  kind={policyRefKind(ref)}
                />
              ))}
            </div>
          ) : (
            <div className="text-[10px] text-white/40">当前没有可用成员。</div>
          )}
        </div>
      )}
    </div>
  );
}

export function SurgeVisualGraph() {
  const { nodes, nodeNameFilter, surgeConfig } = useConfigStore(
    useShallow((state) => ({
      nodes: state.nodes,
      nodeNameFilter: state.nodeNameFilter,
      surgeConfig: state.surgeConfig,
    })),
  );
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(
    new Set(["proxy:proxy"]),
  );

  const effectiveNodes = React.useMemo(
    () => resolveNodeNameFilter(nodes, nodeNameFilter).effectiveNodes,
    [nodeNameFilter, nodes],
  );
  const groupNameById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const group of [...surgeConfig.proxyGroups, ...surgeConfig.regionGroups]) {
      if (group.id && group.name) map.set(group.id, group.name);
    }
    return map;
  }, [surgeConfig.proxyGroups, surgeConfig.regionGroups]);
  const groupById = React.useMemo(
    () =>
      new Map(
        [...surgeConfig.proxyGroups, ...surgeConfig.regionGroups].map((group) => [
          group.id,
          group,
        ]),
      ),
    [surgeConfig.proxyGroups, surgeConfig.regionGroups],
  );
  const generation = React.useMemo(() => {
    try {
      return {
        result: generateSurgeProfile({ nodes: effectiveNodes, config: surgeConfig }),
        error: null,
      };
    } catch (error) {
      return {
        result: null,
        error: error instanceof Error ? error.message : "Surge 配置生成失败",
      };
    }
  }, [effectiveNodes, surgeConfig]);
  const skippedNames = React.useMemo(
    () => new Set(generation.result?.skippedNodes.map((item) => item.name) ?? []),
    [generation.result],
  );

  const activeProxyGroups = React.useMemo(
    () => surgeConfig.proxyGroups.filter((group) => group.enabled !== false),
    [surgeConfig.proxyGroups],
  );
  const activeRegionGroups = React.useMemo(
    () => surgeConfig.regionGroups.filter((group) => group.enabled !== false),
    [surgeConfig.regionGroups],
  );
  const groupViews = React.useMemo<SurgeGroupView[]>(
    () => [
      ...activeProxyGroups.map((group) => ({ kind: "proxy" as const, group })),
      ...activeRegionGroups.map((group) => ({ kind: "region" as const, group })),
    ],
    [activeProxyGroups, activeRegionGroups],
  );

  const regionMatches = React.useMemo(() => {
    const result = new Map<string, string[]>();
    for (const group of activeRegionGroups) {
      const keywords = group.keywords.map((keyword) => keyword.trim().toLowerCase()).filter(Boolean);
      const matches = effectiveNodes
        .filter((node) => {
          const name = node.name.toLowerCase();
          return keywords.some((keyword) => name.includes(keyword));
        })
        .map((node) => node.name);
      result.set(group.id, Array.from(new Set(matches)));
    }
    return result;
  }, [activeRegionGroups, effectiveNodes]);

  const groupMembers = React.useMemo(() => {
    const result = new Map<string, Array<SurgePolicyRef | string>>();
    const activeRegionIds = new Set(activeRegionGroups.map((group) => group.id));
    for (const group of activeProxyGroups) {
      const policies: Array<SurgePolicyRef | string> = [];
      if (group.id === "proxy") {
        for (const region of activeRegionGroups) {
          if (region.includeInProxy !== false) policies.push({ kind: "group", id: region.id });
        }
      }
      for (const policy of group.policies) {
        if (policy.kind === "group" && activeRegionIds.has(policy.id)) continue;
        policies.push(policy);
      }
      if (group.includeAllNodes) {
        for (const node of effectiveNodes) {
          policies.push({ kind: "node", name: node.name });
        }
      }
      const seen = new Set<string>();
      result.set(
        group.id,
        policies.filter((policy) => {
          const key = typeof policy === "string"
            ? `raw:${policy}`
            : `${policy.kind}:${policy.kind === "node" ? policy.name : policy.kind === "group" ? policy.id : policy.kind}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }),
      );
    }
    for (const group of activeRegionGroups) {
      result.set(group.id, regionMatches.get(group.id) ?? []);
    }
    return result;
  }, [activeProxyGroups, activeRegionGroups, effectiveNodes, regionMatches]);

  const orderedRules = React.useMemo(
    () =>
      buildOrderedRuleItems(
        surgeConfig.ruleSets,
        surgeConfig.rules,
        surgeConfig.ruleOrder,
      ),
    [surgeConfig.ruleOrder, surgeConfig.ruleSets, surgeConfig.rules],
  );
  const finalRules = React.useMemo(
    () => surgeConfig.rules.filter((rule) => rule.enabled !== false && rule.type === "FINAL"),
    [surgeConfig.rules],
  );
  const finalTarget = finalRules.length > 0
    ? finalRules[finalRules.length - 1].target
    : surgeConfig.finalTarget;

  const toggleGroup = (key: string) => {
    setExpandedGroups((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const enabledRulesCount = orderedRules.length + finalRules.length;
  const skippedCount = generation.result?.skippedNodes.length ?? 0;

  return (
    <div className="h-full overflow-auto p-4 space-y-3 custom-scrollbar">
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        <span className="inline-flex items-center gap-1.5 text-[10px] text-white/60">
          <span className="h-2.5 w-2.5 rounded bg-cyan-500/60" />
          节点
        </span>
        <span className="inline-flex items-center gap-1.5 text-[10px] text-white/60">
          <span className="h-2.5 w-2.5 rounded bg-indigo-500/60" />
          手动策略组
        </span>
        <span className="inline-flex items-center gap-1.5 text-[10px] text-white/60">
          <span className="h-2.5 w-2.5 rounded bg-amber-500/60" />
          地区策略组
        </span>
        <span className="inline-flex items-center gap-1.5 text-[10px] text-white/60">
          <span className="h-2.5 w-2.5 rounded bg-purple-500/60" />
          分流规则
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <PreviewMetric
          label="节点"
          value={effectiveNodes.length}
          hint={skippedCount > 0 ? `${skippedCount} 个未生成` : "全部可参与生成"}
        />
        <PreviewMetric
          label="策略组"
          value={groupViews.length}
          hint={`手动 ${activeProxyGroups.length} · 地区 ${activeRegionGroups.length}`}
        />
        <PreviewMetric
          label="远程规则"
          value={surgeConfig.ruleSets.filter((ruleSet) => ruleSet.enabled !== false).length}
          hint="RULE-SET / DOMAIN-SET"
        />
        <PreviewMetric
          label="本地规则"
          value={enabledRulesCount}
          hint={finalRules.length > 0 ? "包含 FINAL 兜底" : "使用配置中的 FINAL 兜底"}
        />
      </div>

      {generation.error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-100/85">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-300" />
          <span>{generation.error}</span>
        </div>
      )}
      {!generation.error && skippedCount > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/80">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
          <span>
            有 {skippedCount} 个节点不会写入 Surge 配置：
            {generation.result?.skippedNodes.slice(0, 4).map((item) => item.name).join("、")}
            {skippedCount > 4 ? " 等" : ""}
          </span>
        </div>
      )}
      {!generation.error && effectiveNodes.length > 0 && skippedCount === 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100/75">
          <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
          <span>当前节点都可以参与 Surge 配置生成。</span>
        </div>
      )}

      <section className="space-y-2">
        <PreviewSectionHeader
          icon={<Route className="h-3.5 w-3.5" />}
          title="策略组拓扑"
          count={groupViews.length}
          detail="地区策略组按生成顺序放在最后"
        />
        {groupViews.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-3 py-4 text-center text-[10px] text-white/40">
            尚未配置 Surge 策略组。
          </div>
        ) : (
          <div className="space-y-1.5">
            {groupViews.map((view) => {
              const key = `${view.kind}:${view.group.id}`;
              const members = groupMembers.get(view.group.id) ?? [];
              return (
                <ProxyGroupCard
                  key={key}
                  view={view}
                  groupNameById={groupNameById}
                  memberRefs={members}
                  expanded={expandedGroups.has(key)}
                  onToggle={() => toggleGroup(key)}
                />
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <PreviewSectionHeader
          icon={<ListTree className="h-3.5 w-3.5" />}
          title="分流规则顺序"
          count={enabledRulesCount}
          detail={`FINAL → ${policyRefLabel(finalTarget, groupNameById)}`}
        />
        {orderedRules.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-3 py-4 text-center text-[10px] text-white/40">
            当前没有启用的远程规则集或本地规则。
          </div>
        ) : (
          <div className="space-y-1 rounded-lg border border-white/10 bg-white/[0.03] p-2">
            {orderedRules.slice(0, 60).map((item, index) => {
              const isRuleSet = item.kind === "rule-set";
              const target = isRuleSet ? item.rule.target : item.rule.target;
              const title = isRuleSet
                ? item.rule.name || item.rule.url
                : item.rule.value || item.rule.type;
              return (
                <div
                  key={item.key}
                  className="flex min-w-0 flex-wrap items-center gap-1.5 rounded-md bg-white/[0.035] px-2 py-1.5 text-[10px]"
                >
                  <span className="w-5 shrink-0 tabular-nums text-white/35">{index + 1}.</span>
                  <span
                    className={cn(
                      "rounded border px-1.5 py-0.5 font-medium",
                      isRuleSet
                        ? "border-purple-400/20 bg-purple-500/10 text-purple-200"
                        : "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
                    )}
                  >
                    {isRuleSet ? (item.rule.resourceType === "domain-set" ? "DOMAIN-SET" : "RULE-SET") : item.rule.type}
                  </span>
                  <span className="min-w-0 max-w-[15rem] flex-1 truncate text-white/70" title={title}>
                    {title}
                  </span>
                  {(!isRuleSet && item.rule.noResolve) || (isRuleSet && item.rule.noResolve) ? (
                    <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-white/45">
                      no-resolve
                    </span>
                  ) : null}
                  <span className="max-w-[12rem] truncate rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-primary-300" title={ruleTargetLabel(target, groupNameById)}>
                    {ruleTargetLabel(target, groupNameById)}
                  </span>
                </div>
              );
            })}
            {orderedRules.length > 60 && (
              <div className="py-1 text-center text-[10px] text-white/40">
                还有 {orderedRules.length - 60} 条规则
              </div>
            )}
            <div className="flex items-center gap-1.5 border-t border-white/10 px-2 pt-2 text-[10px]">
              <span className="w-5 shrink-0 text-white/35">↳</span>
              <span className="rounded border border-rose-400/20 bg-rose-500/10 px-1.5 py-0.5 font-medium text-rose-200">
                FINAL
              </span>
              <span className="text-white/50">未命中以上规则时</span>
              <span className="max-w-[12rem] truncate rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-primary-300" title={policyRefLabel(finalTarget, groupNameById)}>
                {policyRefLabel(finalTarget, groupNameById)}
              </span>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <PreviewSectionHeader
          icon={<Server className="h-3.5 w-3.5" />}
          title="节点列表"
          count={effectiveNodes.length}
          detail={effectiveNodes.length > 50 ? "仅展示前 50 个" : undefined}
        />
        {effectiveNodes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-3 py-4 text-center text-[10px] text-white/40">
            添加订阅或节点后，这里会显示 Surge 节点。
          </div>
        ) : (
          <div className="space-y-1 rounded-lg bg-white/[0.03] p-2">
            {effectiveNodes.slice(0, 50).map((node, index) => {
              const nodeType = node.type.toLowerCase();
              const skipped = skippedNames.has(node.name);
              return (
                <div
                  key={`${node.name}:${index}`}
                  className={cn(
                    "flex min-w-0 items-center gap-2 rounded-md px-2 py-1 text-[10px]",
                    skipped ? "bg-amber-500/[0.06]" : "hover:bg-white/[0.04]",
                  )}
                >
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      skipped
                        ? "bg-amber-400"
                        : SUPPORTED_SURGE_NODE_TYPES.has(nodeType)
                          ? "bg-cyan-400"
                          : "bg-white/30",
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate text-white/80" title={node.name}>
                    {node.name}
                  </span>
                  <ProtocolBadge type={node.type} className="shrink-0" />
                  {skipped && <span className="text-[10px] text-amber-200/70">未生成</span>}
                </div>
              );
            })}
            {effectiveNodes.length > 50 && (
              <div className="py-1 text-center text-[10px] text-white/40">
                还有 {effectiveNodes.length - 50} 个节点
              </div>
            )}
          </div>
        )}
      </section>

      {effectiveNodes.length === 0 && groupViews.length === 0 && orderedRules.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-white/45">
          <Network className="mb-3 h-10 w-10 opacity-50" />
          <p className="text-sm">添加节点、策略组或规则后显示 Surge 可视化预览</p>
        </div>
      )}
    </div>
  );
}
