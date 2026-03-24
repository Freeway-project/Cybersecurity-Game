import { NextResponse } from "next/server";

import { exportAnalysisCsv } from "@/modules/admin/server";

export async function GET() {
  try {
    const csv = await exportAnalysisCsv();

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="pilot-analysis-export.csv"',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to export analysis data.",
      },
      { status: 400 },
    );
  }
}
