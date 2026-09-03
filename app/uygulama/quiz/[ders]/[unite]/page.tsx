"use client";

// Ünite eşleştirme quizi — Android `QuizScreens.kt` → QuizMatchScreen portu.
//
// Oynanış birebir: çiftler `pageSize`lik sayfalara bölünür, SAĞ sütun karıştırılır.
// Önce soldan bir kutu seçilir, sonra sağdan eşi. Doğruysa ikisi de yeşile kilitlenir;
// yanlışsa 1400 ms kırmızı kalır ve tahta kilitlenir. Sayfadaki tüm çiftler eşleşince
// "Kontrol Et" açılır, basınca "Devam Et"e döner. Son sayfada quiz biter.
//
// Ödül: ilk tamamlamada +30 XP. Seri/başarım/görev/istatistik YOK — Android de yazmıyor.

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Kabuk from "../../../Kabuk";
import { useOturum } from "../../../../lib/oturum";
import { sesCal } from "../../../ses";
import { dersBul } from "../../../dersler";
import { uniteler } from "../../../../lib/katalog";
import {
  quizTamamla,
  quizUnitesiGetir,
  XP_QUIZ_TAMAM,
  type QuizCifti,
  type QuizUnitesi,
} from "../../../../lib/quiz";

type Durum = "yukleniyor" | "hata" | "oynaniyor" | "bitti";

export default function QuizSayfasi() {
  return (
    <Kabuk>
      <Icerik />
    </Kabuk>
  );
}

/** Deterministik olmayan karıştırma — sayfa değişince yenilenir (Android: remember(pageIndex)). */
function karistir<T>(dizi: T[]): T[] {
  const k = [...dizi];
  for (let i = k.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [k[i], k[j]] = [k[j], k[i]];
  }
  return k;
}

function Icerik() {
  const router = useRouter();
  const params = useParams<{ ders: string; unite: string }>();
  const dersKey = String(params.ders ?? "");
  const uniteKey = String(params.unite ?? "");
  const { yukleniyor, kullanici, sinif } = useOturum();

  const [durum, setDurum] = useState<Durum>("yukleniyor");
  const [veri, setVeri] = useState<QuizUnitesi | null>(null);
  const [sayfa, setSayfa] = useState(0);
  const [kazanilanXp, setKazanilanXp] = useState(0);
  const [ilkKez, setIlkKez] = useState(false);

  const ders = dersBul(dersKey);
  const uniteAdi = useMemo(() => {
    // Adres çubuğundaki anahtar `quizKey` de olabilir `key` de (defterde defterKey gibi)
    const u = uniteler(sinif, dersKey).find((x) => x.quizKey === uniteKey || x.key === uniteKey);
    return u?.title ?? "";
  }, [sinif, dersKey, uniteKey]);

  useEffect(() => {
    if (yukleniyor) return;
    let iptal = false;
    (async () => {
      try {
        const q = await quizUnitesiGetir(sinif, dersKey, uniteKey);
        if (iptal) return;
        if (!q || q.ciftler.length === 0) { setDurum("hata"); return; }
        setVeri(q);
        setDurum("oynaniyor");
      } catch {
        if (!iptal) setDurum("hata");
      }
    })();
    return () => { iptal = true; };
  }, [yukleniyor, sinif, dersKey, uniteKey]);

  const sayfaSayisi = veri ? Math.max(1, Math.ceil(veri.ciftler.length / veri.sayfaBoyu)) : 1;
  const sayfaCiftleri = useMemo(() => {
    if (!veri) return [];
    return veri.ciftler.slice(sayfa * veri.sayfaBoyu, (sayfa + 1) * veri.sayfaBoyu);
  }, [veri, sayfa]);

  const bitir = useCallback(async () => {
    setDurum("bitti");
    if (!kullanici) return;
    try {
      const s = await quizTamamla(kullanici.uid, sinif, dersKey, uniteKey);
      setKazanilanXp(s.xp);
      setIlkKez(s.ilkKez);
    } catch {
      /* yazma hatası bitiş ekranını engellemesin */
    }
  }, [kullanici, sinif, dersKey, uniteKey]);

  if (durum === "yukleniyor") {
    return <p className="bk-soluk" style={{ padding: 24 }}>Quiz yükleniyor…</p>;
  }

  if (durum === "hata") {
    return (
      <div className="bk-kart">
        <p className="bk-soluk" style={{ fontSize: 14, marginBottom: 14 }}>
          Bu ünitenin quizi bulunamadı.
        </p>
        <Link className="bk-dugme" href={`/uygulama/defter/${dersKey}`}>Ünitelere dön</Link>
      </div>
    );
  }

  if (durum === "bitti") {
    return (
      <div className="bk-kart" style={{ textAlign: "center", padding: 28 }}>
        <div style={{ fontSize: 44, marginBottom: 8 }}>🎉</div>
        <h2 style={{ fontSize: 22, marginBottom: 8 }}>Quiz tamamlandı!</h2>
        <p className="bk-soluk" style={{ fontSize: 14, marginBottom: 16 }}>
          {ilkKez
            ? `${kazanilanXp} XP kazandın.`
            : `Bu quizi daha önce tamamlamıştın, ${XP_QUIZ_TAMAM} XP yalnız ilk seferde veriliyor.`}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link className="bk-dugme" href={`/uygulama/defter/${dersKey}`}>Ünitelere dön</Link>
          <button className="bk-dugme acik" onClick={() => router.push("/uygulama")}>Ana ekran</button>
        </div>
      </div>
    );
  }

  return (
    <Sayfa
      key={sayfa}
      baslik={`Quiz • ${ders?.ad ?? dersKey} • ${uniteAdi || veri?.baslik || ""}`}
      ciftler={sayfaCiftleri}
      sayfa={sayfa}
      sayfaSayisi={sayfaSayisi}
      onGeri={() => router.push(`/uygulama/defter/${dersKey}`)}
      onSonraki={() => {
        if (sayfa >= sayfaSayisi - 1) void bitir();
        else setSayfa(sayfa + 1);
      }}
    />
  );
}

