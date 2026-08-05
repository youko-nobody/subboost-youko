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
