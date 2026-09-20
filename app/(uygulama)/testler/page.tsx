// 19 Eyl 2026: Konu Testleri hub'ı kalktı — dersler ana ekranda, ders içi /ders/[ders].
// Eski bağlantılar (yer imi, mağaza açıklaması) kırılmasın diye yönlendirme.
import { redirect } from "next/navigation";

export default function KonuTestleriYonlendir() {
  redirect("/");
}
