import type { SubscriptionSource } from "@subboost/ui/store/config-store";
import type { SubscriptionProfileType } from "@subboost/core/subscription/profile-type";

export type EditingSubscription = {
  id: string;
  token: string;
  name: string;
  autoUpdateInterval: number | null;
  smartNodeMatchingEnabled: boolean;
  updateLockEnabled: boolean;
  profileType?: SubscriptionProfileType;
};

export type EditingSubscriptionLoaderOptions = {
  editSubscriptionId: string | null;
  loadSubscription?: (id: string) => Promise<Response>;
  loginHref?: string;
  setCopied: (copied: boolean) => void;
  setEditingSubscription: (subscription: EditingSubscription | null) => void;
  setStoreSources: (sources: SubscriptionSource[]) => void;
  setSubscriptionName: (name: string) => void;
  setSubscriptionUrl: (url: string) => void;
};
