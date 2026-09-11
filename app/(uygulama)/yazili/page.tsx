"use client";

// Yazılıya Hazırlık — sınav seçimi (uygulamadaki YaziliyaHazirlikScreen).
//
// Sınav listesi VERİDEN gelir (`yazililar/takvim`) — Android'le aynı düğüm.
// ⚠️ Eskiden burada tek bir sabit satır vardı: `[{ key: "term2_exam2", ... }]`.
// Bir sınavı açmak kod değişikliği + yayın gerektiriyordu; üstelik dönem geçince
// yanlış sınav görünüyordu (Eylül'de "2. Dönem 2. Yazılı").
//
// Dört dönem birden listelenir: sırası gelmemiş olan kilitli görünür ve
// üstüne tıklayınca ne zaman açılacağını söyler. Boş ekran göstermek yerine
// öğrenciye takvimi göstermek, bölümün var olduğunu da anlatıyor.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Kabuk from "../Kabuk";
import Bekleme from "../Bekleme";
import { acilisMetni, yaziliTakvimi, type TakvimSonuc } from "../../lib/yaziliTakvim";

export default function YaziliSayfasi() {
  const router = useRouter();
  const [sonuc, setSonuc] = useState<TakvimSonuc | null>(null);
  // Hangi kilitli sınavın baloncuğu açık. Aynı anda tek tane.
  const [baloncuk, setBaloncuk] = useState<string | null>(null);

  // Yeniden yükleme sayacı: "Tekrar dene" bunu artırır, efekt yeniden koşar.
  // (Efektin GÖVDESİNDE setState çağırmıyoruz — yalnız sonuç gelince, geri
  //  çağrının içinde. Senkron setState basamaklı render'a yol açıyor.)
  const [deneme, setDeneme] = useState(0);

  useEffect(() => {
    let iptal = false;
    yaziliTakvimi().then((r) => {
      if (!iptal) setSonuc(r);
    });
    return () => {
      iptal = true;
    };
  }, [deneme]);

  // Baloncuk kendiliğinden kapansın — kapatmak için ikinci dokunuş gerekmesin.
  // Zamanlayıcı efektte değil BURADA kuruluyor: efekt içinde setState React'in
  // set-state-in-effect kuralına takılıyor ve gereksiz bir render turu açıyor.
  const zamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null);
  function baloncukDegistir(anahtar: string) {
    if (zamanlayici.current) clearTimeout(zamanlayici.current);
    setBaloncuk((onceki) => (onceki === anahtar ? null : anahtar));
    zamanlayici.current = setTimeout(() => setBaloncuk(null), 3500);
  }
  useEffect(() => () => {
    if (zamanlayici.current) clearTimeout(zamanlayici.current);
  }, []);

  return (
    <Kabuk>
      <div className="bk-ustbar">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
            <button className="bk-ustbar-geri" onClick={() => router.push("/")} aria-label="Geri">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/uygulama/cikis.png" alt="" />
            </button>
            <h1>YAZILIYA HAZIRLIK</h1>
          </div>
          <p>Yazılılara en iyi şekilde hazırlan</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/uygulama/yazili.png" alt="" />
      </div>

      {sonuc === null && <Bekleme />}

      {/* Okuma BAŞARISIZ: "kapalı" demek yanlış olurdu, tekrar denenebilmeli. */}
      {sonuc?.durum === "okunamadi" && (
        <div className="bk-yazili-bos">
          <p>Yazılılar yüklenemedi. Bağlantını kontrol et.</p>
          <button
            className="bk-dugme"
            onClick={() => {
              setSonuc(null);
              setDeneme((n) => n + 1);
            }}
          >
            Tekrar dene
          </button>
        </div>
      )}

      {sonuc?.durum === "basarili" && sonuc.sinavlar.length === 0 && (
        <div className="bk-yazili-bos">
          <p>Yazılı dönemleri hazırlanıyor. Yazılı zamanı geldiğinde burada görünecek.</p>
        </div>
      )}

      {/* Dört düğme TEK konteynerde: aralık listeye ait, düğmenin kendisine değil.
          Tek sınav varken fark edilmiyordu; dörde çıkınca bitişik göründüler. */}
      {sonuc?.durum === "basarili" && sonuc.sinavlar.length > 0 && (
        <div className="bk-sinav-liste">
          {sonuc.sinavlar.map((s) =>
            s.acik ? (
              <Link key={s.anahtar} href={`/yazili/${s.anahtar}`} className="bk-sinav-dugme">
                {s.ad.toLocaleUpperCase("tr")}
              </Link>
            ) : (
              <div key={s.anahtar} className="bk-sinav-kilitli-yuva">
                <button
                  type="button"
                  className="bk-sinav-dugme kilitli"
                  onClick={() => baloncukDegistir(s.anahtar)}
                >
                  <span className="kilit" aria-hidden>
                    🔒
                  </span>
                  {s.ad.toLocaleUpperCase("tr")}
                </button>
                {baloncuk === s.anahtar && (
                  <p className="bk-sinav-baloncuk">
                    <span aria-hidden>🕐</span> {acilisMetni(s.baslar)}
                  </p>
                )}
              </div>
            )
          )}
        </div>
      )}
    </Kabuk>
  );
}
