import { apiError } from "@local/lib/http";
import { generateSubscriptionYaml } from "@local/lib/subscription-service";
import {
  normalizeSubscriptionClientProfile,
  SUBSCRIPTION_CLIENT_QUERY_PARAM,
} from "@subboost/core/subscription/client-compatibility";
import { buildSubscriptionResponseHeaders } from "@subboost/server-core/subscription";
import {
  consumeLocalRateLimit,
  getTrustedClientRateLimitKey,
  hashLocalRateLimitKey,
  localRateLimitResponse,
} from "@local/lib/rate-limit";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const { id: token } = await params;
  const clientKey = getTrustedClientRateLimitKey(request);
  if (clientKey) {
    const clientLimit = consumeLocalRateLimit("subscription-yaml-client", clientKey, {
      limit: 600,
      windowMs: 60_000,
    });
    if (!clientLimit.allowed) {
      return localRateLimitResponse("Too many subscription requests. Try again later.", clientLimit.retryAfterSeconds);
    }
  }
  const tokenLimit = consumeLocalRateLimit("subscription-yaml-token", hashLocalRateLimitKey(token), {
    limit: 120,
    windowMs: 60_000,
  });
  if (!tokenLimit.allowed) {
    return localRateLimitResponse("Too many subscription requests. Try again later.", tokenLimit.retryAfterSeconds);
  }
  const url = new URL(request.url);
  const client = normalizeSubscriptionClientProfile(url.searchParams.get(SUBSCRIPTION_CLIENT_QUERY_PARAM));
  const result = client === "stash"
    ? await generateSubscriptionYaml(token, { client })
    : await generateSubscriptionYaml(token);
  if (!result) return apiError("Subscription YAML not found.", "NOT_FOUND", 404);
  return new Response(result.yaml, {
    headers: buildSubscriptionResponseHeaders(result.name, result.subscriptionInfo, {
      cacheControl: "no-store",
      cacheExpirySeconds: result.cacheExpirySeconds,
      autoUpdateIntervalSeconds: result.autoUpdateIntervalSeconds,
      isAdmin: result.isAdmin,
    }),
  });
}
