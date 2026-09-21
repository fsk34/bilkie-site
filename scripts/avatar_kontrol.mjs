// Bir kullanıcının avatarı profil ile lig satırlarında AYNI mı? (21 Eyl 2026)
//   FIREBASE_PASS=<parola> node scripts/avatar_kontrol.mjs <kullanıcı_adı>
// database@bilkie.com ile girer; usernames/{ad} → uid → users/{uid}/profile ve
// leaderboards/leagues/grade{3..8}/{sezon}/{uid} okunur. Yalnız OKUR.
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getDatabase, ref, get } from "firebase/database";

const [ad] = process.argv.slice(2);
const PASS = process.env.FIREBASE_PASS;
if (!ad || !PASS) { console.error("Kullanım: FIREBASE_PASS=<parola> node scripts/avatar_kontrol.mjs <kullanıcı_adı>"); process.exit(1); }

const app = initializeApp({
  apiKey: "AIzaSyCPam-DUCX9dbeXP0WQk6RSjDZxQiWztuA",
  authDomain: "turkce3-sinif.firebaseapp.com",
  projectId: "turkce3-sinif",
  appId: "1:899362595925:web:d288264eabeb402cf6a0dc",
});
const db = getDatabase(app, "https://kullanici.firebaseio.com");
// sezon.ts ile aynı tablo — bugün 2026_2027_guz
const SEZON = "2026_2027_guz";

await signInWithEmailAndPassword(getAuth(app), process.env.FIREBASE_EMAIL || "database@bilkie.com", PASS);
const oku = async (yol) => { try { return (await get(ref(db, yol))).val(); } catch (e) { return `⛔ ${e.code ?? e.message}`; } };

const uid = await oku(`usernames/${ad}`);
console.log(`@${ad} → uid: ${uid}`);
if (typeof uid !== "string") process.exit(1);
const profil = await oku(`users/${uid}/profile`);
const pAvatar = typeof profil === "object" && profil ? profil.avatar : profil;
console.log(`profil avatar      : ${pAvatar}`);
for (let g = 3; g <= 8; g++) {
  const satir = await oku(`leaderboards/leagues/grade${g}/${SEZON}/${uid}`);
  if (satir == null) { console.log(`grade${g} lig satırı  : (yok)`); continue; }
  if (typeof satir !== "object") { console.log(`grade${g} lig satırı  : ${satir}`); continue; }
  const ayni = satir.avatar === pAvatar ? "✅ aynı" : "❌ FARKLI";
  console.log(`grade${g} lig satırı  : avatar=${satir.avatar} name=${satir.name} points=${satir.points ?? 0}  ${ayni}`);
}
process.exit(0);
