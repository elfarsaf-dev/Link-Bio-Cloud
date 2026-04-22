import type { ComponentType, SVGProps } from "react";
import {
  SiInstagram,
  SiTiktok,
  SiYoutube,
  SiWhatsapp,
  SiTelegram,
  SiDiscord,
  SiFacebook,
  SiThreads,
  SiSnapchat,
  SiTwitch,
  SiSpotify,
  SiGithub,
  SiPinterest,
  SiLine,
} from "react-icons/si";
import { FaXTwitter, FaLinkedin } from "react-icons/fa6";
import { Mail, Phone, Globe, Link as LinkIcon } from "lucide-react";

export type PlatformMode = "username" | "whatsapp" | "email" | "phone" | "url";

type IconType = ComponentType<SVGProps<SVGSVGElement>> | ComponentType<{ className?: string }>;

export type Platform = {
  id: string;
  name: string;
  Icon: IconType;
  color: string;
  mode: PlatformMode;
  /** Default title to suggest when user picks this platform */
  defaultTitle: string;
  /** Static prefix shown inside the input (visual hint, not stored) */
  inputPrefix?: string;
  placeholder: string;
  /** Extra placeholder for the second field (e.g. WA message) */
  placeholder2?: string;
  /** Build the final URL from the user input value (and optional extra) */
  build: (value: string, extra?: string) => string;
  /** Try to parse a stored URL back into { value, extra }; null if not matching */
  parse: (url: string) => { value: string; extra?: string } | null;
};

const stripAt = (v: string) => v.trim().replace(/^@+/, "").replace(/\s+/g, "");
const digits = (v: string) => v.replace(/[^\d]/g, "");

function tryHost(url: string): { host: string; pathname: string; search: string } | null {
  try {
    const u = new URL(url.includes("://") ? url : `https://${url}`);
    return { host: u.hostname.toLowerCase().replace(/^www\./, ""), pathname: u.pathname, search: u.search };
  } catch {
    return null;
  }
}

