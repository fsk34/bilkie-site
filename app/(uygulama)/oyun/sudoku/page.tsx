"use client";

// Sudoku — Android `SudokuScreen.kt` portu. Zorluk seçimi → 10 bölüm → oyun.
// Puanlama, hata hakkı (3 kalp), not kipi, geri al, ipucu ve yıldız eşikleri birebir.
//
// İki bilinçli fark (web'de karşılığı olmayan şeyler):
//  1. Uygulamada günlük ipucu bitince "reklam izle" seçeneği çıkıyor; web'de reklam yok,
//     onun yerine hakkın yarın yenileneceğini söyleyen bir bilgi penceresi var.
//  2. Web'de FİZİKSEL KLAVYE de çalışıyor: 1-9 yazar, Backspace/Delete siler,
//     yön tuşları seçimi gezdirir, N not kipini açar/kapatır.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Lottie from "../../Lottie";
import { useOturum } from "../../../lib/oturum";
import Reklam from "../Reklam";
import {
  SUDOKU_BOLUM_SAYISI,
  sudokuBulmaca,
  sudokuIlerlemeYaz,
  sudokuIlerlemesi,
  type SudokuBulmaca,
  type SudokuZorluk,
} from "../../../lib/veri";

const ZORLUKLAR: { key: SudokuZorluk; ad: string; alt: string; renk: string }[] = [
  { key: "easy", ad: "Kolay", alt: "45 dolu hücre", renk: "#1DB954" },
  { key: "medium", ad: "Orta", alt: "35 dolu hücre", renk: "#FF9500" },
  { key: "hard", ad: "Zor", alt: "29 dolu hücre", renk: "#FF3B30" },
];

/** Puan sabitleri — Android cellPoints/errorPenalty/hintPenalty/maxScore. */
const gozPuani = (z: string) => (z === "easy" ? 20 : z === "medium" ? 30 : 40);
const hataCezasi = (z: string) => (z === "easy" ? 50 : z === "medium" ? 75 : 100);
const ipucuCezasi = (z: string) => (z === "easy" ? 30 : z === "medium" ? 50 : 70);
const enYuksekPuan = (z: string) => (z === "easy" ? 36 : z === "medium" ? 46 : 52) * gozPuani(z);
const yildizlar = (puan: number, z: string) =>
  puan >= enYuksekPuan(z) * 0.85 ? 3 : puan >= enYuksekPuan(z) * 0.5 ? 2 : puan > 0 ? 1 : 0;

const sureMetni = (sn: number) =>
  `${String(Math.floor(sn / 60)).padStart(2, "0")}:${String(sn % 60).padStart(2, "0")}`;

type Hamle = {
  r: number; c: number; oncekiDeger: number; oncekiNotlar: number[];
  oncekiHatali: string[]; kazanilanPuan: number;
};

