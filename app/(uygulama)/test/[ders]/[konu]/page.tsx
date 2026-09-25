"use client";

// Test çözme ekranı — mobil uygulamadaki TestScreen'in web karşılığı.
//   • konunun sıradaki adımı (s1..s3) yüklenir
//   • yanlış cevap bir can götürür
//   • bitişte (giriş varsa): adım sonucu + XP (doğru × 2) + seri işareti yazılır
//   • bitişte sonuç akışı açılır (iOS: PostActivityFlow) → Sonuç kartı → seri özeti
// Giriş yoksa ekran yine çalışır ama hiçbir şey kaydedilmez (misafir).
//
// Animasyonlar uygulamadan: doğru şıkta zıplama + ışık bandı, yanlışta sarsıntı,
// alt bant aşağıdan kayar, 5 doğru üst üste "dogrubes" kutlaması.

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { dersBul } from "../../../dersler";
import Lottie from "../../../Lottie";
import Perde from "../../../Perde";
import { sesCal } from "../../../ses";
import SonucAkisi, { type SeriArgs, type SonucArgs } from "../../../sonuc/SonucAkisi";
import type { GorevDegisimi } from "../../../../lib/gorevYaz";
import { enUzunSeriGuncelle, testBittiIsle } from "../../../../lib/ilerleme";
import { hataDegisimleriYaz, type SoruSonucu } from "../../../../lib/hatalar";
import { useOturum } from "../../../../lib/oturum";
import { useUstBilgi } from "../../../../lib/canliVeri";
import { sessizHata, tavanli } from "../../../../lib/hata";
import { konuAyristir, uniteler } from "../../../../lib/katalog";
import {
  ACT_TEST,
  ADIM_SAYISI,
  CAN_LIMITI,
  XP_DOGRU_TEST,
  adimSonucuYaz,
  canDegistir,
  konuAdimiOku,
  seriIsaretle,
  sorulariGetir,
  xpEkle,
  type Soru,
} from "../../../../lib/veri";

// baglanti: ilerleme/sorular okunamadı (çevrimdışı) — adım TAHMİN edilmez, "tekrar dene"
type Durum = "yukleniyor" | "hata" | "baglanti" | "bitti_zaten" | "cozuluyor" | "sonuc";

/** Okuma tavanı (Android TestScreens 8 sn) */
const OKUMA_MS = 8000;

