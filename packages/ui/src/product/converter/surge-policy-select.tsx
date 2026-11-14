"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@subboost/ui/components/ui/select";
import { cn } from "@subboost/ui/lib/utils";

export type SurgePolicyOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export function SurgePolicySelect({
  value,
  options,
  onValueChange,
  placeholder,
  className,
}: {
  value: string;
  options: SurgePolicyOption[];
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <Select value={value} onValueChange={onValueChange} open={open} onOpenChange={setOpen}>
      <SelectTrigger className={cn("h-8 text-xs", className)}>
        <SelectValue placeholder={placeholder}>{selected?.label || value || undefined}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {/* Radix mounts closed select items in a detached fragment, so defer them explicitly. */}
        {open && options.map((option) => (
          <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
