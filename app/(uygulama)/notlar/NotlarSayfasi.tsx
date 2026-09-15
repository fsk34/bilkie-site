"use client";

// Notlar — Android NotlarScreen.kt / iOS NotlarScreen.swift birebir (15 Eyl 2026).
// Ana ekran dörtlüsünde Türkiye'yi Keşfet'in yerine. Sayfalı defter: metin + görsel blokları
// + üstte çizim katmanı (kalem / keçeli / fosforlu / silgi / 4 şekil, 6 renk), kâğıt türü + rengi,
// sayfalar. Şema ve depolama: lib/notlar.ts. Yeni not TASLAK ("Kaydet"e kadar DB'ye gitmez);
// mevcut not her değişiklikten 1,2 sn sonra kendiliğinden yazılır.

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { KesifGirisGerekli } from "../kesif/ortak";
import UcNokta from "../UcNokta";
import { useOturum } from "../../lib/oturum";
import {
  bosSayfa, NOT_DERSLER, NOT_KAGITLAR, NOT_KAGIT_RENKLERI, NOT_KOORDINAT_OLCEK, NOT_RENKLER,
  notDersAdi, notGorselUrl, notGorselYukle, notKaydet, notlariDinle, notSayfalari, notSil, sayfaBosMu, yeniNotId, yeniNotOzet,
  type InkOgesi, type NotBlok, type NotKagit, type NotOzet, type NotSayfa,
} from "../../lib/notlar";

const ARACLAR = [["kalem", "Kalem"], ["keceli", "Keçeli"], ["fosforlu", "Fosforlu"], ["silgi", "Silgi"]] as const;
const SEKILLER = [["cizgi", "Çizgi"], ["dikdortgen", "Kutu"], ["elips", "Elips"], ["ok", "Ok"]] as const;

