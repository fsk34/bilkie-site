import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://www.bilkie.com",
      lastModified: new Date(),
    },
  ];
}