// Görev YAZMA katmanı — Android `domain/TaskManager.kt` → applyEvent portu.
// Web görev ilerlemesini şimdiye kadar yalnızca OKUYORDU. Tanımların okunması zaten
// `veri.ts`te var (gunluk/haftalik/aylikGorevTanimlari); burada YAZMA tarafı.
//
// Yollar: users/{uid}/tasks/{yyyy-MM-dd} · tasksWeekly/{yyyy-Www} · tasksMonthly/{yyyy-MM}
// Her görev kendi düğümünde transaction ile güncellenir — telefonla yarışsa da kaybolmaz.

import { get, ref as dbRef, runTransaction, serverTimestamp, set } from "firebase/database";
import { kullaniciDb } from "./firebase";
import { ayAnahtari, gunAnahtari } from "./tarih";
import { sessizHata } from "./hata";
import { rozetYiliAnahtari } from "./sezon";
import {
  aylikGorevDurumYolu,
  aylikGorevTanimlari,
  gorevHedefi,
  gunlukGorevDurumYolu,
  gunlukGorevTanimlari,
  haftaAnahtari,
  haftalikGorevDurumYolu,
  haftalikGorevTanimlari,
  sinifSinirla,
  xpEkle,
  type GorevTanim,
} from "./veri";

export type GorevOlayTipi =
  | "test_bitti"
  | "defter_sayfa"
  | "defter_bitti"
  | "yazili_bitti";

export type GorevOlayi = {
  tip: GorevOlayTipi;
  sinif: number;
  dogru?: number;
  toplam?: number;
  sayfaFarki?: number;
  defterId?: string | null;
  /** Aynı konu testinin aynı göreve iki kez sayılmaması için (Android: testId). */
  testId?: string | null;
};

const AY_ADLARI = [
  "ocak", "subat", "mart", "nisan", "mayis", "haziran",
  "temmuz", "agustos", "eylul", "ekim", "kasim", "aralik",
];

function sayi(v: unknown): number {
  if (typeof v === "number") return Math.round(v);
  if (typeof v === "string") return Number.parseInt(v, 10) || 0;
  return 0;
}

