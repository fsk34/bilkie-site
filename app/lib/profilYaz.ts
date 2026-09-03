// Profil YAZMA işlemleri — şimdilik tek iş: SINIF DEĞİŞTİRME.
// Kaynak: Android `ProfileScreen.kt` → saveGrade() + `MainActivity.kt` →
// syncLeagueIdentityAcrossAllGrades(). Zincir birebir korunuyor, çünkü sınıf değişimi
// tek bir alanı değil dört ayrı yeri ilgilendiriyor:
//
//   1. profile/grade + profile/gradeLabel   → içeriğin tamamı (ders/ünite/konu) buna bakar
//   2. streak/gradeChangedAt                → en uzun seri bu sınıfa özel sayılsın diye
//   3. leaderboards/.../grade{3..8}/{uid}   → eski sınıflardaki satırda ad/avatar sabit kalsın
//   4. eski sınıfın lig satırı 0 puanlıysa  → hayalet kayıt temizliği
//
// ⚠️ 3. adımda `points` alanına DOKUNULMAZ: kullanıcı o sınıfta gerçekten puan kazanmış
// olabilir; yalnızca görünen alanlar (ad, avatar) tazelenir.

import { get, ref as dbRef, remove, runTransaction, update } from "firebase/database";
import { kullaniciDb } from "./firebase";
import { gunAnahtari } from "./tarih";
import { ligTablosuYolu, profilYolu, sinifSinirla } from "./veri";
import { KULLANICI_ADI_DESENI } from "./kayit";
import { sessizHata } from "./hata";

function sayi(v: unknown): number {
  if (typeof v === "number") return Math.round(v);
  if (typeof v === "string") return Number.parseInt(v, 10) || 0;
  return 0;
}

/**
 * Android `syncLeagueIdentityAcrossAllGrades` — 3-8. sınıfların lig satırlarında
 * görünen ad ve avatarı tazeler. Puan korunur.
 *
 * ⚠️ Android'den BİLEREK ayrılıyor: orada doğrudan `updateChildren` çağrılıyor ve RTDB
 * olmayan düğümü OLUŞTURUYOR. Sonuç: kullanıcı avatarını/adını/sınıfını her
 * değiştirdiğinde girmediği 5 lige de puansız birer satır düşüyor. Bu satırlar `points`
 * alanı bile taşımadığı için 0 sayılıyor ve herkesin Başlangıç listesinin başında
 * "0 puanlı hayalet" olarak görünüyorlar (3 Eyl 2026 dökümünde 100 satırın 48'i buydu).
 * Burada önce satırın VAR OLDUĞU doğrulanıyor; yoksa dokunulmuyor.
 */
export async function ligKimligiEsitle(uid: string, ad: string, avatar: string): Promise<void> {
  const isim = ad.trim();
  if (!isim) return;
  for (let g = 3; g <= 8; g++) {
    const yol = `${ligTablosuYolu(g)}/${uid}`;
    try {
      const mevcut = await get(dbRef(kullaniciDb, yol));
      if (!mevcut.exists()) continue;   // o ligde satırı yok → oluşturma
      await update(dbRef(kullaniciDb, yol), {
        name: isim,
        avatar: avatar.trim() || "profil0",
        atMs: Date.now(),
      });
    } catch (e) {
      sessizHata("ligKimligi", e);
    }
  }
}

/**
 * Eski sınıfın lig satırı 0 puanlıysa siler (Android'deki hayalet kayıt temizliği).
 * Puanı varsa BIRAKILIR — kullanıcı o sınıfta gerçekten oynamış demektir.
 */
async function eskiLigSatiriniTemizle(uid: string, eskiSinif: number): Promise<void> {
  try {
    const yol = `${ligTablosuYolu(eskiSinif)}/${uid}`;
    const snap = await get(dbRef(kullaniciDb, yol));
    if (!snap.exists()) return;
    const puan = sayi((snap.val() as Record<string, unknown>)?.points);
    if (puan === 0) await remove(dbRef(kullaniciDb, yol));
  } catch (e) {
    sessizHata("eskiLigSatiri", e);
  }
}

export type SinifDegisimArgs = {
  uid: string;
  eskiSinif: number;
  yeniSinif: number;
  /** Lig satırında görünecek ad — uygulamada kullanıcı adı, yoksa ad soyad. */
  ad: string;
  avatar: string;
};

/**
 * Sınıfı değiştirir. Profil yazımı BAŞARISIZ olursa hata fırlatır (çağıran ekranda
 * geri alınır); sonraki adımlar best-effort — biri düşse de sınıf değişmiş sayılır.
 */
