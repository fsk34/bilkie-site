// API anahtarında HTTP referrer kısıtlaması var (Google Cloud Console). Tarayıcı Referer'ı
// kendisi gönderir; Node göndermez ve anahtar "requests-from-referer-<empty>-are-blocked"
// der. Bu modül global fetch'e site adresini Referer olarak ekler. firebase/* import'larından
// ÖNCE import edilmeli — firebase/auth fetch'i modül yüklenirken yakalar.
const orig = globalThis.fetch;
globalThis.fetch = (url, init = {}) => {
  const headers = new Headers(init.headers || {});
  headers.set("Referer", "https://bilkie.com/");
  return orig(url, { ...init, headers });
};