function tarih(ts: number): string {
  if (!ts) return "";
  const d = new Date(ts), p = (x: number) => String(x).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

type Acik = { ozet: NotOzet; sayfalar: NotSayfa[] | null; taslak: boolean };

export default function NotlarSayfasi() {
  const { yukleniyor, kullanici } = useOturum();
  const [acik, setAcik] = useState<Acik | null>(null);

  if (!yukleniyor && !kullanici) {
    return <div className="bk bk-kesif-sahne"><KesifGirisGerekli tur="turkiye" baslik="Notlarım" aciklama="Notlarını görmek için giriş yapman gerekiyor." /></div>;
  }
  if (!kullanici) return <div className="bk bk-kesif-sahne"><UcNokta style={{ padding: 40 }} /></div>;
  const uid = kullanici.uid;

  return (
    <div className="bk bk-kesif-sahne">
      {acik ? (
        <NotEditor key={acik.ozet.id} uid={uid} acik={acik} kapat={() => setAcik(null)} />
      ) : (
        <NotListesi
          uid={uid}
          yeniNot={() => setAcik({ ozet: yeniNotOzet(yeniNotId(uid)), sayfalar: [bosSayfa()], taslak: true })}
          ac={(o) => setAcik({ ozet: o, sayfalar: null, taslak: false })}
        />
      )}
    </div>
  );
}

/* ================================================================== liste */

function NotListesi({ uid, yeniNot, ac }: { uid: string; yeniNot: () => void; ac: (o: NotOzet) => void }) {
  const [notlar, setNotlar] = useState<NotOzet[] | null>(null);
  const [sorgu, setSorgu] = useState("");
  const [ders, setDers] = useState<string | null>(null);

  useEffect(() => notlariDinle(uid, setNotlar), [uid]);

  const gorunen = useMemo(() => {
    const q = sorgu.trim().toLocaleLowerCase("tr");
    return (notlar ?? []).filter((n) =>
      (ders == null || n.ders === ders) &&
      (!q || n.baslik.toLocaleLowerCase("tr").includes(q) || n.onizleme.toLocaleLowerCase("tr").includes(q)));
  }, [notlar, sorgu, ders]);

  return (
    <div className="bk-kesif bk-notlar" data-tur="turkiye">
      <div className="bk-kesif-ust">
        <Link className="geri" href="/" aria-label="Geri">✕</Link>
        <div>
          <h1>Notlarım</h1>
          <div className="alt">Kendi defterin: yaz, çiz, görsel ekle</div>
        </div>
      </div>

      <button className="bk-not-yeni" onClick={yeniNot}>+&nbsp; Yeni Not</button>

      <input className="bk-ady-ara" placeholder="Notlarında ara…" value={sorgu} onChange={(e) => setSorgu(e.target.value)} />

      <div className="bk-not-suzgec">
        {[null, ...NOT_DERSLER].map((d) => (
          <button key={d ?? "tumu"} className="bk-kesif-cip" data-secili={d === ders} onClick={() => setDers(d)}>
            {d == null ? "Tümü" : notDersAdi(d)}
          </button>
        ))}
      </div>

      {notlar == null ? <UcNokta style={{ padding: 24 }} />
      : gorunen.length === 0 ? (
        <div className="bk-kesif-bos">
          {notlar.length === 0 ? <>Henüz not yok.<br />İlk notunu yazmak için &quot;Yeni Not&quot;a dokun.</> : "Aramana uyan not yok."}
        </div>
      ) : (
        <div className="bk-ady-liste">
          {gorunen.map((n) => (
            <button key={n.id} className="bk-kesif-kart bk-not-kart" onClick={() => ac(n)}>
              <div className="ust">
                <b>{n.baslik || "Başlıksız not"}</b>
                {n.ders && <span className="etiket">{notDersAdi(n.ders)}</span>}
              </div>
              {n.onizleme && <div className="onizleme">{n.onizleme}</div>}
              <div className="alt">{tarih(n.guncelleme)}  ·  {n.sayfaSayisi} sayfa</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================== editör */

function NotEditor({ uid, acik, kapat }: { uid: string; acik: Acik; kapat: () => void }) {
  const [ozet, setOzet] = useState<NotOzet>(acik.ozet);
  const [sayfalar, setSayfalar] = useState<NotSayfa[] | null>(acik.sayfalar);
  const [sayfaNo, setSayfaNo] = useState(0);
  const [cizimModu, setCizimModu] = useState(false);
  const [arac, setArac] = useState("kalem");       // kalem|keceli|fosforlu|silgi|sekil
  const [sekil, setSekil] = useState("cizgi");
  const [renk, setRenk] = useState(NOT_RENKLER[0]);
  const [kaydedildi, setKaydedildi] = useState(!acik.taslak);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [cikisSorusu, setCikisSorusu] = useState(false);
  const [silSorusu, setSilSorusu] = useState(false);
  const [kagitAcik, setKagitAcik] = useState(false);
  const [dersAcik, setDersAcik] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const degisiklik = useRef(0);
  const zamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dosyaGirdi = useRef<HTMLInputElement>(null);
  // Kaydetme sırasında en güncel değerleri okumak için (setTimeout içinden state eskir)
  const guncel = useRef({ ozet, sayfalar });
  guncel.current = { ozet, sayfalar };

  useEffect(() => {
    if (acik.taslak) return;
    let iptal = false;
    notSayfalari(uid, acik.ozet.id).then((s) => { if (!iptal) setSayfalar(s); }).catch(() => { if (!iptal) setSayfalar([bosSayfa()]); });
    return () => { iptal = true; };
  }, [uid, acik]);

  const dolu = () => !!guncel.current.ozet.baslik.trim() || (guncel.current.sayfalar ?? []).some((s) => !sayfaBosMu(s));

  const kaydet = useCallback(async (): Promise<boolean> => {
    const { ozet: o, sayfalar: s } = guncel.current;
    if (!s) return false;
    setKaydediliyor(true);
    try {
      const g = await notKaydet(uid, o, s);
      setOzet((e) => ({ ...e, olusturma: g.olusturma, guncelleme: g.guncelleme, sayfaSayisi: g.sayfaSayisi, onizleme: g.onizleme }));
      setKaydedildi(true);
      return true;
    } catch (e) {
      setHata("Kaydedilemedi: " + (e instanceof Error ? e.message : String(e)));
      return false;
    } finally { setKaydediliyor(false); }
  }, [uid]);

  // Kaydedilmiş not: her değişiklikten 1,2 sn sonra kendiliğinden yaz
  const degisti = useCallback(() => {
    degisiklik.current++;
    if (!kaydedildi) return;
    if (zamanlayici.current) clearTimeout(zamanlayici.current);
    zamanlayici.current = setTimeout(() => { zamanlayici.current = null; kaydet(); }, 1200);
  }, [kaydedildi, kaydet]);
  useEffect(() => () => { if (zamanlayici.current) clearTimeout(zamanlayici.current); }, []);

  const ozetDegistir = (f: (o: NotOzet) => NotOzet) => { setOzet(f); degisti(); };
  const sayfayiDegistir = (i: number, f: (s: NotSayfa) => NotSayfa) => {
    setSayfalar((l) => (l && l[i] ? l.map((s, k) => (k === i ? f(s) : s)) : l));
    degisti();
  };

  function cikmayaCalis() {
    if (!kaydedildi && dolu()) setCikisSorusu(true);
    else if (!kaydedildi) kapat();
    else {
      if (zamanlayici.current) { clearTimeout(zamanlayici.current); zamanlayici.current = null; }
      if (degisiklik.current > 0) kaydet().then(kapat); else kapat();
    }
  }

  async function gorselSec(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const yol = await notGorselYukle(uid, ozet.id, f);
      sayfayiDegistir(sayfaNo, (s) => ({ ...s, bloklar: [...s.bloklar, { t: "gorsel", yol, boyut: "tam" }, { t: "metin", v: "" }] }));
    } catch (err) { setHata("Görsel eklenemedi: " + (err instanceof Error ? err.message : String(err))); }
  }

  const sayfa = sayfalar?.[Math.min(sayfaNo, (sayfalar?.length ?? 1) - 1)] ?? null;
  const sayfaSayisi = Math.max(1, sayfalar?.length ?? 1);

  return (
    <div className="bk-kesif bk-notlar bk-not-editor" data-tur="turkiye">
      <div className="bk-not-ust">
        <button className="geri" onClick={cikmayaCalis} aria-label="Geri">✕</button>
        <input
          className="baslik" placeholder="Başlık" value={ozet.baslik} maxLength={80}
          onChange={(e) => ozetDegistir((o) => ({ ...o, baslik: e.target.value }))}
        />
        <div style={{ position: "relative" }}>
          <button className="bk-not-dugme" onClick={() => setDersAcik((v) => !v)}>
            {ozet.ders ? notDersAdi(ozet.ders).split(" ")[0] : "Ders"}
          </button>
          {dersAcik && (
            <div className="bk-not-menu">
              {[null, ...NOT_DERSLER].map((d) => (
                <button key={d ?? "yok"} onClick={() => { ozetDegistir((o) => ({ ...o, ders: d })); setDersAcik(false); }}>{notDersAdi(d)}</button>
              ))}
            </div>
          )}
        </div>
        {!kaydedildi
          ? <button className="bk-not-dugme vurgu" disabled={kaydediliyor} onClick={() => { if (dolu()) kaydet().then((ok) => ok && kapat()); }}>{kaydediliyor ? "…" : "✓ Kaydet"}</button>
          : <button className="bk-not-dugme" onClick={() => setSilSorusu(true)} aria-label="Sil">🗑</button>}
      </div>

      <div className="bk-not-govde">
        {sayfa == null ? <UcNokta style={{ padding: 40 }} /> : (
          <Kagit
            ozet={ozet} sayfa={sayfa} cizimModu={cizimModu} arac={arac} sekil={sekil} renk={renk}
            metinDegisti={(bi, v) => sayfayiDegistir(sayfaNo, (s) => ({ ...s, bloklar: s.bloklar.map((b, k) => (k === bi ? { t: "metin", v } : b)) }))}
            gorselBoyut={(bi) => sayfayiDegistir(sayfaNo, (s) => ({ ...s, bloklar: s.bloklar.map((b, k) =>
              k === bi && b.t === "gorsel" ? { ...b, boyut: b.boyut === "tam" ? "orta" : b.boyut === "orta" ? "kucuk" : "tam" } : b) }))}
            gorselSil={(bi) => sayfayiDegistir(sayfaNo, (s) => { const l = s.bloklar.filter((_, k) => k !== bi); return { ...s, bloklar: l.length ? l : [{ t: "metin", v: "" }] }; })}
            inkEkle={(o) => sayfayiDegistir(sayfaNo, (s) => ({ ...s, ink: [...s.ink, o] }))}
          />
        )}
      </div>

      <div className="bk-not-sayfabar">
        <button className="bk-not-dugme" disabled={sayfaNo <= 0} onClick={() => setSayfaNo((n) => n - 1)}>‹</button>
        <span>{Math.min(sayfaNo, sayfaSayisi - 1) + 1} / {sayfaSayisi}</span>
        <button className="bk-not-dugme" disabled={sayfaNo >= sayfaSayisi - 1} onClick={() => setSayfaNo((n) => n + 1)}>›</button>
        <button className="bk-not-dugme" onClick={() => { setSayfalar((l) => [...(l ?? []), bosSayfa()]); setSayfaNo(sayfaSayisi); degisti(); }}>+ Sayfa</button>
        <span style={{ flex: 1 }} />
        <button className="bk-not-dugme" disabled={!sayfa?.ink.length} onClick={() => sayfayiDegistir(sayfaNo, (s) => ({ ...s, ink: s.ink.slice(0, -1) }))}>↶ Geri al</button>
        {sayfaSayisi > 1 && (
          <button className="bk-not-dugme" onClick={() => { setSayfalar((l) => (l ?? []).filter((_, k) => k !== sayfaNo)); setSayfaNo((n) => Math.max(0, Math.min(n, sayfaSayisi - 2))); degisti(); }}>Sayfayı sil</button>
        )}
      </div>

      <div className="bk-not-araclar">
        <div className="serit">
          <button className="bk-not-cip" data-secili={!cizimModu} onClick={() => setCizimModu(false)}>⌨️ Yaz</button>
          {ARACLAR.map(([k, ad]) => <button key={k} className="bk-not-cip" data-secili={cizimModu && arac === k} onClick={() => { setCizimModu(true); setArac(k); }}>{ad}</button>)}
          {SEKILLER.map(([k, ad]) => <button key={k} className="bk-not-cip" data-secili={cizimModu && arac === "sekil" && sekil === k} onClick={() => { setCizimModu(true); setArac("sekil"); setSekil(k); }}>{ad}</button>)}
          <button className="bk-not-cip" onClick={() => dosyaGirdi.current?.click()}>🖼️ Görsel</button>
          <button className="bk-not-cip" onClick={() => setKagitAcik((v) => !v)}>📄 Kâğıt</button>
          <input ref={dosyaGirdi} type="file" accept="image/*" hidden onChange={gorselSec} />
        </div>
        <div className="renkler">
          {NOT_RENKLER.map((r) => <button key={r} className="renk" style={{ background: r }} data-secili={renk === r} onClick={() => setRenk(r)} aria-label={r} />)}
        </div>
        {kagitAcik && (
          <div className="serit kagit">
            {NOT_KAGITLAR.map((k) => <button key={k} className="bk-not-cip" data-secili={ozet.kagit === k} onClick={() => ozetDegistir((o) => ({ ...o, kagit: k as NotKagit }))}>{k === "kareli" ? "Kareli" : k === "cizgili" ? "Çizgili" : "Düz"}</button>)}
            <span style={{ flex: 1 }} />
            {NOT_KAGIT_RENKLERI.map((r) => <button key={r} className="renk kagit" style={{ background: r }} data-secili={ozet.kagitRenk.toUpperCase() === r} onClick={() => ozetDegistir((o) => ({ ...o, kagitRenk: r }))} aria-label={r} />)}
          </div>
        )}
      </div>

      {cikisSorusu && (
        <Soru baslik="Not kaydedilsin mi?" metin="Kaydetmezsen yazdıkların silinir."
          dugmeler={[["Kaydet", () => { setCikisSorusu(false); kaydet().then((ok) => ok && kapat()); }], ["Vazgeç", () => { setCikisSorusu(false); kapat(); }], ["İptal", () => setCikisSorusu(false)]]} />
      )}
      {silSorusu && (
        <Soru baslik="Not silinsin mi?" metin="Bu not ve tüm sayfaları silinecek. Geri alınamaz."
          dugmeler={[["Sil", () => { setSilSorusu(false); if (zamanlayici.current) clearTimeout(zamanlayici.current); notSil(uid, ozet.id).catch(() => {}).then(kapat); }], ["İptal", () => setSilSorusu(false)]]} />
      )}
      {hata && <Soru baslik="Olmadı" metin={hata} dugmeler={[["Tamam", () => setHata(null)]]} />}
    </div>
  );
}

function Soru({ baslik, metin, dugmeler }: { baslik: string; metin: string; dugmeler: [string, () => void][] }) {
  return (
    <div className="bk-ady-perde" onClick={dugmeler[dugmeler.length - 1][1]}>
      <div className="bk-ady-pencere bk-not-soru" onClick={(e) => e.stopPropagation()}>
        <h2>{baslik}</h2>
        <p>{metin}</p>
        <div className="dugmeler">{dugmeler.map(([ad, f]) => <button key={ad} className="bk-not-dugme" onClick={f}>{ad}</button>)}</div>
      </div>
    </div>
  );
}

/* ================================================================== kâğıt + çizim */

const CIZGI = "rgba(43,74,120,.14)";
function kagitStili(ozet: NotOzet): React.CSSProperties {
  const s: React.CSSProperties = { backgroundColor: ozet.kagitRenk };
  if (ozet.kagit === "cizgili") { s.backgroundImage = `linear-gradient(${CIZGI} 1px, transparent 1px)`; s.backgroundSize = "100% 30px"; s.backgroundPosition = "0 16px"; }
  else if (ozet.kagit === "kareli") { s.backgroundImage = `linear-gradient(${CIZGI} 1px, transparent 1px), linear-gradient(90deg, ${CIZGI} 1px, transparent 1px)`; s.backgroundSize = "22px 22px"; s.backgroundPosition = "0 16px"; }
  return s;
}

function Kagit({ ozet, sayfa, cizimModu, arac, sekil, renk, metinDegisti, gorselBoyut, gorselSil, inkEkle }: {
  ozet: NotOzet; sayfa: NotSayfa; cizimModu: boolean; arac: string; sekil: string; renk: string;
  metinDegisti: (bi: number, v: string) => void; gorselBoyut: (bi: number) => void; gorselSil: (bi: number) => void; inkEkle: (o: InkOgesi) => void;
}) {
  return (
    <div className="bk-not-kagit" style={kagitStili(ozet)} data-cizim={cizimModu}>
      <div className="bloklar">
        {sayfa.bloklar.map((b, bi) =>
          b.t === "metin"
            ? <MetinBlok key={bi} v={b.v} devre={cizimModu} onChange={(v) => metinDegisti(bi, v)} />
            : <GorselBlok key={bi + b.yol} b={b} tikla={() => gorselBoyut(bi)} sil={() => gorselSil(bi)} />
        )}
      </div>
      <CizimKatmani ink={sayfa.ink} etkin={cizimModu} arac={arac} sekil={sekil} renk={renk} inkEkle={inkEkle} />
    </div>
  );
}

function MetinBlok({ v, devre, onChange }: { v: string; devre: boolean; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => { const t = ref.current; if (t) { t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; } }, [v]);
  return <textarea ref={ref} className="blok" value={v} disabled={devre} rows={2} onChange={(e) => onChange(e.target.value)} placeholder="Buraya yaz…" />;
}

function GorselBlok({ b, tikla, sil }: { b: Extract<NotBlok, { t: "gorsel" }>; tikla: () => void; sil: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { let iptal = false; notGorselUrl(b.yol).then((u) => { if (!iptal) setUrl(u); }); return () => { iptal = true; }; }, [b.yol]);
  const oran = b.boyut === "kucuk" ? "42%" : b.boyut === "orta" ? "70%" : "100%";
  return (
    <div className="gorsel" style={{ width: oran }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url ? <img src={url} alt="" onClick={tikla} /> : <div className="bekle">…</div>}
      <button className="sil" onClick={sil} aria-label="Görseli sil">✕</button>
    </div>
  );
}

/** Kalınlıklar CSS px (Android dp / iOS pt ile aynı sayılar): kalem 2,5 · keçeli 6,5 · fosforlu 16 · silgi 26. */
function cizOge(c: CanvasRenderingContext2D, o: InkOgesi, W: number, dpr: number) {
  const k = W / NOT_KOORDINAT_OLCEK, n = o.n;
  if (n.length < 2) return;
  c.lineCap = "round"; c.lineJoin = "round";
  if (o.s) {
    if (n.length < 4) return;
    const x0 = n[0] * k, y0 = n[1] * k, x1 = n[2] * k, y1 = n[3] * k;
    c.globalCompositeOperation = "source-over"; c.globalAlpha = 1; c.strokeStyle = o.r; c.lineWidth = 2.5 * dpr;
    c.beginPath();
    if (o.s === "dikdortgen") { c.strokeRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0)); return; }
    if (o.s === "cizgi") { c.moveTo(x0, y0); c.lineTo(x1, y1); }
    else if (o.s === "elips") c.ellipse((x0 + x1) / 2, (y0 + y1) / 2, Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2, 0, 0, Math.PI * 2);
    else if (o.s === "ok") {
      c.moveTo(x0, y0); c.lineTo(x1, y1);
      const a = Math.atan2(y1 - y0, x1 - x0), h = 13 * dpr;
      c.moveTo(x1, y1); c.lineTo(x1 - h * Math.cos(a - 0.42), y1 - h * Math.sin(a - 0.42));
      c.moveTo(x1, y1); c.lineTo(x1 - h * Math.cos(a + 0.42), y1 - h * Math.sin(a + 0.42));
    }
    c.stroke();
    return;
  }
  if (o.a === "silgi") { c.globalCompositeOperation = "destination-out"; c.strokeStyle = "#000"; c.globalAlpha = 1; c.lineWidth = 26 * dpr; }
  else if (o.a === "fosforlu") { c.globalCompositeOperation = "source-over"; c.strokeStyle = o.r; c.globalAlpha = 0.3; c.lineWidth = 16 * dpr; }
  else { c.globalCompositeOperation = "source-over"; c.strokeStyle = o.r; c.globalAlpha = 1; c.lineWidth = (o.a === "keceli" ? 6.5 : 2.5) * dpr; }
  c.beginPath();
  c.moveTo(n[0] * k, n[1] * k);
  if (n.length === 2) c.lineTo(n[0] * k + 0.1, n[1] * k + 0.1);
  for (let i = 2; i + 1 < n.length; i += 2) c.lineTo(n[i] * k, n[i + 1] * k);
  c.stroke();
}

/** Çizim katmanı: koordinatlar sayfa genişliği = NOT_KOORDINAT_OLCEK birim (x de y de). */
function CizimKatmani({ ink, etkin, arac, sekil, renk, inkEkle }: {
  ink: InkOgesi[]; etkin: boolean; arac: string; sekil: string; renk: string; inkEkle: (o: InkOgesi) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const taslak = useRef<InkOgesi | null>(null);

  const ciz = useCallback(() => {
    const cv = ref.current; if (!cv) return;
    const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    const W = Math.max(1, Math.round(r.width * dpr)), H = Math.max(1, Math.round(r.height * dpr));
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const c = cv.getContext("2d")!;
    c.clearRect(0, 0, W, H);
    for (const o of ink) cizOge(c, o, W, dpr);
    if (taslak.current) cizOge(c, taslak.current, W, dpr);
    c.globalCompositeOperation = "source-over"; c.globalAlpha = 1;
  }, [ink]);

  useLayoutEffect(ciz, [ciz]);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ro = new ResizeObserver(ciz); ro.observe(cv);
    return () => ro.disconnect();
  }, [ciz]);

  const konum = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return [Math.round(((e.clientX - r.left) / r.width) * NOT_KOORDINAT_OLCEK), Math.round(((e.clientY - r.top) / r.width) * NOT_KOORDINAT_OLCEK)];
  };

  return (
    <canvas
      ref={ref} className="cizim"
      onPointerDown={(e) => {
        if (!etkin) return;
        e.preventDefault(); ref.current!.setPointerCapture(e.pointerId);
        const [x, y] = konum(e);
        taslak.current = arac === "sekil" ? { s: sekil, r: renk, n: [x, y, x, y] } : { a: arac, r: renk, n: [x, y] };
        ciz();
      }}
      onPointerMove={(e) => {
        const t = taslak.current; if (!t) return;
        const [x, y] = konum(e);
        if (t.s) { t.n[2] = x; t.n[3] = y; } else t.n.push(x, y);
        ciz();
      }}
      onPointerUp={() => { const t = taslak.current; taslak.current = null; if (t && t.n.length >= 2) inkEkle(t); else ciz(); }}
      onPointerCancel={() => { taslak.current = null; ciz(); }}
    />
  );
}

