// /konu-testi/5-sinif/matematik — o dersin konu testleri, ünite ünite gruplu.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { testAgaci, testDersBul, type Test } from "../../../lib/icerik";
import Yol from "../../../konu-anlatimi/Yol";

export function generateStaticParams() {
  return testAgaci().flatMap((s) => s.dersler.map((d) => ({ sinif: s.slug, ders: d.slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sinif: string; ders: string }>;
}): Promise<Metadata> {
  const { sinif, ders } = await params;
  const b = testDersBul(sinif, ders);
  if (!b) return {};
  return {
    title: `${b.sinif.sinif}. Sınıf ${b.ders.ad} Testleri | ${b.ders.testler.length} Konu Testi | Bilkie`,
    description: `${b.sinif.sinif}. sınıf ${b.ders.ad} konu testleri: ${b.ders.testler
      .slice(0, 6)
      .map((t) => t.ad)
      .join(", ")}. Cevaplarıyla, ücretsiz.`,
    alternates: { canonical: `/konu-testi/${b.sinif.slug}/${b.ders.slug}` },
  };
}

export default async function TestDersSayfasi({
  params,
}: {
  params: Promise<{ sinif: string; ders: string }>;
}) {
  const { sinif, ders } = await params;
  const b = testDersBul(sinif, ders);
  if (!b) notFound();

  // Üniteye göre grupla — 30+ testi düz liste hâlinde vermek okunmaz oluyor.
  const gruplar = new Map<string, Test[]>();
  for (const t of b.ders.testler) {
    const g = gruplar.get(t.unite) ?? [];
    g.push(t);
    gruplar.set(t.unite, g);
  }

  return (
    <>
      <Yol
        adimlar={[
          { ad: "Ana sayfa", yol: "/" },
          { ad: "Konu Testleri", yol: "/konu-testi" },
          { ad: `${b.sinif.sinif}. Sınıf`, yol: `/konu-testi/${b.sinif.slug}` },
          { ad: b.ders.ad },
        ]}
      />
      <h1>
        {b.sinif.sinif}. Sınıf {b.ders.ad} Testleri
      </h1>
      <p className="bk-ia-giris">
        {b.ders.testler.length} konu testi. Her testin ilk 10 sorusu cevaplarıyla açık.
      </p>

      {[...gruplar].map(([unite, testler]) => (
        <section key={unite}>
          <h2 className="bk-ia-h2">{unite}</h2>
          <ul className="bk-ia-uniteler">
            {testler.map((t) => (
              <li key={t.slug}>
                <Link href={`/konu-testi/${b.sinif.slug}/${b.ders.slug}/${t.slug}`}>
                  <span className="no">{t.sorular.length}</span>
                  <strong>{t.ad}</strong>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
