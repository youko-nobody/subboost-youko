import {
  deleteSubscriptionResponse,
  getSubscriptionResponse,
  updateSubscriptionResponse,
} from "@local/lib/subscription-route-handlers";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;
  return getSubscriptionResponse(id, request);
}

export async function PUT(request: Request, { params }: RouteContext) {
  const { id } = await params;
  return updateSubscriptionResponse(request, id);
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  return deleteSubscriptionResponse(id);
}
