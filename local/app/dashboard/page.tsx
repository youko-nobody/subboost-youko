"use client";
import {
  SubscriptionDashboardSurface,
  type DashboardSurfaceAdapter,
} from "@subboost/ui/dashboard/subscription-dashboard-surface";
import { readJsonResponse } from "@subboost/ui/product/client-response";
import type {
  BackupImportResult,
  RefreshSubscriptionResponse,
  Subscription,
  SubscriptionConfigValidationResult,
  SubscriptionHealthResult,
  SubscriptionVersionSummary,
} from "@subboost/ui/dashboard/dashboard-types";
import { LOCAL_AUTO_UPDATE_POLICY } from "@local/lib/auto-update-policy";

function resolveLocalDashboardDownloadUrl(subscription: Subscription): string {
  try {
    const url = new URL(subscription.subscriptionUrl, window.location.href);
    if (url.pathname.includes("/api/subscriptions/")) {
      return `${window.location.origin}${url.pathname}${url.search}`;
    }
  } catch {}
  return subscription.subscriptionUrl;
}

const localDashboardAdapter: DashboardSurfaceAdapter = {
  loginHref: "/login",
  newSubscriptionHref: "/?newSubscription=1",
  templatesHref: "/templates",
  settingsHref: "/dashboard/settings",
  settingsDescription: "查看本地管理员和运行状态",
  autoUpdateIntervalPolicy: LOCAL_AUTO_UPDATE_POLICY,
  fetchSubscriptions: async () => {
    const response = await fetch("/api/subscriptions");
    const data = await readJsonResponse<{ subscriptions?: Subscription[]; error?: string }>(response, "获取订阅失败");
    return Array.isArray(data.subscriptions) ? data.subscriptions : [];
  },
  deleteSubscription: async (id) => {
    const response = await fetch(`/api/subscriptions/${encodeURIComponent(id)}`, { method: "DELETE" });
    await readJsonResponse<{ error?: string }>(response, "删除失败");
  },
  refreshSubscription: async (id) => {
    const response = await fetch(`/api/subscriptions/${encodeURIComponent(id)}/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await readJsonResponse<RefreshSubscriptionResponse>(response, "刷新失败");
    return data;
  },
  updateSubscriptionSettings: async (id, payload) => {
    const response = await fetch(`/api/subscriptions/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await readJsonResponse<{ error?: string }>(response, "保存失败");
  },
  exportBackup: async () => {
    const response = await fetch("/api/backup", { method: "GET" });
    if (!response.ok) await readJsonResponse<{ error?: string }>(response, "导出备份失败");
    const blob = await response.blob();
    const disposition = response.headers.get("content-disposition") || "";
    const filename = disposition.match(/filename="([^"]+)"/)?.[1];
    return { blob, ...(filename ? { filename } : {}) };
  },
  importBackup: async (file) => {
    const response = await fetch("/api/backup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: await file.text(),
    });
    const data = await readJsonResponse<{ result?: BackupImportResult; error?: string }>(response, "恢复备份失败");
    if (!data.result) throw new Error("恢复备份失败");
    return data.result;
  },
  checkSubscriptionHealth: async (id) => {
    const response = await fetch(`/api/subscriptions/${encodeURIComponent(id)}/health`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await readJsonResponse<{ health?: SubscriptionHealthResult; error?: string }>(response, "健康检查失败");
    if (!data.health) throw new Error("健康检查失败");
    return data.health;
  },
  validateSubscriptionConfig: async (id) => {
    const response = await fetch(`/api/subscriptions/${encodeURIComponent(id)}/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await readJsonResponse<{ validation?: SubscriptionConfigValidationResult; error?: string }>(response, "配置校验失败");
    if (!data.validation) throw new Error("配置校验失败");
    return data.validation;
  },
  fetchSubscriptionVersions: async (id) => {
    const response = await fetch(`/api/subscriptions/${encodeURIComponent(id)}/versions`);
    const data = await readJsonResponse<{ versions?: SubscriptionVersionSummary[]; error?: string }>(response, "获取版本历史失败");
    return Array.isArray(data.versions) ? data.versions : [];
  },
  restoreSubscriptionVersion: async (id, versionId) => {
    const response = await fetch(
      `/api/subscriptions/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}/restore`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }
    );
    const data = await readJsonResponse<{ subscription?: Subscription; error?: string }>(response, "恢复历史版本失败");
    if (!data.subscription) throw new Error("恢复历史版本失败");
    return data.subscription;
  },
  resolveDownloadUrl: resolveLocalDashboardDownloadUrl,
};

export default function DashboardPage() {
  return <SubscriptionDashboardSurface adapter={localDashboardAdapter} />;
}
