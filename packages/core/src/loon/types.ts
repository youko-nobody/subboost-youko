export type LoonProxyGroupType = "select" | "url-test" | "fallback" | "load-balance";
export type LoonRuleType =
  | "DOMAIN"
  | "DOMAIN-SUFFIX"
  | "DOMAIN-KEYWORD"
  | "IP-CIDR"
  | "IP-CIDR6"
  | "IP-ASN"
  | "GEOIP"
  | "URL-REGEX"
  | "USER-AGENT"
  | "DEST-PORT"
  | "SRC-PORT";

export type LoonPolicyRef =
  | { kind: "node"; name: string }
  | { kind: "group"; id: string }
  | { kind: "direct" }
  | { kind: "reject" };

export interface LoonProxyGroup {
  id: string;
  name: string;
  type: LoonProxyGroupType;
  policies: LoonPolicyRef[];
  icon?: string;
  enabled?: boolean;
  includeRegex?: string;
  excludeRegex?: string;
  url?: string;
  interval?: number;
  tolerance?: number;
  maxTimeout?: number;
  algorithm?: "random" | "pcc" | "round-robin";
}

export interface LoonRemoteRule {
  id: string;
  name: string;
  url: string;
  target: LoonPolicyRef | string;
  enabled?: boolean;
}

export interface LoonRule {
  id: string;
  type: LoonRuleType;
  value: string;
  target: LoonPolicyRef | string;
  noResolve?: boolean;
  enabled?: boolean;
}

export interface LoonConfig {
  generalText: string;
  proxyGroups: LoonProxyGroup[];
  remoteRules: LoonRemoteRule[];
  rules: LoonRule[];
  finalTarget: LoonPolicyRef | string;
  testUrl: string;
  testInterval: number;
}

export interface LoonSkippedNode {
  name: string;
  type: string;
  reason: string;
}

export interface LoonGenerationResult {
  content: string;
  proxyCount: number;
  policyGroupCount: number;
  ruleCount: number;
  skippedNodes: LoonSkippedNode[];
}
