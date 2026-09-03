"use client";

// Kelime Gezmece — Android `GamesScreen.kt` portu (hub + oyun).
// 10 dünya × 10 bölüm; harf çarkından kelime kur, bulmacayı doldur.
//
// Bilinçli fark: uygulamada günlük ipucu bitince "reklam izle" seçeneği var;
// web'de reklam olmadığı için hakkın yarın yenileneceğini söyleyen bilgi penceresi var.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Carkifelek, { type Harf } from "./Carkifelek";
import { DUNYALAR, dunyaBul } from "./dunyalar";
import { useOturum } from "../../../lib/oturum";
import { KG_BOLUM_SAYISI, kgBolum, kgSeviyeOku, kgSeviyeYaz, type KgBolum } from "../../../lib/veri";
import { sesCal, type SesAdi } from "../../ses";

/** Harf seçildikçe çalan nota dizisi — Android noteIds sırası. */
const NOTALAR: SesAdi[] = [
  "note_do", "note_re", "note_mi", "note_fa", "note_sol",
  "note_la", "note_si", "note_do2", "note_re2", "note_mi3",
];

const IPUCU_ANAHTAR = "bk-kg-ipucu";
const bugun = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Istanbul" }).format(new Date());

function ucretsizIpucuVarMi(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const ham = window.localStorage.getItem(IPUCU_ANAHTAR);
    if (!ham) return true;
    const { gun, kullanildi } = JSON.parse(ham) as { gun: string; kullanildi: boolean };
    return gun !== bugun() || !kullanildi;
  } catch { return true; }
}
function ipucuKullanildiYaz() {
  try { window.localStorage.setItem(IPUCU_ANAHTAR, JSON.stringify({ gun: bugun(), kullanildi: true })); }
  catch { /* özel kip */ }
}

const karistir = <T,>(d: T[]): T[] => {
  const k = [...d];
  for (let i = k.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [k[i], k[j]] = [k[j], k[i]];
  }
  return k;
};

