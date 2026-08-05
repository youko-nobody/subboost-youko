import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCurrentAdmin } from "@local/lib/auth";
import { exportLocalBackup, importLocalBackup } from "@local/lib/backup-service";
import { checkSubscriptionHealth, validateExistingSubscriptionConfig } from "@local/lib/subscription-health-service";
import { formatSubscription } from "@local/lib/subscription-service";
import { listSubscriptionVersions, restoreSubscriptionVersion } from "@local/lib/subscription-version-service";

import * as backupRoute from "../app/api/backup/route";
import * as healthRoute from "../app/api/subscriptions/[id]/health/route";
import * as validateRoute from "../app/api/subscriptions/[id]/validate/route";
import * as versionsRoute from "../app/api/subscriptions/[id]/versions/route";
import * as restoreRoute from "../app/api/subscriptions/[id]/versions/[versionId]/restore/route";

vi.mock("@local/lib/auth", () => ({ getCurrentAdmin: vi.fn() }));
vi.mock("@local/lib/backup-service", () => ({
  exportLocalBackup: vi.fn(),
  importLocalBackup: vi.fn(),
}));
vi.mock("@local/lib/subscription-health-service", () => ({
  checkSubscriptionHealth: vi.fn(),
  validateExistingSubscriptionConfig: vi.fn(),
}));
vi.mock("@local/lib/subscription-version-service", () => ({
  listSubscriptionVersions: vi.fn(),
  restoreSubscriptionVersion: vi.fn(),
}));
vi.mock("@local/lib/subscription-service", () => ({
  formatSubscription: vi.fn(),
}));

const admin = { id: "admin-1", username: "root" };
const params = { params: Promise.resolve({ id: "sub-1" }) };

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

describe("maintenance routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentAdmin).mockResolvedValue(admin);
    vi.mocked(exportLocalBackup).mockResolvedValue({
      schema: "subboost-youko-backup/v1",
      subscriptions: [],
      templates: [],
    });
    vi.mocked(importLocalBackup).mockResolvedValue({
      importedSubscriptions: 1,
      importedTemplates: 0,
      skippedSubscriptions: 0,
      skippedTemplates: 0,
      errors: [],
    });
    vi.mocked(checkSubscriptionHealth).mockResolvedValue({
      status: "healthy",
      checkedAt: "2026-01-01T00:00:00.000Z",
      message: "ok",
      validation: { ok: true, errors: [], warnings: [] },
      nodeCount: 1,
      attemptedUrlFetch: true,
      usedUrlFetch: true,
      refreshableSourceCount: 1,
      refreshedSourceCount: 1,
      refreshedUrlSourceCount: 1,
      refreshedStaticSourceCount: 0,
      failedSourceCount: 0,
      failedSources: [],
    });
    vi.mocked(validateExistingSubscriptionConfig).mockResolvedValue({ ok: true, errors: [], warnings: [] });
    vi.mocked(listSubscriptionVersions).mockResolvedValue([
      {
        id: "ver-1",
        subscriptionId: "sub-1",
        name: "Main",
        reason: "manual_update",
        nodeCount: 1,
        sourceCount: 1,
        autoUpdateInterval: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    vi.mocked(restoreSubscriptionVersion).mockResolvedValue({ id: "sub-1", name: "Main" } as never);
    vi.mocked(formatSubscription).mockReturnValue({ id: "sub-1", name: "Main" } as never);
  });

  it("exports and imports backups", async () => {
    const exportResponse = await backupRoute.GET();
    expect(exportResponse.status).toBe(200);
    expect(exportResponse.headers.get("content-disposition")).toContain("subboost-backup");
    expect(JSON.parse(await exportResponse.text())).toMatchObject({ schema: "subboost-youko-backup/v1" });

    const importResponse = await backupRoute.POST(new Request("http://local.test/api/backup", {
      method: "POST",
      body: JSON.stringify({ subscriptions: [], templates: [] }),
    }));
    expect(importResponse.status).toBe(200);
    expect(await readJson(importResponse)).toEqual({
      result: {
        importedSubscriptions: 1,
        importedTemplates: 0,
        skippedSubscriptions: 0,
        skippedTemplates: 0,
        errors: [],
      },
    });
  });

  it("checks health, validates config, lists versions, and restores versions", async () => {
    const healthResponse = await healthRoute.POST(new Request("http://local.test/api/subscriptions/sub-1/health"), params);
    expect(healthResponse.status).toBe(200);
    expect(checkSubscriptionHealth).toHaveBeenCalledWith("admin-1", "sub-1");

    const validateResponse = await validateRoute.POST(new Request("http://local.test/api/subscriptions/sub-1/validate"), params);
    expect(validateResponse.status).toBe(200);
    expect(validateExistingSubscriptionConfig).toHaveBeenCalledWith("admin-1", "sub-1");

    const versionsResponse = await versionsRoute.GET(new Request("http://local.test/api/subscriptions/sub-1/versions"), params);
    expect(versionsResponse.status).toBe(200);
    expect(await readJson(versionsResponse)).toMatchObject({ versions: [{ id: "ver-1" }] });

    const restoreResponse = await restoreRoute.POST(
      new Request("http://local.test/api/subscriptions/sub-1/versions/ver-1/restore", {
        headers: { "x-forwarded-host": "sub.example.com", "x-forwarded-proto": "https" },
      }),
      { params: Promise.resolve({ id: "sub-1", versionId: "ver-1" }) }
    );
    expect(restoreResponse.status).toBe(200);
    expect(restoreSubscriptionVersion).toHaveBeenCalledWith("admin-1", "sub-1", "ver-1");
    expect(formatSubscription).toHaveBeenCalledWith({ id: "sub-1", name: "Main" }, { appUrl: "https://sub.example.com" });
  });

  it("rejects unauthenticated maintenance routes before service calls", async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(null);
    const responses = [
      await backupRoute.GET(),
      await backupRoute.POST(new Request("http://local.test/api/backup", { method: "POST", body: "{}" })),
      await healthRoute.POST(new Request("http://local.test/api/subscriptions/sub-1/health"), params),
      await validateRoute.POST(new Request("http://local.test/api/subscriptions/sub-1/validate"), params),
      await versionsRoute.GET(new Request("http://local.test/api/subscriptions/sub-1/versions"), params),
      await restoreRoute.POST(new Request("http://local.test/api/subscriptions/sub-1/versions/ver-1/restore"), {
        params: Promise.resolve({ id: "sub-1", versionId: "ver-1" }),
      }),
    ];

    for (const response of responses) {
      expect(response.status).toBe(401);
    }
  });
});
