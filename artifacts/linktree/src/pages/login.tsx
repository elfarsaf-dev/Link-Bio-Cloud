import React, { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_URL } from "@/config";

const API_BASE = API_URL;

export default function LoginPage() {
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [form, setForm] = useState({ emailOrUsername: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.needsReset) {
          toast({ title: "Akun lama terdeteksi. Silakan reset password terlebih dahulu.", variant: "destructive", duration: 6000 });
          navigate("/reset-password");
          return;
        }
        toast({ title: data.error || "Login gagal", variant: "destructive" });
        return;
      }
      login(data.token, data.user);
      navigate("/admin");
    } catch {
      toast({ title: "Terjadi kesalahan. Coba lagi.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-grid-pattern flex items-center justify-center px-4">
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-background/50 via-background/80 to-background z-0" />
      <Card className="w-full max-w-md z-10">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Link2 className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardDescription>Gunakan email atau username kamu</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emailOrUsername">Email atau Username</Label>
              <Input
                id="emailOrUsername"
                placeholder="email@contoh.com atau username"
                value={form.emailOrUsername}
                onChange={e => setForm(f => ({ ...f, emailOrUsername: e.target.value }))}
                required
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Masuk
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Belum punya akun?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Daftar sekarang
            </Link>
          </p>
          <p className="text-center text-sm text-muted-foreground mt-2">
            <Link href="/reset-password" className="text-muted-foreground hover:text-primary hover:underline text-xs">
              Lupa password?
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
