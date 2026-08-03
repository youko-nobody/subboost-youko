"use client";

import * as React from "react";
import { ExternalLink, ImageOff, X } from "lucide-react";
import { Button } from "@subboost/ui/components/ui/button";
import { Input } from "@subboost/ui/components/ui/input";
import { SafeImage } from "@subboost/ui/components/ui/safe-image";
import { cn } from "@subboost/ui/lib/utils";

export function isValidOptionalHttpIconUrl(value: string): boolean {
  const trimmed = value.trim();
  return !trimmed || /^https?:\/\//i.test(trimmed);
}

export function ProxyGroupIconPreview({
  src,
  label,
  className,
}: {
  src?: string | null;
  label: string;
  className?: string;
}) {
  const trimmedSrc = src?.trim() ?? "";
  const validSrc = /^https?:\/\//i.test(trimmedSrc) ? trimmedSrc : "";

  return (
    <span
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-white/5",
        className,
      )}
      title={validSrc || label}
    >
      <SafeImage
        src={validSrc}
        alt=""
        className="h-full w-full object-contain"
        referrerPolicy="no-referrer"
        fallback={<ImageOff className="h-3.5 w-3.5 text-white/35" />}
      />
    </span>
  );
}

export function ProxyGroupIconUrlEditor({
  value,
  onChange,
  onKeyDown,
  displayName,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  displayName: string;
  className?: string;
}) {
  const trimmedValue = value.trim();
  const canOpen = /^https?:\/\//i.test(trimmedValue);

  return (
    <div className={cn("grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-2", className)}>
      <span className="text-[10px] text-white/45">图标 URL</span>
      <div className="flex min-w-0 items-center gap-1">
        <ProxyGroupIconPreview src={trimmedValue} label={`${displayName} 图标预览`} />
        <Input
          value={value}
          placeholder="https://example.com/icon.png（可选）"
          className="h-7 min-w-0 flex-1 border-white/10 bg-white/5 text-xs"
          aria-label={`${displayName} 远程图标 URL`}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 shrink-0 px-0 text-white/35 hover:text-sky-200"
          title="打开图标链接"
          aria-label={`打开 ${displayName} 图标链接`}
          disabled={!canOpen}
          onClick={() => {
            if (!canOpen) return;
            window.open(trimmedValue, "_blank", "noopener,noreferrer");
          }}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 shrink-0 px-0 text-white/35 hover:text-red-300"
          title="清空图标"
          aria-label={`清空 ${displayName} 图标`}
          disabled={!trimmedValue}
          onClick={() => onChange("")}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
