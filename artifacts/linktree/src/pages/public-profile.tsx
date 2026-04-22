import React, { useEffect, useState, useLayoutEffect } from "react";
import { useParams } from "wouter";
import { useRecordLinkClick } from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoveRight } from "lucide-react";
import { detectSocial } from "@/lib/social-icons";
import { Skeleton } from "@/components/ui/skeleton";
import { API_URL } from "@/config";
import { getTheme, buildCssVars } from "@/lib/themes";

interface PublicProfile {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  backgroundTheme: string | null;
  totalClicks: number;
}

interface PublicLink {
  id: string;
  title: string;
  url: string;
  icon: string | null;
  clickCount: number;
  sortOrder: number;
  isActive: boolean;
}

export default function PublicProfile() {
  const params = useParams<{ username: string }>();
  const username = params.username;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [links, setLinks] = useState<PublicLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const recordClick = useRecordLinkClick();

  const theme = getTheme(profile?.backgroundTheme);

  useLayoutEffect(() => {
    const style = document.createElement("style");
    style.id = "profile-theme";
    style.textContent = `:root { ${buildCssVars(theme)} }`;
    const existing = document.getElementById("profile-theme");
    if (existing) existing.remove();
    document.head.appendChild(style);
    return () => { document.getElementById("profile-theme")?.remove(); };
  }, [theme.id]);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    fetch(`${API_URL}/api/public/${username}`)
      .then(async res => {
        if (res.status === 404) { setNotFound(true); return; }
        const data = await res.json();
        setProfile(data.profile);
        setLinks(data.links || []);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [username]);

  const handleLinkClick = (id: string, url: string) => {
    recordClick.mutate({ id });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (!loading && notFound) {
    return (
      <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center px-4 bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-mono font-bold text-primary">404</h1>
          <p className="text-muted-foreground text-sm">
            User <span className="font-mono text-foreground">@{username}</span> tidak ditemukan.
          </p>
          <a href="/register" className="text-sm text-primary hover:underline font-mono">
            Buat akun kamu sendiri →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-[100dvh] w-full flex flex-col items-center"
      style={theme.gradient ? { background: theme.gradient } : undefined}
    >
      {!theme.gradient && <div className="fixed inset-0 -z-10 bg-background" />}
      {theme.dark && (
        <div className="fixed inset-0 pointer-events-none bg-grid-pattern opacity-30 z-0" />
      )}

      <div className="w-full max-w-sm sm:max-w-md mx-auto px-4 py-12 z-10 flex flex-col items-center space-y-6">

        {/* Profile */}
        {loading ? (
          <div className="flex flex-col items-center space-y-3 w-full">
            <Skeleton className="w-24 h-24 rounded-full" />
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        ) : profile ? (
          <div className="flex flex-col items-center text-center space-y-3 w-full">
            <Avatar className="w-24 h-24 border-4 border-primary/30 shadow-lg">
              <AvatarImage src={profile.avatarUrl ?? undefined} alt={profile.displayName} />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary font-mono font-bold">
                {profile.displayName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-foreground font-mono tracking-tight">
                {profile.displayName}
              </h1>
              <p className="text-muted-foreground text-xs font-mono">@{profile.username}</p>
              {profile.bio && (
                <p className="text-muted-foreground text-sm max-w-xs leading-relaxed pt-1">
                  {profile.bio}
                </p>
              )}
            </div>
          </div>
        ) : null}

        {/* Links */}
        <div className="w-full flex flex-col space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))
          ) : links.length > 0 ? (
            links.map((link) => {
              const social = detectSocial(link.url);
              const Icon = social.Icon;
              return (
                <button
                  key={link.id}
                  onClick={() => handleLinkClick(link.id, link.url)}
                  className="group relative w-full flex items-center justify-between px-5 py-4 rounded-xl bg-card border border-border hover:border-primary/60 hover:bg-primary/5 transition-all duration-200 active:scale-[0.98] overflow-hidden text-left"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/8 to-primary/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <div className="flex items-center gap-3 z-10 min-w-0">
                    <div
                      className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200"
                      style={{ backgroundColor: `${social.color}1A`, color: social.color }}
                      aria-label={social.name}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-semibold text-card-foreground group-hover:text-primary transition-colors duration-200 font-mono text-sm truncate">
                      {link.title}
                    </span>
                  </div>
                  <MoveRight className="shrink-0 w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-200 z-10 ml-2" />
                </button>
              );
            })
          ) : (
            <div className="text-center text-muted-foreground text-sm py-10 border border-dashed border-border rounded-xl">
              Belum ada link aktif.
            </div>
          )}
        </div>

        <a
          href="/register"
          className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors mt-4"
        >
          Buat NEXVIA kamu sendiri →
        </a>
      </div>
    </div>
  );
}
