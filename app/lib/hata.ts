// İlerleme/görev/istatistik yazımları Android'deki gibi hatayı YUTAR — biri düşerse
// diğerleri ve kullanıcının akışı devam etmeli. Ama sessiz başarısızlık teşhis edilemez
// (ör. veritabanı kuralı bir düğümü reddediyorsa ekranda hiçbir belirti olmaz).
// Bu yüzden geliştirme kipinde konsola yazılır, canlıda susar.
export function sessizHata(etiket: string, e: unknown): void {
  if (process.env.NODE_ENV === "production") return;
  const m = (e as { message?: string })?.message ?? String(e);
  console.warn(`[bilkie] ${etiket} yazılamadı: ${m}`);
}