export default function Sudoku() {
  const router = useRouter();
  const { kullanici, yukleniyor } = useOturum();
  const [asama, setAsama] = useState<"secim" | "yukleniyor" | "oyun">("secim");
  const [zorluk, setZorluk] = useState<SudokuZorluk>("easy");
  const [bulmaca, setBulmaca] = useState<SudokuBulmaca | null>(null);
  const [bolum, setBolum] = useState(1);
  const [ilerleme, setIlerleme] = useState<Record<SudokuZorluk, number>>({ easy: 1, medium: 1, hard: 1 });

  useEffect(() => {
    if (!kullanici) return;
    let iptal = false;
    sudokuIlerlemesi(kullanici.uid)
      .then((v) => { if (!iptal) setIlerleme(v); })
      .catch(() => {});
    return () => { iptal = true; };
  }, [kullanici]);

  const cik = useCallback(() => router.push("/oyunlar"), [router]);

  const yukle = useCallback((z: SudokuZorluk, idx: number) => {
    setZorluk(z); setBolum(idx); setAsama("yukleniyor");
    sudokuBulmaca(z, idx)
      .then((b) => { setBulmaca(b); setAsama(b ? "oyun" : "secim"); })
      .catch(() => setAsama("secim"));
  }, []);

  const sec = useCallback((z: SudokuZorluk) => {
    const seviye = ilerleme[z];
    if (seviye > SUDOKU_BOLUM_SAYISI) {
      setIlerleme((p) => ({ ...p, [z]: 1 }));
      if (kullanici) void sudokuIlerlemeYaz(kullanici.uid, z, 1).catch(() => {});
      yukle(z, 1);
    } else {
      yukle(z, Math.min(SUDOKU_BOLUM_SAYISI, seviye));
    }
  }, [ilerleme, kullanici, yukle]);

  /** Bölüm kazanılınca ilerlemeyi bir artır (uygulamadaki saveProgress). */
  const kazanildi = useCallback(() => {
    const sonraki = ilerleme[zorluk] + 1;
    setIlerleme((p) => ({ ...p, [zorluk]: sonraki }));
    if (kullanici) void sudokuIlerlemeYaz(kullanici.uid, zorluk, sonraki).catch(() => {});
  }, [ilerleme, zorluk, kullanici]);

  const sonrakiBolum = useCallback(() => {
    const simdiki = ilerleme[zorluk];
    if (simdiki <= SUDOKU_BOLUM_SAYISI) yukle(zorluk, simdiki);
    else setAsama("secim");
  }, [ilerleme, zorluk, yukle]);

  if (yukleniyor) return <div className="bk"><div className="bk-sdk-secim" /></div>;

  if (!kullanici) {
    return (
      <div className="bk">
        <div className="bk-sdk-secim">
          <div className="bk-sdk-ust-secim">
            <button className="bk-wl-geri duz" aria-label="Geri" onClick={cik}>←</button>
            <b>Sudoku</b>
            <span style={{ width: 40 }} />
          </div>
          <p className="bk-soluk" style={{ marginTop: 40, fontSize: 14, textAlign: "center" }}>
            Bölümlerin hesabınla saklanıyor. Oynamak için giriş yapman gerekiyor.
          </p>
          <Link className="bk-dugme" href="/giris" style={{ marginTop: 18 }}>Giriş yap</Link>
        </div>
      </div>
    );
  }

  if (asama === "oyun" && bulmaca) {
    return (
      <Oyun
        key={`${zorluk}-${bolum}`}
        bulmaca={bulmaca}
        zorluk={zorluk}
        bolum={bolum}
        sonBolumMu={bolum >= SUDOKU_BOLUM_SAYISI}
        onCik={() => setAsama("secim")}
        onTekrar={() => yukle(zorluk, bolum)}
        onKazandi={kazanildi}
        onBolumBitti={sonrakiBolum}
      />
    );
  }

  return (
    <div className="bk">
      <div className="bk-sdk-secim">
        <div className="bk-sdk-ust-secim">
          <button className="bk-wl-geri duz" aria-label="Geri" onClick={cik}>←</button>
          <b>Sudoku</b>
          <span style={{ width: 40 }} />
        </div>

        {asama === "yukleniyor" ? (
          <p className="bk-wl-not" style={{ marginTop: 60 }}>Yükleniyor...</p>
        ) : (
          <>
            <p className="bk-sdk-alt">Zorluk Seçin</p>
            <div className="bk-sdk-kartlar">
              {ZORLUKLAR.map((z) => {
                const seviye = ilerleme[z.key];
                const tamamlanan = Math.min(SUDOKU_BOLUM_SAYISI, Math.max(0, seviye - 1));
                const hepsiBitti = seviye > SUDOKU_BOLUM_SAYISI;
                return (
                  <button
                    key={z.key}
                    className="bk-sdk-kart"
                    style={{ borderColor: `${z.renk}4D` }}
                    onClick={() => sec(z.key)}
                  >
                    <div className="ust">
                      <span className="amblem" style={{ background: `${z.renk}26` }}>
                        <MiniIzgara renk={z.renk} />
                      </span>
                      <span className="metin">
                        <b>{z.ad}</b>
                        <i style={{ color: hepsiBitti ? z.renk : "#6670AA" }}>
                          {hepsiBitti ? "Tekrardan Başla" : z.alt}
                        </i>
                      </span>
                      <span className="sayac" style={{ color: hepsiBitti ? z.renk : "#6670AA" }}>
                        {hepsiBitti ? "✓" : `${tamamlanan} / ${SUDOKU_BOLUM_SAYISI}`}
                      </span>
                    </div>
                    <span className="cubuk" style={{ background: `${z.renk}26` }}>
                      <i style={{ width: `${(tamamlanan / SUDOKU_BOLUM_SAYISI) * 100}%`, background: z.renk }} />
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MiniIzgara({ renk }: { renk: string }) {
  return (
    <svg width={32} height={32} viewBox="0 0 32 32" aria-hidden>
      {[1, 2].map((i) => (
        <g key={i} stroke={renk} strokeOpacity={0.5} strokeWidth={1}>
          <line x1={(i * 32) / 3} y1={0} x2={(i * 32) / 3} y2={32} />
          <line x1={0} y1={(i * 32) / 3} x2={32} y2={(i * 32) / 3} />
        </g>
      ))}
      <rect x={1} y={1} width={30} height={30} fill="none" stroke={renk} strokeWidth={2} />
    </svg>
  );
}

/* ------------------------------------------------------------------ oyun */

const IPUCU_ANAHTAR = "bk-sudoku-ipucu";

/** Günlük ücretsiz ipucu — uygulamada SharedPreferences, web'de localStorage. */
function ucretsizIpucuVarMi(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const ham = window.localStorage.getItem(IPUCU_ANAHTAR);
    if (!ham) return true;
    const { gun, kullanildi } = JSON.parse(ham) as { gun: string; kullanildi: boolean };
    return gun !== bugunAnahtari() || !kullanildi;
  } catch {
    return true;
  }
}

function ipucuKullanildiYaz(): void {
  try {
    window.localStorage.setItem(IPUCU_ANAHTAR, JSON.stringify({ gun: bugunAnahtari(), kullanildi: true }));
  } catch { /* özel kip — ipucu her açılışta yenilenir, sorun değil */ }
}

const bugunAnahtari = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Istanbul" }).format(new Date());

function Oyun({
  bulmaca, zorluk, bolum, sonBolumMu, onCik, onTekrar, onKazandi, onBolumBitti,
}: {
  bulmaca: SudokuBulmaca; zorluk: SudokuZorluk; bolum: number; sonBolumMu: boolean;
  onCik: () => void; onTekrar: () => void; onKazandi: () => void; onBolumBitti: () => void;
}) {
  const [tahta, setTahta] = useState<number[][]>(() => bulmaca.bulmaca.map((s) => [...s]));
  const [notlar, setNotlar] = useState<Record<string, number[]>>({});
  const [gecmis, setGecmis] = useState<Hamle[]>([]);
  const [secili, setSecili] = useState<[number, number] | null>(null);
  const [hata, setHata] = useState(0);
  const [hataliGozler, setHataliGozler] = useState<string[]>([]);
  const [notKipi, setNotKipi] = useState(false);
  const [bitti, setBitti] = useState(false);
  const [kazandi, setKazandi] = useState(false);
  const [saniye, setSaniye] = useState(0);
  const [puan, setPuan] = useState(0);
  const [bildirim, setBildirim] = useState<string | null>(null);
  const [cikisSor, setCikisSor] = useState(false);
  const [ipucuUyarisi, setIpucuUyarisi] = useState(false);
  const [ucretsizIpucu, setUcretsizIpucu] = useState(false);
  const [gorunenYildiz, setGorunenYildiz] = useState(0);
  const bildirimZaman = useRef(0);

  useEffect(() => { setUcretsizIpucu(ucretsizIpucuVarMi()); }, []);

  const verilenGozler = useMemo(() => {
    const küme = new Set<string>();
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (bulmaca.bulmaca[r][c] !== 0) küme.add(`${r},${c}`);
    return küme;
  }, [bulmaca]);

  // Sayaç — oyun sürerken saniye başı
  useEffect(() => {
    if (bitti || kazandi) return;
    const z = window.setInterval(() => setSaniye((s) => s + 1), 1000);
    return () => window.clearInterval(z);
  }, [bitti, kazandi]);

  // Kazanınca ilerlemeyi kaydet + yıldızları sırayla aç
  useEffect(() => {
    if (!kazandi) return;
    onKazandi();
    const zamanlar = [1, 2, 3].map((i) =>
      window.setTimeout(() => setGorunenYildiz(i), 350 + i * 280)
    );
    return () => zamanlar.forEach(window.clearTimeout);
    // onKazandi her çizimde yeniden üretilebilir; yalnız kazanma anında çalışsın
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kazandi]);

  const bildir = useCallback((mesaj: string) => {
    window.clearTimeout(bildirimZaman.current);
    setBildirim(mesaj);
    bildirimZaman.current = window.setTimeout(() => setBildirim(null), 2200);
  }, []);

  const kazandiMi = useCallback(
    (t: number[][]) => t.every((satir, r) => satir.every((v, c) => v === bulmaca.cozum[r][c])),
    [bulmaca]
  );

  const sayiGir = useCallback((n: number) => {
    if (!secili || bitti || kazandi) return;
    const [r, c] = secili;
    const anahtar = `${r},${c}`;
    if (verilenGozler.has(anahtar)) return;

    if (notKipi) {
      if (tahta[r][c] !== 0) return;
      const onceki = notlar[anahtar] ?? [];
      const yeni = onceki.includes(n) ? onceki.filter((x) => x !== n) : [...onceki, n].sort();
      setNotlar({ ...notlar, [anahtar]: yeni });
      setGecmis([...gecmis, { r, c, oncekiDeger: tahta[r][c], oncekiNotlar: onceki, oncekiHatali: hataliGozler, kazanilanPuan: 0 }]);
      return;
    }

    // Doğru çözülmüş hücre değiştirilemez
    if (tahta[r][c] !== 0 && tahta[r][c] === bulmaca.cozum[r][c]) return;

    const oncekiDeger = tahta[r][c];
    const oncekiNotlar = notlar[anahtar] ?? [];
    const oncekiHatali = hataliGozler;

    const yeniTahta = tahta.map((s) => [...s]);
    yeniTahta[r][c] = n;
    const yeniNotlar = { ...notlar };
    delete yeniNotlar[anahtar];
    setTahta(yeniTahta);
    setNotlar(yeniNotlar);

    if (n === bulmaca.cozum[r][c]) {
      const p = gozPuani(zorluk);
      setPuan((x) => x + p);
      setHataliGozler(hataliGozler.filter((k) => k !== anahtar));
      setGecmis([...gecmis, { r, c, oncekiDeger, oncekiNotlar, oncekiHatali, kazanilanPuan: p }]);
      if (kazandiMi(yeniTahta)) setKazandi(true);
    } else {
      setPuan((x) => Math.max(0, x - hataCezasi(zorluk)));
      const yeniHata = hata + 1;
      setHata(yeniHata);
      if (!hataliGozler.includes(anahtar)) setHataliGozler([...hataliGozler, anahtar]);
      setGecmis([...gecmis, { r, c, oncekiDeger, oncekiNotlar, oncekiHatali, kazanilanPuan: 0 }]);
      if (yeniHata >= 3) setBitti(true);
    }
  }, [secili, bitti, kazandi, verilenGozler, notKipi, tahta, notlar, gecmis, hataliGozler, bulmaca, zorluk, hata, kazandiMi]);

  const sil = useCallback(() => {
    if (!secili) return;
    const [r, c] = secili;
    const anahtar = `${r},${c}`;
    if (verilenGozler.has(anahtar)) { bildir("Önceden doldurulmuş bir hücre silinemez"); return; }
    if (tahta[r][c] !== 0 && tahta[r][c] === bulmaca.cozum[r][c]) { bildir("Çözümlenen hücre silinemez"); return; }
    if (tahta[r][c] !== 0) {
      const yeni = tahta.map((s) => [...s]);
      setGecmis([...gecmis, { r, c, oncekiDeger: tahta[r][c], oncekiNotlar: [], oncekiHatali: hataliGozler, kazanilanPuan: 0 }]);
      yeni[r][c] = 0;
      setTahta(yeni);
      setHataliGozler(hataliGozler.filter((k) => k !== anahtar));
      return;
    }
    if (notlar[anahtar]?.length) {
      setGecmis([...gecmis, { r, c, oncekiDeger: 0, oncekiNotlar: notlar[anahtar], oncekiHatali: hataliGozler, kazanilanPuan: 0 }]);
      const yeni = { ...notlar };
      delete yeni[anahtar];
      setNotlar(yeni);
    }
  }, [secili, verilenGozler, tahta, bulmaca, notlar, gecmis, hataliGozler, bildir]);

  const geriAl = useCallback(() => {
    const son = gecmis[gecmis.length - 1];
    if (!son) return;
    const yeniTahta = tahta.map((s) => [...s]);
    yeniTahta[son.r][son.c] = son.oncekiDeger;
    setTahta(yeniTahta);

    const anahtar = `${son.r},${son.c}`;
    const yeniNotlar = { ...notlar };
    if (son.oncekiNotlar.length === 0) delete yeniNotlar[anahtar];
    else yeniNotlar[anahtar] = son.oncekiNotlar;
    setNotlar(yeniNotlar);

    // Doğru hamle geri alınırsa puan da geri alınır; hata cezası geri gelmez
    if (son.kazanilanPuan > 0) setPuan((x) => Math.max(0, x - son.kazanilanPuan));
    const hataliMi = son.oncekiDeger !== 0 && son.oncekiDeger !== bulmaca.cozum[son.r][son.c];
    setHataliGozler(hataliMi
      ? [...hataliGozler.filter((k) => k !== anahtar), anahtar]
      : hataliGozler.filter((k) => k !== anahtar));
    setGecmis(gecmis.slice(0, -1));
  }, [gecmis, tahta, notlar, bulmaca, hataliGozler]);

  const ipucuUygula = useCallback(() => {
    if (!secili || bitti || kazandi) return;
    const [r, c] = secili;
    const anahtar = `${r},${c}`;
    if (verilenGozler.has(anahtar)) return;
    if (tahta[r][c] === bulmaca.cozum[r][c]) return;

    const yeniTahta = tahta.map((s) => [...s]);
    yeniTahta[r][c] = bulmaca.cozum[r][c];
    const yeniNotlar = { ...notlar };
    delete yeniNotlar[anahtar];
    setTahta(yeniTahta);
    setNotlar(yeniNotlar);
    setHataliGozler(hataliGozler.filter((k) => k !== anahtar));
    setPuan((x) => Math.max(0, x - ipucuCezasi(zorluk)));
    setGecmis([...gecmis, { r, c, oncekiDeger: tahta[r][c], oncekiNotlar: notlar[anahtar] ?? [], oncekiHatali: hataliGozler, kazanilanPuan: 0 }]);
    if (kazandiMi(yeniTahta)) setKazandi(true);
  }, [secili, bitti, kazandi, verilenGozler, tahta, bulmaca, notlar, hataliGozler, zorluk, gecmis, kazandiMi]);

  const ipucu = useCallback(() => {
    if (ucretsizIpucu) {
      ipucuKullanildiYaz();
      setUcretsizIpucu(false);
      ipucuUygula();
    } else {
      setIpucuUyarisi(true);
    }
  }, [ucretsizIpucu, ipucuUygula]);

  // Fiziksel klavye (web eklemesi)
  useEffect(() => {
    const dinle = (e: KeyboardEvent) => {
      if (cikisSor || ipucuUyarisi || bitti || kazandi) return;
      if (e.key >= "1" && e.key <= "9") { e.preventDefault(); sayiGir(Number(e.key)); return; }
      if (e.key === "Backspace" || e.key === "Delete") { e.preventDefault(); sil(); return; }
      if (e.key.toLowerCase() === "n") { setNotKipi((v) => !v); return; }
      const yonler: Record<string, [number, number]> = {
        ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
      };
      const y = yonler[e.key];
      if (!y) return;
      e.preventDefault();
      setSecili((s) => {
        const [r, c] = s ?? [0, 0];
        return [Math.max(0, Math.min(8, r + y[0])), Math.max(0, Math.min(8, c + y[1]))];
      });
    };
    window.addEventListener("keydown", dinle);
    return () => window.removeEventListener("keydown", dinle);
  }, [sayiGir, sil, cikisSor, ipucuUyarisi, bitti, kazandi]);

  /* --------------------------------------------------------- vurgulamalar */

  const seciliDeger = secili ? tahta[secili[0]][secili[1]] : 0;
  const vurgulu = useMemo(() => {
    if (!secili) return new Set<string>();
    const [sr, sc] = secili;
    const küme = new Set<string>();
    for (let i = 0; i < 9; i++) { küme.add(`${sr},${i}`); küme.add(`${i},${sc}`); }
    const br = 3 * Math.floor(sr / 3), bc = 3 * Math.floor(sc / 3);
    for (let r = br; r < br + 3; r++) for (let c = bc; c < bc + 3; c++) küme.add(`${r},${c}`);
    return küme;
  }, [secili]);

  const ayniSayi = useMemo(() => {
    if (seciliDeger === 0) return new Set<string>();
    const küme = new Set<string>();
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (tahta[r][c] === seciliDeger) küme.add(`${r},${c}`);
    return küme;
  }, [seciliDeger, tahta]);

  /** Tahtada 9 kez doğru yerleştirilmiş sayılar tuş satırından kaybolur. */
  const tamamlananSayilar = useMemo(() => {
    const küme = new Set<number>();
    for (let n = 1; n <= 9; n++) {
      let adet = 0;
      for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
        if (tahta[r][c] === n && bulmaca.cozum[r][c] === n) adet += 1;
      }
      if (adet === 9) küme.add(n);
    }
    return küme;
  }, [tahta, bulmaca]);

  const z = ZORLUKLAR.find((x) => x.key === zorluk)!;

  return (
    <div className="bk">
      <div className="bk-sdk">
        <div className="bk-sdk-ust">
          <button className="geri" aria-label="Geri" onClick={() => setCikisSor(true)}>←</button>
          <span className="rozet" style={{ background: `${z.renk}26`, color: z.renk }}>{z.ad}</span>
          <span style={{ flex: 1 }} />
          <span className="sure">{sureMetni(saniye)}</span>
          <span className="kalpler">
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ color: i < hata ? "#BBBBCC" : "#FF3B30" }}>{i < hata ? "♡" : "♥"}</span>
            ))}
          </span>
        </div>

        <div className="bk-sdk-puan">{puan}</div>

        <div className="bk-sdk-tahta">
          {tahta.map((satir, r) =>
            satir.map((deger, c) => {
              const anahtar = `${r},${c}`;
              const seciliMi = !!secili && secili[0] === r && secili[1] === c;
              const verilen = verilenGozler.has(anahtar);
              const hatali = hataliGozler.includes(anahtar);
              const notlarBu = notlar[anahtar] ?? [];
              return (
                <button
                  key={anahtar}
                  className="goz"
                  data-secili={seciliMi}
                  data-vurgu={!seciliMi && vurgulu.has(anahtar)}
                  data-ayni={!seciliMi && ayniSayi.has(anahtar)}
                  data-verilen={verilen}
                  data-hatali={hatali}
                  data-sag={c % 3 === 2 && c !== 8}
                  data-alt={r % 3 === 2 && r !== 8}
                  onClick={() => setSecili(seciliMi ? null : [r, c])}
                >
                  {deger !== 0 ? deger : notlarBu.length > 0 ? (
                    <span className="notlar">
                      {Array.from({ length: 9 }, (_, i) => (
                        <i key={i}>{notlarBu.includes(i + 1) ? i + 1 : ""}</i>
                      ))}
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>

        <div className="bk-sdk-bildirim">{bildirim && <span>{bildirim}</span>}</div>

        <div className="bk-sdk-eylemler">
          <button disabled={gecmis.length === 0} onClick={geriAl}><b>↺</b><span>Geri Al</span></button>
          <button onClick={sil}><b>⌫</b><span>Sil</span></button>
          <button data-aktif={notKipi} onClick={() => setNotKipi((v) => !v)}><b>✎</b><span>Not</span></button>
          <button className="ipucu" onClick={ipucu}>
            <b style={{ color: "#FFD700" }}>💡</b><span>İpucu</span>
            {ucretsizIpucu && <i className="hak">1</i>}
          </button>
        </div>

        <div className="bk-sdk-sayilar">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              disabled={tamamlananSayilar.has(n)}
              data-bitti={tamamlananSayilar.has(n)}
              onClick={() => sayiGir(n)}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Banner — uygulamada da tuş takımının altında (SudokuScreen.SdkGameScreen) */}
        <Reklam />
      </div>

      {kazandi && (
        <div className="bk-oyun-ortu">
          <div className="bk-sdk-lottie"><Lottie ad="confetti" /></div>
          <div className="bk-sdk-sonuc">
            <div style={{ fontSize: 48 }}>🎉</div>
            <b>Tebrikler!</b>
            <span>Bölüm {bolum} / {SUDOKU_BOLUM_SAYISI} tamamlandı</span>
            <span>{sureMetni(saniye)}</span>
            <div className="yildizlar">
              {[1, 2, 3].map((i) => (
                <span key={i} data-gorunur={i <= gorunenYildiz}>
                  {i <= yildizlar(puan, zorluk) ? "⭐" : "☆"}
                </span>
              ))}
            </div>
            <div className="puanKutu"><b>{puan}</b><span>puan</span></div>
            <button className="ana" onClick={onBolumBitti}>
              {sonBolumMu ? "Zorluk Seç" : "Sonraki Bölüm"}
            </button>
            {!sonBolumMu && <button className="ikincil" onClick={onCik}>Zorluk Seç</button>}
          </div>
        </div>
      )}

      {bitti && (
        <div className="bk-oyun-ortu">
          <div className="bk-sdk-sonuc">
            <div style={{ fontSize: 52 }}>💔</div>
            <b>Oyun Bitti!</b>
            <span>3 hata yaptın.</span>
            <button className="ana" onClick={onTekrar}>Tekrar Dene</button>
            <button className="ikincil" onClick={onCik}>Zorluk Seç</button>
          </div>
        </div>
      )}

      {ipucuUyarisi && (
        <div className="bk-oyun-ortu hafif" onClick={() => setIpucuUyarisi(false)}>
          <div className="bk-oyun-onay" onClick={(e) => e.stopPropagation()}>
            <div className="sor">Günlük ipucu hakkın bitti</div>
            <div className="not">Yarın yeniden bir ipucu hakkın olacak.</div>
            <div className="ikili">
              <button className="hayir" onClick={() => setIpucuUyarisi(false)}>Tamam</button>
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
              <button className="evet" onClick={onCik}>Evet, Çık</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
