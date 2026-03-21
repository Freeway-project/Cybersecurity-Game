"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

function redactStudyToken(event: BeforeSendEvent) {
  try {
    const url = new URL(event.url, window.location.origin);

    if (url.searchParams.has("token")) {
      url.searchParams.delete("token");
    }

    return {
      ...event,
      url: url.toString(),
    };
  } catch {
    return event;
  }
}

export function VercelAnalytics() {
  return <Analytics beforeSend={redactStudyToken} />;
}
