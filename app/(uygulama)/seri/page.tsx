"use client";

// Seri ekranı — mobil uygulamadaki StreakScreen'in web karşılığı.
// Aynı veri: users/{uid}/streak (count, lastDay, days/{yyyy-MM}/{gün} = aktivite maskesi).
// Aynı görsel dil: halkalı gün hücreleri, ardışık günlerin arkasında turuncu seri şeridi.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Kabuk from "../Kabuk";
import { useOturum } from "../../lib/oturum";
import {
  ACT_DEFTER,
  ACT_TEST,
  ACT_YAZILI,
  seriAyiOku,
  type SeriAy,
} from "../../lib/veri";
import { gunAnahtari } from "../../lib/tarih";

const AYLAR = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran",
               "Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const HAFTA = ["Pt","Sa","Ça","Pe","Cu","Ct","Pa"];

// Uygulamadaki renkler
const RENK_TEST   = "#DECF95";
const RENK_DEFTER = "#DEA495";
const RENK_YAZILI = "#9C95DE";
const RENK_BOS_GUN  = "rgba(255,255,255,0.333)";   // Android ColorInactiveRing 0x55
const RENK_BOS_BANT = "rgba(255,255,255,0.25)";    // Android büyük halka boşken
const RENK_SERI   = "#CB8000";

// Android StreakCache: ay verisi bellekte; ekrana dönünce bant/takvim hazır açılır, arkada tazelenir.
// Eskiden her girişte bant griden turuncuya, sayı "—"den değere flaş yapıyordu (1 Eki).
const onbellek = new Map<string, SeriAy>();

export default function SeriSayfasi() {
  return (
    <Kabuk>
      <SeriIcerik />
    </Kabuk>
  );
}

