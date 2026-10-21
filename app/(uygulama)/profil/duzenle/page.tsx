"use client";

// Hesap — Android `ProfileEditScreen`in web karşılığı.
// Ayarlar → Hesap → "Hesap" satırı buraya gelir (Android'de de o satır bu ekranı açıyor).
//
// Düzen Android'deki sırayla: avatar → Ad → Kullanıcı Adı → Parola → E-posta.
// Ad ve e-posta salt okunur SATIR olarak duruyor (uygulamada da öyle), ayrı bir
// "değiştirilemeyenler" kutusu yok.
//
// ⚠️ Ad Soyad bilerek düzenlenemez: Android'de alan düzenlenebilir görünüyor ama Kaydet
// gövdesinin tamamı `if (editingUsername && …)` içinde olduğu için ASLA yazılmıyor —
// yazdığın sessizce kayboluyor. Aynı hatayı kopyalamak yerine okunur gösteriyoruz.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail, updatePassword } from "firebase/auth";
import Kabuk from "../../Kabuk";
import { auth } from "../../../lib/firebase";
import { useOturum } from "../../../lib/oturum";
import AvatarSecici from "../AvatarSecici";
import {
  KullaniciAdiAlinmis,
  kullaniciAdiDegistir,
  kullaniciAdiDurumu,
  type KullaniciAdiDurumu as Durum,
} from "../../../lib/profilYaz";
import { sosyalMi } from "../../../lib/appleGiris";
import { uygunsuzAdMi } from "../../../lib/uygunsuzAd";

export default function HesapSayfasi() {
  return (
    <Kabuk>
      <Icerik />
    </Kabuk>
  );
}

/** Android'deki UsernameStatus metinleri. */
const DURUM_METNI: Record<Durum, { metin: string; renk: string } | null> = {
  bosta: null,
  kontrol: { metin: "Kontrol ediliyor…", renk: "rgba(255,255,255,.5)" },
  uygun: { metin: "✓ Kullanıcı adı müsait", renk: "#3ECF6A" },
  alinmis: { metin: "✗ Bu kullanıcı adı alınmış", renk: "#FF4D4D" },
  kisa: { metin: "En az 3 karakter gerekli", renk: "rgba(255,255,255,.5)" },
  gecersiz: { metin: "Yalnızca harf, rakam ve _ kullanabilirsin", renk: "#FF4D4D" },
  uygunsuz: { metin: "✗ Bu kullanıcı adı kullanılamaz", renk: "#FF4D4D" },
};

/** Etiketli salt okunur satır — uygulamadaki alan düğmesinin karşılığı. */
function Satir({ etiket, deger }: { etiket: string; deger: string }) {
  return (
    <div className="bk-hesap-alan">
      <span className="etiket">{etiket}</span>
      <div className="kutu">
        <span className="deger">{deger}</span>
      </div>
    </div>
  );
}

