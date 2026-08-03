/**
 * 预设模板配置
 */

import type { TemplateConfig, TemplateType } from "@subboost/core/types/config";
import { PROXY_GROUP_MODULES, getModulesForTemplate } from "../generator/proxy-groups";
import {
  MY_ROUTING_TEMPLATE_DESCRIPTION,
  MY_ROUTING_TEMPLATE_GROUP_COUNT,
  MY_ROUTING_TEMPLATE_NAME,
  MY_ROUTING_TEMPLATE_RULE_COUNT,
} from "./my-routing-template";

/**
 * 空白配置模板
 * 不启用任何内置代理组和内置规则，从零开始自定义
 */
const BLANK_TEMPLATE: TemplateConfig = {
  id: "blank",
  name: "空白配置",
  description: "不启用内置策略组和规则集，从零开始自定义",
  groups: [],
  rules: [],
  dns: {},
};

/**
 * 精简版模板
 * 适合轻度用户，基础代理组 + 国内外分流
 */
const MINIMAL_TEMPLATE: TemplateConfig = {
  id: "minimal",
  name: "精简版",
  description: "基础代理组 + 国内外分流，适合轻度用户",
  groups: getModulesForTemplate("minimal"),
  rules: getModulesForTemplate("minimal"),  // 使用同样的模块列表
  dns: {},
};

/**
 * 标准版模板
 * 完整代理组 + 常用规则，满足大部分需求
 */
const STANDARD_TEMPLATE: TemplateConfig = {
  id: "standard",
  name: "标准版",
  description: "完整代理组 + 常用规则，满足大部分需求",
  groups: getModulesForTemplate("standard"),
  rules: getModulesForTemplate("standard"),
  dns: {},
};

/**
 * 完整版模板
 * 全部功能 + 扩展规则集，适合高级用户
 */
const FULL_TEMPLATE: TemplateConfig = {
  id: "full",
  name: "完整版",
  description: "全部功能 + 扩展规则集，适合高级用户",
  groups: getModulesForTemplate("full"),
  rules: getModulesForTemplate("full"),
  dns: {},
};

const MY_ROUTING_TEMPLATE: TemplateConfig = {
  id: "my-routing",
  name: MY_ROUTING_TEMPLATE_NAME,
  description: MY_ROUTING_TEMPLATE_DESCRIPTION,
  groups: getModulesForTemplate("my-routing"),
  rules: [],
  dns: {},
};

/**
 * 所有预设模板
 */
export const TEMPLATES: Record<TemplateType, TemplateConfig> = {
  blank: BLANK_TEMPLATE,
  minimal: MINIMAL_TEMPLATE,
  standard: STANDARD_TEMPLATE,
  full: FULL_TEMPLATE,
  "my-routing": MY_ROUTING_TEMPLATE,
};

/**
 * 获取模板列表
 */
export function getTemplateList(): Array<{
  id: TemplateType;
  name: string;
  description: string;
  groupCount: number;
  ruleCount: number;
}> {
  return Object.values(TEMPLATES).map((t) => {
    // 计算规则数量
    const ruleCount = t.id === "my-routing"
      ? MY_ROUTING_TEMPLATE_RULE_COUNT
      : t.groups.reduce((acc, groupId) => {
          const proxyMod = PROXY_GROUP_MODULES.find((m) => m.id === groupId);
          return acc + (proxyMod?.rules.length || 0);
        }, 0);
    
    return {
      id: t.id,
      name: t.name,
      description: t.description,
      groupCount: t.id === "my-routing" ? MY_ROUTING_TEMPLATE_GROUP_COUNT : t.groups.length,
      ruleCount: ruleCount,
    };
  });
}

/**
 * 获取指定模板
 */
export function getTemplate(id: TemplateType): TemplateConfig {
  return TEMPLATES[id] || TEMPLATES.standard;
}

/**
 * 验证模板配置
 */
export function validateTemplateConfig(config: Partial<TemplateConfig>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.name || config.name.trim() === "") {
    errors.push("模板名称不能为空");
  }

  const allowEmptyGroups = config.id === "blank" || config.id === "my-routing";

  if ((!config.groups || config.groups.length === 0) && !allowEmptyGroups) {
    errors.push("至少需要选择一个代理组");
  }

  // 验证必须包含的代理组
  if (!allowEmptyGroups) {
    const requiredGroups = ["select", "final"];
    for (const group of requiredGroups) {
      if (!config.groups?.includes(group)) {
        errors.push(`必须包含 "${group}" 代理组`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
