"use client";

// Hata Turu — daha önce yanlış yapılan sorular (hatalar.ts), 3 gün olgunlaşınca yeniden.
// Test ekranının sade kopyası: can gitmez (hata öğrenmek için), adım/istatistik/görev yazılmaz;
// doğru başına XP (test gibi, her hata en fazla bir kez ödül verir — doğru bilince kayıt silinir).
// Seri ve görev YOK (6 Eki 2026, Android 25c3544): 1-2 tekrar sorusu "bugün çalıştım" sayılmaz.
// Üstte "Ders · Konu" etiketi soru soru değişir. Bitince genel Sonuç ekranı yerine kısa kapanış kartı
// (listeden çıkan / tekrar bakılacak / puan) → Devam → Bilgie Koç (Android'deki reklam web'de yok).
// ?ders=..&konu=.. (24 Eyl 2026, Android hataTuruKonu): "Tekrar bakacağın sorular" konu satırından
// gelinirse YALNIZ o konunun yanlışları; genel düğmeler parametresiz → karışık tur.

import { AksiyonDugmesi, AltSonucBandi, TestNotDugmesi } from "../TestAlt";
import { NotlarOkumaPaneli } from "../notlar/NotlarSayfasi";
import { NOT_DERSLER } from "../../lib/notlar";
import CikisOnayi from "../CikisOnayi";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { dersBul } from "../dersler";
import Lottie from "../Lottie";
import Perde from "../Perde";
import { sesCal } from "../ses";
import { sessizHata } from "../../lib/hata";
import { useOturum } from "../../lib/oturum";
import { konuAyristir, uniteler } from "../../lib/katalog";
import { XP_DOGRU_TEST, xpEkle } from "../../lib/veri";
import { olayModuAcikMi } from "../../lib/olay/mod";
import { hataOlayiniYaz } from "../../lib/olay/bitisler";
import { hataDegisimleriYaz, hatalariOkuVeyaNull, turSorulariniHazirla, yetimleriSil, type SoruSonucu, type TurSorusu } from "../../lib/hatalar";

// baglanti: hatalar ya da sorular okunamadı (çevrimdışı) — "yanlışın yok" DEME
type Durum = "yukleniyor" | "bos" | "baglanti" | "cozuluyor" | "kapanis";

type Kapanis = { dogru: number; yanlis: number; xp: number };

export default function HataTuruSayfasi() {
  // useSearchParams Suspense ister
  return <Suspense><HataTuru /></Suspense>;
}

function HataTuru() {
  const [cikisSor, setCikisSor] = useState(false);   // Android ExitConfirmDialog — eskiden onaysız çıkıyordu
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
  const [notPaneli, setNotPaneli] = useState(false);   // çözerken notlara bakma paneli
  const [dogruSayisi, setDogruSayisi] = useState(0);
  const [kombo, setKombo] = useState(false);
  const [kapanis, setKapanis] = useState<Kapanis | null>(null);

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

  const bitti = useRef(false);
  const bitir = useCallback((sonDogru: number) => {
    if (bitti.current) return;
    bitti.current = true;
    const xp = sonDogru * XP_DOGRU_TEST;
    setKapanis({ dogru: sonDogru, yanlis: sonuclar.current.filter((r) => r && !r.dogru).length, xp });
    setDurum("kapanis");
    if (!kullanici) return;
    const uid = kullanici.uid;
    // Ders ders grupla: hatalar.ts ders başına tek update yazar
    const dersler = new Map<string, SoruSonucu[]>();
    sorular.forEach((s, i) => {
      const r = sonuclar.current[i];
      if (!r) return;
      dersler.set(s.ders, [...(dersler.get(s.ders) ?? []), r]);
    });
    // Olay modu (şartname §7.5): hata kayıtları + olay TEK yazma; XP sunucuda. Karar BİR KEZ burada.
    if (olayModuAcikMi(uid)) {
      try {
        if (hataOlayiniYaz({ uid, sinif, dogru: sonDogru, dersler })) return;
      } catch (e) {
        sessizHata("olayYaz", e);   // eski yola düşer
      }
    }
    // Eski yol: hata kayıtları + XP bağımsız, beklenmez (çevrimdışı takılırlarsa birbirini bekletmesinler)
    for (const [ders, liste] of dersler) hataDegisimleriYaz(uid, sinif, ders, liste).catch((e) => sessizHata("hatalar", e));
    if (xp > 0) xpEkle(uid, sinif, xp, "hata_turu").catch((e) => sessizHata("xp", e));
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

  if (durum === "kapanis" && kapanis) {
    // Tek dersse o dersin renkleri, karışıksa Hata Turu turuncusu (Android 119c75e)
    const dersKeyleri = [...new Set(sorular.map((s) => s.ders))];
    const tekDers = dersKeyleri.length === 1 ? dersBul(dersKeyleri[0]) : undefined;
    return (
      <Perde metin="Hata Turu bitti 🎯">
        <div className="bk-hata-kapanis">
          {kapanis.dogru > 0 && <p>✅ {kapanis.dogru} soru listenden çıktı</p>}
          {kapanis.yanlis > 0 && <p>🔁 {kapanis.yanlis} soruya birkaç gün sonra yeniden bakacağız</p>}
          {kapanis.xp > 0 && <p className="puan">+{kapanis.xp} puan</p>}
        </div>
        <button type="button" className="bk-dugme"
          style={{ minWidth: 220, background: tekDers?.ana ?? "#FFA726", borderColor: tekDers?.koyu ?? "#B86E00", color: "#0c1a3f" }}
          onClick={() => router.push("/istatistik?sekme=koc")}>Devam</button>
      </Perde>
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
          <button className="bk-cikis" aria-label="Çık" onClick={() => setCikisSor(true)}><img src="/uygulama/cikis.png" alt="" /></button>
          {cikisSor && <CikisOnayi onVazgec={() => setCikisSor(false)} onCik={() => router.push("/")} />}
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

      <AltSonucBandi gorunur={kontrolEdildi} dogru={dogruMu} dogruCevap={soru.secenekler[soru.dogruIndeks]} />
      <TestNotDugmesi bantAcik={kontrolEdildi} onClick={() => setNotPaneli(true)} />
      {notPaneli && (
        <NotlarOkumaPaneli ders={(NOT_DERSLER as readonly string[]).includes(soru.ders) ? soru.ders : null} onKapat={() => setNotPaneli(false)} />
      )}
      <AksiyonDugmesi
        etiket={!kontrolEdildi ? "Kontrol Et" : indeks + 1 >= sorular.length ? "Bitir" : "Devam Et"}
        etkin={kontrolEdildi || secili != null}
        ton={!kontrolEdildi ? "normal" : dogruMu ? "dogru" : "yanlis"}
        onClick={kontrolEdildi ? devamEt : kontrolEt}
      />
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
