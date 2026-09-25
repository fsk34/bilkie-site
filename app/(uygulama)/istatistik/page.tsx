"use client";

// İstatistik — uygulamadaki StatsScreen'in web karşılığı (iOS: StatsScreen.swift).
// Görsel dil birebir porttur: renkli başlık bandı (sekmeye göre renk değişir) + kayan
// sarı çizgi, ders seçme düğmesi + seçim penceresi, bevel kartlar, 190px animasyonlu
// halka + kapsül lejant, defterde yığılmış çubuk ve Quiz şeridi, yazılıda dikey
// sütun grafiği, tek ders seçiliyken ünite seçici + konu konu kartlar.

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Kabuk from "../Kabuk";
import UcNokta from "../UcNokta";
import BilgieKocBolumu from "./BilgieKoc";
import { useOturum } from "../../lib/oturum";
import { konuAyristir, uniteler, type Unite } from "../../lib/katalog";
import { useDefterKartiHam, useIstatistikAgaci } from "../../lib/canliVeri";
import {
  defterKartBilgisiCoz,
  dersRengi,
  istatistikDilimleriCoz,
  konuIstatistikleriCoz,
  testIstatistigiCoz,
  yaziliDersCubuklariCoz,
  yaziliIstatistigiCoz,
  type DefterKarti,
  type Dilim,
  type KonuIstatistigi,
  type TestIstatistigi,
  type YaziliIstatistigi,
} from "../../lib/veri";

const DERSLER = [
  { key: null as string | null, ad: "Tüm Dersler" },
  { key: "turkce", ad: "Türkçe" },
  { key: "matematik", ad: "Matematik" },
  { key: "ingilizce", ad: "İngilizce" },
  { key: "fen", ad: "Fen" },
  { key: "sosyal", ad: "Sosyal" },
];

// 20 Eyl 2026: 4. sekme Bilgie Koç (gözlemler · güçlü/zayıf · hız · yanlışlar) — BilgieKoc.tsx
const BOLUMLER = ["Konu Testleri", "Konu Defterleri", "Yazılılar", "Bilgie Koç"] as const;

/* Defter kartı renkleri — iOS DefterStatsCard */
const D_BITTI = "#5DD67C";
const D_DEVAM = "#FFB93C";
const D_KALAN = "#3A3A5C";
const D_QUIZ = "#6C63FF";
const D_SAYFA = "#9AD7FF";

export default function IstatistikSayfasi() {
  return (
    <Kabuk>
      {/* useSearchParams (?sekme=koc — ana ekrandaki Bilgie Koç kartından gelir) Suspense ister */}
      <Suspense>
        <Icerik />
      </Suspense>
    </Kabuk>
  );
}

