"use client";

// Web kayıt akışı — Android `RegisterScreens.kt` → RegisterFlow'un birebir karşılığı.
// Adım sırası uygulamadaki gösterim sırasıyla aynı:
//   1) e-posta + onaylar (+ Google ile devam)  2) parola  3) ad-soyad  4) sınıf  5) avatar
// Kayıt SON adımda oluşur: öncesinde ne Auth kaydı ne de veritabanı kaydı vardır.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
  GoogleAuthProvider,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth } from "../../lib/firebase";
import { hatirlananlariUnut } from "../../lib/canli";
import { onbellegiBosalt } from "../../lib/onbellek";
import { profilOku } from "../../lib/veri";
import {
  epostaGecerli,
  epostaNormalize,
  kaydiTamamla,
  kayitHataMetni,
  URL_GIZLILIK,
  URL_SARTLAR,
} from "../../lib/kayit";
import {
  AvatarSecimi,
  KayitAdimi,
  KayitBasligi,
  OnaySatiri,
  SinifSecimi,
} from "./parcalar";

const TOPLAM_ADIM = 5;

export default function KayitSayfasi() {
  const router = useRouter();
  const [adim, setAdim] = useState(1);

  const [eposta, setEposta] = useState("");
  const [sartlar, setSartlar] = useState(false);
  const [gizlilik, setGizlilik] = useState(false);
  const [parola, setParola] = useState("");
  const [parolaGoster, setParolaGoster] = useState(false);
  const [adSoyad, setAdSoyad] = useState("");
  const [sinif, setSinif] = useState(3);
  const [avatar, setAvatar] = useState("profil0");

  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  // E-posta zaten kayıtlıysa 1. adımda gösterilecek uyarı + doğrudan giriş bağlantısı
  const [epostaDolu, setEpostaDolu] = useState(false);
  // Kayıt tamam, e-posta doğrulaması bekleniyor: [e-posta, parola]
  const [dogrulama, setDogrulama] = useState<[string, string] | null>(null);

  const onayVerildi = sartlar && gizlilik;

  function geri() {
    if (adim > 1) setAdim(adim - 1);
    else router.push("/giris");
  }

  async function googleIleDevam() {
    setHata(null);
    setBekliyor(true);
    try {
      const sonuc = await signInWithPopup(auth, new GoogleAuthProvider());
      // Profili olan hesap zaten kayıtlıdır; olmayan (yeni ya da yarım bırakılmış)
      // hesap sınıf/avatar seçimine gider — Android'deki GoogleOnboardingFlow.
      const profil = await profilOku(sonuc.user.uid);
      if (profil) {
        router.replace("/");
        return;
      }
      const yeniMi = getAdditionalUserInfo(sonuc)?.isNewUser ?? true;
      router.replace(`/kayit/google${yeniMi ? "" : "?devam=1"}`);
    } catch (err) {
      setHata(kayitHataMetni(err));
      setBekliyor(false);
    }
  }

  async function kayitOl() {
    setHata(null);
    setBekliyor(true);
    const normal = epostaNormalize(eposta);
    try {
      const sonuc = await createUserWithEmailAndPassword(auth, normal, parola);
      // Doğrulama maili best-effort: gitmese de kayıt akışı durmaz
      try {
        await sendEmailVerification(sonuc.user);
      } catch {
        /* yoksay */
      }
      await kaydiTamamla(sonuc.user, {
        adSoyad: adSoyad.trim(),
        eposta: normal,
        sinif,
        avatar,
        onayVerildi,
      });
      // Kurallar e-posta doğrulaması istiyor: oturumu kapat, doğrulama ekranını göster.
      await signOut(auth);
      setDogrulama([normal, parola]);
    } catch (err) {
      const kod = (err as { code?: string })?.code ?? "";
      if (kod === "auth/email-already-in-use" || kod === "auth/invalid-email") {
        // Sorun 1. adımdaki alanda: kullanıcıyı avatar ekranında bırakmak yerine
        // düzeltebileceği yere geri götür.
        setEpostaDolu(kod === "auth/email-already-in-use");
        setHata(kod === "auth/invalid-email" ? kayitHataMetni(err) : null);
        setAdim(1);
      } else {
        setHata(kayitHataMetni(err));
      }
    } finally {
      setBekliyor(false);
    }
  }

  if (dogrulama) {
    return (
      <DogrulamaEkrani
        eposta={dogrulama[0]}
        parola={dogrulama[1]}
        dogrulandi={() => {
          hatirlananlariUnut();
          onbellegiBosalt();
          router.replace("/");
        }}
        geri={() => setDogrulama(null)}
      />
    );
  }

  return (
    <div className="bk bk-kayit">
      <div className="bk-kayit-cerceve">
        <KayitBasligi adim={adim} toplam={TOPLAM_ADIM} geri={geri} />

        {adim === 1 && (
          <KayitAdimi
            dugmeAktif={epostaGecerli(eposta) && onayVerildi && !bekliyor}
            dugmeyeBas={() => setAdim(2)}
            altinda={
              <button
                type="button"
                className="bk-google-dugme"
                disabled={!onayVerildi || bekliyor}
                onClick={googleIleDevam}
              >
                Google ile Devam Et
              </button>
            }
          >
            <Link href="/" className="bk-logo bk-kayit-logo">
              bilkie
            </Link>
            <label className="bk-alan-etiket">E-Posta:</label>
            <input
              className="bk-alan"
              type="email"
              value={eposta}
              onChange={(e) => { setEposta(e.target.value); setEpostaDolu(false); setHata(null); }}
              autoComplete="email"
              placeholder="ornek@eposta.com"
              data-hatali={epostaDolu}
            />
            {epostaDolu && (
              <p className="bk-hata">
                Bu e-posta zaten kayıtlı.{" "}
                <Link href="/giris">Giriş yap</Link> ya da başka bir adres dene.
              </p>
            )}
            <OnaySatiri
              isaretli={sartlar}
              degistir={setSartlar}
              metin="Kullanım Şartları'nı "
              bagMetni="okudum ve kabul ediyorum"
              bagAdresi={URL_SARTLAR}
            />
            <OnaySatiri
              isaretli={gizlilik}
              degistir={setGizlilik}
              metin="Gizlilik Politikası'nı "
              bagMetni="okudum, onay veriyorum"
              bagAdresi={URL_GIZLILIK}
            />
            <p className="bk-kucuk-not">
              18 yaşından küçükseniz ebeveyn/veli onayı gereklidir.
            </p>
          </KayitAdimi>
        )}

        {adim === 2 && (
          <KayitAdimi dugmeAktif={parola.length >= 6} dugmeyeBas={() => setAdim(3)}>
            <label className="bk-alan-etiket">Parola:</label>
            <div className="bk-parola-kutu">
              <input
                className="bk-alan"
                type={parolaGoster ? "text" : "password"}
                value={parola}
                onChange={(e) => setParola(e.target.value)}
                autoComplete="new-password"
                placeholder="En az 6 karakter"
              />
              <button
                type="button"
                onClick={() => setParolaGoster(!parolaGoster)}
                aria-label={parolaGoster ? "Parolayı gizle" : "Parolayı göster"}
              >
                {parolaGoster ? "🙈" : "👁"}
              </button>
            </div>
            <Link href="/" className="bk-logo bk-kayit-logo">
              bilkie
            </Link>
          </KayitAdimi>
        )}

        {adim === 3 && (
          <KayitAdimi dugmeAktif={adSoyad.trim().length > 0} dugmeyeBas={() => setAdim(4)}>
            <label className="bk-alan-etiket">Ad-Soyad:</label>
            <input
              className="bk-alan"
              value={adSoyad}
              onChange={(e) => setAdSoyad(e.target.value)}
              autoComplete="name"
              placeholder="Adın ve soyadın"
            />
            <Link href="/" className="bk-logo bk-kayit-logo">
              bilkie
            </Link>
          </KayitAdimi>
        )}

        {adim === 4 && (
          <KayitAdimi baslik="Sınıfını seç" dugmeyeBas={() => setAdim(5)}>
            <SinifSecimi secili={sinif} sec={setSinif} />
          </KayitAdimi>
        )}

        {adim === 5 && (
          <KayitAdimi
            baslik="Avatarını Seç"
            dugmeMetni={bekliyor ? "Kaydediliyor…" : "Kayıt Ol"}
            dugmeAktif={!bekliyor}
            dugmeyeBas={kayitOl}
          >
            <AvatarSecimi secili={avatar} sec={setAvatar} />
          </KayitAdimi>
        )}

        {hata && <p className="bk-hata">{hata}</p>}

        <p className="bk-soluk bk-kayit-alt">
          Hesabın var mı? <Link href="/giris">Giriş yap</Link>
        </p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------- e-posta doğrulaması */

// Android `EmailVerificationScreen`: 4 saniyede bir sessizce giriş denenir,
// e-posta doğrulanmışsa içeri alınır, değilse oturum tekrar kapatılır.
function DogrulamaEkrani({
  eposta,
  parola,
  dogrulandi,
  geri,
}: {
  eposta: string;
  parola: string;
  dogrulandi: () => void;
  geri: () => void;
}) {
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [mesgul, setMesgul] = useState(false);
  const bittiRef = useRef(false);
  // Geri çağırma ref'te tutuluyor: bağımlılık listesine girseydi her render'da yeni
  // kimlik alıp sayacı sıfırlardı ve 4 saniyeye hiç ulaşamazdı.
  const dogrulandiRef = useRef(dogrulandi);
  dogrulandiRef.current = dogrulandi;

  useEffect(() => {
    let durdur = false;
    const zamanlayici = setInterval(async () => {
      if (durdur || bittiRef.current) return;
      try {
        const sonuc = await signInWithEmailAndPassword(auth, eposta, parola);
        if (sonuc.user.emailVerified) {
          bittiRef.current = true;
          clearInterval(zamanlayici);
          dogrulandiRef.current();
        } else {
          await signOut(auth);
        }
      } catch {
        /* ağ hatası: sıradaki turda yeniden denenir */
      }
    }, 4000);
    return () => {
      durdur = true;
      clearInterval(zamanlayici);
    };
  }, [eposta, parola]);

  async function kontrolEt() {
    setMesgul(true);
    setMesaj(null);
    try {
      const sonuc = await signInWithEmailAndPassword(auth, eposta, parola);
      await sonuc.user.reload();
      if (sonuc.user.emailVerified) {
        bittiRef.current = true;
        dogrulandi();
        return;
      }
      await signOut(auth);
      setMesaj("Mail henüz doğrulanmamış, lütfen linke tıklayın.");
    } catch {
      setMesaj("Bir hata oluştu, tekrar dene.");
    } finally {
      setMesgul(false);
    }
  }

  async function tekrarGonder() {
    setMesgul(true);
    setMesaj(null);
    try {
      const sonuc = await signInWithEmailAndPassword(auth, eposta, parola);
      await sendEmailVerification(sonuc.user);
      await signOut(auth);
      setMesaj("Doğrulama maili tekrar gönderildi.");
    } catch {
      setMesaj("Gönderilemedi, tekrar dene.");
    } finally {
      setMesgul(false);
    }
  }

  return (
    <div className="bk bk-kayit">
      <div className="bk-kayit-cerceve" style={{ textAlign: "center" }}>
        <h2 className="bk-kayit-baslik">Mailinizi Doğrulayın</h2>
        <p className="bk-soluk" style={{ fontSize: 14, lineHeight: 1.6 }}>
          <strong>{eposta}</strong> adresine bir doğrulama linki gönderdik. Linke
          tıkladıktan sonra aşağıdan devam edebilirsiniz.
        </p>
        <button className="bk-dugme tam" disabled={mesgul} onClick={kontrolEt}>
          {mesgul ? "Kontrol ediliyor…" : "Doğruladım, Devam Et"}
        </button>
        <button className="bk-dugme acik tam" disabled={mesgul} onClick={tekrarGonder}>
          Tekrar Gönder
        </button>
        {mesaj && (
          <p style={{ color: mesaj.includes("gönderildi") ? "#3ECF6A" : "#FF4D4D", fontSize: 13 }}>
            {mesaj}
          </p>
        )}
        <button type="button" className="bk-metin-dugme" onClick={geri}>
          Geri Dön
        </button>
      </div>
    </div>
  );
}
