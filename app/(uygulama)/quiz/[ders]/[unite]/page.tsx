"use client";

// Ünite eşleştirme quizi — Android `QuizScreens.kt` → QuizUnitMatchPagerScreen + QuizMatchScreen.
//
// Ekran TAM EKRAN: test ekranıyla aynı iskelet (Kabuk yok, sol menü/ray yok, üstte
// yalnız çıkış, altta sabit bant + 260px eylem düğmesi). Android'de de quiz test gibi
// kendi başına açılır; eskiden burada Kabuk içinde kart gibi duruyordu.
//
// Oynanış birebir: çiftler ünite yüklenince BİR KEZ karıştırılır, `pageSize`lik
// sayfalara bölünür, sağ sütun sayfa başına ayrıca karıştırılır. Önce soldan bir kutu,
// sonra sağdan eşi seçilir. Doğruysa ikisi de yeşile kilitlenir (zıplama + ışık bandı);
// yanlışsa 1400 ms kırmızı kalır ve tahta kilitlenir (sarsıntı). Sayfadaki tüm çiftler
// eşleşince "Kontrol Et" açılır; basınca ses + yeşil bant + "Devam Et". Son sayfada biter.
// Ses yalnız Kontrol Et'te (Android: SoundManager.playDogru) — eşleşme başına ses YOK.
//
// Ödül: ilk tamamlamada +30 XP. Seri/başarım/görev/istatistik YOK — Android de yazmıyor.
// Bitiş ekranı Android'de YOK (son Devam Et kapatır, XP arkada yazılır); web'de kalıyor
// çünkü "30 XP kazandın" görünmeden kapanmak ödülü boşa harcıyor (14 Eyl 2026 kararı).

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Perde from "../../../Perde";
import { useOturum } from "../../../../lib/oturum";
import { sesCal } from "../../../ses";
import {
  quizTamamla,
  quizUnitesiGetir,
  XP_QUIZ_TAMAM,
  type QuizCifti,
  type QuizUnitesi,
} from "../../../../lib/quiz";

type Durum = "yukleniyor" | "hata" | "oynaniyor" | "bitti";

/** Deterministik olmayan karıştırma (Android: `shuffled()`). */
function karistir<T>(dizi: T[]): T[] {
  const k = [...dizi];
  for (let i = k.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [k[i], k[j]] = [k[j], k[i]];
  }
  return k;
}

