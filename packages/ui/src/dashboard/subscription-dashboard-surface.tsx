"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileCode,
  MoreVertical,
  Plus,
  RefreshCw,
  Settings,
  Shield,
  Trash2,
  Upload,
} from "lucide-react";

import { Button } from "@subboost/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@subboost/ui/components/ui/card";
import { confirmDialog } from "@subboost/ui/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@subboost/ui/components/ui/dialog";
import { toast } from "@subboost/ui/components/ui/toaster";
import { useUserStore, type User } from "@subboost/ui/store/user-store";
import {
  autoUpdateIntervalHoursToSeconds,
  autoUpdateIntervalSecondsToHours,
  getAutoUpdateIntervalPolicyMinLabel,
  resolveAutoUpdateIntervalPolicy,
  type AutoUpdateIntervalPolicyOverride,
} from "@subboost/core/subscription/auto-update-interval";
import { DashboardStatsCards } from "@subboost/ui/dashboard/dashboard-stats-cards";
import { formatDashboardDate, formatIntervalLabel } from "@subboost/ui/dashboard/dashboard-format";
import { buildRefreshSubscriptionSuccessToast } from "@subboost/ui/dashboard/dashboard-refresh-toast";
import { SubscriptionSettingsDialog } from "@subboost/ui/dashboard/subscription-settings-dialog";
import type {
  BackupExportPayload,
  BackupImportResult,
  RefreshSubscriptionResponse,
  Subscription,
  SubscriptionConfigValidationResult,
  SubscriptionHealthResult,
  SubscriptionVersionSummary,
} from "@subboost/ui/dashboard/dashboard-types";

type UpdateSettingsPayload = {
  name: string;
  smartNodeMatchingEnabled: boolean;
  autoUpdateInterval: number | null;
};

export type DashboardSurfaceAdapter = {
  loginHref?: string;
  newSubscriptionHref?: string;
  templatesHref?: string | null;
  settingsHref?: string | null;
  settingsTitle?: string;
  settingsDescription?: string;
  autoUpdateIntervalPolicy?: AutoUpdateIntervalPolicyOverride;
  editSubscriptionHref?: (subscription: Subscription) => string;
  fetchSubscriptions: () => Promise<Subscription[]>;
  deleteSubscription: (id: string) => Promise<void>;
  refreshSubscription: (id: string) => Promise<RefreshSubscriptionResponse>;
  updateSubscriptionSettings: (id: string, payload: UpdateSettingsPayload) => Promise<void>;
  exportBackup?: () => Promise<BackupExportPayload>;
  importBackup?: (file: File) => Promise<BackupImportResult>;
  checkSubscriptionHealth?: (id: string) => Promise<SubscriptionHealthResult>;
  validateSubscriptionConfig?: (id: string) => Promise<SubscriptionConfigValidationResult>;
  fetchSubscriptionVersions?: (id: string) => Promise<SubscriptionVersionSummary[]>;
  restoreSubscriptionVersion?: (id: string, versionId: string) => Promise<Subscription>;
  resolveDownloadUrl?: (subscription: Subscription) => string;
  renderAnnouncement?: (context: { user: User }) => React.ReactNode;
  renderHeaderActions?: (context: { user: User }) => React.ReactNode;
  renderExtraQuickActions?: (context: { user: User }) => React.ReactNode;
  beforeStatsSlot?: React.ReactNode;
};

type Props = {
  adapter: DashboardSurfaceAdapter;
};

function buildYamlDownloadFilename(name: string): string {
  const base =
    String(name || "subboost-config")
      .trim()
      .replace(/[\r\n]/g, " ")
      .replace(/[<>:"/\\|?*]+/g, "")
      .replace(/\s+/g, "_")
      .replace(/\.(?:ya?ml)$/i, "")
      .slice(0, 80) || "subboost-config";
  return `${base}.yaml`;
}

function triggerBrowserDownload(href: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.rel = "noopener noreferrer";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function getHeaderFilename(headers: Headers): string | null {
  const value = headers.get("content-disposition") || "";
  const match = value.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1].replace(/^"|"$/g, ""));
  } catch {
    return match[1].replace(/^"|"$/g, "");
  }
}

