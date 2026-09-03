"use client";

// Ayarlar ("Daha Fazla") — Android `SettingsScreen.kt` portu.
// Bölümler, satırlar, bağlantılar ve düğmeler birebir; renkler uygulamadan
// (kart #10264A, çerçeve #28486B, vurgu #55C7FF, tehlike #FF4444).
//
// Web'de karşılığı olmayan iki satır:
//  • Bildirimler — tarayıcı bildirimi yok, ayar telefondaki uygulamada.
//  • HESABI SİL — geri alınamaz ve yeniden kimlik doğrulaması gerektiriyor;
//    web'den yapılmıyor, site zaten /hesap-silme sayfasında adımları anlatıyor.

import Link from "next/link";
import { useState } from "react";
import Kabuk from "../Kabuk";
import { useOturum } from "../../lib/oturum";

const BAGLANTILAR = [
  { ad: "ŞARTLAR", yol: "/sartlar" },
  { ad: "GİZLİLİK POLİTİKASI", yol: "/gizlilik" },
  { ad: "TEŞEKKÜRLER", yol: "/tesekkurler" },
];

export default function AyarlarSayfasi() {
  return (
    <Kabuk>
      <Icerik />
    </Kabuk>
  );
}

function Icerik() {
  const { kullanici, cikisYap } = useOturum();
  const [silmeUyarisi, setSilmeUyarisi] = useState(false);
  const [bildirimNotu, setBildirimNotu] = useState(false);

  return (
    <div className="bk-ayarlar">
      <div className="bk-ayarlar-ust">
        <span className="bosluk" />
        <h1>Ayarlar</h1>
        <Link className="bitti" href="/">Bitti</Link>
      </div>

      <h2>Hesap</h2>
      <div className="bk-ayarlar-kart">
        <Link className="satir" href="/profil/duzenle">
          <span>Hesap</span><i>›</i>
        </Link>
        <span className="ayrac" />
        <button className="satir" onClick={() => setBildirimNotu(true)}>
          <span>Bildirimler</span><i>›</i>
        </button>
      </div>

      <h2>Destek</h2>
      <div className="bk-ayarlar-kart">
        <Link className="satir" href="/yardim">
          <span>Yardım Merkezi</span><i>›</i>
        </Link>
        <span className="ayrac" />
        <Link className="satir" href="/yardim/geribildirim">
          <span>Geri Bildirim</span><i>›</i>
        </Link>
      </div>

      <div className="bk-ayarlar-baglantilar">
        {BAGLANTILAR.map((b) => (
          <Link key={b.yol} href={b.yol}>{b.ad}</Link>
        ))}
      </div>

      {kullanici ? (
        <>
          <button className="bk-ayarlar-dugme" onClick={() => cikisYap()}>OTURUMU KAPAT</button>
          <button className="bk-ayarlar-dugme tehlike" onClick={() => setSilmeUyarisi(true)}>HESABI SİL</button>
        </>
      ) : (
        <Link className="bk-ayarlar-dugme" href="/giris">GİRİŞ YAP</Link>
      )}

      {bildirimNotu && (
        <Uyari
          baslik="Bildirimler"
          metin="Bildirim ayarları telefondaki Bilkie uygulamasında. Tarayıcı sürümü bildirim göndermiyor."
          onKapat={() => setBildirimNotu(false)}
        />
      )}

      {silmeUyarisi && (
        <Uyari
          baslik="Hesabı Sil"
          metin="Hesap silme geri alınamaz ve kimliğini yeniden doğrulamanı gerektiriyor; bu yüzden tarayıcıdan yapılmıyor. Adımlar hesap silme sayfasında anlatılıyor."
          onKapat={() => setSilmeUyarisi(false)}
          eylem={{ ad: "Nasıl silinir?", yol: "/hesap-silme" }}
        />
      )}
    </div>
  );
}

function Uyari({
  baslik, metin, onKapat, eylem,
}: {
  baslik: string; metin: string; onKapat: () => void;
  eylem?: { ad: string; yol: string };
}) {
  return (
    <div className="bk-oyun-ortu hafif" onClick={onKapat}>
      <div className="bk-oyun-onay" onClick={(e) => e.stopPropagation()}>
        <div className="sor">{baslik}</div>
        <div className="not">{metin}</div>
        <div className="ikili">
          <button className="hayir" onClick={onKapat}>Tamam</button>
          {eylem && <Link className="bk-ayarlar-eylem" href={eylem.yol}>{eylem.ad}</Link>}
        </div>
      </div>
    </div>
  );
}
