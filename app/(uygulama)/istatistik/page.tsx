"use client";

// İstatistik — uygulamadaki StatsScreen'in web karşılığı (iOS: StatsScreen.swift).
// Görsel dil birebir porttur: renkli başlık bandı (sekmeye göre renk değişir) + kayan
// sarı çizgi, ders seçme düğmesi + seçim penceresi, bevel kartlar, 190px animasyonlu
// halka + kapsül lejant, defterde yığılmış çubuk ve Quiz şeridi, yazılıda dikey
// sütun grafiği, tek ders seçiliyken ünite seçici + konu konu kartlar.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Kabuk from "../Kabuk";
import { useOturum } from "../../lib/oturum";
import { konuAyristir, uniteler, type Unite } from "../../lib/katalog";
import {
  defterKartBilgisi,
  dersRengi,
  istatistikDilimleri,
  konuIstatistikleri,
  testIstatistigi,
  yaziliDersCubuklari,
  yaziliIstatistigi,
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

const BOLUMLER = ["Konu Testleri", "Konu Defterleri", "Yazılılar"] as const;

/* Defter kartı renkleri — iOS DefterStatsCard */
const D_BITTI = "#5DD67C";
const D_DEVAM = "#FFB93C";
const D_KALAN = "#3A3A5C";
const D_QUIZ = "#6C63FF";
const D_SAYFA = "#9AD7FF";

export default function IstatistikSayfasi() {
  return (
    <Kabuk>
      <Icerik />
    </Kabuk>
  );
}

function Icerik() {
  const { kullanici, sinif } = useOturum();
  const [bolum, setBolum] = useState(0);
  const [ders, setDers] = useState<string | null>(null);
  const [secimAcik, setSecimAcik] = useState(false);

  const [test, setTest] = useState<TestIstatistigi | null>(null);
  const [dilimler, setDilimler] = useState<Dilim[]>([]);
  const [defter, setDefter] = useState<DefterKarti | null>(null);
  const [yazili, setYazili] = useState<YaziliIstatistigi | null>(null);
  const [cubuklar, setCubuklar] = useState<Dilim[]>([]);
  const [konular, setKonular] = useState<Record<string, KonuIstatistigi>>({});
  // Seçili ünite de burada duruyor: sekme değişince sıfırlanmasın.
  const [uniteIdx, setUniteIdx] = useState(0);
  const [yukleniyor, setYukleniyor] = useState(true);

  // Bağımlılık User NESNESİ değil uid: Firebase jetonu yenilendiğinde onAuthStateChanged
  // yeniden tetikleniyor ve nesne kimliği değişince bütün istatistik yeniden okunuyordu.
  const uid = kullanici?.uid ?? null;

  // Ders ya da sınıf değişince ünite seçimi başa döner (eskiden alt bileşenin
  // kendi effect'i yapıyordu; seçim yukarı taşınınca burada yapılması gerekiyor).
  useEffect(() => { setUniteIdx(0); }, [ders, sinif]);

  useEffect(() => {
    if (!uid) { setYukleniyor(false); return; }
    let iptal = false;
    setYukleniyor(true);
    (async () => {
      const [t, d, df, y, c, k] = await Promise.all([
        testIstatistigi(uid, sinif, ders),
        istatistikDilimleri(uid, sinif, ders),
        defterKartBilgisi(uid, sinif, ders, (dk) => uniteler(sinif, dk).length),
        yaziliIstatistigi(uid, sinif, ders),
        yaziliDersCubuklari(uid, sinif),
        // Ünite/konu kırılımı da BURADA okunuyor: eskiden alt bileşenin kendi
        // useEffect'indeydi ve sekme değişince bileşen söküldüğü için her dönüşte
        // yeniden çekiliyordu.
        ders ? konuIstatistikleri(uid, sinif, ders) : Promise.resolve({}),
      ]);
      if (iptal) return;
      setTest(t); setDilimler(d); setDefter(df); setYazili(y); setCubuklar(c); setKonular(k);
      setYukleniyor(false);
    })().catch(() => { if (!iptal) setYukleniyor(false); });
    return () => { iptal = true; };
  }, [uid, sinif, ders]);

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

  let imlec = -90;
  const yaylar = dolu.map((d) => {
    const aci = kullanilabilir * (d.soru / toplam) * p;
    const bas = imlec;
    imlec += aci + bosluk;
    return { d, bas, aci };
  });

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
  const var_ = hazir > 0;
  return (
    <div className="bk-bevel">
      <div className="bk-bevel-ic bk-ist-olcu">
        <div>Hazırlanan Yazılı Sayısı: {hazir}</div>
        <div>Başarı Oranı: {var_ ? `%${yazili?.basariOrani ?? 0}` : "—"}</div>
        <div>Ortalama Süre: {var_ ? sureMetni(yazili?.ortalamaSaniye ?? 0) : "—"}</div>

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

function Noktalar() {
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", paddingTop: 48 }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: 10, height: 10, borderRadius: 999, background: "rgba(255,255,255,.6)" }} />
      ))}
    </div>
  );
}

/** 0→1 easeOut dolum (uygulamada TimelineView ile kare kare sürülüyor). */
function useDolum(anahtar: string, sure: number): number {
  const [p, setP] = useState(0);
  const kare = useRef(0);
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setP(1);
      return;
    }
    const bas = performance.now();
    const dur = () => {
      const t = Math.min(1, (performance.now() - bas) / sure);
      setP(1 - (1 - t) * (1 - t));
      if (t < 1) kare.current = requestAnimationFrame(dur);
    };
    setP(0);
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