function buildBackupDownloadFilename(): string {
  return `subboost-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
}

function versionReasonLabel(reason: string): string {
  switch (reason) {
    case "create":
      return "创建";
    case "before_update":
      return "编辑前";
    case "manual_update":
      return "手动编辑";
    case "manual_refresh":
      return "手动刷新";
    case "auto_refresh":
      return "自动刷新";
    case "before_restore":
      return "恢复前";
    case "restore":
      return "历史恢复";
    default:
      return reason || "未知";
  }
}

function validationToastPayload(validation: SubscriptionConfigValidationResult) {
  const warnings = validation.warnings || [];
  const errors = validation.errors || [];
  if (validation.ok && warnings.length === 0) {
    return {
      title: "配置校验通过",
      description: `策略组 ${validation.proxyGroupCount ?? 0} 个，规则 ${validation.ruleCount ?? 0} 条。`,
      variant: "success" as const,
    };
  }
  if (validation.ok) {
    return {
      title: "配置可用，但有提醒",
      description: warnings.slice(0, 3).join("；"),
      variant: "warning" as const,
    };
  }
  return {
    title: "配置校验失败",
    description: errors.slice(0, 3).join("；"),
    variant: "destructive" as const,
  };
}

function healthToastPayload(health: SubscriptionHealthResult) {
  if (health.status === "healthy") {
    return { title: "订阅健康", description: health.message, variant: "success" as const };
  }
  if (health.status === "degraded") {
    return { title: "订阅需要留意", description: health.message, variant: "warning" as const };
  }
  return { title: "订阅检查失败", description: health.message, variant: "destructive" as const };
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    textarea.remove();
    return ok;
  } catch {
    return false;
  }
}

export function SubscriptionDashboardSurface({ adapter }: Props) {
  const { user, isLoading: userLoading, fetchUser } = useUserStore();
  const [subscriptions, setSubscriptions] = React.useState<Subscription[]>([]);
  const autoUpdateNoticeRef = React.useRef<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [refreshingId, setRefreshingId] = React.useState<string | null>(null);
  const [maintenanceBusy, setMaintenanceBusy] = React.useState<string | null>(null);
  const importInputRef = React.useRef<HTMLInputElement | null>(null);

  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [settingsSub, setSettingsSub] = React.useState<Subscription | null>(null);
  const [settingsName, setSettingsName] = React.useState("");
  const [smartNodeMatchingEnabled, setSmartNodeMatchingEnabled] = React.useState(true);
  const [autoUpdateEnabled, setAutoUpdateEnabled] = React.useState(false);
  const autoUpdatePolicy = React.useMemo(
    () => resolveAutoUpdateIntervalPolicy(user?.isAdmin === true, adapter.autoUpdateIntervalPolicy),
    [adapter.autoUpdateIntervalPolicy, user?.isAdmin]
  );
  const [autoUpdateHours, setAutoUpdateHours] = React.useState<number>(autoUpdatePolicy.defaultHours);
  const [savingSettings, setSavingSettings] = React.useState(false);
  const [healthOpen, setHealthOpen] = React.useState(false);
  const [healthSub, setHealthSub] = React.useState<Subscription | null>(null);
  const [healthResult, setHealthResult] = React.useState<SubscriptionHealthResult | null>(null);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [historySub, setHistorySub] = React.useState<Subscription | null>(null);
  const [historyVersions, setHistoryVersions] = React.useState<SubscriptionVersionSummary[]>([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [restoringVersionId, setRestoringVersionId] = React.useState<string | null>(null);

  React.useEffect(() => {
    void fetchUser();
  }, [fetchUser]);

  const fetchSubscriptions = React.useCallback(async () => {
    try {
      const nextSubscriptions = await adapter.fetchSubscriptions();
      setSubscriptions(nextSubscriptions);
    } catch (error) {
      console.error("Failed to fetch subscriptions:", error);
      setSubscriptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [adapter]);

  React.useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    void fetchSubscriptions();
  }, [user, fetchSubscriptions]);

  React.useEffect(() => {
    if (!user) return;
    const disabled = subscriptions.filter((sub) => sub.autoUpdateState.disabledAt && sub.autoUpdateState.disabledReason);
    if (disabled.length === 0) return;

    const unseen = disabled.filter((sub) => {
      const fingerprint = `${sub.autoUpdateState.disabledAt}:${sub.autoUpdateState.disabledReason}`;
      const storageKey = `subboost:notice:auto_update_disabled:${user.id}:${sub.id}`;
      try {
        if (localStorage.getItem(storageKey) === fingerprint) return false;
        localStorage.setItem(storageKey, fingerprint);
      } catch {}
      return true;
    });
    const firstDisabled = unseen[0];
    if (!firstDisabled) return;

    const eventKey = unseen.map((sub) => `${sub.id}:${sub.autoUpdateState.disabledAt}`).join("|");
    if (autoUpdateNoticeRef.current === eventKey) return;
    autoUpdateNoticeRef.current = eventKey;

    toast({
      title: unseen.length === 1 ? "自动更新已关闭" : `${unseen.length} 个订阅的自动更新已关闭`,
      description: (
        <div className="whitespace-pre-line">
          {[
            unseen.length === 1
              ? `「${firstDisabled.name}」的订阅源连续拉取失败，系统已关闭自动更新。`
              : "部分订阅源连续拉取失败，系统已关闭对应订阅的自动更新。",
            "当前可用配置仍会保留；请检查订阅 URL 是否失效、是否限制服务端/代理 IP，必要时重新复制订阅链接后再开启自动更新。",
          ].join("\n")}
        </div>
      ),
      variant: "warning",
    });
  }, [subscriptions, user]);

  const copyToClipboard = async (subscriptionUrl: string, id: string) => {
    const copied = await copyText(subscriptionUrl);
    if (!copied) {
      toast({ title: "复制失败，请手动复制订阅链接", variant: "destructive" });
      return;
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const downloadSubscription = async (subscription: Subscription) => {
    const filename = buildYamlDownloadFilename(subscription.name);
    try {
      const response = await fetch(adapter.resolveDownloadUrl?.(subscription) ?? subscription.subscriptionUrl);
      if (!response.ok) throw new Error(`Download failed with status ${response.status}`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      triggerBrowserDownload(objectUrl, filename);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    } catch (error) {
      console.error("Failed to fetch subscription YAML for download:", error);
      toast({
        title: "下载失败",
        description: "请刷新页面后重试，或先复制订阅链接到代理软件。",
        variant: "destructive",
      });
    }
  };

  const exportBackup = async () => {
    if (!adapter.exportBackup || maintenanceBusy) return;
    setMaintenanceBusy("backup:export");
    try {
      const payload = await adapter.exportBackup();
      const objectUrl = URL.createObjectURL(payload.blob);
      triggerBrowserDownload(objectUrl, payload.filename || buildBackupDownloadFilename());
      setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
      toast({ title: "备份已导出", variant: "success" });
    } catch (error) {
      console.error("Failed to export backup:", error);
      toast({ title: error instanceof Error ? error.message : "备份导出失败", variant: "destructive" });
    } finally {
      setMaintenanceBusy(null);
    }
  };

  const importBackup = async (file: File | null | undefined) => {
    if (!file || !adapter.importBackup || maintenanceBusy) return;
    setMaintenanceBusy("backup:import");
    try {
      const result = await adapter.importBackup(file);
      await fetchSubscriptions();
      const skipped = result.skippedSubscriptions + result.skippedTemplates;
      toast({
        title: skipped > 0 ? "备份已恢复，部分条目跳过" : "备份已恢复",
        description: `订阅 ${result.importedSubscriptions} 个，模板 ${result.importedTemplates} 个。${result.errors.slice(0, 2).join("；")}`,
        variant: skipped > 0 ? "warning" : "success",
      });
    } catch (error) {
      console.error("Failed to import backup:", error);
      toast({ title: error instanceof Error ? error.message : "备份恢复失败", variant: "destructive" });
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
      setMaintenanceBusy(null);
    }
  };

  const deleteSubscription = async (id: string) => {
    const ok = await confirmDialog({
      title: "确定要删除这个订阅吗？",
      confirmText: "删除",
      variant: "destructive",
    });
    if (!ok) return;

    try {
      await adapter.deleteSubscription(id);
      setSubscriptions((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      console.error("Failed to delete subscription:", error);
      toast({ title: "删除失败，请稍后重试", variant: "destructive" });
    }
  };

  const refreshSubscription = async (id: string) => {
    if (refreshingId) return;
    setRefreshingId(id);
    try {
      const data = await adapter.refreshSubscription(id);
      await fetchSubscriptions();
      toast(buildRefreshSubscriptionSuccessToast(data));
    } catch (error) {
      console.error("Failed to refresh subscription:", error);
      toast({ title: error instanceof Error ? error.message : "刷新失败，请稍后重试", variant: "destructive" });
    } finally {
      setRefreshingId(null);
    }
  };

  const checkSubscriptionHealth = async (sub: Subscription) => {
    if (!adapter.checkSubscriptionHealth || maintenanceBusy) return;
    const key = `health:${sub.id}`;
    setMaintenanceBusy(key);
    try {
      const health = await adapter.checkSubscriptionHealth(sub.id);
      setHealthSub(sub);
      setHealthResult(health);
      setHealthOpen(true);
      toast(healthToastPayload(health));
    } catch (error) {
      console.error("Failed to check subscription health:", error);
      toast({ title: error instanceof Error ? error.message : "健康检查失败", variant: "destructive" });
    } finally {
      setMaintenanceBusy(null);
    }
  };

  const validateSubscriptionConfig = async (sub: Subscription) => {
    if (!adapter.validateSubscriptionConfig || maintenanceBusy) return;
    const key = `validate:${sub.id}`;
    setMaintenanceBusy(key);
    try {
      const validation = await adapter.validateSubscriptionConfig(sub.id);
      toast(validationToastPayload(validation));
    } catch (error) {
      console.error("Failed to validate subscription config:", error);
      toast({ title: error instanceof Error ? error.message : "配置校验失败", variant: "destructive" });
    } finally {
      setMaintenanceBusy(null);
    }
  };

  const openSubscriptionHistory = async (sub: Subscription) => {
    if (!adapter.fetchSubscriptionVersions) return;
    setHistorySub(sub);
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryVersions([]);
    try {
      setHistoryVersions(await adapter.fetchSubscriptionVersions(sub.id));
    } catch (error) {
      console.error("Failed to load subscription versions:", error);
      toast({ title: error instanceof Error ? error.message : "版本历史加载失败", variant: "destructive" });
    } finally {
      setHistoryLoading(false);
    }
  };

  const restoreSubscriptionVersion = async (versionId: string) => {
    if (!historySub || !adapter.restoreSubscriptionVersion) return;
    const ok = await confirmDialog({
      title: "确定恢复到这个历史版本吗？",
      description: "订阅链接会保持不变，当前配置会先保存为一条恢复前版本。",
      confirmText: "恢复",
      variant: "warning",
    });
    if (!ok) return;

    setRestoringVersionId(versionId);
    try {
      const restored = await adapter.restoreSubscriptionVersion(historySub.id, versionId);
      setSubscriptions((prev) => prev.map((sub) => (sub.id === restored.id ? restored : sub)));
      await fetchSubscriptions();
      setHistoryOpen(false);
      toast({ title: "已恢复历史版本", variant: "success" });
    } catch (error) {
      console.error("Failed to restore subscription version:", error);
      toast({ title: error instanceof Error ? error.message : "恢复历史版本失败", variant: "destructive" });
    } finally {
      setRestoringVersionId(null);
    }
  };

  const openSubscriptionSettings = (sub: Subscription) => {
    setSettingsSub(sub);
    setSettingsName(sub.name);
    setSmartNodeMatchingEnabled(sub.smartNodeMatchingEnabled !== false);
    const hours = sub.autoUpdateInterval ? autoUpdateIntervalSecondsToHours(sub.autoUpdateInterval) : autoUpdatePolicy.defaultHours;
    setAutoUpdateHours(Math.max(autoUpdatePolicy.minHours, Number.isFinite(hours) ? hours : autoUpdatePolicy.defaultHours));
    setAutoUpdateEnabled(Boolean(sub.autoUpdateInterval));
    setSettingsOpen(true);
  };

  const saveSubscriptionSettings = async () => {
    if (!settingsSub || savingSettings) return;

    const name = settingsName.trim();
    if (!name || name.length > 100) {
      toast({ title: "订阅名称不能为空且长度不能超过 100 字符", variant: "warning" });
      return;
    }

    const hoursValue = Number(autoUpdateHours);
    if (autoUpdateEnabled) {
      if (!Number.isFinite(hoursValue) || hoursValue <= 0) {
        toast({ title: "自动更新间隔必须是有效小时数", variant: "warning" });
        return;
      }
      if (autoUpdatePolicy.requireIntegerHours && !Number.isInteger(hoursValue)) {
        toast({ title: "自动更新间隔必须是整数小时", variant: "warning" });
        return;
      }
      if (hoursValue < autoUpdatePolicy.minHours) {
        toast({
          title: `自动更新最小间隔为 ${getAutoUpdateIntervalPolicyMinLabel(autoUpdatePolicy)}`,
          variant: "warning",
        });
        return;
      }
    }

    const nextAutoUpdateInterval = autoUpdateEnabled ? autoUpdateIntervalHoursToSeconds(hoursValue) : null;
    setSavingSettings(true);
    try {
      await adapter.updateSubscriptionSettings(settingsSub.id, {
        name,
        smartNodeMatchingEnabled,
        autoUpdateInterval: nextAutoUpdateInterval,
      });

      setSubscriptions((prev) =>
        prev.map((s) =>
          s.id === settingsSub.id
            ? {
                ...s,
                name,
                smartNodeMatchingEnabled,
                autoUpdateInterval: nextAutoUpdateInterval,
                ...(autoUpdateEnabled
                  ? {
                      autoUpdateState: {
                        externalFailureCount: 0,
                        failureSourceState: null,
                        lastFailedAt: null,
                        lastAttemptedAt: null,
                        disabledAt: null,
                        disabledReason: null,
                        disabledPreviousInterval: null,
                      },
                    }
                  : {}),
              }
            : s
        )
      );
      setSettingsOpen(false);
    } catch (error) {
      console.error("Failed to save subscription settings:", error);
      toast({ title: error instanceof Error ? error.message : "保存失败，请稍后重试", variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  };

  if (userLoading) return <DashboardSkeleton />;
  if (!user) return <LoginPrompt loginHref={adapter.loginHref ?? "/login"} />;

  const newSubscriptionHref = adapter.newSubscriptionHref ?? "/?newSubscription=1";
  const editSubscriptionHref = adapter.editSubscriptionHref ?? ((sub: Subscription) => `/?editSubscriptionId=${sub.id}`);

  return (
    <div className="container mx-auto px-4 py-8">
      {adapter.renderAnnouncement?.({ user })}

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">我的订阅</h1>
          <p className="text-white/50">管理您的订阅链接</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {adapter.renderHeaderActions?.({ user })}
          {adapter.exportBackup && (
            <Button
              variant="ghost"
              className="gap-2"
              onClick={() => void exportBackup()}
              disabled={maintenanceBusy === "backup:export"}
              title="导出所有订阅和模板备份"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">导出备份</span>
            </Button>
          )}
          {adapter.importBackup && (
            <>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => void importBackup(event.currentTarget.files?.[0])}
              />
              <Button
                variant="ghost"
                className="gap-2"
                onClick={() => importInputRef.current?.click()}
                disabled={maintenanceBusy === "backup:import"}
                title="从备份 JSON 恢复订阅和模板"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">恢复备份</span>
              </Button>
            </>
          )}
          <Button asChild className="gap-2">
            <Link href={newSubscriptionHref}>
              <Plus className="h-4 w-4" />
              新建订阅
            </Link>
          </Button>
        </div>
      </div>

      {adapter.beforeStatsSlot}

      <DashboardStatsCards subscriptionCount={subscriptions.length} user={user} />

      <Card>
        <CardHeader>
          <CardTitle>订阅列表</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 bg-white/10 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-12">
              <FileCode className="h-12 w-12 mx-auto text-white/40 mb-4" />
              <h3 className="text-lg font-medium mb-2">暂无订阅</h3>
              <p className="text-white/50 mb-4">创建您的第一个订阅配置</p>
              <Button asChild>
                <Link href={newSubscriptionHref}>
                  <Plus className="mr-2 h-4 w-4" />
                  新建订阅
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {subscriptions.map((sub) => (
                <SubscriptionRow
                  key={sub.id}
                  sub={sub}
                  copiedId={copiedId}
                  refreshingId={refreshingId}
                  editHref={editSubscriptionHref(sub)}
                  onCopy={copyToClipboard}
                  onDelete={deleteSubscription}
                  onDownload={downloadSubscription}
                  onRefresh={refreshSubscription}
                  onSettings={openSubscriptionSettings}
                  busyAction={maintenanceBusy}
                  onCheckHealth={adapter.checkSubscriptionHealth ? checkSubscriptionHealth : undefined}
                  onValidateConfig={adapter.validateSubscriptionConfig ? validateSubscriptionConfig : undefined}
                  onHistory={adapter.fetchSubscriptionVersions ? openSubscriptionHistory : undefined}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <SubscriptionSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        subscription={settingsSub}
        settingsName={settingsName}
        setSettingsName={setSettingsName}
        smartNodeMatchingEnabled={smartNodeMatchingEnabled}
        setSmartNodeMatchingEnabled={setSmartNodeMatchingEnabled}
        autoUpdateEnabled={autoUpdateEnabled}
        setAutoUpdateEnabled={setAutoUpdateEnabled}
        autoUpdateHours={autoUpdateHours}
        setAutoUpdateHours={setAutoUpdateHours}
        savingSettings={savingSettings}
        onSave={saveSubscriptionSettings}
        userIsAdmin={user?.isAdmin === true}
        autoUpdatePolicy={autoUpdatePolicy}
      />

      <HealthDialog
        open={healthOpen}
        onOpenChange={setHealthOpen}
        subscription={healthSub}
        health={healthResult}
      />

      <VersionHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        subscription={historySub}
        versions={historyVersions}
        loading={historyLoading}
        restoringVersionId={restoringVersionId}
        onRestore={(versionId) => void restoreSubscriptionVersion(versionId)}
      />

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {adapter.templatesHref && (
          <QuickActionCard
            href={adapter.templatesHref}
            icon={<FileCode className="h-6 w-6" />}
            iconClassName="bg-purple-500/20 text-purple-500"
            title="我的模板"
            description="管理和分享您的配置模板"
          />
        )}

        {adapter.settingsHref && (
          <QuickActionCard
            href={adapter.settingsHref}
            icon={<Settings className="h-6 w-6" />}
            iconClassName="bg-gray-500/20 text-gray-500"
            title={adapter.settingsTitle ?? "账户设置"}
            description={adapter.settingsDescription ?? "管理您的账户和数据导出"}
          />
        )}

        {adapter.renderExtraQuickActions?.({ user })}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-white/10 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-white/10 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

function LoginPrompt({ loginHref }: { loginHref: string }) {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <div className="max-w-md mx-auto space-y-4">
        <Shield className="h-16 w-16 mx-auto text-white/50" />
        <h1 className="text-2xl font-bold">请先登录</h1>
        <p className="text-white/50">登录后可以管理您的订阅和模板</p>
        <Button asChild size="lg">
          <Link href={loginHref}>登录</Link>
        </Button>
      </div>
    </div>
  );
}

function SubscriptionRow({
  sub,
  copiedId,
  refreshingId,
  editHref,
  onCopy,
  onDelete,
  onDownload,
  onRefresh,
  onSettings,
  busyAction,
  onCheckHealth,
  onValidateConfig,
  onHistory,
}: {
  sub: Subscription;
  copiedId: string | null;
  refreshingId: string | null;
  editHref: string;
  onCopy: (subscriptionUrl: string, id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onDownload: (sub: Subscription) => Promise<void>;
  onRefresh: (id: string) => Promise<void>;
  onSettings: (sub: Subscription) => void;
  busyAction: string | null;
  onCheckHealth?: (sub: Subscription) => Promise<void>;
  onValidateConfig?: (sub: Subscription) => Promise<void>;
  onHistory?: (sub: Subscription) => Promise<void>;
}) {
  const healthBusy = busyAction === `health:${sub.id}`;
  const validateBusy = busyAction === `validate:${sub.id}`;
  return (
    <div className="flex flex-col gap-3 p-4 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-colors sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex min-w-0 flex-1 items-start gap-4 sm:items-center">
        <div className="p-2 rounded-lg bg-white/10">
          <FileCode className="h-5 w-5 text-primary-500" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="min-w-0 flex-1 truncate font-medium">{sub.name}</h3>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/50">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              创建于 {formatDashboardDate(sub.createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <RefreshCw className="h-3.5 w-3.5" />
              更新于 {formatDashboardDate(sub.lastUpdatedAt)}
            </span>
            {sub.autoUpdateInterval && (
              <span className="flex items-center gap-1">
                <RefreshCw className="h-3.5 w-3.5" />
                每 {formatIntervalLabel(sub.autoUpdateInterval)} 刷新缓存
              </span>
            )}
            {!sub.autoUpdateInterval && sub.autoUpdateState.disabledAt && sub.autoUpdateState.disabledReason && (
              <span className="flex items-center gap-1 text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5" />
                自动更新已关闭：{sub.autoUpdateState.disabledReason}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
        <Button asChild variant="ghost" size="sm" className="gap-0 sm:gap-2" title="回到首页编辑该订阅（更新后链接不变）">
          <Link href={editHref}>
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">编辑</span>
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSettings(sub)}
          className="gap-0 sm:gap-2"
          title="订阅设置（改名 / 自动更新）"
        >
          <MoreVertical className="h-4 w-4" />
          <span className="hidden sm:inline">设置</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void onRefresh(sub.id)}
          disabled={refreshingId === sub.id}
          className="gap-0 sm:gap-2"
          title="重新生成配置并刷新缓存"
        >
          <RefreshCw className={`h-4 w-4 ${refreshingId === sub.id ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">刷新</span>
        </Button>
        {onCheckHealth && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void onCheckHealth(sub)}
            disabled={healthBusy}
            className="gap-0 sm:gap-2"
            title="拉取订阅源并做健康检查（不写入数据库）"
          >
            <Shield className={`h-4 w-4 ${healthBusy ? "animate-pulse" : ""}`} />
            <span className="hidden sm:inline">健康</span>
          </Button>
        )}
        {onValidateConfig && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void onValidateConfig(sub)}
            disabled={validateBusy}
            className="gap-0 sm:gap-2"
            title="检查当前保存配置能否生成有效 YAML"
          >
            <Check className="h-4 w-4" />
            <span className="hidden sm:inline">校验</span>
          </Button>
        )}
        {onHistory && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void onHistory(sub)}
            className="gap-0 sm:gap-2"
            title="查看订阅配置版本历史"
          >
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">历史</span>
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void onCopy(sub.subscriptionUrl, sub.id)}
          className="gap-0 sm:gap-2"
          title="复制订阅链接"
        >
          {copiedId === sub.id ? (
            <>
              <Check className="h-4 w-4 text-green-500" />
              <span className="hidden sm:inline text-green-500">已复制</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              <span className="hidden sm:inline">链接</span>
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void onDownload(sub)}
          className="gap-0 sm:gap-2"
          title="下载订阅配置"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">下载</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void onDelete(sub.id)}
          className="gap-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 sm:gap-2"
          title="删除订阅"
        >
          <Trash2 className="h-4 w-4" />
          <span className="hidden sm:inline">删除</span>
        </Button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: SubscriptionHealthResult["status"] }) {
  const label = status === "healthy" ? "健康" : status === "degraded" ? "需留意" : "失败";
  const className =
    status === "healthy"
      ? "border-green-500/30 bg-green-500/10 text-green-300"
      : status === "degraded"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
        : "border-red-500/30 bg-red-500/10 text-red-300";
  return <span className={`rounded-md border px-2 py-1 text-xs ${className}`}>{label}</span>;
}

