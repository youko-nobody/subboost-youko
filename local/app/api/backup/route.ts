import { withCurrentAdmin } from "@local/lib/api-auth";
import { exportLocalBackup, importLocalBackup } from "@local/lib/backup-service";
import { apiError, json, jsonBodyError, LOCAL_JSON_BODY_LIMITS, readJsonBody } from "@local/lib/http";

function backupFilename(): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `subboost-backup-${stamp}.json`;
}

export async function GET() {
  return withCurrentAdmin(async (admin) => {
    const backup = await exportLocalBackup(admin.id);
    return new Response(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="${backupFilename()}"`,
        "cache-control": "no-store",
      },
    });
  });
}

export async function POST(request: Request) {
  return withCurrentAdmin(async (admin) => {
    const parsedBody = await readJsonBody(request, LOCAL_JSON_BODY_LIMITS.backup);
    if (!parsedBody.ok) return jsonBodyError(parsedBody, "备份文件不是有效 JSON。");

    try {
      return json({ result: await importLocalBackup(admin.id, parsedBody.value) });
    } catch (error) {
      return apiError(error instanceof Error ? error.message : "恢复失败。", "BAD_REQUEST", 400);
    }
  });
}
