// /konu-anlatimi/5-sinif/fen/gokyuzundeki-komsularimiz-ve-biz — ASIL KONU ANLATIMI SAYFASI.
//
// Defterin YARISI (en az 3 sayfa) burada, kalanı uygulamada — testlerdeki "ilk 10 soru"
// kuralının aynısı. Açılan kısım gerçekten okunabilir olmalı: bir paragraf gösterip
// "devamı uygulamada" demek ziyaretçiyi geri döndürür, Google da bunu sıralamaya
// yansıtır. Ölçüldü: sayfa başına medyan 287 kelime (16 Eyl 2026).
//
// Bloklar uygulamadaki defterle AYNI dönüşümden geliyor (defterBicim.sayfalariCevir),
// ama çizimi farklı: uygulama kâğıt/renk/animasyon, burası anlamlı HTML
// (h2/h3/p/ul/dl/table). Arama motoru başlık hiyerarşisini ve tanımları okuyabilsin diye.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { DefterBlok } from "../../../../lib/defterBicim";
import { icerikAgaci, uniteBul } from "../../../../lib/icerik";
import Yol from "../../../Yol";

export function generateStaticParams() {
  return icerikAgaci().flatMap((s) =>
    s.dersler.flatMap((d) => d.uniteler.map((u) => ({ sinif: s.slug, ders: d.slug, unite: u.slug })))
  );
}

type Params = Promise<{ sinif: string; ders: string; unite: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { sinif, ders, unite } = await params;
  const b = uniteBul(sinif, ders, unite);
  if (!b) return {};
  const baslik = `${b.unite.baslik} — ${b.sinif.sinif}. Sınıf ${b.ders.ad} Konu Anlatımı`;
  return {
    title: `${baslik} | Bilkie`,
    description: ozet(b.sayfalar) || `${b.sinif.sinif}. sınıf ${b.ders.ad} "${b.unite.baslik}" ünitesinin konu anlatımı.`,
    alternates: { canonical: `/konu-anlatimi/${b.sinif.slug}/${b.ders.slug}/${b.unite.slug}` },
    openGraph: { title: baslik, type: "article" },
  };
}

/** Meta açıklama: ilk paragraf, 155 karaktere kırpılmış. */
function ozet(sayfalar: { bloklar: DefterBlok[] }[]): string {
  for (const s of sayfalar) {
    for (const b of s.bloklar) {
      if (b.tip === "paragraf" && b.metin && b.metin.length > 40) {
        return b.metin.length > 155 ? `${b.metin.slice(0, 152).trimEnd()}…` : b.metin;
      }
    }
  }
  return "";
}

