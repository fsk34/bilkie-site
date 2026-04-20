"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getApp, getApps, initializeApp } from "firebase/app";
import { applyActionCode, checkActionCode, getAuth } from "firebase/auth";
import localFont from "next/font/local";

const bilkieFont = localFont({
  src: "../fonts/bilkie.otf",
});

const baslikFont = localFont({
  src: "../fonts/baslik.otf",
});

const mainFont = localFont({
  src: "../fonts/main.ttf",
});

const firebaseConfig = {
  apiKey: "AIzaSyCPam-DUCX9dbeXP0WQk6RSjDZxQiWztuA",
  authDomain: "turkce3-sinif.firebaseapp.com",
  projectId: "turkce3-sinif",
  storageBucket: "turkce3-sinif.firebasestorage.app",
  appId: "1:899362595925:web:d288264eabeb402cf6a0dc",
};

function getFirebaseApp() {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

type StatusType = "loading" | "ready" | "verifying" | "success" | "error";

function DogrulaContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<StatusType>("loading");
  const [message, setMessage] = useState("E-posta doğrulanıyor...");

  const mode = useMemo(() => searchParams.get("mode"), [searchParams]);
  const oobCode = useMemo(() => searchParams.get("oobCode"), [searchParams]);

  // Sayfa açılışında sadece checkActionCode çağır (kodu tüketmez).
  // applyActionCode'u kullanıcı butona basana kadar çağırma — e-posta
  // istemcilerinin link ön-yüklemesi (prefetch) kodu tüketir.
  useEffect(() => {
    async function checkCode() {
      if (!mode || !oobCode) {
        setStatus("error");
        setMessage("Geçersiz doğrulama bağlantısı.");
        return;
      }

      if (mode !== "verifyEmail") {
        setStatus("error");
        setMessage("Bu bağlantı e-posta doğrulama bağlantısı değil.");
        return;
      }

      try {
        const app = getFirebaseApp();
        const auth = getAuth(app);
        await checkActionCode(auth, oobCode);
        setStatus("ready");
        setMessage("E-posta adresini doğrulamak için aşağıdaki butona bas.");
      } catch (error) {
        console.error(error);
        setStatus("error");
        setMessage("Bağlantı geçersiz, süresi dolmuş ya da daha önce kullanılmış olabilir.");
      }
    }

    checkCode();
  }, [mode, oobCode]);

  async function handleVerify() {
    if (!oobCode) return;
    setStatus("verifying");
    setMessage("Doğrulanıyor...");
    try {
      const app = getFirebaseApp();
      const auth = getAuth(app);
      await applyActionCode(auth, oobCode);
      setStatus("success");
      setMessage("E-posta adresin başarıyla doğrulandı.");
    } catch (error) {
      console.error(error);
      setStatus("error");
      setMessage("Bağlantı geçersiz, süresi dolmuş ya da daha önce kullanılmış olabilir.");
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
          style={{
            fontSize: "40px",
            marginBottom: "16px",
            color: "#8FB3D9",
          }}
        >
          bilkie
        </h1>

        <h2
          className={baslikFont.className}
          style={{
            fontSize: "28px",
            marginBottom: "16px",
          }}
        >
          {(status === "loading" || status === "verifying") && "Doğrulanıyor"}
          {status === "ready" && "E-postanı Doğrula"}
          {status === "success" && "Doğrulama Başarılı"}
          {status === "error" && "Doğrulama Hatası"}
        </h2>

        <p
          className={mainFont.className}
          style={{
            fontSize: "18px",
            lineHeight: 1.5,
            color: "#C9D9F2",
            marginBottom: "24px",
          }}
        >
          {message}
        </p>

        {status === "ready" && (
          <button
            onClick={handleVerify}
            style={{
              display: "inline-block",
              background: "#F3A24C",
              color: "#0C1A3F",
              border: "none",
              cursor: "pointer",
              padding: "14px 24px",
              borderRadius: "999px",
              fontWeight: 700,
              fontSize: "16px",
            }}
          >
            E-postamı Doğrula
          </button>
        )}

        {status === "success" && (
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
        )}

        {status === "error" && (
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
            Tekrar dene
          </a>
        )}
      </div>
    </main>
  );
}

export default function DogrulaPage() {
  return (
    <Suspense
      fallback={
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
              style={{
                fontSize: "40px",
                marginBottom: "16px",
                color: "#8FB3D9",
              }}
            >
              bilkie
            </h1>
            <h2
              className={baslikFont.className}
              style={{
                fontSize: "28px",
                marginBottom: "16px",
              }}
            >
              Doğrulanıyor
            </h2>
            <p
              className={mainFont.className}
              style={{
                fontSize: "18px",
                lineHeight: 1.5,
                color: "#C9D9F2",
                marginBottom: "24px",
              }}
            >
              E-posta doğrulanıyor...
            </p>
          </div>
        </main>
      }
    >
      <DogrulaContent />
    </Suspense>
  );
}