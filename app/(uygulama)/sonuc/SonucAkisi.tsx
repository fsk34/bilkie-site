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
import { ACT_DEFTER, ACT_TEST, ACT_YAZILI, haftaninGunMaskeleri } from "../../lib/veri";
import Rive, { seriGirdileri, seriGunResim } from "../Rive";
import type { GorevDegisimi } from "../../lib/gorevYaz";
import GorevOzeti from "./GorevOzeti";
import { tavanli } from "../../lib/hata";

export type SonucArgs = {
  dogru: number;
  toplam: number;
  sureSn: number;
  puan: number;
  /** yazılı adımıysa: puan/yüzde yerine sade "Tamamlandı" kartı (Android 22 Eki) */
  yaziliAdim?: "step1" | "step2";
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

/** Görev/seri yazması en çok bu kadar beklenir (Android ResultScreen 3 sn, 24 Eyl 2026): çevrimdışıyken
    transaction sözleri hiç çözülmez; süre dolarsa özet gösterilmeden devam edilir, yazma arkada sürer. */
const BEKLEME_TAVANI = 3000;

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
        const d = gorevSozu ? ((await tavanli(gorevSozu, BEKLEME_TAVANI)) ?? []) : [];
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

      // Sonuç kartı ekrandaysa tavansız beklenir (tavan "Devam Et"e basınca, seriyeGecYaDaBitir'de);
      // kart yoksa (defter) ilk adım buna bağlı → tavanlı.
      const s = sonuc ? await seriSozu.catch(() => null) : ((await tavanli(seriSozu, BEKLEME_TAVANI)) ?? null);
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
    if (bekleyen.current && seriSozu) s = (await tavanli(seriSozu, BEKLEME_TAVANI)) ?? null;
    if (s) {
      setSeri(s);
      gec(eskiAdim, "seri");
    } else {
      onBitti();
    }
  }

  async function sonucDevam() {
    // Görev yazımı sonuç kartı ekrandayken sürüyor olabilir; sonucunu bekle.
    const d = gorevSozu ? ((await tavanli(gorevSozu, BEKLEME_TAVANI)) ?? []) : [];
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
          {sonuc.yaziliAdim
            ? <YaziliTamamlandi adim1={sonuc.yaziliAdim === "step1"} onDevam={() => {}} />
            : <SonucKarti args={sonuc} onDevam={() => {}} sessiz />}
        </div>
      )}

      {adim === "sonuc" && sonuc && (
        <div className="bk-akis-adim bk-sonuc">
          {sonuc.yaziliAdim
            ? <YaziliTamamlandi adim1={sonuc.yaziliAdim === "step1"} onDevam={sonucDevam} />
            : <SonucKarti args={sonuc} onDevam={sonucDevam} misafir={misafir} />}
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
// Android ResultScreen (23 Eki): Rive halka + yıldızlar (3★'da yanlardan konfeti), altında üç kutu sırayla
// (Süre → Puan → Başarı) yaylanarak gelir; her kutunun sayacı o kutu oturunca sayar. Sahne + kutular ortada.

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
  // 1★ %0-49 · 2★ %50-84 · 3★ %85-100
  const yildizSayisi = yuzde >= 85 ? 3 : yuzde >= 50 ? 2 : 1;
  const [gelen, setGelen] = useState(sessiz ? 3 : 0);
  const sure = useTekSayac(args.sureSn, gelen >= 1, sessiz);
  const puan = useTekSayac(args.puan, gelen >= 2, sessiz);
  const oran = useTekSayac(yuzde, gelen >= 3, sessiz);

  useEffect(() => {
    if (sessiz) return;
    sesCal("result");
    const z = [0, 1, 2].map((i) => window.setTimeout(() => setGelen(i + 1), 700 + i * 260));
    return () => z.forEach((x) => window.clearTimeout(x));
  }, [sessiz]);

  return (
    <>
      <div className="bk-sonuc-ic">
        <div className="bk-sonuc-sahne">
          {/* Sahnenin kenarları saydam pay (ışınlar orada söner): yer kare kadar, sahne %28 büyük çizilir */}
          {!sessiz && <Rive dosya="sonuc_yildiz" durumMakinesi="Sonuc" girdiler={{ yildiz: yildizSayisi }} className="tuval" />}
        </div>

        <div className="bk-sonuc-kutular">
          <Kutu renk="#1C22FF" ikon="sure"   baslik="SÜRE"          deger={sureBicimle(sure)} gorunur={gelen >= 1} />
          <Kutu renk="#FFA200" ikon="puan"   baslik="PUAN"          deger={`${puan}`} gorunur={gelen >= 2} />
          <Kutu renk="#39FF14" ikon="basari" baslik="BAŞARI ORANI"  deger={`%${oran}`} gorunur={gelen >= 3} />
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

/** Yazılı adımı bitti: puan/yüzde yok (açık uçlu örnek cevaplı), sade kutlama (Android YaziliTamamlandiIcerik). */
function YaziliTamamlandi({ adim1, onDevam }: { adim1: boolean; onDevam: () => void }) {
  useEffect(() => { sesCal("result"); }, []);
  return (
    <>
      <div className="bk-sonuc-ic bk-yazili-bitti">
        <div className="bk-sonuc-lottie"><Lottie ad="resultscreen" dongu style={{ height: 400 }} /></div>
        <h2>Tebrikler!</h2>
        <p className="ana">{adim1 ? "Yazılının 1. adımını tamamladın." : "Yazılıya hazırlığını tamamladın!"}</p>
        <p className="alt">{adim1 ? "2. adımda seni yeni sorular bekliyor." : "Yazılında başarılar!"}</p>
      </div>
      <button className="bk-akis-dugme" onClick={onDevam}>Devam Et</button>
    </>
  );
}

function Kutu({ renk, ikon, baslik, deger, gorunur = true }: {
  renk: string; ikon: string; baslik: string; deger: string; gorunur?: boolean;
}) {
  return (
    <div className="bk-sonuc-kutu" data-gorunur={gorunur} style={{ background: renk }}>
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

/** Kutu oturunca (0,22 sn sonra) 0'dan hedefe 0,7 sn'de sayar; sessizde doğrudan hedef. */
function useTekSayac(hedef: number, basla: boolean, sessiz: boolean): number {
  const [deger, setDeger] = useState(sessiz ? hedef : 0);
  useEffect(() => {
    if (sessiz) { setDeger(hedef); return; }
    if (!basla) return;
    let kare = 0;
    const t0 = performance.now() + 220;
    const adim = (t: number) => {
      const o = Math.min(1, Math.max(0, (t - t0) / 700));
      setDeger(Math.round(hedef * (1 - Math.pow(1 - o, 3))));
      if (o < 1) kare = requestAnimationFrame(adim);
    };
    kare = requestAnimationFrame(adim);
    return () => cancelAnimationFrame(kare);
  }, [hedef, basla, sessiz]);
  return deger;
}

/* -------------------------------------------------------------- seri özeti */
// iOS: StreakSummaryScreen — başlık + streak animasyonu + haftalık halkalar.

const GUN_ADLARI = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pa"];

function SeriOzeti({ args, uid, onDevam }: { args: SeriArgs; uid: string | null; onDevam: () => void }) {
  const tumu = ACT_TEST | ACT_DEFTER | ACT_YAZILI;
  // Bugünün maskesi: az önce biten bölüm her zaman içinde (olay modunda sunucu bitini sonradan yazar)
  const bugunMaske = (args.maske | args.tetik) & tumu;
  const [gunler, setGunler] = useState<Record<number, number> | null>(null);
  const [oynat, setOynat] = useState(false);
  const [konfeti, setKonfeti] = useState(false);

  useEffect(() => {
    let iptal = false;
    sesCal("streak");
    (async () => {
      const g = await haftaninGunMaskeleri(uid ?? "", bugunMaske).catch(() => null);
      if (iptal) return;
      setGunler(g);
      window.setTimeout(() => { if (!iptal) setOynat(true); }, 120);
    })();
    // Kitap konduktan sonra tam ekran konfeti (bir kez, ~5 sn); dokunmaları almaz
    const t1 = window.setTimeout(() => setKonfeti(true), 900);
    const t2 = window.setTimeout(() => setKonfeti(false), 900 + 5200);
    return () => { iptal = true; window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [uid, bugunMaske]);

  const sayi = Math.max(1, args.sayi);

  return (
    <>
      <h2 className="baslik" style={{ marginTop: 10 }}>{sayi} Günlük Seri!</h2>
      <p className="alt">
        {args.sayi <= 1
          ? "Harika başlangıç! Yarın da devam et."
          : "Bugünkü serini korudun, harika gidiyorsun!"}
      </p>

      {/* Seri kitap yığını: az önce biten bölümün kitabı kanat çırparak uçup yığına konar */}
      <div className="bk-seri-lottie">
        <Rive dosya="seri_kitap_kutlama" durumMakinesi="Kutlama"
              girdiler={seriGirdileri(bugunMaske, args.tetik & tumu)} style={{ width: "100%", height: "100%" }} />
      </div>

      <div className="bk-hafta-panel">
        {GUN_ADLARI.map((ad, i) => {
          const m = gunler?.[i] ?? (i === haftaGunu() ? bugunMaske : 0);
          const bitti = m !== 0;
          return (
            <div key={ad} className="bk-hafta-gun" data-bitti={bitti} data-oynat={oynat}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="halka" src={seriGunResim(m)} alt="" style={{ opacity: bitti ? 1 : 0.45 }} />
              <div className="etiket">{ad}</div>
            </div>
          );
        })}
      </div>

      <button className="bk-akis-dugme" onClick={onDevam}>Devam Et</button>

      {konfeti && (
        <div className="bk-konfeti-katman" aria-hidden>
          <Rive dosya="seri_konfeti" durumMakinesi="Konfeti" sigdir="cover" style={{ width: "100%", height: "100%" }} />
        </div>
      )}
    </>
  );
}

/** Pazartesi = 0 (İstanbul saatiyle) */
function haftaGunu(): number {
  const g = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" })).getDay();
  return (g + 6) % 7;
}
