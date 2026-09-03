"use client";

// Aktivite sonrası akış — iOS: PostActivityFlow (Result → özetler).
// Sıra uygulamadakiyle aynı: [Sonuç kartı] → (Seri özeti) → bitir.
//
// Sıra uygulamadakiyle aynı: Sonuç kartı → (Görev özeti) → (Seri özeti) → bitir.
// Ara adımlar yalnız gösterecek bir şey varsa açılır: görevde ilerleme yoksa görev
// özeti, seri işlenmediyse seri özeti atlanır.

import { useEffect, useRef, useState } from "react";
import Lottie from "../Lottie";
import { sesCal } from "../ses";
import { ACT_DEFTER, ACT_YAZILI, haftaninAktifGunleri } from "../../lib/veri";
import type { GorevDegisimi } from "../../lib/gorevYaz";
import GorevOzeti from "./GorevOzeti";

export type SonucArgs = {
  dogru: number;
  toplam: number;
  sureSn: number;
  puan: number;
};

export type SeriArgs = {
  sayi: number;
  maske: number;
  tetik: number;
};

/** Ödül yazımı Sonuç kartı ekrandayken sürer; seri özeti bu söz çözülünce belli olur
    (iOS: PostActivityFlow.whenReady). null = seri özeti gösterilmeyecek. */
export type SeriSozu = Promise<SeriArgs | null>;

/** Görev yazımı bitince hangi görevlerin ilerlediği belli olur. */
export type GorevSozu = Promise<GorevDegisimi[]> | null;

type Adim = "sonuc" | "gorev" | "seri";