export default function QuizSayfasi() {
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
  const [cikisSorusu, setCikisSorusu] = useState(false);

  const geriYolu = `/ders/${dersKey}`;

  useEffect(() => {
    if (yukleniyor) return;
    let iptal = false;
    (async () => {
      try {
        const q = await quizUnitesiGetir(sinif, dersKey, uniteKey);
        if (iptal) return;
        if (!q || q.ciftler.length === 0) { setDurum("hata"); return; }
        // Android: `loaded.copy(pairs = loaded.pairs.shuffled())` — önbellekteki nesne
        // değişmesin diye kopya karıştırılır.
        setVeri({ ...q, ciftler: karistir(q.ciftler) });
        setSayfa(0);
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

  if (durum === "yukleniyor") return <Perde metin="Quiz yükleniyor…" nokta />;

  if (durum === "hata") {
    return (
      <Perde metin="Bu ünite için quiz bulunamadı.">
        <Link className="bk-dugme" href={geriYolu}>Ünitelere dön</Link>
      </Perde>
    );
  }

  if (durum === "bitti") {
    return (
      <Perde
        metin={
          ilkKez
            ? `Quiz tamamlandı! 🎉 ${kazanilanXp} XP kazandın.`
            : `Quiz tamamlandı! Bu quizi daha önce bitirmiştin; ${XP_QUIZ_TAMAM} XP yalnız ilk seferde veriliyor.`
        }
      >
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link className="bk-dugme" href={geriYolu}>Ünitelere dön</Link>
          <button className="bk-dugme acik" onClick={() => router.push("/")}>Ana ekran</button>
        </div>
      </Perde>
    );
  }

  return (
    <div className="bk">
      <Sayfa
        key={sayfa}
        ciftler={sayfaCiftleri}
        sayfa={sayfa}
        sayfaSayisi={sayfaSayisi}
        onGeri={() => setCikisSorusu(true)}
        onSonraki={() => {
          if (sayfa >= sayfaSayisi - 1) void bitir();
          else setSayfa(sayfa + 1);
        }}
      />

      {/* Android ExitConfirmDialog: "Çıkmak istediğine emin misin?" · Çıkış Yap / Vazgeç */}
      {cikisSorusu && (
        <div className="bk-ortu">
          <div className="bk-kart bk-soru-kutu">
            <h3>Çıkmak istediğine emin misin?</h3>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button className="bk-dugme acik" style={{ flex: 1 }} onClick={() => setCikisSorusu(false)}>
                Vazgeç
              </button>
              <button className="bk-dugme kirmizi" style={{ flex: 1 }} onClick={() => router.push(geriYolu)}>
                Çıkış Yap
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- bir sayfa */

type KutuDurumu = "normal" | "secili" | "dogru" | "yanlis";

function Sayfa({
  ciftler, sayfa, sayfaSayisi, onGeri, onSonraki,
}: {
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
      setKilitli((k) => ({ ...k, [sol]: r }));
    } else {
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
      <div className="bk-test bk-quiz">
        {/* Android: üstte yalnız çıkış görseli, başlık yok */}
        <div className="bk-test-ust">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <button className="bk-cikis" aria-label="Çık" onClick={onGeri}><img src="/uygulama/cikis.png" alt="" /></button>
        </div>

        {/* Satırlar kalan yüksekliği paylaşır (Android: Row.weight(1f)) */}
        <div className="bk-quiz-izgara">
          {ciftler.map((c, i) => (
            <div className="bk-quiz-satir" key={i}>
              <Kutu durum={solDurum(i)} disabled={kilitli[i] !== undefined || yanlis != null} onClick={() => solaBas(i)}>
                {c.sol}
              </Kutu>
              <Kutu durum={sagDurum(i)} disabled={kilitliSaglar.has(i) || seciliSol == null || yanlis != null} onClick={() => sagaBas(i)}>
                {saglar[i]}
              </Kutu>
            </div>
          ))}
        </div>

        <p className="bk-soluk" style={{ fontSize: 13, textAlign: "center", margin: "14px 0 0" }}>
          Sayfa {sayfa + 1}/{sayfaSayisi}
        </p>
      </div>

      {/* Test ekranıyla aynı alt bant: kontrol edilince yeşil "Doğru" bandı düğmenin arkasından çıkar */}
      <div
        className={`bk-alt-bant${kontrolEdildi ? " dogru" : ""}`}
        data-gorunur={kontrolEdildi ? "true" : undefined}
        key={kontrolEdildi ? "bant-dogru" : "bant"}
      >
        {kontrolEdildi && <div className="bk-alt-bant-yazi">Doğru</div>}
        <button
          className="bk-eylem"
          data-ton={kontrolEdildi ? "dogru" : undefined}
          disabled={!hepsiDogru}
          onClick={() => {
            if (kontrolEdildi) onSonraki();
            else { sesCal("dogru"); setKontrolEdildi(true); }
          }}
        >
          {kontrolEdildi ? "Devam Et" : "Kontrol Et"}
        </button>
      </div>
    </>
  );
}

/** Eşleştirme kutusu — Android `MatchTile`: doğruda zıplama + ışık bandı, yanlışta sarsıntı. */
function Kutu({
  durum, disabled, onClick, children,
}: {
  durum: KutuDurumu; disabled: boolean; onClick: () => void; children: React.ReactNode;
}) {
  const anim = durum === "dogru" ? "dogru" : durum === "yanlis" ? "yanlis" : undefined;
  return (
    <button className="bk-quiz-kutu" data-durum={durum} data-anim={anim} disabled={disabled} onClick={onClick}>
      {children}
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
}
