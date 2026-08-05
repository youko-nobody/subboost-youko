import { beforeEach, describe, expect, it } from "vitest";
import { useUIStore } from "./ui-store";

describe("useUIStore", () => {
  beforeEach(() => {
    useUIStore.setState({ editingSubscription: null });
  });

  it("stores and clears the in-memory editing subscription", () => {
    const subscription = {
      id: "sub-1",
      token: "token-1",
      name: "Primary",
      autoUpdateInterval: 86400,
      smartNodeMatchingEnabled: true,
      updateLockEnabled: true,
    };

    useUIStore.getState().setEditingSubscription(subscription);
    expect(useUIStore.getState().editingSubscription).toEqual(subscription);

    useUIStore.getState().clearEditingSubscription();
    expect(useUIStore.getState().editingSubscription).toBeNull();
  });
});
