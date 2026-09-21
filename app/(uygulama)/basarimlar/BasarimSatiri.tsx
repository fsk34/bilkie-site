"use client";

// Tek başarım satırı: solda renkli simge + kademe sayacı, sağda başlık/sayaç,
// altında sarı ilerleme çubuğu ve hedef cümlesi.

import { basarimDuzeyi, hedefCumlesi, sonrakiEsik, type Basarim } from "./basarimlar";

const LIG_ADLARI = ["—", "Başlangıç", "Gelişim", "Ustalık", "Şampiyonlar", "Efsaneler", "Zirve"];

export default function BasarimSatiri({ b, deger }: { b: Basarim; deger: number }) {
  const esik = sonrakiEsik(b, deger);
  const esikli = b.esikler.length > 0;
  // Üzerinde çalışılan düzey: 0/10 iken "1. Düzey", 10 geçilince "2. Düzey"… (tavan: kademe sayısı).
  // Eşiksiz (kişisel rekor) başarımda kademe kavramı yok → yazı yok.
  const duzey = esikli ? Math.min(b.esikler.length, basarimDuzeyi(b, deger) + 1) : 0;
  const oran = esikli ? Math.min(100, (deger / Math.max(1, esik)) * 100) : 0;

  const sayac =
    b.id === "enyukseklig" ? (LIG_ADLARI[deger] ?? "—")
    : b.esikler.length > 0 ? `${Math.min(deger, esik)}/${esik}`   // tavan geçilince "150/140" değil "140/140"
    : String(deger);

  return (
    <div className="bk-basarim-satir" data-kilit={deger <= 0}>
      <div className="bk-basarim-simge" style={{ background: b.zemin }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/uygulama/rozet/${b.gorsel}.png`} alt="" />
        {/* Kademe: "2. Düzey" (21 Eyl). Eskiden "0/10" yazıyordu — kademe ile sağdaki
            sayacı (sıradaki eşiğe 8/10) karıştırıyordu, kilitlide "0/10" çirkindi.
            Etkinlik rozetinde yıl ("2026") — kademe değil, kimlik. */}
        {b.yil ? <span>{b.yil}</span> : esikli && <span>{duzey}. Düzey</span>}
      </div>

      <div className="bk-basarim-govde">
        <div className="bk-basarim-bas">
          <span className="ad">{b.ad}</span>
          <span className="sayac">{sayac}</span>
        </div>
        {/* Kişisel rekorlarda eşik yok → çubuk da yok; sayının kendisi anlamlı. */}
        {esikli && <div className="bk-basarim-cubuk"><i style={{ width: `${oran}%` }} /></div>}
        <div className="bk-basarim-hedef">{hedefCumlesi(b, deger)}</div>
      </div>
    </div>
  );
}
