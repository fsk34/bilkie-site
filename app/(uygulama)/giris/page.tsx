"use client";

// Web girişi. Hesap MOBİL uygulamayla ortak; kayıt artık web'den de yapılabiliyor
// (bkz. /kayit). Google ile gelen ama profili olmayan kullanıcı — yeni hesap
// da olabilir, mobilde yarım bırakılmış hesap da — sınıf/avatar kurulumuna gönderilir.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth } from "../../lib/firebase";
import { useOturum } from "../../lib/oturum";
import { profilOku } from "../../lib/veri";
import GoogleDugme from "../GoogleDugme";

export default function GirisSayfasi() {
  const router = useRouter();
  const { kullanici, yukleniyor } = useOturum();
  const [eposta, setEposta] = useState("");
  const [parola, setParola] = useState("");
  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  // Şifremi unuttum — uygulamadaki akışın aynısı (Android AuthScreen.kt:
  // ForgotPasswordDialog). Sıfırlama bağlantısının indiği sayfa zaten var:
  // /sifre-sifirla (oobCode ile yeni parola belirletir). Eksik olan İSTEME
  // tarafıydı; web'den giren kullanıcı parolasını hiç sıfırlayamıyordu.
  const [sifreAcik, setSifreAcik] = useState(false);
  const [sifreEposta, setSifreEposta] = useState("");
  const [sifreGonderiliyor, setSifreGonderiliyor] = useState(false);
  const [sifreSonuc, setSifreSonuc] = useState<string | null>(null);

  async function sifirlamaGonder(e: React.FormEvent) {
    e.preventDefault();
    setSifreGonderiliyor(true);
    try {
      await sendPasswordResetEmail(auth, sifreEposta.trim());
    } catch (err) {
      // Ağ/biçim hatası dışındakileri YUTUYORUZ: "böyle bir kullanıcı yok" demek,
      // hangi e-postanın kayıtlı olduğunu isteyen herkese söylemek olur (hesap
      // sayımı). Uygulama bunu sızdırıyor; web'de sızdırmıyoruz.
      const kod = (err as { code?: string })?.code ?? "";
      if (kod === "auth/invalid-email" || kod === "auth/network-request-failed" ||
          kod === "auth/too-many-requests") {
        setSifreSonuc(hataMetni(err));
        setSifreGonderiliyor(false);
        return;
      }
    }
    setSifreSonuc("Bu adrese ait bir hesap varsa sıfırlama bağlantısı gönderildi. Gelen kutunu kontrol et.");
    setSifreGonderiliyor(false);
  }

  useEffect(() => {
    if (!yukleniyor && kullanici) router.replace("/");
  }, [yukleniyor, kullanici, router]);

  async function profilKontrol(uid: string): Promise<boolean> {
    const p = await profilOku(uid);
    if (p) return true;
    await signOut(auth);
    setHata(
      "Bu hesabın kaydı tamamlanmamış. Önce Bilkie uygulamasından sınıf ve avatar seçip kaydı bitir."
    );
    return false;
  }

  async function epostaIleGir(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setBekliyor(true);
    try {
      const sonuc = await signInWithEmailAndPassword(auth, eposta.trim(), parola);
      if (!sonuc.user.emailVerified) {
        await signOut(auth);
        setHata("E-posta adresin doğrulanmamış. Gelen kutunu kontrol et.");
        return;
      }
      if (await profilKontrol(sonuc.user.uid)) router.replace("/");
    } catch (err) {
      setHata(hataMetni(err));
    } finally {
      setBekliyor(false);
    }
  }

  async function googleIleGir() {
    setHata(null);
    setBekliyor(true);
    try {
      const sonuc = await signInWithPopup(auth, new GoogleAuthProvider());
      // Profili varsa kayıtlı kullanıcıdır; yoksa kurulumu tamamlaması gerekiyor.
      // (Uygulamada da kayıt sınıf+avatar seçilince tamamlanmış sayılıyor.)
      if (await profilOku(sonuc.user.uid)) router.replace("/");
      else router.replace("/kayit/google");
    } catch (err) {
      setHata(hataMetni(err));
      setBekliyor(false);
    }
  }

  return (
    <div className="bk" style={{ display: "grid", placeItems: "center", padding: "48px 20px" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <Link href="/" className="bk-logo" style={{ display: "block", textAlign: "center" }}>
          bilkie
        </Link>
        <h1 style={{ fontSize: 22, textAlign: "center", margin: "6px 0 24px" }}>
          Tekrar hoş geldin!
        </h1>

        <form onSubmit={epostaIleGir} style={{ display: "grid", gap: 12 }}>
          <input
            className="bk-alan"
            type="email"
            placeholder="E-posta"
            value={eposta}
            onChange={(e) => setEposta(e.target.value)}
            autoComplete="email"
            required
          />
          <input
            className="bk-alan"
            type="password"
            placeholder="Parola"
            value={parola}
            onChange={(e) => setParola(e.target.value)}
            autoComplete="current-password"
            required
          />
          <button className="bk-dugme tam" type="submit" disabled={bekliyor || parola.length < 6}>
            {bekliyor ? "Giriş yapılıyor…" : "Giriş yap"}
          </button>
        </form>

        {/* Uygulamada da giriş düğmesinin hemen altında (Android AuthScreen.kt:217) */}
        <button
          type="button"
          onClick={() => {
            setSifreEposta(eposta.trim());
            setSifreSonuc(null);
            setSifreAcik(true);
          }}
          style={{
            display: "block", margin: "12px auto 0", background: "none", border: 0,
            padding: 0, cursor: "pointer", color: "var(--acik-mavi)",
            fontFamily: "inherit", fontSize: 13,
          }}
        >
          Şifremi unuttum
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
          <i style={{ flex: 1, height: 1, background: "rgba(255,255,255,.15)" }} />
          <span className="bk-soluk" style={{ fontSize: 13 }}>veya</span>
          <i style={{ flex: 1, height: 1, background: "rgba(255,255,255,.15)" }} />
        </div>

        <GoogleDugme yazi="Google ile giriş yap" onClick={googleIleGir} disabled={bekliyor} />

        {hata && (
          <p style={{ color: "#FF8A80", fontSize: 14, marginTop: 16, textAlign: "center" }}>
            {hata}
          </p>
        )}

        <p className="bk-soluk" style={{ fontSize: 13, marginTop: 24, textAlign: "center" }}>
          Hesabın yok mu? <Link href="/kayit">Kayıt ol</Link>
          <br />
          <Link href="/">Ana sayfaya dön</Link>
        </p>
      </div>

      {sifreAcik && (
        <div className="bk-ortu" onClick={() => !sifreGonderiliyor && setSifreAcik(false)}>
          <div className="bk-kart bk-soru-kutu" onClick={(e) => e.stopPropagation()}>
            <h3>Şifremi unuttum</h3>
            <p className="bk-soluk" style={{ marginBottom: 12 }}>
              E-posta adresini gir, şifre sıfırlama bağlantısı gönderelim.
            </p>
            <form onSubmit={sifirlamaGonder} style={{ display: "grid", gap: 12 }}>
              <input
                className="bk-alan"
                type="email"
                placeholder="E-posta"
                value={sifreEposta}
                onChange={(e) => { setSifreEposta(e.target.value); setSifreSonuc(null); }}
                autoComplete="email"
                required
                autoFocus
              />
              {sifreSonuc && (
                <p style={{ fontSize: 13, lineHeight: 1.5, margin: 0 }}>{sifreSonuc}</p>
              )}
              <button
                className="bk-dugme tam"
                type="submit"
                disabled={sifreGonderiliyor || !sifreEposta.trim()}
              >
                {sifreGonderiliyor ? "Gönderiliyor…" : "Bağlantı gönder"}
              </button>
            </form>
            <button
              type="button"
              onClick={() => setSifreAcik(false)}
              style={{
                display: "block", margin: "14px auto 0", background: "none", border: 0,
                padding: 0, cursor: "pointer", color: "var(--acik-mavi)",
                fontFamily: "inherit", fontSize: 14,
              }}
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function hataMetni(err: unknown): string {
  const kod = (err as { code?: string })?.code ?? "";
  switch (kod) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "E-posta veya parola hatalı.";
    case "auth/invalid-email":
      return "Geçersiz e-posta adresi.";
    case "auth/too-many-requests":
      return "Çok fazla deneme yapıldı. Biraz sonra tekrar dene.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Google penceresi kapatıldı.";
    case "auth/network-request-failed":
      return "Bağlantı kurulamadı. İnternetini kontrol et.";
    default:
      return "Giriş yapılamadı. Lütfen tekrar dene.";
  }
}
