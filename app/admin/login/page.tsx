"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../../lib/firebase";

const ADMIN_EMAIL = "fatihkurul@bilkie.com";

export default function AdminLoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleGoogleLogin() {
    setLoading(true);
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ login_hint: ADMIN_EMAIL });
      const result = await signInWithPopup(auth, provider);
      if (result.user.email !== ADMIN_EMAIL) {
        await auth.signOut();
        setError("Bu hesabın panele erişim yetkisi yok.");
      } else {
        router.replace("/admin/testler");
      }
    } catch {
      setError("Giriş başarısız oldu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0C1A3F",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#2C335E",
          border: "1px solid #4A538E",
          borderRadius: 24,
          padding: "40px 48px",
          textAlign: "center",
          color: "#EAF2FF",
          minWidth: 320,
        }}
      >
        <h1 style={{ fontSize: 36, marginBottom: 4, color: "#8FB3D9", fontWeight: 800, letterSpacing: -1 }}>
          bilkie
        </h1>
        <p style={{ color: "#C9D9F2", fontSize: 14, marginBottom: 32 }}>Yönetici Paneli</p>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            background: loading ? "#4A538E" : "#F3A24C",
            color: "#0C1A3F",
            border: "none",
            borderRadius: 999,
            padding: "13px 32px",
            fontSize: 15,
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            width: "100%",
            transition: "background 0.2s",
          }}
        >
          {loading ? "Giriş yapılıyor..." : "Google ile Giriş Yap"}
        </button>

        {error && (
          <p style={{ color: "#F3A24C", marginTop: 16, fontSize: 13 }}>{error}</p>
        )}
      </div>
    </main>
  );
}
