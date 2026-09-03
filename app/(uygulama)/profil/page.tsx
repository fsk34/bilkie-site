"use client";

// Profil — uygulamadaki ProfileScreen'in web karşılığı:
// avatar kartı, ad + kullanıcı adı + sınıf hapı, lig/seri/puan paneli.
// Sınıf hapı TIKLANABİLİR: sınıf değişince uygulamanın tamamı (ders/ünite/konu/XP/lig/
// istatistik) yeni sınıfa geçer. Avatar değiştirme hâlâ mobilde.

import Link from "next/link";
import { useState } from "react";
import Kabuk from "../Kabuk";
import { useOturum } from "../../lib/oturum";
import { sinifDegistir } from "../../lib/profilYaz";
import { SINIFLAR } from "../../lib/kayit";
import { useBasarimlar, useRozetler, useUstBilgi } from "../../lib/canliVeri";
import { ligBul } from "../../lib/veri";
import { AY_ROZETLERI, BASARIMLAR, sonrakiEsik } from "../basarimlar/basarimlar";
import BasarimSatiri from "../basarimlar/BasarimSatiri";

const LIG_ADI: Record<string, string> = {
  baslangic: "BAŞLANGIÇ", gelisim: "GELİŞİM", ustalik: "USTALIK",
  sampiyonlar: "ŞAMPİYONLAR", efsaneler: "EFSANELER", zirve: "ZİRVE",
};

export default function ProfilSayfasi() {
  return (
    <Kabuk>
      <Icerik />
    </Kabuk>
  );
}

/** Sıradaki düzeye en yakın üç başarım. Kişisel rekorlar (eşiksiz) burada yer almaz —
    onların "tamamlanma" oranı yok, sayının kendisi rekordur. */
function enYakinUcu(sayilar: Record<string, number>) {
  return BASARIMLAR.filter((b) => b.esikler.length > 0)
    .map((b) => {
      const deger = sayilar[b.id] ?? 0;
      const esik = sonrakiEsik(b, deger);
      return { b, oran: esik > 0 ? deger / esik : 0 };
    })
    .sort((x, y) => y.oran - x.oran)
    .slice(0, 3)
    .map((x) => x.b);
}

