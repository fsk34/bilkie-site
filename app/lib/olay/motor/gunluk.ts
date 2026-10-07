// ⚠️ OTOMATİK KOPYA — elle değiştirme. Kaynak: functions/src/motor/gunluk.ts (scripts/motor_esitle.sh)
// "Aynı gün hem X hem Y" başarımları — Android UserProgressRepository.setDailyFlagAndCheck (:198).
// dailyActivity/{gün} üzerinde yerel kopya tutulur: aynı olayda birden çok bayrak (test hatasız →
// testDone + hatasizTestDone) sırayla uygulanır.

import { dugum, type Dugum } from "./sayi";
import { artir, type Yazilacak } from "./tipler";

export class GunlukBayraklar {
  readonly durum: Dugum;
  private readonly kok: string;
  private readonly uid: string;
  private readonly yaz: Yazilacak;

  constructor(uid: string, gun: string, ham: unknown, yaz: Yazilacak) {
    this.uid = uid;
    this.kok = `users/${uid}/dailyActivity/${gun}`;
    this.durum = structuredClone(dugum(ham));
    this.yaz = yaz;
  }

  /** Bayrağı koy; diğer bayrak da varsa ve ödül verilmediyse ödül bayrağı + başarım +1. */
  koy(bayrak: string, diger: string, odul: string, basarim: string): void {
    this.durum[bayrak] = true;
    this.yaz[`${this.kok}/${bayrak}`] = true;
    if (this.durum[diger] === true && this.durum[odul] !== true) {
      this.durum[odul] = true;
      this.yaz[`${this.kok}/${odul}`] = true;
      this.yaz[`users/${this.uid}/achievements/${basarim}/current`] = artir(1);
    }
  }

  testBitti(hatasiz: boolean): void {
    this.koy("testDone", "defterDone", "kusursuzsanatAwarded", "kusursuzsanat");
    if (hatasiz) this.koy("hatasizTestDone", "hatasizYaziliDone", "inceisciAwarded", "inceisci");
  }

  defterIlkKez(): void {
    this.koy("defterDone", "testDone", "kusursuzsanatAwarded", "kusursuzsanat");
  }

  yaziliHatasiz(): void {
    this.koy("hatasizYaziliDone", "hatasizTestDone", "inceisciAwarded", "inceisci");
  }

  /** Görev Dedektifi — günde bir kez (allTasksAwarded) */
  gorevDedektifi(): void {
    if (this.durum.allTasksAwarded === true) return;
    this.durum.allTasksAwarded = true;
    this.yaz[`${this.kok}/allTasksAwarded`] = true;
    this.yaz[`users/${this.uid}/achievements/gorevdedektifi/current`] = artir(1);
  }
}
