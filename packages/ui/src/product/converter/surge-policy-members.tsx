"use client";

import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { SurgePolicyRef } from "@subboost/core/surge";

export function SurgePolicyMembers({
  policies,
  children,
}: {
  policies: SurgePolicyRef[];
  children: (policy: SurgePolicyRef, index: number) => React.ReactNode;
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const virtual = policies.length > 20;
  // TanStack Virtual measures the scroll container through its mutable instance.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer<HTMLDivElement, HTMLDivElement>({
    count: policies.length,
    enabled: virtual,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 40,
    getItemKey: (index) => {
      const policy = policies[index];
      return `${index}:${policy.kind}:${policy.kind === "node" ? policy.name : policy.kind === "group" ? policy.id : ""}`;
    },
    overscan: 6,
    initialRect: { width: 0, height: 288 },
  });

  if (!virtual) return <div className="space-y-1.5">{policies.map(children)}</div>;

  return (
    <div ref={scrollRef} className="max-h-72 overflow-y-auto pr-1 custom-scrollbar" role="group" aria-label="策略组成员列表">
      <div style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
        {virtualizer.getVirtualItems().map((row) => (
          <div
            key={row.key}
            data-index={row.index}
            ref={virtualizer.measureElement}
            className="absolute left-0 top-0 w-full pb-1.5"
            style={{ transform: `translateY(${row.start}px)` }}
          >
            {children(policies[row.index], row.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
