/**
 * Minimal "device · browser" label from a User-Agent string, for the devices
 * breakdown on /admin/analytics/live. Not a full UA parser — just enough
 * signal to bucket real traffic without pulling in a dependency.
 */
export function deviceLabel(userAgent: string | null): string {
  if (!userAgent) return "Unknown";
  const ua = userAgent;

  const deviceType = /iPad|Tablet(?!.*Mobile)/i.test(ua)
    ? "Tablet"
    : /Mobi|iPhone|Android.*Mobile/i.test(ua)
      ? "Mobile"
      : "Desktop";

  let browser = "Other";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/CriOS\//i.test(ua)) browser = "Chrome";
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = "Chrome";
  else if (/Safari\//i.test(ua) && /Version\//i.test(ua)) browser = "Safari";
  else if (/MSIE|Trident/i.test(ua)) browser = "IE";

  return `${deviceType} · ${browser}`;
}
