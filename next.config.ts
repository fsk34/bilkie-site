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
};

export default nextConfig;
