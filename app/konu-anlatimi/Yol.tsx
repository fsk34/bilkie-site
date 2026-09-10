// Kırıntı yolu (breadcrumb) — hem okur için gezinme, hem arama motoru için yapı.
// JSON-LD karşılığı sayfaların kendisinde üretiliyor.

import Link from "next/link";

export type Adim = { ad: string; yol?: string };

export default function Yol({ adimlar }: { adimlar: Adim[] }) {
  return (
    <nav className="bk-ia-yol" aria-label="Konum">
      {adimlar.map((a, i) => (
        <span key={i}>
          {a.yol ? <Link href={a.yol}>{a.ad}</Link> : <span aria-current="page">{a.ad}</span>}
          {i < adimlar.length - 1 && <i aria-hidden>›</i>}
        </span>
      ))}
    </nav>
  );
}
