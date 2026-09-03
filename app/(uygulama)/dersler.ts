// Ders anahtarları ve renkleri — MOBİL UYGULAMANIN AYNISI
// (iOS SubjectTestHubScreen / KonuTestleriScreen renk çiftleri).
export type Ders = {
  key: string;
  ad: string;
  ana: string;    // ders ana rengi
  acik: string;   // açık ton (şerit/rozet zemini)
  koyu: string;   // koyu ton (kenar/gölge)
  ikon: string;
};

export const DERSLER: Ders[] = [
  { key: "turkce",    ad: "Türkçe",    ana: "#72CEFD", acik: "#A3D9FF", koyu: "#1E608F", ikon: "📖" },
  { key: "matematik", ad: "Matematik", ana: "#F04B74", acik: "#FF789A", koyu: "#A2314D", ikon: "➗" },
  { key: "fen",       ad: "Fen",       ana: "#40DB18", acik: "#72D759", koyu: "#206B0D", ikon: "🔬" },
  { key: "sosyal",    ad: "Sosyal",    ana: "#F0EB4B", acik: "#FFFA5D", koyu: "#8F8C2E", ikon: "🌍" },
  { key: "ingilizce", ad: "İngilizce", ana: "#971FB5", acik: "#E78AFE", koyu: "#5B0B6E", ikon: "🔤" },
];

export function dersBul(key: string): Ders | undefined {
  return DERSLER.find((d) => d.key === key);
}
