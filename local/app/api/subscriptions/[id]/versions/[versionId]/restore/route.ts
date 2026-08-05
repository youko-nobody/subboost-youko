import { withCurrentAdmin } from "@local/lib/api-auth";
import { getRequestAppUrl } from "@local/lib/env";
import { apiError, json } from "@local/lib/http";
import { formatSubscription } from "@local/lib/subscription-service";
import { restoreSubscriptionVersion } from "@local/lib/subscription-version-service";

type RouteContext = {
  params: Promise<{ id: string; versionId: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const { id, versionId } = await params;
  return withCurrentAdmin(async (admin) => {
    const row = await restoreSubscriptionVersion(admin.id, id, versionId);
    if (!row) return apiError("Subscription version not found.", "NOT_FOUND", 404);
    return json({ subscription: formatSubscription(row, { appUrl: getRequestAppUrl(request) }) });
  });
}
