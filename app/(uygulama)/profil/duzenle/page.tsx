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
import { sendPasswordResetEmail } from "firebase/auth";
import Kabuk from "../../Kabuk";
import { auth } from "../../../lib/firebase";
import { useOturum } from "../../../lib/oturum";
import { AvatarSecimi } from "../../kayit/parcalar";
import {
  avatarDegistir,
  KullaniciAdiAlinmis,
  kullaniciAdiDegistir,
  kullaniciAdiDurumu,
  type KullaniciAdiDurumu as Durum,
} from "../../../lib/profilYaz";

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

  const [avatar, setAvatar] = useState(profil?.avatar || "profil0");
  const [avatarAcik, setAvatarAcik] = useState(false);
  const [avatarKaydediyor, setAvatarKaydediyor] = useState(false);
  const [parolaGonderiliyor, setParolaGonderiliyor] = useState(false);

  // Profil sonradan gelirse alanları bir kez doldur
  const doldurulduRef = useRef(false);
  useEffect(() => {
    if (doldurulduRef.current || !profil) return;
    doldurulduRef.current = true;
    setAd(profil.kullaniciAdi ?? "");
    setAvatar(profil.avatar || "profil0");
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
  const googleIle = kullanici.providerData.some((p) => p.providerId === "google.com");

  const degisti = ad.trim() !== kayitliAd;
  const kaydedilebilir = duzenleniyor && degisti && durum !== "alinmis"
    && durum !== "kisa" && durum !== "gecersiz" && !kaydediyor;

  async function kaydet() {
    if (!kullanici || !kaydedilebilir) return;
    setKaydediyor(true);
    setHata(null);
    setBilgi(null);
    try {
      await kullaniciAdiDegistir(kullanici.uid, ad, kayitliAd, avatar);
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

  // Android'de avatar seçiciye dokunulduğu AN kaydediliyor — ayrı Kaydet yok
  async function avatarSec(yeni: string) {
    if (!kullanici || avatarKaydediyor || yeni === avatar) return;
    const onceki = avatar;
    setAvatar(yeni);
    setAvatarKaydediyor(true);
    setHata(null);
    setBilgi(null);
    try {
      // ⚠️ Lig satırına KAYITLI ad yazılır, kutuya yazılmış olan değil: kullanıcı yeni bir
      // ad yazıp kaydetmeden avatara dokunursa sahiplenmediği ad liglerde görünürdü.
      await avatarDegistir(kullanici.uid, yeni, kayitliAd || profil?.adSoyad || "Sen");
      await profiliYenile();
      setAvatarAcik(false);
      setBilgi("Avatarın güncellendi.");
    } catch {
      setAvatar(onceki);
      setHata("Avatar kaydedilemedi. Bağlantını kontrol edip tekrar dene.");
    } finally {
      setAvatarKaydediyor(false);
    }
  }

  // Uygulamada parola ekranda değiştiriliyor; web'de Firebase yeniden kimlik doğrulama
  // istediği için sıfırlama bağlantısı gönderiliyor (bağlantı /sifre-sifirla'ya düşüyor).
  async function parolaSifirlamaGonder() {
    const eposta = profil?.eposta || kullanici?.email || "";
    if (!eposta || parolaGonderiliyor) return;
    setParolaGonderiliyor(true);
    setHata(null);
    setBilgi(null);
    try {
      await sendPasswordResetEmail(auth, eposta);
      setBilgi(`${eposta} adresine parola değiştirme bağlantısı gönderildi.`);
    } catch {
      setHata("Bağlantı gönderilemedi. Biraz sonra tekrar dene.");
    } finally {
      setParolaGonderiliyor(false);
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
          disabled={avatarKaydediyor}
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
          <button
            type="button"
            className="kutu tiklanabilir"
            onClick={parolaSifirlamaGonder}
            disabled={parolaGonderiliyor}
          >
            <span className="deger">{parolaGonderiliyor ? "Gönderiliyor…" : "••••••••"}</span>
            <span className="kalem" aria-hidden>✎</span>
          </button>
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

      {avatarAcik && (
        <div className="bk-ortu" onClick={() => !avatarKaydediyor && setAvatarAcik(false)}>
          <div className="bk-kart bk-soru-kutu" onClick={(e) => e.stopPropagation()}>
            <h3>Avatarını Seç</h3>
            <div style={{ opacity: avatarKaydediyor ? 0.6 : 1, marginTop: 12 }}>
              <AvatarSecimi secili={avatar} sec={avatarSec} />
            </div>
            <button
              className="bk-dugme acik tam"
              style={{ marginTop: 14 }}
              disabled={avatarKaydediyor}
              onClick={() => setAvatarAcik(false)}
            >
              {avatarKaydediyor ? "Kaydediliyor…" : "Kapat"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
