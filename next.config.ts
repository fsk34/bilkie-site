import type { NextConfig } from "next";

/**
 * Güvenlik başlıkları — TÜM yollara uygulanır.
 *
 * Canlıda yalnız HSTS vardı (Vercel'den geliyor); aşağıdakiler eksikti. Siteye üçüncü
 * taraf betiği (AdSense) eklendiği için bunlar artık daha önemli.
 *
 * ⚠️ Content-Security-Policy BİLEREK yok: AdSense çalışma anında kendi alan adlarından
 * betik/iframe yüklüyor ve dar bir CSP reklamları sessizce kırar. CSP ayrı ve ölçülerek
 * eklenmeli (önce Report-Only ile), tek satırda "eklendi" denip geçilecek bir şey değil.
 */
const guvenlikBasliklari = [
  // Siteyi başkası iframe'e gömemez → tıklama hırsızlığı (clickjacking) engellenir.
  // AdSense reklamları KENDİ iframe'ini bizim sayfamıza gömer; bu kural onu etkilemez,
  // yalnızca bizim sayfamızın başkasının içine gömülmesini engeller.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },

  // Tarayıcı, sunucunun bildirdiği içerik türünü kendi tahminiyle değiştirmesin
  // (yüklenen bir metin dosyasının betik gibi çalıştırılması sınıfı saldırılar).
  { key: "X-Content-Type-Options", value: "nosniff" },

  // Dış sitelere giderken tam adresi sızdırma; aynı köken içinde tam adres kalsın.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

  // Kullanmadığımız güçlü tarayıcı yetkilerini kapat — gömülü üçüncü taraf içerik
  // (reklam iframe'i) bunları isteyemesin.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },

  // HSTS: Vercel zaten gönderiyor, burada da tanımlı olması alan adı/barındırma
  // değişirse korumanın kaybolmamasını sağlar. Alt alan adları dahil.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: guvenlikBasliklari }];
  },

  // Uygulama /uygulama altından KÖKE taşındı (3 Eyl 2026). Eski adresler bugün kısa süre
  // yayında kaldı; kalıcı yönlendirme hem kullanıcıyı hem arama motorunu doğru yere taşır.
  //
  // ⚠️ Yönlendirme YALNIZ rota adlarıyla sınırlı. `/uygulama/:path*` gibi geniş bir kural
  // görselleri de yakalıyor: statik varlıklar `public/uygulama/` altında duruyor ve
  // `/uygulama/seriicon.svg` adresinden sunuluyor; geniş kural onu `/seriicon.svg`ye
  // yönlendirip 404 yapıyordu (avatarlar, ders ikonları, lig kupaları hep kırılmıştı).
  async redirects() {
    const rotalar = [
      "atasozleri", "ayarlar", "basarimlar", "defter", "defterler", "ders", "giris",
      "gorevler", "harikalar", "istatistik", "kayit", "ligler", "meslekler", "oyun",
      "oyunlar", "profil", "quiz", "rozetler", "seri", "test", "testler", "turkiye",
      "yazili",
    ].join("|");

    return [
      { source: "/uygulama", destination: "/", permanent: true },
      {
        source: `/uygulama/:rota(${rotalar})/:kalan*`,
        destination: "/:rota/:kalan*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
