import type { Metadata } from "next";

// Sayfanın kendisi "use client" olduğu için metadata buradan verilir.
//
// Neden noindex: bot bu sayfada yalnız boş bir form görüyor — indekslenecek içerik
// yok, ama üst layout'taki `index: true` miras alındığı için Google onu yine de
// indekslemeye çalışıyordu. Kök (/) indekslenebilir kalır, bu yol düşer.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function KayitLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
