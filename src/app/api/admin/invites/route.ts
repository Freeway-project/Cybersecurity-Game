import { NextResponse } from "next/server";
import { z } from "zod";

import { getServerEnv } from "@/config/env";
import { requireAdmin } from "@/modules/admin/server";
import { createInvites } from "@/modules/invites/server";

const createInvitesSchema = z.object({
  emails: z.array(z.string().email()).min(1),
  cohort: z.string().trim().max(120).optional(),
  yearLevel: z.string().trim().max(120).optional(),
});

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const input = createInvitesSchema.parse(await request.json());
    const createdInvites = await createInvites(input);
    const env = getServerEnv();
    const requestUrl = new URL(request.url);
    const baseUrl = env.APP_BASE_URL ?? requestUrl.origin;

    return NextResponse.json({
      ok: true,
      invites: createdInvites.map((invite) => ({
        email: invite.email,
        participantId: invite.participantId,
        inviteToken: invite.inviteToken,
        startUrl: `${baseUrl}/start?token=${invite.inviteToken}`,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to create invites.",
      },
      { status: 400 },
    );
  }
}
