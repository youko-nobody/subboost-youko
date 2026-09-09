export type SubscriptionProfileType = "clash" | "surge";

export function normalizeSubscriptionProfileType(value: unknown): SubscriptionProfileType {
  return value === "surge" ? "surge" : "clash";
}

function splitUrlSuffix(input: string): { base: string; suffix: string } {
  const match = input.match(/^([^?#]*)([?#].*)?$/);
  return { base: match?.[1] ?? input, suffix: match?.[2] ?? "" };
}

function replaceTerminalPath(subscriptionUrl: string, filename: string): string {
  try {
    const url = new URL(subscriptionUrl);
    if (/\/(?:config\.ya?ml|surge\.conf)$/i.test(url.pathname)) {
      url.pathname = url.pathname.replace(/\/(?:config\.ya?ml|surge\.conf)$/i, `/${filename}`);
    } else {
      url.pathname = `${url.pathname.replace(/\/+$/, "")}/${filename}`;
    }
    return url.toString();
  } catch {
    const { base, suffix } = splitUrlSuffix(subscriptionUrl);
    const next = /\/(?:config\.ya?ml|surge\.conf)$/i.test(base)
      ? base.replace(/\/(?:config\.ya?ml|surge\.conf)$/i, `/${filename}`)
      : `${base.replace(/\/+$/, "")}/${filename}`;
    return `${next}${suffix}`;
  }
}

export function buildClashSubscriptionUrl(subscriptionUrl: string): string {
  return replaceTerminalPath(subscriptionUrl, "config.yaml");
}

export function buildSurgeSubscriptionUrl(subscriptionUrl: string): string {
  return replaceTerminalPath(subscriptionUrl, "surge.conf");
}

export function buildTypedSubscriptionUrl(
  subscriptionUrl: string,
  profileType: SubscriptionProfileType
): string {
  return profileType === "surge"
    ? buildSurgeSubscriptionUrl(subscriptionUrl)
    : buildClashSubscriptionUrl(subscriptionUrl);
}