/* --------------------------------------------------------------- bir sayfa */

type KutuDurumu = "normal" | "secili" | "dogru" | "yanlis";

function Sayfa({
  baslik, ciftler, sayfa, sayfaSayisi, onGeri, onSonraki,
}: {
  baslik: string;
  ciftler: QuizCifti[];
  sayfa: number;
  sayfaSayisi: number;
  onGeri: () => void;
  onSonraki: () => void;
}) {
  // Sağ sütun sayfa başına bir kez karıştırılır (dış `key={sayfa}` yeniden kuruyor)
  const [saglar] = useState(() => karistir(ciftler.map((c) => c.sag)));
  const [seciliSol, setSeciliSol] = useState<number | null>(null);
  const [kilitli, setKilitli] = useState<Record<number, number>>({});
  const [yanlis, setYanlis] = useState<[number, number] | null>(null);
  const [kontrolEdildi, setKontrolEdildi] = useState(false);
  const zamanlayiciRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (zamanlayiciRef.current) clearTimeout(zamanlayiciRef.current); }, []);

  const hepsiDogru = ciftler.length > 0 && Object.keys(kilitli).length === ciftler.length;
  const kilitliSaglar = new Set(Object.values(kilitli));

  function solaBas(i: number) {
    if (kilitli[i] !== undefined || yanlis) return;
    setSeciliSol(seciliSol === i ? null : i);
  }

  function sagaBas(r: number) {
    if (seciliSol == null || kilitliSaglar.has(r) || yanlis) return;
    const sol = seciliSol;
    setSeciliSol(null);
    if (saglar[r] === ciftler[sol].sag) {
      sesCal("dogru");
      setKilitli((k) => ({ ...k, [sol]: r }));
    } else {
      sesCal("yanlis");
      setYanlis([sol, r]);
      // Android: 1400 ms kırmızı kalır, bu sürede tahta kilitli
      zamanlayiciRef.current = setTimeout(() => setYanlis(null), 1400);
    }
  }

  const solDurum = (i: number): KutuDurumu =>
    kilitli[i] !== undefined ? "dogru"
    : yanlis?.[0] === i ? "yanlis"
    : seciliSol === i ? "secili"
    : "normal";

  const sagDurum = (r: number): KutuDurumu =>
    kilitliSaglar.has(r) ? "dogru" : yanlis?.[1] === r ? "yanlis" : "normal";

  return (
    <>
      <div className="bk-kart-ust">
        <h1 style={{ fontSize: 18 }}>{baslik}</h1>
        <button className="bk-metin-dugme" onClick={onGeri}>✕</button>
      </div>

      <div className="bk-quiz-izgara">
        {ciftler.map((c, i) => (
          <div className="bk-quiz-satir" key={i}>
            <button
              className="bk-quiz-kutu"
              data-durum={solDurum(i)}
              disabled={kilitli[i] !== undefined || yanlis != null}
              onClick={() => solaBas(i)}
            >
              {c.sol}
            </button>
            <button
              className="bk-quiz-kutu"
              data-durum={sagDurum(i)}
              disabled={kilitliSaglar.has(i) || seciliSol == null || yanlis != null}
              onClick={() => sagaBas(i)}
            >
              {saglar[i]}
            </button>
          </div>
        ))}
      </div>

      <p className="bk-soluk" style={{ fontSize: 13, textAlign: "center", margin: "14px 0" }}>
        Sayfa {sayfa + 1}/{sayfaSayisi}
      </p>

      <button
        className={`bk-dugme tam${kontrolEdildi ? " yesil" : ""}`}
        disabled={!hepsiDogru}
        onClick={() => {
          if (kontrolEdildi) onSonraki();
          else { sesCal("dogru"); setKontrolEdildi(true); }
        }}
      >
        {kontrolEdildi ? "Devam Et" : "Kontrol Et"}
      </button>
    </>
  );
}