function SeriIcerik() {
  const { kullanici } = useOturum();
  const router = useRouter();
  const [kaydirma, setKaydirma] = useState(0);   // 0 = bu ay, -1 = önceki ay…

  const bugun = gunAnahtari();
  const [buYil, buAy] = [Number(bugun.slice(0, 4)), Number(bugun.slice(5, 7))];
  const bugunGun = Number(bugun.slice(8, 10));
  const buAyAnahtari = bugun.slice(0, 7);

  // Gösterilen ay (Istanbul takvimine göre kaydırılmış)
  const { yil, ay } = useMemo(() => {
    const t = new Date(Date.UTC(buYil, buAy - 1 + kaydirma, 1, 12));
    return { yil: t.getUTCFullYear(), ay: t.getUTCMonth() + 1 };
  }, [buYil, buAy, kaydirma]);

  const ayAnahtari = `${yil}-${String(ay).padStart(2, "0")}`;
  const uid = kullanici?.uid ?? "";
  const buAyOnbellek = uid ? onbellek.get(`${uid}|${buAyAnahtari}`) : undefined;

  // Seri sayısı ve bugünün maskesi BUGÜNE bakar, gezilen aya değil (Android: ay değişiminden bağımsız)
  const [sayi, setSayi] = useState<number | null>(buAyOnbellek ? buAyOnbellek.sayi : null);
  const [bugunMaskesi, setBugunMaskesi] = useState(buAyOnbellek?.gunler[bugunGun] ?? 0);
  // Takvim gezilen ayın verisi; ay değişince HEMEN o ayın önbelleğine ya da boşa döner
  // (eskiden önceki ayın çizgileri yeni ay gelene kadar ekranda kalıyordu).
  const [gunler, setGunler] = useState<Record<number, number>>(buAyOnbellek?.gunler ?? {});

  useEffect(() => {
    if (!uid) return;
    const anahtar = `${uid}|${ayAnahtari}`;
    setGunler(onbellek.get(anahtar)?.gunler ?? {});
    let iptal = false;
    seriAyiOku(uid, ayAnahtari)
      .then((v) => {
        onbellek.set(anahtar, v);
        if (iptal) return;
        setGunler(v.gunler);
        setSayi(Math.max(0, v.sayi));
        if (ayAnahtari === buAyAnahtari) setBugunMaskesi(v.gunler[bugunGun] ?? 0);
      })
      // Android: okunamazsa eldeki değer kalır, yükleniyor biter
      .catch(() => { if (!iptal) setSayi((s) => s ?? 0); });
    return () => { iptal = true; };
  }, [uid, ayAnahtari, buAyAnahtari, bugunGun]);

  const bugunAktif = bugunMaskesi !== 0;
  const satirlar = useMemo(() => aylikIzgara(yil, ay), [yil, ay]);

  if (!kullanici) {
    return (
      <>
        <h1 style={{ fontSize: 24, marginBottom: 10 }}>Seri</h1>
        <div className="bk-kart">
          <p className="bk-soluk" style={{ fontSize: 14, marginBottom: 14 }}>
            Serini görmek için giriş yapman gerekiyor.
          </p>
          <Link className="bk-dugme" href="/giris">Giriş yap</Link>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Android üst bandı: geri + "Seri" üstte, halka + sayı dikey ortada */}
      <div className="bk-seri-bant" style={{ background: bugunAktif ? RENK_SERI : "#2C335E" }}>
        <button className="geri" onClick={() => router.back()} aria-label="Geri">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/uygulama/cikis.png" alt="" />
        </button>
        <span className="baslik">Seri</span>
        <Halka maske={bugunMaskesi} boyut={110} kalinlik={16} bos={RENK_BOS_BANT} yuvarlak />
        <div>
          <div className="sayi">{sayi == null ? "—" : sayi}</div>
          <div className="etiket">günlük seri!</div>
        </div>
      </div>

      <div className="bk-seri-kart bk-seri-takvim">
        <div className="bk-takvim-ust">
          <button className="bk-ay-dugme" onClick={() => setKaydirma((k) => k - 1)} aria-label="Önceki ay">&lt;</button>
          <h3>{AYLAR[ay - 1]} {yil}</h3>
          <button className="bk-ay-dugme" onClick={() => setKaydirma((k) => k + 1)} aria-label="Sonraki ay">&gt;</button>
        </div>

        <div className="bk-hafta">
          {HAFTA.map((g) => <div key={g}>{g}</div>)}
        </div>

        <div className="bk-satirlar">
          {satirlar.map((satir, i) => (
            <div className="bk-hafta-satir" key={i}>
              {/* Ardışık aktif günlerin arkasındaki turuncu çizgi — Android: 20 kalın, yuvarlak uç,
                  rakam merkezinden (üstten 13,5) ilk günün merkezinden son günün merkezine; tek gün ±12 */}
              {seritler(satir, gunler).map((s, j) => {
                const n = s.son - s.bas;
                const ek = n === 0 ? 12 : 0;
                return (
                  <span
                    key={j}
                    className="bk-seri-serit"
                    style={{
                      left: `calc((100% - 84px) / 7 * ${s.bas + 0.5} + ${s.bas * 14 - 10 - ek}px)`,
                      width: `calc((100% - 84px) / 7 * ${n} + ${n * 14 + 20 + ek * 2}px)`,
                    }}
                  />
                );
              })}
              <div className="bk-gunler">
                {satir.map((gun, k) =>
                  gun == null ? (
                    <div className="bk-gun bos" key={k} />
                  ) : (
                    <div className="bk-gun" key={k}>
                      <span className="no">{gun}</span>
                      <Halka maske={gunler[gun] ?? 0} boyut={22} kalinlik={5} bos={RENK_BOS_GUN} />
                    </div>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bk-seri-kart bk-aciklama">
        <p>
          Her gün Test Çözdüğünde, Konu Defteri okuduğunda ya da Yazılıya Hazırlık
          yaptığında seri artar.
        </p>
        <div className="bk-etiketler">
          <Etiket ad="Konu Defteri" renk={RENK_DEFTER} />
          <Etiket ad="Konu Testi" renk={RENK_TEST} />
          <Etiket ad="Yazılı Çözümü" renk={RENK_YAZILI} />
        </div>
      </div>
    </>
  );
}

/* --------------------------------------------------------------- yardımcı */

/** Android StreakLegendItem: yazı üstte, altında 20'lik halka (4 kalın). */
function Etiket({ ad, renk }: { ad: string; renk: string }) {
  return (
    <span className="bk-etiket">
      {ad}
      <svg width={24} height={24} viewBox="0 0 24 24" style={{ margin: -2 }}>
        <circle cx={12} cy={12} r={10} fill="none" stroke={renk} strokeWidth={4} />
      </svg>
    </span>
  );
}

/**
 * Maskedeki her aktivite için halkada eşit dilim (Android Canvas çizimi).
 * Sıra Android'deki gibi test → defter → yazılı (eskiden defter önceydi).
 * Android drawArc kutunun KENARINA çizer: çizgi merkezi `boyut`luk çember, kalınlığın yarısı
 * dışarı taşar. Yerleşim yine `boyut` (negatif kenar boşluğu).
 */
function Halka({ maske, boyut, kalinlik, bos, yuvarlak }: {
  maske: number; boyut: number; kalinlik: number; bos: string; yuvarlak?: boolean;
}) {
  const renkler: string[] = [];
  if (maske & ACT_TEST)   renkler.push(RENK_TEST);
  if (maske & ACT_DEFTER) renkler.push(RENK_DEFTER);
  if (maske & ACT_YAZILI) renkler.push(RENK_YAZILI);

  const tam = boyut + kalinlik;
  const m = tam / 2;
  const r = boyut / 2;
  const cevre = 2 * Math.PI * r;
  const uc = yuvarlak ? "round" : "butt";

  return (
    <svg className="halka" width={tam} height={tam} viewBox={`0 0 ${tam} ${tam}`} style={{ margin: -kalinlik / 2 }}>
      {renkler.length === 0 ? (
        <circle cx={m} cy={m} r={r} fill="none" stroke={bos} strokeWidth={kalinlik} />
      ) : (
        renkler.map((renk, i) => {
          const dilim = cevre / renkler.length;
          return (
            <circle
              key={i}
              cx={m}
              cy={m}
              r={r}
              fill="none"
              stroke={renk}
              strokeWidth={kalinlik}
              strokeLinecap={uc}
              strokeDasharray={`${dilim} ${cevre - dilim}`}
              strokeDashoffset={-dilim * i}
              transform={`rotate(-90 ${m} ${m})`}
            />
          );
        })
      )}
    </svg>
  );
}

/** Ayı haftalara böler; hafta Pazartesi başlar, boş hücreler null. */
function aylikIzgara(yil: number, ay: number): (number | null)[][] {
  const ilk = new Date(Date.UTC(yil, ay - 1, 1, 12));
  const gunSayisi = new Date(Date.UTC(yil, ay, 0, 12)).getUTCDate();
  const bosluk = (ilk.getUTCDay() + 6) % 7;   // Pazartesi = 0

  const hucreler: (number | null)[] = Array(bosluk).fill(null);
  for (let g = 1; g <= gunSayisi; g++) hucreler.push(g);
  while (hucreler.length % 7 !== 0) hucreler.push(null);

  const satirlar: (number | null)[][] = [];
  for (let i = 0; i < hucreler.length; i += 7) satirlar.push(hucreler.slice(i, i + 7));
  while (satirlar.length && satirlar[satirlar.length - 1].every((h) => h == null)) satirlar.pop();
  return satirlar;
}

/** Bir satırdaki ardışık aktif gün aralıkları (sütun indeksleriyle). */
function seritler(satir: (number | null)[], gunler: Record<number, number>) {
  const out: { bas: number; son: number }[] = [];
  let bas: number | null = null;
  satir.forEach((gun, i) => {
    const aktif = gun != null && (gunler[gun] ?? 0) !== 0;
    if (aktif && bas == null) bas = i;
    if (!aktif && bas != null) { out.push({ bas, son: i - 1 }); bas = null; }
  });
  if (bas != null) out.push({ bas, son: satir.length - 1 });
  return out;
}
