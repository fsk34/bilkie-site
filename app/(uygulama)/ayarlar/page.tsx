"use client";

// Ayarlar ("Daha Fazla") — Android `SettingsScreen.kt` portu.
// Bölümler, satırlar, bağlantılar ve düğmeler birebir; renkler uygulamadan
// (kart #10264A, çerçeve #28486B, vurgu #55C7FF, tehlike #FF4444).
//
// Web'de karşılığı olmayan satır:
//  • Bildirimler — tarayıcı bildirimi yok, ayar telefondaki uygulamada.
// HESABI SİL 22 Eyl 2026'dan beri web'de de çalışıyor (lib/hesapSil.ts, Android HesapSilme.kt ile
// aynı liste): parola kullanıcısından parola istenir, Google kullanıcısı popup ile doğrulanır.

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Kabuk from "../Kabuk";
import { useOturum } from "../../lib/oturum";
import { hesabiTamamenSil, parolaGerekli, yenidenDogrula } from "../../lib/hesapSil";
import { kayitHataMetni } from "../../lib/kayit";

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
  const router = useRouter();
  const [silmeUyarisi, setSilmeUyarisi] = useState(false);
  const [bildirimNotu, setBildirimNotu] = useState(false);
  const [silmeParolasi, setSilmeParolasi] = useState("");
  const [siliniyor, setSiliniyor] = useState(false);
  const [silmeHatasi, setSilmeHatasi] = useState<string | null>(null);
  const parolaIste = kullanici ? parolaGerekli(kullanici) : false;

  // Android MainActivity onDeleteAccount: önce yeniden doğrula, sonra tüm izler, en son Auth
  async function hesabiSil() {
    if (!kullanici || siliniyor) return;
    setSiliniyor(true);
    setSilmeHatasi(null);
    try {
      await yenidenDogrula(kullanici, parolaIste ? silmeParolasi : null);
      await hesabiTamamenSil(kullanici);
      setSilmeUyarisi(false);
      await cikisYap().catch(() => {});
      router.replace("/giris");
    } catch (err) {
      const kod = (err as { code?: string })?.code ?? "";
      setSilmeHatasi(
        kod === "auth/wrong-password" || kod === "auth/invalid-credential"
          ? "Parola yanlış, hesap silinmedi."
          : (err as Error)?.message && !kod ? (err as Error).message : kayitHataMetni(err),
      );
    } finally {
      setSiliniyor(false);
    }
  }

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
        <div className="bk-oyun-ortu hafif" onClick={() => !siliniyor && setSilmeUyarisi(false)}>
          <div className="bk-oyun-onay" onClick={(e) => e.stopPropagation()}>
            <div className="sor">Hesabı Sil</div>
            <div className="not">
              Hesabını silmek istediğine emin misin? Tüm ilerleme, başarılar ve verilerin kalıcı olarak silinecek ve kurtarılamayacak.
            </div>
            {parolaIste && (
              <input
                className="bk-onay-giris"
                type="password"
                placeholder="Parolan"
                autoComplete="current-password"
                value={silmeParolasi}
                onChange={(e) => setSilmeParolasi(e.target.value)}
                disabled={siliniyor}
              />
            )}
            {silmeHatasi && <div className="not" style={{ color: "#ff6b6b" }}>{silmeHatasi}</div>}
            <div className="ikili">
              <button className="hayir" disabled={siliniyor} onClick={() => { setSilmeUyarisi(false); setSilmeParolasi(""); setSilmeHatasi(null); }}>Vazgeç</button>
              <button className="evet" disabled={siliniyor || (parolaIste && !silmeParolasi)} onClick={hesabiSil}>
                {siliniyor ? "Siliniyor…" : "Evet, Sil"}
              </button>
            </div>
          </div>
        </div>
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