function Icerik() {
  const { kullanici, sinif } = useOturum();
  // ?sekme=koc → doğrudan Bilgie Koç sekmesi (ana ekran kartındaki "HEPSİNİ GÖSTER")
  const sekmeParam = useSearchParams().get("sekme");
  const [bolum, setBolum] = useState(sekmeParam === "koc" ? 3 : 0);
  const [ders, setDers] = useState<string | null>(null);
  const [secimAcik, setSecimAcik] = useState(false);

  // Seçili ünite burada duruyor: sekme değişince sıfırlanmasın. Ders/sınıf değişince başa döner —
  // effect içinde setState yerine seçim anahtarıyla saklanıp türetiliyor (react-hooks/set-state-in-effect).
  const [uniteSecimi, setUniteSecimi] = useState<{ ders: string | null; sinif: number; idx: number }>({ ders: null, sinif, idx: 0 });
  const uniteIdx = uniteSecimi.ders === ders && uniteSecimi.sinif === sinif ? uniteSecimi.idx : 0;
  const setUniteIdx = (idx: number) => setUniteSecimi({ ders, sinif, idx });

  // Veri: stats/grade{N} ağacı + defter/quiz ilerlemesi CANLI (canliVeri). Sayılar saf
  // çözücülerle türetilir; ekran açılınca son bilinen değer anında çizilir, test/defter/
  // quiz/yazılı bitince Firebase değişikliği kendisi getirir. (21 Eyl'e kadar 6 ayrı
  // `get()` her açılışta ağa gidiyordu.) `null` = henüz bilinmiyor → yükleniyor.
  const agac = useIstatistikAgaci(sinif);
  const defterHam = useDefterKartiHam(sinif);
  const yukleniyor = !!kullanici && (agac === null || defterHam === null);

  const test = useMemo(() => (agac ? testIstatistigiCoz(agac, ders) : null), [agac, ders]);
  const dilimler = useMemo(() => (agac ? istatistikDilimleriCoz(agac, ders) : []), [agac, ders]);
  const yazili = useMemo(() => (agac ? yaziliIstatistigiCoz(agac, ders) : null), [agac, ders]);
  const cubuklar = useMemo(() => (agac ? yaziliDersCubuklariCoz(agac) : []), [agac]);
  const konular = useMemo<Record<string, KonuIstatistigi>>(() => {
    if (!agac || !ders) return {};
    const subjects = (agac as { subjects?: Record<string, { topics?: unknown }> }).subjects;
    return konuIstatistikleriCoz(subjects?.[ders]?.topics);
  }, [agac, ders]);
  const defter = useMemo<DefterKarti | null>(
    () => (defterHam ? defterKartBilgisiCoz(defterHam[0], defterHam[1], defterHam[2], ders, (dk) => uniteler(sinif, dk).length) : null),
    [defterHam, ders, sinif]
  );


  const dersAdi = DERSLER.find((d) => d.key === ders)?.ad ?? "Tüm Dersler";

  return (
    <>
      <div className="bk-ist-bant" data-b={bolum}>
        <h1>İstatistik</h1>
        <div className="bk-ist-sekmeler">
          {BOLUMLER.map((b, i) => (
            <button
              key={b}
              className="bk-ist-sekme"
              data-aktif={bolum === i}
              onClick={() => setBolum(i)}
            >
              {b}
            </button>
          ))}
        </div>
        <div className="bk-ist-iz">
          <i style={{ transform: `translateX(${bolum * 100}%)` }} />
        </div>
      </div>

      {!kullanici ? (
        <div className="bk-bevel">
          <div className="bk-bevel-ic">
            <p className="bk-soluk" style={{ fontSize: 14, marginBottom: 14 }}>
              İstatistiklerini görmek için giriş yapman gerekiyor.
            </p>
            <Link className="bk-dugme" href="/giris">Giriş yap</Link>
          </div>
        </div>
      ) : (
        <>
          <button className="bk-ist-ders" data-b={bolum} onClick={() => setSecimAcik(true)}>
            {dersAdi.toLocaleUpperCase("tr")}
          </button>
          {/* Kâğıtta çözülen testler (20 Eyl): elle giriş → Bilgie Koç da görür; XP/lig yok */}
          <div className="bk-ist-evde-kap"><Link href={ders ? `/evde?ders=${encodeURIComponent(ders)}` : "/evde"} className="bk-ist-evde">📝 Evde çözdüm — ekle</Link></div>

          {yukleniyor ? (
            <Noktalar />
          ) : (
            /* Üç bölüm de monteli kalır, yalnızca görünürlük değişir: sekme değiştirmek
               veri okuması TETİKLEMEZ, halka animasyonu ve ünite seçimi korunur. */
            <>
              <div hidden={bolum !== 0}>
                <TestBolumu
                  test={test}
                  dilimler={dilimler}
                  dersKey={ders}
                  sinif={sinif}
                  konular={konular}
                  uniteIdx={uniteIdx}
                  uniteSec={setUniteIdx}
                />
              </div>
              <div hidden={bolum !== 1}>
                <DefterBolumu bilgi={defter} />
              </div>
              <div hidden={bolum !== 2}>
                <YaziliBolumu test={test} yazili={yazili} cubuklar={cubuklar} dersKey={ders} />
              </div>
              <div hidden={bolum !== 3}>
                {kullanici && <BilgieKocBolumu uid={kullanici.uid} sinif={sinif} dersKey={ders} onDersSec={setDers} />}
              </div>
            </>
          )}
        </>
      )}

      {secimAcik && (
        <Secim
          baslik="Ders Seç"
          secenekler={DERSLER.map((d) => ({ id: d.key ?? "", ad: d.ad }))}
          secili={ders ?? ""}
          onSec={(id) => { setDers(id === "" ? null : id); setSecimAcik(false); }}
          onKapat={() => setSecimAcik(false)}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ test */

function TestBolumu({
  test, dilimler, dersKey, sinif, konular, uniteIdx, uniteSec,
}: {
  test: TestIstatistigi | null; dilimler: Dilim[];
  dersKey: string | null; sinif: number;
  konular: Record<string, KonuIstatistigi>;
  uniteIdx: number; uniteSec: (i: number) => void;
}) {
  const oran = test?.basariOrani ?? 0;
  return (
    <>
      <div className="bk-bevel">
        <div className="bk-bevel-ic bk-ist-olcu">
          <div>Çözülen Soru Sayısı: {test?.cozulenSoru ?? 0}</div>
          <div>Başarı Oranı: %{oran}</div>
          <div>Ortalama Süre: {sureMetni(test?.ortalamaSaniye ?? 0)}</div>
        </div>
      </div>

      <div className="bk-bevel">
        <div className="bk-ist-halka">
          <Halka dilimler={dilimler} ortaYazi={`%${oran}`} />
          {dilimler.length === 0 ? (
            <p className="bk-soluk" style={{ fontSize: 13 }}>Henüz veri yok</p>
          ) : (
            <div className="bk-ist-cipler">
              {dilimler.slice(0, 6).map((d) => (
                <div key={d.id} className="bk-ist-cip">
                  <i style={{ background: d.renk }} />
                  <span>{d.etiket}: %{d.oran}</span>
                </div>
              ))}
              {dilimler.length > 6 && (
                <p className="bk-soluk" style={{ fontSize: 12 }}>+{dilimler.length - 6} tane daha</p>
              )}
            </div>
          )}
        </div>
      </div>

      {dersKey && (
        <UniteKonuDetayi
          dersKey={dersKey}
          sinif={sinif}
          konular={konular}
          idx={uniteIdx}
          setIdx={uniteSec}
        />
      )}
    </>
  );
}

/** Halka — iOS StatsBreakdownDonut: 190px, kalınlık %16, 4.5° boşluk, 0.75s easeOut dolum. */
function Halka({ dilimler, ortaYazi }: { dilimler: Dilim[]; ortaYazi: string }) {
  const dolu = dilimler.filter((d) => d.soru > 0);
  const p = useDolum(dolu.map((d) => d.id).join("|"), 750);

  const boyut = 190;
  const kalinlik = Math.max(10, boyut * 0.16);
  const r = boyut / 2 - kalinlik / 2;
  const c = boyut / 2;
  const cevre = 2 * Math.PI * r;
  const toplam = Math.max(1, dolu.reduce((t, d) => t + d.soru, 0));
  const bosluk = dolu.length <= 1 ? 0 : 4.5;
  const kullanilabilir = 360 - bosluk * dolu.length;

  // Kapanış içinde değişken güncellemek react-hooks/immutability'ye takılıyor → düz döngü
  const yaylar: { d: Dilim; bas: number; aci: number }[] = [];
  let imlec = -90;
  for (const d of dolu) {
    const aci = kullanilabilir * (d.soru / toplam) * p;
    yaylar.push({ d, bas: imlec, aci });
    imlec += aci + bosluk;
  }

  return (
    <div className="bk-ist-halka-kap">
      <svg width={boyut} height={boyut} viewBox={`0 0 ${boyut} ${boyut}`}>
        <circle
          cx={c} cy={c} r={r} fill="none"
          stroke="rgba(255,255,255,.14)" strokeWidth={kalinlik} strokeLinecap="round"
        />
        {yaylar.map(({ d, bas, aci }) =>
          aci > 0.5 ? (
            <circle
              key={d.id}
              cx={c} cy={c} r={r} fill="none"
              stroke={d.renk} strokeWidth={kalinlik} strokeLinecap="round"
              strokeDasharray={`${(cevre * aci) / 360} ${cevre}`}
              transform={`rotate(${bas} ${c} ${c})`}
            />
          ) : null
        )}
        {/* Yuvarlak uçların içeri taşan kısmını kapatan delik (uygulamada da var) */}
        <circle cx={c} cy={c} r={r * 0.58} fill="#0C1A3F" />
      </svg>
      <div className="bk-ist-halka-orta">{ortaYazi}</div>
    </div>
  );
}

/** Tek ders seçiliyken ünite seçici + konu kartları (iOS UnitAndTopicDetails). */
function UniteKonuDetayi({
  dersKey, sinif, konular, idx, setIdx,
}: {
  dersKey: string; sinif: number;
  konular: Record<string, KonuIstatistigi>;
  idx: number; setIdx: (i: number) => void;
}) {
  const liste: Unite[] = uniteler(sinif, dersKey);
  const [acik, setAcik] = useState(false);



  const unite = liste[Math.min(idx, liste.length - 1)];
  if (!unite) return null;
  const renk = dersRengi(dersKey);

  return (
    <div style={{ marginTop: 18 }}>
      <div className="bk-ist-unite-bas">
        <h3>Ünite</h3>
        <button className="bk-ist-unite-sec" onClick={() => setAcik(true)}>
          <span>{unite.title}</span>
          <span aria-hidden>▾</span>
        </button>
      </div>

      <div className="bk-ist-konular">
        {unite.topics.map((ham, i) => {
          const { baslik, testKey } = konuAyristir(ham);
          const st = konular[testKey];
          return (
            <div key={`${testKey}-${i}`} className="bk-bevel bk-ist-konu">
              <div className="bk-bevel-ic">
                <b>{i + 1}. {baslik}</b>
                <div className="bk-ist-konu-satir">
                  <span>Başarı: %{st ? st.basari : "—"}</span>
                  <span>Soru: {st ? st.soru : "—"}</span>
                  <span>Ort: {st ? st.ortSn : "—"}s</span>
                </div>
                <div className="bk-ist-konu-cubuk">
                  <i style={{ width: `${Math.max(0, Math.min(100, st?.basari ?? 0))}%`, background: renk }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {acik && (
        <Secim
          baslik="Ünite Seç"
          secenekler={liste.map((u, i) => ({ id: String(i), ad: u.title }))}
          secili={String(idx)}
          onSec={(id) => { setIdx(Number(id)); setAcik(false); }}
          onKapat={() => setAcik(false)}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- defter */

function DefterBolumu({ bilgi }: { bilgi: DefterKarti | null }) {
  const toplam = Math.max(1, bilgi?.toplam ?? 0);
  const bitti = Math.max(0, bilgi?.tamamlanan ?? 0);
  const devam = Math.max(0, (bilgi?.baslanan ?? 0) - bitti);
  const kalan = Math.max(0, toplam - bitti - devam);
  const bos = bitti === 0 && devam === 0;

  const quizToplam = bilgi?.quizToplam ?? 0;
  const quizBitti = Math.min(bilgi?.quizTamamlanan ?? 0, quizToplam);
  const quizKalan = Math.max(0, quizToplam - quizBitti);
  const quizYuzde = quizToplam > 0 ? Math.round((quizBitti / quizToplam) * 100) : 0;

  return (
    <div className="bk-bevel">
      <div className="bk-bevel-ic" style={{ display: "grid", gap: 14 }}>
        <div className="baslik" style={{ fontSize: 18 }}>Konu Defterim</div>

        <div style={{ display: "grid", gap: 6 }}>
          <div className="bk-ist-yigin">
            <i style={{ width: `${(bitti / toplam) * 100}%`, background: D_BITTI }} />
            <i style={{ width: `${(devam / toplam) * 100}%`, background: D_DEVAM }} />
            <i style={{ width: bos ? "100%" : `${(kalan / toplam) * 100}%`, background: D_KALAN }} />
          </div>
          <div className="bk-ist-nokta" style={{ gap: 0 }}>
            Tamamlandı: %{bilgi?.yuzde ?? 0}&nbsp;&nbsp;({bitti}/{bilgi?.toplam ?? 0})
          </div>
          <div className="bk-ist-notlar">
            <span className="bk-ist-nokta"><b style={{ background: D_BITTI }} />Bitti: {bitti}</span>
            <span className="bk-ist-nokta"><b style={{ background: D_DEVAM }} />Devamda: {devam}</span>
            <span className="bk-ist-nokta"><b style={{ background: D_KALAN }} />Kaldı: {kalan}</span>
          </div>
        </div>

        <div className="bk-ist-ayrac" />

        <div className="bk-ist-sutunlar">
          <div className="bk-ist-sutun">
            <b style={{ color: D_DEVAM }}>{bilgi?.baslanan ?? 0}</b><span>Başlandı</span>
          </div>
          <div className="bk-ist-sutun">
            <b style={{ color: D_BITTI }}>{bitti}</b><span>Bitti</span>
          </div>
          <div className="bk-ist-sutun">
            <b style={{ color: D_SAYFA }}>{bilgi?.okunanSayfa ?? 0}</b><span>Sayfa</span>
          </div>
        </div>

        {quizToplam > 0 && (
          <>
            <div className="bk-ist-ayrac" />
            <div style={{ display: "grid", gap: 8 }}>
              <div className="baslik" style={{ fontSize: 15 }}>Quiz</div>
              <div className="bk-ist-yigin ince">
                <i style={{ width: `${(quizBitti / quizToplam) * 100}%`, background: D_QUIZ }} />
                <i style={{ width: quizBitti === 0 ? "100%" : `${(quizKalan / quizToplam) * 100}%`, background: D_KALAN }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span className="bk-ist-nokta"><b style={{ background: D_QUIZ }} />Tamamlandı: {quizBitti}</span>
                <span className="bk-ist-nokta"><b style={{ background: D_KALAN }} />Kaldı: {quizKalan}</span>
                <span style={{ flex: 1 }} />
                <span className="bk-ist-nokta" style={{ color: D_QUIZ }}>%{quizYuzde}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- yazılı */

function YaziliBolumu({
  test, yazili, cubuklar, dersKey,
}: {
  test: TestIstatistigi | null; yazili: YaziliIstatistigi | null;
  cubuklar: Dilim[]; dersKey: string | null;
}) {
  const hazir = test?.hazirlananYazili ?? 0;
  // Hiç yazılı yoksa "—" satırları ve boş çubuklar yerine yönlendiren boş durum (Android 24 Eyl)
  if (hazir <= 0) {
    return (
      <div className="bk-bevel">
        <div className="bk-bevel-ic bk-ist-bos">
          <div className="simge" aria-hidden>📝</div>
          <h3>{dersKey ? "Bu derste henüz yazılıya hazırlanmadın" : "Henüz yazılıya hazırlanmadın"}</h3>
          <p>Yazılı çöz; başarı oranın ve ortalama süren burada görünsün.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="bk-bevel">
      <div className="bk-bevel-ic bk-ist-olcu">
        <div>Hazırlanan Yazılı Sayısı: {hazir}</div>
        <div>Başarı Oranı: %{yazili?.basariOrani ?? 0}</div>
        <div>Ortalama Süre: {sureMetni(yazili?.ortalamaSaniye ?? 0)}</div>

        {!dersKey && cubuklar.length > 0 && (
          <>
            <div>Derslere Göre Başarı</div>
            <div className="bk-bevel" style={{ borderRadius: 18 }}>
              <div className="bk-bevel-ic" style={{ padding: 14 }}>
                <div className="bk-ist-sutunlu">
                  {cubuklar.map((c) => (
                    <div key={c.id}>
                      <div className="bk-ist-dik">
                        <i style={{ height: `${Math.max(0, Math.min(100, c.oran))}%`, background: c.renk }} />
                      </div>
                      <span>%{c.oran}</span>
                      <span style={{ opacity: .9 }}>{c.etiket}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- ortak */

/** Seçim penceresi — uygulamadaki alt sayfanın (sheet) web karşılığı. */
function Secim({
  baslik, secenekler, secili, onSec, onKapat,
}: {
  baslik: string;
  secenekler: { id: string; ad: string }[];
  secili: string;
  onSec: (id: string) => void;
  onKapat: () => void;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onKapat(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onKapat]);

  return (
    <div className="bk-ist-ortu" onClick={onKapat}>
      <div className="bk-ist-secim" onClick={(e) => e.stopPropagation()}>
        <h3>{baslik}</h3>
        {secenekler.map((s) => (
          <button
            key={s.id}
            className="bk-ist-secenek"
            data-secili={s.id === secili}
            onClick={() => onSec(s.id)}
          >
            <span>{s.ad}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Android StatsScreen: ThreeDotLoader(10dp, 8dp). Eskiden sabit üç nokta — kıpırdamıyordu.
function Noktalar() {
  return <UcNokta style={{ paddingTop: 48 }} />;
}

/** 0→1 easeOut dolum (uygulamada TimelineView ile kare kare sürülüyor). */
function useDolum(anahtar: string, sure: number): number {
  const [p, setP] = useState(0);
  const kare = useRef(0);
  useEffect(() => {
    // setState'ler effect gövdesinde değil, animasyon karesinde (react-hooks/set-state-in-effect)
    const azHareket = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const bas = performance.now();
    const dur = () => {
      if (azHareket) { setP(1); return; }
      const t = Math.min(1, (performance.now() - bas) / sure);
      setP(1 - (1 - t) * (1 - t));
      if (t < 1) kare.current = requestAnimationFrame(dur);
    };
    kare.current = requestAnimationFrame(dur);
    return () => cancelAnimationFrame(kare.current);
  }, [anahtar, sure]);
  return p;
}

/** iOS formatAvgSecs — "m:ss". */
function sureMetni(saniye: number): string {
  const t = Math.max(0, Math.round(saniye));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}
