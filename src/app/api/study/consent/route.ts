import { NextResponse } from "next/server";

import { acceptConsent } from "@/modules/study/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await acceptConsent(body, request.headers.get("user-agent"));
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to save consent.",
      },
      { status: 400 },
    );
  }
}
