"use client";

// Seri ekranı — mobil uygulamadaki StreakScreen'in web karşılığı.
// Aynı veri: users/{uid}/streak (count, lastDay, days/{yyyy-MM}/{gün} = aktivite maskesi).
// Aynı görsel dil: halkalı gün hücreleri, ardışık günlerin arkasında turuncu seri şeridi.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
const RENK_BOS    = "rgba(255,255,255,0.33)";
const RENK_SERI   = "#CB8000";

export default function SeriSayfasi() {
  return (
    <Kabuk>
      <SeriIcerik />
    </Kabuk>
  );
}

function SeriIcerik() {
  const { kullanici } = useOturum();
  const [kaydirma, setKaydirma] = useState(0);   // 0 = bu ay, -1 = önceki ay…
  const [veri, setVeri] = useState<SeriAy | null>(null);
  // Üstteki bant BUGÜNE bakar, gezilen aya değil (uygulamada da öyle):
  // yalnızca içinde bulunduğumuz ay yüklendiğinde güncellenir.
  const [bugunMaskesi, setBugunMaskesi] = useState(0);

  const bugun = gunAnahtari();
  const [buYil, buAy] = [Number(bugun.slice(0, 4)), Number(bugun.slice(5, 7))];
  const bugunGun = Number(bugun.slice(8, 10));

  // Gösterilen ay (Istanbul takvimine göre kaydırılmış)
  const { yil, ay } = useMemo(() => {
    const t = new Date(Date.UTC(buYil, buAy - 1 + kaydirma, 1, 12));
    return { yil: t.getUTCFullYear(), ay: t.getUTCMonth() + 1 };
  }, [buYil, buAy, kaydirma]);

  const ayAnahtari = `${yil}-${String(ay).padStart(2, "0")}`;
  const buAyMi = kaydirma === 0;

  useEffect(() => {
    if (!kullanici) { setVeri(null); return; }
    let iptal = false;
    seriAyiOku(kullanici.uid, ayAnahtari)
      .then((v) => {
        if (iptal) return;
        setVeri(v);
        if (buAyMi) setBugunMaskesi(v.gunler[bugunGun] ?? 0);
      })
      .catch(() => { if (!iptal) setVeri(null); });
    return () => { iptal = true; };
  }, [kullanici, ayAnahtari, buAyMi, bugunGun]);

  const gunler = veri?.gunler ?? {};
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
          <Link className="bk-dugme" href="/uygulama/giris">Giriş yap</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <div
        className="bk-seri-bant"
        style={{ background: bugunAktif ? RENK_SERI : "#2C335E" }}
      >
        <Halka maske={bugunMaskesi} boyut={100} kalinlik={14} />
        <div>
          <div className="sayi">{veri ? Math.max(0, veri.sayi) : "—"}</div>
          <div className="etiket">günlük seri!</div>
        </div>
      </div>

      <div className="bk-kart" style={{ marginBottom: 18 }}>
        <div className="bk-takvim-ust">
          <button className="bk-ay-dugme" onClick={() => setKaydirma((k) => k - 1)} aria-label="Önceki ay">‹</button>
          <h3>{AYLAR[ay - 1]} {yil}</h3>
          <button
            className="bk-ay-dugme"
            onClick={() => setKaydirma((k) => k + 1)}
            aria-label="Sonraki ay"
          >›</button>
        </div>

        <div className="bk-hafta">
          {HAFTA.map((g) => <div key={g}>{g}</div>)}
        </div>

        <div className="bk-satirlar">
          {satirlar.map((satir, i) => (
            <div className="bk-hafta-satir" key={i}>
              {/* Ardışık aktif günlerin arkasındaki turuncu şerit */}
              {seritler(satir, gunler).map((s, j) => (
                <span
                  key={j}
                  className="bk-seri-serit"
                  style={{
                    left: `calc(${(s.bas / 7) * 100}% + 6px)`,
                    width: `calc(${((s.son - s.bas + 1) / 7) * 100}% - 12px)`,
                  }}
                />
              ))}
              <div className="bk-gunler">
                {satir.map((gun, k) =>
                  gun == null ? (
                    <div className="bk-gun bos" key={k}>0</div>
                  ) : (
                    <div className="bk-gun" key={k}>
                      <span className="no">{gun}</span>
                      <Halka maske={gunler[gun] ?? 0} boyut={22} kalinlik={5} />
                    </div>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bk-kart bk-aciklama">
        <p>
          Her gün Test Çözdüğünde, Konu Defteri okuduğunda ya da Yazılıya Hazırlık
          yaptığında seri artar.
        </p>
        <div className="bk-etiketler">
          <span className="bk-etiket"><i style={{ background: RENK_DEFTER }} /> Konu Defteri</span>
          <span className="bk-etiket"><i style={{ background: RENK_TEST }} /> Konu Testi</span>
          <span className="bk-etiket"><i style={{ background: RENK_YAZILI }} /> Yazılı Çözümü</span>
        </div>
      </div>
    </>
  );
}

/* --------------------------------------------------------------- yardımcı */

/** Maskedeki her aktivite için halkada eşit bir dilim (uygulamadaki Canvas çizimi). */
function Halka({ maske, boyut, kalinlik }: { maske: number; boyut: number; kalinlik: number }) {
  const renkler: string[] = [];
  if (maske & ACT_DEFTER) renkler.push(RENK_DEFTER);
  if (maske & ACT_TEST)   renkler.push(RENK_TEST);
  if (maske & ACT_YAZILI) renkler.push(RENK_YAZILI);

  const r = (boyut - kalinlik) / 2;
  const cevre = 2 * Math.PI * r;

  return (
    <svg className="halka" width={boyut} height={boyut} viewBox={`0 0 ${boyut} ${boyut}`}>
      {renkler.length === 0 ? (
        <circle cx={boyut / 2} cy={boyut / 2} r={r} fill="none" stroke={RENK_BOS} strokeWidth={kalinlik} />
      ) : (
        renkler.map((renk, i) => {
          const dilim = cevre / renkler.length;
          return (
            <circle
              key={i}
              cx={boyut / 2}
              cy={boyut / 2}
              r={r}
              fill="none"
              stroke={renk}
              strokeWidth={kalinlik}
              strokeDasharray={`${dilim} ${cevre - dilim}`}
              strokeDashoffset={-dilim * i}
              transform={`rotate(-90 ${boyut / 2} ${boyut / 2})`}
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