function sadeAnahtar(ham: string | null | undefined): string {
  const s = (ham ?? "").trim().toLowerCase();
  if (!s) return "na";
  return s.replace(/\s+/g, "_").replace(/\|/g, "_").replace(/\//g, "_");
}

/* "a/b/c" yollu anahtarlar için iç içe nesne yardımcıları (Android MutableData.child davranışı). */
type Dugum = Record<string, unknown>;
function derinKopya(v: unknown): Dugum {
  return v && typeof v === "object" ? (JSON.parse(JSON.stringify(v)) as Dugum) : {};
}
function derinOku(kok: Dugum, yol: string): boolean {
  let d: unknown = kok;
  for (const p of yol.split("/").filter(Boolean)) {
    if (!d || typeof d !== "object") return false;
    d = (d as Dugum)[p];
  }
  return d === true;
}
function derinYaz(kok: Dugum, yol: string, deger: unknown): void {
  const parcalar = yol.split("/").filter(Boolean);
  let d: Dugum = kok;
  for (const p of parcalar.slice(0, -1)) {
    if (!d[p] || typeof d[p] !== "object") d[p] = {};
    d = d[p] as Dugum;
  }
  d[parcalar[parcalar.length - 1]] = deger;
}

/** Android `buildTestIdV1` — görev dedüplikasyonunun anahtarı. */
export function testIdUret(
  sinif: number,
  dersKey: string,
  konuKey: string,
  adimKey?: string | null
): string {
  const g = sinifSinirla(sinif);
  const adim = sadeAnahtar(adimKey) === "na" ? "s0" : sadeAnahtar(adimKey);
  return `v1|g${g}|${sadeAnahtar(dersKey)}|${sadeAnahtar(konuKey)}|${adim}`;
}

/**
 * Android `UserProgressRepository.onAllDailyTasksCompleted` — günün TÜM görevleri bitince
 * "gorevdedektifi" başarımı, günde bir kez (`dailyActivity/{gün}/allTasksAwarded`).
 * Android bunu görev özeti EKRANI açılınca kontrol ediyor; burada görev olayı işlenir
 * işlenmez kontrol ediliyor — ekrana bağlı kalmasın diye. Eskiden web'de fonksiyon vardı
 * ama hiçbir yerden çağrılmıyordu (14 Eyl 2026'da bulundu).
 */
async function tumGunlukGorevlerBittiyseOdullendir(uid: string, tanimlar: GorevTanim[], yol: string): Promise<void> {
  if (tanimlar.length === 0) return;
  try {
    const durum = ((await get(dbRef(kullaniciDb, yol))).val() ?? {}) as Record<string, Record<string, unknown>>;
    const hepsiBitti = tanimlar.every((t) => {
      const d = durum[t.id] ?? {};
      return d.completed === true || sayi(d.progress) >= Math.max(1, gorevHedefi(t));
    });
    if (!hepsiBitti) return;

    const kok = `users/${uid}/dailyActivity/${gunAnahtari()}`;
    const bayrak = await get(dbRef(kullaniciDb, `${kok}/allTasksAwarded`));
    if (bayrak.val() === true) return;
    await set(dbRef(kullaniciDb, `${kok}/allTasksAwarded`), true);
    await runTransaction(
      dbRef(kullaniciDb, `users/${uid}/achievements/gorevdedektifi/current`),
      (mevcut) => Math.max(0, sayi(mevcut) + 1)
    );
  } catch (e) {
    sessizHata("gorevdedektifi", e);
  }
}

/** Android `setMonthlyBadgeEarned` — aylık görev bitince o ayın rozeti işaretlenir. */
async function aylikRozetVer(uid: string): Promise<void> {
  const ayAdi = AY_ADLARI[new Date().getMonth()];
  if (!ayAdi) return;
  try {
    await set(dbRef(kullaniciDb, `users/${uid}/badges/${rozetYiliAnahtari()}/${ayAdi}`), true);
  } catch (e) {
    sessizHata("gorev", e);
    /* best-effort */
  }
}

/** Sonuç akışındaki "Görev özeti" ekranının çizdiği tek satır. */
export type GorevDegisimi = {
  id: string;
  baslik: string;
  xp: number;
  /** Aktivite ÖNCESİ ilerleme — çubuk buradan yeniye doğru canlanıyor. */
  onceki: number;
  yeni: number;
  hedef: number;
  /** Bu aktiviteyle YENİ tamamlandı mı (ödül burada veriliyor). */
  yeniBitti: boolean;
  donem: GorevDonemi;
};

export type GorevDonemi = "gunluk" | "haftalik" | "aylik";

type BolumSonucu = { degisenler: GorevDegisimi[]; yeniBitenler: GorevTanim[] };

/**
 * Bir dönemin (günlük/haftalık/aylık) görevlerini olaya göre ilerletir.
 * Android'deki `applyTo` ile birebir: her görev tek transaction, hedefe ulaşınca completed.
 */
async function bolumeUygula(
  tanimlar: GorevTanim[],
  temelYol: string,
  donemAnahtari: string,
  o: GorevOlayi,
  donem: GorevDonemi
): Promise<BolumSonucu> {
  const yeniBitenler: GorevTanim[] = [];
  const degisenler: GorevDegisimi[] = [];
  const bugun = gunAnahtari();

  for (const def of tanimlar) {
    const kind = (def.kind || "").toLowerCase();
    const hedef = Math.max(1, gorevHedefi(def));
    let oncedenBitmisti = false;
    // Transaction birden fazla kez çalışabilir; bu değerler her denemede yeniden
    // yazılır, sonuncusu commit edilen tabana ait olur.
    let oncekiKayit = 0;

    try {
      const islem = await runTransaction(dbRef(kullaniciDb, `${temelYol}/${def.id}`), (mevcut) => {
        const d = { ...((mevcut ?? {}) as Record<string, unknown>) };
        oncedenBitmisti = d.completed === true;

        const oncekiIlerleme = sayi(d.progress);
        oncekiKayit = oncekiIlerleme;
        if (oncedenBitmisti) {
          d.target = hedef;
          return d;
        }

        let yeni = oncekiIlerleme;

        const bitir = () => {
          d.progress = hedef;
          d.target = hedef;
          d.completed = true;
          d.completedAt = serverTimestamp();
        };

        // "Haftada X gün aktif ol" — gün başına bir kez sayılır
        if (kind === "weekly_active_days") {
          const sayilan = { ...((d.countedDays ?? {}) as Record<string, unknown>) };
          if (sayilan[bugun] !== true) {
            sayilan[bugun] = true;
            d.countedDays = sayilan;
            yeni = Math.min(hedef, oncekiIlerleme + 1);
          }
        }

        // streak_any: herhangi bir etkinlik görevi tamamlar
        if (kind === "streak_any") {
          bitir();
          return d;
        }

        // Aynı anda hem defter hem test isteyen görev
        const komboIsaretle = (alan: "comboSeenDefter" | "comboSeenTest", digeri: "comboSeenDefter" | "comboSeenTest") => {
          d[alan] = true;
          if (d[digeri] === true) {
            const sayilan = { ...((d.countedCombos ?? {}) as Record<string, unknown>) };
            if (sayilan[donemAnahtari] !== true) {
              sayilan[donemAnahtari] = true;
              d.countedCombos = sayilan;
              yeni = Math.min(hedef, oncekiIlerleme + 1);
            }
          }
        };

        if (o.tip === "defter_sayfa") {
          if (kind === "notebook_pages") {
            yeni = Math.max(oncekiIlerleme, oncekiIlerleme + (o.sayfaFarki ?? 0));
          }
        } else if (o.tip === "defter_bitti") {
          if (kind === "notebook_complete") {
            const anahtar = o.defterId;
            if (anahtar) {
              // ⚠️ defterId "ders/ünite" biçiminde. Android `child("countedNotebooks").child(key)`
              // yazar; Android SDK'da `/` YOL AYIRICIDIR → veri iç içe `countedNotebooks/ders/ünite`.
              // Burada eskiden `{"ders/ünite": true}` diye tek anahtar yazılıyordu; Firebase JS
              // anahtarda `/` kabul etmediği için transaction patlıyor, `catch → continue` yutuyor
              // ve "Konu defterini tamamla" görevi HİÇ artmıyordu (14 Eyl 2026'da bulundu).
              const sayilan = derinKopya(d.countedNotebooks);
              if (!derinOku(sayilan, anahtar)) {
                derinYaz(sayilan, anahtar, true);
                d.countedNotebooks = sayilan;
                yeni = Math.min(hedef, oncekiIlerleme + 1);
              }
            } else {
              yeni = Math.max(oncekiIlerleme, 1);
            }
          }
          if (kind === "combo_defter_test") komboIsaretle("comboSeenDefter", "comboSeenTest");
        } else if (o.tip === "test_bitti") {
          const dogru = Math.max(0, o.dogru ?? 0);
          const toplam = Math.max(0, o.toplam ?? 0);

          if (kind === "take_test") {
            const anahtar = o.testId;
            if (anahtar) {
              // testId varsa adım farklı olsa da aynı konu bir kez sayılır
              const sayilan = { ...((d.countedTests ?? {}) as Record<string, unknown>) };
              if (sayilan[anahtar] !== true) {
                sayilan[anahtar] = true;
                d.countedTests = sayilan;
                yeni = Math.min(hedef, oncekiIlerleme + 1);
              }
            } else {
              yeni = Math.min(hedef, oncekiIlerleme + 1);
            }
          }
          if (kind === "test_correct") yeni = Math.max(oncekiIlerleme, dogru);
          if (kind === "test_wrong_max") {
            const enFazlaYanlis = Math.max(0, sayi((def.params ?? {}).maxWrong));
            yeni = Math.max(0, toplam - dogru) <= enFazlaYanlis ? 1 : 0;
          }
          if (kind === "test_total_correct") yeni = Math.min(hedef, oncekiIlerleme + dogru);
          if (kind === "combo_defter_test") komboIsaretle("comboSeenTest", "comboSeenDefter");
        } else if (o.tip === "yazili_bitti") {
          if (kind === "yazili_complete") yeni = 1;
        }

        yeni = Math.min(hedef, Math.max(0, yeni));
        const bitti = yeni >= hedef;

        d.progress = yeni;
        d.target = hedef;
        d.completed = bitti;
        if (bitti) d.completedAt = serverTimestamp();
        return d;
      });
      if (!islem.committed) continue;

      const kayit = (islem.snapshot.val() ?? {}) as Record<string, unknown>;
      const yeniIlerleme = sayi(kayit.progress);
      const yeniBitti = kayit.completed === true && !oncedenBitmisti;

      if (yeniIlerleme > oncekiKayit || yeniBitti) {
        degisenler.push({
          id: def.id,
          baslik: def.baslik,
          xp: def.xp,
          onceki: oncekiKayit,
          yeni: yeniIlerleme,
          hedef,
          yeniBitti,
          donem,
        });
      }

      // ⚠️ Ödül YALNIZ görev yeni tamamlandığında verilir (Android TaskManager:858
      // `newlyCompleted = completed && !wasCompletedBefore`). Eskiden burada
      // "ilerledi mi" bakılıyordu: xpEkle tekrarı engellemediği için 3 adımlı bir
      // görev ödülünü ÜÇ KEZ veriyordu ve şişen puan lig tablosuna da yansıyordu.
      if (yeniBitti) yeniBitenler.push(def);
    } catch (e) {
      // Bir görev yazılamazsa diğerleri denensin — ama SESSİZ kalmasın: countedNotebooks'taki
      // "/" hatası tam burada aylarca yutulmuştu.
      sessizHata("gorev", e);
      continue;
    }
  }

  return { degisenler, yeniBitenler };
}

/**
 * Tek giriş noktası — Android `TaskManager.applyEvent`.
 * Günlük + haftalık + aylık görevleri sırayla ilerletir, yeni tamamlananların XP'sini yazar.
 * Dönüş: ilerleyen görevlerin önceki/yeni değerleri — sonuç akışındaki
 * "Görev özeti" ekranı çubukları bu verilerle canlandırıyor.
 */
export async function gorevOlayiUygula(uid: string, o: GorevOlayi): Promise<GorevDegisimi[]> {
  if (!uid) return [];
  const g = sinifSinirla(o.sinif);
  const degisenler: GorevDegisimi[] = [];

  const bolumler: {
    tanimlar: GorevTanim[]; yol: string; donem: string; aylik: boolean; etiket: GorevDonemi;
  }[] = [];
  try {
    bolumler.push({
      tanimlar: await gunlukGorevTanimlari(),
      yol: gunlukGorevDurumYolu(uid),
      donem: gunAnahtari(),
      aylik: false,
      etiket: "gunluk",
    });
  } catch { /* katalog okunamadı */ }
  try {
    bolumler.push({
      tanimlar: await haftalikGorevTanimlari(),
      yol: haftalikGorevDurumYolu(uid),
      donem: haftaAnahtari(),
      aylik: false,
      etiket: "haftalik",
    });
  } catch { /* katalog okunamadı */ }
  try {
    bolumler.push({
      tanimlar: await aylikGorevTanimlari(),
      yol: aylikGorevDurumYolu(uid),
      donem: ayAnahtari(),
      aylik: true,
      etiket: "aylik",
    });
  } catch { /* katalog okunamadı */ }

  for (const b of bolumler) {
    if (b.tanimlar.length === 0) continue;
    const sonuc = await bolumeUygula(b.tanimlar, b.yol, b.donem, o, b.etiket);
    degisenler.push(...sonuc.degisenler);
    if (b.etiket === "gunluk") await tumGunlukGorevlerBittiyseOdullendir(uid, b.tanimlar, b.yol);

    // `yeniBitenler` artık gerçekten YENİ TAMAMLANANLAR (bkz. bolumeUygula sonu).
    for (const def of sonuc.yeniBitenler) {
      // Aylık rozet de yalnız tamamlanınca veriliyor (Android: `completed && isMonthly`).
      if (b.aylik) await aylikRozetVer(uid);
      if (def.xp > 0) {
        try {
          await xpEkle(uid, g, def.xp, `task_${def.id}`);
        } catch { /* XP yazılamazsa görev yine de tamamlanmış sayılır */ }
      }
    }
  }

  return degisenler;
}
