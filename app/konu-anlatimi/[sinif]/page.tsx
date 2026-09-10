// /konu-anlatimi/5-sinif — o sınıfın dersleri.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { icerikAgaci, sinifBul } from "../../lib/icerik";
import Yol from "../Yol";

export function generateStaticParams() {
  return icerikAgaci().map((s) => ({ sinif: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sinif: string }>;
}): Promise<Metadata> {
  const { sinif } = await params;
  const s = sinifBul(sinif);
  if (!s) return {};
  const dersler = s.dersler.map((d) => d.ad).join(", ");
  return {
    title: `${s.sinif}. Sınıf Konu Anlatımı | Tüm Dersler | Bilkie`,
    description: `${s.sinif}. sınıf konu anlatımları: ${dersler}. Ünite ünite, ücretsiz.`,
    alternates: { canonical: `/konu-anlatimi/${s.slug}` },
  };
}

export default async function SinifSayfasi({ params }: { params: Promise<{ sinif: string }> }) {
  const { sinif } = await params;
  const s = sinifBul(sinif);
  if (!s) notFound();

  return (
    <>
      <Yol
        adimlar={[
          { ad: "Ana sayfa", yol: "/" },
          { ad: "Konu Anlatımı", yol: "/konu-anlatimi" },
          { ad: `${s.sinif}. Sınıf` },
        ]}
      />
      <h1>{s.sinif}. Sınıf Konu Anlatımı</h1>
      <p className="bk-ia-giris">
        {s.sinif}. sınıf derslerinin ünite ünite konu anlatımı. Bir ders seç, üniteleri gör.
      </p>

      <ul className="bk-ia-kartlar">
        {s.dersler.map((d) => (
          <li key={d.slug}>
            <Link href={`/konu-anlatimi/${s.slug}/${d.slug}`}>
              <strong>{d.ad}</strong>
              <span>{d.uniteler.length} ünite</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