function MessageList({ title, items, tone }: { title: string; items: string[]; tone: "error" | "warning" }) {
  if (items.length === 0) return null;
  const color = tone === "error" ? "text-red-300" : "text-amber-300";
  return (
    <div className="space-y-2">
      <div className={`text-sm font-medium ${color}`}>{title}</div>
      <ul className="space-y-1 text-sm text-white/60">
        {items.slice(0, 8).map((item, index) => (
          <li key={`${title}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function HealthDialog({
  open,
  onOpenChange,
  subscription,
  health,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: Subscription | null;
  health: SubscriptionHealthResult | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            订阅健康检查
            {health && <StatusBadge status={health.status} />}
          </DialogTitle>
          <DialogDescription>{subscription?.name || "当前订阅"}</DialogDescription>
        </DialogHeader>

        {health ? (
          <div className="space-y-5">
            <p className="text-sm text-white/70">{health.message}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <HealthMetric label="节点" value={health.nodeCount} />
              <HealthMetric label="订阅源" value={health.refreshableSourceCount} />
              <HealthMetric label="成功源" value={health.refreshedSourceCount} />
              <HealthMetric label="失败源" value={health.failedSourceCount} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <HealthMetric label="策略组" value={health.validation.proxyGroupCount ?? 0} />
              <HealthMetric label="规则" value={health.validation.ruleCount ?? 0} />
              <HealthMetric label="YAML 大小" value={`${Math.round((health.validation.generatedYamlBytes ?? 0) / 1024)} KB`} />
            </div>
            <MessageList title="配置错误" items={health.validation.errors || []} tone="error" />
            <MessageList title="配置提醒" items={health.validation.warnings || []} tone="warning" />
            {health.failedSources.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-red-300">失败订阅源</div>
                <div className="space-y-2">
                  {health.failedSources.slice(0, 6).map((source) => (
                    <div key={source.id} className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
                      <div className="truncate text-white/70">{source.content}</div>
                      <div className="mt-1 text-red-300">{source.publicReason || source.errorMessage}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-24 animate-pulse rounded-lg bg-white/10" />
        )}

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HealthMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="text-xs text-white/45">{label}</div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

function VersionHistoryDialog({
  open,
  onOpenChange,
  subscription,
  versions,
  loading,
  restoringVersionId,
  onRestore,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: Subscription | null;
  versions: SubscriptionVersionSummary[];
  loading: boolean;
  restoringVersionId: string | null;
  onRestore: (versionId: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>订阅配置版本历史</DialogTitle>
          <DialogDescription>{subscription?.name || "当前订阅"}，最多保留最近 50 条版本。</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-20 animate-pulse rounded-lg bg-white/10" />
              ))}
            </div>
          ) : versions.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center text-sm text-white/50">
              暂无历史版本
            </div>
          ) : (
            versions.map((version) => (
              <div key={version.id} className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{versionReasonLabel(version.reason)}</span>
                    <span className="rounded-md border border-white/10 px-2 py-0.5 text-xs text-white/50">
                      {formatDashboardDate(version.createdAt)}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-white/50">
                    {version.name}，{version.nodeCount} 节点，{version.sourceCount} 源
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={Boolean(restoringVersionId)}
                  onClick={() => onRestore(version.id)}
                >
                  {restoringVersionId === version.id ? "恢复中" : "恢复"}
                </Button>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QuickActionCard({
  href,
  icon,
  iconClassName,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  iconClassName: string;
  title: string;
  description: string;
}) {
  return (
    <Link href={href}>
      <Card className="cursor-pointer hover:border-white/20 transition-colors">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${iconClassName}`}>{icon}</div>
            <div>
              <h3 className="font-medium">{title}</h3>
              <p className="text-sm text-white/50">{description}</p>
            </div>
            <ExternalLink className="ml-auto h-5 w-5 text-white/40" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
