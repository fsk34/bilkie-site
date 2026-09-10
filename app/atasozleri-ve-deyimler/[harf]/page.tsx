// /atasozleri-ve-deyimler/a — o harfle başlayan atasözleri ve deyimler.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { harfBul, harfKumeleri, type Soz } from "../../lib/icerik";
import Yol from "../../konu-anlatimi/Yol";

export function generateStaticParams() {
  return harfKumeleri().map((h) => ({ harf: h.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ harf: string }>;
}): Promise<Metadata> {
  const { harf } = await params;
  const h = harfBul(harf);
  if (!h) return {};
  return {
    title: `${h.harf} Harfiyle Başlayan Atasözleri ve Deyimler | Bilkie`,
    description: `${h.harf} harfiyle başlayan ${h.atasozleri.length} atasözü ve ${h.deyimler.length} deyim, anlamlarıyla.`,
    alternates: { canonical: `/atasozleri-ve-deyimler/${h.slug}` },
  };
}

export default async function HarfSayfasi({ params }: { params: Promise<{ harf: string }> }) {
  const { harf } = await params;
  const h = harfBul(harf);
  if (!h) notFound();

  // DefinedTermSet: sözlük benzeri içeriğin makine karşılığı.
  const yapisalVeri = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: `${h.harf} harfiyle başlayan atasözleri ve deyimler`,
    inLanguage: "tr",
    hasDefinedTerm: [...h.atasozleri, ...h.deyimler].slice(0, 100).map((s) => ({
      "@type": "DefinedTerm",
      name: s.metin,
      description: s.anlam,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(yapisalVeri) }}
      />
      <Yol
        adimlar={[
          { ad: "Ana sayfa", yol: "/" },
          { ad: "Atasözleri ve Deyimler", yol: "/atasozleri-ve-deyimler" },
          { ad: `${h.harf} harfi` },
        ]}
      />
      <h1>{h.harf} Harfiyle Başlayan Atasözleri ve Deyimler</h1>
      <p className="bk-ia-giris">
        {h.atasozleri.length} atasözü, {h.deyimler.length} deyim — anlamlarıyla birlikte.
      </p>

      {h.atasozleri.length > 0 && <Kume baslik="Atasözleri" sozler={h.atasozleri} />}
      {h.deyimler.length > 0 && <Kume baslik="Deyimler" sozler={h.deyimler} />}
    </>
  );
}

function Kume({ baslik, sozler }: { baslik: string; sozler: Soz[] }) {
  return (
    <section>
      <h2 className="bk-ia-h2">{baslik}</h2>
      <dl className="bk-ia-sozler">
        {sozler.map((s, i) => (
          <div key={i}>
            <dt>{s.metin}</dt>
            <dd>{s.anlam}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
