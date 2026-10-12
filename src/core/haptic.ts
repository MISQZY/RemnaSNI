/**
 * A buzz of the phone: `kind` for the app framing the site, `pattern` for the vibration API. In RemnaWeb's frame (the
 * Mini App, the web app) the vibration is out of reach — iOS has none, and browsers refuse it to a cross-origin frame —
 * so the site asks its parent ("sni:haptic"), which buzzes through Telegram's haptics; alone, it vibrates itself.
 */
export function haptic(kind: "tap" | "success" | "error", pattern: number | number[]) {
  if (window.parent !== window) window.parent.postMessage({ type: "sni:haptic", kind }, "*");
  else navigator.vibrate?.(pattern);
}
