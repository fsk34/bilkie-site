// Görev YAZMA katmanı — Android `domain/TaskManager.kt` → applyEvent portu.
// Web görev ilerlemesini şimdiye kadar yalnızca OKUYORDU. Tanımların okunması zaten
// `veri.ts`te var (gunluk/haftalik/aylikGorevTanimlari); burada YAZMA tarafı.
//
// Yollar: users/{uid}/tasks/{yyyy-MM-dd} · tasksWeekly/{yyyy-Www} · tasksMonthly/{yyyy-MM}
// Her görev kendi düğümünde transaction ile güncellenir — telefonla yarışsa da kaybolmaz.

import { ref as dbRef, runTransaction, serverTimestamp, set } from "firebase/database";
import { kullaniciDb } from "./firebase";
import { ayAnahtari, gunAnahtari } from "./tarih";
import { sessizHata } from "./hata";
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

const ROZET_SEZON = "2025_2026_guz";
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

/** Android `setMonthlyBadgeEarned` — aylık görev bitince o ayın rozeti işaretlenir. */
async function aylikRozetVer(uid: string): Promise<void> {
  const ayAdi = AY_ADLARI[new Date().getMonth()];
  if (!ayAdi) return;
  try {
    await set(dbRef(kullaniciDb, `users/${uid}/badges/${ROZET_SEZON}/${ayAdi}`), true);
  } catch (e) {
    sessizHata("gorev", e);
    /* best-effort */
  }
}

type BolumSonucu = { ilerledi: boolean; yeniBitenler: GorevTanim[] };

/**
 * Bir dönemin (günlük/haftalık/aylık) görevlerini olaya göre ilerletir.
 * Android'deki `applyTo` ile birebir: her görev tek transaction, hedefe ulaşınca completed.
 */
async function bolumeUygula(
  tanimlar: GorevTanim[],
  temelYol: string,
  donemAnahtari: string,
  o: GorevOlayi
): Promise<BolumSonucu> {
  const yeniBitenler: GorevTanim[] = [];
  let ilerledi = false;
  const bugun = gunAnahtari();

  for (const def of tanimlar) {
    const kind = (def.kind || "").toLowerCase();
    const hedef = Math.max(1, gorevHedefi(def));
    let buGorevIlerledi = false;
    let oncedenBitmisti = false;

    try {
      await runTransaction(dbRef(kullaniciDb, `${temelYol}/${def.id}`), (mevcut) => {
        const d = { ...((mevcut ?? {}) as Record<string, unknown>) };
        buGorevIlerledi = false;
        oncedenBitmisti = d.completed === true;

        const oncekiIlerleme = sayi(d.progress);
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
          buGorevIlerledi = true;
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
              const sayilan = { ...((d.countedNotebooks ?? {}) as Record<string, unknown>) };
              if (sayilan[anahtar] !== true) {
                sayilan[anahtar] = true;
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
        if (yeni > oncekiIlerleme || bitti) buGorevIlerledi = true;

        d.progress = yeni;
        d.target = hedef;
        d.completed = bitti;
        if (bitti) d.completedAt = serverTimestamp();
        return d;
      });
    } catch {
      continue; // bir görev yazılamazsa diğerleri denensin
    }

    if (buGorevIlerledi) {
      ilerledi = true;
      if (!oncedenBitmisti) yeniBitenler.push(def);
    }
  }

  return { ilerledi, yeniBitenler };
}

/**
 * Tek giriş noktası — Android `TaskManager.applyEvent`.
 * Günlük + haftalık + aylık görevleri sırayla ilerletir, yeni tamamlananların XP'sini yazar.
 * Dönüş: en az bir görevde ilerleme oldu mu (sonuç ekranı bunu gösteriyor).
 */
export async function gorevOlayiUygula(uid: string, o: GorevOlayi): Promise<boolean> {
  if (!uid) return false;
  const g = sinifSinirla(o.sinif);
  let ilerledi = false;

  const bolumler: { tanimlar: GorevTanim[]; yol: string; donem: string; aylik: boolean }[] = [];
  try {
    bolumler.push({
      tanimlar: await gunlukGorevTanimlari(),
      yol: gunlukGorevDurumYolu(uid),
      donem: gunAnahtari(),
      aylik: false,
    });
  } catch { /* katalog okunamadı */ }
  try {
    bolumler.push({
      tanimlar: await haftalikGorevTanimlari(),
      yol: haftalikGorevDurumYolu(uid),
      donem: haftaAnahtari(),
      aylik: false,
    });
  } catch { /* katalog okunamadı */ }
  try {
    bolumler.push({
      tanimlar: await aylikGorevTanimlari(),
      yol: aylikGorevDurumYolu(uid),
      donem: ayAnahtari(),
      aylik: true,
    });
  } catch { /* katalog okunamadı */ }

  for (const b of bolumler) {
    if (b.tanimlar.length === 0) continue;
    const sonuc = await bolumeUygula(b.tanimlar, b.yol, b.donem, o);
    if (sonuc.ilerledi) ilerledi = true;

    for (const def of sonuc.yeniBitenler) {
      if (b.aylik) await aylikRozetVer(uid);
      // Görev yeni tamamlandıysa ödülü yazılır (Android: onComplete içinde addXp)
      if (def.xp > 0) {
        try {
          await xpEkle(uid, g, def.xp, `task_${def.id}`);
        } catch { /* XP yazılamazsa görev yine de tamamlanmış sayılır */ }
      }
    }
  }

  return ilerledi;
}
