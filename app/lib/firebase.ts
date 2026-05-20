import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCPam-DUCX9dbeXP0WQk6RSjDZxQiWztuA",
  authDomain: "turkce3-sinif.firebaseapp.com",
  databaseURL: "https://turkce3-sinif-default-rtdb.firebaseio.com",
  projectId: "turkce3-sinif",
  storageBucket: "turkce3-sinif.firebasestorage.app",
  appId: "1:899362595925:web:d288264eabeb402cf6a0dc",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app, "https://konutestleri.europe-west1.firebasedatabase.app");
export const defterleriDb = getDatabase(app, "https://konudefterleri.europe-west1.firebasedatabase.app");
export const yazillarDb = getDatabase(app, "https://yazililar.europe-west1.firebasedatabase.app");
export const kelimeGezmeceDb = getDatabase(app, "https://kelimezgezmece.europe-west1.firebasedatabase.app");
export const storage = getStorage(app);
