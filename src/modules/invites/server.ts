import { randomBytes, randomUUID } from "crypto";

import { isDevBypassEnabled } from "@/config/env";
import { getMongoDb } from "@/lib/mongodb";
import { ensureStudyIndexes, markInviteClicked } from "@/modules/instrumentation/server";
import type { InviteRecord, SessionRecord, TokenResolutionResponse } from "@/types/study";

export async function resolveToken(token: string | null | undefined): Promise<TokenResolutionResponse> {
  await ensureStudyIndexes();

  if (!token) {
    if (isDevBypassEnabled()) {
      return {
        ok: true,
        status: "ready",
        participantId: `dev-${randomUUID()}`,
        inviteToken: null,
        devBypass: true,
      };
    }

    return {
      ok: false,
      status: "invalid",
      error: "A valid invite token is required.",
    };
  }

  const db = await getMongoDb();
  const invite = await db.collection<InviteRecord>("invites").findOne({ inviteToken: token });

  if (!invite) {
    return {
      ok: false,
      status: "invalid",
      error: "This invite token was not found.",
    };
  }

  await markInviteClicked(token);

  const latestSession = await db
    .collection<SessionRecord>("sessions")
    .find({ participantId: invite.participantId })
    .sort({ startedAt: -1 })
    .limit(1)
    .next();

  if (latestSession?.completed) {
    return {
      ok: false,
      status: "completed",
      error: "This invite has already completed the pilot.",
    };
  }

  return {
    ok: true,
    status: latestSession ? "resume-available" : "ready",
    participantId: invite.participantId,
    inviteToken: invite.inviteToken,
    existingSessionId: latestSession?.sessionId,
  };
}

export async function createInvites(input: {
  emails: string[];
  cohort?: string;
  yearLevel?: string;
}) {
  await ensureStudyIndexes();

  const now = new Date();
  const uniqueEmails = Array.from(
    new Set(
      input.emails
        .map((email) => email.trim())
        .filter(Boolean),
    ),
  );

  const inviteRecords: InviteRecord[] = uniqueEmails.map((email) => ({
    inviteToken: randomBytes(12).toString("base64url"),
    participantId: randomUUID(),
    email,
    cohort: input.cohort,
    yearLevel: input.yearLevel,
    sentAt: now,
    clickedAt: null,
  }));

  if (inviteRecords.length === 0) {
    return [];
  }

  const db = await getMongoDb();
  await db.collection<InviteRecord>("invites").insertMany(inviteRecords, { ordered: false });

  return inviteRecords;
}
