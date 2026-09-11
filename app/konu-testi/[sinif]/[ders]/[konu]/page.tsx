// /konu-testi/5-sinif/matematik/temel-sekiller — ASIL TEST SAYFASI.
//
// Testin 30 sorusundan İLK 10'u burada, cevaplarıyla. Kalan 20 soru uygulamada.
// Açılan kısım gerçekten kullanılabilir olmalı: soruyu gösterip cevabı saklamak
// ziyaretçiyi geri döndürür, Google da bunu sıralamaya yansıtır.
//
// Cevaplar <details> içinde: JavaScript'siz çalışır, arama motoru içeriği okur,
// ama çözmeden önce cevap gözüne çarpmaz.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { testAgaci, testBul, type TestSoru } from "../../../../lib/icerik";
import Yol from "../../../../konu-anlatimi/Yol";

export function generateStaticParams() {
  return testAgaci().flatMap((s) =>
    s.dersler.flatMap((d) => d.testler.map((t) => ({ sinif: s.slug, ders: d.slug, konu: t.slug })))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sinif: string; ders: string; konu: string }>;
}): Promise<Metadata> {
  const { sinif, ders, konu } = await params;
  const b = testBul(sinif, ders, konu);
  if (!b) return {};
  const baslik = `${b.test.ad} Testi — ${b.sinif.sinif}. Sınıf ${b.ders.ad}`;
  return {
    title: `${baslik} | Bilkie`,
    description: `${b.sinif.sinif}. sınıf ${b.ders.ad} "${b.test.ad}" konu testi. ${b.test.sorular.length} soru, cevaplarıyla, ücretsiz çöz.`,
    alternates: { canonical: `/konu-testi/${b.sinif.slug}/${b.ders.slug}/${b.test.slug}` },
    openGraph: { title: baslik, type: "article" },
  };
}

const HARF = ["A", "B", "C", "D", "E"];

export default async function TestSayfasi({
  params,
}: {
  params: Promise<{ sinif: string; ders: string; konu: string }>;
}) {
  const { sinif, ders, konu } = await params;
  const b = testBul(sinif, ders, konu);
  if (!b) notFound();

  const kok = `/konu-testi/${b.sinif.slug}/${b.ders.slug}`;
  const liste = b.ders.testler;
  const i = liste.findIndex((t) => t.slug === b.test.slug);
  const onceki = i > 0 ? liste[i - 1] : null;
  const sonraki = i >= 0 && i < liste.length - 1 ? liste[i + 1] : null;
  const kapali = Math.max(0, b.test.toplam - b.test.sorular.length);

  const yapisalVeri = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Quiz",
        name: `${b.test.ad} Testi — ${b.sinif.sinif}. Sınıf ${b.ders.ad}`,
        inLanguage: "tr",
        educationalLevel: `${b.sinif.sinif}. sınıf`,
        about: { "@type": "Thing", name: b.test.ad },
        numberOfQuestions: b.test.sorular.length,
        isAccessibleForFree: true,
        publisher: { "@type": "Organization", name: "Bilkie", url: "https://www.bilkie.com" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Konu Testleri", item: "https://www.bilkie.com/konu-testi" },
          {
            "@type": "ListItem",
            position: 2,
            name: `${b.sinif.sinif}. Sınıf`,
            item: `https://www.bilkie.com/konu-testi/${b.sinif.slug}`,
          },
          { "@type": "ListItem", position: 3, name: b.ders.ad, item: `https://www.bilkie.com${kok}` },
          { "@type": "ListItem", position: 4, name: b.test.ad },
        ],
      },
    ],
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
          { ad: "Konu Testleri", yol: "/konu-testi" },
          { ad: `${b.sinif.sinif}. Sınıf`, yol: `/konu-testi/${b.sinif.slug}` },
          { ad: b.ders.ad, yol: kok },
          { ad: b.test.ad },
        ]}
      />

      <article>
        <h1>{b.test.ad} Testi</h1>
        <p className="bk-ia-ustbilgi">
          {b.sinif.sinif}. Sınıf · {b.ders.ad} · {b.test.unite}
        </p>

        <ol className="bk-test-liste">
          {b.test.sorular.map((q, n) => (
            <Soru key={n} q={q} no={n + 1} />
          ))}
        </ol>
      </article>

      {kapali > 0 && (
        <aside className="bk-ia-cagri">
          <strong>Bu testin {kapali} sorusu daha var</strong>
          <p>
            Kalan soruları Bilkie&apos;de çöz; doğrularını XP&apos;ye çevir, serini büyüt,
            ligde yüksel. Ücretsiz.
          </p>
          <Link className="bk-dugme yesil" href="/kayit">
            Haydi Başlayalım
          </Link>
        </aside>
      )}

      <nav className="bk-ia-komsu">
        {onceki ? (
          <Link href={`${kok}/${onceki.slug}`}>
            <span>← Önceki test</span>
            <strong>{onceki.ad}</strong>
          </Link>
        ) : (
          <i />
        )}
        {sonraki && (
          <Link href={`${kok}/${sonraki.slug}`} className="sag">
            <span>Sonraki test →</span>
            <strong>{sonraki.ad}</strong>
          </Link>
        )}
      </nav>
    </>
  );
}

function Soru({ q, no }: { q: TestSoru; no: number }) {
  const dogru = typeof q.d === "number" ? q.d : -1;
  return (
    <li className="bk-test-soru">
      <p className="metin">{q.s}</p>
      <ul className="siklar">
        {q.o.map((sik, j) => (
          <li key={j}>
            <b>{HARF[j] ?? j + 1}</b>
            <span>{sik}</span>
          </li>
        ))}
      </ul>
      {dogru >= 0 && q.o[dogru] && (
        <details className="cevap">
          <summary>Cevabı göster</summary>
          <p>
            <b>{HARF[dogru] ?? dogru + 1}</b> {q.o[dogru]}
          </p>
        </details>
      )}
      <span className="no" aria-hidden>
        {no}
      </span>
    </li>
  );
}
