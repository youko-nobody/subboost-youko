export interface SubscriptionAutoUpdateState {
  externalFailureCount: number;
  failureSourceState?: string | null;
  lastFailedAt: string | null;
  lastAttemptedAt?: string | null;
  disabledAt: string | null;
  disabledReason: string | null;
  disabledPreviousInterval: number | null;
}

export interface Subscription {
  id: string;
  name: string;
  token: string;
  subscriptionUrl: string;
  isPrimary: boolean;
  autoUpdateInterval: number | null;
  autoUpdateState: SubscriptionAutoUpdateState;
  smartNodeMatchingEnabled: boolean;
  updateLockEnabled: boolean;
  lastUpdatedAt: string | null;
  lastAccessedAt: string | null;
  createdAt: string;
}

export interface BackupExportPayload {
  blob: Blob;
  filename?: string;
}

export interface BackupImportResult {
  importedSubscriptions: number;
  importedTemplates: number;
  skippedSubscriptions: number;
  skippedTemplates: number;
  errors: string[];
}

export interface SubscriptionVersionSummary {
  id: string;
  subscriptionId: string;
  name: string;
  reason: string;
  nodeCount: number;
  sourceCount: number;
  autoUpdateInterval: number | null;
  createdAt: string;
}

export interface SubscriptionConfigValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  generatedYamlBytes?: number;
  proxyGroupCount?: number;
  ruleCount?: number;
}

export interface SubscriptionHealthResult {
  status: "healthy" | "degraded" | "failed";
  checkedAt: string;
  message: string;
  validation: SubscriptionConfigValidationResult;
  nodeCount: number;
  attemptedUrlFetch: boolean;
  usedUrlFetch: boolean;
  refreshableSourceCount: number;
  refreshedSourceCount: number;
  refreshedUrlSourceCount: number;
  refreshedStaticSourceCount: number;
  failedSourceCount: number;
  failedSources: Array<{
    id: string;
    type: string;
    content: string;
    errorMessage: string;
    errorCategory?: string;
    httpStatus?: number;
    publicReason?: string | null;
  }>;
}

export interface RuleSetConnectivityResult {
  status: "healthy" | "degraded" | "failed";
  checkedAt: string;
  message: string;
  total: number;
  checkedCount: number;
  okCount: number;
  failedCount: number;
  skippedCount: number;
  results: Array<{
    id: string;
    name: string;
    source: "builtin" | "custom" | "template" | "generated";
    url?: string;
    finalUrl?: string;
    behavior?: string;
    format?: string;
    path?: string;
    result: "ok" | "failed" | "skipped";
    method?: "GET" | "HEAD";
    statusCode?: number;
    contentType?: string;
    contentLengthBytes?: number;
    error?: string;
    publicReason?: string | null;
    errorCategory?: string;
  }>;
}

export interface RefreshSubscriptionResponse {
  error?: string;
  refreshableSourceCount?: number;
  refreshedSourceCount?: number;
  refreshedUrlSourceCount?: number;
  refreshedStaticSourceCount?: number;
  failedSourceCount?: number;
  nodeCount?: number;
  attemptedUrlFetch?: boolean;
  usedUrlFetch?: boolean;
}

export interface SubscriptionRefreshPreview {
  subscriptionId: string;
  status: "ready" | "blocked";
  message: string;
  wouldSave: boolean;
  updateLockEnabled: boolean;
  smartNodeMatchingEnabled: boolean;
  nodeChanges: {
    beforeCount: number;
    afterCount: number;
    addedCount: number;
    removedCount: number;
    keptCount: number;
    renamedCount: number;
    changedCount: number;
    added: string[];
    removed: string[];
    renamed: Array<{ from: string; to: string }>;
    changed: string[];
  };
  sourceChanges: {
    attemptedUrlFetch: boolean;
    usedUrlFetch: boolean;
    refreshableSourceCount: number;
    refreshedSourceCount: number;
    refreshedUrlSourceCount: number;
    refreshedStaticSourceCount: number;
    failedSourceCount: number;
    failedSources: Array<{
      id: string;
      type: string;
      content: string;
      errorMessage: string;
      errorCategory?: string;
      httpStatus?: number;
      publicReason?: string | null;
    }>;
  };
  subscriptionInfoChanges: Array<{
    key: string;
    before: number | string | null;
    after: number | string | null;
  }>;
  configProtection: {
    protectedSections: string[];
    sourcesWillUpdate: boolean;
  };
  generatedYamlBytes?: number;
  failureReason?: string;
}
