// Giriş / kayıt ekranlarının alt bandı: ders şeridi + yasal satır.
//
// Neden var: bu ekranlar tek bir formdan ibaretti — siteye ilk gelen kişi Bilkie'nin
// NE olduğunu görmeden parola kutusuyla karşılaşıyordu. Şerit, uygulamanın gerçek
// ders listesini (KonuTestleriScreen'in aynı ikonları ve renkleri) gösterir.
//
// Sunucu bileşeni: sayfaların kendisi "use client" ama bu bant layout'tan basıldığı
// için HTML'e sunucuda giriyor — yani bağlantılar ve metinler kaynakta duruyor.
// (Bu iki yol noindex; bandın arama değeri kök tanıtım sayfasına konunca doğar.)

import Link from "next/link";

// Ders adları/ikonları/renkleri testler ekranından birebir (bkz. testler/page.tsx).
// Rengi İKON taşır, ad nötr kalır: ders renkleri lacivert zeminde okunmuyor
// (İngilizce moru #971FB5 zemine karşı 1.6:1).
const DERSLER = [
  { ad: "Türkçe",          ikon: "abc" },
  { ad: "Matematik",       ikon: "abakus" },
  { ad: "Fen Bilimleri",   ikon: "deney" },
  { ad: "Sosyal Bilgiler", ikon: "dunya" },
  { ad: "İngilizce",       ikon: "hello" },
];

// Halka açık içerik — giriş istemez. Buraya konması hem okur için giriş kapısı,
// hem arama motoru için: bu bağlantılar sitenin HER sayfasından erişilebilir
// olduğu için tarayıcı robotu içerik ağacını tek adımda buluyor.
const ICERIK = [
  { ad: "Konu Anlatımı", yol: "/konu-anlatimi" },
  { ad: "Atasözleri ve Deyimler", yol: "/atasozleri-ve-deyimler" },
];

// Yalnız GERÇEKTEN var olan sayfalar. Olmayan bir yasal belgeye bağlantı vermiyoruz.
const YASAL = [
  { ad: "Gizlilik", yol: "/gizlilik" },
  { ad: "Kullanım Şartları", yol: "/sartlar" },
  { ad: "Yardım", yol: "/yardim" },
  { ad: "Hesap Silme", yol: "/hesap-silme" },
];

/**
 * @param dersler Ders şeridini göster. Giriş/kayıt ekranlarında Bilkie'nin ne
 *   olduğunu anlatan tek şey o. Tanıtım ve içerik sayfalarının kendi şeritleri
 *   var; orada tekrara düştüğü için kapalı.
 */
export default function AltBant({ dersler = true }: { dersler?: boolean }) {
  return (
    <footer className="bk-sayfa-alt">
      {dersler && (
        <ul className="bk-sayfa-alt-dersler">
          {DERSLER.map((d) => (
            <li key={d.ikon}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/uygulama/${d.ikon}.png`} alt="" width={30} height={30} />
              <span>{d.ad}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Marka · bağlantılar · telif TEK satırda. Üçü ayrı sıralara bölününce
          bant dört katlı bir yığına dönüşüyordu. */}
      <div className="bk-sayfa-alt-yasal">
        <Link href="/" className="bk-sayfa-alt-marka" aria-label="Bilkie">
          {/* İkon public'e KOPYALANDI: app/icon.png'yi Next hash'li adresle
              servis ediyor, /icon.png'ye güvenilmez. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bilkie-ikon.png" alt="" width={24} height={24} />
          <span className="bk-logo">bilkie</span>
        </Link>

        <nav>
          {ICERIK.map((i) => (
            <Link key={i.yol} href={i.yol} className="one">
              {i.ad}
            </Link>
          ))}
          {YASAL.map((y) => (
            <Link key={y.yol} href={y.yol}>
              {y.ad}
            </Link>
          ))}
        </nav>

        <p>© {new Date().getFullYear()} Bilkie</p>
      </div>
    </footer>
  );
}