export async function sinifDegistir(a: SinifDegisimArgs): Promise<void> {
  const yeni = sinifSinirla(a.yeniSinif);
  const eski = sinifSinirla(a.eskiSinif);

  // 1) Tek doğru kaynak: profile. Bu yazılmazsa işlem gerçekleşmemiş sayılır.
  await update(dbRef(kullaniciDb, profilYolu(a.uid)), {
    grade: yeni,
    gradeLabel: `${yeni}. Sınıf`,
  });

  // 2) Sınıf değişim tarihi — en uzun seri hesabı bu sınıfa özel sayılsın
  try {
    await update(dbRef(kullaniciDb, `users/${a.uid}/streak`), {
      gradeChangedAt: gunAnahtari(),
    });
  } catch (e) {
    sessizHata("gradeChangedAt", e);
  }

  // 3) Lig kimliği + 4) eski satır temizliği
  await ligKimligiEsitle(a.uid, a.ad, a.avatar);
  if (eski !== yeni) await eskiLigSatiriniTemizle(a.uid, eski);
}

/* ------------------------------------------------------- kullanıcı adı / avatar */

export type KullaniciAdiDurumu = "bosta" | "kontrol" | "uygun" | "alinmis" | "kisa" | "gecersiz";

/**
 * Kullanıcı adı müsait mi? (Android'deki debounce'lu kontrolün karşılığı.)
 * `usernames/{ad}` düğümünün sahibi yoksa ya da zaten bizsek uygundur.
 */
export async function kullaniciAdiDurumu(uid: string, ad: string): Promise<KullaniciAdiDurumu> {
  const a = ad.trim();
  if (a.length < 3) return "kisa";
  if (!KULLANICI_ADI_DESENI.test(a)) return "gecersiz";
  try {
    const snap = await get(dbRef(kullaniciDb, `usernames/${a}`));
    const sahip = snap.val();
    return sahip == null || sahip === uid ? "uygun" : "alinmis";
  } catch (e) {
    sessizHata("kullaniciAdiKontrol", e);
    return "bosta";   // okunamadıysa engelleme; asıl karar yazma anında verilir
  }
}

/**
 * Adı TRANSACTION ile talep eder — Android'deki `claimUsername` önce okuyup sonra
 * yazıyor; iki kişi aynı anda aynı adı isterse ikisi de başarılı sanıyor ve sonuncusu
 * diğerininkini eziyordu. Transaction bunu kapatır, davranış aynı kalır.
 * Dönüş: alındı mı.
 */
async function kullaniciAdiTalepEt(uid: string, ad: string): Promise<boolean> {
  const sonuc = await runTransaction(dbRef(kullaniciDb, `usernames/${ad}`), (mevcut) => {
    if (mevcut != null && mevcut !== uid) return undefined;   // başkasının → iptal
    return uid;
  });
  return sonuc.committed && sonuc.snapshot.val() === uid;
}

export class KullaniciAdiAlinmis extends Error {
  constructor() {
    super("Bu kullanıcı adı alınmış, lütfen başka bir ad dene");
    this.name = "KullaniciAdiAlinmis";
  }
}

/**
 * Kullanıcı adını değiştirir — Android `ProfileEditScreen` Kaydet zinciri:
 * talep → profile/username → eski dizini sil → lig satırlarında adı tazele.
 */
export async function kullaniciAdiDegistir(
  uid: string, yeniAd: string, eskiAd: string, avatar: string
): Promise<void> {
  const yeni = yeniAd.trim();
  if (!KULLANICI_ADI_DESENI.test(yeni)) {
    throw new Error("Kullanıcı adı 3-30 karakter olmalı; harf, rakam ve _ içerebilir");
  }
  if (yeni === eskiAd.trim()) return;

  if (!(await kullaniciAdiTalepEt(uid, yeni))) throw new KullaniciAdiAlinmis();

  // Kritik adım: profil alanı. Burası yazılamazsa talep edilen adı geri bırak.
  try {
    await update(dbRef(kullaniciDb, profilYolu(uid)), { username: yeni });
  } catch (e) {
    try { await remove(dbRef(kullaniciDb, `usernames/${yeni}`)); } catch { /* yoksay */ }
    throw e;
  }

  // Eski dizin kaydı (best-effort — kural engellese de kayıt geçerli)
  const eski = eskiAd.trim();
  if (eski && eski !== yeni) {
    try {
      await remove(dbRef(kullaniciDb, `usernames/${eski}`));
    } catch (e) {
      sessizHata("eskiKullaniciAdi", e);
    }
  }

  await ligKimligiEsitle(uid, yeni, avatar);
}

/**
 * Avatarı değiştirir. Android'de seçiciye dokunulduğu an kaydediliyor (ayrı Kaydet yok),
 * ardından lig satırlarındaki avatar da tazeleniyor.
 */
export async function avatarDegistir(
  uid: string, yeniAvatar: string, kullaniciAdi: string
): Promise<void> {
  const a = yeniAvatar.trim() || "profil0";
  await update(dbRef(kullaniciDb, profilYolu(uid)), { avatar: a });
  await ligKimligiEsitle(uid, kullaniciAdi, a);
}
