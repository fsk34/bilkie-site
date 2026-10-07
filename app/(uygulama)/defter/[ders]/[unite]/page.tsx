"use client";

// Konu defteri okuyucu — uygulamadaki DefterViewerScreen'in web karşılığı.
// Kâğıt zemin + çizgiler, blok tipleri ve renkleri uygulamayla aynı.
// Son sayfada "Devam Et": ilerleme + (ilk kez ise) 50 XP + seri işareti yazılır.
// Olay modu (şartname §7.2, Android 44f6520): sayfa/seri/bitiş oturum boyunca taslakta birikir, çıkışta ya da
// "Devam Et"te TEK olay (DefterOturumu); görev, seri, XP ve ilk-kez işleri sunucuda.

import CikisOnayi from "../../../CikisOnayi";
import Link from "next/link";
import Perde from "../../../Perde";
import UcNokta from "../../../UcNokta";
import SonucAkisi, { type SeriArgs } from "../../../sonuc/SonucAkisi";
import { gorevOlayiUygula, type GorevDegisimi } from "../../../../lib/gorevYaz";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { dersBul } from "../../../dersler";
import { useOturum } from "../../../../lib/oturum";
import { uniteler } from "../../../../lib/katalog";
import {
  defterSayfaYaz,
  defterSayfalariGetir,
  ACT_DEFTER,
  XP_DEFTER_TAMAM,
  defterAcilisDurumu,
  defterTamamla,
  defterToplamSayfaYaz,
  seriIsaretle,
  type DefterSayfa,
  type SeriSonucu,
} from "../../../../lib/veri";
import { defterBittiIsle, enUzunSeriGuncelle } from "../../../../lib/ilerleme";
import { tavanli } from "../../../../lib/hata";
import DefterBlokGorunumu from "../../DefterBlokGorunumu";
import { DefterOturumu } from "../../../../lib/olay/defterOturumu";
import { bitisOzeti } from "../../../../lib/olay/tahmin";
import { bagliMi } from "../../../../lib/olay/kutu";

type Durum = "yukleniyor" | "hata" | "baglanti" | "okuma" | "bitti";

