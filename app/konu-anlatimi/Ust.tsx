// İçerik sayfalarının üst şeridi: marka + uygulamaya giriş.
// Uygulamanın kenar çubuğu burada YOK — bu sayfalar oturumsuz açılıyor.

import Link from "next/link";

export default function Ust() {
  return (
    <header className="bk-ia-ust">
      <Link href="/" className="bk-ia-marka" aria-label="Bilkie ana sayfa">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/bilkie-ikon.png" alt="" width={32} height={32} />
        <span className="bk-logo">bilkie</span>
      </Link>
      <Link href="/kayit" className="bk-ia-ust-dugme">
        Ücretsiz başla
      </Link>
    </header>
  );
}
