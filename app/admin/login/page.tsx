"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../lib/firebase";

const ADMIN_EMAIL = "fatihkurul@bilkie.com";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      if (result.user.email !== ADMIN_EMAIL) {
        await auth.signOut();
        setError("Bu hesabın panele erişim yetkisi yok.");
      } else {
        router.replace("/admin/testler");
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
        setError("E-posta veya şifre hatalı.");
      } else {
        setError("Giriş başarısız oldu. Lütfen tekrar deneyin.");
      }
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    background: "#1A2550",
    color: "#EAF2FF",
    border: "1px solid #4A538E",
    borderRadius: 10,
    padding: "11px 14px",
    fontSize: 15,
    width: "100%",
    outline: "none",
    boxSizing: "border-box",
  };

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
          padding: "40px 40px",
          color: "#EAF2FF",
          width: "100%",
          maxWidth: 360,
        }}
      >
        <h1 style={{ fontSize: 36, marginBottom: 4, color: "#8FB3D9", fontWeight: 800, letterSpacing: -1, textAlign: "center" }}>
          bilkie
        </h1>
        <p style={{ color: "#C9D9F2", fontSize: 14, marginBottom: 28, textAlign: "center" }}>Yönetici Paneli</p>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            style={inputStyle}
            type="email"
            placeholder="E-posta"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            style={inputStyle}
            type="password"
            placeholder="Şifre"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          {error && (
            <p style={{ color: "#F3A24C", fontSize: 13, margin: 0 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? "#4A538E" : "#F3A24C",
              color: "#0C1A3F",
              border: "none",
              borderRadius: 999,
              padding: "13px",
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              marginTop: 4,
            }}
          >
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>
      </div>
    </main>
  );
}
