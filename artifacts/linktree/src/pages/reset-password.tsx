import React, { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link2, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_URL } from "@/config";

export default function ResetPasswordPage() {
  const { toast } = useToast();
  const [form, setForm] = useState({ emailOrUsername: "", newPassword: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) {
      toast({ title: "Password tidak cocok", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrUsername: form.emailOrUsername, newPassword: form.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error || "Reset gagal", variant: "destructive" });
        return;
      }
      setDone(true);
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
            <Link2 className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-mono">Reset Password</CardTitle>
          <CardDescription>Buat password baru untuk akunmu</CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <CheckCircle className="w-12 h-12 text-green-500" />
              <p className="text-center text-sm text-muted-foreground">Password berhasil direset! Sekarang kamu bisa login dengan password baru.</p>
              <Link href="/login" className="w-full">
                <Button className="w-full">Masuk sekarang</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emailOrUsername">Email atau Username</Label>
                <Input
                  id="emailOrUsername"
                  placeholder="email@contoh.com atau username"
                  value={form.emailOrUsername}
                  onChange={e => setForm(f => ({ ...f, emailOrUsername: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Password Baru</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Minimal 6 karakter"
                  value={form.newPassword}
                  onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Konfirmasi Password</Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="Ulangi password baru"
                  value={form.confirm}
                  onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Reset Password
              </Button>
            </form>
          )}
          <p className="text-center text-sm text-muted-foreground mt-4">
            Ingat password?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Masuk di sini
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
