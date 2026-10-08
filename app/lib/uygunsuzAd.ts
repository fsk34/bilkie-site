// Kullanıcı adı uygunsuz kelime filtresi (8 Eki 2026) — kullanıcı adları ligde diğer öğrencilere görünüyor;
// çocuklara yönelik uygulamada küfür/hakaret içeren ad olmasın. ÜÇ PLATFORMDA AYNI KURAL VE LİSTE:
// iOS Core/Utils/UygunsuzAd.swift, Android UygunsuzAd.kt — biri değişirse hepsi değişmeli.
//
// Yakalar: büyük/küçük harf, Türkçe karakter (ş→s), rakamla yazma (0→o 1→i 3→e 4→a 5→s 7→t 8→b @→a),
// harf tekrarı ("siiiktir"). Gerçek isimler engellenmesin diye kısa/riskli kökler yalnız KELİMENİN TAMAMI
// eşleşince yakalanır ("Amina", "İbn Sina", "Nazım", "Kâmil", "Malik" geçer).

/** Kelimenin içinde geçse de yakalanan kökler (tekrarlı harfler tekleştirilmiş biçimde) */
const KOKLER = [
  "orospu", "orosbu", "orspu", "siktir", "siktig", "sikik", "sikerim", "sikeyim", "sikiyim", "siksok", "yarak", "yarag",
  "pezevenk", "pezeveng", "kahpe", "kaltak", "fahise", "amcik", "amciga", "aminako", "aminakoy", "gotveren", "gotunu",
  "gotune", "gotlek", "yavsak", "serefsiz", "kancik", "surtuk", "gavat", "pust", "anasini", "ananisik", "ananizi",
  "salak", "aptal", "gerizekali", "fuck", "shit", "bitch", "dick", "pussy", "porn", "sex", "hitler",
];
/** Yalnız kelimenin TAMAMI eşleşirse (kısa ya da gerçek kelime/isim içinde geçebilen) */
const TAM = new Set(["mal", "got", "ibne", "amk", "aq", "oc", "pic", "sik", "am", "bok", "nazi", "sg", "sgk"]);

const TR: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" };
const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "@": "a", $: "s", "!": "i" };

const kucuk = (s: string) =>
  [...s.replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase()].map((c) => TR[c] ?? c).join("");
const leetCoz = (s: string) => [...s].map((c) => LEET[c] ?? c).join("");
/** Ardışık aynı harfleri teke indirir ("siiiktir" → "siktir") */
const tekle = (s: string) => s.replace(/(.)\1+/g, "$1");

export function uygunsuzAdMi(ad: string): boolean {
  const k = kucuk(ad);
  const duz = tekle(leetCoz(k).replace(/[^a-z]/g, ""));
  if (KOKLER.some((w) => duz.includes(w))) return true;
  const parcalar = [...k.split(/[^a-z]+/), ...leetCoz(k).split(/[^a-z]+/)];
  return parcalar.some((p) => p !== "" && TAM.has(tekle(p)));
}
