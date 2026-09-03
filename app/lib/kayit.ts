// Web kayıt akışının veri katmanı.
// Kaynak: Android `RegisterScreens.kt` (finalizeRegistrationFromDraft + postRegisterAsync)
// ve `HomeScreen.kt` (assignShortIdIfMissing / assignUsernameIfMissing).
// KURAL: "profil yoksa hesap da yok" — Auth kaydı açılır ama profil yazılamazsa
// Auth kullanıcısı da silinir; yarım hesap bırakılmaz.

import { get, ref as dbRef, serverTimestamp, set, update } from "firebase/database";
import { deleteUser, type User } from "firebase/auth";
import { kullaniciDb } from "./firebase";
import { profilYolu, sinifSinirla } from "./veri";
import { gunAnahtari } from "./tarih";

export const URL_SARTLAR = "https://www.bilkie.com/sartlar";
export const URL_GIZLILIK = "https://www.bilkie.com/gizlilik";

// Android: AppConstants.EMAIL_REGEX / USERNAME_REGEX
const EPOSTA_DESENI = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
/** Android AppConstants.USERNAME_REGEX — küçük harf, rakam, alt çizgi, Türkçe harf; 3-30. */
export const KULLANICI_ADI_DESENI = /^[a-z0-9_çğışöü]{3,30}$/;

/** Android `normalizeEmail`: yerel kısım korunur, alan adı küçültülür. */
export function epostaNormalize(e: string): string {
  const k = e.trim();
  const at = k.indexOf("@");
  if (at <= 0) return k;
  return k.slice(0, at) + "@" + k.slice(at + 1).toLowerCase();
}

/** Android `emailKey`: RTDB anahtarında nokta kullanılamaz. */
export function epostaAnahtari(e: string): string {
  return epostaNormalize(e).replace(/\./g, ",");
}

export function epostaGecerli(e: string): boolean {
  const k = e.trim();
  const at = k.indexOf("@");
  if (at <= 0 || at === k.length - 1) return false;
  return EPOSTA_DESENI.test(epostaNormalize(k));
}

export const AVATARLAR = Array.from({ length: 16 }, (_, i) => `profil${i}`);
export const SINIFLAR = [3, 4, 5, 6, 7, 8];

/* ------------------------------------------------------------------- onay */

/** Onayın alındığı AN yazılır; hangi metinlere onay verildiği adresleriyle durur. */
export function onayDugumu() {
  return {
    acceptedAt: serverTimestamp(),
    termsUrl: URL_SARTLAR,
    privacyUrl: URL_GIZLILIK,
    source: "web_register",
  };
}

/* --------------------------------------------------------------- dizinler */

/** Android `assignShortIdIfMissing`: uid'den türetilen tabandan başlayıp boş kimlik arar. */
export async function kisaKimlikAta(uid: string): Promise<void> {
  try {
    const yol = `${profilYolu(uid)}/shortId`;
    const mevcut = await get(dbRef(kullaniciDb, yol));
    if (typeof mevcut.val() === "number" && mevcut.val() >= 10000) return;

    // Android'deki String.hashCode ile aynı değeri üretir (32-bit taşmalı)
    let h = 0;
    for (let i = 0; i < uid.length; i++) h = (Math.imul(31, h) + uid.charCodeAt(i)) | 0;
    let aday = 10001 + Math.abs(h % 5000);

    for (let i = 0; i < 200; i++) {
      try {
        // Kural yalnızca boşsa (ya da zaten bizimse) yazdırır; doluysa set hata atar.
        await set(dbRef(kullaniciDb, `userIds/${aday}`), uid);
        await set(dbRef(kullaniciDb, yol), aday);
        return;
      } catch (e) {
        // Kural reddettiyse sıradaki aday da reddedilir — 200 boş istek atma
        if (izinHatasi(e)) return;
        aday += 1;
      }
    }
  } catch {
    /* kimlik atanamazsa kayıt yine de geçerli — mobilde de best-effort */
  }
}

/** Reddedilme adayın dolu olmasından mı, kuralın izin vermemesinden mi? */
function izinHatasi(e: unknown): boolean {
  const m = ((e as { code?: string; message?: string })?.code ?? "") +
            " " + ((e as { message?: string })?.message ?? "");
  return /permission[_ ]denied/i.test(m);
}

function trAscii(s: string): string {
  return s
    .toLowerCase()
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u");
}

/** Android `assignUsernameIfMissing`: addan taban üretir, doluysa sayı ekler. */
export async function kullaniciAdiAta(uid: string, adSoyad: string): Promise<void> {
  try {
    const yol = `${profilYolu(uid)}/username`;
    const mevcut = await get(dbRef(kullaniciDb, yol));
    if (typeof mevcut.val() === "string" && mevcut.val().trim()) return;

    const parcalar = adSoyad
      .trim()
      .split(/\s+/)
      .map((t) => trAscii(t).replace(/[^a-z0-9_]/g, ""))
      .filter(Boolean);
    // "Al" gibi kısa ilk ad tek başına yetmez; 3 karaktere ulaşana kadar birleştirilir
    let taban = parcalar.reduce((acc, t) => (acc.length >= 3 ? acc : acc + t), "");
    if (taban.length < 3) taban = `bilkie${Math.floor(1000 + Math.random() * 9000)}`;
    taban = taban.slice(0, 24);

    for (let i = 0; i < 500; i++) {
      const aday = i === 0 ? taban : `${taban}${i}`;
      if (!KULLANICI_ADI_DESENI.test(aday)) continue;
      try {
        await set(dbRef(kullaniciDb, `usernames/${aday}`), uid);
        await set(dbRef(kullaniciDb, yol), aday);
        return;
      } catch (e) {
        if (izinHatasi(e)) return;
        /* dolu, sıradaki aday */
      }
    }
  } catch {
    /* best-effort */
  }
}

