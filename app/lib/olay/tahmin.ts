// Bitiş ekranının seri + görev özeti — şartname §8.2 (Android data/olay/OlayTahmin.kt karşılığı).
// Ekran sunucuyu beklemez. Android'den farkı: kuralların ayrı bir kopyası YOK — sunucunun karar motoru
// (motor/, scripts/motor_esitle.sh ile kopyalanır) burada önbellekteki verilerle AYNEN çalıştırılır.
//
//  1) Olayın okuma planındaki düğümler (görevler, seri, günlük bayraklar, ilk-kez işareti) okunur;
//     kutuda bekleyen ÖNCEKİ olaylar sırayla uygulanır (sunucu onları henüz işlemedi), sonra bu olay.
//  2) Aynı anda sunucunun `sonuc`'u beklenir; gelirse o kazanır.
// Okunamayan bölüm (çevrimdışı + önbellekte yok) gösterilmez — boş durumdan hesaplanmış yanlış
// sayı ("1 günlük seri") göstermektense özet atlanır.

import { kullaniciDb } from "../firebase";
import type { GorevDegisimi, GorevDonemi } from "../gorevYaz";
import { bekleyenler, sonucBekle, type Yazilan } from "./kutu";
import { gecerliOlaylar, hamKatalog, motorZinciri, OKUNMAYAN, oku, yolaKoy, type HamKatalog } from "./bindir";
import { katalogSec } from "./motor/gorev";
import { okumaPlani } from "./motor/motor";
import { dugum, tamSayi, type Dugum } from "./motor/sayi";
import type { Katalog } from "./motor/tipler";

/** Sunucu sonucu beklemesi — okumalarla AYNI ANDA başlar; sonuç akışının 3 sn tavanına sığar. */
const SUNUCU_MS = 2500;

export type SeriOzeti = { sayi: number; maske: number; ilkBugun: boolean };
export type BitisOzeti = {
  seri: SeriOzeti | null;
  gorevler: GorevDegisimi[];
  /** Sunucunun ya da yerel motorun "ilk kez" kararı (defter, quiz, yazılı XP) */
  ilkKez?: boolean;
  sunucudan: boolean;
};

/* ----------------------------------------------------------------- motor */

function donemleri(k: Katalog): Map<string, { donem: GorevDonemi; baslik: string; xp: number }> {
  const m = new Map<string, { donem: GorevDonemi; baslik: string; xp: number }>();
  const ekle = (liste: Katalog["gunluk"], donem: GorevDonemi) => {
    for (const t of liste) if (!m.has(t.id)) m.set(t.id, { donem, baslik: t.title, xp: t.xp });
  };
  ekle(k.gunluk, "gunluk");
  ekle(k.haftalik, "haftalik");
  ekle(k.aylik, "aylik");
  return m;
}

/** Motorun / sunucunun görev farkları → sonuç ekranının satırları (başlık + dönem katalogdan). */
function gorevSatirlari(ham: unknown, k: Katalog | null, okunamayan: Set<GorevDonemi>): GorevDegisimi[] {
  if (!k) return [];
  const tanim = donemleri(k);
  const out: GorevDegisimi[] = [];
  for (const x of Object.values(dugum(ham))) {
    const f = dugum(x);
    const id = typeof f.id === "string" ? f.id : "";
    const t = tanim.get(id);
    if (!t || okunamayan.has(t.donem)) continue;
    out.push({
      id, baslik: t.baslik, xp: t.xp, donem: t.donem,
      onceki: tamSayi(f.onceki), yeni: tamSayi(f.yeni), hedef: tamSayi(f.hedef),
      // Motor tamamlanmış görevi atlar → farkta "bitti" = bu olayla YENİ bitti
      yeniBitti: f.bitti === true,
    });
  }
  return out;
}

/**
 * Yerel tahmin: [yazilan] + kutuda bekleyen önceki olaylar, sunucu motoruyla.
 * Okumalar sunucu bu olayı işlemeden önceki durumu görmeli — bitişte HEMEN çağrılır.
 */
