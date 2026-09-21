// Tek bir konu defterini Firebase'e yazar (konudefterleri DB).
//
// Çalıştır:
//   FIREBASE_PASS=<parola> node scripts/defter_yukle.mjs grade6 matematik u4 data/kaynak/6-matematik-u4-geometrik-nicelikler.json
//
// Yazılan yol: defterler/<grade>/subjects/<ders>/units/<unite>  → { title, pages }
// Var olan kaydın ÜZERİNE yazar (set). Sonra dışa aktarımı yenileyip
// scripts/defterleri_cikar.py ile data/icerik/defterler.json'u yeniden üret.
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getDatabase, ref, set, get } from "firebase/database";
import { readFileSync } from "fs";

const [grade, ders, unite, dosya] = process.argv.slice(2);
const PASS = process.env.FIREBASE_PASS;
if (!grade || !ders || !unite || !dosya || !PASS) {
  console.error("Kullanım: FIREBASE_PASS=<parola> node scripts/defter_yukle.mjs <gradeN> <ders> <uN> <dosya.json>");
  process.exit(1);
}

const app = initializeApp({
  apiKey: "AIzaSyCPam-DUCX9dbeXP0WQk6RSjDZxQiWztuA",
  authDomain: "turkce3-sinif.firebaseapp.com",
  projectId: "turkce3-sinif",
  appId: "1:899362595925:web:d288264eabeb402cf6a0dc",
});
const db = getDatabase(app, "https://konudefterleri.europe-west1.firebasedatabase.app");

const veri = JSON.parse(readFileSync(dosya, "utf-8"));
if (!veri.title || !Array.isArray(veri.pages)) throw new Error("dosya { title, pages[] } biçiminde olmalı");
veri.pages.forEach((p, i) => { if (p.pageNo !== i + 1) throw new Error(`pageNo sırası bozuk: ${i + 1}`); });

await signInWithEmailAndPassword(getAuth(app), process.env.FIREBASE_EMAIL || "database@bilkie.com", PASS);
const yol = `defterler/${grade}/subjects/${ders}/units/${unite}`;
const eski = (await get(ref(db, yol))).val();
console.log(`${yol}: eski "${eski?.title}" ${eski?.pages?.length ?? 0} sayfa → yeni "${veri.title}" ${veri.pages.length} sayfa`);
await set(ref(db, yol), { title: veri.title, pages: veri.pages });
console.log("yazıldı");
process.exit(0);
