import { describe, expect, it } from "vitest";
import { sourceTypeInfo, templates } from "./constants";
import { getTemplateList } from "@subboost/core/templates";

describe("quick mode constants", () => {
  it("defines all supported source type labels and placeholders", () => {
    expect(Object.keys(sourceTypeInfo).sort()).toEqual(["nodes", "url", "yaml"]);
    expect(sourceTypeInfo.url).toMatchObject({
      label: "订阅链接",
      placeholder: "https://example.com/sub?token=xxx",
    });
    expect(sourceTypeInfo.yaml.placeholder).toContain("proxies:");
    expect(sourceTypeInfo.nodes.placeholder).toContain("hysteria2");
  });

  it("keeps the quick template picker ordered from blank to user routing", () => {
    expect(templates.map((item) => item.id)).toEqual(["blank", "minimal", "standard", "full", "my-routing"]);
    expect(templates.map((item) => item.name)).toEqual(["空白配置", "精简版", "标准版", "完整版", "Youko分流模板"]);
    expect(templates[0]).toMatchObject({ groups: 0, rules: 0 });
    expect(templates[1].groups).toBeLessThan(templates[3].groups);
    expect(templates[1].rules).toBeLessThan(templates[3].rules);
    expect(templates[4]).toMatchObject({ groups: 10, rules: 69 });
    const currentCounts = new Map(
      getTemplateList().map((template) => [template.id, [template.groupCount, template.ruleCount]])
    );
    for (const template of templates) {
      expect([template.groups, template.rules]).toEqual(currentCounts.get(template.id));
    }
  });
});
