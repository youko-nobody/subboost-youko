"use client";

import * as React from "react";
import type { TemplateType } from "@subboost/core/types/config";
import type { SourceType } from "@subboost/ui/store/config-store";

export type ProductMode = "quick" | "advanced" | "surge";
export type ProductInteractionResult = "success" | "validationError" | "runtimeError" | "noInput";
export type ProductTemplateSource = "builtin" | "default" | "catalog" | "my" | "unknown";
export type ProductTemplateKind = "config" | "yaml" | "unknown";
export type ProductRuleSource = "library" | "manual" | "batch";
export type ProductRuleKind =
  | "domain"
  | "ipcidr"
  | "geo"
  | "process"
  | "port"
  | "ruleset"
  | "unknown";
export type ProductSubscriptionIntentResult =
  | "opened"
  | "blockedNoConfig"
  | "blockedAuth"
  | "blockedRequirement";
export type ProductSubscriptionFlow = "create" | "update";
export type ProductRulesSearchResult = "success" | "noResult" | "error";
export type ProductRulesSearchSource = "remote" | "stale" | "unavailable" | "unknown";
export type ProductTemplateUploadEntry = "home" | "templatesPage";

export type ProductInteractionAdapter = {
  modeChanged?: (context: { mode: ProductMode }) => void;
  sourceAdded?: (context: {
    mode: ProductMode;
    sourceType: SourceType;
    sourceCount: number;
  }) => void;
  sourceImported?: (context: {
    mode: ProductMode;
    sourceType: SourceType;
    result: ProductInteractionResult;
    sourceCount: number;
    nodeCount: number;
    usesProxyProvider: boolean;
  }) => void;
  configGenerated?: (context: {
    mode: ProductMode;
    result: ProductInteractionResult;
    sourceCount: number;
    nodeCount: number;
    templateType: TemplateType;
    hasCustomRules: boolean;
    hasCustomProxyGroups: boolean;
    hasDnsYaml: boolean;
    hasListenerPorts: boolean;
  }) => void;
  configDownloaded?: (context: {
    mode: ProductMode;
    nodeCount: number;
    templateType: TemplateType;
  }) => void;
  subscriptionLinkIntent?: (context: {
    mode: ProductMode;
    result: ProductSubscriptionIntentResult;
  }) => void;
  subscriptionLinkSaved?: (context: {
    mode: ProductMode;
    flow: ProductSubscriptionFlow;
    result: ProductInteractionResult;
    autoUpdateEnabled: boolean;
    smartMatchingEnabled: boolean;
    autoUpdateHours: number | null;
    sourceCount: number;
    nodeCount: number;
  }) => void;
  saveRequirementAccepted?: () => void;
  subscriptionLinkCopied?: (context: {
    mode: ProductMode;
    flow: ProductSubscriptionFlow;
  }) => void;
  templateSelected?: (context: {
    source: ProductTemplateSource;
    templateType: TemplateType;
  }) => void;
  templateCatalogOpened?: (context: { mode: ProductMode }) => void;
  templateSearchCompleted?: (context: {
    source: ProductTemplateSource;
    resultCount: number;
  }) => void;
  templateApplied?: (context: {
    source: ProductTemplateSource;
    kind: ProductTemplateKind;
    result: ProductInteractionResult;
  }) => void;
  templateEngagementToggled?: (context: {
    source: ProductTemplateSource;
    engaged: boolean;
  }) => void;
  templateUploadOpened?: (context: { entry: ProductTemplateUploadEntry }) => void;
  rulesSearchCompleted?: (context: {
    result: ProductRulesSearchResult;
    resultSource: ProductRulesSearchSource;
    resultCount: number;
  }) => void;
  ruleAdded?: (context: {
    source: ProductRuleSource;
    kind: ProductRuleKind;
  }) => void;
  customRuleBatchImported?: (context: {
    result: ProductInteractionResult;
    ruleCount: number;
  }) => void;
  proxyGroupAdded?: (context: { groupType: string }) => void;
  listenerPortConfigured?: (context: { mode: ProductMode }) => void;
};

const emptyAdapter: ProductInteractionAdapter = {};
const ProductInteractionContext = React.createContext<ProductInteractionAdapter>(emptyAdapter);

let activeProductInteractionAdapter: ProductInteractionAdapter = emptyAdapter;

export function getActiveProductInteractionAdapter(): ProductInteractionAdapter {
  return activeProductInteractionAdapter;
}

export function useProductInteractionAdapter(): ProductInteractionAdapter {
  return React.useContext(ProductInteractionContext);
}

export function ProductInteractionAdapterProvider({
  adapter,
  children,
}: {
  adapter?: ProductInteractionAdapter;
  children: React.ReactNode;
}) {
  const value = adapter ?? emptyAdapter;

  React.useEffect(() => {
    activeProductInteractionAdapter = value;
    return () => {
      if (activeProductInteractionAdapter === value) {
        activeProductInteractionAdapter = emptyAdapter;
      }
    };
  }, [value]);

  return (
    <ProductInteractionContext.Provider value={value}>
      {children}
    </ProductInteractionContext.Provider>
  );
}
