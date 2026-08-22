"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PhoneFrame from "./PhoneFrame";

/* ————————————————————————————————————————————————————————————
   PROFİL DESTESİ

   Etkin kart hep ORTADA ve dik; diğerleri iki yana simetrik açılıyor.

   Konum, kartın etkin karta göre GÖRECELİ yerinden türüyor (rel = i - etkin)
   ama SARMA YOK. İki ayrı hata bu ikisinden çıkmıştı:

   ① Baştaki sürümde konum döngüsel derinlikten geliyordu
      (d = (i - etkin + n) % n). Öndeki kart ilerleyince d=0'dan d=9'a
      atlıyor, CSS geçişi de onu aradaki BÜTÜN açılardan süpürerek
      geçiriyordu → "telefonlar dağılıyor".
   ② İkinci sürümde konum mutlak indeksten geliyordu; yelpaze sabit
      duruyordu ama etkin kart ortaya çekilince kendi yuvasını boş
      bırakıyor, deste tek yana yığılıyordu → yine dağınık görünüyordu.

   Şimdi: her kart etkin karta göre TAM BİR YUVA kayıyor. Değişimde
   hareket küçük, tutarlı ve simetrik. Sarma olmadığı için hiçbir kart
   uzun yol katetmiyor.
   ———————————————————————————————————————————————————————————— */

export type Kart = { ad: string; gorsel: string };

/* Yelpazenin genişliği KOLONA SIĞMALI, yoksa soldaki kartlar metnin
   üstüne biniyor (bildirildi).

   İlk hesabımda DÖNDÜRMEYİ unutmuştum ve yine 10 px taştı: asıl genişliği
   yana kayma değil, EĞİK KARTIN KAPLADIĞI KUTU belirliyor.
     kutu genişliği = g·cos(açı) + y·sin(açı)
   208×425 bir kart 20°'de 340 px yer kaplıyor — düz hâlinin 1,6 katı.
   Bu yüzden asıl kaldıraç açı, kayma değil.

   Şimdiki değerler (208 px kart, 440 px kolon):
     en dış açı 3×4° = 12° → kutu 291 px, yarısı 146
     yana kayma 3 × 0,11 × 208 = 69
     yarım açıklık = 146 + 69 = 215 ≤ 220 ✅ */
/** Merkezden kaç yuva ötesi görünsün. Ötesi tamamen saydam. */
const GORUNUR = 3;
/** Yuva başına açı, derece. */
const ACI = 4;
/** Yuva başına yatay kayma — kart genişliğinin yüzdesi. */
const KAYMA = 11;
/** Yuva başına yukarı kalkma, px (yelpazenin kemeri). */
const KEMER = 9;
/** Kendi kendine ilerleme aralığı, ms. */
const ARALIK = 3200;

export default function ProfilDeste({ kartlar }: { kartlar: Kart[] }) {
  const n = kartlar.length;
  const [etkin, setEtkin] = useState(0);
  const [duraklat, setDuraklat] = useState(false);
  const kokRef = useRef<HTMLDivElement>(null);
  /* Kendi kendine ilerlerken uçlarda SARMA yerine GERİ DÖNÜYOR.
     Sarsaydı 10. karttan 1. karta geçerken bütün deste dokuz yuva
     birden kayardı — düzelttiğimiz dağılmanın aynısı. */
  const yonRef = useRef(1);

  const git = useCallback(
    (yon: number) => setEtkin((a) => Math.max(0, Math.min(n - 1, a + yon))),
    [n]
  );

  useEffect(() => {
    if (duraklat) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => {
      setEtkin((a) => {
        if (a + yonRef.current > n - 1) yonRef.current = -1;
        else if (a + yonRef.current < 0) yonRef.current = 1;
        return a + yonRef.current;
      });
    }, ARALIK);
    return () => window.clearInterval(t);
  }, [duraklat, n]);

  const basla = useRef<{ x: number; y: number } | null>(null);
  /* Sürükleme bitince tarayıcı ayrıca click üretiyor; o click kartı
     ikinci kez değiştirmesin diye işaretleniyor. */
  const suruklendiRef = useRef(false);

  return (
    <div
      className="deste"
      ref={kokRef}
      role="group"
      aria-roledescription="carousel"
      aria-label="Profil ve başarım ekranları"
      tabIndex={0}
      onMouseEnter={() => setDuraklat(true)}
      onMouseLeave={() => setDuraklat(false)}
      onFocus={() => setDuraklat(true)}
      onBlur={() => setDuraklat(false)}
      onPointerDown={(e) => { basla.current = { x: e.clientX, y: e.clientY }; }}
      onPointerUp={(e) => {
        const b = basla.current; basla.current = null;
        if (!b) return;
        const dx = e.clientX - b.x, dy = e.clientY - b.y;
        if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy)) {
          suruklendiRef.current = true;
          git(dx < 0 ? 1 : -1);
          return;
        }
        /* Tıklama artık BURADA çözülmüyor — kartın kendi onClick'i
           hallediyor ve seçimi tarayıcının isabet testi yapıyor.
           Elle iki kural denendi, ikisi de yanlış çıktı:
           ① kutu kesişimi: döndürülmüş kartın eksen hizalı kutusu gerçek
              şeklinden çok geniş, en soldakine basınca başka kart seçiliyordu.
           ② en yakın merkez: sıkı yelpazede kart merkezleri 23 px arayla
              ama GÖRÜNEN şerit merkezden ~100 px uzakta; sağdaki komşuya
              basınca 3-4 yuva ötedeki kart geliyordu (bildirildi).
           Destede üç boyutlu bağlam yok (sadece 2B rotate/scale), bu yüzden
           tarayıcının kendi isabet testi doğru çalışıyor — ölçüldü. */
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") { e.preventDefault(); git(1); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); git(-1); }
      }}
    >
      <div className="deste-sahne">
        {kartlar.map((k, i) => {
          const rel = i - etkin;          // SARMA YOK — işaretli, gerçek fark
          const uzak = Math.abs(rel);
          const acik = uzak <= GORUNUR;
          const onde = rel === 0;
          return (
            <div
              key={k.gorsel}
              className={"deste-kart" + (onde ? " onde" : "")}
              style={{
                zIndex: 100 - uzak,
                opacity: acik ? 1 : 0,
                transform:
                  `translate(-50%, -50%)` +
                  ` translateX(${(rel * KAYMA).toFixed(1)}%)` +
                  ` translateY(${(uzak * KEMER - (onde ? 12 : 0)).toFixed(0)}px)` +
                  ` rotate(${(rel * ACI).toFixed(1)}deg)` +
                  ` scale(${(onde ? 1.06 : 1 - uzak * 0.035).toFixed(3)})`,
              }}
              aria-hidden={!onde}
              onClick={() => {
                if (suruklendiRef.current) { suruklendiRef.current = false; return; }
                if (!onde && acik) setEtkin(i);
              }}
            >
              <PhoneFrame src={k.gorsel} alt={`bilkie — ${k.ad}`} />
              <span className="deste-perde" style={{ opacity: onde ? 0 : 0.24 + uzak * 0.06 }} aria-hidden="true" />
            </div>
          );
        })}
      </div>

      <div className="deste-alt">
        <p className="deste-ad" aria-live="polite">{kartlar[etkin]?.ad}</p>
        <p className="deste-sayac">{etkin + 1} / {n}</p>
      </div>
    </div>
  );
}
