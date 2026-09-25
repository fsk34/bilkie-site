"use client";

// Görevler — uygulamadaki TasksScreen'in web karşılığı:
// aylık banner (ay adı + kalan gün) + Günlük / Haftalık / Aylık bölümleri.
// Görev ilerlemesi web'den de YAZILIYOR (bkz. lib/gorevYaz.ts); bu ekran okuyor.

import Link from "next/link";
import Kabuk from "../Kabuk";
import UcNokta from "../UcNokta";
import { useOturum } from "../../lib/oturum";
import { useGorevDurumu, type GorevDurumu } from "../../lib/canliVeri";
import { ayaKalanGun } from "../../lib/veri";
import { gunAnahtari } from "../../lib/tarih";
import { ayAdi, ayBanner, ayVurgu, ayYaziRengi } from "../../lib/ayGorsel";

// Ay adı/banner/renk artık `lib/ayGorsel` içinde, 12 ay için — Android `AyGorsel.kt` ile
// aynı kaynak. Buradaki altı elemanlı diziler Temmuz–Aralık'ı sessizce Ocak'a düşürüyordu
// (ve Ocak'ın rengi de yanlıştı, Şubat'ın pembesiydi).

export default function GorevlerSayfasi() {
  return (
    <Kabuk>
      <Icerik />
    </Kabuk>
  );
}

function Icerik() {
  const { kullanici } = useOturum();
  // Katalog önbellekten, ilerleme canlı — mobilde görev tamamlanınca burada da güncellenir.
  const uid = kullanici?.uid ?? null;
  const gunluk = useGorevDurumu("gunluk");
  const haftalik = useGorevDurumu("haftalik");
  const aylik = useGorevDurumu("aylik");

  const ayIndeks = Number(gunAnahtari().slice(5, 7)) - 1;   // İstanbul takvimi (görev ayı)
  const banner = ayBanner(ayIndeks);          // Temmuz/Ağustos'ta null — görsel yok
  const renk = ayVurgu(ayIndeks);
  const yaziRengi = ayYaziRengi(ayIndeks);

  if (!kullanici) {
    return (
      <>
        <h1 style={{ fontSize: 24, marginBottom: 10 }}>Görevler</h1>
        <div className="bk-kart">
          <p className="bk-soluk" style={{ fontSize: 14, marginBottom: 14 }}>
            Görevlerini görmek için giriş yapman gerekiyor.
          </p>
          <Link className="bk-dugme" href="/giris">Giriş yap</Link>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Görseli olmayan ayda (Temmuz/Ağustos) hiç <img> çizilmez; ekranın kendi
          koyu zemini kalır. Eskiden bu durumda Ocak banner'ı basılıyordu. */}
      <div className="bk-gorev-banner" style={{ color: yaziRengi }}>
        {banner && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={banner} alt="" />
        )}
        {/* Uygulamadaki sıra: ay adı → "Aylık görevler" → "N GÜN", üçü de sola hizalı alt alta */}
        <div className="yazi">
          <div className="ay">{ayAdi(ayIndeks)}</div>
          <div className="alt">Aylık görevler</div>
          <div className="kalan">{ayaKalanGun()} GÜN</div>
        </div>
      </div>

      <Bolum ad="Günlük Görevler" gorevler={gunluk} renk={renk} />
      <Bolum ad="Haftalık Görevler" gorevler={haftalik} renk={renk} />
      <Bolum ad="Aylık Görevler" gorevler={aylik} renk={renk} />

    </>
  );
}

function Bolum({ ad, gorevler: durum, renk }: { ad: string; gorevler: GorevDurumu; renk: string }) {
  const gorevler = durum.gorevler;
  return (
    <>
      <h2 className="bk-gorev-bolum">{ad}</h2>
      <div className="bk-gorev-kutu">
        {gorevler == null && !durum.hata && (
          <div className="bk-gorev-satir"><UcNokta /></div>
        )}
        {/* Okunamadı (çevrimdışı): "görev yok" DEME — Android TasksScreen 24 Eyl */}
        {durum.hata && (
          <div className="bk-gorev-satir">
            <span className="bk-soluk" style={{ fontSize: 14 }}>Görevler yüklenemedi.</span>
            <button type="button" className="bk-dugme acik" style={{ marginTop: 8 }} onClick={durum.tekrarDene}>Tekrar dene</button>
          </div>
        )}
        {gorevler != null && gorevler.length === 0 && (
          <div className="bk-gorev-satir">
            <span className="bk-soluk" style={{ fontSize: 14 }}>Bu dönem için görev bulunmuyor.</span>
          </div>
        )}
        {gorevler?.map((g) => {
          const bitti = g.ilerleme >= g.hedef;
          const oran = Math.min(100, (g.ilerleme / Math.max(1, g.hedef)) * 100);
          return (
            <div className="bk-gorev-satir" key={g.id} data-bitti={bitti}>
              <div className="ust">
                <span className="ad">{g.baslik}</span>
                {g.xp > 0 && <span className="xp">+{g.xp}</span>}
                <span className="sayi">{g.ilerleme}/{g.hedef}</span>
              </div>
              <div className="bk-gorev-cubuk">
                {/* Android TaskCardSingle: biten görev de AYIN RENGİYLE dolu kalır (yeşil/üstü çizili yok) */}
                <i style={{ width: `${oran}%`, background: renk }} />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
