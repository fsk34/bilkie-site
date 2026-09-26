// Kökün TANITIM yüzü: giriş yapmamış ziyaretçinin gördüğü kapı.
//
// Neden var: bilkie.com'un kökü uygulamanın kendisi (3 Eyl 2026). Giriş yapmamış
// biri gelince doğrudan /giris'e atılıyordu — yani siteye ilk gelen kişi Bilkie'nin
// ne olduğunu görmeden parola kutusuyla karşılaşıyor, arama motoru da kökte
// indeksleyecek hiçbir metin bulamıyordu.
//
// SUNUCU BİLEŞENİ: metin ve bağlantılar HTML'e sunucuda giriyor, JavaScript
// çalışmadan da okunuyor.

import Link from "next/link";
import AltBant from "./AltBant";
import { icerikAgaci } from "../lib/icerik";

// Uygulamanın bölümleri: ana ekranın üç büyük kartı (AnaEkran.tsx) + Oyunlar
// (Kabuk.tsx menüsündeki adıyla; beş oyunun beşi de web'de oynanıyor).
const BOLUMLER: { ad: string; ikon: string; yol?: string }[] = [
  // Konu testlerinin ilk 10 sorusu, defterlerin yarısı halka açık; gerisi giriş istiyor.
  { ad: "Konu Testleri", ikon: "test.png", yol: "/konu-testi" },
  { ad: "Konu Defterleri", ikon: "defter.png", yol: "/konu-anlatimi" },
  { ad: "Yazılıya Hazırlık", ikon: "yazili.png" },
  { ad: "Oyunlar", ikon: "oyunlar.svg" },
  { ad: "Atasözleri ve Deyimler", ikon: "atasozu.png", yol: "/atasozleri-ve-deyimler" },
];

export default function Tanitim() {
  // Halka açık içeriğin sayıları — elle yazılmaz, veriden sayılır; içerik büyüyünce
  // kapı da kendini günceller.
  const agac = icerikAgaci();

  const yapisalVeri = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://www.bilkie.com/#org",
        name: "Bilkie",
        url: "https://www.bilkie.com",
        logo: "https://www.bilkie.com/bilkie-ikon.png",
      },
      {
        "@type": "WebSite",
        url: "https://www.bilkie.com",
        name: "Bilkie",
        inLanguage: "tr",
        publisher: { "@id": "https://www.bilkie.com/#org" },
      },
    ],
  };

  // `bk` sınıfı şart: renk ve font değişkenleri orada tanımlı, onsuz
  // var(--zemin) / var(--soluk) gibi değerler boşa düşer.
  return (
    <main className="bk bk-tanitim">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(yapisalVeri) }}
      />
      <div className="bk-tanitim-orta">
        <header className="bk-tanitim-ust">
          <Link href="/" className="bk-tanitim-marka" aria-label="Bilkie">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bilkie-ikon.png" alt="" width={72} height={72} />
            <span className="bk-logo">bilkie</span>
          </Link>
          {/* Markanın kime seslendiği. Bağlantının DIŞINDA: tıklanacak bir şey değil.
              "İlkokul"/"ortaokul" sayfada başka hiçbir yerde geçmiyordu. */}
          <p className="bk-tanitim-etiket">İlkokul &amp; Ortaokul</p>
        </header>

        <div className="bk-tanitim-yazi">
          <h1>Ders çalış, eğlen ve öğren</h1>
          <p>
            3. sınıftan 8. sınıfa Türkçe, Matematik, Fen Bilimleri, Sosyal Bilgiler ve
            İngilizce; konu testleri, konu defterleri, yazılıya hazırlık ve oyunlar —
            hepsi tek uygulamada.
          </p>

          <Link className="bk-dugme yesil tam" href="/kayit">
            Haydi Başlayalım
          </Link>
          <Link className="bk-tanitim-giris" href="/giris">
            Zaten hesabım var
          </Link>

        </div>

        {/* Uygulamanın üç ana bölümü — metin bloğunun DIŞINDA: 460px sınırı
            içinde kalınca üçü tek satıra sığmayıp ikiye bölünüyordu.
            Bağlantı DEĞİL: /testler, /defterler ve /yazili giriş istiyor,
            girişsiz gelen (ve arama motoru) oradan /giris'e atılırdı.
            İkonlar ana ekranın kendi görselleri. */}
        <ul className="bk-tanitim-neler">
          {BOLUMLER.map((b) => (
            <li key={b.ikon}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/uygulama/${b.ikon}`} alt="" width={34} height={34} />
              {b.yol ? <Link href={b.yol}>{b.ad}</Link> : <span>{b.ad}</span>}
            </li>
          ))}
        </ul>
      </div>

      {/* Kapının ALTI: halka açık içerik. İlk ekran sade kapı olarak kalıyor (kullanıcı
          kararı, 10 Eyl); arama motorunun ve kaydırıp bakanın gördüğü içerik burada.
          Sınıf bağlantıları konu anlatımı hub'ına gider; Konu Anlatımı / Konu Testleri /
          Atasözleri bağlantıları üstteki bölüm satırında (26 Eyl: alttaki tekrar kartlar kalktı). */}
      <section className="bk-tanitim-icerik" aria-label="Bilkie içerikleri">
        <h2>Sınıfını seç</h2>
        <ul className="bk-tanitim-siniflar">
          {agac.map((s) => (
            <li key={s.slug}>
              <Link href={`/konu-anlatimi/${s.slug}`}>{s.sinif}. Sınıf</Link>
            </li>
          ))}
        </ul>
      </section>

      <AltBant dersler={false} />
    </main>
  );
}
