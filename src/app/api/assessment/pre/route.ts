import { NextResponse } from "next/server";

// Assessment step has been removed. This endpoint is a no-op stub kept for backward compatibility.
export async function POST() {
  return NextResponse.json({ ok: true, score: 0 });
}
