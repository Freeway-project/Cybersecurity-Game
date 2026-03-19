"use client";

import type { ClientStudyEventInput } from "@/types/study";

export async function sendStudyEvent(input: ClientStudyEventInput) {
  try {
    await fetch("/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
  } catch {
    // Best-effort logging only.
  }
}
