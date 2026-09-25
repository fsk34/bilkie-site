// İlerleme/görev/istatistik yazımları Android'deki gibi hatayı YUTAR — biri düşerse
// diğerleri ve kullanıcının akışı devam etmeli. Ama sessiz başarısızlık teşhis edilemez
// (ör. veritabanı kuralı bir düğümü reddediyorsa ekranda hiçbir belirti olmaz).
// Bu yüzden geliştirme kipinde konsola yazılır, canlıda susar.
export function sessizHata(etiket: string, e: unknown): void {
  if (process.env.NODE_ENV === "production") return;
  const m = (e as { message?: string })?.message ?? String(e);
  console.warn(`[bilkie] ${etiket} yazılamadı: ${m}`);
}

/**
 * Sözü en çok `ms` kadar bekler; dolarsa (ya da söz reddedilirse) `undefined` döner.
 * Firebase web çevrimdışıyken `get()` bekleyebilir; `set/update/runTransaction` sözleri
 * bağlantı gelene kadar HİÇ çözülmez (yazma yerel kuyrukta durur). Ekranı bunlara
 * bağlamamak için (Android `withTimeoutOrNull` karşılığı, 24 Eyl 2026).
 */
export function tavanli<T>(soz: Promise<T>, ms: number): Promise<T | undefined> {
  return new Promise((coz) => {
    const z = setTimeout(() => coz(undefined), ms);
    soz.then(
      (v) => { clearTimeout(z); coz(v); },
      () => { clearTimeout(z); coz(undefined); }
    );
  });
}
