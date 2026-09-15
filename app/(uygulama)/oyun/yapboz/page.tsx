"use client";

// Resim Yapboz — yaz kampındaki SlideBolum'un kalıcı, bölümlü sürümü (15 Eyl 2026; Android
// SlideBolum.kt). Parçaları boşluğa kaydır, resmi tamamla. Kare kırpma yok: görsel kendi
// oranında, parçalar dikdörtgen; boş gözde hedefin soluk hayaleti ipucu olarak durur.
//
// Görsel havuzu = Dünya Harikaları + Türkiye'yi Keşfet fotoğrafları (Storage'da zaten var,
// üç platform aynı sırayla okur: önce harikalar kategori→öğe sırası, sonra keşfet). Bölüm L →
// görsel havuz[(L-1) % N], boyut 3×3 → 4×4 → 5×5 (havuz her bittiğinde büyür); toplam 3N bölüm.
// İlerleme users/{uid}/yapboz. Kampta görsel derse bağlıydı; artık bağımsız.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Lottie from "../../Lottie";
import UcNokta from "../../UcNokta";
import { useOturum } from "../../../lib/oturum";
import { gorselAdresi, harikalariGetir, harikalarOnbellekten, kesfetGetir, kesfetOnbellekten } from "../../../lib/kesif";
import { oyunBolumu, oyunBolumuYaz } from "../../../lib/veri";
import { sesCal } from "../../ses";

type Gorsel = { yol: string; ad: string };
const EN_BUYUK = 5;

function komsular(p: number, n: number): number[] {
  const r = Math.floor(p / n), c = p % n, out: number[] = [];
  if (r > 0) out.push(p - n); if (r < n - 1) out.push(p + n);
  if (c > 0) out.push(p - 1); if (c < n - 1) out.push(p + 1);
  return out;
}

/** Çözülmüş hâlden rastgele geçerli kaydırmalarla karıştır → her zaman çözülebilir (Android karistir). */
function karistir(n: number): number[] {
  const size = n * n;
  const b = Array.from({ length: size }, (_, i) => (i === size - 1 ? -1 : i));
  let bos = size - 1;
  const hamle = () => { const k = komsular(bos, n); const p = k[Math.floor(Math.random() * k.length)]; b[bos] = b[p]; b[p] = -1; bos = p; };
  for (let i = 0; i < size * 14; i++) hamle();
  if (cozuldu(b, n)) hamle();
  return b;
}
function cozuldu(b: number[], n: number): boolean {
  for (let i = 0; i < n * n - 1; i++) if (b[i] !== i) return false;
  return b[n * n - 1] === -1;
}