export default function SonucAkisi({
  sonuc,
  seriSozu,
  gorevSozu = null,
  uid,
  misafir = false,
  onBitti,
}: {
  sonuc: SonucArgs | null;
  seriSozu: SeriSozu | null;
  gorevSozu?: GorevSozu;
  uid: string | null;
  misafir?: boolean;
  onBitti: () => void;
}) {
  const [adim, setAdim] = useState<Adim>(sonuc ? "sonuc" : "seri");
  const [cikan, setCikan] = useState<Adim | null>(null);
  const [seri, setSeri] = useState<SeriArgs | null>(null);
  const [gorevler, setGorevler] = useState<GorevDegisimi[]>([]);
  const bekleyen = useRef(true);

  // Ödül yazımı bitince hangi ara adımların gerektiği belli olur.
  useEffect(() => {
    let iptal = false;
    (async () => {
      // Sonuç kartı YOKSA (defter akışı) ilk gösterilecek adım burada seçilir:
      // görevde ilerleme varsa görev özeti, yoksa seri özeti.
      let gorevVar = false;
      if (!sonuc) {
        const d = gorevSozu ? await gorevSozu.catch(() => []) : [];
        if (iptal) return;
        gorevVar = d.length > 0;
        if (gorevVar) {
          setGorevler(d);
          setAdim("gorev");
        }
      }

      if (!seriSozu) {
        bekleyen.current = false;
        if (!sonuc && !gorevVar) onBitti();   // gösterecek hiçbir şey yok
        return;
      }

      const s = await seriSozu;
      if (iptal) return;
      bekleyen.current = false;
      setSeri(s);
      if (!sonuc && !gorevVar && !s) onBitti();
    })();
    return () => { iptal = true; };
  }, [seriSozu, gorevSozu, sonuc, onBitti]);

  /** Bir adımdan diğerine yatay geçiş (yeni sağdan girer, eski sola çıkar). */
  function gec(eskiAdim: Adim, yeniAdim: Adim) {
    setCikan(eskiAdim);
    setAdim(yeniAdim);
    window.setTimeout(() => setCikan(null), 340);
  }

  /** Seri özeti gerekiyorsa ona geç, gerekmiyorsa akışı bitir. */
  async function seriyeGecYaDaBitir(eskiAdim: Adim) {
    // iOS: whenReady — ödül hesabı bitene kadar bekle, sonra adıma geç.
    let s = seri;
    if (bekleyen.current && seriSozu) s = await seriSozu;
    if (s) {
      setSeri(s);
      gec(eskiAdim, "seri");
    } else {
      onBitti();
    }
  }

  async function sonucDevam() {
    // Görev yazımı sonuç kartı ekrandayken sürüyor olabilir; sonucunu bekle.
    const d = gorevSozu ? await gorevSozu.catch(() => []) : [];
    if (d.length > 0) {
      setGorevler(d);
      gec("sonuc", "gorev");
      return;
    }
    await seriyeGecYaDaBitir("sonuc");
  }

  return (
    <div className="bk bk-akis">
      {cikan === "sonuc" && sonuc && (
        <div className="bk-akis-adim bk-sonuc" data-yon="cikan">
          <SonucKarti args={sonuc} onDevam={() => {}} sessiz />
        </div>
      )}

      {adim === "sonuc" && sonuc && (
        <div className="bk-akis-adim bk-sonuc">
          <SonucKarti args={sonuc} onDevam={sonucDevam} misafir={misafir} />
        </div>
      )}

      {cikan === "gorev" && (
        <div className="bk-akis-adim bk-gorev-adim" data-yon="cikan">
          <GorevOzeti degisenler={gorevler} onDevam={() => {}} />
        </div>
      )}

      {adim === "gorev" && (
        <div className="bk-akis-adim bk-gorev-adim" data-yon={cikan ? "giren" : undefined}>
          <GorevOzeti degisenler={gorevler} onDevam={() => seriyeGecYaDaBitir("gorev")} />
        </div>
      )}

      {adim === "seri" && seri && (
        <div className="bk-akis-adim bk-seri-ozet" data-yon={cikan ? "giren" : undefined}>
          <SeriOzeti args={seri} uid={uid} onDevam={onBitti} />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- sonuç kartı */
// iOS: ResultScreen — yay + yıldızlar + üç sayaç kutusu, arkada resultscreen.json.

function SonucKarti({
  args,
  onDevam,
  sessiz = false,
  misafir = false,
}: {
  args: SonucArgs;
  onDevam: () => void;
  sessiz?: boolean;
  misafir?: boolean;
}) {
  const yuzde = args.toplam > 0 ? Math.round((args.dogru / args.toplam) * 100) : 0;
  const yildizSayisi = yuzde >= 85 ? 3 : yuzde >= 50 ? 2 : 1;
  const hedefDolum = yildizSayisi >= 3 ? 1 : yildizSayisi === 2 ? 0.6 : 0.3;

  const [dolum, setDolum] = useState(0);
  const [pop, setPop] = useState([false, false, false]);
  const sayaclar = useSayac(
    [args.sureSn, args.puan, yuzde],
    1400,
    !sessiz
  );

  useEffect(() => {
    if (sessiz) return;
    sesCal("result");
    const zamanlar: number[] = [];
    zamanlar.push(window.setTimeout(() => setDolum(hedefDolum), 30));
    const gecikmeler = [350, 620, 880];
    for (let i = 0; i < yildizSayisi; i++) {
      zamanlar.push(
        window.setTimeout(() => setPop((p) => { const y = [...p]; y[i] = true; return y; }), gecikmeler[i])
      );
    }
    return () => zamanlar.forEach((z) => window.clearTimeout(z));
  }, [sessiz, hedefDolum, yildizSayisi]);

  return (
    <>
      <div className="bk-sonuc-ic">
        <div className="bk-halka-kap">
          {/* Patlama animasyonu HALKANIN merkezine kilitli durmalı. Eskiden ekranın
              tepesine (top:16px) sabitlenmişti; halka ise dikeyde ortalanan kutunun
              içinde olduğu için ikisi ancak belli bir ekran yüksekliğinde çakışıyordu
              (masaüstünde ışık halkanın epey yukarısında kalıyordu). */}
          <div className="bk-sonuc-lottie">
            {!sessiz && <Lottie ad="resultscreen" dongu style={{ height: 400 }} />}
          </div>

          {/* Yay: alt tarafta 70° açıklık (iOS gapDeg = 70), dolgu 0.30/0.60/1.00 */}
          <svg className="bk-halka-svg" viewBox="0 0 350 350" aria-hidden>
            <g transform="rotate(125 175 175)">
              <circle
                className="iz" cx="175" cy="175" r="168" fill="none"
                strokeWidth="14" strokeLinecap="round"
                pathLength={360} strokeDasharray="290 70"
              />
              <circle
                className="dolgu" cx="175" cy="175" r="168" fill="none"
                strokeWidth="14" strokeLinecap="round"
                pathLength={360} strokeDasharray={`${(290 * dolum).toFixed(2)} 360`}
              />
            </g>
          </svg>

          <div className="bk-yildizlar">
            {[0, 1, 2].map((i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                className="bk-yildiz"
                data-pop={pop[i] ? "true" : "false"}
                src={`/uygulama/sonuc/${yildizSayisi > i ? "activestar" : "inactivestar"}.png`}
                alt=""
              />
            ))}
          </div>
        </div>

        <div className="bk-sonuc-kutular">
          <Kutu renk="#1C22FF" ikon="sure"   baslik="SÜRE"          deger={sureBicimle(sayaclar[0])} />
          <Kutu renk="#FFA200" ikon="puan"   baslik="PUAN"          deger={`${sayaclar[1]}`} />
          <Kutu renk="#39FF14" ikon="basari" baslik="BAŞARI ORANI"  deger={`%${sayaclar[2]}`} />
        </div>

        {misafir && (
          <p className="bk-soluk" style={{ fontSize: 13, maxWidth: 380, marginTop: 18 }}>
            Misafir olarak çözdün — bu sonuç kaydedilmedi. Giriş yaparsan puan ve serin
            telefondaki hesabına işlenir.
          </p>
        )}
      </div>

      <button className="bk-akis-dugme" onClick={onDevam}>Devam Et</button>
    </>
  );
}

function Kutu({ renk, ikon, baslik, deger }: { renk: string; ikon: string; baslik: string; deger: string }) {
  return (
    <div className="bk-sonuc-kutu" style={{ background: renk }}>
      <div className="baslik">{baslik}</div>
      <div className="ic">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/uygulama/sonuc/${ikon}.png`} alt="" />
        <span>{deger}</span>
      </div>
    </div>
  );
}

function sureBicimle(sn: number): string {
  if (sn < 60) return `${sn}s`;
  return `${Math.floor(sn / 60)}:${String(sn % 60).padStart(2, "0")}`;
}

/** Üç sayacı birlikte 0'dan hedefe sayar (iOS: withAnimation(.easeOut(duration: 1.4))). */
function useSayac(hedefler: number[], sureMs: number, calissin: boolean): number[] {
  const [deger, setDeger] = useState(() => hedefler.map(() => 0));
  const hedefRef = useRef(hedefler);
  hedefRef.current = hedefler;

  useEffect(() => {
    if (!calissin) { setDeger(hedefRef.current); return; }
    let kare = 0;
    const basla = performance.now();
    const adim = (t: number) => {
      const o = Math.min(1, (t - basla) / sureMs);
      const yumusak = 1 - Math.pow(1 - o, 3);              // easeOut
      setDeger(hedefRef.current.map((h) => Math.round(h * yumusak)));
      if (o < 1) kare = requestAnimationFrame(adim);
    };
    kare = requestAnimationFrame(adim);
    return () => cancelAnimationFrame(kare);
  }, [sureMs, calissin]);

  return deger;
}

/* -------------------------------------------------------------- seri özeti */
// iOS: StreakSummaryScreen — başlık + streak animasyonu + haftalık halkalar.

const GUN_ADLARI = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pa"];

function SeriOzeti({ args, uid, onDevam }: { args: SeriArgs; uid: string | null; onDevam: () => void }) {
  const [gunler, setGunler] = useState<number[] | null>(null);
  const [oynat, setOynat] = useState(false);

  const animAdi =
    args.tetik === ACT_DEFTER ? "streakdefter" :
    args.tetik === ACT_YAZILI ? "streakyazili" :
    args.tetik !== 0 ? "streaktest" :
    (args.maske & ACT_DEFTER) !== 0 ? "streakdefter" :
    (args.maske & ACT_YAZILI) !== 0 ? "streakyazili" : "streaktest";

  useEffect(() => {
    let iptal = false;
    sesCal("streak");
    (async () => {
      const g = await haftaninAktifGunleri(uid ?? "").catch(() => null);
      if (iptal) return;
      setGunler(g);
      window.setTimeout(() => { if (!iptal) setOynat(true); }, 120);
    })();
    return () => { iptal = true; };
  }, [uid]);

  const sayi = Math.max(1, args.sayi);

  return (
    <>
      <h2 className="baslik" style={{ marginTop: 10 }}>{sayi} Günlük Seri!</h2>
      <p className="alt">
        {args.sayi <= 1
          ? "Harika başlangıç! Yarın da devam et."
          : "Bugünkü serini korudun, harika gidiyorsun!"}
      </p>

      <div className="bk-seri-lottie">
        <Lottie ad={animAdi} style={{ height: 260 }} />
      </div>

      <div className="bk-hafta-panel">
        {GUN_ADLARI.map((ad, i) => {
          const bitti = (gunler ?? []).includes(i);
          return (
            <div key={ad} className="bk-hafta-gun" data-bitti={bitti} data-oynat={oynat}>
              <div className="halka">
                <svg viewBox="0 0 34 34" aria-hidden>
                  <circle className="iz" cx="17" cy="17" r="13.5" fill="none" strokeWidth="7" pathLength={100} />
                  <circle
                    className="yay" cx="17" cy="17" r="13.5" fill="none"
                    strokeWidth="7" strokeLinecap="round" pathLength={100}
                    strokeDasharray="100 100"
                    strokeDashoffset={bitti && oynat ? 0 : 100}
                  />
                </svg>
              </div>
              <div className="etiket">{ad}</div>
            </div>
          );
        })}
      </div>

      <button className="bk-akis-dugme" onClick={onDevam}>Devam Et</button>
    </>
  );
}
