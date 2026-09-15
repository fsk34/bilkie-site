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

const LACIVERT = "#2B3350", KIRMIZI = "#E0483F", NOKTA = "#BCC3D4";
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

type Nokta = [number, number];

/** Şaftlar düz, köşeler yuvarlak (R=0,28 hücre): nokta listesinden SVG yolu (birim = hücre). */
function yolCiz(p: Nokta[]): string {
  if (p.length === 0) return "";
  if (p.length === 1) return `M${p[0][0]} ${p[0][1]} l0.001 0`;
  let d = `M${p[0][0]} ${p[0][1]}`;
  const R = 0.28;
  for (let i = 1; i < p.length; i++) {
    const [x, y] = p[i];
    if (i < p.length - 1) {
      const [px, py] = p[i - 1], [nx, ny] = p[i + 1];
      const donuyor = Math.sign(x - px) !== Math.sign(nx - x) || Math.sign(y - py) !== Math.sign(ny - y);
      if (!donuyor) continue;                     // düz devam: ara nokta gereksiz
      const ax = x - Math.sign(x - px) * R, ay = y - Math.sign(y - py) * R;
      const bx = x + Math.sign(nx - x) * R, by = y + Math.sign(ny - y) * R;
      d += ` L${ax} ${ay} Q${x} ${y} ${bx} ${by}`;
    } else d += ` L${x} ${y}`;
  }
  return d;
}

/**
 * Yılan: okun kontrol çizgisi = gövde hücre merkezleri + baş yönünde düz uzantı (tahta dışına).
 * `s` ilerledikçe gövde bu çizgi boyunca kayar (Android ArrowBolum "slither"): pencere [s, s+L].
 * Dönen: pencerenin noktaları (köşeler dahil) + baş yönü.
 */
