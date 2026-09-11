// /konu-testi — sınıf dizini.

import type { Metadata } from "next";
import Link from "next/link";
import { testAgaci } from "../lib/icerik";
import Yol from "../konu-anlatimi/Yol";

export const metadata: Metadata = {
  title: "Konu Testleri | 3-8. Sınıf Online Test Çöz | Bilkie",
  description:
    "İlkokul ve ortaokul konu testleri: 3, 4, 5, 6, 7 ve 8. sınıf Türkçe, Matematik, Fen Bilimleri, Sosyal Bilgiler ve İngilizce. Cevaplarıyla, ücretsiz.",
  alternates: { canonical: "/konu-testi" },
};

export default function KonuTestiKok() {
  const agac = testAgaci();
  const toplam = agac.reduce((t, s) => t + s.dersler.reduce((x, d) => x + d.testler.length, 0), 0);

  return (
    <>
      <Yol adimlar={[{ ad: "Ana sayfa", yol: "/" }, { ad: "Konu Testleri" }]} />
      <h1>Konu Testleri</h1>
      <p className="bk-ia-giris">
        3. sınıftan 8. sınıfa {toplam} konu testi, cevaplarıyla birlikte. Sınıfını seç,
        dersini aç, konuyu çöz.
      </p>

      <ul className="bk-ia-kartlar">
        {agac.map((s) => (
          <li key={s.slug}>
            <Link href={`/konu-testi/${s.slug}`}>
              <strong>{s.sinif}. Sınıf</strong>
              <span>{s.dersler.reduce((t, d) => t + d.testler.length, 0)} test</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