function Icerik() {
  const { kullanici, profil, sinif, profiliYenile, cikisYap } = useOturum();
  const [sinifAcik, setSinifAcik] = useState(false);
  const [kaydediyor, setKaydediyor] = useState(false);
  const [sinifHatasi, setSinifHatasi] = useState<string | null>(null);
  // Seri / puan CANLI (sağ rayla aynı kaynak, ikinci okuma yok).
  // Başarımlar ve rozetler kasten açılan detay → her açılışta taze okunuyor.
  const ust = useUstBilgi(sinif);
  // Başarım ve rozetler de CANLI: Başarımlar/Rozetler sayfalarıyla aynı abonelikleri
  // paylaşıyor, ekranlar arası gidip gelmek yeniden okuma yapmıyor.
  const basarimlar = useBasarimlar(sinif) ?? {};
  const rozetler = useRozetler() ?? [];

  if (!kullanici) {
    return (
      <>
        <h1 style={{ fontSize: 24, marginBottom: 10 }}>Profil</h1>
        <div className="bk-kart">
          <p className="bk-soluk" style={{ fontSize: 14, marginBottom: 14 }}>
            Profilini görmek için giriş yapman gerekiyor.
          </p>
          <Link className="bk-dugme" href="/giris">Giriş yap</Link>
        </div>
      </>
    );
  }

  const avatar = profil?.avatar || "profil0";
  const lig = ligBul(ust?.xp ?? 0);

  return (
    <>
      <div className="bk-avatar-kart">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/uygulama/avatar/${avatar}.png`} alt="" />
      </div>

      <div className="bk-profil-ad">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="isim">{profil?.adSoyad || "Öğrenci"}</div>
          <div className="kadi">{profil?.kullaniciAdi ? `@${profil.kullaniciAdi}` : profil?.eposta}</div>
        </div>
        <button
          type="button"
          className="bk-sinif-hap"
          onClick={() => { setSinifHatasi(null); setSinifAcik(true); }}
          title="Sınıfını değiştir"
        >
          {sinif}. SINIF <span aria-hidden>▾</span>
        </button>
      </div>

      <div className="bk-profil-panel">
        <div className="bk-profil-lig">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <span className="simge gorsel"><img src={`/uygulama/lig/${lig.key}.png`} alt="" /></span>
          <div>
            <div className="ad">{LIG_ADI[lig.key] ?? "BAŞLANGIÇ"}</div>
            <div className="alt">Mevcut Lig</div>
          </div>
        </div>

        <div className="bk-profil-ayrac" />

        <div className="bk-profil-hucreler">
          <div className="bk-profil-hucre">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <span className="simge"><img src="/uygulama/seriicon.svg" alt="" /></span>
            <div>
              <div className="deger">{ust ? ust.seri : "—"}</div>
              <div className="etiket">Günlük Seri</div>
            </div>
          </div>
          <div className="bk-profil-dikey" />
          <div className="bk-profil-hucre">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <span className="simge"><img src="/uygulama/puanicon.svg" alt="" /></span>
            <div>
              <div className="deger">{ust ? ust.xp : "—"}</div>
              <div className="etiket">Toplam Puan</div>
            </div>
          </div>
        </div>
      </div>

      {/* Başarılar — tamamlanmaya en yakın üçü (Duolingo'daki önizleme kartı) */}
      <div style={{ marginBottom: 18 }}>
        <div className="bk-kart-ust">
          <h3>Başarılar</h3>
          <Link href="/basarimlar">TÜMÜNÜ GÖSTER</Link>
        </div>
        <div className="bk-basarim-liste">
          {enYakinUcu(basarimlar).map((b) => (
            <BasarimSatiri key={b.id} b={b} deger={basarimlar[b.id] ?? 0} />
          ))}
        </div>
      </div>

      {/* Rozetler */}
      <div style={{ marginBottom: 18 }}>
        <div className="bk-kart-ust">
          <h3>Rozetler</h3>
          <Link href="/rozetler">TÜMÜNÜ GÖSTER</Link>
        </div>
        <div className="bk-kart">
          <div className="bk-rozet-izgara">
            {AY_ROZETLERI.map((a) => (
              <div className="bk-rozet" key={a.i} data-kazanildi={rozetler.includes(a.i)}>
                <div className="kutu">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/uygulama/rozet/${a.gorsel}.svg`} alt="" />
                </div>
                <span className="ad">{a.ad}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bk-kart">
        <div className="bk-kart-ust">
          <h3>Hesap</h3>
        </div>
        <p className="bk-soluk" style={{ fontSize: 14, marginBottom: 14 }}>
          {profil?.eposta ? `${profil.eposta} · ` : ""}
          Sınıfını yukarıdaki sınıf kutusundan, kullanıcı adını ve avatarını
          Hesap ekranından değiştirebilirsin.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="bk-dugme" href="/profil/duzenle">Hesap</Link>
          <button className="bk-dugme kirmizi" onClick={() => cikisYap()}>Çıkış yap</button>
          <Link className="bk-dugme acik" href="/seri">Serini gör</Link>
        </div>
      </div>

      {sinifAcik && (
        <div className="bk-ortu" onClick={() => !kaydediyor && setSinifAcik(false)}>
          <div className="bk-kart bk-soru-kutu" onClick={(e) => e.stopPropagation()}>
            <h3>Sınıfını seç</h3>
            <p className="bk-soluk" style={{ fontSize: 13, marginBottom: 12 }}>
              Dersler, konu testleri, defterler ve ligin seçtiğin sınıfa göre değişir.
              Eski sınıfındaki ilerlemen silinmez; o sınıfa dönersen yerinde durur.
            </p>
            <div className="bk-secim-izgara sinif">
              {SINIFLAR.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="bk-secim-kutu"
                  data-secili={s === sinif}
                  disabled={kaydediyor}
                  onClick={async () => {
                    if (!kullanici || kaydediyor || s === sinif) {
                      if (s === sinif) setSinifAcik(false);
                      return;
                    }
                    setKaydediyor(true);
                    setSinifHatasi(null);
                    try {
                      await sinifDegistir({
                        uid: kullanici.uid,
                        eskiSinif: sinif,
                        yeniSinif: s,
                        // Lig satırında görünen ad: uygulamadaki gibi kullanıcı adı öncelikli
                        ad: profil?.kullaniciAdi || profil?.adSoyad || "Sen",
                        avatar: profil?.avatar || "profil0",
                      });
                      // Profil bağlamı tazelenince tüm ekranlar yeni sınıfa geçer
                      await profiliYenile();
                      setSinifAcik(false);
                    } catch {
                      setSinifHatasi("Sınıf değiştirilemedi. Bağlantını kontrol edip tekrar dene.");
                    } finally {
                      setKaydediyor(false);
                    }
                  }}
                >
                  {s}. Sınıf
                </button>
              ))}
            </div>
            {sinifHatasi && <p className="bk-hata" style={{ marginTop: 12 }}>{sinifHatasi}</p>}
            <button
              className="bk-dugme acik tam"
              style={{ marginTop: 14 }}
              disabled={kaydediyor}
              onClick={() => setSinifAcik(false)}
            >
              {kaydediyor ? "Kaydediliyor…" : "Vazgeç"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
