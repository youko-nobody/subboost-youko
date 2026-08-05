import { withCurrentAdmin } from "@local/lib/api-auth";
import { apiError, json } from "@local/lib/http";
import { checkSubscriptionRuleSetConnectivity } from "@local/lib/rule-set-connectivity-service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  return withCurrentAdmin(async (admin) => {
    const ruleSetConnectivity = await checkSubscriptionRuleSetConnectivity(admin.id, id);
    if (!ruleSetConnectivity) return apiError("Subscription not found.", "NOT_FOUND", 404);
    return json({ ruleSetConnectivity });
  });
}
