import { MetadataRoute } from "next";
import { harfKumeleri, icerikAgaci, testAgaci } from "./lib/icerik";

const KOK = "https://www.bilkie.com";

/**
 * Site haritası — içerik dizininden ÜRETİLİR, elle yazılmaz.
 * Yeni bir ünite ya da harf eklendiğinde burada iş yapılmasına gerek yok.
 *
 * `priority` bilerek dereceli: kök ve hub'lar taranmaya değer, tekil üniteler
 * içeriğin kendisi. (Google bunu bir öneri sayar, garanti değil.)
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const simdi = new Date();
  const girisler: MetadataRoute.Sitemap = [
    { url: KOK, lastModified: simdi, priority: 1 },
    { url: `${KOK}/konu-anlatimi`, lastModified: simdi, priority: 0.9 },
    { url: `${KOK}/atasozleri-ve-deyimler`, lastModified: simdi, priority: 0.9 },
    { url: `${KOK}/konu-testi`, lastModified: simdi, priority: 0.9 },
  ];

  // Konu testleri: sınıf → ders → test. Asıl içerik en alttaki katmanda.
  for (const s of testAgaci()) {
    girisler.push({ url: `${KOK}/konu-testi/${s.slug}`, lastModified: simdi, priority: 0.8 });
    for (const d of s.dersler) {
      girisler.push({
        url: `${KOK}/konu-testi/${s.slug}/${d.slug}`,
        lastModified: simdi,
        priority: 0.7,
      });
      for (const t of d.testler) {
        girisler.push({
          url: `${KOK}/konu-testi/${s.slug}/${d.slug}/${t.slug}`,
          lastModified: simdi,
          priority: 0.7,
        });
      }
    }
  }

  for (const s of icerikAgaci()) {
    girisler.push({ url: `${KOK}/konu-anlatimi/${s.slug}`, lastModified: simdi, priority: 0.8 });
    for (const d of s.dersler) {
      girisler.push({
        url: `${KOK}/konu-anlatimi/${s.slug}/${d.slug}`,
        lastModified: simdi,
        priority: 0.7,
      });
      // Ünite sayfası YOK: konu anlatımı metni halka açık değil, dizin ders
      // sayfasında bitiyor (bkz. [sinif]/[ders]/page.tsx).
    }
  }

  for (const h of harfKumeleri()) {
    girisler.push({
      url: `${KOK}/atasozleri-ve-deyimler/${h.slug}`,
      lastModified: simdi,
      priority: 0.6,
    });
  }

  // Hukuki/yardım sayfaları — içerik değil ama taranmalı.
  for (const yol of ["/gizlilik", "/sartlar", "/hesap-silme", "/yardim"]) {
    girisler.push({ url: `${KOK}${yol}`, lastModified: simdi, priority: 0.3 });
  }

  return girisler;
}
