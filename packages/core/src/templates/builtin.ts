import type { TemplateType } from "@subboost/core/types/config";

export const BUILTIN_TEMPLATE_IDS: Record<TemplateType, string> = {
  blank: "builtin-blank",
  minimal: "builtin-minimal",
  standard: "builtin-standard",
  full: "builtin-full",
  "my-routing": "builtin-my-routing",
};

export type BuiltinTemplateSummaryMetadata = {
  downloads: number;
  engagementCount: number;
  createdAt: string;
  tags: string[];
  isOfficial: boolean;
  isPublic: boolean;
};

const BUILTIN_TEMPLATE_SUMMARY_TAGS = ["内置"] as const;

export const BUILTIN_TEMPLATE_SUMMARY_CREATED_AT = "2026-06-01T00:00:00.000Z";

export function getBuiltinTemplateSummaryMetadata(): BuiltinTemplateSummaryMetadata {
  return {
    downloads: 0,
    engagementCount: 0,
    createdAt: BUILTIN_TEMPLATE_SUMMARY_CREATED_AT,
    tags: [...BUILTIN_TEMPLATE_SUMMARY_TAGS],
    isOfficial: true,
    isPublic: true,
  };
}

export function getBuiltinTemplateId(type: TemplateType): string {
  return BUILTIN_TEMPLATE_IDS[type];
}

export function builtinIdToType(id: string): TemplateType | null {
  if (id === BUILTIN_TEMPLATE_IDS.blank) return "blank";
  if (id === BUILTIN_TEMPLATE_IDS.minimal) return "minimal";
  if (id === BUILTIN_TEMPLATE_IDS.standard) return "standard";
  if (id === BUILTIN_TEMPLATE_IDS.full) return "full";
  if (id === BUILTIN_TEMPLATE_IDS["my-routing"]) return "my-routing";
  return null;
}

export function isBuiltinTemplateId(id: string): boolean {
  return builtinIdToType(id) !== null;
}


