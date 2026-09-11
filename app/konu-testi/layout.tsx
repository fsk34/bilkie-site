// Konu testleri — halka açık bölüm. `(uygulama)` grubunun DIŞINDA: oradaki
// Kapi.tsx giriş yapmamış herkesi /giris'e atıyor.
//
// ⚠️ Yol adı `/konu-testi`, `/test` DEĞİL: `/test/[ders]/[konu]` uygulamanın
// kendi rotası (bkz. app/(uygulama)/test). Aynı adı kullanmak ikisini çakıştırır.

import type { Metadata } from "next";
import "../(uygulama)/uygulama.css";
import AltBant from "../(uygulama)/AltBant";
import Ust from "../konu-anlatimi/Ust";

export const metadata: Metadata = {
  robots: { index: true, follow: true },
};

export default function KonuTestiLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bk bk-ia">
      <Ust />
      <main className="bk-ia-govde">{children}</main>
      <AltBant dersler={false} />
    </div>
  );
}
