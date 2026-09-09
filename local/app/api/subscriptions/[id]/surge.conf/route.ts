import { apiError } from "@local/lib/http";
import { generateSurgeSubscription } from "@local/lib/subscription-service";
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
    const clientLimit = consumeLocalRateLimit("subscription-surge-client", clientKey, {
      limit: 600,
      windowMs: 60_000,
    });
    if (!clientLimit.allowed) {
      return localRateLimitResponse("Too many subscription requests. Try again later.", clientLimit.retryAfterSeconds);
    }
  }

  const tokenLimit = consumeLocalRateLimit("subscription-surge-token", hashLocalRateLimitKey(token), {
    limit: 120,
    windowMs: 60_000,
  });
  if (!tokenLimit.allowed) {
    return localRateLimitResponse("Too many subscription requests. Try again later.", tokenLimit.retryAfterSeconds);
  }

  const result = await generateSurgeSubscription(token);
  if (!result) return apiError("Surge subscription not found or contains no compatible nodes.", "NOT_FOUND", 404);

  return new Response(result.content, {
    headers: {
      ...buildSubscriptionResponseHeaders(result.name, result.subscriptionInfo, {
        cacheControl: "no-store",
        cacheExpirySeconds: result.cacheExpirySeconds,
        autoUpdateIntervalSeconds: result.autoUpdateIntervalSeconds,
        isAdmin: result.isAdmin,
      }),
      "content-type": "text/plain;charset=utf-8",
    },
  });
}
