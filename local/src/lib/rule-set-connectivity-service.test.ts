import { describe, expect, it, vi } from "vitest";
import { checkRuleSetConnectivityForConfig } from "./rule-set-connectivity-service";

function configWithRuleSet(overrides: Record<string, unknown> = {}) {
  return {
    template: "blank",
    ruleProviderBaseUrl: "https://rules.example/base",
    customRuleSets: [
      {
        id: "one",
        name: "One",
        behavior: "domain",
        format: "yaml",
        path: "https://rules.example/one.yaml",
        target: "DIRECT",
      },
    ],
    ...overrides,
  };
}

describe("rule set connectivity service", () => {
  it("checks generated rule-provider URLs with a HEAD probe", async () => {
    const probeUrl = vi.fn(async (request) => ({
      ok: true as const,
      method: request.method,
      status: 200,
      headers: {
        "content-type": "application/yaml",
        "content-length": "1024",
      },
      finalUrl: request.url,
    }));

    const result = await checkRuleSetConnectivityForConfig(
      { config: configWithRuleSet(), nodes: [] },
      { probeUrl }
    );

    expect(probeUrl).toHaveBeenCalledTimes(1);
    expect(probeUrl).toHaveBeenCalledWith(expect.objectContaining({
      url: "https://rules.example/one.yaml",
      method: "HEAD",
      timeoutMs: 8000,
    }));
    expect(result).toMatchObject({
      status: "healthy",
      total: 1,
      checkedCount: 1,
      okCount: 1,
      failedCount: 0,
      skippedCount: 0,
      results: [
        {
          id: "one",
          name: "One",
          source: "custom",
          result: "ok",
          statusCode: 200,
          contentType: "application/yaml",
          contentLengthBytes: 1024,
        },
      ],
    });
  });

  it("falls back to GET when HEAD is not accepted", async () => {
    const probeUrl = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        method: "HEAD",
        status: 405,
        headers: {},
        finalUrl: "https://rules.example/one.yaml",
      })
      .mockResolvedValueOnce({
        ok: true,
        method: "GET",
        status: 200,
        headers: { "content-type": "text/plain" },
        finalUrl: "https://rules.example/one.yaml",
      });

    const result = await checkRuleSetConnectivityForConfig(
      { config: configWithRuleSet(), nodes: [] },
      { probeUrl }
    );

    expect(probeUrl).toHaveBeenNthCalledWith(1, expect.objectContaining({ method: "HEAD" }));
    expect(probeUrl).toHaveBeenNthCalledWith(2, expect.objectContaining({ method: "GET" }));
    expect(result).toMatchObject({
      status: "healthy",
      okCount: 1,
      results: [{ id: "one", result: "ok", method: "GET", statusCode: 200 }],
    });
  });

  it("does not retry security failures with GET", async () => {
    const probeUrl = vi.fn(async () => ({
      ok: false as const,
      method: "HEAD" as const,
      error: "禁止访问本机或内网地址",
      publicReason: "禁止访问本机或内网地址",
      errorCategory: "security",
    }));

    const result = await checkRuleSetConnectivityForConfig(
      { config: configWithRuleSet(), nodes: [] },
      { probeUrl }
    );

    expect(probeUrl).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      status: "failed",
      failedCount: 1,
      results: [
        {
          id: "one",
          result: "failed",
          errorCategory: "security",
          publicReason: "禁止访问本机或内网地址",
        },
      ],
    });
  });

  it("reports empty and invalid generated rule-provider configs clearly", async () => {
    const probeUrl = vi.fn();
    await expect(
      checkRuleSetConnectivityForConfig({ config: { template: "blank" }, nodes: [] }, { probeUrl })
    ).resolves.toMatchObject({
      status: "degraded",
      total: 0,
      message: "当前配置没有生成远程规则集。",
    });
    expect(probeUrl).not.toHaveBeenCalled();

    await expect(
      checkRuleSetConnectivityForConfig(
        { config: { template: "blank", dnsYaml: "[]" }, nodes: [] },
        { probeUrl }
      )
    ).resolves.toMatchObject({
      status: "failed",
      total: 1,
      failedCount: 1,
      results: [{ id: "config-generation", result: "failed" }],
    });
  });
});
