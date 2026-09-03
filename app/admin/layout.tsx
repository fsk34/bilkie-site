import type { Metadata } from "next";
import AdminKapi from "./Kapi";

/**
 * Yönetim paneli arama motorlarına KAPALI.
 *
 * Neden `robots.txt`e "Disallow: /admin" yazmadık: engellenen bir yolu Google yine de
 * (başka bir yerden bağlantı görürse) adres olarak dizine ekleyebilir, üstelik sayfayı
 * hiç çekmediği için içindeki noindex'i de göremez. `noindex` doğrudan sayfada durursa
 * hüküm kesindir. Ayrıca robots.txt herkese açık bir dosya; oraya yol yazmak paneli
 * gizlemez, tersine ilan eder.
 *
 * ⚠️ Bu SEO içindir, güvenlik değildir. Panelin gerçek kapısı Firebase kurallarındaki
 * `auth.token.email` kontrolüdür; buradaki `AdminKapi` yalnızca arayüzü gizler.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminKapi>{children}</AdminKapi>;
}
