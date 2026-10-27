import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LoonPolicyMemberRows } from "./loon-mode";

describe("LoonPolicyMemberRows", () => {
  it("renders only visible rows for a large node list", () => {
    const policies = Array.from({ length: 1000 }, (_, index) => ({
      kind: "node" as const,
      name: `Node ${index}`,
    }));
    const group = {
      id: "proxy",
      name: "Proxy",
      type: "select" as const,
      policies,
    };
    const html = renderToStaticMarkup(
      React.createElement(LoonPolicyMemberRows, {
        group,
        groups: [group],
        getOptions: () => [],
        onUpdate: () => undefined,
      }),
    );

    expect((html.match(/data-index=/g) ?? []).length).toBeLessThan(30);
    expect(html).toContain("Node 0");
    expect(html).not.toContain("Node 999");
  });

  it("does not build node options while a group is merely expanded", () => {
    const getOptions = vi.fn(() => [{ value: "node:Node 0", label: "Node 0" }]);
    const group = {
      id: "proxy",
      name: "Proxy",
      type: "select" as const,
      policies: [{ kind: "node" as const, name: "Node 0" }],
    };

    renderToStaticMarkup(
      React.createElement(LoonPolicyMemberRows, {
        group,
        groups: [group],
        getOptions,
        onUpdate: () => undefined,
      }),
    );

    expect(getOptions).not.toHaveBeenCalled();
  });
});