export default async function UniteSayfasi({ params }: { params: Params }) {
  const { sinif, ders, unite } = await params;
  const b = uniteBul(sinif, ders, unite);
  if (!b) notFound();

  const kok = `/konu-anlatimi/${b.sinif.slug}/${b.ders.slug}`;
  const liste = b.ders.uniteler;
  const i = liste.findIndex((u) => u.slug === b.unite.slug);
  const onceki = i > 0 ? liste[i - 1] : null;
  const sonraki = i >= 0 && i < liste.length - 1 ? liste[i + 1] : null;
  const kapali = Math.max(0, b.unite.toplam - b.unite.acik);

  // Defterin ilk bloğu çoğunlukla "Ünite 1 Gökyüzündeki Komşularımız ve Biz" başlığı —
  // h1 zaten onu söylüyor, ikinci kez basılmasın.
  const sayfalar = b.sayfalar.map((s, n) => {
    if (n !== 0) return s;
    const [ilk, ...kalan] = s.bloklar;
    const tekrar = ilk?.tip === "baslik" && (ilk.baslik ?? "").includes(b.unite.baslik);
    return tekrar ? { ...s, bloklar: kalan } : s;
  });

  const yapisalVeri = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: `${b.unite.baslik} — ${b.sinif.sinif}. Sınıf ${b.ders.ad} Konu Anlatımı`,
        inLanguage: "tr",
        educationalLevel: `${b.sinif.sinif}. sınıf`,
        about: { "@type": "Thing", name: b.unite.baslik },
        isAccessibleForFree: true,
        author: { "@type": "Organization", name: "Bilkie" },
        publisher: { "@type": "Organization", name: "Bilkie", url: "https://www.bilkie.com" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Konu Anlatımı", item: "https://www.bilkie.com/konu-anlatimi" },
          {
            "@type": "ListItem",
            position: 2,
            name: `${b.sinif.sinif}. Sınıf`,
            item: `https://www.bilkie.com/konu-anlatimi/${b.sinif.slug}`,
          },
          { "@type": "ListItem", position: 3, name: b.ders.ad, item: `https://www.bilkie.com${kok}` },
          { "@type": "ListItem", position: 4, name: b.unite.baslik },
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
          { ad: "Konu Anlatımı", yol: "/konu-anlatimi" },
          { ad: `${b.sinif.sinif}. Sınıf`, yol: `/konu-anlatimi/${b.sinif.slug}` },
          { ad: b.ders.ad, yol: kok },
          { ad: b.unite.baslik },
        ]}
      />

      <article className="bk-ia-makale">
        <h1>{b.unite.baslik}</h1>
        <p className="bk-ia-ustbilgi">
          {b.sinif.sinif}. Sınıf · {b.ders.ad} · {i + 1}. Ünite · {b.unite.toplam} sayfa
        </p>

        {sayfalar.map((s) => (
          <section className="bk-ia-sayfa" key={s.no}>
            {s.bloklar.map((blok, n) => (
              <Blok key={n} blok={blok} />
            ))}
          </section>
        ))}
      </article>

      {kapali > 0 && (
        <aside className="bk-ia-cagri">
          <strong>Bu ünitenin {kapali} sayfası daha var</strong>
          <p>
            Defterin kalanını Bilkie&apos;de oku, testini çöz, seri yap, ligde yüksel. Ücretsiz.
          </p>
          <Link className="bk-dugme yesil" href="/kayit">
            Haydi Başlayalım
          </Link>
        </aside>
      )}

      <nav className="bk-ia-komsu">
        {onceki ? (
          <Link href={`${kok}/${onceki.slug}`}>
            <span>← Önceki ünite</span>
            <strong>{onceki.baslik}</strong>
          </Link>
        ) : (
          <i />
        )}
        {sonraki && (
          <Link href={`${kok}/${sonraki.slug}`} className="sag">
            <span>Sonraki ünite →</span>
            <strong>{sonraki.baslik}</strong>
          </Link>
        )}
      </nav>
    </>
  );
}

/* ------------------------------------------------------------------ bloklar */

function Blok({ blok }: { blok: DefterBlok }) {
  switch (blok.tip) {
    case "baslik":
      return <h2 className="bk-ia-h2">{blok.baslik}</h2>;
    case "altbaslik":
      return <h3 className="bk-ia-h3">{blok.metin}</h3>;
    case "paragraf":
    case "kalip":
      return <p>{blok.metin}</p>;
    case "liste":
      return (
        <>
          {blok.baslik ? <h3 className="bk-ia-h3">{blok.baslik}</h3> : null}
          <ul className="bk-ia-liste">
            {(blok.maddeler ?? []).map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </>
      );
    case "adimlar":
      return (
        <>
          {blok.baslik ? <h3 className="bk-ia-h3">{blok.baslik}</h3> : null}
          <ol className="bk-ia-liste">
            {(blok.adimlar ?? []).map((a, i) => <li key={i}>{a}</li>)}
          </ol>
        </>
      );
    case "tanim":
      return (
        <dl className="bk-ia-tanim">
          <dt>{blok.terim}</dt>
          <dd>{blok.metin}</dd>
        </dl>
      );
    case "ornek":
    case "uyari":
    case "kural":
    case "bilgi":
      return <p className={`bk-ia-kutu ${blok.tip}`}>{blok.metin}</p>;
    case "formul":
      return <p className="bk-ia-formul">{blok.metin}</p>;
    case "problem":
      return (
        <div className="bk-ia-kutu problem">
          {blok.baslik ? <strong>{blok.baslik}</strong> : null}
          {blok.metin ? <p>{blok.metin}</p> : null}
        </div>
      );
    case "tablo":
      return (
        <div className="bk-ia-tablo-sarma">
          <table className="bk-ia-tablo">
            {(blok.basliklar ?? []).length > 0 && (
              <thead>
                <tr>{(blok.basliklar ?? []).map((h, i) => <th key={i}>{h}</th>)}</tr>
              </thead>
            )}
            <tbody>
              {(blok.satirlar ?? []).map((satir, i) => (
                <tr key={i}>{satir.map((h, j) => <td key={j}>{h}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return null;
  }
}
