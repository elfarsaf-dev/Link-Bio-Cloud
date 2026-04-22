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
import { Loader2, Plus, Pencil, Trash2, Link as LinkIcon, BarChart3, User, GripVertical, LogOut, ExternalLink, Palette, RotateCcw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth";
import { THEMES, getTheme } from "@/lib/themes";
import { detectSocial } from "@/lib/social-icons";

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
  const [linkForm, setLinkForm] = useState({ title: "", url: "", isActive: true });

  const openCreateLink = () => {
    setEditingLinkId(null);
    setLinkForm({ title: "", url: "", isActive: true });
    setIsLinkDialogOpen(true);
  };

  const openEditLink = (link: any) => {
    setEditingLinkId(link.id);
    setLinkForm({ title: link.title, url: link.url, isActive: link.isActive });
    setIsLinkDialogOpen(true);
  };

  const handleLinkSave = () => {
    if (editingLinkId) {
      updateLink.mutate({ id: editingLinkId, data: linkForm }, {
        onSuccess: () => {
          toast({ title: "Link diperbarui." });
          queryClient.invalidateQueries({ queryKey: getGetLinksQueryKey() });
          setIsLinkDialogOpen(false);
        },
      });
    } else {
      createLink.mutate({ data: linkForm }, {
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
          <TabsList className="grid grid-cols-4 w-full mb-6">
            <TabsTrigger value="links" className="text-xs sm:text-sm font-mono px-1 sm:px-3">
              <LinkIcon className="w-3 h-3 sm:mr-1.5 shrink-0" />
              <span className="hidden sm:inline">Links</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="text-xs sm:text-sm font-mono px-1 sm:px-3">
              <User className="w-3 h-3 sm:mr-1.5 shrink-0" />
              <span className="hidden sm:inline">Profil</span>
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
                      <Label htmlFor="avatarUrl">URL Avatar</Label>
                      <Input
                        id="avatarUrl"
                        value={profileForm.avatarUrl}
                        onChange={(e) => setProfileForm({ ...profileForm, avatarUrl: e.target.value })}
                        placeholder="https://example.com/avatar.png"
                        className="font-mono bg-background text-sm"
                      />
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
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm sm:max-w-md border-border bg-card rounded-xl">
          <DialogHeader>
            <DialogTitle className="font-mono text-lg">{editingLinkId ? "Edit Link" : "Tambah Link"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="title">Judul</Label>
              <Input
                id="title"
                value={linkForm.title}
                onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })}
                placeholder="Contoh: Instagram"
                className="bg-background font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                value={linkForm.url}
                onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
                placeholder="https://instagram.com/username"
                className="bg-background font-mono text-sm"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <Label htmlFor="active" className="cursor-pointer">Tampilkan di profil</Label>
              <Switch
                id="active"
                checked={linkForm.isActive}
                onCheckedChange={(v) => setLinkForm({ ...linkForm, isActive: v })}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsLinkDialogOpen(false)} className="flex-1 sm:flex-none">Batal</Button>
            <Button onClick={handleLinkSave} disabled={createLink.isPending || updateLink.isPending} className="flex-1 sm:flex-none">
              {(createLink.isPending || updateLink.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
