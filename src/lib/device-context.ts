import type {
  DeviceContext,
  DeviceType,
  InputType,
  ViewportInfo,
} from "@/types/study";

function inferDeviceType(userAgent: string, viewport: ViewportInfo | null): DeviceType {
  const agent = userAgent.toLowerCase();

  if (agent.includes("iphone") || agent.includes("android") && agent.includes("mobile")) {
    return "phone";
  }

  if (agent.includes("ipad") || agent.includes("tablet")) {
    return "tablet";
  }

  if (viewport && viewport.width >= 1440) {
    return "desktop";
  }

  if (viewport && viewport.width >= 1024) {
    return "laptop";
  }

  return "unknown";
}

function inferBrowserFamily(userAgent: string) {
  const agent = userAgent.toLowerCase();

  if (agent.includes("edg/")) {
    return "Edge";
  }

  if (agent.includes("chrome/")) {
    return "Chrome";
  }

  if (agent.includes("firefox/")) {
    return "Firefox";
  }

  if (agent.includes("safari/") && !agent.includes("chrome/")) {
    return "Safari";
  }

  return "Unknown";
}

function inferOsFamily(userAgent: string) {
  const agent = userAgent.toLowerCase();

  if (agent.includes("windows")) {
    return "Windows";
  }

  if (agent.includes("mac os x") || agent.includes("macintosh")) {
    return "macOS";
  }

  if (agent.includes("android")) {
    return "Android";
  }

  if (agent.includes("iphone") || agent.includes("ipad") || agent.includes("ios")) {
    return "iOS";
  }

  if (agent.includes("linux")) {
    return "Linux";
  }

  return "Unknown";
}

export function buildDeviceContext(input: {
  userAgent: string | null;
  viewport?: ViewportInfo | null;
  inputType?: InputType;
}): DeviceContext {
  const userAgent = input.userAgent ?? "";
  const viewport = input.viewport ?? null;

  return {
    deviceType: inferDeviceType(userAgent, viewport),
    browserFamily: inferBrowserFamily(userAgent),
    osFamily: inferOsFamily(userAgent),
    viewport,
    inputType: input.inputType ?? "unknown",
  };
}
