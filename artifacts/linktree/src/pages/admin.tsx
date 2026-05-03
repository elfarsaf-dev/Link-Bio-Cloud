import React, { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import {
  useGetProfile,
  useUpdateProfile,
  useGetLinks,
  useCreateLink,
  useUpdateLink,
  useDeleteLink,
  useGetStats,
  useResetStats,
  getGetProfileQueryKey,
  getGetLinksQueryKey,
  getGetStatsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Pencil, Trash2, Link as LinkIcon, BarChart3, User, GripVertical, LogOut, ExternalLink, Palette, RotateCcw, Upload, Sparkles, Image as ImageIcon, Video as VideoIcon, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth";
import { THEMES, getTheme } from "@/lib/themes";
import { detectSocial } from "@/lib/social-icons";
import { PLATFORMS, FALLBACK_PLATFORM, detectPlatform, type Platform } from "@/lib/platforms";
import { uploadFile } from "@/lib/upload";
import { API_URL } from "@/config";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  const handleLogout = () => {
    logout();
    queryClient.clear();
    navigate("/login");
  };

  const { data: profile, isLoading: profileLoading } = useGetProfile({
    query: { enabled: true, queryKey: getGetProfileQueryKey() },
  });
  const { data: links, isLoading: linksLoading } = useGetLinks({
    query: { enabled: true, queryKey: getGetLinksQueryKey() },
  });
  const { data: stats, isLoading: statsLoading } = useGetStats({
    query: { enabled: true, queryKey: getGetStatsQueryKey() },
  });

  const updateProfile = useUpdateProfile();
  const createLink = useCreateLink();
  const updateLink = useUpdateLink();
  const deleteLink = useDeleteLink();
  const resetStats = useResetStats();

  const handleResetStats = () => {
    if (!confirm("Yakin reset semua data klik ke 0? Tindakan ini tidak bisa dibatalkan.")) return;
    resetStats.mutate(undefined, {
      onSuccess: () => {
        toast({ title: "Data klik berhasil direset." });
        queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetLinksQueryKey() });
      },
      onError: () => {
        toast({ title: "Gagal reset data klik.", variant: "destructive" });
      },
    });
  };

  const [profileForm, setProfileForm] = useState({
    displayName: "",
    bio: "",
    avatarUrl: "",
    backgroundTheme: "grid",
  });

  useEffect(() => {
    if (profile) {
      setProfileForm({
        displayName: profile.displayName || "",
        bio: profile.bio || "",
        avatarUrl: profile.avatarUrl || "",
        backgroundTheme: profile.backgroundTheme || "grid",
      });
    }
  }, [profile]);

  const handleProfileSave = () => {
    updateProfile.mutate({ data: profileForm }, {
      onSuccess: () => {
        toast({ title: "Profil berhasil disimpan." });
        queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
      },
    });
  };

  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [linkPlatformId, setLinkPlatformId] = useState<string | null>(null);
  const [linkForm, setLinkForm] = useState({ title: "", value: "", extra: "", isActive: true });

  const currentPlatform: Platform | null = linkPlatformId
    ? PLATFORMS.find((p) => p.id === linkPlatformId) ?? FALLBACK_PLATFORM
    : null;

  const openCreateLink = () => {
    setEditingLinkId(null);
    setLinkPlatformId(null);
    setLinkForm({ title: "", value: "", extra: "", isActive: true });
    setIsLinkDialogOpen(true);
  };

  const openEditLink = (link: any) => {
    setEditingLinkId(link.id);
    const detected = detectPlatform(link.url);
    setLinkPlatformId(detected.platform.id);
    setLinkForm({
      title: link.title,
      value: detected.value,
      extra: detected.extra ?? "",
      isActive: link.isActive,
    });
    setIsLinkDialogOpen(true);
  };

  const selectPlatform = (p: Platform) => {
    setLinkPlatformId(p.id);
    setLinkForm((f) => ({
      ...f,
      title: f.title || p.defaultTitle,
    }));
  };

  const handleLinkSave = () => {
    if (!currentPlatform) {
      toast({ title: "Pilih platform dulu.", variant: "destructive" });
      return;
    }
    const value = linkForm.value.trim();
    if (!value) {
      toast({ title: "Isi dulu data linknya.", variant: "destructive" });
      return;
    }
    const url = currentPlatform.build(value, linkForm.extra);
    const title = (linkForm.title || currentPlatform.defaultTitle || "Link").trim();
    const data = { title, url, isActive: linkForm.isActive };

    if (editingLinkId) {
      updateLink.mutate({ id: editingLinkId, data }, {
        onSuccess: () => {
          toast({ title: "Link diperbarui." });
          queryClient.invalidateQueries({ queryKey: getGetLinksQueryKey() });
          setIsLinkDialogOpen(false);
        },
      });
    } else {
      createLink.mutate({ data }, {
        onSuccess: () => {
          toast({ title: "Link ditambahkan." });
          queryClient.invalidateQueries({ queryKey: getGetLinksQueryKey() });
          setIsLinkDialogOpen(false);
        },
      });
    }
  };

  const handleDeleteLink = (id: string) => {
    if (confirm("Hapus link ini?")) {
      deleteLink.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Link dihapus." });
          queryClient.invalidateQueries({ queryKey: getGetLinksQueryKey() });
        },
      });
    }
  };

  const handleToggleActive = (id: string, current: boolean) => {
    updateLink.mutate({ id, data: { isActive: !current } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetLinksQueryKey() }),
    });
  };

  const sortedLinks = links ? [...links].sort((a, b) => a.sortOrder - b.sortOrder) : [];
  const selectedTheme = getTheme(profileForm.backgroundTheme);

  // ── Avatar upload ──
  const [avatarUploading, setAvatarUploading] = useState(false);
  const handleAvatarFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "File harus berupa gambar.", variant: "destructive" });
      return;
    }
    setAvatarUploading(true);
    try {
      const { url } = await uploadFile(file);
      setProfileForm((f) => ({ ...f, avatarUrl: url }));
      toast({ title: "Foto profil siap. Klik Simpan Profil." });
    } catch (e: any) {
      toast({ title: e?.message || "Upload gagal", variant: "destructive" });
    } finally {
      setAvatarUploading(false);
    }
  };

  // ── Stories ──
  type Story = { id: string; text: string | null; mediaUrl: string | null; mediaType: string | null; createdAt: string; expiresAt: string };
  const [stories, setStories] = useState<Story[]>([]);
  const [storyText, setStoryText] = useState("");
  const [storyMediaUrl, setStoryMediaUrl] = useState<string | null>(null);
  const [storyMediaType, setStoryMediaType] = useState<"image" | "video" | null>(null);
  const [storyUploading, setStoryUploading] = useState(false);
  const [storySaving, setStorySaving] = useState(false);

  const authHeader = (): Record<string, string> => {
    const token = localStorage.getItem("lh_token") || "";
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const loadStories = async () => {
    try {
      const res = await fetch(`${API_URL}/api/stories`, { headers: authHeader() });
      if (res.ok) setStories(await res.json());
    } catch {}
  };
  useEffect(() => { loadStories(); }, []);

  const handleStoryFile = async (file: File) => {
    if (!file) return;
    setStoryUploading(true);
    try {
      const { url, type } = await uploadFile(file);
      setStoryMediaUrl(url);
      setStoryMediaType(type === "video" ? "video" : "image");
    } catch (e: any) {
      toast({ title: e?.message || "Upload gagal", variant: "destructive" });
    } finally {
      setStoryUploading(false);
    }
  };

  const handleStorySave = async () => {
    if (!storyText.trim() && !storyMediaUrl) {
      toast({ title: "Tulis teks atau tambahkan media dulu.", variant: "destructive" });
      return;
    }
    setStorySaving(true);
    try {
      const res = await fetch(`${API_URL}/api/stories`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          text: storyText.trim() || null,
          mediaUrl: storyMediaUrl,
          mediaType: storyMediaType,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Gagal");
      setStoryText("");
      setStoryMediaUrl(null);
      setStoryMediaType(null);
      toast({ title: "Story diunggah! Hilang dalam 24 jam." });
      loadStories();
    } catch (e: any) {
      toast({ title: e?.message || "Gagal upload story", variant: "destructive" });
    } finally {
      setStorySaving(false);
    }
  };

  const handleStoryDelete = async (id: string) => {
    if (!confirm("Hapus story ini?")) return;
    try {
      await fetch(`${API_URL}/api/stories/${id}`, { method: "DELETE", headers: authHeader() });
      setStories((s) => s.filter((x) => x.id !== id));
      toast({ title: "Story dihapus." });
    } catch {}
  };

  const formatRemaining = (expiresAt: string) => {
    const ms = new Date(expiresAt).getTime() - Date.now();
    if (ms <= 0) return "habis";
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}j ${m}m` : `${m}m`;
  };

  return (
    <div className="min-h-[100dvh] w-full bg-grid-pattern relative bg-background">
      <div className="absolute inset-0 pointer-events-none bg-background/90 z-0" />

      <div className="container max-w-3xl mx-auto py-6 px-4 relative z-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-3">
          <h1 className="text-xl sm:text-2xl font-bold font-mono text-primary flex items-center gap-2 truncate">
            <LinkIcon className="w-6 h-6 shrink-0" />
            <span className="truncate">NEXVIA</span>
          </h1>
          <div className="flex items-center gap-2 shrink-0">
            {user && (
              <a
                href={`${BASE}/${user.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex text-xs text-muted-foreground hover:text-primary font-mono items-center gap-1"
              >
                @{user.username} <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {user && (
              <a
                href={`${BASE}/${user.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="sm:hidden"
              >
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </a>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout} className="h-8 px-3 text-xs">
              <LogOut className="w-3 h-3 mr-1" /> Logout
            </Button>
          </div>
        </div>

        <Tabs defaultValue="links" className="w-full">
          <TabsList className="grid grid-cols-5 w-full mb-6">
            <TabsTrigger value="links" className="text-xs sm:text-sm font-mono px-1 sm:px-3">
              <LinkIcon className="w-3 h-3 sm:mr-1.5 shrink-0" />
              <span className="hidden sm:inline">Links</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="text-xs sm:text-sm font-mono px-1 sm:px-3">
              <User className="w-3 h-3 sm:mr-1.5 shrink-0" />
              <span className="hidden sm:inline">Profil</span>
            </TabsTrigger>
            <TabsTrigger value="story" className="text-xs sm:text-sm font-mono px-1 sm:px-3">
              <Sparkles className="w-3 h-3 sm:mr-1.5 shrink-0" />
              <span className="hidden sm:inline">Story</span>
            </TabsTrigger>
            <TabsTrigger value="theme" className="text-xs sm:text-sm font-mono px-1 sm:px-3">
              <Palette className="w-3 h-3 sm:mr-1.5 shrink-0" />
              <span className="hidden sm:inline">Tema</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="text-xs sm:text-sm font-mono px-1 sm:px-3">
              <BarChart3 className="w-3 h-3 sm:mr-1.5 shrink-0" />
              <span className="hidden sm:inline">Statistik</span>
            </TabsTrigger>
          </TabsList>

          {/* ── LINKS TAB ─────────────────────────────── */}
          <TabsContent value="links" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold font-mono">Daftar Link</h2>
              <Button onClick={openCreateLink} size="sm" className="font-mono">
                <Plus className="w-4 h-4 mr-1" /> Tambah
              </Button>
            </div>

            {linksLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : sortedLinks.length > 0 ? (
              <div className="space-y-3">
                {sortedLinks.map((link) => {
                  const social = detectSocial(link.url);
                  const SocialIcon = social.Icon;
                  return (
                  <Card key={link.id} className={`border-border ${!link.isActive ? "opacity-60" : ""}`}>
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start gap-3">
                        <GripVertical className="w-4 h-4 text-muted-foreground mt-1 cursor-grab shrink-0" />
                        <div
                          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
                          style={{ backgroundColor: `${social.color}1A`, color: social.color }}
                          aria-label={social.name}
                        >
                          <SocialIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold font-mono text-sm truncate">{link.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Switch
                            checked={link.isActive}
                            onCheckedChange={() => handleToggleActive(link.id, link.isActive)}
                            className="scale-75"
                          />
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditLink(link)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteLink(link.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="border-dashed border-border">
                <CardContent className="p-10 flex flex-col items-center justify-center text-center">
                  <LinkIcon className="w-10 h-10 text-muted-foreground mb-3" />
                  <h3 className="font-bold mb-1">Belum ada link</h3>
                  <p className="text-muted-foreground text-sm mb-4">Tambah link pertamamu sekarang.</p>
                  <Button onClick={openCreateLink} size="sm"><Plus className="w-4 h-4 mr-1" /> Tambah Link</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── PROFILE TAB ───────────────────────────── */}
          <TabsContent value="profile">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="font-mono text-lg">Informasi Profil</CardTitle>
                <CardDescription>Ubah tampilan halaman publikmu.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {profileLoading ? (
                  <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="displayName">Nama Tampilan</Label>
                      <Input
                        id="displayName"
                        value={profileForm.displayName}
                        onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })}
                        className="font-mono bg-background"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={profileForm.bio}
                        onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                        rows={3}
                        className="bg-background resize-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Foto Profil</Label>
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded-full overflow-hidden border border-border bg-muted flex items-center justify-center shrink-0">
                          {profileForm.avatarUrl ? (
                            <img src={profileForm.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-7 h-7 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <label className="inline-flex items-center gap-2 text-sm font-mono px-3 py-2 rounded-md border border-border bg-background hover:bg-muted cursor-pointer transition-colors">
                            {avatarUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            {avatarUploading ? "Mengunggah…" : "Pilih foto"}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={avatarUploading}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleAvatarFile(f);
                                e.target.value = "";
                              }}
                            />
                          </label>
                          {profileForm.avatarUrl && (
                            <button
                              type="button"
                              onClick={() => setProfileForm({ ...profileForm, avatarUrl: "" })}
                              className="text-xs text-muted-foreground hover:text-destructive ml-2"
                            >
                              Hapus
                            </button>
                          )}
                          <p className="text-[11px] text-muted-foreground">Otomatis dikompres ~50% biar ringan.</p>
                        </div>
                      </div>
                    </div>
                    <Button onClick={handleProfileSave} disabled={updateProfile.isPending} className="w-full sm:w-auto font-mono">
                      {updateProfile.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Simpan Profil
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── STORY TAB ─────────────────────────────── */}
          <TabsContent value="story" className="space-y-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="font-mono text-lg flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" /> Buat Story
                </CardTitle>
                <CardDescription>Story otomatis hilang setelah 24 jam.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={storyText}
                  onChange={(e) => setStoryText(e.target.value)}
                  placeholder="Tulis sesuatu… (opsional kalau pakai foto/video)"
                  rows={3}
                  className="bg-background resize-none"
                  maxLength={500}
                />
                {storyMediaUrl && (
                  <div className="relative rounded-lg overflow-hidden border border-border bg-muted">
                    {storyMediaType === "video" ? (
                      <video src={storyMediaUrl} controls className="w-full max-h-72 object-contain bg-black" />
                    ) : (
                      <img src={storyMediaUrl} alt="" className="w-full max-h-72 object-contain bg-black" />
                    )}
                    <button
                      type="button"
                      onClick={() => { setStoryMediaUrl(null); setStoryMediaType(null); }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur border border-border flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground"
                      aria-label="Hapus media"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex items-center gap-2 text-sm font-mono px-3 py-2 rounded-md border border-border bg-background hover:bg-muted cursor-pointer transition-colors">
                    {storyUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                    Foto
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={storyUploading}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleStoryFile(f); e.target.value = ""; }}
                    />
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm font-mono px-3 py-2 rounded-md border border-border bg-background hover:bg-muted cursor-pointer transition-colors">
                    {storyUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <VideoIcon className="w-4 h-4" />}
                    Video
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      disabled={storyUploading}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleStoryFile(f); e.target.value = ""; }}
                    />
                  </label>
                  <Button
                    onClick={handleStorySave}
                    disabled={storySaving || storyUploading}
                    size="sm"
                    className="font-mono ml-auto"
                  >
                    {storySaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Posting Story
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Foto otomatis dikompres ~70%. Video maksimal 25 MB. Format iPhone HEIC/HEIF belum didukung.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="font-mono text-base">Story Aktif</CardTitle>
                <CardDescription>{stories.length} story masih tampil di halaman publikmu.</CardDescription>
              </CardHeader>
              <CardContent>
                {stories.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8 border border-dashed border-border rounded-lg">
                    Belum ada story aktif.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {stories.map((s) => (
                      <div
                        key={s.id}
                        className={`relative rounded-lg overflow-hidden border border-border bg-muted aspect-[3/4] group ${
                          s.mediaUrl ? "bg-black" : "bg-gradient-to-br from-primary/20 to-accent/20"
                        }`}
                      >
                        {s.mediaUrl ? (
                          s.mediaType === "video" ? (
                            <video src={s.mediaUrl} className="w-full h-full object-contain bg-black" muted />
                          ) : (
                            <img src={s.mediaUrl} alt="" className="w-full h-full object-contain bg-black" />
                          )
                        ) : (
                          <div className="w-full h-full flex items-center justify-center p-3 text-center text-xs font-mono">
                            {s.text}
                          </div>
                        )}
                        {s.text && s.mediaUrl && (
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                            <p className="text-[11px] text-white line-clamp-2">{s.text}</p>
                          </div>
                        )}
                        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-mono">
                          {formatRemaining(s.expiresAt)}
                        </div>
                        <button
                          onClick={() => handleStoryDelete(s.id)}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 hover:bg-destructive text-white flex items-center justify-center"
                          aria-label="Hapus"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── THEME TAB ─────────────────────────────── */}
          <TabsContent value="theme">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="font-mono text-lg">Pilih Tema</CardTitle>
                <CardDescription>Tema akan tampil di halaman publik profilmu.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {THEMES.map((theme) => {
                    const isSelected = profileForm.backgroundTheme === theme.id;
                    const bg = theme.gradient ?? `hsl(${theme.vars.background})`;
                    const primary = `hsl(${theme.vars.primary})`;
                    const secondary = `hsl(${theme.vars.secondary})`;
                    const accent = `hsl(${theme.vars.accent})`;
                    const fg = `hsl(${theme.vars.foreground})`;
                    const card = `hsl(${theme.vars.card})`;
                    const border = `hsl(${theme.vars.border})`;
                    return (
                      <button
                        key={theme.id}
                        onClick={() => setProfileForm({ ...profileForm, backgroundTheme: theme.id })}
                        className={`relative rounded-xl border-2 p-3 text-left transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] ${
                          isSelected ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/40"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">✓</div>
                        )}
                        {/* Mini preview */}
                        <div
                          className="w-full h-20 rounded-lg mb-2 overflow-hidden relative"
                          style={{ background: bg, border: `1px solid ${border}` }}
                        >
                          <div className="absolute inset-x-3 top-3 h-6 rounded-md" style={{ background: card, border: `1px solid ${border}` }} />
                          <div className="absolute left-3 bottom-3 right-3 h-5 rounded-md flex items-center gap-1.5 px-2" style={{ background: primary }}>
                            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: accent }} />
                            <div className="h-1.5 rounded-full flex-1" style={{ background: `hsl(${theme.vars.primaryForeground})`, opacity: 0.6 }} />
                          </div>
                          <div className="absolute right-3 top-3 flex gap-1">
                            <div className="w-3 h-3 rounded-full" style={{ background: primary }} />
                            <div className="w-3 h-3 rounded-full" style={{ background: accent }} />
                          </div>
                        </div>
                        <p className="font-mono font-semibold text-sm text-foreground">{theme.name}</p>
                        <div className="flex gap-1.5 mt-1.5">
                          {[primary, secondary, accent].map((c, i) => (
                            <div key={i} className="w-5 h-5 rounded-full border border-border/50" style={{ background: c }} />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-3">
                    Tema terpilih: <span className="font-mono font-semibold text-foreground">{selectedTheme.name}</span>
                  </p>
                  <Button onClick={handleProfileSave} disabled={updateProfile.isPending} className="w-full sm:w-auto font-mono">
                    {updateProfile.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Terapkan Tema
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── STATS TAB ─────────────────────────────── */}
          <TabsContent value="stats">
            {statsLoading ? (
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
              </div>
            ) : stats ? (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="border-border">
                    <CardContent className="p-5 flex flex-col items-center justify-center">
                      <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-2">Total Link</p>
                      <p className="text-4xl font-bold text-primary font-mono">{stats.totalLinks}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-border">
                    <CardContent className="p-5 flex flex-col items-center justify-center">
                      <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-2">Total Klik</p>
                      <p className="text-4xl font-bold text-primary font-mono">{stats.totalClicks}</p>
                    </CardContent>
                  </Card>
                </div>
                <Card className="border-border">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold font-mono">Reset Data Klik</p>
                      <p className="text-xs text-muted-foreground">Set semua hitungan klik kembali ke 0.</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetStats}
                      disabled={resetStats.isPending}
                      className="shrink-0 text-destructive hover:text-destructive border-destructive/40 hover:bg-destructive/10 font-mono"
                    >
                      {resetStats.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      )}
                      Reset
                    </Button>
                  </CardContent>
                </Card>
                <Card className="border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="font-mono text-base">Link Terpopuler</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stats.topLinks && stats.topLinks.length > 0 ? (
                      <div className="space-y-2">
                        {stats.topLinks.map((link, i) => (
                          <div key={link.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-primary font-bold font-mono text-sm shrink-0">{i + 1}.</span>
                              <span className="font-medium text-sm truncate">{link.title}</span>
                            </div>
                            <span className="text-muted-foreground font-mono text-xs bg-background px-2 py-1 rounded-full shrink-0">
                              {link.clickCount ?? 0} klik
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm text-center py-4">Belum ada data klik.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Gagal memuat statistik.</p>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog Tambah/Edit Link */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm sm:max-w-md border-border bg-card rounded-xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono text-lg">
              {editingLinkId ? "Edit Link" : currentPlatform ? `Tambah ${currentPlatform.name}` : "Pilih Platform"}
            </DialogTitle>
          </DialogHeader>

          {!currentPlatform ? (
            <div className="grid grid-cols-3 gap-2 py-2">
              {PLATFORMS.map((p) => {
                const Icon = p.Icon;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectPlatform(p)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border hover:border-primary/60 hover:bg-primary/5 transition-colors active:scale-[0.98]"
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${p.color}1A`, color: p.color }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-mono font-semibold text-center leading-tight">{p.name}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid gap-4 py-2">
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/40">
                <div
                  className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${currentPlatform.color}1A`, color: currentPlatform.color }}
                >
                  <currentPlatform.Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono font-semibold text-sm">{currentPlatform.name}</p>
                </div>
                {!editingLinkId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs font-mono"
                    onClick={() => setLinkPlatformId(null)}
                  >
                    Ganti
                  </Button>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="title">Judul</Label>
                <Input
                  id="title"
                  value={linkForm.title}
                  onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })}
                  placeholder={currentPlatform.defaultTitle || "Judul link"}
                  className="bg-background font-mono"
                />
              </div>

              {currentPlatform.mode === "whatsapp" ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="value">Nomor WhatsApp</Label>
                    <Input
                      id="value"
                      type="tel"
                      inputMode="tel"
                      value={linkForm.value}
                      onChange={(e) => setLinkForm({ ...linkForm, value: e.target.value })}
                      placeholder={currentPlatform.placeholder}
                      className="bg-background font-mono text-sm"
                    />
                    <p className="text-[11px] text-muted-foreground">Pakai kode negara, contoh: 62812… (tanpa tanda +)</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="extra">Pesan Default</Label>
                    <Textarea
                      id="extra"
                      value={linkForm.extra}
                      onChange={(e) => setLinkForm({ ...linkForm, extra: e.target.value })}
                      placeholder={currentPlatform.placeholder2}
                      rows={2}
                      className="bg-background font-mono text-sm resize-none"
                    />
                  </div>
                </>
              ) : currentPlatform.mode === "username" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="value">Username</Label>
                  <div className="flex items-stretch rounded-md border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring">
                    {currentPlatform.inputPrefix && (
                      <span className="px-3 flex items-center text-sm font-mono text-muted-foreground border-r border-input bg-secondary/40">
                        {currentPlatform.inputPrefix}
                      </span>
                    )}
                    <input
                      id="value"
                      value={linkForm.value}
                      onChange={(e) =>
                        setLinkForm({
                          ...linkForm,
                          value: e.target.value.replace(/^@+/, "").replace(/\s+/g, ""),
                        })
                      }
                      placeholder={currentPlatform.placeholder}
                      className="flex-1 bg-transparent px-3 py-2 text-sm font-mono outline-none"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Tanda <span className="font-mono">@</span> otomatis dihapus.
                  </p>
                </div>
              ) : currentPlatform.mode === "email" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="value">Alamat Email</Label>
                  <Input
                    id="value"
                    type="email"
                    inputMode="email"
                    value={linkForm.value}
                    onChange={(e) => setLinkForm({ ...linkForm, value: e.target.value })}
                    placeholder={currentPlatform.placeholder}
                    className="bg-background font-mono text-sm"
                    autoCapitalize="off"
                  />
                </div>
              ) : currentPlatform.mode === "phone" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="value">Nomor Telepon</Label>
                  <Input
                    id="value"
                    type="tel"
                    inputMode="tel"
                    value={linkForm.value}
                    onChange={(e) => setLinkForm({ ...linkForm, value: e.target.value })}
                    placeholder={currentPlatform.placeholder}
                    className="bg-background font-mono text-sm"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="value">URL Lengkap</Label>
                  <Input
                    id="value"
                    type="url"
                    inputMode="url"
                    value={linkForm.value}
                    onChange={(e) => setLinkForm({ ...linkForm, value: e.target.value })}
                    placeholder={currentPlatform.placeholder}
                    className="bg-background font-mono text-sm"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <Label htmlFor="active" className="cursor-pointer">Tampilkan di profil</Label>
                <Switch
                  id="active"
                  checked={linkForm.isActive}
                  onCheckedChange={(v) => setLinkForm({ ...linkForm, isActive: v })}
                />
              </div>
            </div>
          )}

          {currentPlatform && (
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsLinkDialogOpen(false)} className="flex-1 sm:flex-none">Batal</Button>
              <Button onClick={handleLinkSave} disabled={createLink.isPending || updateLink.isPending} className="flex-1 sm:flex-none">
                {(createLink.isPending || updateLink.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Simpan
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
