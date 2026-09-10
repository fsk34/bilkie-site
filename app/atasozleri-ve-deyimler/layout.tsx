// Atasözleri ve deyimler bölümü — konu anlatımıyla aynı kabuk.
// `(uygulama)` grubunun dışında: halka açık, sunucuda çiziliyor.

import type { Metadata } from "next";
import "../(uygulama)/uygulama.css";
import AltBant from "../(uygulama)/AltBant";
import Ust from "../konu-anlatimi/Ust";

export const metadata: Metadata = {
  robots: { index: true, follow: true },
};

export default function AtasozleriLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bk bk-ia">
      <Ust />
      <main className="bk-ia-govde">{children}</main>
      <AltBant dersler={false} />
    </div>
  );
}
