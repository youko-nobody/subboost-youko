import { withCurrentAdmin } from "@local/lib/api-auth";
import { apiError, json } from "@local/lib/http";
import { validateExistingSubscriptionConfig } from "@local/lib/subscription-health-service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  return withCurrentAdmin(async (admin) => {
    const validation = await validateExistingSubscriptionConfig(admin.id, id);
    if (!validation) return apiError("Subscription not found.", "NOT_FOUND", 404);
    return json({ validation });
  });
}
