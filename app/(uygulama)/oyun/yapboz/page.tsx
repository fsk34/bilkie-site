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
import { BolumBitis, BolumCikisOnayi, OyunUstBar } from "../../BolumOrtak";
import Reklam from "../Reklam";
import UcNokta from "../../UcNokta";
import { useOturum } from "../../../lib/oturum";
import { gorselAdresi, harikalariGetir, harikalarOnbellekten, kesfetGetir, kesfetOnbellekten } from "../../../lib/kesif";
import { oyunBolumu, oyunBolumuYaz } from "../../../lib/veri";
import { sesCal, sesleriOnYukle } from "../../ses";

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
  // Oyunun sesleri sayfa açılırken belleğe (ilk çalışta gecikme olmasın)
  useEffect(() => { sesleriOnYukle(["t2048_kaydirma", "levelcompleted"]); }, []);
  const router = useRouter();
  const { kullanici, yukleniyor } = useOturum();
  const [havuz, setHavuz] = useState<Gorsel[] | null>(null);
  const [ilerleme, setIlerleme] = useState(1);
  const [asama, setAsama] = useState<"yukleniyor" | "secim" | "oyun" | "hata">("yukleniyor");
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

  // Önceden indirme: seçimde sıradaki bölüm, oyunda bir sonraki bölümün görseli tarayıcı önbelleğine
  // iner → bölüm açılınca 2-3 sn beklenmez (uygulamalardaki ön yükleme)
  useEffect(() => {
    if (!havuz?.length || toplam === 0) return;
    const hedef = asama === "oyun" ? bolumNo + 1 : Math.min(ilerleme, toplam);
    const g = hedef >= 1 && hedef <= toplam ? bolumBilgi(hedef).gorsel : null;
    if (!g) return;
    let iptal = false;
    gorselAdresi(g.yol).then((u) => { if (u && !iptal) { const im = new Image(); im.src = u; } }).catch(() => {});
    return () => { iptal = true; };
  }, [havuz, toplam, asama, bolumNo, ilerleme, bolumBilgi]);

  const basla = useCallback(async (no: number) => {
    const m = Math.min(Math.max(1, no), Math.max(1, toplam));
    const { gorsel: g, boyut } = bolumBilgi(m);
    if (!g) return;
    setBolumNo(m); setKazandi(false); setUrl(null); setAsama("oyun");
    const u = await gorselAdresi(g.yol);
    if (!u) { setAsama("hata"); return; }   // "secim"e dönseydi aşağıdaki otomatik başlatma döngüye girerdi
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
    if (kullanici && sonraki > ilerleme) { setIlerleme(sonraki); oyunBolumuYaz(kullanici.uid, "yapboz", sonraki); }
    if (sonraki > toplam) router.push("/oyunlar"); else basla(sonraki);
  }, [bolumNo, ilerleme, kullanici, toplam, basla, router]);

  // Bölüm seçim ekranı yok (6 Eki 2026, uygulamalarla aynı): veriler gelince doğrudan kaldığı bölüm; hepsi bittiyse baştan
  useEffect(() => {
    if (asama !== "secim" || !havuz?.length) return;
    // Bir sonraki tura bırakılır: etki içinde senkron durum değişimi zincirleme render yapar
    const z = window.setTimeout(() => { void basla(ilerleme > toplam ? 1 : ilerleme); }, 0);
    return () => window.clearTimeout(z);
  }, [asama, havuz, ilerleme, toplam, basla]);

  if (asama === "yukleniyor" || !havuz) return <div className="bk bk-oyun-sahne"><UcNokta style={{ padding: 60 }} /></div>;

  if (asama === "secim" || asama === "hata") {
    const gorselYok = havuz.length === 0 || asama === "hata";
    return (
      <div className="bk bk-oyun-sahne bk-yapboz-sahne">
        <OyunUstBar baslik="Resim Yapboz" tema="koyu" onGeri={() => router.push("/oyunlar")} />
        {gorselYok && (
          <div className="bk-oyun-ipucu" style={{ marginTop: 18 }}>
            Görseller yüklenemedi.{" "}
            {asama === "hata" && <button className="bk-oyun-dugme sari" style={{ marginTop: 12 }} onClick={() => void basla(bolumNo)}>Yeniden dene</button>}
          </div>
        )}
      </div>
    );
  }


  return (
    <div className="bk bk-oyun-sahne bk-yapboz-sahne">
      <OyunUstBar
        baslik={`Bölüm ${bolumNo}`} tema="koyu" onGeri={() => setCikisSor(true)}
        sag={url ? <div className="bk-yapboz-hedef" style={{ aspectRatio: oran, backgroundImage: `url(${url})` }} aria-label="Hedef resim" /> : undefined}
      />
      {/* Android: görselin adı 13, beyaz %85; ardından 12 boşluk */}
      <p className="bk-yapboz-ad">{gorsel?.ad ?? ""}</p>

      {!url ? <UcNokta style={{ padding: 60 }} /> : (
        <div className="bk-yapboz-tahta" data-bitti={kazandi} style={{ aspectRatio: oran, ["--n" as string]: n, ["--oran" as string]: oran }}>
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

      {/* Alt banner (Android YapbozBolumOyun: BannerAdView) */}
      <div style={{ flex: 1 }} />
      <Reklam />
      {kazandi && (
        <BolumBitis
          baslik={`Bölüm ${bolumNo} tamam!`} altMetin={`${gorsel?.ad ?? ""} tamamlandı. Harikasın!`}
          dugme={bolumNo >= toplam ? "Bitir" : "Sonraki bölüm →"} onDevam={devam}
        />
      )}
      {cikisSor && <BolumCikisOnayi onKal={() => setCikisSor(false)} onCik={() => { setCikisSor(false); router.push("/oyunlar"); }} />}
    </div>
  );
}
