const escapeXml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]!);

export type KeyState = "ready" | "working" | "success" | "setup" | "offline" | "clip-error" | "chat-error" | "browser-error";

const labels: Record<KeyState, [string, string, string]> = {
  ready: ["CLIP", "30 SEC", "#53fc18"],
  working: ["CLIPPING", "PLEASE WAIT", "#53fc18"],
  success: ["POSTED", "TO CHAT", "#53fc18"],
  setup: ["SETUP", "OPEN SETTINGS", "#f7c948"],
  offline: ["OFFLINE", "NO LIVE STREAM", "#9ca3af"],
  "clip-error": ["CLIP", "FAILED", "#ff5c5c"],
  "chat-error": ["CLIPPED", "CHAT FAILED", "#f7c948"],
  "browser-error": ["BROWSER", "NOT READY", "#ff5c5c"]
};

export function renderKeySvg(state: KeyState): string {
  const [top, bottom, accent] = labels[state];
  const busy = state === "working";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
    <rect width="144" height="144" rx="18" fill="#0b0d0e"/>
    <rect x="8" y="8" width="128" height="128" rx="14" fill="#151819" stroke="${accent}" stroke-width="4"/>
    <path d="M47 42l16 15-16 15M97 42L81 57l16 15" fill="none" stroke="${accent}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
    ${busy ? `<circle cx="72" cy="57" r="26" fill="none" stroke="#2c3234" stroke-width="4"/><path d="M72 31a26 26 0 0 1 23 14" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round"/>` : ""}
    <text x="72" y="99" text-anchor="middle" fill="#fff" font-family="Arial, sans-serif" font-size="18" font-weight="800">${escapeXml(top)}</text>
    <text x="72" y="119" text-anchor="middle" fill="${accent}" font-family="Arial, sans-serif" font-size="12" font-weight="700">${escapeXml(bottom)}</text>
  </svg>`;
}

export function svgDataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