function Icerik() {
  const { kullanici, profil, profiliYenile } = useOturum();

  const kayitliAd = profil?.kullaniciAdi ?? "";
  const [duzenleniyor, setDuzenleniyor] = useState(false);
  const [ad, setAd] = useState(kayitliAd);
  const [durum, setDurum] = useState<Durum>("bosta");
  const [kaydediyor, setKaydediyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);

  const avatar = profil?.avatar || "profil0";
  const [avatarAcik, setAvatarAcik] = useState(false);
  // Parola formu — Android/iOS PasswordEdit ile aynı: mevcut + yeni + tekrar (21 Eki; eskiden
  // e-postaya sıfırlama bağlantısı gidiyordu: çocuk velinin e-postasına erişemeyebiliyordu)
  const [parolaAcik, setParolaAcik] = useState(false);
  const [mevcutParola, setMevcutParola] = useState("");
  const [yeniParola, setYeniParola] = useState("");
  const [yeniParola2, setYeniParola2] = useState("");
  const [parolaKaydediyor, setParolaKaydediyor] = useState(false);
  const [parolaHata, setParolaHata] = useState<string | null>(null);

  // Profil sonradan gelirse alanları bir kez doldur
  const doldurulduRef = useRef(false);
  useEffect(() => {
    if (doldurulduRef.current || !profil) return;
    doldurulduRef.current = true;
    setAd(profil.kullaniciAdi ?? "");
  }, [profil]);

  // Android'deki 500 ms gecikmeli müsaitlik kontrolü
  useEffect(() => {
    if (!kullanici || !duzenleniyor) { setDurum("bosta"); return; }
    const a = ad.trim();
    if (a === kayitliAd) { setDurum("bosta"); return; }
    if (a.length < 3) { setDurum("kisa"); return; }
    setDurum("kontrol");
    let iptal = false;
    const t = setTimeout(async () => {
      const d = await kullaniciAdiDurumu(kullanici.uid, a);
      if (!iptal) setDurum(d);
    }, 500);
    return () => { iptal = true; clearTimeout(t); };
  }, [ad, kayitliAd, kullanici, duzenleniyor]);

  if (!kullanici) {
    return (
      <>
        <h1 style={{ fontSize: 24, marginBottom: 10 }}>Hesap</h1>
        <div className="bk-kart">
          <p className="bk-soluk" style={{ fontSize: 14, marginBottom: 14 }}>
            Hesap bilgilerini görmek için giriş yapman gerekiyor.
          </p>
          <Link className="bk-dugme" href="/giris">Giriş yap</Link>
        </div>
      </>
    );
  }

  // Parola satırı yalnızca e-posta/parola ile girenlerde (uygulamadaki isGoogleUser)
  const googleIle = sosyalMi(kullanici);   // Google ya da Apple: parola yok

  const degisti = ad.trim() !== kayitliAd;
  const kaydedilebilir = duzenleniyor && degisti && durum !== "alinmis"
    && durum !== "kisa" && durum !== "gecersiz" && durum !== "uygunsuz" && !kaydediyor;

  async function kaydet() {
    if (!kullanici || !kaydedilebilir) return;
    // Kontrol (debounce) bitmeden basılsa da uygunsuz ad kaydedilmesin
    if (uygunsuzAdMi(ad.trim())) { setDurum("uygunsuz"); return; }
    setKaydediyor(true);
    setHata(null);
    setBilgi(null);
    try {
      await kullaniciAdiDegistir(kullanici.uid, ad, kayitliAd);
      await profiliYenile();
      setDuzenleniyor(false);
      setBilgi("Kullanıcı adın güncellendi.");
    } catch (e) {
      if (e instanceof KullaniciAdiAlinmis) {
        setDurum("alinmis");
        setHata(e.message);
      } else {
        setHata((e as { message?: string })?.message || "Bir hata oluştu, tekrar dene.");
      }
    } finally {
      setKaydediyor(false);
    }
  }

  function parolaFormunuKapat() {
    setParolaAcik(false); setMevcutParola(""); setYeniParola(""); setYeniParola2(""); setParolaHata(null);
  }

  // Mevcut parolayı unutan için eski yol: e-postaya sıfırlama bağlantısı (artık yalnız bilerek seçilince)
  async function sifirlamaGonder() {
    const eposta = auth.currentUser?.email || profil?.eposta || "";
    if (!eposta || parolaKaydediyor) return;
    setParolaKaydediyor(true); setParolaHata(null);
    try {
      await sendPasswordResetEmail(auth, eposta);
      parolaFormunuKapat();
      setBilgi(`${eposta} adresine parola sıfırlama bağlantısı gönderildi.`);
    } catch {
      setParolaHata("Bağlantı gönderilemedi. Biraz sonra tekrar dene.");
    } finally {
      setParolaKaydediyor(false);
    }
  }

  // Android ProfileScreen parola kaydet ile aynı doğrulama ve metinler
  async function parolaKaydet() {
    if (parolaKaydediyor) return;
    setParolaHata(null); setHata(null); setBilgi(null);
    if (!mevcutParola) { setParolaHata("Mevcut parolayı gir"); return; }
    if (yeniParola.length < 6) { setParolaHata("Yeni parola en az 6 karakter olmalı"); return; }
    if (yeniParola !== yeniParola2) { setParolaHata("Yeni parolalar eşleşmiyor"); return; }
    const u = auth.currentUser;
    const eposta = u?.email || profil?.eposta || "";
    if (!u || !eposta) { setParolaHata("Oturum bulunamadı, yeniden giriş yap"); return; }
    setParolaKaydediyor(true);
    try {
      await reauthenticateWithCredential(u, EmailAuthProvider.credential(eposta, mevcutParola));
      await updatePassword(u, yeniParola);
      parolaFormunuKapat();
      setBilgi("Parolan güncellendi.");
    } catch (e) {
      const kod = (e as { code?: string })?.code ?? "";
      setParolaHata(
        kod === "auth/wrong-password" || kod === "auth/invalid-credential" || kod === "auth/invalid-login-credentials"
          ? "Mevcut parola yanlış"
          : kod === "auth/weak-password" ? "Yeni parola çok zayıf, en az 6 karakter olmalı"
          : kod === "auth/too-many-requests" ? "Çok fazla deneme yapıldı, biraz sonra tekrar dene"
          : kod === "auth/network-request-failed" ? "Bağlantı yok, sonra tekrar dene"
          : "Bir hata oluştu, tekrar dene",
      );
    } finally {
      setParolaKaydediyor(false);
    }
  }

  const d = DURUM_METNI[durum];

  return (
    <>
      <div className="bk-kart-ust">
        <h1 style={{ fontSize: 24 }}>Hesap</h1>
        <Link href="/profil">Bitti</Link>
      </div>

      {/* Avatar — uygulamada da en üstte, dokununca seçici açılıyor */}
      <div className="bk-hesap-avatar">
        <button
          type="button"
          onClick={() => setAvatarAcik(true)}
          aria-label="Avatarı değiştir"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/uygulama/avatar/${avatar}.png`} alt="" />
          <i aria-hidden>✎</i>
        </button>
      </div>

      <Satir etiket="Ad" deger={profil?.adSoyad || "Ad girilmemiş"} />

      <div className="bk-hesap-alan">
        <span className="etiket">Kullanıcı Adı</span>
        {duzenleniyor ? (
          <div className="bk-kadi-alan">
            <span>@</span>
            <input
              className="bk-alan"
              value={ad}
              // Desen büyük harfi reddediyor; kullanıcı sebebini anlamadan hata almasın
              onChange={(e) => setAd(e.target.value.toLocaleLowerCase("tr"))}
              placeholder="kullanici_adin"
              maxLength={30}
              autoComplete="off"
              autoFocus
            />
          </div>
        ) : (
          <div className="kutu">
            <span className="deger">
              {kayitliAd ? `@${kayitliAd}` : "Kullanıcı adı girilmemiş"}
            </span>
            <button
              type="button"
              className="kalem"
              onClick={() => { setAd(kayitliAd); setDuzenleniyor(true); setHata(null); setBilgi(null); }}
              aria-label="Kullanıcı adını düzenle"
            >
              ✎
            </button>
          </div>
        )}
        {duzenleniyor && d && (
          <p style={{ fontSize: 13, color: d.renk, margin: "8px 0 0" }}>{d.metin}</p>
        )}
      </div>

      {!googleIle && (
        <div className="bk-hesap-alan">
          <span className="etiket">Parola</span>
          {parolaAcik ? (
            <form
              style={{ display: "flex", flexDirection: "column", gap: 10 }}
              onSubmit={(e) => { e.preventDefault(); parolaKaydet(); }}
            >
              <input className="bk-alan" type="password" placeholder="Mevcut Parola" autoComplete="current-password"
                value={mevcutParola} onChange={(e) => setMevcutParola(e.target.value)} autoFocus />
              <input className="bk-alan" type="password" placeholder="Yeni Parola" autoComplete="new-password"
                value={yeniParola} onChange={(e) => setYeniParola(e.target.value)} />
              <input className="bk-alan" type="password" placeholder="Yeni Parola (tekrar)" autoComplete="new-password"
                value={yeniParola2} onChange={(e) => setYeniParola2(e.target.value)} />
              {parolaHata && <p className="bk-hata" style={{ margin: 0 }}>{parolaHata}</p>}
              <div style={{ display: "flex", gap: 10 }}>
                <button type="submit" className="bk-dugme" style={{ flex: 1 }} disabled={parolaKaydediyor}>
                  {parolaKaydediyor ? "Kaydediliyor…" : "Parolayı Değiştir"}
                </button>
                <button type="button" className="bk-dugme acik" style={{ flex: 1 }} disabled={parolaKaydediyor}
                  onClick={parolaFormunuKapat}>
                  Vazgeç
                </button>
              </div>
              <button type="button" onClick={sifirlamaGonder} disabled={parolaKaydediyor}
                style={{ background: "none", border: 0, padding: 0, color: "#55C7FF", fontSize: 13, textAlign: "left", cursor: "pointer" }}>
                Mevcut parolanı mı unuttun? E-postana sıfırlama bağlantısı gönder
              </button>
            </form>
          ) : (
            <button
              type="button"
              className="kutu tiklanabilir"
              onClick={() => { setParolaAcik(true); setHata(null); setBilgi(null); }}
            >
              <span className="deger">••••••••</span>
              <span className="kalem" aria-hidden>✎</span>
            </button>
          )}
        </div>
      )}

      <Satir etiket="E-posta" deger={profil?.eposta || kullanici.email || "E-posta girilmemiş"} />

      {duzenleniyor && (
        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button className="bk-dugme" style={{ flex: 1 }} disabled={!kaydedilebilir} onClick={kaydet}>
            {kaydediyor ? "Kaydediliyor…" : "Kaydet"}
          </button>
          <button
            className="bk-dugme acik"
            style={{ flex: 1 }}
            disabled={kaydediyor}
            onClick={() => { setDuzenleniyor(false); setAd(kayitliAd); setHata(null); }}
          >
            Vazgeç
          </button>
        </div>
      )}

      {hata && <p className="bk-hata" style={{ marginTop: 16 }}>{hata}</p>}
      {bilgi && (
        <p style={{ color: "#3ECF6A", fontSize: 14, textAlign: "center", marginTop: 16 }}>
          {bilgi}
        </p>
      )}

      <AvatarSecici
        acik={avatarAcik}
        kapat={() => setAvatarAcik(false)}
        onSonuc={(r) => { setHata(null); setBilgi(null); (r.tamam ? setBilgi : setHata)(r.mesaj); }}
      />
    </>
  );
}