export default function KelimeGezmece() {
  const router = useRouter();
  const { kullanici, yukleniyor } = useOturum();
  const [ekran, setEkran] = useState<"hub" | "oyun">("hub");
  const [bolumNo, setBolumNo] = useState(0);          // 0 = henüz okunmadı
  const [sesAcik, setSesAcik] = useState(true);

  useEffect(() => {
    if (!kullanici) return;
    let iptal = false;
    kgSeviyeOku(kullanici.uid)
      .then((v) => { if (!iptal) setBolumNo(v); })
      .catch(() => { if (!iptal) setBolumNo(1); });
    return () => { iptal = true; };
  }, [kullanici]);

  const cik = useCallback(() => router.push("/uygulama/oyunlar"), [router]);

  if (yukleniyor) return <div className="bk"><div className="bk-kg-hub" /></div>;

  if (!kullanici) {
    return (
      <div className="bk">
        <div className="bk-kg-hub">
          <div className="bk-kg-ust">
            <button className="bk-wl-geri duz" aria-label="Geri" onClick={cik}>←</button>
            <b>Kelime Gezmece</b>
            <span style={{ width: 36 }} />
          </div>
          <p className="bk-soluk" style={{ marginTop: 40, fontSize: 14, textAlign: "center" }}>
            Bölümlerin hesabınla saklanıyor. Oynamak için giriş yapman gerekiyor.
          </p>
          <Link className="bk-dugme" href="/uygulama/giris" style={{ marginTop: 18 }}>Giriş yap</Link>
        </div>
      </div>
    );
  }

  if (ekran === "oyun" && bolumNo > 0) {
    return (
      <Oyun
        bolumNo={bolumNo}
        uid={kullanici.uid}
        sesAcik={sesAcik}
        onSesDegis={() => setSesAcik((v) => !v)}
        onHub={() => setEkran("hub")}
        onSonrakiBolum={(n) => setBolumNo(n)}
      />
    );
  }

  const simdiki = Math.max(1, bolumNo);
  return (
    <div className="bk">
      <div className="bk-kg-hub">
        <div className="bk-kg-ust">
          <button className="bk-wl-geri duz" aria-label="Geri" onClick={cik}>←</button>
          <b>Kelime Gezmece</b>
          <button className="ses" aria-label="Ses" onClick={() => setSesAcik((v) => !v)}>
            {sesAcik ? "🔔" : "🔕"}
          </button>
        </div>

        <div className="bk-kg-dunyalar">
          {DUNYALAR.map((d) => {
            const kilitli = simdiki < d.bas;
            const bitti = simdiki > d.son;
            const yapilan = bitti ? 10 : kilitli ? 0 : simdiki - d.bas;
            return (
              <div key={d.ad} className="bk-kg-dunya">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/uygulama/kg/${d.gorsel}.jpg`} alt={d.ad} loading="lazy" />
                {kilitli && <span className="kilit">🔒</span>}
                <span className="ad">{d.ad}</span>
                <div className="bant">
                  <div className="satir">
                    <span className="cubuk">
                      <i style={{ width: `${(yapilan / 10) * 100}%`, background: bitti ? "#2ECC71" : "#fff" }} />
                    </span>
                    <span className="sayac">{yapilan} / 10</span>
                  </div>
                  {bitti ? (
                    <span className="bitti">✓ Tamamlandı</span>
                  ) : !kilitli ? (
                    <button className="oyna" onClick={() => { setBolumNo(simdiki); setEkran("oyun"); }}>
                      {simdiki === d.bas ? "Başla" : "Devam Et"}
                    </button>
                  ) : (
                    <span style={{ height: 38 }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ oyun */

function Oyun({
  bolumNo, uid, sesAcik, onSesDegis, onHub, onSonrakiBolum,
}: {
  bolumNo: number; uid: string; sesAcik: boolean;
  onSesDegis: () => void; onHub: () => void; onSonrakiBolum: (n: number) => void;
}) {
  const [bolum, setBolum] = useState<KgBolum | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState(false);
  const [harfler, setHarfler] = useState<Harf[]>([]);
  const [bulunan, setBulunan] = useState<string[]>([]);
  const [bonusBulunan, setBonusBulunan] = useState<string[]>([]);
  const [ipucuKelimeleri, setIpucuKelimeleri] = useState<string[]>([]);
  const [parlayan, setParlayan] = useState<string | null>(null);
  const [suanki, setSuanki] = useState("");
  const [bildirim, setBildirim] = useState<string | null>(null);
  const [tamamlandi, setTamamlandi] = useState(false);
  const [kutlamaKarti, setKutlamaKarti] = useState(false);
  const [devamGorunur, setDevamGorunur] = useState(false);
  const [cubukDolum, setCubukDolum] = useState(0);
  const [cikisSor, setCikisSor] = useState(false);
  const [ipucuUyarisi, setIpucuUyarisi] = useState(false);
  const [ucretsizIpucu, setUcretsizIpucu] = useState(false);
  const bildirimZaman = useRef(0);
  const parlaZaman = useRef(0);

  const dunya = dunyaBul(bolumNo);
  const anahtar = `level_${bolumNo}`;

  useEffect(() => { setUcretsizIpucu(ucretsizIpucuVarMi()); }, []);

  const yukle = useCallback(() => {
    setYukleniyor(true); setHata(false);
    setBulunan([]); setBonusBulunan([]); setIpucuKelimeleri([]);
    setParlayan(null); setSuanki(""); setBildirim(null);
    setTamamlandi(false); setKutlamaKarti(false); setDevamGorunur(false);
    kgBolum(anahtar)
      .then((b) => {
        setBolum(b);
        setHarfler(b ? karistir(b.harfler).map((h, i) => ({ id: i, harf: h })) : []);
        setHata(!b);
        setYukleniyor(false);
      })
      .catch(() => { setHata(true); setYukleniyor(false); });
  }, [anahtar]);

  useEffect(() => { yukle(); }, [yukle]);

  const nota = useCallback((i: number) => {
    if (sesAcik) sesCal(NOTALAR[i % NOTALAR.length], 0.5);
  }, [sesAcik]);

  const bildir = useCallback((mesaj: string, sure: number) => {
    window.clearTimeout(bildirimZaman.current);
    setBildirim(mesaj);
    bildirimZaman.current = window.setTimeout(() => setBildirim(null), sure);
  }, []);

  const parlat = useCallback((kelime: string) => {
    window.clearTimeout(parlaZaman.current);
    setParlayan(kelime);
    parlaZaman.current = window.setTimeout(() => setParlayan(null), 700);
  }, []);

  const kelimeKuruldu = useCallback((kelime: string) => {
    if (!bolum) return;
    if (bulunan.includes(kelime) || bonusBulunan.includes(kelime)) return;

    if (bolum.kelimeler.some((k) => k.kelime === kelime)) {
      const yeni = [...bulunan, kelime];
      setBulunan(yeni);
      parlat(kelime);
      setBildirim(null);
      if (yeni.length === bolum.kelimeler.length) {
        window.setTimeout(() => setTamamlandi(true), 600);
      }
      return;
    }
    if (bolum.bonus.includes(kelime)) {
      setBonusBulunan([...bonusBulunan, kelime]);
      bildir(`+BONUS: ${kelime.toLocaleUpperCase("tr")}`, 1500);
      return;
    }
    if (kelime.length >= 2) bildir("Bulunamadı", 900);
  }, [bolum, bulunan, bonusBulunan, bildir, parlat]);

  const ipucuUygula = useCallback(() => {
    if (!bolum) return;
    const kalanlar = bolum.kelimeler.filter((k) => !bulunan.includes(k.kelime));
    if (kalanlar.length === 0) return;
    // Uygulamadaki gibi EN KISA kelime açılır
    const hedef = kalanlar.reduce((a, b) => (b.kelime.length < a.kelime.length ? b : a));
    setIpucuKelimeleri([...ipucuKelimeleri, hedef.kelime]);
    const yeni = [...bulunan, hedef.kelime];
    setBulunan(yeni);
    parlat(hedef.kelime);
    if (yeni.length === bolum.kelimeler.length) {
      window.setTimeout(() => setTamamlandi(true), 600);
    }
  }, [bolum, bulunan, ipucuKelimeleri, parlat]);

  const ipucu = useCallback(() => {
    if (ucretsizIpucu) { ipucuKullanildiYaz(); setUcretsizIpucu(false); ipucuUygula(); }
    else setIpucuUyarisi(true);
  }, [ucretsizIpucu, ipucuUygula]);

  // Bölüm bitince: ses, kutlama kartı, ilerleme çubuğu (uygulamadaki zamanlama)
  useEffect(() => {
    if (!tamamlandi) return;
    if (sesAcik) sesCal("levelcompleted", 0.6);
    setCubukDolum(Math.min(1, (bolumNo - dunya.bas) / 10));
    const z1 = window.setTimeout(() => setKutlamaKarti(true), 400);
    const z2 = window.setTimeout(() => setCubukDolum(Math.min(1, (bolumNo - dunya.bas + 1) / 10)), 750);
    const z3 = window.setTimeout(() => setDevamGorunur(true), 1950);
    return () => [z1, z2, z3].forEach(window.clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tamamlandi]);

  const devam = useCallback(() => {
    const sonMu = bolumNo >= KG_BOLUM_SAYISI;
    const sonraki = sonMu ? 1 : bolumNo + 1;
    if (!sonMu) void kgSeviyeYaz(uid, sonraki).catch(() => {});
    setKutlamaKarti(false); setDevamGorunur(false);
    onSonrakiBolum(sonraki);
  }, [bolumNo, uid, onSonrakiBolum]);

  const yapilan = Math.min(10, Math.max(0, bolumNo - dunya.bas + (tamamlandi ? 1 : 0)));

  return (
    <div className="bk">
      <div className="bk-kg-oyun" style={{ backgroundImage: `url(/uygulama/kg/${dunya.gorsel}.jpg)` }}>
        <div className="ortu" />
        <div className="icerik">
          <div className="bk-kg-ust">
            <button className="bk-wl-geri duz" aria-label="Geri" onClick={() => setCikisSor(true)}>←</button>
            <b>{dunya.ad} · Bölüm {bolumNo}</b>
            <button className="ses" aria-label="Ses" onClick={onSesDegis}>{sesAcik ? "🔔" : "🔕"}</button>
          </div>

          {yukleniyor ? (
            <p className="bk-wl-not" style={{ marginTop: 60 }}>Yükleniyor...</p>
          ) : hata || !bolum ? (
            <div style={{ display: "grid", justifyItems: "center", gap: 16, marginTop: 60 }}>
              <p style={{ color: "rgba(255,255,255,.7)" }}>Seviye yüklenemedi</p>
              <button className="bk-kg-tekrar" onClick={yukle}>Tekrar Dene</button>
            </div>
          ) : (
            <>
              <Bulmaca
                bolum={bolum}
                bulunan={bulunan}
                ipucuKelimeleri={ipucuKelimeleri}
                parlayan={parlayan}
              />

              <div className="bk-kg-yazi">
                {(() => {
                  const metin = bildirim ?? (suanki || null);
                  if (!metin) return null;
                  const renk = metin.startsWith("+") ? "#2ECC71" : metin === "Bulunamadı" ? "#E74C3C" : "#fff";
                  return <span style={{ color: renk }}>{metin.toLocaleUpperCase("tr")}</span>;
                })()}
              </div>

              <div className="bk-kg-cark-kap">
                <Carkifelek
                  key={anahtar}
                  harfler={harfler}
                  onKelime={kelimeKuruldu}
                  onDegisti={setSuanki}
                  onNota={nota}
                />
                <button className="ipucu" aria-label="İpucu" onClick={ipucu}>
                  💡{ucretsizIpucu && <i>1</i>}
                </button>
                <button
                  className="karistir"
                  aria-label="Karıştır"
                  onClick={() => setHarfler((h) => {
                    let y = karistir(h);
                    let deneme = 0;
                    while (y.every((x, i) => x.id === h[i].id) && deneme < 10) { y = karistir(h); deneme += 1; }
                    return y;
                  })}
                >
                  ⇄
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {kutlamaKarti && (
        <div className="bk-oyun-ortu">
          <div className="bk-kg-kutlama">
            <div className="bas"><span className="tik">✓</span><b>Bölüm {bolumNo} Tamamlandı!</b></div>
            <span className="alt">{dunya.ad}&nbsp;&nbsp;·&nbsp;&nbsp;{yapilan} / 10</span>
            <span className="cubuk"><i style={{ width: `${cubukDolum * 100}%` }} /></span>
            {devamGorunur && (
              <button className="devam" onClick={devam}>
                {bolumNo >= KG_BOLUM_SAYISI ? "Başa Dön" : "Devam Et →"}
              </button>
            )}
          </div>
        </div>
      )}

      {ipucuUyarisi && (
        <div className="bk-oyun-ortu hafif" onClick={() => setIpucuUyarisi(false)}>
          <div className="bk-oyun-onay" onClick={(e) => e.stopPropagation()}>
            <div className="sor">Günlük ipucu hakkın bitti</div>
            <div className="not">Yarın yeniden bir ipucu hakkın olacak.</div>
            <div className="ikili">
              <button className="hayir" onClick={() => setIpucuUyarisi(false)}>Tamam</button>
            </div>
          </div>
        </div>
      )}

      {cikisSor && (
        <div className="bk-oyun-ortu hafif" onClick={() => setCikisSor(false)}>
          <div className="bk-oyun-onay" onClick={(e) => e.stopPropagation()}>
            <div className="sor">Çıkmak istiyor musun?</div>
            <div className="not">İlerleme kaydedilmeyecek.</div>
            <div className="ikili">
              <button className="hayir" onClick={() => setCikisSor(false)}>Hayır</button>
              <button className="evet" onClick={onHub}>Evet, Çık</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Bulmaca ızgarası — Android KgGrid: koordinatlar normalize edilir, kesişimler paylaşılır. */
function Bulmaca({
  bolum, bulunan, ipucuKelimeleri, parlayan,
}: { bolum: KgBolum; bulunan: string[]; ipucuKelimeleri: string[]; parlayan: string | null }) {
  const { gozler, satir, sutun } = useMemo(() => {
    const enAzSatir = Math.min(...bolum.kelimeler.map((k) => k.satir));
    const enAzSutun = Math.min(...bolum.kelimeler.map((k) => k.sutun));
    const harita = new Map<string, { harf: string; kelimeler: string[] }>();
    for (const y of bolum.kelimeler) {
      Array.from(y.kelime).forEach((h, i) => {
        const r = y.satir - enAzSatir + (y.yon === "down" ? i : 0);
        const c = y.sutun - enAzSutun + (y.yon === "right" ? i : 0);
        const anahtar = `${r},${c}`;
        const mevcut = harita.get(anahtar);
        if (mevcut) mevcut.kelimeler.push(y.kelime);
        else harita.set(anahtar, { harf: h, kelimeler: [y.kelime] });
      });
    }
    const anahtarlar = [...harita.keys()].map((k) => k.split(",").map(Number));
    return {
      gozler: harita,
      satir: Math.max(...anahtarlar.map((a) => a[0])) + 1,
      sutun: Math.max(...anahtarlar.map((a) => a[1])) + 1,
    };
  }, [bolum]);

  return (
    <div
      className="bk-kg-bulmaca"
      style={{ gridTemplateColumns: `repeat(${sutun}, 1fr)`, maxWidth: `${sutun * 49}px` }}
    >
      {Array.from({ length: satir * sutun }, (_, i) => {
        const r = Math.floor(i / sutun);
        const c = i % sutun;
        const goz = gozler.get(`${r},${c}`);
        if (!goz) return <span key={i} className="bos" />;
        const acik = goz.kelimeler.some((k) => bulunan.includes(k));
        const ipucuMu = goz.kelimeler.some((k) => ipucuKelimeleri.includes(k));
        const parlar = goz.kelimeler.some((k) => k === parlayan);
        return (
          <span key={i} className="goz" data-acik={acik} data-ipucu={ipucuMu} data-parla={parlar}>
            {acik ? goz.harf.toLocaleUpperCase("tr") : ""}
          </span>
        );
      })}
    </div>
  );
}
