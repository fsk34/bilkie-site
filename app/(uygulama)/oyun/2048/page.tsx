"use client";

// 2048 — uygulamadaki TwentyFortyEightScreen'in web karşılığı (Android: Game2048Screen).
// Oyun mantığı (birleştirme, yeni taş, bitiş kontrolü) ve renkler iOS kaynağından
// birebir alındı. Tam ekrandır: kabuğun (sol menü + sağ ray) dışında açılır.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useOturum } from "../../../lib/oturum";
import { enIyiSkorOku, enIyiSkorYaz } from "../../../lib/veri";
import { sesCal } from "../../ses";
import Reklam from "../Reklam";

const N = 4;

type Tas = { id: number; deger: number; satir: number; sutun: number; yeni: boolean; birlesme: number };
type Yon = "sol" | "sag" | "yukari" | "asagi";

/** Taş renkleri — özgün 2048 paleti, uygulamadaki t2048TileColor ile aynı. */
const RENK: Record<number, string> = {
  2: "#EEE4DA", 4: "#EDE0C8", 8: "#F2B179", 16: "#F59563", 32: "#F67C5F", 64: "#F65E3B",
  128: "#EDCF72", 256: "#EDCC61", 512: "#EDC850", 1024: "#EDC53F", 2048: "#EDC22E",
};
const tasRengi = (v: number) => RENK[v] ?? "#3C3A32";
const yaziRengi = (v: number) => (v <= 4 ? "#776E65" : "#FFFFFF");
/** Uygulamada 26 / 22 / 18 punto; web'de göz boyutuna oranlanır (77.5px göze göre). */
const yaziOrani = (v: number) => (v >= 1024 ? 0.232 : v >= 128 ? 0.284 : 0.335);

let sonrakiId = 0;

function rastgeleTasEkle(taslar: Tas[]): Tas[] {
  const dolu = new Set(taslar.map((t) => `${t.satir},${t.sutun}`));
  const bos: [number, number][] = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!dolu.has(`${r},${c}`)) bos.push([r, c]);
  if (bos.length === 0) return taslar;
  const [r, c] = bos[Math.floor(Math.random() * bos.length)];
  sonrakiId += 1;
  return [...taslar, { id: sonrakiId, deger: Math.random() < 0.9 ? 2 : 4, satir: r, sutun: c, yeni: true, birlesme: 0 }];
}

const yeniTaslar = () => rastgeleTasEkle(rastgeleTasEkle([]));

/** Uygulamadaki t2048ComputeMove'un birebir karşılığı. */
function hamleHesapla(taslar: Tas[], yon: Yon): [Tas[], number] {
  const harita = new Map<string, Tas>();
  for (const t of taslar) harita.set(`${t.satir},${t.sutun}`, t);

  const cikti: Tas[] = [];
  let puan = 0;

  for (let hat = 0; hat < N; hat++) {
    const dizi = [...Array(N).keys()];
    const koordinatlar: [number, number][] =
      yon === "sol" ? dizi.map((i) => [hat, i])
      : yon === "sag" ? [...dizi].reverse().map((i) => [hat, i])
      : yon === "yukari" ? dizi.map((i) => [i, hat])
      : [...dizi].reverse().map((i) => [i, hat]);

    const hatTaslari = koordinatlar
      .map(([r, c]) => harita.get(`${r},${c}`))
      .filter((t): t is Tas => t !== undefined);

    let hedefIdx = 0;
    let i = 0;
    while (i < hatTaslari.length) {
      const [hr, hc] = koordinatlar[hedefIdx];
      const a = hatTaslari[i];
      const b = hatTaslari[i + 1];
      if (b && a.deger === b.deger) {
        const deger = a.deger * 2;
        puan += deger;
        cikti.push({ id: a.id, deger, satir: hr, sutun: hc, yeni: false, birlesme: a.birlesme + 1 });
        i += 2;
      } else {
        cikti.push({ id: a.id, deger: a.deger, satir: hr, sutun: hc, yeni: false, birlesme: a.birlesme });
        i += 1;
      }
      hedefIdx += 1;
    }
  }
  return [cikti, puan];
}

function hamleVarMi(taslar: Tas[]): boolean {
  const izgara = Array.from({ length: N }, () => Array<number>(N).fill(0));
  for (const t of taslar) izgara[t.satir][t.sutun] = t.deger;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (izgara[r][c] === 0) return true;
      if (c + 1 < N && izgara[r][c] === izgara[r][c + 1]) return true;
      if (r + 1 < N && izgara[r][c] === izgara[r + 1][c]) return true;
    }
  }
  return false;
}

