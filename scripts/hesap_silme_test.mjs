// Hesap silme uçtan uca testi (22 Eyl 2026) — GERÇEK lib/hesapSil.ts (esbuild paketi) ile:
//   1. çöp hesap açar, 2. kullanıcının izi olan 6 yere veri yazar, 3. hesabiTamamenSil çalıştırır,
//   4. altı yerin de boşaldığını ve Auth kaydının silindiğini ölçer.
//   npx -y esbuild@0.24.0 app/lib/hesapSil.ts --bundle --platform=node --format=esm "--external:firebase/*" --outfile=scripts/.hesapSil.bundle.mjs
//   FIREBASE_PASS=<database@ parolası> node scripts/hesap_silme_test.mjs ./.hesapSil.bundle.mjs
import "./_node_referer.mjs";
import { getApps } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getDatabase, ref, set, get, onValue } from "firebase/database";
import { getStorage, ref as sref, uploadBytes, listAll } from "firebase/storage";

const mod = await import(process.argv[2]);
const app = getApps()[0];
const auth = getAuth(app);
const db = getDatabase(app, "https://kullanici.firebaseio.com");
const st = getStorage(app);

const ts = Date.now();
const eposta = `silme-test-${ts}@bilkie.com`;
const parola = `Sil-${ts}!x`;
const kadi = `silmetest${ts % 100000}`;
const shortId = 90000000 + (ts % 1000000);

const { user } = await createUserWithEmailAndPassword(auth, eposta, parola);
const uid = user.uid;
console.log("çöp hesap:", uid, eposta);

const epostaAnah = eposta.replace(/\./g, ",");
const yollar = {
  [`users/${uid}/profile`]: { username: kadi, email: eposta, shortId, grade: 3 },
  [`users/${uid}/progress/grade3/x`]: 1,
  [`usernames/${kadi}`]: uid,
  [`emails/${epostaAnah}`]: uid,
  [`userIds/${shortId}`]: uid,
  [`leaderboards/leagues/3/2026_2027_guz/${uid}`]: { points: 5 },
  [`leaderboards/leagues/5/2025_2026_guz/${uid}`]: { points: 1 },
};
for (const [y, v] of Object.entries(yollar)) await set(ref(db, y), v);
let storageYazildi = false;
try { await uploadBytes(sref(st, `notlar/${uid}/n1/g1.jpg`), new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), { contentType: "image/jpeg" }); storageYazildi = true; }
catch (e) { console.log("storage yazılamadı (kural?):", e.code ?? e.message); }
console.log("tohum yazıldı; storage:", storageYazildi);

// users/{uid} yalnız sahibine okunur → silinişini SAHİBİ olarak canlı dinle (Auth silinmeden önce null'a düşmeli)
let usersSonDeger = "bilinmiyor";
onValue(ref(db, `users/${uid}`), (snap) => { usersSonDeger = snap.exists() ? "var" : "yok"; }, () => {});
await new Promise((r) => setTimeout(r, 800));

// silme (yeniden doğrulama gerçek akıştaki gibi)
await mod.yenidenDogrula(auth.currentUser, parola);
await mod.hesabiTamamenSil(auth.currentUser);
console.log("hesabiTamamenSil bitti; currentUser:", auth.currentUser?.uid ?? null);

// ölçüm: başka bir hesapla (database@bilkie.com) oku — kendi hesabı yok artık
const PASS = process.env.FIREBASE_PASS;
if (!PASS) { console.log("FIREBASE_PASS yok → düğüm kontrolü atlandı"); process.exit(0); }
await signInWithEmailAndPassword(auth, "database@bilkie.com", PASS);
let kalan = 0;
const usersOk = usersSonDeger === "yok";
if (!usersOk) kalan++;
console.log(`${usersOk ? "✅" : "⛔"} users/${uid} (sahip dinleyicisi son değer: ${usersSonDeger})`);
for (const y of Object.keys(yollar).filter((y) => !y.startsWith("users/"))) {
  const v = (await get(ref(db, y))).val();
  const ok = v == null;
  if (!ok) kalan++;
  console.log(`${ok ? "✅" : "⛔"} ${y}${ok ? "" : " → " + JSON.stringify(v).slice(0, 60)}`);
}
if (storageYazildi) {
  try { const l = await listAll(sref(st, `notlar/${uid}/n1`)); const ok = l.items.length === 0; if (!ok) kalan++; console.log(`${ok ? "✅" : "⛔"} storage notlar/${uid} (${l.items.length} dosya)`); }
  catch (e) { console.log("storage listelenemedi:", e.code ?? e.message); }
}
try { await signOut(auth); await signInWithEmailAndPassword(auth, eposta, parola); console.log("⛔ Auth kaydı hâlâ var"); kalan++; }
catch (e) { console.log(`✅ Auth kaydı yok (${e.code})`); }
console.log(kalan === 0 ? "SONUÇ: temiz" : `SONUÇ: ${kalan} iz kaldı`);
process.exit(0);
