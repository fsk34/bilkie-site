import { MetadataRoute } from "next";

export default function sitemap() {
  return [
    {
      url: "https://www.bilkie.com",
      lastModified: new Date(),
    },
    {
      url: "https://www.bilkie.com/#oyunlastirma",
      lastModified: new Date(),
    },
    {
      url: "https://www.bilkie.com/#microlearning",
      lastModified: new Date(),
    },
    {
      url: "https://www.bilkie.com/#istatistik",
      lastModified: new Date(),
    },
    {
      url: "https://www.bilkie.com/#ligler",
      lastModified: new Date(),
    },
    {
      url: "https://www.bilkie.com/#profil",
      lastModified: new Date(),
    },
  ];
}