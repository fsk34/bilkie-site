// /konu-testi/5-sinif — dersler.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { testAgaci, testSinifBul } from "../../lib/icerik";
import Yol from "../../konu-anlatimi/Yol";

export function generateStaticParams() {
  return testAgaci().map((s) => ({ sinif: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sinif: string }>;
}): Promise<Metadata> {
  const { sinif } = await params;
  const s = testSinifBul(sinif);
  if (!s) return {};
  const n = s.dersler.reduce((t, d) => t + d.testler.length, 0);
  return {
    title: `${s.sinif}. Sınıf Konu Testleri | ${n} Test, Cevaplı | Bilkie`,
    description: `${s.sinif}. sınıf konu testleri: ${s.dersler.map((d) => d.ad).join(", ")}. Cevaplarıyla, ücretsiz.`,
    alternates: { canonical: `/konu-testi/${s.slug}` },
  };
}

export default async function TestSinifSayfasi({ params }: { params: Promise<{ sinif: string }> }) {
  const { sinif } = await params;
  const s = testSinifBul(sinif);
  if (!s) notFound();

  return (
    <>
      <Yol
        adimlar={[
          { ad: "Ana sayfa", yol: "/" },
          { ad: "Konu Testleri", yol: "/konu-testi" },
          { ad: `${s.sinif}. Sınıf` },
        ]}
      />
      <h1>{s.sinif}. Sınıf Konu Testleri</h1>
      <p className="bk-ia-giris">Bir ders seç, konu testlerini gör.</p>

      <ul className="bk-ia-kartlar">
        {s.dersler.map((d) => (
          <li key={d.slug}>
            <Link href={`/konu-testi/${s.slug}/${d.slug}`}>
              <strong>{d.ad}</strong>
              <span>{d.testler.length} test</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
