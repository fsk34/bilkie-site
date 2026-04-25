import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://www.bilkie.com", lastModified: new Date() },
    { url: "https://www.bilkie.com/gizlilik", lastModified: new Date() },
    { url: "https://www.bilkie.com/sartlar", lastModified: new Date() },
    { url: "https://www.bilkie.com/hesap-silme", lastModified: new Date() },
    { url: "https://www.bilkie.com/yardim", lastModified: new Date() },
  ];
}