export const PLATFORMS: Platform[] = [
  {
    id: "whatsapp",
    name: "WhatsApp",
    Icon: SiWhatsapp,
    color: "#25D366",
    mode: "whatsapp",
    defaultTitle: "WhatsApp",
    placeholder: "628123456789",
    placeholder2: "Pesan default (opsional)",
    build: (phone, msg) => {
      const p = digits(phone);
      const t = msg && msg.trim() ? `?text=${encodeURIComponent(msg.trim())}` : "";
      return `https://wa.me/${p}${t}`;
    },
    parse: (url) => {
      const u = tryHost(url);
      if (!u) return null;
      let phone = "";
      let text: string | undefined;
      if (u.host === "wa.me") {
        phone = u.pathname.replace(/^\/+/, "").split("/")[0] ?? "";
      } else if (u.host === "api.whatsapp.com" || u.host === "whatsapp.com") {
        const params = new URLSearchParams(u.search);
        phone = params.get("phone") || "";
        text = params.get("text") || undefined;
      } else {
        return null;
      }
      if (!text) {
        const params = new URLSearchParams(u.search);
        text = params.get("text") || undefined;
      }
      if (!phone) return null;
      return { value: phone, extra: text };
    },
  },
  {
    id: "instagram",
    name: "Instagram",
    Icon: SiInstagram,
    color: "#E4405F",
    mode: "username",
    defaultTitle: "Instagram",
    inputPrefix: "@",
    placeholder: "username",
    build: (u) => `https://instagram.com/${stripAt(u)}`,
    parse: (url) => {
      const u = tryHost(url);
      if (!u) return null;
      if (!/(^|\.)instagram\.com$/.test(u.host) && u.host !== "instagr.am") return null;
      const seg = u.pathname.split("/").filter(Boolean)[0];
      return seg ? { value: seg } : null;
    },
  },
  {
    id: "tiktok",
    name: "TikTok",
    Icon: SiTiktok,
    color: "#010101",
    mode: "username",
    defaultTitle: "TikTok",
    inputPrefix: "@",
    placeholder: "username",
    build: (u) => `https://tiktok.com/@${stripAt(u)}`,
    parse: (url) => {
      const u = tryHost(url);
      if (!u) return null;
      if (!/(^|\.)tiktok\.com$/.test(u.host)) return null;
      const seg = u.pathname.split("/").filter(Boolean)[0];
      if (!seg || !seg.startsWith("@")) return null;
      return { value: seg.slice(1) };
    },
  },
  {
    id: "x",
    name: "X / Twitter",
    Icon: FaXTwitter,
    color: "#000000",
    mode: "username",
    defaultTitle: "X",
    inputPrefix: "@",
    placeholder: "username",
    build: (u) => `https://x.com/${stripAt(u)}`,
    parse: (url) => {
      const u = tryHost(url);
      if (!u) return null;
      if (u.host !== "x.com" && u.host !== "twitter.com") return null;
      const seg = u.pathname.split("/").filter(Boolean)[0];
      return seg ? { value: seg } : null;
    },
  },
  {
    id: "youtube",
    name: "YouTube",
    Icon: SiYoutube,
    color: "#FF0000",
    mode: "username",
    defaultTitle: "YouTube",
    inputPrefix: "@",
    placeholder: "handle",
    build: (u) => `https://youtube.com/@${stripAt(u)}`,
    parse: (url) => {
      const u = tryHost(url);
      if (!u) return null;
      if (!/(^|\.)youtube\.com$/.test(u.host) && u.host !== "youtu.be") return null;
      const seg = u.pathname.split("/").filter(Boolean)[0];
      if (!seg || !seg.startsWith("@")) return null;
      return { value: seg.slice(1) };
    },
  },
  {
    id: "threads",
    name: "Threads",
    Icon: SiThreads,
    color: "#000000",
    mode: "username",
    defaultTitle: "Threads",
    inputPrefix: "@",
    placeholder: "username",
    build: (u) => `https://threads.net/@${stripAt(u)}`,
    parse: (url) => {
      const u = tryHost(url);
      if (!u) return null;
      if (!/(^|\.)threads\.(net|com)$/.test(u.host)) return null;
      const seg = u.pathname.split("/").filter(Boolean)[0];
      if (!seg || !seg.startsWith("@")) return null;
      return { value: seg.slice(1) };
    },
  },
  {
    id: "telegram",
    name: "Telegram",
    Icon: SiTelegram,
    color: "#26A5E4",
    mode: "username",
    defaultTitle: "Telegram",
    inputPrefix: "@",
    placeholder: "username",
    build: (u) => `https://t.me/${stripAt(u)}`,
    parse: (url) => {
      const u = tryHost(url);
      if (!u) return null;
      if (u.host !== "t.me" && !/(^|\.)telegram\.(me|org)$/.test(u.host)) return null;
      const seg = u.pathname.split("/").filter(Boolean)[0];
      return seg ? { value: seg } : null;
    },
  },
  {
    id: "snapchat",
    name: "Snapchat",
    Icon: SiSnapchat,
    color: "#FFFC00",
    mode: "username",
    defaultTitle: "Snapchat",
    placeholder: "username",
    build: (u) => `https://snapchat.com/add/${stripAt(u)}`,
    parse: (url) => {
      const u = tryHost(url);
      if (!u) return null;
      if (!/(^|\.)snapchat\.com$/.test(u.host)) return null;
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0] === "add" && parts[1]) return { value: parts[1] };
      return null;
    },
  },
  {
    id: "twitch",
    name: "Twitch",
    Icon: SiTwitch,
    color: "#9146FF",
    mode: "username",
    defaultTitle: "Twitch",
    placeholder: "username",
    build: (u) => `https://twitch.tv/${stripAt(u)}`,
    parse: (url) => {
      const u = tryHost(url);
      if (!u) return null;
      if (!/(^|\.)twitch\.tv$/.test(u.host)) return null;
      const seg = u.pathname.split("/").filter(Boolean)[0];
      return seg ? { value: seg } : null;
    },
  },
  {
    id: "github",
    name: "GitHub",
    Icon: SiGithub,
    color: "#181717",
    mode: "username",
    defaultTitle: "GitHub",
    placeholder: "username",
    build: (u) => `https://github.com/${stripAt(u)}`,
    parse: (url) => {
      const u = tryHost(url);
      if (!u) return null;
      if (!/(^|\.)github\.com$/.test(u.host)) return null;
      const seg = u.pathname.split("/").filter(Boolean)[0];
      return seg ? { value: seg } : null;
    },
  },
  {
    id: "pinterest",
    name: "Pinterest",
    Icon: SiPinterest,
    color: "#BD081C",
    mode: "username",
    defaultTitle: "Pinterest",
    placeholder: "username",
    build: (u) => `https://pinterest.com/${stripAt(u)}`,
    parse: (url) => {
      const u = tryHost(url);
      if (!u) return null;
      if (!/(^|\.)pinterest\./.test(u.host)) return null;
      const seg = u.pathname.split("/").filter(Boolean)[0];
      return seg ? { value: seg } : null;
    },
  },
  {
    id: "facebook",
    name: "Facebook",
    Icon: SiFacebook,
    color: "#1877F2",
    mode: "url",
    defaultTitle: "Facebook",
    placeholder: "https://facebook.com/...",
    build: (u) => normalizeUrl(u),
    parse: (url) => {
      const u = tryHost(url);
      if (!u) return null;
      return /(^|\.)facebook\.com$|(^|\.)fb\.(com|me|watch)$/.test(u.host) ? { value: url } : null;
    },
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    Icon: FaLinkedin,
    color: "#0A66C2",
    mode: "url",
    defaultTitle: "LinkedIn",
    placeholder: "https://linkedin.com/in/...",
    build: (u) => normalizeUrl(u),
    parse: (url) => {
      const u = tryHost(url);
      if (!u) return null;
      return /(^|\.)linkedin\.com$|(^|\.)lnkd\.in$/.test(u.host) ? { value: url } : null;
    },
  },
  {
    id: "discord",
    name: "Discord",
    Icon: SiDiscord,
    color: "#5865F2",
    mode: "url",
    defaultTitle: "Discord",
    placeholder: "https://discord.gg/...",
    build: (u) => normalizeUrl(u),
    parse: (url) => {
      const u = tryHost(url);
      if (!u) return null;
      return /(^|\.)discord\.(com|gg)$|(^|\.)discordapp\.com$/.test(u.host) ? { value: url } : null;
    },
  },
  {
    id: "spotify",
    name: "Spotify",
    Icon: SiSpotify,
    color: "#1DB954",
    mode: "url",
    defaultTitle: "Spotify",
    placeholder: "https://open.spotify.com/...",
    build: (u) => normalizeUrl(u),
    parse: (url) => {
      const u = tryHost(url);
      if (!u) return null;
      return /(^|\.)spotify\.com$/.test(u.host) ? { value: url } : null;
    },
  },
  {
    id: "line",
    name: "LINE",
    Icon: SiLine,
    color: "#00C300",
    mode: "url",
    defaultTitle: "LINE",
    placeholder: "https://line.me/ti/p/...",
    build: (u) => normalizeUrl(u),
    parse: (url) => {
      const u = tryHost(url);
      if (!u) return null;
      return /(^|\.)line\.me$/.test(u.host) ? { value: url } : null;
    },
  },
  {
    id: "email",
    name: "Email",
    Icon: Mail,
    color: "#EA4335",
    mode: "email",
    defaultTitle: "Email",
    placeholder: "nama@email.com",
    build: (e) => `mailto:${e.trim()}`,
    parse: (url) => {
      const m = /^mailto:(.+)$/i.exec(url.trim());
      return m ? { value: m[1] } : null;
    },
  },
  {
    id: "phone",
    name: "Telepon",
    Icon: Phone,
    color: "#34A853",
    mode: "phone",
    defaultTitle: "Telepon",
    placeholder: "+628123456789",
    build: (p) => `tel:${p.replace(/\s+/g, "")}`,
    parse: (url) => {
      const m = /^(?:tel|sms):(.+)$/i.exec(url.trim());
      return m ? { value: m[1] } : null;
    },
  },
  {
    id: "custom",
    name: "Lainnya",
    Icon: Globe,
    color: "#6B7280",
    mode: "url",
    defaultTitle: "",
    placeholder: "https://...",
    build: (u) => normalizeUrl(u),
    parse: () => null,
  },
];

function normalizeUrl(u: string): string {
  const t = u.trim();
  if (!t) return t;
  if (/^(https?:|mailto:|tel:|sms:)/i.test(t)) return t;
  return `https://${t}`;
}

/** Detect which platform a stored URL belongs to. Falls back to 'custom'. */
export function detectPlatform(url: string): { platform: Platform; value: string; extra?: string } {
  for (const p of PLATFORMS) {
    if (p.id === "custom") continue;
    const parsed = p.parse(url);
    if (parsed) return { platform: p, value: parsed.value, extra: parsed.extra };
  }
  const custom = PLATFORMS.find((p) => p.id === "custom")!;
  return { platform: custom, value: url };
}

export const FALLBACK_PLATFORM: Platform = PLATFORMS.find((p) => p.id === "custom")!;
