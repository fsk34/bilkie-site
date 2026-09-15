"use client";

// Ok Bulmaca — yaz kampındaki ArrowBolum'un kalıcı, bölümlü sürümü (15 Eyl 2026; Android
// ArrowBolum.kt görsel dili). Her ok çok hücreli kıvrımlı bir yılan, ucunda ok başı. Ucu açık
// oka dokun → ok başı yönünde kayıp tahtadan çıkar. Önü kapalıysa → kırmızı yanıp geri
// teper, 1 hak gider. 3 hak biter → bölümü baştan oyna (kampta reklamla +1 hak vardı; web'de
// reklam yok). Tümü çıkınca bölüm biter, sıradaki açılır.
//
// Bölümler: oklar.json (120; 1-10 kamptan, 11-120 üretilmiş, hepsi çözülebilir). Üç platform
// aynı dosyayı ve aynı ilerleme düğümünü (users/{uid}/okbulmaca) kullanır.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Lottie from "../../Lottie";
import UcNokta from "../../UcNokta";
import { useOturum } from "../../../lib/oturum";
import { oyunBolumu, oyunBolumuYaz } from "../../../lib/veri";
import { sesCal } from "../../ses";
import veri from "./oklar.json";

type Hucre = [number, number];
type Bolum = { satir: number; sutun: number; oklar: { hucreler: Hucre[] }[] };
const BOLUMLER = (veri as unknown as { bolumler: Bolum[] }).bolumler;
const OK_BOLUM_SAYISI = BOLUMLER.length;

const LACIVERT = "#2B3350", KIRMIZI = "#E0483F", ZEMIN = "#F3F5FA", NOKTA = "#BCC3D4";
const HAK = 3;

type Ok = { id: number; hucreler: Hucre[]; yon: Hucre; durum: "duruyor" | "cikiyor" | "cikti" | "carpti" };

function yonu(h: Hucre[]): Hucre {
  if (h.length < 2) return [0, 1];
  const [r0, c0] = h[h.length - 2], [r1, c1] = h[h.length - 1];
  return [Math.sign(r1 - r0), Math.sign(c1 - c0)];
}

function oklariKur(b: Bolum): Ok[] {
  return b.oklar.map((o, i) => ({ id: i, hucreler: o.hucreler, yon: yonu(o.hucreler), durum: "duruyor" }));
}

/** Şaftlar düz, köşeler yuvarlak: hücre merkezlerinden geçen SVG yolu (birim = hücre). */
function okYolu(h: Hucre[]): string {
  const p = h.map(([r, c]) => [c + 0.5, r + 0.5] as [number, number]);
  if (p.length === 1) return `M${p[0][0]} ${p[0][1]} l0.001 0`;
  let d = `M${p[0][0]} ${p[0][1]}`;
  const R = 0.28;
  for (let i = 1; i < p.length; i++) {
    const [x, y] = p[i];
    if (i < p.length - 1) {
      const [px, py] = p[i - 1], [nx, ny] = p[i + 1];
      // köşeye R kala dur, yayla dön
      const ax = x - Math.sign(x - px) * R, ay = y - Math.sign(y - py) * R;
      const bx = x + Math.sign(nx - x) * R, by = y + Math.sign(ny - y) * R;
      d += ` L${ax} ${ay} Q${x} ${y} ${bx} ${by}`;
    } else d += ` L${x} ${y}`;
  }
  return d;
}

