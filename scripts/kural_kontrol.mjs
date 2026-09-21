// Firebase kuralı bir yola yazmaya izin veriyor mu? (21 Eyl 2026 — league/seenLeague için yazıldı)
//   FIREBASE_PASS=<parola> node scripts/kural_kontrol.mjs [yol]
// database@bilkie.com ile girer, KENDİ uid'sinin altındaki yola deneme değeri yazar,
// okur, siler. Başka kullanıcıya dokunmaz. Varsayılan yol: league/seenLeague
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getDatabase, ref, set, get, remove } from "firebase/database";

const yol = process.argv[2] || "league/seenLeague";
const PASS = process.env.FIREBASE_PASS;
if (!PASS) { console.error("Kullanım: FIREBASE_PASS=<parola> node scripts/kural_kontrol.mjs [yol]"); process.exit(1); }

const app = initializeApp({
  apiKey: "AIzaSyCPam-DUCX9dbeXP0WQk6RSjDZxQiWztuA",
  authDomain: "turkce3-sinif.firebaseapp.com",
  projectId: "turkce3-sinif",
  appId: "1:899362595925:web:d288264eabeb402cf6a0dc",
});
const db = getDatabase(app, "https://kullanici.firebaseio.com");
const { user } = await signInWithEmailAndPassword(getAuth(app), process.env.FIREBASE_EMAIL || "database@bilkie.com", PASS);
const tam = `users/${user.uid}/${yol}`;
const r = ref(db, tam);
const onceki = (await get(r)).val();
console.log(`${tam}\n  önceki değer: ${JSON.stringify(onceki)}`);
try {
  await set(r, 2);
  const okunan = (await get(r)).val();
  console.log(`  YAZMA ✅ (okunan: ${okunan}) — kural izin veriyor`);
  if (onceki == null) await remove(r); else await set(r, onceki);
  console.log("  eski hâline döndürüldü");
} catch (e) {
  console.log(`  YAZMA ⛔ ${e.code ?? e.message} — kural reddediyor, konsoldan izin eklenmeli`);
}
process.exit(0);
