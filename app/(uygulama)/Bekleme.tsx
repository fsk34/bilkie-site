"use client";

/**
 * Kullanıcı verisi HENÜZ BİLİNMEZKEN içeriğin yerini tutan iskelet.
 *
 * Neden içerik çizilmiyor: ilerleme bilinmeden çizilirse çubuklar 0 görünür, veri
 * gelince dolar — ekrana her girişte "yeniden doluyor" izlenimi verirdi.
 * YEREL ÖNCE kural sayesinde bu bekleme yalnızca cihazdaki İLK açılışta görülür;
 * sonraki açılışlarda değer diskten anında geldiği için hiç görünmez.
 *
 * `satir`/`yukseklik` gelecek düzenin yerini tutar, böylece veri gelince sayfa zıplamaz.
 */
export default function Bekleme({ satir = 5, yukseklik = 115 }: { satir?: number; yukseklik?: number }) {
  return (
    <div className="bk-bekleme" aria-hidden>
      {Array.from({ length: satir }, (_, i) => (
        <span key={i} style={{ height: yukseklik, animationDelay: `${i * 90}ms` }} />
      ))}
    </div>
  );
}
