import { withCurrentAdmin } from "@local/lib/api-auth";
import { apiError, json } from "@local/lib/http";
import { listSubscriptionVersions } from "@local/lib/subscription-version-service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  return withCurrentAdmin(async (admin) => {
    const versions = await listSubscriptionVersions(admin.id, id);
    if (!versions) return apiError("Subscription not found.", "NOT_FOUND", 404);
    return json({ versions });
  });
}