/** E-posta dizini + kısa kimlik + kullanıcı adı. Auth gerektirir, çıkıştan ÖNCE çağrılmalı. */
export async function kayitSonrasiDizinler(uid: string, adSoyad: string, eposta: string): Promise<void> {
  try {
    await set(dbRef(kullaniciDb, `emails/${epostaAnahtari(eposta)}`), uid);
  } catch {
    /* best-effort */
  }
  await kisaKimlikAta(uid);
  await kullaniciAdiAta(uid, adSoyad);
}

/* ---------------------------------------------------------------- profil */

export type ProfilTaslagi = {
  adSoyad: string;
  eposta: string;
  sinif: number;
  avatar: string;
  onayVerildi: boolean;
};

/** Android'deki 3 denemeli profil yazımı — token yayılmadan gelen hatayı yutmasın diye. */
async function profiliYaz(uid: string, dugum: Record<string, unknown>): Promise<boolean> {
  for (let deneme = 0; deneme < 3; deneme++) {
    try {
      if (deneme > 0) await new Promise((r) => setTimeout(r, 1500 * deneme));
      await update(dbRef(kullaniciDb, profilYolu(uid)), dugum);
      return true;
    } catch {
      /* sıradaki deneme */
    }
  }
  return false;
}

function profilDugumu(t: ProfilTaslagi, kaynak: string): Record<string, unknown> {
  const sinif = sinifSinirla(t.sinif);
  const dugum: Record<string, unknown> = {
    fullName: t.adSoyad,
    name: t.adSoyad, // Android her iki alanı da yazıyor
    email: t.eposta,
    avatar: t.avatar || "profil0",
    grade: sinif,
    gradeLabel: `${sinif}. Sınıf`,
    createdAt: serverTimestamp(),
  };
  if (t.onayVerildi) dugum.consent = { ...onayDugumu(), source: kaynak };
  return dugum;
}

/**
 * E-posta/parola kaydının son adımı. Auth kullanıcısı ÇAĞIRAN tarafından açılır;
 * burada profil yazılır, yazılamazsa Auth kaydı geri alınır.
 */
export async function kaydiTamamla(user: User, taslak: ProfilTaslagi): Promise<void> {
  const yazildi = await profiliYaz(user.uid, profilDugumu(taslak, "web_register"));
  if (!yazildi) {
    // Temiz geri alma: profilsiz Auth kaydı bırakma
    try {
      await deleteUser(user);
    } catch {
      /* silinemezse çağıran signOut yapıyor */
    }
    throw new Error("Profil kaydedilemedi. Lütfen tekrar deneyin.");
  }
  await kayitSonrasiDizinler(user.uid, taslak.adSoyad, taslak.eposta);
}

/**
 * Google ile gelen YENİ kullanıcının kaydı. Auth kaydı zaten var (popup açtı);
 * profil ilk kez burada yazılıyor — bu ana kadar veritabanında hiçbir şey yok.
 */
export async function googleKaydiniTamamla(
  user: User,
  sinif: number,
  avatar: string
): Promise<void> {
  const eposta = user.email ?? "";
  const ad =
    (user.displayName ?? "").trim() ||
    eposta.split("@")[0] ||
    `bilkie${Math.floor(1000 + Math.random() * 9000)}`;

  const yazildi = await profiliYaz(
    user.uid,
    profilDugumu({ adSoyad: ad, eposta, sinif, avatar, onayVerildi: true }, "google_onboarding")
  );
  if (!yazildi) throw new Error("Kayıt tamamlanamadı. Bağlantını kontrol edip tekrar dene.");

  // Sınıf değişimi serisi bugünden başlasın (Android: streak/gradeChangedAt)
  try {
    await set(dbRef(kullaniciDb, `users/${user.uid}/streak/gradeChangedAt`), gunAnahtari());
  } catch {
    /* best-effort */
  }
  await kayitSonrasiDizinler(user.uid, ad, eposta);
}

/**
 * Google kaydı yarıda bırakıldı: profil hiç yazılmadı, geriye kalan boş Auth kaydı silinir.
 * "Çıkarsan kayıt oluşmaz" sözü böylece birebir doğru olur (Android: cancelRegistration).
 */
export async function googleKaydiniIptalEt(user: User): Promise<void> {
  try {
    await set(dbRef(kullaniciDb, `users/${user.uid}`), null);
  } catch {
    /* savunma amaçlı; tasarım gereği burada bir şey olmamalı */
  }
  await deleteUser(user);
}

/** Firebase Auth hata kodlarını kullanıcı diline çevirir (Android: firebaseAuthErrorMessage). */
export function kayitHataMetni(err: unknown): string {
  const kod = (err as { code?: string })?.code ?? "";
  switch (kod) {
    case "auth/email-already-in-use":
      return "Bu e-posta zaten kayıtlı. Lütfen giriş yap.";
    case "auth/invalid-email":
      return "Geçersiz e-posta adresi.";
    case "auth/weak-password":
      return "Parola en az 6 karakter olmalı.";
    case "auth/network-request-failed":
      return "Bağlantı kurulamadı. İnternetini kontrol et.";
    case "auth/too-many-requests":
      return "Çok fazla deneme yapıldı. Biraz sonra tekrar dene.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Google penceresi kapatıldı.";
    case "auth/unauthorized-domain":
      return "Bu alan adı Firebase'de yetkili değil.";
    default:
      return (err as { message?: string })?.message || "Kayıt tamamlanamadı. Lütfen tekrar dene.";
  }
}