function degistiMi(eski: Tas[], yeni: Tas[]): boolean {
  if (eski.length !== yeni.length) return true;
  const harita = new Map(eski.map((t) => [t.id, `${t.satir},${t.sutun}`]));
  return yeni.some((t) => harita.get(t.id) !== `${t.satir},${t.sutun}`);
}

export default function Oyun2048() {
  const router = useRouter();
  const { kullanici } = useOturum();

  // ⚠️ Taşlar rastgele üretiliyor: sunucuda üretilirse hydration uyuşmazlığı olur.
  // Bu yüzden boş başlar, ilk çizimden sonra kurulur.
  const [taslar, setTaslar] = useState<Tas[]>([]);
  const [skor, setSkor] = useState(0);
  const [enIyi, setEnIyi] = useState(0);
  const [kazandi, setKazandi] = useState(false);
  const [bitti, setBitti] = useState(false);
  const [devam, setDevam] = useState(false);
  const [cikisSor, setCikisSor] = useState(false);

  const tahtaRef = useRef<HTMLDivElement>(null);
  const basim = useRef<{ x: number; y: number } | null>(null);

  // ⚠️ Güncel değerler ref'te tutuluyor: setState GÜNCELLEYİCİSİNİN İÇİNDE yan etki
  // (ses, başka setState, Firebase yazma) olmamalı — React geliştirme kipinde
  // güncelleyiciyi iki kez çağırıp etkiyi ikiye katlıyor.
  const taslarRef = useRef<Tas[]>([]);
  const skorRef = useRef(0);
  const enIyiRef = useRef(0);
  useEffect(() => { taslarRef.current = taslar; }, [taslar]);
  useEffect(() => { skorRef.current = skor; }, [skor]);
  useEffect(() => { enIyiRef.current = enIyi; }, [enIyi]);

  useEffect(() => {
    sonrakiId = 0;
    const baslangic = yeniTaslar();
    taslarRef.current = baslangic;
    setTaslar(baslangic);
  }, []);

  useEffect(() => {
    if (!kullanici) return;
    let iptal = false;
    enIyiSkorOku(kullanici.uid, "game2048")
      .then((v) => { if (!iptal) { enIyiRef.current = v; setEnIyi(v); } })
      .catch(() => {});
    return () => { iptal = true; };
  }, [kullanici]);

  const cik = useCallback(() => router.push("/oyunlar"), [router]);

  const yeniOyun = useCallback(() => {
    sonrakiId = 0;
    const baslangic = yeniTaslar();
    taslarRef.current = baslangic;
    skorRef.current = 0;
    setTaslar(baslangic);
    setSkor(0); setKazandi(false); setBitti(false); setDevam(false);
  }, []);

  const hamle = useCallback((yon: Yon) => {
    const oncekiler = taslarRef.current;
    const [sonrakiler, kazanilan] = hamleHesapla(oncekiler, yon);
    if (!degistiMi(oncekiler, sonrakiler)) return;

    // Uygulamada: birleşme olduysa pop, yoksa kaydırma sesi
    sesCal(kazanilan > 0 ? "t2048_pop" : "t2048_kaydirma", 0.5);

    const eklenmis = rastgeleTasEkle(sonrakiler);
    taslarRef.current = eklenmis;
    setTaslar(eklenmis);

    const yeniSkor = skorRef.current + kazanilan;
    skorRef.current = yeniSkor;
    setSkor(yeniSkor);
    if (yeniSkor > enIyiRef.current) {
      enIyiRef.current = yeniSkor;
      setEnIyi(yeniSkor);
      if (kullanici) void enIyiSkorYaz(kullanici.uid, "game2048", yeniSkor).catch(() => {});
    }

    if (eklenmis.some((t) => t.deger === 2048)) setKazandi(true);
    if (!hamleVarMi(eklenmis)) setBitti(true);
  }, [kullanici]);

  const kilitli = bitti || (kazandi && !devam);

  useEffect(() => {
    const tus = (e: KeyboardEvent) => {
      if (cikisSor) { if (e.key === "Escape") setCikisSor(false); return; }
      if (kilitli) return;
      const yon: Record<string, Yon> = {
        ArrowLeft: "sol", ArrowRight: "sag", ArrowUp: "yukari", ArrowDown: "asagi",
      };
      const y = yon[e.key];
      if (!y) return;
      e.preventDefault();
      hamle(y);
    };
    window.addEventListener("keydown", tus);
    return () => window.removeEventListener("keydown", tus);
  }, [hamle, kilitli, cikisSor]);

  const basildi = (e: React.PointerEvent) => { basim.current = { x: e.clientX, y: e.clientY }; };
  const birakildi = (e: React.PointerEvent) => {
    const b = basim.current;
    basim.current = null;
    if (!b || kilitli) return;
    const dx = e.clientX - b.x;
    const dy = e.clientY - b.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 40) return;   // uygulamadaki minimumDistance
    hamle(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "sag" : "sol") : (dy > 0 ? "asagi" : "yukari"));
  };

  return (
    <div className="bk">
      <div className="bk-oyun-sahne">
        <div className="bk-oyun-ust">
          <button
            className="bk-oyun-geri"
            aria-label="Geri"
            onClick={() => (kilitli ? cik() : setCikisSor(true))}
          >
            ‹
          </button>
          <div className="bk-oyun-ad">2048</div>
          <button className="bk-oyun-yeni" onClick={yeniOyun}>Yeni</button>
        </div>

        <div className="bk-oyun-skorlar">
          <div className="bk-oyun-skor"><span>SKOR</span><b>{skor}</b></div>
          <div className="bk-oyun-skor"><span>EN İYİ</span><b>{enIyi}</b></div>
        </div>

        <div
          ref={tahtaRef}
          className="bk-t2048"
          onPointerDown={basildi}
          onPointerUp={birakildi}
        >
          {Array.from({ length: N * N }, (_, i) => (
            <div
              key={i}
              className="bk-t2048-goz"
              style={goze(Math.floor(i / N), i % N)}
            />
          ))}
          {taslar.map((t) => <TasGorunumu key={t.id} tas={t} />)}
        </div>

        <p className="bk-oyun-ipucu">
          Kaydırarak ya da yön tuşlarıyla aynı sayıları birleştir
        </p>


        {/* Banner — uygulamada da bu ekranın en altında (Game2048Screen) */}

        <Reklam />
      </div>

      {kazandi && !devam && (
        <div className="bk-oyun-ortu">
          <div className="govde">
            <div style={{ fontSize: 48, fontWeight: 700, color: "#EDC22E" }} className="baslik">2048!</div>
            <div style={{ fontSize: 22 }} className="baslik">Tebrikler!</div>
            <div className="bk-oyun-dugmeler">
              <button className="bk-oyun-dugme" onClick={yeniOyun}>Yeni Oyun</button>
              <button className="bk-oyun-dugme sari" onClick={() => setDevam(true)}>Devam Et</button>
            </div>
          </div>
        </div>
      )}

      {bitti && (
        <div className="bk-oyun-ortu">
          <div className="govde">
            <div style={{ fontSize: 32, fontWeight: 700 }} className="baslik">OYUN BİTTİ</div>
            <div style={{ fontSize: 20, color: "#EDC22E" }} className="baslik">Skor: {skor}</div>
            <div className="bk-oyun-dugmeler">
              <button className="bk-oyun-dugme beyaz" onClick={yeniOyun}>Tekrar Oyna</button>
            </div>
          </div>
        </div>
      )}

      {cikisSor && (
        <div className="bk-oyun-ortu hafif" onClick={() => setCikisSor(false)}>
          <div className="bk-oyun-onay" onClick={(e) => e.stopPropagation()}>
            <div className="sor">Çıkmak istiyor musun?</div>
            <div className="not">İlerleme kaydedilmeyecek.</div>
            <div className="ikili">
              <button className="hayir" onClick={() => setCikisSor(false)}>Hayır</button>
              <button className="evet" onClick={cik}>Evet, Çık</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Gözün/taşın tahta içindeki yeri — ölçüler CSS değişkenlerinden gelir (dolgu 8, aralık 8). */
function goze(satir: number, sutun: number): React.CSSProperties {
  return {
    width: "var(--goz)",
    height: "var(--goz)",
    left: `calc(8px + ${sutun} * var(--adim))`,
    top: `calc(8px + ${satir} * var(--adim))`,
  };
}

function TasGorunumu({ tas }: { tas: Tas }) {
  const ref = useRef<HTMLDivElement>(null);
  const ilk = useRef(true);

  // Birleşme "pop"u — uygulamadaki mergeGen değişimindeki yay animasyonu.
  useEffect(() => {
    if (ilk.current) { ilk.current = false; return; }
    ref.current?.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.18)" }, { transform: "scale(1)" }],
      { duration: 300, easing: "cubic-bezier(.2,1.5,.4,1)" }
    );
  }, [tas.birlesme]);

  return (
    <div
      ref={ref}
      className="bk-t2048-tas"
      data-yeni={tas.yeni}
      style={{
        ...goze(tas.satir, tas.sutun),
        background: tasRengi(tas.deger),
        color: yaziRengi(tas.deger),
        fontSize: `calc(var(--goz) * ${yaziOrani(tas.deger)})`,
      }}
    >
      {tas.deger}
    </div>
  );
}
