// Kelime Gezmece dünyaları — Android `KG_WORLDS` ile birebir (10 dünya × 10 bölüm).
// Görseller uygulamanın drawable'larından alınıp 900px genişliğe indirildi
// (özgünleri 6-7 MB webp; toplam 44 MB → 1,2 MB).
export type Dunya = { ad: string; gorsel: string; bas: number; son: number };

export const DUNYALAR: Dunya[] = [
  { ad: "Kız Kulesi", gorsel: "kizkulesi", bas: 1, son: 10 },
  { ad: "Peri Bacaları", gorsel: "peribacasi", bas: 11, son: 20 },
  { ad: "Sümela Manastırı", gorsel: "sumele", bas: 21, son: 30 },
  { ad: "Petra", gorsel: "petra", bas: 31, son: 40 },
  { ad: "Taj Mahal", gorsel: "tacmahal", bas: 41, son: 50 },
  { ad: "Machu Picchu", gorsel: "machupicchu", bas: 51, son: 60 },
  { ad: "Eyfel Kulesi", gorsel: "eyfel", bas: 61, son: 70 },
  { ad: "Fuji Dağı", gorsel: "fuji", bas: 71, son: 80 },
  { ad: "Everest Dağı", gorsel: "everest", bas: 81, son: 90 },
  { ad: "Çin Seddi", gorsel: "cinseddi", bas: 91, son: 100 },
];

export const dunyaBul = (bolum: number): Dunya =>
  DUNYALAR.find((d) => bolum >= d.bas && bolum <= d.son) ?? DUNYALAR[0];