export default function DefterOkuyucuSayfasi() {
  const router = useRouter();
  const [cikisSor, setCikisSor] = useState(false);   // Android ExitConfirmDialog — eskiden onaysız çıkıyordu
  const params = useParams<{ ders: string; unite: string }>();
  const dersKey = params?.ders ?? "";
  const uniteKey = params?.unite ?? "";
  const { yukleniyor, kullanici, sinif } = useOturum();

  const [durum, setDurum] = useState<Durum>("yukleniyor");
  const [sayfalar, setSayfalar] = useState<DefterSayfa[]>([]);
  const [indeks, setIndeks] = useState(0);
  // Kaldığı sayfadan açıldıysa o sayfadan ÖNCEKİLER görev sayılmaz (kapat-aç ile şişirme olmasın)
  const baslangicIndeksi = useRef(0);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [kazanilanXp, setKazanilanXp] = useState(0);
  const [seriSayisi, setSeriSayisi] = useState<number | null>(null);
  // Seri bugün ilk kez işaretlendiyse uygulamadaki seri özeti gösterilir.
  const [seriAkisi, setSeriAkisi] = useState<SeriArgs | null>(null);
  const seriSozu = useMemo(() => (seriAkisi ? Promise.resolve(seriAkisi) : null), [seriAkisi]);
  // Defterde sonuç kartı yok; görev özeti varsa akış onunla açılır.
  const [gorevDegisimleri, setGorevDegisimleri] = useState<GorevDegisimi[]>([]);
  const gorevSozu = useMemo(() => Promise.resolve(gorevDegisimleri), [gorevDegisimleri]);

  const ders = dersBul(dersKey);
  const renk = ders?.ana ?? "#72CEFD";
  const kareli = dersKey === "matematik" || dersKey === "fen";
  // Olay modu oturumu: karar yükleme bitince BİR KEZ (null → eski yol). Açılışta okunan "bitmiş"
  // işareti yalnız tahmin için (null = bilinmiyor → ilk kez varsayılır).
  const oturum = useRef<DefterOturumu | null>(null);
  const oncedenBitmis = useRef<boolean | null>(null);
  // Çıkış: birikenler (sayfa, seri) tek olay; "Devam Et"le bitmişse zaten kapalı. Sekme kapanırken de.
  useEffect(() => {
    const kapat = () => { try { oturum.current?.kapat(); } catch { /* yok say */ } };
    window.addEventListener("pagehide", kapat);
    return () => { window.removeEventListener("pagehide", kapat); kapat(); };
  }, []);

  const uniteAdi =
    uniteler(sinif, dersKey).find((u) => (u.defterKey || u.key) === uniteKey)?.title ?? "";

  useEffect(() => {
    if (yukleniyor) return;
    let iptal = false;
    (async () => {
      try {
        // Kaldığı sayfa içerikle birlikte okunur; sayfa sayısı dışına taşan/bitmiş kayıt baştan açar
        const [gelenHam, acilis] = await Promise.all([
          // İnternetsizken indirilmemiş defter boşuna beklemesin (Android d33defe: 2,5 sn / bağlıyken 8 sn)
          tavanli(defterSayfalariGetir(sinif, dersKey, uniteKey), bagliMi() || navigator.onLine ? 8000 : 2500),
          // Kaldığı sayfa okunamazsa (çevrimdışı) baştan açılır — perdede takılmasın
          kullanici ? tavanli(defterAcilisDurumu(kullanici.uid, sinif, dersKey, uniteKey), 6000) : Promise.resolve(undefined),
        ]);
        if (iptal) return;
        if (!gelenHam) { setDurum("baglanti"); return; }
        const gelen = gelenHam;
        const kaldigi = acilis?.kaldigi ?? 0;
        oncedenBitmis.current = acilis?.bitmis ?? null;
        oturum.current?.kapat();
        oturum.current = DefterOturumu.baslat(kullanici?.uid, sinif, dersKey, uniteKey);
        setSayfalar(gelen);
        if (kaldigi >= 2 && kaldigi <= gelen.length) { baslangicIndeksi.current = kaldigi - 1; setIndeks(kaldigi - 1); }
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
    // Olay modunda ayrıca taslağa (olayla aynı yazmada gider — sekme kapansa da kutuda)
    oturum.current?.sayfaDurumu(indeks + 1, sayfalar.length);
  }, [indeks, durum, kullanici, sinif, dersKey, uniteKey, sayfalar.length]);

  // "N konu defteri sayfası tamamla" görevi (notebook_pages): bir sayfa, ileri geçilince
  // (son sayfa ise "Devam Et" ile) tamamlanmış sayılır; aynı oturumda aynı sayfa bir kez.
  // Görev değişimleri okumayı bölmesin diye biriktirilir, bitiş özetine katılır.
  const tamamlananSayfalar = useRef<Set<number>>(new Set());
  const sayfaGorevleri = useRef<GorevDegisimi[]>([]);
  const sayfaTamamla = useCallback(async (i: number) => {
    if (!kullanici || i < 0 || tamamlananSayfalar.current.has(i)) return;
    tamamlananSayfalar.current.add(i);
    if (oturum.current) { oturum.current.sayfaGecti(); return; }
    try {
      const d = await gorevOlayiUygula(kullanici.uid, { tip: "defter_sayfa", sinif, sayfaFarki: 1 });
      sayfaGorevleri.current = gorevBirlestir(sayfaGorevleri.current, d);
    } catch { /* görev yazımı okumayı bozmasın */ }
  }, [kullanici, sinif]);
  useEffect(() => {
    if (durum === "okuma" && indeks > baslangicIndeksi.current) void sayfaTamamla(indeks - 1);
  }, [indeks, durum, sayfaTamamla]);

  // Android: 10. sayfaya ya da son sayfaya gelince seri işlenir (bitirmek şart değil). Eskiden web'de
  // yalnız "Devam Et"te işleniyordu: 12 sayfa okuyup çıkanın serisi sayılmıyordu (30 Eyl 2026).
  // Defter başına TEK iş; bitişteki seri özeti bunun sonucunu kullanır.
  const seriIsi = useRef<Promise<SeriSonucu> | null>(null);
  useEffect(() => {
    if (durum !== "okuma" || !kullanici || sayfalar.length === 0 || seriIsi.current) return;
    if (indeks + 1 >= 10 || indeks === sayfalar.length - 1) {
      // Olay modu: seri olayla gider (çıkışta ya da "Devam Et"te); özet bitişte yerel tahminden
      if (oturum.current) { oturum.current.seriyeUlasti(); return; }
      seriIsi.current = seriIsaretle(kullanici.uid, ACT_DEFTER);
      seriIsi.current.catch(() => {});
    }
  }, [indeks, durum, kullanici, sayfalar.length]);

  const bitir = useCallback(async () => {
    if (kaydediliyor) return;
    setKaydediliyor(true);
    if (!kullanici) { setDurum("bitti"); setKaydediliyor(false); return; }
    // ⚠️ Çevrimdışıyken yazma sözleri HİÇ dönmez → perde takılıyordu (Android 24 Eyl): her bekleme
    // tavanlı; iş arkada sürer, bağlantı gelince gider.
    const uid = kullanici.uid;
    // Olay modu: son sayfa + bitiş TEK yazma (okuma/transaction yok → internetsiz de kutuda)
    const o = oturum.current;
    if (o) {
      o.sayfaDurumu(sayfalar.length, sayfalar.length);
      const son = sayfalar.length - 1;
      if (!tamamlananSayfalar.current.has(son)) { tamamlananSayfalar.current.add(son); o.sayfaGecti(); }
      const ilkKezSanilan = oncedenBitmis.current !== true;
      let yazilan = null;
      try { yazilan = o.bitir(ilkKezSanilan); } catch { /* aşağıda boş özet */ }
      const oz = yazilan ? await bitisOzeti(uid, yazilan) : null;
      // Yerel motor yalnız sunucu işaretine bakar; açılış durumu istemcinin bitti alanını ve kutuyu da
      // sayar → sunucu sonucu gelmediyse o (Android d33defe)
      const ilkKez = oz?.sunucudan && typeof oz.ilkKez === "boolean" ? oz.ilkKez : ilkKezSanilan;
      setKazanilanXp(ilkKez ? XP_DEFTER_TAMAM : 0);
      if (oz?.seri) setSeriSayisi(oz.seri.sayi);
      setSeriAkisi(oz?.seri?.ilkBugun ? { sayi: oz.seri.sayi, maske: oz.seri.maske, tetik: ACT_DEFTER } : null);
      setGorevDegisimleri(oz?.gorevler ?? []);
      setDurum("bitti");
      setKaydediliyor(false);
      return;
    }
    const tamamIs = defterTamamla(uid, sinif, dersKey, uniteKey, sayfalar.length, seriIsi.current ?? undefined);
    // Başarımlar + defter-bitti görevi YALNIZCA ilk tamamlamada (Android: firstTimeDone bloğu);
    // zincir ekrandan bağımsız sürer — tavan dolsa da bağlantı gelince işlenir
    const bittiIs = tamamIs.then((t) => (t.ilkKez ? defterBittiIsle(uid, sinif, dersKey, uniteKey) : [])).catch(() => [] as GorevDegisimi[]);
    // ⚠️ Seri ve görev özeti AYNI ANDA açılmalı: seri önce açılırsa özet akışı onunla başlar,
    // görevler birkaç saniye sonra gelince akış baştan kurulur → seri ekranı bir an görünüp
    // görev özetine atlar, Devam Et'te seri yeniden gelir (27 Eyl). Akış ilk adımını açıldığı
    // anda seçer; bu yüzden ikisi de hazır olana kadar hiçbiri state'e yazılmaz.
    let seri: SeriArgs | null = null;
    const sonuc = await tavanli(tamamIs, 6000);
    if (sonuc) {
      setKazanilanXp(sonuc.xp);
      if (sonuc.seri?.basarili) {
        setSeriSayisi(sonuc.seri.sayi);
        if (sonuc.seri.ilkAktiviteBugun) {
          seri = { sayi: sonuc.seri.sayi, maske: sonuc.seri.maske, tetik: ACT_DEFTER };
        }
        // En uzun seri rekoru: tek yazma, sınıfa göre kırpılmış (beklenmez)
        if (sonuc.seri.sayi > 0) void enUzunSeriGuncelle(uid, sinif, sonuc.seri.sayi);
      }
    }
    await tavanli(sayfaTamamla(sayfalar.length - 1), 4000);
    const bitti = (await tavanli(bittiIs, 4000)) ?? [];
    setSeriAkisi(seri);
    setGorevDegisimleri(gorevBirlestir(sayfaGorevleri.current, bitti));
    setDurum("bitti");
    setKaydediliyor(false);
  }, [kaydediliyor, kullanici, sinif, dersKey, uniteKey, sayfalar.length, sayfaTamamla]);

  /* --------------------------------------------------------------- ekranlar */

  if (durum === "yukleniyor") return <Perde metin="Defter yükleniyor…" nokta />;

  if (durum === "baglanti") {
    return (
      <Perde metin="Defter yüklenemedi. Bağlantını kontrol edip tekrar dene." cikis={`/ders/${dersKey}`}>
        <Link className="bk-dugme" href={`/ders/${dersKey}`}>Ünitelere dön</Link>
      </Perde>
    );
  }

  if (durum === "hata") {
    return (
      <Perde metin={kullanici ? "Bu ünitenin defteri bulunamadı." : "Defter yüklenemedi. Okumak için giriş yapman gerekebilir."}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <Link className="bk-dugme" href={`/ders/${dersKey}`}>Ünitelere dön</Link>
          {!kullanici && <Link className="bk-dugme acik" href="/giris">Giriş yap</Link>}
        </div>
      </Perde>
    );
  }

  if (seriAkisi || gorevDegisimleri.length > 0) {
    return (
      <SonucAkisi
        sonuc={null}
        seriSozu={seriSozu}
        gorevSozu={gorevSozu}
        uid={kullanici?.uid ?? null}
        onBitti={() => { setSeriAkisi(null); setGorevDegisimleri([]); }}
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
            <Link className="bk-dugme" href={`/ders/${dersKey}`}>Ünitelere dön</Link>
            <Link className="bk-dugme acik" href={`/testler`}>Test çöz</Link>
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
        <button className="bk-cikis bk-defter-cikis" aria-label="Çık" onClick={() => setCikisSor(true)} style={{ visibility: sonSayfa ? "hidden" : "visible" }}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/uygulama/cikis.png" alt="" /></button>
          {cikisSor && <CikisOnayi onVazgec={() => setCikisSor(false)} onCik={() => router.push(`/ders/${dersKey}`)} />}
        <span className="bk-defter-sayac">{indeks + 1}/{sayfalar.length}</span>
        <span style={{ width: 22 }} />
      </div>

      <div className="bk-defter-kagit" data-kareli={kareli}>
        {sayfa.bloklar.map((b, i) => (
          <div className="bk-blok" key={i}>
            <DefterBlokGorunumu blok={b} renk={renk} />
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

        {/* Son sayfa: kayıt sırasında metin yerine üç nokta (Android/iOS ile aynı); genişlik sabit
            kalsın diye metin görünmez tutulur, noktalar üstüne biner. */}
        {sonSayfa ? (
          <button className="bk-defter-bitir" onClick={bitir} disabled={kaydediliyor} data-bekliyor={kaydediliyor}>
            <span>Devam Et</span>
            {kaydediliyor && <UcNokta boyut={8} aralik={6} etiket="Kaydediliyor" />}
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

/** Aynı görevin ardışık değişimlerini birleştirir: ilk `onceki`, son `yeni`/`tamamlandi`. */
function gorevBirlestir(eski: GorevDegisimi[], yeni: GorevDegisimi[]): GorevDegisimi[] {
  const sonuc = [...eski];
  for (const d of yeni) {
    const k = sonuc.findIndex((x) => x.id === d.id);
    if (k < 0) sonuc.push(d); else sonuc[k] = { ...d, onceki: sonuc[k].onceki, yeniBitti: sonuc[k].yeniBitti || d.yeniBitti };
  }
  return sonuc;
}