function yilanPenceresi(hucreler: Hucre[], yon: Hucre, s: number, uzanti: number): { p: Nokta[]; yon: Hucre } {
  const ctrl: Nokta[] = hucreler.map(([r, c]) => [c + 0.5, r + 0.5]);
  const [hr, hc] = hucreler[hucreler.length - 1];
  for (let k = 1; k <= uzanti; k++) ctrl.push([hc + 0.5 + yon[1] * k, hr + 0.5 + yon[0] * k]);
  const L = hucreler.length - 1 + 0.08;                 // gövde uzunluğu (şaft başın tabanına kadar)
  const bas = s + L;
  const p: Nokta[] = [];
  let birikim = 0, sonYon: Hucre = yon;
  for (let i = 0; i < ctrl.length - 1; i++) {
    const [x0, y0] = ctrl[i], [x1, y1] = ctrl[i + 1];
    const seg = Math.abs(x1 - x0) + Math.abs(y1 - y0);
    const a = birikim, b = birikim + seg;
    const ara = (t: number): Nokta => [x0 + (x1 - x0) * ((t - a) / seg), y0 + (y1 - y0) * ((t - a) / seg)];
    if (b > s && a < bas) {
      if (p.length === 0) p.push(ara(Math.max(a, s)));
      if (b <= bas) p.push([x1, y1]); else p.push(ara(bas));
      sonYon = [Math.sign(y1 - y0), Math.sign(x1 - x0)];
    }
    birikim = b;
    if (birikim >= bas) break;
  }
  return { p, yon: sonYon };
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
  // Çıkan okların yol boyunca ilerlemesi (hücre birimi); rAF ile güncellenir
  const [cikis, setCikis] = useState<Record<number, number>>({});
  const cikisRef = useRef<Record<number, { basla: number; sure: number; mesafe: number }>>({});
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (yukleniyor) return;
    if (!kullanici) { router.replace("/giris"); return; }
    let iptal = false;
    oyunBolumu(kullanici.uid, "okbulmaca").then((b) => { if (!iptal) { setIlerleme(b); setAsama("secim"); } });
    return () => { iptal = true; };
  }, [kullanici, yukleniyor, router]);
  useEffect(() => () => { zamanlayicilar.current.forEach(clearTimeout); if (rafRef.current != null) cancelAnimationFrame(rafRef.current); }, []);

  const bolum = BOLUMLER[Math.min(bolumNo, OK_BOLUM_SAYISI) - 1];

  const basla = useCallback((no: number) => {
    const n = Math.min(Math.max(1, no), OK_BOLUM_SAYISI);
    setBolumNo(n); setOklar(oklariKur(BOLUMLER[n - 1])); setHak(HAK); setCikis({}); cikisRef.current = {};
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

  // Kayma mesafesi: ok kenardan tamamen çıkana kadar (hücre birimi)
  const cikisMesafesi = useMemo(() => (a: Ok) => {
    const [r, c] = a.hucreler[a.hucreler.length - 1];
    const kenar = a.yon[0] > 0 ? bolum.satir - r : a.yon[0] < 0 ? r + 1 : a.yon[1] > 0 ? bolum.sutun - c : c + 1;
    return kenar + a.hucreler.length + 1;
  }, [bolum]);

  const dokun = useCallback((id: number) => {
    if (kazandi || hakBitti) return;
    const a = oklar.find((o) => o.id === id);
    if (!a || a.durum !== "duruyor") return;
    if (onuAcik(a, oklar)) {
      sesCal("t2048_kaydirma", 0.5);
      setOklar((l) => l.map((o) => (o.id === id ? { ...o, durum: "cikiyor" as const } : o)));
      // Yılan gibi kendi yolunu izleyerek çıkar (Android: 430 ms, FastOutLinear); uzun yol biraz daha sürer
      const mesafe = cikisMesafesi(a);
      cikisRef.current[id] = { basla: performance.now(), sure: 430 + mesafe * 12, mesafe };
      const adim = () => {
        const simdi = performance.now();
        const yeni: Record<number, number> = {};
        const bitenler: number[] = [];
        for (const [k, v] of Object.entries(cikisRef.current)) {
          const t = Math.min(1, (simdi - v.basla) / v.sure);
          yeni[Number(k)] = v.mesafe * t * t;          // hızlanarak (ease-in)
          if (t >= 1) bitenler.push(Number(k));
        }
        setCikis(yeni);
        for (const k of bitenler) delete cikisRef.current[k];
        if (bitenler.length) {
          setOklar((l) => {
            const son = l.map((o) => (bitenler.includes(o.id) ? { ...o, durum: "cikti" as const } : o));
            if (son.every((o) => o.durum === "cikti")) { setKazandi(true); sesCal("levelcompleted"); }
            return son;
          });
        }
        rafRef.current = Object.keys(cikisRef.current).length ? requestAnimationFrame(adim) : null;
      };
      if (rafRef.current == null) rafRef.current = requestAnimationFrame(adim);
    } else {
      sesCal("yanlis", 0.6);
      setOklar((l) => l.map((o) => (o.id === id ? { ...o, durum: "carpti" as const } : o)));
      zamanlayicilar.current.push(setTimeout(() => setOklar((l) => l.map((o) => (o.id === id ? { ...o, durum: "duruyor" as const } : o))), 420));
      setHak((h) => { const y = h - 1; if (y <= 0) setHakBitti(true); return y; });
    }
  }, [oklar, kazandi, hakBitti, onuAcik, cikisMesafesi]);

  const devam = useCallback(() => {
    const sonraki = bolumNo + 1;
    if (kullanici && sonraki > ilerleme) { setIlerleme(sonraki); oyunBolumuYaz(kullanici.uid, "okbulmaca", sonraki).catch(() => {}); }
    if (sonraki > OK_BOLUM_SAYISI) setAsama("secim"); else basla(sonraki);
  }, [bolumNo, ilerleme, kullanici, basla]);


  if (asama === "yukleniyor") return <div className="bk bk-oyun-sahne"><UcNokta style={{ padding: 60 }} /></div>;

  if (asama === "secim") {
    const hepsi = ilerleme > OK_BOLUM_SAYISI;
    return (
      <div className="bk bk-oyun-sahne bk-ok-sahne">
        <div className="bk-oyun-ust">
          <button className="bk-oyun-geri" aria-label="Geri" onClick={() => router.push("/oyunlar")}>‹</button>
          <div className="bk-oyun-ad">Ok Bulmaca</div>
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
        <div className="bk-oyun-ad" style={{ fontSize: 22 }}>Bölüm {bolumNo}</div>
        <div className="bk-ok-hak" aria-label={`${hak} hak`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/uygulama/hakicon.svg" alt="" /><b>{hak}</b>
        </div>
      </div>
      <p className="bk-oyun-ipucu" style={{ margin: "0 0 12px" }}>Ucu açık oka dokun → tahtadan çıkar. Önü kapalıysa hakkın gider!</p>

      <div className="bk-ok-tahta" style={{ aspectRatio: `${C} / ${R}` }}>
        <svg viewBox={`0 0 ${C} ${R}`} width="100%" height="100%">
          <rect width={C} height={R} fill="#FFFFFF" rx={0.3} />
          {/* Noktalar yalnız BOŞ hücrelerde (Android görünümü). Çıkan okta hücre = o anki gövdenin altı:
              kuyruk geçince nokta belirir, baş gelince kaybolur; ince şaftın altından nokta sızmaz. */}
          {(() => {
            const dolu = new Set<string>();
            for (const o of oklar) {
              if (o.durum === "cikti") continue;
              if (o.durum !== "cikiyor") { for (const [r, c] of o.hucreler) dolu.add(`${r},${c}`); continue; }
              // kontrol çizgisinde k. nokta = k hücre yol; gövde [s, s+L], ok ucu +0,34, nokta yarıçapı 0,05
              const s = cikis[o.id] ?? 0, n = o.hucreler.length, bas = s + n - 1 + 0.08;
              const [hr, hc] = o.hucreler[n - 1];
              for (let k = Math.max(0, Math.ceil(s - 0.06)); k <= bas + 0.4; k++) {
                const [r, c] = k < n ? o.hucreler[k] : [hr + o.yon[0] * (k - n + 1), hc + o.yon[1] * (k - n + 1)];
                dolu.add(`${r},${c}`);
              }
            }
            return Array.from({ length: R }, (_, r) => Array.from({ length: C }, (_, c) =>
              dolu.has(`${r},${c}`) ? null : <circle key={`${r}-${c}`} cx={c + 0.5} cy={r + 0.5} r={0.05} fill={NOKTA} />
            ));
          })()}
          {oklar.filter((o) => o.durum !== "cikti").map((o) => {
            const m = o.durum === "carpti" ? 0.18 : 0;
            const renk = o.durum === "carpti" ? KIRMIZI : LACIVERT;
            const sIlerleme = o.durum === "cikiyor" ? (cikis[o.id] ?? 0) : 0;
            const { p, yon: [dr, dc] } = yilanPenceresi(o.hucreler, o.yon, sIlerleme, R + C + o.hucreler.length + 2);
            if (p.length === 0) return null;
            // İnce şaft (0,11 hücre) + küçük üçgen ok başı (Android ArrowBolum ölçüleri):
            // şaft başın tabanında biter; uç tabandan 0,34 ileride, yarım genişlik 0,2
            const [kx, ky] = p[p.length - 1];
            const tx = kx + dc * 0.34, ty = ky + dr * 0.34;
            const px = -dr, py = dc;
            const ax = kx + px * 0.2, ay = ky + py * 0.2, cx = kx - px * 0.2, cy = ky - py * 0.2;
            return (
              <g
                key={o.id}
                className="bk-ok"
                data-durum={o.durum}
                style={{ transform: `translate(${o.yon[1] * m}px, ${o.yon[0] * m}px)` }}
                onClick={() => dokun(o.id)}
              >
                {/* geniş görünmez vuruş alanı: parmakla kolay tutulsun */}
                <path d={yolCiz(p)} fill="none" stroke="transparent" strokeWidth={0.9} strokeLinecap="round" strokeLinejoin="round" />
                <path d={yolCiz(p)} fill="none" stroke={renk} strokeWidth={0.11} strokeLinecap="round" strokeLinejoin="round" />
                <polygon points={`${tx},${ty} ${ax},${ay} ${cx},${cy}`} fill={renk} />
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
