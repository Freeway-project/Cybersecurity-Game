import { NextResponse } from "next/server";

import { logStudyEvent } from "@/modules/instrumentation/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await logStudyEvent(body, request.headers.get("user-agent"));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to log the event.",
      },
      { status: 400 },
    );
  }
}
