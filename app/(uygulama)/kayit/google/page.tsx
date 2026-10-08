"use client";

// Google ile gelen YENİ kullanıcının kurulumu — Android `GoogleOnboardingFlow`'un karşılığı.
// Üç adım: onay → sınıf → avatar. Kayıt son adımda tamamlanır; o ana kadar
// veritabanında bu kullanıcıya ait HİÇBİR kayıt yoktur. Yarıda çıkılırsa
// geriye kalan boş Auth kaydı da silinir ("çıkarsan kayıt oluşmaz").

import CikisOnayi from "../../CikisOnayi";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../../../lib/firebase";
import { hatirlananlariUnut } from "../../../lib/canli";
import { onbellegiBosalt } from "../../../lib/onbellek";
import { useOturum } from "../../../lib/oturum";
import { profilOku } from "../../../lib/veri";
import UcNokta from "../../UcNokta";
import {
  googleKaydiniIptalEt,
  googleKaydiniTamamla,
  kayitHataMetni,
  URL_GIZLILIK,
  URL_SARTLAR,
} from "../../../lib/kayit";
import {
  AvatarSecimi,
  KayitAdimi,
  KayitBasligi,
  OnaySatiri,
  SinifSecimi,
} from "../parcalar";

const TOPLAM_ADIM = 3;

export default function GoogleKurulumSayfasi() {
  const router = useRouter();
  const { yukleniyor, kullanici, profiliYenile } = useOturum();

  const [adim, setAdim] = useState(1);
  const [sartlar, setSartlar] = useState(false);
  const [gizlilik, setGizlilik] = useState(false);
  const [sinif, setSinif] = useState(3);
  const [avatar, setAvatar] = useState("profil0");
  const [kaydediyor, setKaydediyor] = useState(false);
  const [cikisSorusu, setCikisSorusu] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [kontrolEdiliyor, setKontrolEdiliyor] = useState(true);

  // Oturum yoksa burada işimiz yok: kurulum ancak Google girişinden sonra anlamlı.
  //
  // ⚠️ Ayrıca TAZE bir profil okuması yapılıyor: Kabuk'un bekçisi profil okunamadığında
  // (geçici ağ hatası) da buraya yönlendiriyor. Kurulumu olduğu gibi gösterirsek gerçek
  // bir kullanıcı "Başla"ya bastığında sınıfı ve avatarı varsayılanlarla EZİLİR.
  // Profil gerçekten varsa kuruluma hiç girilmez.
  useEffect(() => {
    if (yukleniyor) return;
    if (!kullanici) { router.replace("/giris"); return; }
    let iptal = false;
    profilOku(kullanici.uid)
      .then((p) => {
        if (iptal) return;
        if (p?.kayitTamam) router.replace("/");   // yarım profil (createdAt yok) kurulumu tamamlar
        else setKontrolEdiliyor(false);
      })
      .catch(() => {
        // Okuma başarısız: kurulumu AÇMA. Var olan profili ezme riski, kurulumu
        // ertelemekten daha ağır.
        if (!iptal) {
          setHata("Hesabın kontrol edilemedi. Bağlantını kontrol edip sayfayı yenile.");
        }
      });
    return () => { iptal = true; };
  }, [yukleniyor, kullanici, router]);

  // Kayıt sayfasında onay verilip gelindiyse (?onay=1) onay adımı atlanır — iki kez sorulmasın (8 Eki).
  // Giriş sayfasından gelen yeni kullanıcı hiç onay vermedi → ona burada sorulur. Onay kaydı kurulum
  // tamamlanırken yazılır (googleKaydiniTamamla). Profil kontrolü sürerken yükleme gösterildiği için
  // 1. adım hiç görünmez.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("onay") === "1") {
      setSartlar(true);
      setGizlilik(true);
      setAdim((a) => (a === 1 ? 2 : a));
    }
  }, []);

  const onayVerildi = sartlar && gizlilik;

  async function iptalEt() {
    setKaydediyor(true);
    try {
      if (kullanici) await googleKaydiniIptalEt(kullanici);
    } catch {
      // Silinemezse en azından oturumu kapat; Android da aynısını yapıyor.
      try {
        await signOut(auth);
      } catch {
        /* yoksay */
      }
    } finally {
      setKaydediyor(false);
      router.replace("/giris");
    }
  }

  async function basla() {
    if (!kullanici) return;
    setHata(null);
    setKaydediyor(true);
    try {
      await googleKaydiniTamamla(kullanici, sinif, avatar);
      hatirlananlariUnut();
      onbellegiBosalt();
      await profiliYenile();
      router.replace("/");
    } catch (err) {
      setHata(kayitHataMetni(err));
      setKaydediyor(false);
    }
  }

  if (yukleniyor || !kullanici || kontrolEdiliyor) {
    return (
      <div className="bk bk-kayit">
        <div className="bk-kayit-cerceve">
          {hata ? <p className="bk-soluk">{hata}</p> : <UcNokta style={{ minHeight: "50vh" }} />}
        </div>
      </div>
    );
  }

  return (
    <div className="bk bk-kayit">
      <div className="bk-kayit-cerceve">
        <KayitBasligi
          adim={adim}
          toplam={TOPLAM_ADIM}
          geri={() => (adim > 1 ? setAdim(adim - 1) : setCikisSorusu(true))}
        />

        {adim === 1 && (
          <KayitAdimi
            baslik="Başlamadan önce"
            dugmeAktif={onayVerildi}
            dugmeyeBas={() => setAdim(2)}
          >
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
          <KayitAdimi baslik="Sınıfını seç" dugmeyeBas={() => setAdim(3)}>
            <SinifSecimi secili={sinif} sec={setSinif} />
          </KayitAdimi>
        )}

        {adim === 3 && (
          <KayitAdimi
            baslik="Avatarını Seç"
            dugmeMetni={kaydediyor ? "Kaydediliyor…" : "Başla"}
            dugmeAktif={!kaydediyor}
            dugmeyeBas={basla}
          >
            <AvatarSecimi secili={avatar} sec={setAvatar} />
          </KayitAdimi>
        )}

        {hata && <p className="bk-hata">{hata}</p>}
      </div>

      {cikisSorusu && (
        <CikisOnayi
          mesaj="Şimdi çıkarsan kaydın oluşmayacak. Sınıfını ve avatarını seçmeden kayıt tamamlanmıyor."
          onVazgec={() => setCikisSorusu(false)}
          onCik={() => { if (!kaydediyor) void iptalEt(); }}
        />
      )}
    </div>
  );
}
