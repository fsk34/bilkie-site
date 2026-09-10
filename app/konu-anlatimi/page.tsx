// /konu-anlatimi — sınıf dizini. Tarama derinliğini sığ tutan ilk hub.

import type { Metadata } from "next";
import Link from "next/link";
import { icerikAgaci } from "../lib/icerik";
import Yol from "./Yol";

export const metadata: Metadata = {
  title: "Konu Anlatımı | 3-8. Sınıf Tüm Dersler | Bilkie",
  description:
    "İlkokul ve ortaokul konu anlatımları: 3, 4, 5, 6, 7 ve 8. sınıf Türkçe, Matematik, Fen Bilimleri, Sosyal Bilgiler ve İngilizce üniteleri.",
  alternates: { canonical: "/konu-anlatimi" },
};

export default function KonuAnlatimiKok() {
  const agac = icerikAgaci();
  const toplamUnite = agac.reduce((t, s) => t + s.dersler.reduce((x, d) => x + d.uniteler.length, 0), 0);

  return (
    <>
      <Yol adimlar={[{ ad: "Ana sayfa", yol: "/" }, { ad: "Konu Anlatımı" }]} />
      <h1>Konu Anlatımı</h1>
      <p className="bk-ia-giris">
        İlkokul ve ortaokul için {toplamUnite} ünitelik konu anlatımı. Sınıfını seç, dersini
        aç, konuyu oku — hepsi ücretsiz.
      </p>

      <ul className="bk-ia-kartlar">
        {agac.map((s) => (
          <li key={s.slug}>
            <Link href={`/konu-anlatimi/${s.slug}`}>
              <strong>{s.sinif}. Sınıf</strong>
              <span>{s.dersler.map((d) => d.ad).join(" · ")}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
