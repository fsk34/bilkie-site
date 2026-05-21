"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import localFont from "next/font/local";
import { auth } from "../lib/firebase";

const bilkieFont = localFont({ src: "../fonts/bilkie.otf" });
const baslikFont = localFont({ src: "../fonts/baslik.otf" });
const mainFont   = localFont({ src: "../fonts/main.ttf" });

type StatusType = "loading" | "ready" | "resetting" | "success" | "error";

function SifreSifirlaContent() {
  const searchParams = useSearchParams();
  const [status, setStatus]       = useState<StatusType>("loading");
  const [message, setMessage]     = useState("");
  const [email, setEmail]         = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm]     = useState("");
  const [fieldError, setFieldError] = useState("");

  const mode    = useMemo(() => searchParams.get("mode"),    [searchParams]);
  const oobCode = useMemo(() => searchParams.get("oobCode"), [searchParams]);

  useEffect(() => {
    async function checkCode() {
      if (!oobCode) {
        setStatus("error");
        setMessage("Geçersiz şifre sıfırlama bağlantısı.");
        return;
      }
      if (mode !== "resetPassword") {
        setStatus("error");
        setMessage("Bu bağlantı şifre sıfırlama bağlantısı değil.");
        return;
      }
      try {
        const accountEmail = await verifyPasswordResetCode(auth, oobCode);
        setEmail(accountEmail);
        setStatus("ready");
      } catch {
        setStatus("error");
        setMessage("Bağlantı geçersiz, süresi dolmuş ya da daha önce kullanılmış olabilir.");
      }
    }
    checkCode();
  }, [mode, oobCode]);

  async function handleReset() {
    setFieldError("");
    if (newPassword.length < 6) {
      setFieldError("Şifre en az 6 karakter olmalıdır.");
      return;
    }
    if (newPassword !== confirm) {
      setFieldError("Şifreler eşleşmiyor.");
      return;
    }
    if (!oobCode) return;
    setStatus("resetting");
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setStatus("success");
    } catch {
      setStatus("error");
      setMessage("Şifre sıfırlanamadı. Bağlantı süresi dolmuş olabilir.");
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
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "560px",
          background: "#2C335E",
          border: "1px solid #4A538E",
          borderRadius: "28px",
          padding: "32px 24px",
          textAlign: "center",
          color: "#EAF2FF",
        }}
      >
        <h1
          className={bilkieFont.className}
          style={{ fontSize: "40px", marginBottom: "16px", color: "#8FB3D9" }}
        >
          bilkie
        </h1>

        <h2
          className={baslikFont.className}
          style={{ fontSize: "28px", marginBottom: "16px" }}
        >
          {(status === "loading" || status === "resetting") && "Şifre Sıfırlanıyor"}
          {status === "ready"   && "Yeni Şifre Belirle"}
          {status === "success" && "Şifre Güncellendi"}
          {status === "error"   && "Bir Hata Oluştu"}
        </h2>

        {status === "ready" && (
          <>
            <p
              className={mainFont.className}
              style={{ fontSize: "15px", color: "#C9D9F2", marginBottom: "24px" }}
            >
              <strong style={{ color: "#F3A24C" }}>{email}</strong> hesabı için yeni şifreni gir.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "8px" }}>
              <input
                type="password"
                placeholder="Yeni şifre"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={mainFont.className}
                style={inputStyle}
              />
              <input
                type="password"
                placeholder="Yeni şifreyi tekrarla"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={mainFont.className}
                style={inputStyle}
              />
            </div>

            {fieldError && (
              <p
                className={mainFont.className}
                style={{ fontSize: "14px", color: "#FF6B6B", marginBottom: "12px" }}
              >
                {fieldError}
              </p>
            )}

            <button
              onClick={handleReset}
              className={mainFont.className}
              style={{
                display: "inline-block",
                background: "#F3A24C",
                color: "#0C1A3F",
                border: "none",
                cursor: "pointer",
                padding: "14px 32px",
                borderRadius: "999px",
                fontWeight: 700,
                fontSize: "16px",
                marginTop: "8px",
              }}
            >
              Şifremi Güncelle
            </button>
          </>
        )}

        {(status === "loading" || status === "resetting") && (
          <p
            className={mainFont.className}
            style={{ fontSize: "18px", color: "#C9D9F2" }}
          >
            Lütfen bekle...
          </p>
        )}

        {status === "success" && (
          <>
            <p
              className={mainFont.className}
              style={{ fontSize: "18px", color: "#C9D9F2", marginBottom: "24px" }}
            >
              Şifren başarıyla güncellendi. Artık uygulamaya yeni şifrenle giriş yapabilirsin.
            </p>
            <a
              href="/"
              style={{
                display: "inline-block",
                background: "#F3A24C",
                color: "#0C1A3F",
                textDecoration: "none",
                padding: "14px 24px",
                borderRadius: "999px",
                fontWeight: 700,
              }}
            >
              Ana sayfaya dön
            </a>
          </>
        )}

        {status === "error" && (
          <>
            <p
              className={mainFont.className}
              style={{ fontSize: "18px", color: "#C9D9F2", marginBottom: "24px" }}
            >
              {message}
            </p>
            <a
              href="/"
              style={{
                display: "inline-block",
                background: "#AFC6E6",
                color: "#0C1A3F",
                textDecoration: "none",
                padding: "14px 24px",
                borderRadius: "999px",
                fontWeight: 700,
              }}
            >
              Ana sayfaya dön
            </a>
          </>
        )}
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 16px",
  borderRadius: "12px",
  border: "1px solid #4A538E",
  background: "#1A2550",
  color: "#EAF2FF",
  fontSize: "16px",
  outline: "none",
  boxSizing: "border-box",
};

const fallbackCard = (
  <main
    style={{
      minHeight: "100vh",
      background: "#0C1A3F",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
    }}
  >
    <div
      style={{
        width: "100%",
        maxWidth: "560px",
        background: "#2C335E",
        border: "1px solid #4A538E",
        borderRadius: "28px",
        padding: "32px 24px",
        textAlign: "center",
        color: "#EAF2FF",
      }}
    >
      <p style={{ fontSize: "18px" }}>Yükleniyor...</p>
    </div>
  </main>
);

export default function SifreSifirlaPage() {
  return (
    <Suspense fallback={fallbackCard}>
      <SifreSifirlaContent />
    </Suspense>
  );
}
