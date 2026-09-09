export type SurgeProxyGroupType = "select" | "url-test" | "fallback" | "load-balance" | "smart";

export type SurgeRuleType =
  | "DOMAIN"
  | "DOMAIN-SUFFIX"
  | "DOMAIN-KEYWORD"
  | "IP-CIDR"
  | "IP-CIDR6"
  | "GEOIP"
  | "PROCESS-NAME"
  | "DST-PORT"
  | "SRC-PORT"
  | "FINAL";

export type SurgePolicyRef =
  | { kind: "node"; name: string }
  | { kind: "group"; id: string }
  | { kind: "direct" }
  | { kind: "reject" };

export interface SurgeRegionPolicyGroup {
  id: string;
  name: string;
  enabled: boolean;
  type: SurgeProxyGroupType;
  keywords: string[];
  includeInProxy: boolean;
  policyPriority?: string;
}

export interface SurgeProxyGroup {
  id: string;
  name: string;
  type: SurgeProxyGroupType;
  policies: SurgePolicyRef[];
  icon?: string;
  includeAllNodes?: boolean;
  enabled?: boolean;
  url?: string;
  interval?: number;
  timeout?: number;
  tolerance?: number;
  policyPriority?: string;
}

export interface SurgeRuleSet {
  id: string;
  name: string;
  url: string;
  target: SurgePolicyRef | string;
  noResolve?: boolean;
  enabled?: boolean;
}

export interface SurgeRule {
  id: string;
  type: SurgeRuleType;
  value?: string;
  target: SurgePolicyRef | string;
  noResolve?: boolean;
  enabled?: boolean;
}

export interface SurgeConfig {
  generalText: string;
  proxyGroups: SurgeProxyGroup[];
  regionGroups: SurgeRegionPolicyGroup[];
  ruleSets: SurgeRuleSet[];
  rules: SurgeRule[];
  ruleOrder?: string[];
  finalTarget: SurgePolicyRef | string;
  testUrl: string;
  testInterval: number;
  managedConfigEnabled?: boolean;
  managedConfigUrl?: string;
}

export interface SurgeSkippedNode {
  name: string;
  type: string;
  reason: string;
}

export interface SurgeGenerationResult {
  content: string;
  proxyCount: number;
  policyGroupCount: number;
  ruleCount: number;
  skippedNodes: SurgeSkippedNode[];
}
