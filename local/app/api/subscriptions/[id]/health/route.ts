import { withCurrentAdmin } from "@local/lib/api-auth";
import { apiError, json } from "@local/lib/http";
import { checkSubscriptionHealth } from "@local/lib/subscription-health-service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  return withCurrentAdmin(async (admin) => {
    const health = await checkSubscriptionHealth(admin.id, id);
    if (!health) return apiError("Subscription not found.", "NOT_FOUND", 404);
    return json({ health });
  });
}
