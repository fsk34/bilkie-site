"use client";

// Konu defteri okuyucu — uygulamadaki DefterViewerScreen'in web karşılığı.
// Kâğıt zemin + çizgiler, blok tipleri ve renkleri uygulamayla aynı.
// Son sayfada "Devam Et": ilerleme + (ilk kez ise) 50 XP + seri işareti yazılır.

import Link from "next/link";
import SonucAkisi, { type SeriArgs } from "../../../sonuc/SonucAkisi";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { dersBul } from "../../../dersler";
import { useOturum } from "../../../../lib/oturum";
import { uniteler } from "../../../../lib/katalog";
import {
  defterSayfaYaz,
  defterSayfalariGetir,
  ACT_DEFTER,
  defterTamamla,
  defterToplamSayfaYaz,
  type DefterBlok,
  type DefterSayfa,
} from "../../../../lib/veri";
import { defterBittiIsle, enUzunSeriGuncelle } from "../../../../lib/ilerleme";

type Durum = "yukleniyor" | "hata" | "okuma" | "bitti";

export default function DefterOkuyucuSayfasi() {
  const params = useParams<{ ders: string; unite: string }>();
  const dersKey = params?.ders ?? "";
  const uniteKey = params?.unite ?? "";
  const { yukleniyor, kullanici, sinif } = useOturum();

  const [durum, setDurum] = useState<Durum>("yukleniyor");
  const [sayfalar, setSayfalar] = useState<DefterSayfa[]>([]);
  const [indeks, setIndeks] = useState(0);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [kazanilanXp, setKazanilanXp] = useState(0);
  const [seriSayisi, setSeriSayisi] = useState<number | null>(null);
  // Seri bugün ilk kez işaretlendiyse uygulamadaki seri özeti gösterilir.
  const [seriAkisi, setSeriAkisi] = useState<SeriArgs | null>(null);
  const seriSozu = useMemo(() => (seriAkisi ? Promise.resolve(seriAkisi) : null), [seriAkisi]);

  const ders = dersBul(dersKey);
  const renk = ders?.ana ?? "#72CEFD";
  const kareli = dersKey === "matematik" || dersKey === "fen";
  const uniteAdi =
    uniteler(sinif, dersKey).find((u) => (u.defterKey || u.key) === uniteKey)?.title ?? "";

  useEffect(() => {
    if (yukleniyor) return;
    let iptal = false;
    (async () => {
      try {
        const gelen = await defterSayfalariGetir(sinif, dersKey, uniteKey);
        if (iptal) return;
        setSayfalar(gelen);
        setDurum(gelen.length > 0 ? "okuma" : "hata");
        if (gelen.length > 0 && kullanici) {
          defterToplamSayfaYaz(kullanici.uid, sinif, dersKey, uniteKey, gelen.length).catch(() => {});
        }
      } catch {
        if (!iptal) setDurum("hata");
      }
    })();
    return () => { iptal = true; };
  }, [yukleniyor, kullanici, sinif, dersKey, uniteKey]);

  // Okunan sayfa (uygulamada da yalnızca currentPage yazılır, ödül bitişte)
  useEffect(() => {
    if (durum !== "okuma" || !kullanici || sayfalar.length === 0) return;
    defterSayfaYaz(kullanici.uid, sinif, dersKey, uniteKey, indeks + 1).catch(() => {});
  }, [indeks, durum, kullanici, sinif, dersKey, uniteKey, sayfalar.length]);

  const bitir = useCallback(async () => {
    if (kaydediliyor) return;
    setKaydediliyor(true);
    if (!kullanici) { setDurum("bitti"); setKaydediliyor(false); return; }
    try {
      const sonuc = await defterTamamla(kullanici.uid, sinif, dersKey, uniteKey, sayfalar.length);
      setKazanilanXp(sonuc.xp);
      if (sonuc.seri?.basarili) {
        setSeriSayisi(sonuc.seri.sayi);
        if (sonuc.seri.ilkAktiviteBugun) {
          setSeriAkisi({ sayi: sonuc.seri.sayi, maske: sonuc.seri.maske, tetik: ACT_DEFTER });
        }
        if (sonuc.seri.sayi > 0) {
          await enUzunSeriGuncelle(kullanici.uid, sinif, sonuc.seri.sayi);
        }
      }
      // Başarımlar + görevler YALNIZCA ilk tamamlamada (Android: firstTimeDone bloğu)
      if (sonuc.ilkKez) {
        await defterBittiIsle(kullanici.uid, sinif, dersKey, uniteKey);
      }
    } catch {
      /* yazma hatası okumayı bozmasın */
    }
    setDurum("bitti");
    setKaydediliyor(false);
  }, [kaydediliyor, kullanici, sinif, dersKey, uniteKey, sayfalar.length]);

  /* --------------------------------------------------------------- ekranlar */

  if (durum === "yukleniyor") return <Perde metin="Defter yükleniyor…" />;

  if (durum === "hata") {
    return (
      <Perde metin={kullanici ? "Bu ünitenin defteri bulunamadı." : "Defter yüklenemedi. Okumak için giriş yapman gerekebilir."}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <Link className="bk-dugme" href={`/uygulama/defter/${dersKey}`}>Ünitelere dön</Link>
          {!kullanici && <Link className="bk-dugme acik" href="/uygulama/giris">Giriş yap</Link>}
        </div>
      </Perde>
    );
  }

  if (seriAkisi) {
    return (
      <SonucAkisi
        sonuc={null}
        seriSozu={seriSozu}
        uid={kullanici?.uid ?? null}
        onBitti={() => setSeriAkisi(null)}
      />
    );
  }

  if (durum === "bitti") {
    return (
      <div className="bk">
        <div className="bk-test" style={{ textAlign: "center", paddingTop: 60 }}>
          <div style={{ fontSize: 64, marginBottom: 8 }}>📚</div>
          <h1 style={{ fontSize: 26 }}>Defteri bitirdin!</h1>
          <p className="bk-soluk" style={{ margin: "8px 0 24px" }}>{ders?.ad} · {uniteAdi}</p>

          <div className="bk-rozetler" style={{ maxWidth: 420, margin: "0 auto 24px" }}>
            <div className="bk-rozet"><span>📄</span><span>{sayfalar.length} sayfa</span></div>
            <div className="bk-rozet"><span>⚡</span><span>+{kazanilanXp} XP</span></div>
            {seriSayisi != null && <div className="bk-rozet"><span>🔥</span><span>{seriSayisi}</span></div>}
          </div>

          {kullanici && kazanilanXp === 0 && (
            <p className="bk-soluk" style={{ margin: "0 auto 20px", maxWidth: 380, fontSize: 14 }}>
              Bu defteri daha önce tamamlamışsın; XP yalnızca ilk tamamlamada veriliyor.
            </p>
          )}
          {!kullanici && (
            <p className="bk-soluk" style={{ margin: "0 auto 20px", maxWidth: 380, fontSize: 14 }}>
              Misafir olarak okudun — ilerleme kaydedilmedi.
            </p>
          )}

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link className="bk-dugme" href={`/uygulama/defter/${dersKey}`}>Ünitelere dön</Link>
            <Link className="bk-dugme acik" href={`/uygulama/testler`}>Test çöz</Link>
          </div>
        </div>
      </div>
    );
  }

  const sayfa = sayfalar[indeks];
  const sonSayfa = indeks === sayfalar.length - 1;

  return (
    <div className="bk-defter">
      <div className="bk-defter-ust">
        <Link href={`/uygulama/defter/${dersKey}`} aria-label="Çık">✕</Link>
        <span className="bk-defter-sayac">{indeks + 1}/{sayfalar.length}</span>
        <span style={{ width: 22 }} />
      </div>

      <div className="bk-defter-kagit" data-kareli={kareli}>
        {sayfa.bloklar.map((b, i) => (
          <div className="bk-blok" key={i}>
            <Blok blok={b} renk={renk} />
          </div>
        ))}
      </div>

      <div className="bk-defter-alt">
        <button
          className="bk-defter-ok"
          onClick={() => setIndeks((i) => Math.max(0, i - 1))}
          disabled={indeks === 0}
          aria-label="Önceki sayfa"
        >‹</button>

        {sonSayfa ? (
          <button className="bk-defter-bitir" onClick={bitir} disabled={kaydediliyor}>
            {kaydediliyor ? "Kaydediliyor…" : "Devam Et"}
          </button>
        ) : (
          <span className="bk-defter-sayac" style={{ minWidth: 70, textAlign: "center" }}>
            {indeks + 1} / {sayfalar.length}
          </span>
        )}

        <button
          className="bk-defter-ok"
          onClick={() => setIndeks((i) => Math.min(sayfalar.length - 1, i + 1))}
          disabled={sonSayfa}
          aria-label="Sonraki sayfa"
        >›</button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ bloklar */

function Blok({ blok, renk }: { blok: DefterBlok; renk: string }) {
  const koyu = "#1a1a2e";
  switch (blok.tip) {
    case "baslik":
      return <h2 className="bk-b-baslik" style={{ color: renk }}>{blok.baslik}</h2>;

    case "altbaslik":
      return <h3 className="bk-b-altbaslik" style={{ color: renk, opacity: .85 }}>{blok.metin}</h3>;

    case "paragraf":
      return <p className="bk-b-paragraf">{blok.metin}</p>;

    case "liste":
      return (
        <div className="bk-b-liste">
          {blok.baslik ? (
            <div className="bk-b-altbaslik" style={{ color: renk, opacity: .85, paddingTop: 0 }}>
              {blok.baslik}
            </div>
          ) : null}
          {(blok.maddeler ?? []).map((m, i) => (
            <div className="satir" key={i}>
              <span className="ok" style={{ color: renk }}>→</span>
              <span className="yazi">{m}</span>
            </div>
          ))}
        </div>
      );

    case "adimlar":
      return (
        <div>
          {blok.baslik ? (
            <div className="bk-b-altbaslik" style={{ color: renk, opacity: .85, paddingTop: 0 }}>
              {blok.baslik}
            </div>
          ) : null}
          {(blok.adimlar ?? []).map((a, i) => (
            <div className="bk-b-adim" key={i}>
              <b style={{ color: renk }}>{i + 1}.</b>
              <span>{a}</span>
            </div>
          ))}
        </div>
      );

    case "tanim":
      return (
        <div className="bk-b-tanim" style={{ background: `${renk}12` }}>
          <b style={{ color: renk }}>{blok.terim}</b>
          <span>{blok.metin}</span>
        </div>
      );

    case "ornek":
      return (
        <div className="bk-b-serit" style={{ background: "#FFF9C4" }}>
          <i style={{ background: "#FBC02D" }} />
          <p style={{ color: "#5D4037" }}>{blok.metin}</p>
        </div>
      );

    case "uyari":
      return (
        <div className="bk-b-serit" style={{ background: "#FFF3E0" }}>
          <i style={{ background: "#FF8F00" }} />
          <p style={{ color: "#5D4037" }}>{blok.metin}</p>
        </div>
      );

    case "kural":
      return (
        <div className="bk-b-serit kural" style={{ background: `${renk}14` }}>
          <i style={{ background: renk }} />
          <p>{blok.metin}</p>
        </div>
      );

    case "formul":
      return (
        <div
          className="bk-b-formul"
          style={{ background: `${renk}14`, border: `1px solid ${renk}59`, color: koyu }}
        >
          {blok.metin}
        </div>
      );

    case "bilgi":
      return (
        <div
          className="bk-b-bilgi"
          style={{
            background: `${renk}1F`,
            border: `1.5px solid ${renk}73`,
            color: koyu,
            ["--balon-zemin" as string]: `${renk}1F`,
          } as React.CSSProperties}
        >
          {blok.metin}
        </div>
      );

    case "kalip":
      return <p className="bk-b-kalip">{blok.metin}</p>;

    case "problem":
      return (
        <div className="bk-b-problem">
          {blok.baslik ? <b style={{ color: renk }}>{blok.baslik}</b> : null}
          {blok.metin ? <span>{blok.metin}</span> : null}
        </div>
      );

    case "tablo":
      return (
        <div style={{ overflowX: "auto" }}>
          <table className="bk-b-tablo">
            {(blok.basliklar ?? []).length > 0 && (
              <thead>
                <tr>
                  {(blok.basliklar ?? []).map((h, i) => (
                    <th key={i} style={{ background: `${renk}47`, color: koyu }}>{h}</th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {(blok.satirlar ?? []).map((satir, i) => (
                <tr key={i}>
                  {satir.map((h, j) => <td key={j}>{h}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    default:
      return null;
  }
}

function Perde({ metin, children }: { metin: string; children?: React.ReactNode }) {
  return (
    <div className="bk" style={{ display: "grid", placeItems: "center", minHeight: "100vh", padding: 24 }}>
      <div style={{ textAlign: "center", display: "grid", gap: 18, justifyItems: "center" }}>
        <p className="bk-soluk" style={{ fontSize: 16, maxWidth: 420 }}>{metin}</p>
        {children}
      </div>
    </div>
  );
}
