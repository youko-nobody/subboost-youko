import { previewSubscriptionRefreshResponse } from "@local/lib/subscription-route-handlers";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  return previewSubscriptionRefreshResponse(id);
}
