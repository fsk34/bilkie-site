import type { MetadataRoute } from "next";

/**
 * Web app manifest.
 *
 * Asıl amacı PWA kurulumu DEĞİL: Chrome'un Android'de gösterdiği yerel uygulama
 * şeridini açmak (Duolingo'da görülen "Uygulamayı Yükle · 4.5 ★ · Google Play"
 * şeridi). Puanı ve indirme sayısını Chrome doğrudan Play'den çekiyor.
 *
 * Neden gerekli: derin bağlantı (App Links) yalnızca DOKUNULAN bağlantılarda
 * çalışır. Adres çubuğuna "bilkie.com" YAZAN kullanıcıyı hem Android hem iOS
 * bilerek tarayıcıda tutar ve bunu geliştiricinin değiştirmesine izin vermez.
 * O kullanıcıyı uygulamaya yönlendirebilen tek yol bu şerit.
 *
 * ⚠️ prefer_related_applications: true → Chrome web uygulamasını PWA olarak
 * kurmayı ÖNERMEZ, native uygulamayı önerir. bilkie.com'un kökü zaten web
 * uygulamasının kendisi olduğu için burada bilinçli bir tercih: telefonda
 * native sürüm (bildirim, çevrimdışı, mağaza puanı) tercih ediliyor.
 * iOS'ta Safari bu şeridi göstermez; oradaki karşılığı Smart App Banner ve
 * uygulamanın App Store'da yayında olmasını gerektiriyor.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bilkie",
    short_name: "Bilkie",
    description: "İlkokul ve ortaokul için oyunlaştırılmış konu testleri, konu defterleri ve yazılıya hazırlık.",
    lang: "tr",
    start_url: "/",
    display: "standalone",
    background_color: "#0C1A3F",
    theme_color: "#0C1A3F",
    icons: [
      { src: "/icon.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
      { src: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
    ],
    related_applications: [
      {
        platform: "play",
        id: "com.bilkie.app",
        url: "https://play.google.com/store/apps/details?id=com.bilkie.app",
      },
    ],
    prefer_related_applications: true,
  };
}