async function yerelTahmin(uid: string, yazilan: Yazilan, katalogSoz: Promise<HamKatalog | null>): Promise<BitisOzeti | null> {
  const olaylar = gecerliOlaylar([
    ...bekleyenler(uid).filter((b) => b.id !== yazilan.id),
    { id: yazilan.id, olay: yazilan.olay },
  ]);
  const son = olaylar[olaylar.length - 1];
  if (!son || son.o.id !== yazilan.id) return null;   // bu olay geçersiz: sunucu da reddeder

  // Bütün planların yolları tek seferde, paralel
  const yollar = new Set<string>();
  for (const { o, eski } of olaylar) {
    for (const [a, y] of Object.entries(okumaPlani(uid, o, eski))) if (!OKUNMAYAN(a)) yollar.add(y);
  }
  const kok: Dugum = {};
  const okunamayanYol = new Set<string>();
  const [hamK] = await Promise.all([
    katalogSoz,
    ...[...yollar].map(async (y) => {
      const v = await oku(kullaniciDb, y);
      if (v === undefined) okunamayanYol.add(y);
      else if (v !== null) yolaKoy(kok, y, v);
    }),
  ]);

  const cikti = motorZinciri(uid, kok, olaylar, hamK);
  const katalog = hamK ? katalogSec(hamK, son.o.gun) : null;
  if (!cikti) return null;

  const plan = okumaPlani(uid, son.o, son.eski);
  const okunamadi = (a: string) => plan[a] !== undefined && okunamayanYol.has(plan[a]);
  const okunamayanDonem = new Set<GorevDonemi>();
  if (okunamadi("gorevGunluk")) okunamayanDonem.add("gunluk");
  if (okunamadi("gorevHaftalik")) okunamayanDonem.add("haftalik");
  if (okunamadi("gorevAylik")) okunamayanDonem.add("aylik");

  const s = cikti.sonuc;
  return {
    seri: s.seri && !okunamadi("seri") ? { sayi: s.seri.sayi, maske: s.seri.maske, ilkBugun: s.seri.ilkBugun } : null,
    gorevler: gorevSatirlari(s.gorevler, katalog, okunamayanDonem),
    ilkKez: okunamadi("isaret") ? undefined : s.ilkKez,
    sunucudan: false,
  };
}

/** Sunucunun `olaylar/{id}/sonuc` düğümü → özet. Reddedilen olay (`hata`) → null. */
function sunucuOzeti(sonuc: Record<string, unknown>, katalog: Katalog | null): BitisOzeti | null {
  if (sonuc.hata != null) return null;
  const s = sonuc.seri == null ? null : dugum(sonuc.seri);
  return {
    seri: s ? { sayi: tamSayi(s.sayi), maske: tamSayi(s.maske), ilkBugun: s.ilkBugun === true } : null,
    gorevler: gorevSatirlari(sonuc.gorevler, katalog, new Set()),
    ilkKez: typeof sonuc.ilkKez === "boolean" ? sonuc.ilkKez : undefined,
    sunucudan: true,
  };
}

/**
 * Bitiş özeti: yerel tahmin ile sunucu sonucu AYNI ANDA başlar; sunucu sonucu gelirse o kazanır.
 * Hata fırlatmaz; hiçbiri yoksa boş özet.
 */
export async function bitisOzeti(uid: string, yazilan: Yazilan): Promise<BitisOzeti> {
  const katalogSoz = hamKatalog();
  const [yerel, sunucu, hamK] = await Promise.all([
    yerelTahmin(uid, yazilan, katalogSoz).catch(() => null),
    sonucBekle(uid, yazilan.id, SUNUCU_MS).catch(() => null),
    katalogSoz,
  ]);
  const katalog = hamK ? katalogSec(hamK, yazilan.olay.gun) : null;
  return (sunucu && sunucuOzeti(sunucu, katalog)) ?? yerel ?? { seri: null, gorevler: [], sunucudan: false };
}
