/** Helpers for detecting in-app browsers (TikTok, Instagram, Facebook, etc.)
 *  and opening links that those browsers normally block (especially WhatsApp).
 */

export type InAppApp =
  | "tiktok"
  | "instagram"
  | "facebook"
  | "messenger"
  | "line"
  | "snapchat"
  | "twitter"
  | "linkedin"
  | "other";

const UA = () => (typeof navigator !== "undefined" ? navigator.userAgent || "" : "");

export function isAndroid(): boolean {
  return /Android/i.test(UA());
}

export function isIOS(): boolean {
  return /iPad|iPhone|iPod/i.test(UA()) && !/Windows/i.test(UA());
}

export function detectInAppBrowser(): InAppApp | null {
  const ua = UA();
  if (/musical_ly|Bytedance|TikTok/i.test(ua)) return "tiktok";
  if (/Instagram/i.test(ua)) return "instagram";
  if (/FBAN|FBAV|FB_IAB|FBIOS/i.test(ua)) return "facebook";
  if (/Messenger/i.test(ua)) return "messenger";
  if (/Line\//i.test(ua)) return "line";
  if (/Snapchat/i.test(ua)) return "snapchat";
  if (/Twitter/i.test(ua)) return "twitter";
  if (/LinkedInApp/i.test(ua)) return "linkedin";
  return null;
}

export function isInAppBrowser(): boolean {
  return detectInAppBrowser() !== null;
}

export function isWhatsAppUrl(url: string): boolean {
  if (!url) return false;
  if (/^whatsapp:\/\//i.test(url)) return true;
  try {
    const u = new URL(url.includes("://") ? url : `https://${url}`);
    const h = u.hostname.toLowerCase().replace(/^www\./, "");
    return h === "wa.me" || h === "api.whatsapp.com" || h === "whatsapp.com" || h === "chat.whatsapp.com";
  } catch {
    return false;
  }
}

/** Parse a wa.me / api.whatsapp.com URL → { phone, text } */
export function parseWhatsAppUrl(url: string): { phone: string; text?: string } | null {
  try {
    const u = new URL(url.includes("://") ? url : `https://${url}`);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    let phone = "";
    let text: string | undefined;
    if (host === "wa.me") {
      phone = u.pathname.replace(/^\/+/, "").split("/")[0] ?? "";
      const t = u.searchParams.get("text");
      if (t) text = t;
    } else if (host === "api.whatsapp.com" || host === "whatsapp.com") {
      phone = u.searchParams.get("phone") || "";
      const t = u.searchParams.get("text");
      if (t) text = t;
    } else {
      return null;
    }
    phone = phone.replace(/[^\d]/g, "");
    if (!phone) return null;
    return { phone, text };
  } catch {
    return null;
  }
}

/** Native WhatsApp scheme URL (whatsapp://send?...). Often works on iOS
 *  in-app browsers when triggered from a real anchor click. */
export function buildWhatsAppScheme(phone: string, text?: string): string {
  const p = phone.replace(/[^\d]/g, "");
  const q = `phone=${p}${text ? `&text=${encodeURIComponent(text)}` : ""}`;
  return `whatsapp://send?${q}`;
}

/** Build an Android intent:// URL that launches WhatsApp directly,
 *  bypassing TikTok/IG/FB in-app webviews. */
export function buildWhatsAppAndroidIntent(phone: string, text?: string): string {
  const p = phone.replace(/[^\d]/g, "");
  const fallback = `https://wa.me/${p}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
  const q = `phone=${p}${text ? `&text=${encodeURIComponent(text)}` : ""}`;
  return `intent://send/?${q}#Intent;scheme=whatsapp;package=com.whatsapp;S.browser_fallback_url=${encodeURIComponent(fallback)};end`;
}

/** Best-effort: open the user's external browser on Android via intent.
 *  Some in-app browsers honor this, some don't. */
export function buildAndroidChromeIntent(url: string): string {
  try {
    const u = new URL(url);
    const stripped = `${u.host}${u.pathname}${u.search}${u.hash}`;
    return `intent://${stripped}#Intent;scheme=${u.protocol.replace(":", "")};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`;
  } catch {
    return url;
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
