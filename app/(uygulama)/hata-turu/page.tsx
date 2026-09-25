"use client";

// Hata Turu — daha önce yanlış yapılan sorular (hatalar.ts), 3 gün olgunlaşınca yeniden.
// Test ekranının sade kopyası: can gitmez (hata öğrenmek için), adım/istatistik/görev yazılmaz;
// doğru başına XP (test gibi, her hata en fazla bir kez ödül verir — doğru bilince kayıt silinir) + seri.
// Üstte "Ders · Konu" etiketi soru soru değişir. Bittiğinde Sonuç akışı → ana ekran.
// ?ders=..&konu=.. (24 Eyl 2026, Android hataTuruKonu): "Tekrar bakacağın sorular" konu satırından
// gelinirse YALNIZ o konunun yanlışları; genel düğmeler parametresiz → karışık tur.

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { dersBul } from "../dersler";
import Lottie from "../Lottie";
import Perde from "../Perde";
import { sesCal } from "../ses";
import SonucAkisi, { type SeriArgs, type SonucArgs } from "../sonuc/SonucAkisi";
import type { GorevDegisimi } from "../../lib/gorevYaz";
import { enUzunSeriGuncelle } from "../../lib/ilerleme";
import { sessizHata } from "../../lib/hata";
import { useOturum } from "../../lib/oturum";
import { konuAyristir, uniteler } from "../../lib/katalog";
import { ACT_TEST, XP_DOGRU_TEST, seriIsaretle, xpEkle } from "../../lib/veri";
import { hataDegisimleriYaz, hatalariOkuVeyaNull, turSorulariniHazirla, yetimleriSil, type SoruSonucu, type TurSorusu } from "../../lib/hatalar";

// baglanti: hatalar ya da sorular okunamadı (çevrimdışı) — "yanlışın yok" DEME
type Durum = "yukleniyor" | "bos" | "baglanti" | "cozuluyor" | "sonuc";

export default function HataTuruSayfasi() {
  // useSearchParams Suspense ister
  return <Suspense><HataTuru /></Suspense>;
}

