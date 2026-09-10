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

// Yalnız GERÇEKTEN var olan sayfalar. Olmayan bir yasal belgeye bağlantı vermiyoruz.
const YASAL = [
  { ad: "Gizlilik", yol: "/gizlilik" },
  { ad: "Kullanım Şartları", yol: "/sartlar" },
  { ad: "Yardım", yol: "/yardim" },
  { ad: "Hesap Silme", yol: "/hesap-silme" },
];

export default function AltBant() {
  return (
    <footer className="bk-sayfa-alt">
      <ul className="bk-sayfa-alt-dersler">
        {DERSLER.map((d) => (
          <li key={d.ikon}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/uygulama/${d.ikon}.png`} alt="" width={30} height={30} />
            <span>{d.ad}</span>
          </li>
        ))}
      </ul>

      <div className="bk-sayfa-alt-yasal">
        {/* Marka: uygulama ikonu + bilkie.otf kelime işareti — sitenin logosu bu ikisi
            (Kabuk.tsx'te de aynı `bk-logo` fontu). İkon public'e KOPYALANDI: app/icon.png
            Next tarafından hash'li adresle servis ediliyor, /icon.png'ye güvenilmez. */}
        <Link href="/" className="bk-sayfa-alt-marka">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bilkie-ikon.png" alt="" width={26} height={26} />
          <span className="bk-logo">bilkie</span>
        </Link>
        <nav>
          {YASAL.map((y) => (
            <Link key={y.yol} href={y.yol}>
              {y.ad}
            </Link>
          ))}
        </nav>
        <p>© {new Date().getFullYear()} Bilkie. Tüm hakları saklıdır.</p>
      </div>
    </footer>
  );
}
