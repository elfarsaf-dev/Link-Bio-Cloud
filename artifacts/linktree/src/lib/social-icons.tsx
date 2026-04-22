import type { ComponentType, SVGProps } from "react";
import { Link as LinkIcon } from "lucide-react";
import {
  SiInstagram,
  SiFacebook,
  SiTiktok,
  SiYoutube,
  SiWhatsapp,
  SiTelegram,
  SiDiscord,
  SiGithub,
  SiGitlab,
  SiTwitch,
  SiSpotify,
  SiSoundcloud,
  SiApplemusic,
  SiPinterest,
  SiReddit,
  SiSnapchat,
  SiThreads,
  SiMedium,
  SiSubstack,
  SiDribbble,
  SiBehance,
  SiFigma,
  SiNotion,
  SiPatreon,
  SiKofi,
  SiBuymeacoffee,
  SiPaypal,
  SiCashapp,
  SiVenmo,
  SiBluesky,
  SiMastodon,
  SiSteam,
  SiRoblox,
  SiVimeo,
  SiTumblr,
  SiQuora,
  SiStackoverflow,
  SiCodepen,
  SiReplit,
  SiShopify,
  SiEtsy,
  SiShopee,
  SiGooglemaps,
  SiGoogleplay,
  SiAppstore,
  SiZoom,
  SiSlack,
  SiLine,
  SiWechat,
  SiSignal,
  SiKick,
} from "react-icons/si";
import { FaXTwitter, FaLinkedin, FaAmazon } from "react-icons/fa6";
import { Mail, Phone, Globe } from "lucide-react";

export type SocialIcon = {
  name: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>> | ComponentType<{ className?: string }>;
  color: string;
};

type Rule = {
  name: string;
  match: RegExp;
  Icon: SocialIcon["Icon"];
  color: string;
};