export default function OkBulmaca() {
  const router = useRouter();
  const { kullanici, yukleniyor } = useOturum();
  const [asama, setAsama] = useState<"yukleniyor" | "secim" | "oyun">("yukleniyor");
  const [ilerleme, setIlerleme] = useState(1);          // sıradaki (henüz bitmemiş) bölüm
  const [bolumNo, setBolumNo] = useState(1);
  const [oklar, setOklar] = useState<Ok[]>([]);
  const [hak, setHak] = useState(HAK);
  const [kazandi, setKazandi] = useState(false);
  const [hakBitti, setHakBitti] = useState(false);
  const [cikisSor, setCikisSor] = useState(false);
  const zamanlayicilar = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (yukleniyor) return;
    if (!kullanici) { router.replace("/giris"); return; }
    let iptal = false;
    oyunBolumu(kullanici.uid, "okbulmaca").then((b) => { if (!iptal) { setIlerleme(b); setAsama("secim"); } });
    return () => { iptal = true; };
  }, [kullanici, yukleniyor, router]);
  useEffect(() => () => zamanlayicilar.current.forEach(clearTimeout), []);

  const bolum = BOLUMLER[Math.min(bolumNo, OK_BOLUM_SAYISI) - 1];

  const basla = useCallback((no: number) => {
    const n = Math.min(Math.max(1, no), OK_BOLUM_SAYISI);
    setBolumNo(n); setOklar(oklariKur(BOLUMLER[n - 1])); setHak(HAK);
    setKazandi(false); setHakBitti(false); setAsama("oyun");
  }, []);

  /** Ok başının önündeki hat kenara kadar boş mu? */
  const onuAcik = useCallback((a: Ok, liste: Ok[]) => {
    const dolu = new Set<string>();
    for (const o of liste) if (o.id !== a.id && (o.durum === "duruyor" || o.durum === "carpti")) for (const [r, c] of o.hucreler) dolu.add(`${r},${c}`);
    let [r, c] = a.hucreler[a.hucreler.length - 1];
    for (;;) {
      r += a.yon[0]; c += a.yon[1];
      if (r < 0 || c < 0 || r >= bolum.satir || c >= bolum.sutun) return true;
      if (dolu.has(`${r},${c}`)) return false;
    }
  }, [bolum]);

  const dokun = useCallback((id: number) => {
    if (kazandi || hakBitti) return;
    const a = oklar.find((o) => o.id === id);
    if (!a || a.durum !== "duruyor") return;
    if (onuAcik(a, oklar)) {
      sesCal("t2048_kaydirma", 0.5);
      const sonraki = oklar.map((o) => (o.id === id ? { ...o, durum: "cikiyor" as const } : o));
      setOklar(sonraki);
      zamanlayicilar.current.push(setTimeout(() => {
        setOklar((l) => {
          const yeni = l.map((o) => (o.id === id ? { ...o, durum: "cikti" as const } : o));
          if (yeni.every((o) => o.durum === "cikti")) { setKazandi(true); sesCal("levelcompleted"); }
          return yeni;
        });
      }, 480));
    } else {
      sesCal("yanlis", 0.6);
      setOklar((l) => l.map((o) => (o.id === id ? { ...o, durum: "carpti" as const } : o)));
      zamanlayicilar.current.push(setTimeout(() => setOklar((l) => l.map((o) => (o.id === id ? { ...o, durum: "duruyor" as const } : o))), 420));
      setHak((h) => { const y = h - 1; if (y <= 0) setHakBitti(true); return y; });
    }
  }, [oklar, kazandi, hakBitti, onuAcik]);

  const devam = useCallback(() => {
    const sonraki = bolumNo + 1;
    if (kullanici && sonraki > ilerleme) { setIlerleme(sonraki); oyunBolumuYaz(kullanici.uid, "okbulmaca", sonraki).catch(() => {}); }
    if (sonraki > OK_BOLUM_SAYISI) setAsama("secim"); else basla(sonraki);
  }, [bolumNo, ilerleme, kullanici, basla]);

  // Kayma mesafesi: ok kenardan tamamen çıkana kadar (hücre birimi)
  const cikisMesafesi = useMemo(() => (a: Ok) => {
    const [r, c] = a.hucreler[a.hucreler.length - 1];
    const kenar = a.yon[0] > 0 ? bolum.satir - r : a.yon[0] < 0 ? r + 1 : a.yon[1] > 0 ? bolum.sutun - c : c + 1;
    return kenar + a.hucreler.length + 1;
  }, [bolum]);

  if (asama === "yukleniyor") return <div className="bk bk-oyun-sahne"><UcNokta style={{ padding: 60 }} /></div>;

  if (asama === "secim") {
    const hepsi = ilerleme > OK_BOLUM_SAYISI;
    return (
      <div className="bk bk-oyun-sahne bk-ok-sahne">
        <div className="bk-oyun-ust">
          <button className="bk-oyun-geri" aria-label="Geri" onClick={() => router.push("/oyunlar")}>‹</button>
          <div className="bk-oyun-ad" style={{ color: "#fff" }}>Ok Bulmaca</div>
          <span style={{ width: 40 }} />
        </div>
        <p className="bk-oyun-ipucu" style={{ marginTop: 0 }}>Ucu açık oka dokun, tahtadan çıksın. Önü kapalıysa hakkın gider!</p>
        <div className="bk-bolum-kart">
          <div className="ust"><span>{hepsi ? "Tüm bölümler tamam!" : `Bölüm ${ilerleme}`}</span><small>{Math.min(ilerleme - 1, OK_BOLUM_SAYISI)} / {OK_BOLUM_SAYISI} tamamlandı</small></div>
          <div className="cubuk"><i style={{ width: `${Math.min(100, ((ilerleme - 1) / OK_BOLUM_SAYISI) * 100)}%` }} /></div>
          <button className="bk-oyun-dugme sari" onClick={() => basla(hepsi ? 1 : ilerleme)}>{hepsi ? "Baştan oyna" : "Oyna"}</button>
        </div>
        {ilerleme > 1 && (
          <>
            <h2 className="bk-bolum-baslik">Bölümler</h2>
            <div className="bk-bolum-izgara">
              {Array.from({ length: OK_BOLUM_SAYISI }, (_, i) => i + 1).map((n) => (
                <button key={n} className="bk-bolum-goz" data-durum={n < ilerleme ? "bitti" : n === ilerleme ? "sirada" : "kilitli"} disabled={n > ilerleme} onClick={() => basla(n)}>{n}</button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  const R = bolum.satir, C = bolum.sutun;
  return (
    <div className="bk bk-oyun-sahne bk-ok-sahne">
      <div className="bk-oyun-ust">
        <button className="bk-oyun-geri" aria-label="Geri" onClick={() => setCikisSor(true)}>‹</button>
        <div className="bk-oyun-ad" style={{ color: "#fff", fontSize: 22 }}>Bölüm {bolumNo}</div>
        <div className="bk-ok-hak" aria-label={`${hak} hak`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/uygulama/hakicon.svg" alt="" /><b>{hak}</b>
        </div>
      </div>
      <p className="bk-oyun-ipucu" style={{ margin: "0 0 12px" }}>Ucu açık oka dokun → tahtadan çıkar. Önü kapalıysa hakkın gider!</p>

      <div className="bk-ok-tahta" style={{ aspectRatio: `${C} / ${R}` }}>
        <svg viewBox={`0 0 ${C} ${R}`} width="100%" height="100%">
          <rect width={C} height={R} fill={ZEMIN} rx={0.3} />
          {Array.from({ length: R }, (_, r) => Array.from({ length: C }, (_, c) => (
            <circle key={`${r}-${c}`} cx={c + 0.5} cy={r + 0.5} r={0.045} fill={NOKTA} />
          )))}
          {oklar.filter((o) => o.durum !== "cikti").map((o) => {
            const [hr, hc] = o.hucreler[o.hucreler.length - 1];
            const [dr, dc] = o.yon;
            const m = o.durum === "cikiyor" ? cikisMesafesi(o) : o.durum === "carpti" ? 0.18 : 0;
            const renk = o.durum === "carpti" ? KIRMIZI : LACIVERT;
            // Ok başı: baş hücrenin yön tarafındaki kenara oturan üçgen
            const bx = hc + 0.5 + dc * 0.5, by = hr + 0.5 + dr * 0.5;   // uç
            const px = -dr, py = dc;                                     // dik yön
            const ax = bx - dc * 0.42 + px * 0.42, ay = by - dr * 0.42 + py * 0.42;
            const cx = bx - dc * 0.42 - px * 0.42, cy = by - dr * 0.42 - py * 0.42;
            return (
              <g
                key={o.id}
                className="bk-ok"
                data-durum={o.durum}
                style={{ transform: `translate(${dc * m}px, ${dr * m}px)` }}
                onClick={() => dokun(o.id)}
              >
                {/* geniş görünmez vuruş alanı: parmakla kolay tutulsun */}
                <path d={okYolu(o.hucreler)} fill="none" stroke="transparent" strokeWidth={0.95} strokeLinecap="round" strokeLinejoin="round" />
                <path d={okYolu(o.hucreler)} fill="none" stroke={renk} strokeWidth={0.5} strokeLinecap="round" strokeLinejoin="round" />
                <polygon points={`${bx},${by} ${ax},${ay} ${cx},${cy}`} fill={renk} />
              </g>
            );
          })}
        </svg>
      </div>

      {kazandi && (
        <div className="bk-oyun-ortu">
          <Lottie ad="confetti" className="bk-oyun-konfeti" />
          <div className="govde">
            <div style={{ fontSize: 40, fontWeight: 700, color: "#EDC22E" }} className="baslik">Bölüm {bolumNo} tamam!</div>
            <div style={{ fontSize: 18 }}>Tüm oklar çıktı. Harikasın!</div>
            <div className="bk-oyun-dugmeler">
              <button className="bk-oyun-dugme sari" onClick={devam}>{bolumNo >= OK_BOLUM_SAYISI ? "Bitir" : "Sonraki bölüm"}</button>
            </div>
          </div>
        </div>
      )}
      {hakBitti && !kazandi && (
        <div className="bk-oyun-ortu">
          <div className="bk-oyun-onay">
            <div className="sor">Hakların bitti</div>
            <div className="not">Bu bölümü baştan dene; okların sırasını bulacaksın.</div>
            <div className="ikili">
              <button className="bk-oyun-dugme" style={{ flex: 1 }} onClick={() => setAsama("secim")}>Bölümler</button>
              <button className="bk-oyun-dugme sari" style={{ flex: 1 }} onClick={() => basla(bolumNo)}>Tekrar dene</button>
            </div>
          </div>
        </div>
      )}
      {cikisSor && (
        <div className="bk-oyun-ortu hafif" onClick={() => setCikisSor(false)}>
          <div className="bk-oyun-onay" onClick={(e) => e.stopPropagation()}>
            <div className="sor">Bölümden çıkılsın mı?</div>
            <div className="not">İlerlemen bu bölüm için kaybolur.</div>
            <div className="ikili">
              <button className="bk-oyun-dugme" style={{ flex: 1 }} onClick={() => setCikisSor(false)}>Kal</button>
              <button className="bk-oyun-dugme sari" style={{ flex: 1 }} onClick={() => { setCikisSor(false); setAsama("secim"); }}>Çık</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
