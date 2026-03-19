import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ADMIN_COOKIE_NAME,
  adminCookieValue,
  validateAdminSecret,
} from "@/modules/admin/server";
import { getServerEnv } from "@/config/env";

const loginSchema = z.object({
  secret: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const input = loginSchema.parse(await request.json());

    if (!validateAdminSecret(input.secret)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid admin secret.",
        },
        { status: 401 },
      );
    }

    const env = getServerEnv();
    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: adminCookieValue(env.ADMIN_SECRET ?? input.secret),
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: env.NODE_ENV === "production",
      maxAge: 60 * 60 * 12,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to sign in.",
      },
      { status: 400 },
    );
  }
}
