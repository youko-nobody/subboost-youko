import type {
  BuiltinRuleEdits,
  CustomProxyGroup,
  CustomRule,
  CustomRuleSet,
  LoadBalanceStrategy,
  ProxyGroupAdvancedConfig,
  ProxyGroupGroupType,
  ProxyGroupRuleTarget,
  TemplateType,
} from "./config";

// 中转代理组（使用 dialer-proxy 语法）
export interface DialerProxyGroup {
  id: string;
  enabled?: boolean; // 默认启用；停用后不会写入配置
  name: string; // 组名，如 "美国中转"
  icon?: string; // 远程图标 URL
  relayNodes: string[]; // 用于中转的节点名称列表
  type: ProxyGroupGroupType; // 组类型
  strategy?: LoadBalanceStrategy; // 负载均衡策略，仅 type=load-balance 时生效
  targetNodes: string[]; // 使用此中转的落地节点名称列表
}

export type SubBoostTemplateConfig = {
  schema?: "subboost-template-config/v1";
  template: TemplateType;
  enabledProxyGroups: string[];
  hiddenProxyGroups?: string[];
  customProxyGroups: CustomProxyGroup[];
  proxyGroupAdvanced?: Record<string, ProxyGroupAdvancedConfig>;
  proxyGroupAdvancedModeEnabled?: boolean;
  customRuleSets: CustomRuleSet[];
  builtinRuleEdits?: BuiltinRuleEdits;
  customRules: CustomRule[];
  ruleOrder?: string[];
  fallbackPolicyTarget?: ProxyGroupRuleTarget;
  cnIpNoResolve?: boolean;
  experimentalCnUseCnRuleSet?: boolean;
  dialerProxyGroups: DialerProxyGroup[];
  proxyGroupNameOverrides?: Record<string, string>;
  dnsYaml: string;
  mixedPort: number;
  allowLan: boolean;
  testUrl: string;
  testInterval: number;
  ruleProviderBaseUrl: string;
  exposeSubscriptionUserInfo?: boolean;
};