function HataTuru() {
  const router = useRouter();
  const { yukleniyor, kullanici, sinif } = useOturum();
  const arama = useSearchParams();
  const konuDers = arama.get("ders");
  const konuKey = arama.get("konu");
  const [yenidenDene, setYenidenDene] = useState(0);

  const [durum, setDurum] = useState<Durum>("yukleniyor");
  const [sorular, setSorular] = useState<TurSorusu[]>([]);
  const [indeks, setIndeks] = useState(0);
  const [secili, setSecili] = useState<number | null>(null);
  const [kontrolEdildi, setKontrolEdildi] = useState(false);
  const [dogruSayisi, setDogruSayisi] = useState(0);
  const [kombo, setKombo] = useState(false);
  const [akis, setAkis] = useState<{ sonuc: SonucArgs; seriSozu: Promise<SeriArgs | null>; gorevSozu: Promise<GorevDegisimi[]> } | null>(null);

  const ustUsteDogru = useRef(0);
  const baslangic = useRef(0);
  const sonuclar = useRef<SoruSonucu[]>([]);

  useEffect(() => {
    if (yukleniyor) return;
    if (!kullanici) { setDurum("bos"); return; }
    let iptal = false;
    (async () => {
      const okunan = await hatalariOkuVeyaNull(kullanici.uid, sinif);
      if (iptal) return;
      if (okunan == null) { setDurum("baglanti"); return; }
      // Konu seçiliyse yalnız o konunun yanlışları (olgunlaşmamışlar da gelir: olgun önce, gerisi sırayla)
      const hatalar = konuDers && konuKey ? okunan.filter((h) => h.ders === konuDers && h.konu === konuKey) : okunan;
      const hazirlik = await turSorulariniHazirla(sinif, hatalar, Date.now());
      if (iptal) return;
      // İçerikte artık olmayan soruların kayıtları temizlenir (yalnız okuma başarılıysa yetim sayılır)
      yetimleriSil(kullanici.uid, sinif, hazirlik.yetimler);
      setSorular(hazirlik.sorular);
      baslangic.current = Date.now();
      setDurum(hazirlik.sorular.length > 0 ? "cozuluyor" : hazirlik.okunamayanVar ? "baglanti" : "bos");
    })();
    return () => { iptal = true; };
  }, [yukleniyor, kullanici, sinif, konuDers, konuKey, yenidenDene]);

  const bitir = useCallback((sonDogru: number) => {
    const toplam = sorular.length;
    const sureSn = Math.max(1, Math.round((Date.now() - baslangic.current) / 1000));
    const xp = sonDogru * XP_DOGRU_TEST;
    const gorevSozu = Promise.resolve<GorevDegisimi[]>([]);
    const seriSozu: Promise<SeriArgs | null> = (async () => {
      if (!kullanici) return null;
      const uid = kullanici.uid;
      // Ders ders grupla: hatalar.ts ders başına tek update yazar
      const dersler = new Map<string, SoruSonucu[]>();
      sorular.forEach((s, i) => {
        const r = sonuclar.current[i];
        if (!r) return;
        dersler.set(s.ders, [...(dersler.get(s.ders) ?? []), r]);
      });
      // Hata kayıtları + XP bağımsız, beklenmez: çevrimdışı takılırlarsa seri/sonuç akışını bekletmesinler
      for (const [ders, liste] of dersler) hataDegisimleriYaz(uid, sinif, ders, liste).catch((e) => sessizHata("hatalar", e));
      if (xp > 0) xpEkle(uid, sinif, xp, "hata_turu").catch((e) => sessizHata("xp", e));
      try {
        const seri = await seriIsaretle(uid, ACT_TEST);
        // En uzun seri rekoru: tek yazma, sınıfa göre kırpılmış (beklenmez)
        if (seri.basarili && seri.sayi > 0) void enUzunSeriGuncelle(uid, sinif, seri.sayi);
        if (!seri.basarili || !seri.ilkAktiviteBugun) return null;
        return { sayi: seri.sayi, maske: seri.maske, tetik: ACT_TEST };
      } catch { return null; }
    })();
    setDurum("sonuc");
    setAkis({ sonuc: { dogru: sonDogru, toplam, sureSn, puan: xp }, seriSozu, gorevSozu });
  }, [kullanici, sinif, sorular]);

  function kontrolEt() {
    if (secili == null || kontrolEdildi) return;
    setKontrolEdildi(true);
    const s = sorular[indeks];
    const dogru = secili === s.dogruIndeks;
    sonuclar.current[indeks] = { konu: s.konu, adim: s.adim, soruKey: s.anahtar, dogru };
    if (dogru) {
      sesCal("dogru");
      setDogruSayisi((d) => d + 1);
      ustUsteDogru.current += 1;
      if (ustUsteDogru.current >= 5) { ustUsteDogru.current = 0; setKombo(true); }
    } else {
      sesCal("yanlis");
      ustUsteDogru.current = 0;
    }
  }

  function devamEt() {
    if (indeks + 1 >= sorular.length) { bitir(dogruSayisi); return; }
    setIndeks((i) => i + 1);
    setSecili(null);
    setKontrolEdildi(false);
  }

  if (durum === "yukleniyor") return <Perde metin="Hataların toplanıyor…" />;

  if (durum === "baglanti") {
    return (
      <Perde metin="Bağlantı yok, sonra tekrar dene.">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <button type="button" className="bk-dugme" onClick={() => { setDurum("yukleniyor"); setYenidenDene((n) => n + 1); }}>Tekrar dene</button>
          <Link className="bk-dugme acik" href="/">Ana ekrana dön</Link>
        </div>
      </Perde>
    );
  }

  if (durum === "bos") {
    return (
      <Perde metin={kullanici ? "Tekrar edilecek yanlışın yok. Harika! 🎉" : "Hata Turu için giriş yapman gerekiyor."}>
        <Link className="bk-dugme" href="/">Ana ekrana dön</Link>
      </Perde>
    );
  }

  if (durum === "sonuc" && akis) {
    return (
      <SonucAkisi sonuc={akis.sonuc} seriSozu={akis.seriSozu} gorevSozu={akis.gorevSozu}
        uid={kullanici?.uid ?? null} misafir={!kullanici} onBitti={() => router.push("/")} />
    );
  }

  const soru = sorular[indeks];
  const dogruMu = kontrolEdildi && secili === soru.dogruIndeks;
  const oran = ((indeks + (kontrolEdildi ? 1 : 0)) / sorular.length) * 100;
  const ders = dersBul(soru.ders);

  return (
    <div className="bk">
      <div className="bk-test">
        <div className="bk-test-ust">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <Link href="/" className="bk-cikis" aria-label="Çık"><img src="/uygulama/cikis.png" alt="" /></Link>
          <div className="bk-cubuk" style={{ flex: 1 }}><i style={{ width: `${oran}%` }} /></div>
          <span className="bk-hata-rozet">HATA TURU</span>
        </div>

        <p className="bk-soluk" style={{ fontSize: 13, marginBottom: 6 }}>
          {ders?.ad} · {konuAdiBul(sinif, soru.ders, soru.konu)} · {indeks + 1}/{sorular.length}
        </p>
        <h2 style={{ fontSize: 21, lineHeight: 1.35, marginBottom: 22 }}>{soru.metin}</h2>

        {soru.secenekler.map((s, i) => {
          const durumu = kontrolEdildi
            ? i === soru.dogruIndeks ? "dogru" : i === secili ? "yanlis" : undefined
            : i === secili ? "secili" : undefined;
          const anim = kontrolEdildi
            ? i === soru.dogruIndeks && dogruMu ? "dogru" : i === secili && !dogruMu ? "yanlis" : undefined
            : undefined;
          return (
            <button key={`${indeks}-${i}`} className="bk-secenek" disabled={kontrolEdildi} data-durum={durumu} data-anim={anim} onClick={() => setSecili(i)}>
              {s}
              {anim === "dogru" && (
                <span className="bk-parilti" aria-hidden>
                  <span className="kayan"><span className="bant" /><span className="ucgen a" /><span className="ucgen b" /><span className="ucgen c" /></span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {kombo && (
        <div className="bk-kombo"><Lottie ad="dogrubes" bittiginde={() => setKombo(false)} style={{ height: 300 }} /></div>
      )}

      <div className={`bk-alt-bant ${kontrolEdildi ? (dogruMu ? "dogru" : "yanlis") : ""}`} data-gorunur={kontrolEdildi ? "true" : undefined} key={kontrolEdildi ? `bant-${indeks}` : "bant"}>
        {kontrolEdildi && (
          <div className="bk-alt-bant-yazi">
            {dogruMu ? "Bu kez doğru! 🎉" : `Doğru cevap: ${soru.secenekler[soru.dogruIndeks]}`}
          </div>
        )}
        {kontrolEdildi ? (
          <button className="bk-eylem" data-ton={dogruMu ? "dogru" : "yanlis"} onClick={devamEt}>
            {indeks + 1 >= sorular.length ? "Bitir" : "Devam Et"}
          </button>
        ) : (
          <button className="bk-eylem" onClick={kontrolEt} disabled={secili == null}>Kontrol Et</button>
        )}
      </div>
    </div>
  );
}

function konuAdiBul(sinif: number, dersKey: string, konuKey: string): string {
  for (const unite of uniteler(sinif, dersKey)) {
    for (const satir of unite.topics) {
      const { baslik, testKey } = konuAyristir(satir);
      if (testKey === konuKey) return baslik;
    }
  }
  return konuKey;
}
