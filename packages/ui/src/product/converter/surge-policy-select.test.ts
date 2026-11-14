import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  open: false,
  selectProps: {} as Record<string, any>,
  item: vi.fn(),
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof React>("react");
  return {
    ...actual,
    useState: () => [mocks.open, (value: boolean) => { mocks.open = value; }],
  };
});

vi.mock("@subboost/ui/components/ui/select", () => ({
  Select: (props: any) => {
    mocks.selectProps = props;
    return React.createElement("div", null, props.children);
  },
  SelectTrigger: (props: any) => React.createElement("button", null, props.children),
  SelectValue: (props: any) => React.createElement("span", null, props.children ?? props.placeholder),
  SelectContent: (props: any) => React.createElement("div", null, props.children),
  SelectItem: (props: any) => {
    mocks.item(props);
    return React.createElement("span", null, props.children);
  },
}));

import { SurgePolicySelect, type SurgePolicyOption } from "./surge-policy-select";

const options: SurgePolicyOption[] = [
  { value: "direct", label: "DIRECT" },
  { value: "reject", label: "REJECT" },
  { value: "group:disabled", label: "Disabled group", disabled: true },
  ...Array.from({ length: 1000 }, (_, index) => ({ value: `node:${index}`, label: `Node ${index}` })),
];

describe("SurgePolicySelect", () => {
  beforeEach(() => {
    mocks.open = false;
    vi.clearAllMocks();
  });

  it("shows the selected label without mounting any of 1000 node options while closed", () => {
    const html = renderToStaticMarkup(React.createElement(SurgePolicySelect, {
      value: "node:999", options, onValueChange: vi.fn(),
    }));
    expect(html).toContain("Node 999");
    expect(mocks.item).not.toHaveBeenCalled();
  });

  it("loads all choices on opening, preserves disabled policies, and releases them on closing", () => {
    const onValueChange = vi.fn();
    const render = () => renderToStaticMarkup(React.createElement(SurgePolicySelect, {
      value: "direct", options, onValueChange,
    }));
    render();
    mocks.selectProps.onOpenChange(true);
    const html = render();
    expect(html).toContain("Node 999");
    expect(mocks.item).toHaveBeenCalledTimes(options.length);
    expect(mocks.item).toHaveBeenCalledWith(expect.objectContaining({ value: "group:disabled", disabled: true }));
    mocks.selectProps.onValueChange("node:999");
    expect(onValueChange).toHaveBeenCalledWith("node:999");
    mocks.item.mockClear();
    mocks.selectProps.onOpenChange(false);
    render();
    expect(mocks.item).not.toHaveBeenCalled();
  });

  it("retains a missing policy value and displays the placeholder for an empty value", () => {
    const render = (value: string) => renderToStaticMarkup(React.createElement(SurgePolicySelect, {
      value, options: [], onValueChange: vi.fn(), placeholder: "Choose a policy",
    }));
    expect(render("raw:Existing policy")).toContain("raw:Existing policy");
    expect(render("")).toContain("Choose a policy");
  });
});
