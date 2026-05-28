// Run: node scripts/upload_kelimegezmece.mjs
// Requires: npm install firebase (already installed)
// Signs in with email/pass then uploads the JSON to kelimezgezmece DB

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
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
const auth = getAuth(app);
const db = getDatabase(app, "https://kelimezgezmece.europe-west1.firebasedatabase.app");

const JSON_PATH = process.argv[2] || "/Users/fatihkurul/Downloads/kelimegezmece-v5.json";
const EMAIL = process.env.FIREBASE_EMAIL || "database@bilkie.com";
const PASS = process.env.FIREBASE_PASS;

if (!PASS) {
  console.error("Usage: FIREBASE_PASS=<password> node scripts/upload_kelimegezmece.mjs [path/to/file.json]");
  process.exit(1);
}

async function main() {
  console.log(`Signing in as ${EMAIL}...`);
  await signInWithEmailAndPassword(auth, EMAIL, PASS);
  console.log("Signed in.");

  const data = JSON.parse(readFileSync(JSON_PATH, "utf-8"));
  const levels = data.levels;
  const keys = Object.keys(levels);
  console.log(`Uploading ${keys.length} levels from ${JSON_PATH}...`);

  // Upload all levels at once
  await set(ref(db, "levels"), levels);
  console.log(`✓ Done! ${keys.length} levels uploaded to Firebase.`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