export default function Yapboz() {
  const router = useRouter();
  const { kullanici, yukleniyor } = useOturum();
  const [havuz, setHavuz] = useState<Gorsel[] | null>(null);
  const [ilerleme, setIlerleme] = useState(1);
  const [asama, setAsama] = useState<"yukleniyor" | "secim" | "oyun">("yukleniyor");
  const [bolumNo, setBolumNo] = useState(1);
  const [url, setUrl] = useState<string | null>(null);
  const [oran, setOran] = useState(1);
  const [tahta, setTahta] = useState<number[]>([]);
  const [kazandi, setKazandi] = useState(false);
  const [cikisSor, setCikisSor] = useState(false);

  useEffect(() => {
    if (yukleniyor) return;
    if (!kullanici) { router.replace("/giris"); return; }
    let iptal = false;
    (async () => {
      const [h, k, b] = await Promise.all([
        (async () => harikalarOnbellekten() ?? (await harikalariGetir().catch(() => [])))(),
        (async () => kesfetOnbellekten() ?? (await kesfetGetir().catch(() => [])))(),
        oyunBolumu(kullanici.uid, "yapboz"),
      ]);
      if (iptal) return;
      const liste: Gorsel[] = [];
      for (const kat of h) for (const o of kat.ogeler) if (o.gorsel) liste.push({ yol: `harikalar/${o.gorsel}`, ad: o.baslik });
      for (const y of k) if (y.gorsel) liste.push({ yol: y.gorsel, ad: y.baslik });
      setHavuz(liste); setIlerleme(b); setAsama("secim");
    })();
    return () => { iptal = true; };
  }, [kullanici, yukleniyor, router]);

  const toplam = havuz ? havuz.length * (EN_BUYUK - 2) : 0;
  const bolumBilgi = useCallback((no: number) => {
    const P = havuz?.length ?? 1;
    return { gorsel: havuz?.[(no - 1) % P] ?? null, boyut: Math.min(EN_BUYUK, 3 + Math.floor((no - 1) / P)) };
  }, [havuz]);
  const { gorsel, boyut: n } = useMemo(() => bolumBilgi(bolumNo), [bolumBilgi, bolumNo]);

  const basla = useCallback(async (no: number) => {
    const m = Math.min(Math.max(1, no), Math.max(1, toplam));
    const { gorsel: g, boyut } = bolumBilgi(m);
    if (!g) return;
    setBolumNo(m); setKazandi(false); setUrl(null); setAsama("oyun");
    const u = await gorselAdresi(g.yol);
    if (!u) { setAsama("secim"); return; }
    await new Promise<void>((r) => { const im = new Image(); im.onload = () => { setOran(im.naturalWidth / im.naturalHeight || 1); r(); }; im.onerror = () => r(); im.src = u; });
    setTahta(karistir(boyut)); setUrl(u);
  }, [toplam, bolumBilgi]);

  const dokun = useCallback((p: number) => {
    if (kazandi) return;
    setTahta((t) => {
      const bos = t.indexOf(-1);
      if (!komsular(bos, n).includes(p)) return t;
      const y = [...t]; y[bos] = y[p]; y[p] = -1;
      sesCal("t2048_kaydirma", 0.5);
      if (cozuldu(y, n)) { setKazandi(true); sesCal("levelcompleted"); }
      return y;
    });
  }, [kazandi, n]);

  const devam = useCallback(() => {
    const sonraki = bolumNo + 1;
    if (kullanici && sonraki > ilerleme) { setIlerleme(sonraki); oyunBolumuYaz(kullanici.uid, "yapboz", sonraki).catch(() => {}); }
    if (sonraki > toplam) setAsama("secim"); else basla(sonraki);
  }, [bolumNo, ilerleme, kullanici, toplam, basla]);

  if (asama === "yukleniyor" || !havuz) return <div className="bk bk-oyun-sahne"><UcNokta style={{ padding: 60 }} /></div>;

  if (asama === "secim") {
    const hepsi = ilerleme > toplam;
    return (
      <div className="bk bk-oyun-sahne bk-yapboz-sahne">
        <div className="bk-oyun-ust">
          <button className="bk-oyun-geri" aria-label="Geri" onClick={() => router.push("/oyunlar")}>‹</button>
          <div className="bk-oyun-ad" style={{ color: "#fff" }}>Resim Yapboz</div>
          <span style={{ width: 40 }} />
        </div>
        <p className="bk-oyun-ipucu" style={{ marginTop: 0 }}>Parçaları boşluğa kaydır, resmi tamamla. Her turda yapboz büyür: 3×3 → 4×4 → 5×5.</p>
        {havuz.length === 0 ? <div className="bk-oyun-ipucu">Görseller yüklenemedi.</div> : (
          <>
            <div className="bk-bolum-kart">
              <div className="ust"><span>{hepsi ? "Tüm bölümler tamam!" : `Bölüm ${ilerleme} · ${bolumBilgi(ilerleme).boyut}×${bolumBilgi(ilerleme).boyut}`}</span><small>{Math.min(ilerleme - 1, toplam)} / {toplam} tamamlandı</small></div>
              <div className="cubuk"><i style={{ width: `${Math.min(100, ((ilerleme - 1) / toplam) * 100)}%` }} /></div>
              <button className="bk-oyun-dugme sari" onClick={() => basla(hepsi ? 1 : ilerleme)}>{hepsi ? "Baştan oyna" : "Oyna"}</button>
            </div>
            {ilerleme > 1 && (
              <>
                <h2 className="bk-bolum-baslik">Bölümler</h2>
                <div className="bk-bolum-izgara">
                  {Array.from({ length: toplam }, (_, i) => i + 1).map((no) => (
                    <button key={no} className="bk-bolum-goz" data-durum={no < ilerleme ? "bitti" : no === ilerleme ? "sirada" : "kilitli"} disabled={no > ilerleme} onClick={() => basla(no)}>{no}</button>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="bk bk-oyun-sahne bk-yapboz-sahne">
      <div className="bk-oyun-ust">
        <button className="bk-oyun-geri" aria-label="Geri" onClick={() => setCikisSor(true)}>‹</button>
        <div className="bk-oyun-ad" style={{ color: "#fff", fontSize: 22 }}>Bölüm {bolumNo} · {n}×{n}</div>
        {url ? <div className="bk-yapboz-hedef" style={{ aspectRatio: oran, backgroundImage: `url(${url})` }} aria-label="Hedef resim" /> : <span style={{ width: 40 }} />}
      </div>
      <p className="bk-oyun-ipucu" style={{ margin: "0 0 12px" }}>{gorsel?.ad ?? ""} — parçaları boşluğa kaydır.</p>

      {!url ? <UcNokta style={{ padding: 60 }} /> : (
        <div className="bk-yapboz-tahta" data-bitti={kazandi} style={{ aspectRatio: oran, ["--n" as string]: n }}>
          {!kazandi && <div className="hayalet" style={{ backgroundImage: `url(${url})` }} />}
          {tahta.map((h, p) => {
            if (h === -1 && !kazandi) return null;
            const ev = h === -1 ? n * n - 1 : h;            // bitince eksik parça evine oturur
            const r = Math.floor(p / n), c = p % n, hr = Math.floor(ev / n), hc = ev % n;
            return (
              <button
                key={ev} className="parca" onClick={() => dokun(p)} aria-label={`Parça ${ev + 1}`}
                style={{
                  left: `${(c / n) * 100}%`, top: `${(r / n) * 100}%`,
                  backgroundImage: `url(${url})`,
                  backgroundPosition: `${n > 1 ? (hc / (n - 1)) * 100 : 0}% ${n > 1 ? (hr / (n - 1)) * 100 : 0}%`,
                }}
              >
                {!kazandi && <span>{ev + 1}</span>}
              </button>
            );
          })}
        </div>
      )}

      {kazandi && (
        <div className="bk-oyun-ortu">
          <Lottie ad="confetti" className="bk-oyun-konfeti" />
          <div className="govde">
            <div style={{ fontSize: 40, fontWeight: 700, color: "#EDC22E" }} className="baslik">Bölüm {bolumNo} tamam!</div>
            <div style={{ fontSize: 18 }}>{gorsel?.ad} tamamlandı. Harikasın!</div>
            <div className="bk-oyun-dugmeler">
              <button className="bk-oyun-dugme sari" onClick={devam}>{bolumNo >= toplam ? "Bitir" : "Sonraki bölüm"}</button>
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
