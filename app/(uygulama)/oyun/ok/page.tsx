"use client";

// Ok Bulmaca — yaz kampındaki ArrowBolum'un kalıcı, bölümlü sürümü (15 Eyl 2026; Android
// ArrowBolum.kt görsel dili). Her ok çok hücreli kıvrımlı bir yılan, ucunda ok başı. Ucu açık
// oka dokun → ok başı yönünde kayıp tahtadan çıkar. Önü kapalıysa → kırmızı yanıp geri
// teper, 1 hak gider. 3 hak biter → bölümü baştan oyna (kampta reklamla +1 hak vardı; web'de
// reklam yok). Tümü çıkınca bölüm biter, sıradaki açılır.
//
// Bölümler: okbulmaca veritabanı `bolumler` (1-10 kamptan, sonrası üretilmiş). Üç platform
// aynı dosyayı ve aynı ilerleme düğümünü (users/{uid}/okbulmaca) kullanır.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BolumBitis, BolumCikisOnayi, OnayDugme, OyunUstBar } from "../../BolumOrtak";
import UcNokta from "../../UcNokta";
import { useOturum } from "../../../lib/oturum";
import { oyunBolumu, oyunBolumuYaz } from "../../../lib/veri";
import { sesCal, sesleriOnYukle } from "../../ses";
import { get, ref as dbRef } from "firebase/database";
import { okBulmacaDb } from "../../../lib/firebase";

type Hucre = [number, number];
type Bolum = { satir: number; sutun: number; oklar: { hucreler: Hucre[] }[] };
// TEK kaynak: `okbulmaca` veritabanı (`bolumler`) — Kelime Gezmece gibi (6 Eki 2026; Android/iOS ile aynı).
// Eskiden oklar.json ilk kare + yedekti ve DB listesi paketten kısaysa paket kullanılıyordu →
// konsoldan bölüm silmek/kısaltmak görünmüyordu. Artık konsolda ne varsa o.
/**
 * Bölüm oynanabilir mi (Android okBolumGecerli, 24 Eyl 2026): ızgara > 0, en az bir ok; her ok ≥ 2
 * hücre, hücreler ızgara içinde, ardışık hücreler komşu. Aynı hücre tekrarı → yön (0,0) → sonsuz
 * döngü; boş ok → çökme.
 */
function bolumGecerli(b: Bolum): boolean {
  if (!b || !(b.satir > 0) || !(b.sutun > 0) || !Array.isArray(b.oklar) || b.oklar.length === 0) return false;
  return b.oklar.every((ok) => {
    const h = ok?.hucreler;
    return Array.isArray(h) && h.length >= 2 &&
      h.every(([r, c]) => Number.isInteger(r) && Number.isInteger(c) && r >= 0 && r < b.satir && c >= 0 && c < b.sutun) &&
      h.every((x, i) => i === 0 || Math.abs(x[0] - h[i - 1][0]) + Math.abs(x[1] - h[i - 1][1]) === 1);
  });
}

/** DB'deki ham bölüm → Bolum; eksik/bozuk koordinat -1 olur (doğrulamada elenir). */
function bolumCoz(v: unknown): Bolum {
  const o = (v ?? {}) as Record<string, unknown>;
  const dizi = (x: unknown): unknown[] => (Array.isArray(x) ? x : x && typeof x === "object" ? Object.values(x) : []);
  const n = (x: unknown) => (typeof x === "number" ? x : -1);
  return {
    satir: n(o.satir), sutun: n(o.sutun),
    oklar: dizi(o.oklar).map((ok) => ({
      hucreler: dizi((ok as Record<string, unknown>)?.hucreler).map((h) => { const p = dizi(h); return [n(p[0]), n(p[1])] as Hucre; }),
    })),
  };
}

/** İlk geçersiz bölümde listeyi keser — numaralar kaymasın diye aradan atlamak yerine. */
function gecerliOnEk(l: Bolum[]): Bolum[] {
  const i = l.findIndex((b) => !bolumGecerli(b));
  return i < 0 ? l : l.slice(0, i);
}


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
/** Android FastOutLinearInEasing = cubic-bezier(0.4, 0, 1, 1) */
function fastOutLinearIn(x: number): number {
  const b = (t: number, p1: number, p2: number) => 3 * (1 - t) * (1 - t) * t * p1 + 3 * (1 - t) * t * t * p2 + t * t * t;
  let lo = 0, hi = 1, t = x;
  for (let k = 0; k < 20; k++) { t = (lo + hi) / 2; if (b(t, 0.4, 1) < x) lo = t; else hi = t; }
  return b(t, 0, 1);
}

