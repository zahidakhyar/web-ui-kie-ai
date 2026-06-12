# Design Spec: Password-Based Authentication

## Goal
Membatasi akses ke seluruh website (halaman visual dan API endpoints) agar hanya pemilik website yang dapat mengaksesnya, dengan menggunakan password tunggal yang dikonfigurasi melalui environment variable.

## Requirements
1. **Single User Password**: Menggunakan password yang disimpan di environment variable `ADMIN_PASSWORD`.
2. **Session Security**: Menyimpan session cookie yang aman (`HttpOnly`, `Secure`, `SameSite=Lax`) dengan masa aktif 30 hari. Cookie ini ditandatangani (signed) menggunakan HMAC SHA-256 (atau simple SHA-256 hash dengan `AUTH_SECRET`) untuk mencegah pemalsuan.
3. **Route Protection**:
   - Memproteksi seluruh halaman visual (`/`, `/gallery`, dll.).
   - Memproteksi seluruh API endpoints (`/api/generate`, `/api/credits`, dll.).
   - **Bypass**:
     - Halaman login `/login`.
     - API Callback `/api/callback` (untuk callback dari KIE.ai).
     - Static assets (`_next/*`, `favicon.ico`, image assets).

## Technical Details

### 1. Environment Variables
```env
ADMIN_PASSWORD=ganti_dengan_password_kamu
AUTH_SECRET=ganti_dengan_random_secret_string
```

### 2. Session Validation Logic
Session cookie `auth_session` akan memiliki format: `expiry:signature`.
* `expiry`: Unix timestamp (ms) saat session berakhir (30 hari dari waktu login).
* `signature`: `sha256(expiry + ":" + ADMIN_PASSWORD + ":" + AUTH_SECRET)`.

Validasi di `middleware.ts`:
1. Baca cookie `auth_session`.
2. Jika tidak ada, redirect ke `/login` (jika request bukan untuk jalur bypass).
3. Pisahkan cookie menjadi `expiry` dan `signature`.
4. Periksa apakah `expiry` sudah lewat dari `Date.now()`. Jika sudah lewat, redirect ke `/login`.
5. Hitung signature baru di server: `expectedSignature = sha256(expiry + ":" + ADMIN_PASSWORD + ":" + AUTH_SECRET)`.
6. Jika `signature` cocok dengan `expectedSignature`, izinkan request. Jika tidak cocok, redirect ke `/login`.

### 3. Files to Add/Modify

#### `middleware.ts` (Root Directory)
Menyaring setiap request masuk dan memvalidasi cookie.
* **Matcher**: `/(.*)`
* **Bypass paths**:
  * `/login`
  * `/api/callback` (POST)
  * `/_next/*`
  * `/favicon.ico`
  * `/images/*`

#### `app/login/page.tsx`
Halaman login dengan desain modern minimalis:
* Background gelap terpadu dengan sisa aplikasi.
* Efek glassmorphic card untuk input password.
* Animasi transisi yang halus saat input mendapatkan fokus dan saat pengiriman form.
* Pesan error yang informatif jika password salah.

#### `app/login/actions.ts`
Server Action `'use server'` untuk memproses form login.
* Membaca input password.
* Mencocokkan input dengan `process.env.ADMIN_PASSWORD`.
* Jika cocok:
  * Hitung `expiry` = `Date.now() + 30 * 24 * 60 * 60 * 1000`.
  * Hitung `signature` menggunakan SHA-256.
  * Set cookie `auth_session` dengan options: `{ httpOnly: true, secure: true, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 }`.
  * Return `{ success: true }`.
* Jika tidak cocok:
  * Return `{ success: false, error: "Password salah!" }`.

---

## Verification Plan

### Automated Build & Lint Check
- Menjalankan `npm run build` dan `npm run lint` untuk memastikan tidak ada kesalahan TypeScript atau linter.

### Manual Verification
1. **Anonymous Access Check**:
   * Akses `http://localhost:3000/` menggunakan Private Browsing / Incognito.
   * Harus otomatis redirect ke `http://localhost:3000/login`.
2. **Invalid Login Check**:
   * Masukkan password salah pada halaman `/login`.
   * Harus menampilkan error "Password salah!".
3. **Success Login Check**:
   * Masukkan password yang benar.
   * Harus berhasil login dan di-redirect ke halaman utama `/`.
   * Periksa di Developer Tools -> Application -> Cookies bahwa `auth_session` diset sebagai `HttpOnly` dan `Secure`.
4. **Webhook Callback Check**:
   * Kirim request `POST` ke `/api/callback` menggunakan tool REST client (atau curl).
   * Request harus berhasil masuk ke route handler tanpa terblokir middleware.
