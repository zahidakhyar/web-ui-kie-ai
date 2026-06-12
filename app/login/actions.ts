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