function yolCiz(p: Nokta[]): string {
  if (p.length === 0) return "";
  if (p.length === 1) return `M${p[0][0]} ${p[0][1]} l0.001 0`;
  let d = `M${p[0][0]} ${p[0][1]}`;
  const R = 0.11;   // Android densifyRounded CORNER_R
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
  // Oyunun sesleri sayfa açılırken belleğe (ilk çalışta gecikme olmasın)
  useEffect(() => { sesleriOnYukle(["t2048_kaydirma", "yanlis", "levelcompleted"]); }, []);
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
  const [BOLUMLER, setBolumler] = useState<Bolum[]>([]);
  const [bolumDurumu, setBolumDurumu] = useState<"yukleniyor" | "tamam" | "hata">("yukleniyor");
  const [deneme, setDeneme] = useState(0);
  const OK_BOLUM_SAYISI = BOLUMLER.length;
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
  useEffect(() => {
    let iptal = false;
    setBolumDurumu("yukleniyor");
    get(dbRef(okBulmacaDb, "bolumler"))
      .then((snap) => {
        const v = snap.val();
        const ham: unknown[] = Array.isArray(v) ? v.filter(Boolean) : v ? Object.values(v) : [];
        const liste = gecerliOnEk(ham.map(bolumCoz));   // bozuk bölümden sonrası atılır
        if (iptal) return;
        if (liste.length) { setBolumler(liste); setBolumDurumu("tamam"); } else setBolumDurumu("hata");
      })
      .catch(() => { if (!iptal) setBolumDurumu("hata"); });
    return () => { iptal = true; };
  }, [deneme]);
  useEffect(() => () => { zamanlayicilar.current.forEach(clearTimeout); if (rafRef.current != null) cancelAnimationFrame(rafRef.current); }, []);

  const bolum = BOLUMLER[Math.min(bolumNo, OK_BOLUM_SAYISI) - 1];


  const basla = useCallback((no: number) => {
    const n = Math.min(Math.max(1, no), OK_BOLUM_SAYISI);
    setBolumNo(n); setOklar(oklariKur(BOLUMLER[n - 1])); setHak(HAK); setCikis({}); cikisRef.current = {};
    setKazandi(false); setHakBitti(false); setAsama("oyun");
    // BOLUMLER artık durum: DB listesi sonradan gelirse eski dizi kapanışta kalmasın.
  }, [BOLUMLER, OK_BOLUM_SAYISI]);

  // Seçim ekranı yerine: ilerleme + bölümler hazır olunca kaldığı bölüm (hepsi bittiyse baştan)
  useEffect(() => {
    if (asama !== "secim" || bolumDurumu !== "tamam") return;
    basla(ilerleme > OK_BOLUM_SAYISI ? 1 : ilerleme);
  }, [asama, bolumDurumu, ilerleme, OK_BOLUM_SAYISI, basla]);

  /** Ok başının önündeki hat kenara kadar boş mu? */
  const onuAcik = useCallback((a: Ok, liste: Ok[]) => {
    const dolu = new Set<string>();
    for (const o of liste) if (o.id !== a.id && (o.durum === "duruyor" || o.durum === "carpti")) for (const [r, c] of o.hucreler) dolu.add(`${r},${c}`);
    if (a.yon[0] === 0 && a.yon[1] === 0) return true;   // bozuk yön: sonsuz döngüye girme
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
      // Android: tween(430 + maxStart·2, FastOutLinearIn) — maxStart ≈ hücre başına 4 yoğun nokta → 8 ms/hücre
      cikisRef.current[id] = { basla: performance.now(), sure: 430 + mesafe * 8, mesafe };
      const adim = () => {
        const simdi = performance.now();
        const yeni: Record<number, number> = {};
        const bitenler: number[] = [];
        for (const [k, v] of Object.entries(cikisRef.current)) {
          const t = Math.min(1, (simdi - v.basla) / v.sure);
          yeni[Number(k)] = v.mesafe * fastOutLinearIn(t);   // Android FastOutLinearInEasing
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
      // Android: 0,3 hücre ileri 90 ms → geri 230 ms; kırmızı 480 ms'de söner (CSS geçişi)
      zamanlayicilar.current.push(setTimeout(() => setOklar((l) => l.map((o) => (o.id === id ? { ...o, durum: "duruyor" as const } : o))), 90));
      setHak((h) => { const y = h - 1; if (y <= 0) setHakBitti(true); return y; });
    }
  }, [oklar, kazandi, hakBitti, onuAcik, cikisMesafesi]);

  const devam = useCallback(() => {
    const sonraki = bolumNo + 1;
    if (kullanici && sonraki > ilerleme) { setIlerleme(sonraki); oyunBolumuYaz(kullanici.uid, "okbulmaca", sonraki); }
    if (sonraki > OK_BOLUM_SAYISI) router.push("/oyunlar"); else basla(sonraki);
  }, [bolumNo, ilerleme, kullanici, basla, OK_BOLUM_SAYISI, router]);


  if (bolumDurumu === "hata") {
    return (
      <div className="bk bk-oyun-sahne" style={{ textAlign: "center", padding: 40 }}>
        <p style={{ fontWeight: 700, fontSize: 20, color: LACIVERT }}>Bölümler yüklenemedi</p>
        <p style={{ fontSize: 14, color: "#5A617A", marginTop: 8 }}>İnternet bağlantını kontrol edip yeniden dene.</p>
        <div style={{ marginTop: 18, display: "flex", gap: 10, justifyContent: "center" }}>
          <OnayDugme metin="Yeniden dene" zemin="#86B7DD" renk="#0C1A3F" onClick={() => setDeneme((d) => d + 1)} />
          <OnayDugme metin="Geri" zemin="#E6E9F2" renk="#2B3350" onClick={() => router.push("/oyunlar")} />
        </div>
      </div>
    );
  }
  if (asama === "yukleniyor" || bolumDurumu === "yukleniyor") return <div className="bk bk-oyun-sahne"><UcNokta style={{ padding: 60 }} /></div>;

  // Bölüm seçim ekranı yok (6 Eki 2026, uygulamalarla aynı): aşağıdaki etki doğrudan kaldığı bölümü açar
  if (asama === "secim") return <div className="bk bk-oyun-sahne bk-ok-sahne" />;

  const R = bolum.satir, C = bolum.sutun;
  return (
    <div className="bk bk-oyun-sahne bk-ok-sahne">
      <OyunUstBar
        baslik={`Bölüm ${bolumNo}`} tema="acik" onGeri={() => setCikisSor(true)}
        // eslint-disable-next-line @next/next/no-img-element
        sag={<span className="bk-ok-hak" aria-label={`${hak} hak`}><img src="/uygulama/hakicon.svg" alt="" /><b>{hak}</b></span>}
      />

      <div className="bk-ok-tahta" style={{ aspectRatio: `${C} / ${R}` }}>
        <svg viewBox={`0 0 ${C} ${R}`} width="100%" height="100%">
          <rect width={C} height={R} fill="#FFFFFF" rx={0.16} />   {/* Android köşe = hücre × 0.16 */}
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
              dolu.has(`${r},${c}`) ? null : <circle key={`${r}-${c}`} cx={c + 0.5} cy={r + 0.5} r={0.035} fill={NOKTA} />
            ));
          })()}
          {oklar.filter((o) => o.durum !== "cikti").map((o) => {
            const m = o.durum === "carpti" ? 0.3 : 0;   // Android vur = hücre × 0.3
            const renk = o.durum === "carpti" ? KIRMIZI : LACIVERT;
            const sIlerleme = o.durum === "cikiyor" ? (cikis[o.id] ?? 0) : 0;
            const { p, yon: [dr, dc] } = yilanPenceresi(o.hucreler, o.yon, sIlerleme, R + C + o.hucreler.length + 2);
            if (p.length === 0) return null;
            // İnce şaft (0,11 hücre) + küçük üçgen ok başı (Android ArrowBolum ölçüleri):
            // şaft başın tabanında biter; uç tabandan 0,34 ileride, yarım genişlik 0,2
            const [kx, ky] = p[p.length - 1];
            // Android drawOk: uç 0.262, taban 0.014, yarım genişlik 0.117 (hücre)
            const bx = kx + dc * 0.014, by = ky + dr * 0.014;
            const tx = kx + dc * 0.262, ty = ky + dr * 0.262;
            const px = -dr, py = dc;
            const ax = bx + px * 0.117, ay = by + py * 0.117, cx = bx - px * 0.117, cy = by - py * 0.117;
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
                <path d={yolCiz(p)} fill="none" stroke={renk} strokeWidth={0.083} strokeLinecap="round" strokeLinejoin="round" />
                <polygon points={`${tx},${ty} ${ax},${ay} ${cx},${cy}`} fill={renk} />
              </g>
            );
          })}
        </svg>
      </div>

      {kazandi && (
        <BolumBitis
          baslik={`Bölüm ${bolumNo} tamam!`} altMetin="Tüm oklar çıktı. Harikasın!"
          dugme={bolumNo >= OK_BOLUM_SAYISI ? "Bitir" : "Sonraki bölüm →"} onDevam={devam}
        />
      )}
      {hakBitti && !kazandi && (
        // Android HakBittiDialog: beyaz kart (reklamla +1 hak web'de yok)
        <div className="bk-bolum-onay">
          <div className="kart">
            <b>Hakların bitti!</b>
            <span>Bölümü baştan dene; okların sırasını bulacaksın.</span>
            <div className="ikili">
              <OnayDugme metin="Çık" zemin="#E6E9F2" renk="#2B3350" onClick={() => router.push("/oyunlar")} />
              <OnayDugme metin="Tekrar dene" zemin="#EDC22E" renk="#000" onClick={() => basla(bolumNo)} />
            </div>
          </div>
        </div>
      )}
      {cikisSor && <BolumCikisOnayi onKal={() => setCikisSor(false)} onCik={() => { setCikisSor(false); router.push("/oyunlar"); }} />}
    </div>
  );
}
