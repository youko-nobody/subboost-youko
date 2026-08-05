import { withCurrentAdmin } from "@local/lib/api-auth";
import { getAppUrl, getRequestAppUrl } from "@local/lib/env";
import { json } from "@local/lib/http";

export async function GET(request: Request) {
  return withCurrentAdmin(async () =>
    json({
      configuredAppUrl: getAppUrl(),
      effectiveAppUrl: getRequestAppUrl(request),
    })
  );
}
