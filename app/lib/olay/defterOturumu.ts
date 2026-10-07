// Bir defter oturumunun olayı — şartname §4, §7.2 (Android data/olay/DefterOturumu.kt portu).
// Sayfa başına sunucu çağrısı yerine oturum boyunca geçilen yeni sayfalar ve seri eşiği kutudaki
// taslakta birikir; çıkışta ya da "Devam Et"te TEK olay gider. Sekme kapanırsa taslak sonraki açılışta
// olaya çevrilir (kutu.ts yetimTaslaklar).
//
// Karar oturumun başında BİR KEZ verilir (baslat): null → eski yol. Aynı oturum asla iki yoldan yazılmaz.
//
// Kaldığı sayfa (D9) ve istemcinin "bitti" alanı da olayla AYNI yazmaya girer: web'de düz yazmalar
// yalnız bellekte durur, sekme kapanınca giderdi; kutudaki yazma girişte yeniden gönderilir.

import { serverTimestamp } from "firebase/database";
import { sinifSinirla } from "../veri";
import { olayModuAcikMi } from "./mod";
import { XP } from "./motor/motor";
import { taslakKapat, taslakSil, taslakYaz, type Yazilan } from "./kutu";

const TUR = "defter";
const SAYFA_UST = 500;   // sunucu doğrulaması (dogrula.ts)
const ANAHTAR = /^[a-z0-9_]{1,48}$/;

export class DefterOturumu {
  private readonly ad = `defter_${Date.now()}`;
  private sayfa = 0;
  private seri = false;
  private kapandi = false;
  private gecerliSayfa = 0;   // 1 tabanlı; 0 = henüz bilinmiyor
  private toplamSayfa = 0;

  private constructor(
    private readonly uid: string,
    private readonly sinif: number,
    private readonly ders: string,
    private readonly konu: string
  ) {}

  /** Olay modu açık ve anahtarlar sunucunun kabul ettiği biçimdeyse oturum; değilse null (eski yol). */
  static baslat(uid: string | null | undefined, sinif: number, ders: string, konu: string): DefterOturumu | null {
    if (!uid || !olayModuAcikMi(uid)) return null;
    if (!ANAHTAR.test(ders) || !ANAHTAR.test(konu)) return null;
    return new DefterOturumu(uid, sinifSinirla(sinif), ders, konu);
  }

  private alanlar(bitti: boolean): Record<string, unknown> {
    return { ders: this.ders, konu: this.konu, sayfa: Math.min(this.sayfa, SAYFA_UST), seri: this.seri || bitti, bitti };
  }

  /** users/{uid} altına göreli "İ" yolları (şartname D9) + bittiyse istemcinin kendi bitti alanı. */
  private istemci(bitti: boolean): Record<string, unknown> {
    const y: Record<string, unknown> = {};
    const kok = `progress_defter/grade${this.sinif}/${this.ders}/${this.konu}`;
    if (this.gecerliSayfa > 0) y[`${kok}/currentPage`] = this.gecerliSayfa;
    if (this.toplamSayfa > 0) y[`${kok}/totalPages`] = this.toplamSayfa;
    if (Object.keys(y).length > 0) y[`${kok}/updatedAt`] = serverTimestamp();
    // Ekranlar "bitti"yi sunucu işareti (progress_defter_done) YA DA bu alandan okur: internetsizken de
    // anında tamamlanmış görünür. Ödül kararı (ilk kez) yine yalnız sunucuda.
    if (bitti) y[`${kok}/bitti`] = true;
    return y;
  }

  private kaydet(): void {
    taslakYaz(this.uid, this.ad, TUR, this.sinif, this.alanlar(false), this.istemci(false));
  }

  /** Ekrandaki sayfa (1 tabanlı) ve toplam: taslağa işlenir, olayla birlikte gider. */
  sayfaDurumu(gecerli: number, toplam: number): void {
    if (this.kapandi || (gecerli === this.gecerliSayfa && toplam === this.toplamSayfa)) return;
    this.gecerliSayfa = gecerli;
    this.toplamSayfa = toplam;
    if (this.sayfa > 0 || this.seri) this.kaydet();   // birikecek bir şey yoksa taslak açılmaz
  }

  /** Bu oturumda yeni bir sayfa geçildi (görev: N sayfa). */
  sayfaGecti(): void {
    if (this.kapandi) return;
    this.sayfa += 1;
    this.kaydet();
  }

  /** 10. ya da son sayfaya ulaşıldı (seri). */
  seriyeUlasti(): void {
    if (this.kapandi || this.seri) return;
    this.seri = true;
    this.kaydet();
  }

  /** Ekrandan çıkış: birikmiş bir şey varsa olay, yoksa taslak atılır. */
  kapat(): Yazilan | null {
    if (this.kapandi) return null;
    this.kapandi = true;
    if (this.sayfa === 0 && !this.seri) {
      taslakSil(this.uid, this.ad);
      return null;
    }
    return taslakKapat(this.uid, this.ad, TUR, this.sinif, this.alanlar(false), this.istemci(false));
  }

  /**
   * Son sayfada "Devam Et": bitti = true (ilk kezse sunucu XP/başarım/görev verir).
   * [ilkKez]: açılışta okunan işarete göre — yalnız ana ekran puan tahmini için (karar sunucuda).
   */
  bitir(ilkKez: boolean): Yazilan | null {
    if (this.kapandi) return null;
    this.kapandi = true;
    return taslakKapat(this.uid, this.ad, TUR, this.sinif, this.alanlar(true), this.istemci(true),
      ilkKez ? XP.DEFTER : 0);
  }
}
