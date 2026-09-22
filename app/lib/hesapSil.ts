// Android: domain/HesapSilme.kt — hesabı TAMAMEN siler; kullanıcının izi olan her yer tek listede (22 Eyl 2026):
//   1. Storage  notlar/{uid}/…                          (not görselleri)
//   2. leaderboards/leagues/{sınıf}/{sezon}/{uid}        (tüm sınıflar × tüm sezonlar)
//   3. userIds/{kısaKimlik}, usernames/{ad}, emails/{eposta}   (dizinler)
//   4. users/{uid}                                      (profil, ilerleme, görev, seri, notlar…)
//   5. Firebase Auth kaydı
// Sıra önemli: Auth EN SON silinir; kurallar `auth.uid === $uid` ister, Auth gidince veri temizlenemez.
// Web'de eskiden uygulama içi silme yoktu (/hesap-silme yalnız adımları anlatıyordu).
// Yeniden kimlik doğrulama ÇAĞIRANIN işi (ayarlar sayfası).

import {
  deleteUser,
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  type User,
} from "firebase/auth";
import { get, ref as dbRef, remove, update } from "firebase/database";
import { deleteObject, listAll, ref as storageRef, type StorageReference } from "firebase/storage";
import { kullaniciDb, storage } from "./firebase";
import { epostaAnahtari } from "./kayit";
import { tumLigAnahtarlari } from "./sezon";

const SINIFLAR = [3, 4, 5, 6, 7, 8];

/** Parola kullanıcısı mı? (Google kullanıcısı popup ile doğrulanır) */
export function parolaGerekli(user: User): boolean {
  return user.providerData.some((p) => p.providerId === EmailAuthProvider.PROVIDER_ID);
}

/** Silmeden ÖNCE yeniden doğrula: Auth silme "recent login" ister. */
export async function yenidenDogrula(user: User, parola: string | null): Promise<void> {
  if (parolaGerekli(user)) {
    if (!parola || !user.email) throw new Error("Parolanı yazmalısın.");
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, parola));
  } else {
    await reauthenticateWithPopup(user, new GoogleAuthProvider());
  }
}

/** Auth kaydı dahil her şeyi siler. Auth silme hatası dışarı fırlar. */
export async function hesabiTamamenSil(user: User): Promise<void> {
  const uid = user.uid;
  const kok = dbRef(kullaniciDb);

  // Dizin anahtarları profilden okunur (önbellek bayat olabilir → DB'den)
  let username = "";
  let email = "";
  let shortId = "";
  try {
    const p = (await get(dbRef(kullaniciDb, `users/${uid}/profile`))).val() ?? {};
    username = typeof p.username === "string" ? p.username : "";
    email = typeof p.email === "string" ? p.email : "";
    shortId = p.shortId != null ? String(p.shortId) : "";
  } catch { /* profil okunamadıysa dizinler atlanır */ }

  // 1. Not görselleri (best-effort)
  try { await klasoruSil(storageRef(storage, `notlar/${uid}`)); } catch { /* yetim dosya kalabilir */ }

  // 2. Lig satırları — tek çok-yollu yazma; her yol `auth.uid === $uid` kuralından geçer
  const yollar: Record<string, null> = {};
  for (const sinif of SINIFLAR) for (const sezon of tumLigAnahtarlari()) {
    yollar[`leaderboards/leagues/${sinif}/${sezon}/${uid}`] = null;
  }
  try { await update(kok, yollar); } catch { /* best-effort */ }

  // 3. Dizinler — ayrı ayrı: biri başkasına aitse (kural reddeder) diğerleri etkilenmesin
  if (shortId) try { await remove(dbRef(kullaniciDb, `userIds/${shortId}`)); } catch { /* */ }
  if (username) try { await remove(dbRef(kullaniciDb, `usernames/${username}`)); } catch { /* */ }
  if (email) try { await remove(dbRef(kullaniciDb, `emails/${epostaAnahtari(email)}`)); } catch { /* */ }

  // 4. Kullanıcı düğümü
  try { await remove(dbRef(kullaniciDb, `users/${uid}`)); } catch { /* */ }

  // 5. Auth — en son
  await deleteUser(user);
}

async function klasoruSil(ref: StorageReference): Promise<void> {
  const liste = await listAll(ref);
  await Promise.all(liste.items.map((i) => deleteObject(i).catch(() => {})));
  for (const alt of liste.prefixes) await klasoruSil(alt);
}
