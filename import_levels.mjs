import { initializeApp } from "firebase/app";
import { getDatabase, ref, set } from "firebase/database";
import { readFileSync } from "fs";

const firebaseConfig = {
  apiKey: "AIzaSyCPam-DUCX9dbeXP0WQk6RSjDZxQiWztuA",
  authDomain: "turkce3-sinif.firebaseapp.com",
  databaseURL: "https://turkce3-sinif-default-rtdb.firebaseio.com",
  projectId: "turkce3-sinif",
  storageBucket: "turkce3-sinif.firebasestorage.app",
  appId: "1:899362595925:web:d288264eabeb402cf6a0dc",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app, "https://kelimezgezmece.europe-west1.firebasedatabase.app");

const raw = readFileSync("/Users/fatihkurul/Downloads/kelimegezmece-levels-new.json", "utf-8");
const data = JSON.parse(raw);

console.log(`${Object.keys(data.levels).length} level yükleniyor...`);

await set(ref(db, "levels"), data.levels);

console.log("✓ Tüm levellar Firebase'e aktarıldı.");
process.exit(0);
