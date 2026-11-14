/* eslint-disable react/no-children-prop -- The list accepts a render function, not ReactNode children. */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SurgePolicyMembers } from "./surge-policy-members";
import type { SurgePolicyRef } from "@subboost/core/surge";

describe("SurgePolicyMembers", () => {
  it("bounds rendered rows for 1000 members while preserving their original indices", () => {
    const policies: SurgePolicyRef[] = Array.from({ length: 1000 }, (_, index) => ({
      kind: "node", name: `Node ${index}`,
    }));
    const renderMember = vi.fn((policy: SurgePolicyRef, index: number) => (
      React.createElement("button", { key: index }, `${index}:${policy.kind === "node" ? policy.name : ""}`)
    ));
    const html = renderToStaticMarkup(React.createElement(SurgePolicyMembers, {
      policies, children: renderMember,
    }));
    expect(renderMember.mock.calls.length).toBeGreaterThan(0);
    expect(renderMember.mock.calls.length).toBeLessThan(30);
    for (const [policy, index] of renderMember.mock.calls) expect(policy).toBe(policies[index]);
    expect(html).toContain("0:Node 0");
    expect(html).not.toContain("Node 999");
    expect(policies).toHaveLength(1000);
  });

  it("renders every member in a small group in its existing order", () => {
    const policies: SurgePolicyRef[] = [{ kind: "reject" }, { kind: "direct" }];
    const renderMember = vi.fn((policy: SurgePolicyRef, index: number) => (
      React.createElement("span", { key: index }, policy.kind)
    ));
    const html = renderToStaticMarkup(React.createElement(SurgePolicyMembers, {
      policies, children: renderMember,
    }));
    expect(html.indexOf("reject")).toBeLessThan(html.indexOf("direct"));
    expect(renderMember).toHaveBeenCalledTimes(2);
    expect(html).not.toContain("data-index");
  });
});
