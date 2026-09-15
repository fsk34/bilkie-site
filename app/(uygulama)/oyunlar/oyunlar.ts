// Oyunlar — mobil uygulamadaki GamesHubScreen'in listesi (başlık + alt yazı birebir).
// `yol` dolu olan oyunun web sürümü hazırdır; boş olanlar "Yakında" görünür.
export type Oyun = { key: string; ad: string; alt: string; yol?: string };

export const OYUNLAR: Oyun[] = [
  { key: "kelime", ad: "Kelime Gezmece", alt: "Harfleri birleştir, kelimeleri bul", yol: "/oyun/kelime" },
  { key: "sudoku", ad: "Sudoku", alt: "Sayıları yerleştir, bulmacayı çöz", yol: "/oyun/sudoku" },
  { key: "blok", ad: "Blok Patla!", alt: "Blokları yerleştir, satırları temizle", yol: "/oyun/blok" },
  { key: "2048", ad: "2048", alt: "Kaydır, birleştir, 2048'e ulaş", yol: "/oyun/2048" },
  { key: "wordle", ad: "Wordle", alt: "Gizli kelimeyi 6 denemede bul", yol: "/oyun/wordle" },
  // 15 Eyl 2026: yaz kampından kalıcı Oyunlar'a taşınanlar (kamp kaldırılıyor)
  { key: "ok", ad: "Ok Bulmaca", alt: "Ucu açık oku bul, tahtayı boşalt", yol: "/oyun/ok" },
  { key: "yapboz", ad: "Resim Yapboz", alt: "Parçaları kaydır, resmi tamamla", yol: "/oyun/yapboz" },
];
