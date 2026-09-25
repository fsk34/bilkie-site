"use client";

// "Evde çözdüm" — kâğıtta çözülen testi elle girme (20 Eyl 2026). Üç adım, 20 saniye:
//   Ders → Ünite / Konu (ya da "ünite geneli") → Doğru / Yanlış sayısı (+ kaynak, yanlış soru no'ları)
// XP/lig/görev yok; yalnız seri işlenir. Kayıt İstatistik → Bilgie Koç'ta ve koç hesabında görünür.

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import Kabuk from "../Kabuk";
import { DERSLER } from "../dersler";
import { useOturum } from "../../lib/oturum";
import { konuAyristir, uniteler } from "../../lib/katalog";
import { dersEtiketi } from "../../lib/anaEkran";
import { EVDE_TEK_GIRIS_TAVANI, evdeKayitYaz, yanlisNolariAyristir } from "../../lib/evde";
import { ACT_TEST, seriIsaretle } from "../../lib/veri";
import { tavanli } from "../../lib/hata";

export default function EvdeSayfasi() {
  return (
    <Kabuk>
      {/* ?ders= (İstatistik'te seçili ders) useSearchParams → Suspense */}
      <Suspense><Icerik /></Suspense>
    </Kabuk>
  );
}

function Icerik() {
  const router = useRouter();
  const { kullanici, sinif } = useOturum();
  // İstatistik'te seçili dersle açılır (Android evdeDers, 24 Eyl); yoksa Türkçe
  const dersParam = useSearchParams().get("ders");
  const [ders, setDers] = useState<string>(() => (dersParam && DERSLER.some((x) => x.key === dersParam) ? dersParam : "turkce"));
  const [unite, setUnite] = useState(0);
  const [konu, setKonu] = useState<string>("");           // "" = ünite geneli
  const [dogru, setDogru] = useState<string>("");
  const [yanlis, setYanlis] = useState<string>("");
  const [kaynak, setKaynak] = useState("");
  const [nolar, setNolar] = useState("");
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [bitti, setBitti] = useState<{ soru: number; seri: number | null } | null>(null);

  const liste = useMemo(() => uniteler(sinif, ders), [sinif, ders]);
  const konular = useMemo(
    () => (liste[unite]?.topics ?? []).map(konuAyristir).filter((k) => k.testKey),
    [liste, unite]
  );
  const d = Number.parseInt(dogru, 10) || 0, y = Number.parseInt(yanlis, 10) || 0;
  const toplam = d + y;
  const gecerli = toplam > 0 && toplam <= EVDE_TEK_GIRIS_TAVANI && d >= 0 && y >= 0;

  async function kaydet() {
    if (!kullanici || !gecerli || mesgul) return;
    setMesgul(true); setHata(null);
    try {
      await evdeKayitYaz(kullanici.uid, sinif, {
        ders, konu, dogru: d, yanlis: y, kaynak: kaynak.trim().slice(0, 40), yanlisNolar: yanlisNolariAyristir(nolar),
      });
      // Seri arkada işlenir; sayısı en çok 2 sn beklenir (çevrimdışı transaction dönmez), gelmezse yazılmaz
      const s = await tavanli(seriIsaretle(kullanici.uid, ACT_TEST), 2000);
      const seri = s?.basarili ? s.sayi : null;
      setBitti({ soru: toplam, seri });
    } catch {
      setHata("Kaydedilemedi. Bağlantını kontrol edip tekrar dene.");
    } finally {
      setMesgul(false);
    }
  }

  if (!kullanici) {
    return (
      <div className="bk-bevel"><div className="bk-bevel-ic">
        <p className="bk-soluk" style={{ marginBottom: 14 }}>Evde çözdüklerini kaydetmek için giriş yapman gerekiyor.</p>
        <Link className="bk-dugme" href="/giris">Giriş yap</Link>
      </div></div>
    );
  }

  if (bitti) {
    return (
      <div className="bk-bevel"><div className="bk-bevel-ic bk-evde-bitti">
        <h2>Kaydettim 📝</h2>
        <p>{bitti.soru} soru evde çözdüklerine eklendi. {bitti.seri ? `Serin ${bitti.seri} gün oldu.` : ""}</p>
        <p className="bk-soluk" style={{ fontSize: 13 }}>Bilgie Koç bunu da hesaba katacak. Evde çözülenler puan/lig kazandırmaz, yalnız seni tanımama yarar.</p>
        <div className="bk-evde-dugmeler">
          <button className="bk-dugme" onClick={() => { setBitti(null); setDogru(""); setYanlis(""); setNolar(""); }}>Bir tane daha</button>
          <button className="bk-dugme acik" onClick={() => router.push("/istatistik")}>İstatistiğe dön</button>
        </div>
      </div></div>
    );
  }

  return (
    <div className="bk-bevel"><div className="bk-bevel-ic bk-evde">
      <div className="bk-icerik-bas" style={{ marginBottom: 6 }}>
        <Link href="/istatistik" className="bk-ustbar-geri" aria-label="Geri">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/uygulama/cikis.png" alt="" />
        </Link>
        <h2 style={{ fontSize: 20 }}>Evde çözdüm</h2>
      </div>
      <p className="bk-soluk" style={{ fontSize: 13, marginBottom: 16 }}>Kâğıtta çözdüğün testi gir; Bilgie Koç onu da görsün.</p>

      <label className="bk-alan-etiket">Ders</label>
      <div className="bk-evde-dersler">
        {DERSLER.map((x) => (
          <button key={x.key} type="button" className="bk-evde-ders" data-secili={ders === x.key}
            style={{ background: ders === x.key ? x.ana : undefined, borderColor: x.koyu, color: ders === x.key ? "#150538" : "#fff" }}
            onClick={() => { setDers(x.key); setUnite(0); setKonu(""); }}>
            {dersEtiketi(x.key, sinif)}
          </button>
        ))}
      </div>

      <label className="bk-alan-etiket">Ünite</label>
      <select className="bk-alan" value={unite} onChange={(e) => { setUnite(Number(e.target.value)); setKonu(""); }}>
        {liste.map((u, i) => <option key={u.key} value={i}>{i + 1}. {u.title}</option>)}
      </select>

      <label className="bk-alan-etiket">Konu</label>
      <select className="bk-alan" value={konu} onChange={(e) => setKonu(e.target.value)}>
        <option value="">Ünite geneli / karışık</option>
        {konular.map((k) => <option key={k.testKey} value={k.testKey}>{k.baslik}</option>)}
      </select>

      <div className="bk-evde-sayilar">
        <div>
          <label className="bk-alan-etiket">Doğru</label>
          <input className="bk-alan" inputMode="numeric" pattern="[0-9]*" placeholder="0" value={dogru} onChange={(e) => setDogru(e.target.value.replace(/\D/g, "").slice(0, 3))} />
        </div>
        <div>
          <label className="bk-alan-etiket">Yanlış</label>
          <input className="bk-alan" inputMode="numeric" pattern="[0-9]*" placeholder="0" value={yanlis} onChange={(e) => setYanlis(e.target.value.replace(/\D/g, "").slice(0, 3))} />
        </div>
      </div>
      {toplam > EVDE_TEK_GIRIS_TAVANI && <p className="bk-soluk" style={{ fontSize: 12, color: "#ffa726" }}>Tek seferde en fazla {EVDE_TEK_GIRIS_TAVANI} soru; testleri ayrı ayrı gir.</p>}

      <label className="bk-alan-etiket">Kaynak <span className="bk-soluk">(isteğe bağlı)</span></label>
      <input className="bk-alan" placeholder="Kitap / test adı" maxLength={40} value={kaynak} onChange={(e) => setKaynak(e.target.value)} />

      <label className="bk-alan-etiket">Yanlış yaptığın soru numaraları <span className="bk-soluk">(isteğe bağlı)</span></label>
      <input className="bk-alan" placeholder="3, 7, 9" value={nolar} onChange={(e) => setNolar(e.target.value)} />

      {hata && <p style={{ color: "#ff8a80", fontSize: 13, marginTop: 8 }}>{hata}</p>}
      <button className="bk-dugme yesil tam" style={{ marginTop: 18 }} disabled={!gecerli || mesgul} onClick={kaydet}>
        {mesgul ? "Kaydediliyor…" : `Kaydet${toplam > 0 ? ` · ${toplam} soru` : ""}`}
      </button>
    </div></div>
  );
}
