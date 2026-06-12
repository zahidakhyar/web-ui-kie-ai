# Password-Based Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membatasi akses ke seluruh website (halaman visual dan API endpoints) agar hanya pemilik website yang dapat mengaksesnya, dengan menggunakan password tunggal yang dikonfigurasi melalui environment variable.

**Architecture:** Menggunakan `middleware.ts` Next.js di root project untuk memvalidasi cookie session `auth_session` yang ditandatangani menggunakan SHA-256 HMAC/hashing. Jika session valid, request diizinkan. Jika tidak valid, request di-redirect ke halaman login `/login`. Endpoint callback `/api/callback` dikecualikan secara otomatis dari proteksi middleware untuk mendukung webhook eksternal KIE.ai.

**Tech Stack:** Next.js 16 (App Router), React 19, Web Crypto API, Tailwind CSS, Lucide-React.

---

### Task 1: Setup Environment Variables
**Files:**
- Modify: `.env.example`
- Modify: `.env`

- [ ] **Step 1: Tambahkan environment variables untuk auth di `.env.example`**
  Modify: `/.env.example` dengan menambahkan key berikut di bagian bawah:
  ```env
  # Authentication
  ADMIN_PASSWORD=your_secure_password_here
  AUTH_SECRET=your_random_auth_secret_here
  ```
- [ ] **Step 2: Tambahkan environment variables di `.env` lokal**
  Modify: `/.env` dengan menambahkan key berikut dengan value dummy/test:
  ```env
  # Authentication
  ADMIN_PASSWORD=mysecretpassword123
  AUTH_SECRET=superrandomsecretkeyformiddlewareval
  ```
- [ ] **Step 3: Commit perubahan env**
  Run: `git add .env.example`
  Run: `git commit -m "feat: add admin password and auth secret template variables"`

---

### Task 2: Implement Middleware
**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Buat file `middleware.ts` di root directory**
  Create: `/middleware.ts` dengan konten berikut:
  ```typescript
  import { NextResponse } from "next/server";
  import type { NextRequest } from "next/server";

  async function sha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1. Webhook callbacks: POST to /api/callback
    if (pathname === "/api/callback" && request.method === "POST") {
      return NextResponse.next();
    }

    // 2. Login page, next static assets, favicon
    if (
      pathname === "/login" ||
      pathname.startsWith("/_next") ||
      pathname === "/favicon.ico"
    ) {
      return NextResponse.next();
    }

    // 3. Static public assets
    if (pathname.startsWith("/images") || pathname.startsWith("/uploads")) {
      return NextResponse.next();
    }

    const password = process.env.ADMIN_PASSWORD;
    const secret = process.env.AUTH_SECRET;

    // Jika password belum disetting, jangan kunci website agar tidak mengunci user di awal
    if (!password) {
      console.warn("ADMIN_PASSWORD is not set. Access granted without auth.");
      return NextResponse.next();
    }

    const cookie = request.cookies.get("auth_session")?.value;

    if (!cookie) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const parts = cookie.split(":");
    if (parts.length !== 2) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const [expiryStr, signature] = parts;
    const expiry = parseInt(expiryStr, 10);

    if (isNaN(expiry) || expiry < Date.now()) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Hitung signature yang diharapkan
    const salt = secret || "default_fallback_secret_123";
    const expectedSignature = await sha256(`${expiry}:${password}:${salt}`);

    if (signature !== expectedSignature) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
  }

  export const config = {
    matcher: [
      /*
       * Cocokkan semua path kecuali file statis
       */
      "/((?!_next/static|_next/image|favicon.ico|images/|uploads/).*)",
    ],
  };
  ```
- [ ] **Step 2: Commit file `middleware.ts`**
  Run: `git add middleware.ts`
  Run: `git commit -m "feat: implement route protection middleware using signed session cookies"`

---

### Task 3: Create Login Server Action
**Files:**
- Create: `app/login/actions.ts`

- [ ] **Step 1: Buat file `actions.ts` di dalam `app/login`**
  Create: `/app/login/actions.ts` dengan konten berikut:
  ```typescript
  "use server";

  import { cookies } from "next/headers";

  async function sha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  export async function loginAction(passwordInput: string) {
    const password = process.env.ADMIN_PASSWORD;
    const secret = process.env.AUTH_SECRET;

    if (!password) {
      return { success: false, error: "ADMIN_PASSWORD belum dikonfigurasi di server." };
    }

    if (passwordInput !== password) {
      return { success: false, error: "Password salah!" };
    }

    const cookieStore = await cookies();
    const expiry = Date.now() + 1000 * 60 * 60 * 24 * 30; // 30 hari
    const salt = secret || "default_fallback_secret_123";
    const signature = await sha256(`${expiry}:${password}:${salt}`);

    cookieStore.set("auth_session", `${expiry}:${signature}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 hari
    });

    return { success: true };
  }
  ```
- [ ] **Step 2: Commit file `actions.ts`**
  Run: `git add app/login/actions.ts`
  Run: `git commit -m "feat: implement login Server Action with secure HTTP-only cookies"`

---

### Task 4: Create Login Page UI
**Files:**
- Create: `app/login/page.tsx`

- [ ] **Step 1: Buat file `page.tsx` di `app/login`**
  Create: `/app/login/page.tsx` dengan desain glassmorphic premium:
  ```typescript
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
  ```
- [ ] **Step 2: Commit file `page.tsx`**
  Run: `git add app/login/page.tsx`
  Run: `git commit -m "feat: implement glassmorphic premium Login page UI"`

---

### Task 5: Build and Verify Protection
**Files:**
- Modify: `package.json` (running lint/build checks)

- [ ] **Step 1: Jalankan linter untuk memverifikasi kesalahan linter**
  Run: `npm run lint`
  Expected: Command lint selesai tanpa error.
- [ ] **Step 2: Jalankan build lokal untuk memverifikasi kode bisa terkompilasi**
  Run: `npm run build`
  Expected: Build Next.js sukses tanpa kesalahan kompilasi tipe atau routing.
- [ ] **Step 3: Pastikan semua perubahan sudah di-commit**
  Run: `git status`
  Expected: Working tree clean.
