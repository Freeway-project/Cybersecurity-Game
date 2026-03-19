import { NextResponse } from "next/server";

import { resolveToken } from "@/modules/invites/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string | null };
    const result = await resolveToken(body.token);
    const status = result.ok ? 200 : result.status === "completed" ? 409 : 400;

    return NextResponse.json(result, { status });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        status: "invalid",
        error: error instanceof Error ? error.message : "Unable to resolve token.",
      },
      { status: 500 },
    );
  }
}
