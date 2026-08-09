import type { ParsedNode } from "@subboost/core/types/node";

export type SubscriptionClientProfile = "default" | "stash";

export const SUBSCRIPTION_CLIENT_QUERY_PARAM = "client";

const STASH_UNSUPPORTED_NODE_TYPES = new Set<string>(["mieru"]);

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function normalizeSubscriptionClientProfile(value: unknown): SubscriptionClientProfile {
  const normalized = normalizeString(value);
  return normalized === "stash" ? "stash" : "default";
}

export function getUnsupportedNodeTypesForSubscriptionClient(client: SubscriptionClientProfile): Set<string> {
  return client === "stash" ? new Set(STASH_UNSUPPORTED_NODE_TYPES) : new Set<string>();
}

export function isNodeSupportedBySubscriptionClient(
  node: ParsedNode,
  client: SubscriptionClientProfile
): boolean {
  const type = normalizeString((node as unknown as { type?: unknown })?.type);
  if (!type) return true;
  return !getUnsupportedNodeTypesForSubscriptionClient(client).has(type);
}

export function filterNodesForSubscriptionClient(
  nodes: ParsedNode[],
  client: SubscriptionClientProfile
): ParsedNode[] {
  if (client === "default") return nodes;
  return nodes.filter((node) => isNodeSupportedBySubscriptionClient(node, client));
}

export function buildSubscriptionClientUrl(
  subscriptionUrl: string,
  client: SubscriptionClientProfile
): string {
  if (client === "default") return subscriptionUrl;
  try {
    const url = new URL(subscriptionUrl);
    url.searchParams.set(SUBSCRIPTION_CLIENT_QUERY_PARAM, client);
    return url.toString();
  } catch {
    const [base, hash = ""] = subscriptionUrl.split("#", 2);
    const separator = base.includes("?") ? "&" : "?";
    const next = `${base}${separator}${SUBSCRIPTION_CLIENT_QUERY_PARAM}=${encodeURIComponent(client)}`;
    return hash ? `${next}#${hash}` : next;
  }
}
