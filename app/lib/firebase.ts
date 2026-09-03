import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase, type Database } from "firebase/database";
import { getStorage } from "firebase/storage";
import { appCheckBaslat } from "./appcheck";

const firebaseConfig = {
  apiKey: "AIzaSyCPam-DUCX9dbeXP0WQk6RSjDZxQiWztuA",
  authDomain: "turkce3-sinif.firebaseapp.com",
  databaseURL: "https://turkce3-sinif-default-rtdb.firebaseio.com",
  projectId: "turkce3-sinif",
  storageBucket: "turkce3-sinif.firebasestorage.app",
  appId: "1:899362595925:web:d288264eabeb402cf6a0dc",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// App Check kurulumu (yalnız tarayıcıda, anahtar tanımlıysa) — ayrıntı appcheck.ts'te.
// Diğer Firebase çağrılarından ÖNCE başlaması için burada, uygulama oluşturulur oluşturulmaz.
appCheckBaslat();

export const auth = getAuth(app);
export const db = getDatabase(app, "https://konutestleri.europe-west1.firebasedatabase.app");
export const defterleriDb = getDatabase(app, "https://konudefterleri.europe-west1.firebasedatabase.app");
export const yazillarDb = getDatabase(app, "https://yazililar.europe-west1.firebasedatabase.app");
export const kelimeGezmeceDb = getDatabase(app, "https://kelimezgezmece.europe-west1.firebasedatabase.app");
export const storage = getStorage(app);

/* Uygulama (web app) tarafı — mobil uygulamayla AYNI veritabanları.
   Adlar iOS/Android'deki FirebaseDb ile eşleşsin diye Türkçe tutuldu. */
export const kullaniciDb = getDatabase(app, "https://kullanici.firebaseio.com");
export const testlerDb = db;                 // konutestleri (yukarıdaki `db` ile aynı örnek)
export const defterlerDb = defterleriDb;     // konudefterleri
export const gorevKatalogDb = getDatabase(app, "https://taskcatalog.europe-west1.firebasedatabase.app");
export const yazililarDb = yazillarDb;       // yazililar (mevcut dışa aktarımın doğru yazımlı takma adı)

/* Oyun veritabanları (Android/iOS: FirebaseDb) */
export const wordleDb = getDatabase(app, "https://wordlegame.europe-west1.firebasedatabase.app");
export const sudokuDb = getDatabase(app, "https://sudokulevels.europe-west1.firebasedatabase.app");

/* Ünite eşleştirme quizleri (Android: FirebaseDb.quiz → QUIZ_DB_URL) */
export const quizDb = getDatabase(app, "https://unitequizler.europe-west1.firebasedatabase.app");

/* Ana ekrandaki 4 keşif kutusunun veritabanları (iOS: FirebaseDb) */
export const atasozDeyimlerDb = getDatabase(app, "https://atasozudeyimler.europe-west1.firebasedatabase.app");
export const dunyaHarikalariDb = getDatabase(app, "https://dunyaharikalari.europe-west1.firebasedatabase.app");
export const mesleklerDb = getDatabase(app, "https://meslekler.europe-west1.firebasedatabase.app");
export const turkiyeyiKesfetDb = getDatabase(app, "https://turkiyeyikesfet.europe-west1.firebasedatabase.app");

/* Veritabanı örneklerinin SABİT adları.
   Canlı katman son bilinen değeri `localStorage`'a bu adla yazıyor; ad çağrı sırasına
   göre üretilseydi (db1, db2…) sayfa açılış sırası değişince anahtar da değişir ve
   hatırlanan değer bulunamazdı. */
export const VERITABANI_ADLARI = new Map<Database, string>([
  [kullaniciDb, "kullanici"],
  [testlerDb, "testler"],
  [defterlerDb, "defterler"],
  [yazililarDb, "yazililar"],
  [gorevKatalogDb, "gorevKatalog"],
  [wordleDb, "wordle"],
  [sudokuDb, "sudoku"],
  [quizDb, "quiz"],
  [kelimeGezmeceDb, "kelimeGezmece"],
  [atasozDeyimlerDb, "atasozDeyimler"],
  [dunyaHarikalariDb, "dunyaHarikalari"],
  [mesleklerDb, "meslekler"],
  [turkiyeyiKesfetDb, "turkiyeyiKesfet"],
]);
