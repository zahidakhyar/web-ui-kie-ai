"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginAction } from "./actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("Password wajib diisi");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await loginAction(password);
      if (res.success) {
        toast.success("Login berhasil!");
        router.push("/");
        router.refresh();
      } else {
        setError(res.error || "Password salah!");
      }
    } catch (err) {
      setError("Terjadi kesalahan sistem.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
        <Card className="border-border/60 bg-card/60 backdrop-blur-md shadow-2xl relative overflow-hidden">
          {/* Ambient background blur inside the card */}
          <div className="absolute -top-12 -right-12 size-36 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 size-36 bg-primary/5 rounded-full blur-2xl pointer-events-none" />

          <CardHeader className="space-y-1 flex flex-col items-center text-center">
            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mb-2 border border-primary/20">
              <Lock className="size-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Akses Terproteksi
            </CardTitle>
            <CardDescription>
              Masukkan password admin untuk masuk ke aplikasi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="bg-background/50 border-border/80 focus-visible:ring-primary text-center"
                  autoFocus
                />
                {error && (
                  <p className="text-sm text-destructive font-medium animate-in fade-in slide-in-from-top-1 text-center">
                    {error}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full relative overflow-hidden group" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memverifikasi...
                  </>
                ) : (
                  <>
                    <span className="relative z-10">Masuk</span>
                    <div className="absolute inset-0 bg-primary-foreground/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
