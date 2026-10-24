import { getCurrentUser } from "@/server/current-user";
import { runTeamFollowUpSweep } from "@/server/agent-messages";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No user selected" }, { status: 401 });
  const result = await runTeamFollowUpSweep(user.id);
  return Response.json({ ok: true, ...result });
}
