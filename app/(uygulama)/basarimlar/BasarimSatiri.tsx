"use client";

// Tek başarım satırı: solda renkli simge + kademe sayacı, sağda başlık/sayaç,
// altında sarı ilerleme çubuğu ve hedef cümlesi.

import { basarimDuzeyi, hedefCumlesi, sonrakiEsik, type Basarim } from "./basarimlar";

const LIG_ADLARI = ["—", "Başlangıç", "Gelişim", "Ustalık", "Şampiyonlar", "Efsaneler", "Zirve"];

export default function BasarimSatiri({ b, deger }: { b: Basarim; deger: number }) {
  const duzey = basarimDuzeyi(b, deger);
  const esik = sonrakiEsik(b, deger);
  const esikli = b.esikler.length > 0;
  const oran = esikli ? Math.min(100, (deger / Math.max(1, esik)) * 100) : 0;

  const sayac =
    b.id === "enyukseklig" ? (LIG_ADLARI[deger] ?? "—")
    : b.esikler.length > 0 ? `${deger}/${esik}`
    : String(deger);

  return (
    <div className="bk-basarim-satir" data-kilit={deger <= 0}>
      <div className="bk-basarim-simge" style={{ background: b.zemin }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/uygulama/rozet/${b.gorsel}.png`} alt="" />
        {/* Uygulamada bu alanda "$level/$maxLevel" yazıyor (MainActivity.kt:4772) ve
            eşiksiz başarımlarda HİÇBİR ŞEY yazmıyor. Web'de bir süre "2. DÜZEY" /
            "BAŞLANGIÇ" yazıyordu — Duolingo'dan esinlenilmiş, uygulamada karşılığı
            olmayan bir ifadeydi. */}
        {(b.yil || esikli) && <span>{b.yil ?? `${duzey}/${b.esikler.length}`}</span>}
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