const RULES: Rule[] = [
  { name: "Instagram", match: /(?:^|\.)instagram\.com|(?:^|\.)instagr\.am/i, Icon: SiInstagram, color: "#E4405F" },
  { name: "Threads", match: /(?:^|\.)threads\.(?:net|com)/i, Icon: SiThreads, color: "#000000" },
  { name: "Facebook", match: /(?:^|\.)facebook\.com|(?:^|\.)fb\.(?:com|me|watch)/i, Icon: SiFacebook, color: "#1877F2" },
  { name: "X / Twitter", match: /(?:^|\.)x\.com|(?:^|\.)twitter\.com|(?:^|\.)t\.co/i, Icon: FaXTwitter, color: "#000000" },
  { name: "TikTok", match: /(?:^|\.)tiktok\.com|(?:^|\.)vt\.tiktok\.com/i, Icon: SiTiktok, color: "#010101" },
  { name: "YouTube", match: /(?:^|\.)youtube\.com|(?:^|\.)youtu\.be/i, Icon: SiYoutube, color: "#FF0000" },
  { name: "WhatsApp", match: /(?:^|\.)whatsapp\.com|(?:^|\.)wa\.me|(?:^|\.)api\.whatsapp\.com|(?:^|\.)chat\.whatsapp\.com/i, Icon: SiWhatsapp, color: "#25D366" },
  { name: "Telegram", match: /(?:^|\.)telegram\.(?:org|me)|(?:^|\.)t\.me/i, Icon: SiTelegram, color: "#26A5E4" },
  { name: "Discord", match: /(?:^|\.)discord\.(?:com|gg)|(?:^|\.)discordapp\.com/i, Icon: SiDiscord, color: "#5865F2" },
  { name: "LinkedIn", match: /(?:^|\.)linkedin\.com|(?:^|\.)lnkd\.in/i, Icon: FaLinkedin, color: "#0A66C2" },
  { name: "GitHub", match: /(?:^|\.)github\.com|(?:^|\.)github\.io/i, Icon: SiGithub, color: "#181717" },
  { name: "GitLab", match: /(?:^|\.)gitlab\.com/i, Icon: SiGitlab, color: "#FC6D26" },
  { name: "Twitch", match: /(?:^|\.)twitch\.tv/i, Icon: SiTwitch, color: "#9146FF" },
  { name: "Kick", match: /(?:^|\.)kick\.com/i, Icon: SiKick, color: "#53FC18" },
  { name: "Spotify", match: /(?:^|\.)spotify\.com|(?:^|\.)open\.spotify\.com/i, Icon: SiSpotify, color: "#1DB954" },
  { name: "SoundCloud", match: /(?:^|\.)soundcloud\.com/i, Icon: SiSoundcloud, color: "#FF5500" },
  { name: "Apple Music", match: /(?:^|\.)music\.apple\.com/i, Icon: SiApplemusic, color: "#FA243C" },
  { name: "Pinterest", match: /(?:^|\.)pinterest\.(?:com|[a-z]{2,3})|(?:^|\.)pin\.it/i, Icon: SiPinterest, color: "#BD081C" },
  { name: "Reddit", match: /(?:^|\.)reddit\.com|(?:^|\.)redd\.it/i, Icon: SiReddit, color: "#FF4500" },
  { name: "Snapchat", match: /(?:^|\.)snapchat\.com/i, Icon: SiSnapchat, color: "#FFFC00" },
  { name: "Medium", match: /(?:^|\.)medium\.com/i, Icon: SiMedium, color: "#000000" },
  { name: "Substack", match: /(?:^|\.)substack\.com/i, Icon: SiSubstack, color: "#FF6719" },
  { name: "Dribbble", match: /(?:^|\.)dribbble\.com/i, Icon: SiDribbble, color: "#EA4C89" },
  { name: "Behance", match: /(?:^|\.)behance\.net/i, Icon: SiBehance, color: "#1769FF" },
  { name: "Figma", match: /(?:^|\.)figma\.com/i, Icon: SiFigma, color: "#F24E1E" },
  { name: "Notion", match: /(?:^|\.)notion\.(?:so|site)/i, Icon: SiNotion, color: "#000000" },
  { name: "Patreon", match: /(?:^|\.)patreon\.com/i, Icon: SiPatreon, color: "#FF424D" },
  { name: "Ko-fi", match: /(?:^|\.)ko-fi\.com/i, Icon: SiKofi, color: "#FF5E5B" },
  { name: "Buy Me a Coffee", match: /(?:^|\.)buymeacoffee\.com|(?:^|\.)bmc\.link/i, Icon: SiBuymeacoffee, color: "#FFDD00" },
  { name: "PayPal", match: /(?:^|\.)paypal\.(?:com|me)/i, Icon: SiPaypal, color: "#003087" },
  { name: "Cash App", match: /(?:^|\.)cash\.app/i, Icon: SiCashapp, color: "#00C244" },
  { name: "Venmo", match: /(?:^|\.)venmo\.com/i, Icon: SiVenmo, color: "#3D95CE" },
  { name: "Bluesky", match: /(?:^|\.)bsky\.app|(?:^|\.)bsky\.social/i, Icon: SiBluesky, color: "#0085FF" },
  { name: "Mastodon", match: /(?:^|\.)mastodon\.(?:social|online|world)|(?:^|\.)mstdn\./i, Icon: SiMastodon, color: "#6364FF" },
  { name: "Steam", match: /(?:^|\.)steamcommunity\.com|(?:^|\.)store\.steampowered\.com/i, Icon: SiSteam, color: "#000000" },
  { name: "Roblox", match: /(?:^|\.)roblox\.com/i, Icon: SiRoblox, color: "#E2231A" },
  { name: "Vimeo", match: /(?:^|\.)vimeo\.com/i, Icon: SiVimeo, color: "#1AB7EA" },
  { name: "Tumblr", match: /(?:^|\.)tumblr\.com/i, Icon: SiTumblr, color: "#36465D" },
  { name: "Quora", match: /(?:^|\.)quora\.com/i, Icon: SiQuora, color: "#B92B27" },
  { name: "Stack Overflow", match: /(?:^|\.)stackoverflow\.com|(?:^|\.)stackexchange\.com/i, Icon: SiStackoverflow, color: "#F58025" },
  { name: "CodePen", match: /(?:^|\.)codepen\.io/i, Icon: SiCodepen, color: "#000000" },
  { name: "Replit", match: /(?:^|\.)replit\.com|(?:^|\.)repl\.it/i, Icon: SiReplit, color: "#F26207" },
  { name: "Shopify", match: /(?:^|\.)shopify\.com|(?:^|\.)myshopify\.com/i, Icon: SiShopify, color: "#7AB55C" },
  { name: "Etsy", match: /(?:^|\.)etsy\.com/i, Icon: SiEtsy, color: "#F16521" },
  { name: "Amazon", match: /(?:^|\.)amazon\.[a-z.]+|(?:^|\.)amzn\.to/i, Icon: FaAmazon, color: "#FF9900" },
  { name: "Shopee", match: /(?:^|\.)shopee\.(?:co\.id|com|sg|ph|tw|vn|my|th)/i, Icon: SiShopee, color: "#EE4D2D" },
  { name: "Google Maps", match: /(?:^|\.)maps\.google|(?:^|\.)goo\.gl\/maps|(?:^|\.)google\.com\/maps/i, Icon: SiGooglemaps, color: "#4285F4" },
  { name: "Google Play", match: /(?:^|\.)play\.google\.com/i, Icon: SiGoogleplay, color: "#414141" },
  { name: "App Store", match: /(?:^|\.)apps\.apple\.com|(?:^|\.)itunes\.apple\.com/i, Icon: SiAppstore, color: "#0D96F6" },
  { name: "Zoom", match: /(?:^|\.)zoom\.us/i, Icon: SiZoom, color: "#2D8CFF" },
  { name: "Slack", match: /(?:^|\.)slack\.com/i, Icon: SiSlack, color: "#4A154B" },
  { name: "LINE", match: /(?:^|\.)line\.me/i, Icon: SiLine, color: "#00C300" },
  { name: "WeChat", match: /(?:^|\.)weixin\.qq\.com|(?:^|\.)wechat\.com/i, Icon: SiWechat, color: "#07C160" },
  { name: "Signal", match: /(?:^|\.)signal\.(?:org|me)/i, Icon: SiSignal, color: "#3A76F0" },
];

export function detectSocial(url: string): SocialIcon {
  if (!url) return { name: "Link", Icon: LinkIcon, color: "#6B7280" };

  const trimmed = url.trim();

  if (/^mailto:/i.test(trimmed)) {
    return { name: "Email", Icon: Mail, color: "#EA4335" };
  }
  if (/^tel:/i.test(trimmed) || /^sms:/i.test(trimmed)) {
    return { name: "Phone", Icon: Phone, color: "#34A853" };
  }

  let host = "";
  try {
    const u = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    host = u.hostname.toLowerCase();
  } catch {
    host = trimmed.toLowerCase();
  }

  for (const rule of RULES) {
    if (rule.match.test(host)) {
      return { name: rule.name, Icon: rule.Icon, color: rule.color };
    }
  }

  return { name: "Website", Icon: Globe, color: "#6B7280" };
}
