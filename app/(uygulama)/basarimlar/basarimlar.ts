// Başarım kataloğu — uygulamadaki AchievementsScreen.makeItems ile birebir
// (başlık, görsel, açıklama, hedef, eşikler, renkler). Düzey ve hedef cümlesi
// eşiklerden türetilir (Duolingo'daki "5. DÜZEY / 50 günlük bir seriye ulaş" karşılığı).

export type Basarim = {
  id: string; ad: string; gorsel: string; aciklama: string;
  hedef: number; esikler: number[]; zemin: string; kenar?: string; yil?: string;
  kisisel?: boolean; etkinlik?: boolean;
  /** Satırın altındaki hedef cümlesi; {n} sıradaki eşikle değişir. */
  hedefSablonu?: string;
};

export const BASARIMLAR: Basarim[] = [
  // Kişisel rekorlar (eşiksiz — sayının kendisi gösterilir)
  { id: "enuzunseri", ad: "En Uzun Seri", gorsel: "enuzunseri", kisisel: true, hedef: 1, esikler: [], zemin: "#002493",
    aciklama: "Arka arkaya kaç gün Bilkie'de çalıştığını gösterir.", hedefSablonu: "Seri rekorunu artır" },
  { id: "enyuksekpuan", ad: "En Yüksek Puan", gorsel: "enyuksekpuan", kisisel: true, hedef: 1, esikler: [], zemin: "#8E0057",
    aciklama: "Şu ana kadar ulaştığın en yüksek toplam puan.", hedefSablonu: "Puan rekorunu artır" },
  { id: "enyukseklig", ad: "En Yüksek Lig", gorsel: "enyukseklig", kisisel: true, hedef: 1, esikler: [], zemin: "#8A5700",
    aciklama: "Şimdiye kadar ulaştığın en üst lig.", hedefSablonu: "Bir üst lige yüksel" },
  { id: "hatasiztest", ad: "Hatasız Test", gorsel: "hatasiztest", kisisel: true, hedef: 1, esikler: [], zemin: "#007A7F",
    aciklama: "Tüm sorularını doğru cevapladığın test sayısı.", hedefSablonu: "Bir testi daha hatasız bitir" },

  // Ödüller (eşikli — düzey atlar)
  { id: "mukemmgun", ad: "Öğrenci", gorsel: "ogrenci", hedef: 140, esikler: [10,20,30,40,50,75,100,120,130,140], zemin: "#014F1E", kenar: "#C8EF96",
    aciklama: "Mükemmel Gün: çalıştığın toplam gün sayısı.", hedefSablonu: "{n} gün çalış" },
  { id: "mukemmhafta", ad: "Bilim İnsanı", gorsel: "biliminsani", hedef: 20, esikler: [4,8,12,16,20], zemin: "#5D0035", kenar: "#FFB1E4",
    aciklama: "Mükemmel Hafta: yedi günü de dolu hafta sayısı.", hedefSablonu: "{n} mükemmel hafta tamamla" },
  { id: "mukemmay", ad: "Astronot", gorsel: "astronot", hedef: 5, esikler: [1,2,3,4,5], zemin: "#520057", kenar: "#E1BCFF",
    aciklama: "Mükemmel Ay: bütün günleri dolu ay sayısı.", hedefSablonu: "{n} mükemmel ay tamamla" },
  { id: "inceisci", ad: "Doktor", gorsel: "doktor", hedef: 20, esikler: [4,8,12,16,20], zemin: "#5A0B00", kenar: "#FFAFAE",
    aciklama: "İnce İşçi: yazılı ve testi hatasız tamamlama sayısı.", hedefSablonu: "{n} kez hatasız tamamla" },
  { id: "gorevdedektifi", ad: "Dedektif", gorsel: "dedektif", hedef: 50, esikler: [10,20,30,40,50], zemin: "#583E00", kenar: "#FCD396",
    aciklama: "Görev Dedektifi: günlük görevlerin tamamını bitirdiğin gün sayısı.", hedefSablonu: "{n} gün tüm görevleri bitir" },
  { id: "kusursuzsanat", ad: "Sanatçı", gorsel: "sanatci", hedef: 50, esikler: [10,20,30,40,50], zemin: "#003554", kenar: "#94EBFA",
    aciklama: "Kusursuz Sanat: aynı gün hem defter hem test tamamlama sayısı.", hedefSablonu: "{n} gün defter + test tamamla" },
  { id: "unitesenfoni", ad: "Dansçı", gorsel: "dansci", hedef: 50, esikler: [10,20,30,40,50], zemin: "#150056", kenar: "#B2C6FF",
    aciklama: "Ünite Senfonisi: tamamladığın ünite defteri ve quiz sayısı.", hedefSablonu: "{n} ünite defteri/quiz tamamla" },

  // Etkinlik
  { id: "yazkampi", ad: "Yaz Kaşifi", gorsel: "rozet_yazkampi", etkinlik: true, yil: "2026", hedef: 1, esikler: [], zemin: "#0A6EBD",
    aciklama: "Yaz Kampı: sınıfının beş dersini de baştan sona tamamladığında kazanılır.",
    hedefSablonu: "Yaz kampının beş dersini bitir" },
];

/** Kaç eşiği geçtiyse o kadar düzey ("5. DÜZEY"). */
export function basarimDuzeyi(b: Basarim, deger: number): number {
  if (b.esikler.length === 0) return deger > 0 ? 1 : 0;
  return b.esikler.filter((e) => deger >= e).length;
}

/** Sıradaki eşik (hepsi geçildiyse sonuncusu). */
export function sonrakiEsik(b: Basarim, deger: number): number {
  return b.esikler.find((e) => deger < e) ?? b.esikler[b.esikler.length - 1] ?? b.hedef;
}

/** Satır altındaki hedef cümlesi. */
export function hedefCumlesi(b: Basarim, deger: number): string {
  if (!b.hedefSablonu) return b.aciklama;
  return b.hedefSablonu.replace("{n}", String(sonrakiEsik(b, deger)));
}

export const AY_ROZETLERI = [
  { i: 0, ad: "Ocak", gorsel: "ocak" },
  { i: 1, ad: "Şubat", gorsel: "subat" },
  { i: 2, ad: "Mart", gorsel: "mart" },
  { i: 3, ad: "Nisan", gorsel: "nisan" },
  { i: 4, ad: "Mayıs", gorsel: "mayis" },
  { i: 5, ad: "Haziran", gorsel: "haziran" },
];