export default function TestSayfasi() {
  const params = useParams<{ ders: string; konu: string }>();
  const router = useRouter();
  const dersKey = params?.ders ?? "";
  const konuKey = params?.konu ?? "";
  const { yukleniyor, kullanici, sinif } = useOturum();

  const [durum, setDurum] = useState<Durum>("yukleniyor");
  const [sorular, setSorular] = useState<Soru[]>([]);
  const [adim, setAdim] = useState(1);
  const [oncekiTamamlanan, setOncekiTamamlanan] = useState(0);
  const [indeks, setIndeks] = useState(0);
  const [secili, setSecili] = useState<number | null>(null);
  const [kontrolEdildi, setKontrolEdildi] = useState(false);
  const [dogruSayisi, setDogruSayisi] = useState(0);
  // Can CANLI dinleyiciden (users/{uid}/lives): yazma transaction'la, yerelde anında yansır
  const ust = useUstBilgi(sinif);
  const can = kullanici ? (ust?.can ?? CAN_LIMITI) : CAN_LIMITI;
  const [yenidenDene, setYenidenDene] = useState(0);
  const [kombo, setKombo] = useState(false);
  const [akis, setAkis] = useState<{
    sonuc: SonucArgs;
    seriSozu: Promise<SeriArgs | null>;
    gorevSozu: Promise<GorevDegisimi[]>;
  } | null>(null);

  const ustUsteDogru = useRef(0);
  const adimBaslangici = useRef(Date.now());
  // Yanlış soru takibi (hatalar.ts): soru başına sonuç biriktirilir, bitişte tek yazma
  const soruSonuclari = useRef<SoruSonucu[]>([]);

  const ders = dersBul(dersKey);
  const konuBasligi = konuAdiBul(sinif, dersKey, konuKey);

  useEffect(() => {
    if (yukleniyor) return;
    let iptal = false;

    (async () => {
      try {
        let yapilan = 0;
        if (kullanici) {
          // Gün değiştiyse canlar 3'e — okuma yok, tek transaction (çevrimdışı takılmaz)
          canDegistir(kullanici.uid, 0);
          // İlerleme okunmadan soru yüklenmez: okunamazsa tamamlanmış adım yeniden çözdürülmesin
          const y = await tavanli(konuAdimiOku(kullanici.uid, sinif, dersKey, konuKey), OKUMA_MS);
          if (iptal) return;
          if (y === undefined) { setDurum("baglanti"); return; }
          yapilan = y;
          setOncekiTamamlanan(y);
          if (y >= ADIM_SAYISI) { setDurum("bitti_zaten"); return; }
        }

        const siradaki = Math.max(1, Math.min(ADIM_SAYISI, yapilan + 1));
        setAdim(siradaki);
        const gelen = await tavanli(sorulariGetir(sinif, dersKey, konuKey, siradaki), OKUMA_MS);
        if (iptal) return;
        if (gelen === undefined) { setDurum("baglanti"); return; }
        setSorular(gelen);
        adimBaslangici.current = Date.now();
        setDurum(gelen.length > 0 ? "cozuluyor" : "hata");
      } catch {
        if (!iptal) setDurum("hata");
      }
    })();

    return () => { iptal = true; };
  }, [yukleniyor, kullanici, sinif, dersKey, konuKey, yenidenDene]);

  const testiBitir = useCallback(
    (sonDogru: number) => {
      const toplam = sorular.length;
      const sureSn = Math.max(1, Math.round((Date.now() - adimBaslangici.current) / 1000));
      const xp = sonDogru * XP_DOGRU_TEST;

      // Ödül yazımı Sonuç kartı ekrandayken arka planda sürer (iOS: whenReady).
      // Görev özeti de aynı zincirin çıktısı: hangi görevin kaçtan kaça çıktığı
      // ancak yazma bitince belli olur, o yüzden ayrı bir sözle dışarı veriliyor.
      let gorevCoz: (d: GorevDegisimi[]) => void = () => {};
      const gorevSozu = new Promise<GorevDegisimi[]>((c) => { gorevCoz = c; });

      // Bitiş işleri BİRBİRİNDEN BAĞIMSIZ (Android testBitisiniYaz, 24 Eyl 2026): her biri kendi
      // hatasını yutar; çevrimdışıyken biri dönmese de diğerleri başlar. Sonuç akışı en çok 3 sn bekler.
      const seriSozu: Promise<SeriArgs | null> = (async () => {
        if (!kullanici) { gorevCoz([]); return null; }
        const uid = kullanici.uid;
        // 1) completedSteps önce + adım sonucu (adimSonucuYaz üçünü aynı anda başlatır)
        adimSonucuYaz({ uid, sinif, dersKey, konuKey, adim, dogru: sonDogru, toplam, oncekiTamamlanan })
          .catch((e) => sessizHata("adimSonucu", e));
        // Yanlışlar Hata Turu'na, doğrular varsa eski kaydı siler
        hataDegisimleriYaz(uid, sinif, dersKey, soruSonuclari.current).catch((e) => sessizHata("hatalar", e));
        if (xp > 0) xpEkle(uid, sinif, xp, "test").catch((e) => sessizHata("xp", e));
        // Başarımlar + kişisel rekor + görevler + istatistik kovaları (telefondaki onTestFinished /
        // StatsManager zinciri); görev özeti bunun sonucuyla çizilir.
        testBittiIsle({ uid, sinif, dersKey, konuKey, dogru: sonDogru, toplam, sureSn, puan: sonDogru * XP_DOGRU_TEST })
          .then(gorevCoz, () => gorevCoz([]));
        try {
          const seri = await seriIsaretle(uid, ACT_TEST);
          // En uzun seri rekoru: tek yazma, sınıfa göre kırpılmış (beklenmez)
          if (seri.basarili && seri.sayi > 0) void enUzunSeriGuncelle(uid, sinif, seri.sayi);
          if (!seri.basarili || !seri.ilkAktiviteBugun) return null;
          return { sayi: seri.sayi, maske: seri.maske, tetik: ACT_TEST };
        } catch {
          return null;   // yazma hatası akışı durdurmasın
        }
      })();

      setDurum("sonuc");
      setAkis({
        sonuc: { dogru: sonDogru, toplam, sureSn, puan: sonDogru * XP_DOGRU_TEST },
        seriSozu,
        gorevSozu,
      });
    },
    [kullanici, sinif, dersKey, konuKey, adim, sorular.length, oncekiTamamlanan]
  );

  function kontrolEt() {
    if (secili == null || kontrolEdildi) return;
    setKontrolEdildi(true);
    const dogru = secili === sorular[indeks].dogruIndeks;
    soruSonuclari.current.push({ konu: konuKey, adim, soruKey: sorular[indeks].anahtar, dogru });
    if (dogru) {
      sesCal("dogru");
      setDogruSayisi((d) => d + 1);
      ustUsteDogru.current += 1;
      if (ustUsteDogru.current >= 5) {   // uygulama: 5 doğru üst üste → dogrubes
        ustUsteDogru.current = 0;
        setKombo(true);
      }
    } else {
      sesCal("yanlis");
      ustUsteDogru.current = 0;
      // Gün kontrolü + 1 azaltma tek transaction'da (mutlak değer yazılmaz); ekran dinleyiciden
      if (kullanici) canDegistir(kullanici.uid, -1);
    }
  }

  function devamEt() {
    if (indeks + 1 >= sorular.length) { testiBitir(dogruSayisi); return; }
    setIndeks((i) => i + 1);
    setSecili(null);
    setKontrolEdildi(false);
  }

  /* --------------------------------------------------------------- ekranlar */

  if (durum === "yukleniyor") return <Perde metin="Sorular yükleniyor…" />;

  if (durum === "hata") {
    return (
      <Perde metin={kullanici ? "Bu adımın soruları bulunamadı." : "Sorular yüklenemedi. Testleri çözmek için giriş yapman gerekebilir."}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <Link className="bk-dugme" href={`/ders/${dersKey}`}>Konulara dön</Link>
          {!kullanici && <Link className="bk-dugme acik" href="/giris">Giriş yap</Link>}
        </div>
      </Perde>
    );
  }

  if (durum === "baglanti") {
    return (
      <Perde metin="Sorular yüklenemedi. Bağlantını kontrol edip tekrar dene.">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <button type="button" className="bk-dugme" onClick={() => { setDurum("yukleniyor"); setYenidenDene((n) => n + 1); }}>Tekrar dene</button>
          <Link className="bk-dugme acik" href={`/ders/${dersKey}`}>Konulara dön</Link>
        </div>
      </Perde>
    );
  }

  if (durum === "bitti_zaten") {
    return (
      <Perde metin={`${konuBasligi} konusunun üç adımını da tamamladın 🎉`}>
        <Link className="bk-dugme" href={`/ders/${dersKey}`}>Konulara dön</Link>
      </Perde>
    );
  }

  if (durum === "sonuc" && akis) {
    return (
      <SonucAkisi
        sonuc={akis.sonuc}
        seriSozu={akis.seriSozu}
        gorevSozu={akis.gorevSozu}
        uid={kullanici?.uid ?? null}
        misafir={!kullanici}
        onBitti={() => router.push(`/ders/${dersKey}`)}
      />
    );
  }

  const soru = sorular[indeks];
  const dogruMu = kontrolEdildi && secili === soru.dogruIndeks;
  const oran = ((indeks + (kontrolEdildi ? 1 : 0)) / sorular.length) * 100;

  return (
    <div className="bk">
      <div className="bk-test">
        <div className="bk-test-ust">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <Link href={`/ders/${dersKey}`} className="bk-cikis" aria-label="Çık"><img src="/uygulama/cikis.png" alt="" /></Link>
          <div className="bk-cubuk" style={{ flex: 1 }}><i style={{ width: `${oran}%` }} /></div>
          {/* Can ikonu uygulamanınki (Android TestScreens.kt: R.drawable.hakicon); önce ❤️ emojisiydi. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="bk-test-can"><img src="/uygulama/hakicon.svg" alt="" />{can}</div>
        </div>

        <p className="bk-soluk" style={{ fontSize: 13, marginBottom: 6 }}>
          {ders?.ad} · {konuBasligi} · Adım {adim}
        </p>
        <h2 style={{ fontSize: 21, lineHeight: 1.35, marginBottom: 22 }}>{soru.metin}</h2>

        {soru.secenekler.map((s, i) => {
          const durumu = kontrolEdildi
            ? i === soru.dogruIndeks ? "dogru" : i === secili ? "yanlis" : undefined
            : i === secili ? "secili" : undefined;
          // Animasyon yalnız kontrolden sonra ve yalnız ilgili şıkta oynar.
          const anim = kontrolEdildi
            ? i === soru.dogruIndeks && dogruMu ? "dogru" : i === secili && !dogruMu ? "yanlis" : undefined
            : undefined;
          return (
            <button
              key={`${indeks}-${i}`}
              className="bk-secenek"
              disabled={kontrolEdildi}
              data-durum={durumu}
              data-anim={anim}
              onClick={() => setSecili(i)}
            >
              {s}
              {anim === "dogru" && (
                <span className="bk-parilti" aria-hidden>
                  <span className="kayan">
                    <span className="bant" />
                    <span className="ucgen a" />
                    <span className="ucgen b" />
                    <span className="ucgen c" />
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {kombo && (
        <div className="bk-kombo">
          <Lottie ad="dogrubes" bittiginde={() => setKombo(false)} style={{ height: 300 }} />
        </div>
      )}

      <div
        className={`bk-alt-bant ${kontrolEdildi ? (dogruMu ? "dogru" : "yanlis") : ""}`}
        data-gorunur={kontrolEdildi ? "true" : undefined}
        key={kontrolEdildi ? `bant-${indeks}` : "bant"}
      >
        {/* Uygulamada olduğu gibi: kontrol edilmeden alt bantta yazı YOK
            (ilerleme zaten üstteki çubukta görünüyor). */}
        {kontrolEdildi && (
          <div className="bk-alt-bant-yazi">
            {dogruMu ? "Doğru! 🎉" : `Doğru cevap: ${soru.secenekler[soru.dogruIndeks]}`}
          </div>
        )}
        {kontrolEdildi ? (
          <button className="bk-eylem" data-ton={dogruMu ? "dogru" : "yanlis"} onClick={devamEt}>
            {indeks + 1 >= sorular.length ? "Bitir" : "Devam Et"}
          </button>
        ) : (
          <button className="bk-eylem" onClick={kontrolEt} disabled={secili == null}>
            Kontrol Et
          </button>
        )}
      </div>
    </div>
  );
}

/** Konunun başlığını katalogdan bulur ("t7" → "Meslekler"). */
function konuAdiBul(sinif: number, dersKey: string, konuKey: string): string {
  for (const unite of uniteler(sinif, dersKey)) {
    for (const satir of unite.topics) {
      const { baslik, testKey } = konuAyristir(satir);
      if (testKey === konuKey) return baslik;
    }
  }
  return konuKey;
}
