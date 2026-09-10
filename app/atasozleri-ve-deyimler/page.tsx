// /atasozleri-ve-deyimler — harf dizini.
//
// ⚠️ Her atasözüne AYRI sayfa açılmadı. 398 kaydın her biri iki cümle; tek tek
// sayfa yapılsaydı ortaya birbirinin aynı, ince sayfalardan oluşan bir yığın
// çıkardı — Google bunu "doorway" sayar ve sitenin tamamına zarar verir.
// Harf harf toplanınca her sayfa dolu ve gerçekten gezilebilir oluyor.

import type { Metadata } from "next";
import Link from "next/link";
import { harfKumeleri } from "../lib/icerik";
import Yol from "../konu-anlatimi/Yol";

export const metadata: Metadata = {
  title: "Atasözleri ve Deyimler | Anlamlarıyla | Bilkie",
  description:
    "Atasözleri ve deyimler, anlamlarıyla birlikte harf harf listelenmiş. İlkokul ve ortaokul öğrencileri için ücretsiz.",
  alternates: { canonical: "/atasozleri-ve-deyimler" },
};

export default function AtasozleriKok() {
  const harfler = harfKumeleri();
  const atasoz = harfler.reduce((t, h) => t + h.atasozleri.length, 0);
  const deyim = harfler.reduce((t, h) => t + h.deyimler.length, 0);

  return (
    <>
      <Yol adimlar={[{ ad: "Ana sayfa", yol: "/" }, { ad: "Atasözleri ve Deyimler" }]} />
      <h1>Atasözleri ve Deyimler</h1>
      <p className="bk-ia-giris">
        {atasoz} atasözü ve {deyim} deyim, anlamlarıyla birlikte. Baş harfine göre seç.
      </p>

      <ul className="bk-ia-harfler">
        {harfler.map((h) => (
          <li key={h.slug}>
            <Link href={`/atasozleri-ve-deyimler/${h.slug}`}>
              <strong>{h.harf}</strong>
              <span>{h.atasozleri.length + h.deyimler.length}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
