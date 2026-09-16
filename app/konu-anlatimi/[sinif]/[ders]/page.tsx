// /konu-anlatimi/5-sinif/matematik — o dersin üniteleri.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { dersBul, icerikAgaci } from "../../../lib/icerik";
import Yol from "../../Yol";

export function generateStaticParams() {
  return icerikAgaci().flatMap((s) => s.dersler.map((d) => ({ sinif: s.slug, ders: d.slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sinif: string; ders: string }>;
}): Promise<Metadata> {
  const { sinif, ders } = await params;
  const b = dersBul(sinif, ders);
  if (!b) return {};
  return {
    title: `${b.sinif.sinif}. Sınıf ${b.ders.ad} Konu Anlatımı | Bilkie`,
    description: `${b.sinif.sinif}. sınıf ${b.ders.ad} dersinin ${b.ders.uniteler.length} ünitesi: ${b.ders.uniteler
      .slice(0, 5)
      .map((u) => u.baslik)
      .join(", ")}.`,
    alternates: { canonical: `/konu-anlatimi/${b.sinif.slug}/${b.ders.slug}` },
  };
}

export default async function DersSayfasi({
  params,
}: {
  params: Promise<{ sinif: string; ders: string }>;
}) {
  const { sinif, ders } = await params;
  const b = dersBul(sinif, ders);
  if (!b) notFound();

  return (
    <>
      <Yol
        adimlar={[
          { ad: "Ana sayfa", yol: "/" },
          { ad: "Konu Anlatımı", yol: "/konu-anlatimi" },
          { ad: `${b.sinif.sinif}. Sınıf`, yol: `/konu-anlatimi/${b.sinif.slug}` },
          { ad: b.ders.ad },
        ]}
      />
      <h1>
        {b.sinif.sinif}. Sınıf {b.ders.ad} Konu Anlatımı
      </h1>
      <p className="bk-ia-giris">
        {b.sinif.sinif}. sınıf {b.ders.ad} dersi {b.ders.uniteler.length} üniteden oluşuyor.
        Üniteyi seç, konu anlatımını oku; testi ve yazılı hazırlığı Bilkie uygulamasında.
      </p>

      {/* Her ünite kendi sayfasına gider — defterin yarısı orada okunuyor
          (16 Eyl 2026'ya kadar bağlantısızdı; bkz. [unite]/page.tsx). */}
      <ol className="bk-ia-uniteler">
        {b.ders.uniteler.map((u, i) => (
          <li key={u.slug}>
            <Link href={`/konu-anlatimi/${b.sinif.slug}/${b.ders.slug}/${u.slug}`}>
              <span className="no">{i + 1}</span>
              <strong>{u.baslik}</strong>
            </Link>
          </li>
        ))}
      </ol>

      <aside className="bk-ia-cagri">
        <strong>Defterlerin tamamı Bilkie&apos;de</strong>
        <p>
          {b.ders.ad} ünitelerini oku, testleri çöz, seri yap, ligde yüksel. Ücretsiz.
        </p>
        <Link className="bk-dugme yesil" href="/kayit">
          Haydi Başlayalım
        </Link>
      </aside>
    </>
  );
}
