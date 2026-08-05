import { beforeEach, describe, expect, it, vi } from "vitest";
import { exportLocalBackup, importLocalBackup } from "./backup-service";

const mocks = vi.hoisted(() => ({
  prisma: {
    subscription: { findMany: vi.fn() },
    subscriptionVersion: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    localTemplate: { findMany: vi.fn() },
  },
  createSubscription: vi.fn(),
  readSubscriptionSecrets: vi.fn(),
  createTemplate: vi.fn(),
  decryptJsonObject: vi.fn(),
}));

vi.mock("./prisma", () => ({ prisma: mocks.prisma }));
vi.mock("./subscription-service", () => ({
  createSubscription: mocks.createSubscription,
  readSubscriptionSecrets: mocks.readSubscriptionSecrets,
}));
vi.mock("./template-service", () => ({ createTemplate: mocks.createTemplate }));
vi.mock("./crypto", () => ({
  decryptJson: (value: string | null | undefined, fallback: unknown) => (value ? JSON.parse(value) : fallback),
  decryptJsonObject: (value: string | null | undefined) => {
    if (!value || value === "template-config") return mocks.decryptJsonObject(value);
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  },
  encryptJson: (value: unknown) => JSON.stringify(value),
}));

function subscriptionRow() {
  return {
    id: "sub-1",
    name: "Main",
    autoUpdateInterval: 86400,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  };
}

describe("backup service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.subscription.findMany.mockResolvedValue([subscriptionRow()]);
    mocks.prisma.subscriptionVersion.findMany.mockResolvedValue([
      {
        id: "ver-1",
        subscriptionId: "sub-1",
        name: "Main",
        reason: "manual_update",
        encryptedUrls: JSON.stringify(["https://example.com/old"]),
        encryptedNodes: JSON.stringify([{ name: "Old Node" }]),
        encryptedConfig: JSON.stringify({ sources: [{ id: "old-source" }] }),
        encryptedSubscriptionInfo: JSON.stringify({ total: 512 }),
        autoUpdateInterval: null,
        createdAt: new Date("2026-01-01T12:00:00.000Z"),
      },
    ]);
    mocks.prisma.subscriptionVersion.create.mockResolvedValue({});
    mocks.prisma.localTemplate.findMany.mockResolvedValue([
      {
        id: "tpl-1",
        name: "Template",
        description: "Desc",
        encryptedConfig: "template-config",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      },
    ]);
    mocks.readSubscriptionSecrets.mockReturnValue({
      urls: ["https://example.com/sub"],
      nodes: [{ name: "Node" }],
      config: { template: "blank" },
      subscriptionInfo: { total: 1024 },
    });
    mocks.decryptJsonObject.mockReturnValue({ template: "blank" });
    mocks.createSubscription.mockResolvedValue({ id: "restored-sub" });
    mocks.createTemplate.mockResolvedValue({});
  });

  it("exports subscriptions and templates as portable JSON", async () => {
    const backup = await exportLocalBackup("owner-1");

    expect(mocks.prisma.subscription.findMany).toHaveBeenCalledWith({
      where: { ownerId: "owner-1" },
      include: { autoUpdateState: true },
      orderBy: { updatedAt: "desc" },
    });
    expect(backup).toMatchObject({
      schema: "subboost-youko-backup/v1",
      subscriptions: [
        {
          originalId: "sub-1",
          name: "Main",
          urls: ["https://example.com/sub"],
          nodes: [{ name: "Node" }],
          config: { template: "blank" },
          autoUpdateInterval: 86400,
          versions: [
            expect.objectContaining({
              originalId: "ver-1",
              reason: "manual_update",
              urls: ["https://example.com/old"],
            }),
          ],
        },
      ],
      templates: [
        {
          originalId: "tpl-1",
          name: "Template",
          config: { template: "blank" },
        },
      ],
    });
  });

  it("imports backup entries as new subscriptions and templates", async () => {
    const result = await importLocalBackup("owner-1", {
      subscriptions: [
        {
          name: "Restored",
          urls: ["https://example.com/sub"],
          nodes: [{ name: "Node", type: "ss", server: "example.com", port: 443 }],
          config: { template: "blank" },
          subscriptionInfo: { total: 1024 },
          autoUpdateInterval: 86400,
          versions: [
            {
              name: "Restored old",
              reason: "manual_update",
              urls: ["https://example.com/old"],
              nodes: [{ name: "Old Node" }],
              config: { sources: [{ id: "old-source" }] },
              subscriptionInfo: { total: 512 },
              autoUpdateInterval: null,
              createdAt: "2026-01-01T12:00:00.000Z",
            },
          ],
        },
      ],
      templates: [
        {
          name: "Template",
          description: "Desc",
          config: { schema: "subboost-template-config/v1", template: "blank", enabledProxyGroups: [], customProxyGroups: [], customRuleSets: [], customRules: [], dialerProxyGroups: [], dnsYaml: "", mixedPort: 7890, allowLan: false, testUrl: "https://example.com", testInterval: 300, ruleProviderBaseUrl: "https://rules.example.com" },
        },
      ],
    });

    expect(result).toMatchObject({
      importedSubscriptions: 1,
      importedTemplates: 1,
      skippedSubscriptions: 0,
      skippedTemplates: 0,
    });
    expect(mocks.createSubscription).toHaveBeenCalledWith("owner-1", expect.objectContaining({ name: "Restored" }));
    expect(mocks.prisma.subscriptionVersion.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        subscriptionId: "restored-sub",
        ownerId: "owner-1",
        reason: "manual_update",
      }),
    }));
    expect(mocks.createTemplate).toHaveBeenCalledWith("owner-1", expect.objectContaining({ name: "Template" }));
  });
});
