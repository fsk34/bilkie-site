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
  // Next'in sol alt köşedeki geliştirme göstergesi kapalı: alt bandın logosunun tam
  // üstüne oturuyor ve sayfayı yerelde denerken markayı görünmez kılıyordu.
  // Yalnız `next dev` içindir, yayına çıkan çıktıyı etkilemez.
  devIndicators: false,

  async headers() {
    return [
      { source: "/:path*", headers: guvenlikBasliklari },

      // Universal Links dosyasının UZANTISI YOK (Apple öyle istiyor) ve uzantısız
      // dosyalar application/octet-stream olarak sunuluyor. iOS bu dosyayı
      // application/json görmezse doğrulamayı sessizce reddeder — derin bağlantı
      // hiç çalışmaz ve hata da vermez.
      {
        source: "/.well-known/apple-app-site-association",
        headers: [{ key: "Content-Type", value: "application/json" }],
      },
    ];
  },

  // Uygulama /uygulama altından KÖKE taşındı (3 Eyl 2026). Eski adresler bugün kısa süre
  // yayında kaldı; kalıcı yönlendirme hem kullanıcıyı hem arama motorunu doğru yere taşır.
  //
  // ⚠️ Yönlendirme YALNIZ rota adlarıyla sınırlı. `/uygulama/:path*` gibi geniş bir kural
  // görselleri de yakalıyor: statik varlıklar `public/uygulama/` altında duruyor ve
  // `/uygulama/seriicon.svg` adresinden sunuluyor; geniş kural onu `/seriicon.svg`ye
  // yönlendirip 404 yapıyordu (avatarlar, ders ikonları, lig kupaları hep kırılmıştı).
  async redirects() {
    // Apeks (bilkie.com) → www yönlendirmesi UYGULAMA KATMANINDA yapılır.
    //
    // Neden Vercel'in alan adı ayarındaki 308 yetmiyor: o yönlendirme uçta, uygulamadan
    // ÖNCE çalışır ve İSTİSNASIZDIR — `/.well-known/` dosyalarını da yönlendirir.
    // Google ve Apple ise ilişkilendirme dosyasında yönlendirme KABUL ETMEZ (sahiplik
    // kanıtı tek adımda gelmeli; yoksa açık yönlendirmesi olan biri alan adını
    // sahiplenebilirdi). Ölçüldü: www ✅ doğrulandı, apeks ⛔ reddedildi → apeks host'lu
    // derin bağlantılar hiç çalışmıyordu.
    //
    // Çözüm: Vercel'de `bilkie.com` "No Redirect"e alınır, aynı yönlendirme burada
    // `/.well-known/` HARİÇ yeniden yazılır. Böylece iki dosya iki adreste de DOĞRUDAN
    // (200) sunulur, tarayıcı trafiği yine tek kökende toplanır.
    //
    // ⚠️ Yönlendirmeyi tamamen kaldırmak YANLIŞ olurdu: bilkie.com ve www.bilkie.com
    // ayrı köken sayılır → Firebase oturumu bölünür, kullanıcı "hesabım kayboldu" sanır.
    //
    // ⚠️ SIRA: önce bu kod yayına çıkar (Vercel'in 308'i sürerken zararsızdır, hiç
    // tetiklenmez), SONRA Vercel'de "No Redirect" işaretlenir. Tersi sırada apeks bir
    // süre yönlendirmesiz kalır.
    const apeks = [{ type: "host" as const, value: "bilkie.com" }];

    const rotalar = [
      "atasozleri", "ayarlar", "basarimlar", "defter", "defterler", "ders", "giris",
      "gorevler", "harikalar", "istatistik", "kayit", "ligler", "meslekler", "oyun",
      "oyunlar", "profil", "quiz", "rozetler", "seri", "test", "testler", "turkiye",
      "yazili",
    ].join("|");

    return [
      // Apeks kuralları ÖNCE: köken düzeltmesi tek sıçramada bitsin.
      { source: "/", has: apeks, destination: "https://www.bilkie.com/", permanent: true },
      {
        // `.well-known` ile başlayan yollar bilerek DIŞARIDA — doğrulama dosyaları
        // apeks adresinde de 200 dönmeli.
        source: "/:yol((?!\\.well-known/).*)",
        has: apeks,
        destination: "https://www.bilkie.com/:yol",
        permanent: true,
      },

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
