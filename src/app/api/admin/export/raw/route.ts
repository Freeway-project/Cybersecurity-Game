import { NextResponse } from "next/server";

import { exportRawData } from "@/modules/admin/server";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const collection = url.searchParams.get("collection");
    const payload = await exportRawData(collection);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to export data.",
      },
      { status: 400 },
    );
  }
}
