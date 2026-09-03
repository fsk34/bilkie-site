"use client";

// Blok Patla! — Android'deki `BlockBlastGame` (GamesScreen.kt) portu.
// Tam ekrandır (kabuk dışı). Çizim uygulamadaki gibi tuvalde (Canvas) yapılır:
// 3B bloklar, altın önizleme, süpürme + şok dalgası, parçacıklar.
//
// TEK BİLİNÇLİ SAPMA: uygulamada parça parmağın 2,2 göz ÜSTÜNDE ve hareket 1,4 kat
// büyütülmüş çizilir (parmak parçayı kapatmasın diye). Fare/kalemde böyle bir sorun
// olmadığı için imleçle sürüklerken 1:1 ve kaydırmasız çalışır; dokunmatikte
// uygulamanın davranışı aynen korunur.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useOturum } from "../../../lib/oturum";
import { enIyiSkorOku, enIyiSkorYaz } from "../../../lib/veri";
import { sesCal } from "../../ses";
import Reklam from "../Reklam";
import {
  BB_BOS_GOZ, BB_BOYUT, BB_ZEMIN,
  baslangicIzgarasi, birYereUyarMi, blokCiz, comboCarpani,
  konabilirMi, koyu, parcaGozBoyutu, rgba, sekilBoyu, yeniTepsi,
  type Izgara, type Parca, type Renk,
} from "./bb";

const TEMIZLEME_SURE = 520;   // ms — uygulamadaki clearAnim süresi
/** Combo sesleri — uygulamada blast (3+ çizgi) her zaman combo4 sesini çalar. */
const COMBO_SESI = ["bb_combo1", "bb_combo1", "bb_combo2", "bb_combo3", "bb_combo4"] as const;

type Parcacik = { x: number; y: number; vx: number; vy: number; renk: Renk; boy: number };
type Rozet = { metin: string; renk: string } | null;

export default function BlokPatla() {
  const router = useRouter();
  const { kullanici } = useOturum();

  const [izgara, setIzgara] = useState<Izgara>(() => []);
  const [tepsi, setTepsi] = useState<(Parca | null)[]>([null, null, null]);
  const [skor, setSkor] = useState(0);
  const [enIyi, setEnIyi] = useState(0);
  const [bitti, setBitti] = useState(false);
  const [cikisSor, setCikisSor] = useState(false);
  const [zemin, setZemin] = useState(BB_ZEMIN);
  const [rozet, setRozet] = useState<Rozet>(null);
  const [popup, setPopup] = useState(0);
  const [skorZipla, setSkorZipla] = useState(false);
  const [surukleIdx, setSurukleIdx] = useState(-1);

  // Çizim için gereken, yeniden çizim tetiklemeyen durumlar
  const izgaraRef = useRef<Izgara>([]);
  const tepsiRef = useRef<(Parca | null)[]>([null, null, null]);
  const surukleRef = useRef({
    idx: -1, x: 0, y: 0, baslangicDokunus: { x: 0, y: 0 }, baslangicKonum: { x: 0, y: 0 },
    onizR: -1, onizC: -1, gecerli: false, carpan: 1, kaldirma: 0,
  });
  const temizRef = useRef<{
    gozler: Set<string>; satirlar: number[]; sutunlar: number[]; renk: Renk; bas: number;
  } | null>(null);
  const parcaciklarRef = useRef<Parcacik[]>([]);
  const comboRef = useRef(0);
  const seriRef = useRef(0);
  const buTurTemizlendiRef = useRef(false);
  const rozetJetonRef = useRef(0);

  const tuvalRef = useRef<HTMLCanvasElement>(null);
  const katmanRef = useRef<HTMLCanvasElement>(null);
  const tepsiTuvalleri = useRef<(HTMLCanvasElement | null)[]>([null, null, null]);
  const tepsiKutulari = useRef<(HTMLDivElement | null)[]>([null, null, null]);
  const gozPxRef = useRef(0);
  const skorRef = useRef(0);
  const enIyiRef = useRef(0);

  // Çizim döngüsü kapanış (closure) içinden okuduğu için durum aynalanır.
  // ⚠️ Çizim ETKİSİNDEN ÖNCE tanımlı olmalı: React etkileri sırayla çalıştırır,
  //    böylece tuval her zaman güncel ızgarayı görür.
  useEffect(() => { izgaraRef.current = izgara; }, [izgara]);
  useEffect(() => { tepsiRef.current = tepsi; }, [tepsi]);
  // ⚠️ setState GÜNCELLEYİCİSİNİN İÇİNDE yan etki olmamalı (React geliştirme kipinde
  // güncelleyici iki kez çalışıp ses/puan/yazmayı ikiye katlıyor) → güncel değer ref'ten.
  useEffect(() => { skorRef.current = skor; }, [skor]);
  useEffect(() => { enIyiRef.current = enIyi; }, [enIyi]);

  /* --------------------------------------------------------------- kurulum */

  // ⚠️ Rastgele üretim sunucuda çalışırsa hydration uyuşmazlığı olur → ilk çizimden sonra.
  useEffect(() => {
    const g = baslangicIzgarasi();
    const t = yeniTepsi(g);
    izgaraRef.current = g;
    tepsiRef.current = t;
    setIzgara(g);
    setTepsi(t);
  }, []);

  useEffect(() => {
    if (!kullanici) return;
    let iptal = false;
    enIyiSkorOku(kullanici.uid, "blockBlast")
      .then((v) => { if (!iptal) { enIyiRef.current = v; setEnIyi(v); } })
      .catch(() => {});
    return () => { iptal = true; };
  }, [kullanici]);

  const cik = useCallback(() => router.push("/uygulama/oyunlar"), [router]);

  /* ---------------------------------------------------------------- çizim */

  const izgaraCiz = useCallback((simdi: number) => {
    const tuval = tuvalRef.current;
    const ctx = tuval?.getContext("2d");
    if (!tuval || !ctx) return;
    const oran = window.devicePixelRatio || 1;
    const boy = tuval.width / oran;
    const goz = boy / BB_BOYUT;
    gozPxRef.current = goz;

    ctx.setTransform(oran, 0, 0, oran, 0, 0);
    ctx.clearRect(0, 0, boy, boy);

    const s = surukleRef.current;
    const g = izgaraRef.current;
    if (g.length === 0) return;
    const surukParca = s.idx >= 0 ? tepsiRef.current[s.idx] : null;
    const temiz = temizRef.current;
    const ilerleme = temiz ? Math.min(1, Math.max(0, (simdi - temiz.bas) / TEMIZLEME_SURE)) : 0;
    // Android: 0.15 ↔ 0.65 arası 380 ms tek yön (dönemi 760 ms)
    const parlama = 0.40 + 0.25 * Math.sin((2 * Math.PI * simdi) / 760);

    // Bırakılınca temizlenecek satır/sütunlar — altın önizleme
    let onizSatirlar: number[] = [];
    let onizSutunlar: number[] = [];
    const onizSet = new Set<string>();
    if (s.gecerli && surukParca && s.onizR >= 0) {
      const gecici = g.map((satir) => [...satir]);
      for (const [dr, dc] of surukParca.sekil) gecici[s.onizR + dr][s.onizC + dc] = surukParca.renk;
      onizSatirlar = [...Array(BB_BOYUT).keys()].filter((r) => gecici[r].every((v) => v !== null));
      onizSutunlar = [...Array(BB_BOYUT).keys()].filter((c) => gecici.every((satir) => satir[c] !== null));
      for (const r of onizSatirlar) for (let c = 0; c < BB_BOYUT; c++) onizSet.add(`${r},${c}`);
      for (const c of onizSutunlar) for (let r = 0; r < BB_BOYUT; r++) onizSet.add(`${r},${c}`);
    }

    const kapsar = (r: number, c: number) =>
      !!surukParca && s.onizR >= 0 && surukParca.sekil.some(([dr, dc]) => s.onizR + dr === r && s.onizC + dc === c);

    for (let r = 0; r < BB_BOYUT; r++) {
      for (let c = 0; c < BB_BOYUT; c++) {
        const l = c * goz;
        const t = r * goz;
        const anahtar = `${r},${c}`;
        const temizleniyor = !!temiz?.gozler.has(anahtar);
        const onizTemiz = onizSet.has(anahtar);
        const oniz = !temizleniyor && !!surukParca && s.onizR >= 0 && s.gecerli && kapsar(r, c);
        const kotuOniz = !temizleniyor && !!surukParca && s.onizR >= 0 && !s.gecerli && kapsar(r, c);
        const gozRenk = g[r][c];

        if (temizleniyor && temiz) {
          if (ilerleme < 0.35) {
            blokCiz(ctx, l, t, goz, acikla(temiz.renk, (ilerleme / 0.35) * 0.55));
          } else {
            const f = (ilerleme - 0.35) / 0.65;
            const olcek = 1 - f;
            const kucuk = goz * olcek;
            if (kucuk > 1) {
              blokCiz(ctx, l + goz / 2 - kucuk / 2, t + goz / 2 - kucuk / 2, kucuk, acikla(temiz.renk, 0.5), 1 - f);
            }
          }
        } else if (onizTemiz && oniz && surukParca) {
          blokCiz(ctx, l, t, goz, acikla(surukParca.renk, parlama * 0.55));
          cerceve(ctx, l + 1, t + 1, goz - 2, `rgba(255,255,255,${parlama * 0.75})`, 2);
        } else if (onizTemiz && gozRenk) {
          blokCiz(ctx, l, t, goz, acikla(gozRenk, parlama * 0.55));
          cerceve(ctx, l + 1, t + 1, goz - 2, `rgba(255,255,255,${parlama * 0.75})`, 2);
        } else if (gozRenk) {
          blokCiz(ctx, l, t, goz, gozRenk);
        } else if (oniz && surukParca) {
          blokCiz(ctx, l, t, goz, surukParca.renk, 0.5);
        } else if (kotuOniz) {
          ctx.fillStyle = "rgba(255,0,0,.25)";
          ctx.fillRect(l + 3, t + 3, goz - 6, goz - 6);
        } else {
          ctx.fillStyle = BB_BOS_GOZ;
          ctx.fillRect(l + 3, t + 3, goz - 6, goz - 6);
        }
      }
    }

    // Altın satır/sütun kenarlığı
    if (onizSatirlar.length || onizSutunlar.length) {
      ctx.strokeStyle = `rgba(255,215,64,${parlama * 0.85})`;
      ctx.lineWidth = 3.5;
      for (const r of onizSatirlar) ctx.strokeRect(0, r * goz, boy, goz);
      for (const c of onizSutunlar) ctx.strokeRect(c * goz, 0, goz, boy);
    }

    // Süpürme + şok dalgası
    if (temiz && ilerleme > 0) {
      const supurme = Math.min(1, Math.max(0, ilerleme / 0.58));
      const bantYari = boy * 0.16;
      const solma = Math.min(1, Math.max(0, (1 - supurme) / 0.18));
      const saydam = 0.78 * solma;
      if (saydam > 0) {
        for (const r of temiz.satirlar) {
          const x = supurme * boy;
          const gr = ctx.createLinearGradient(Math.max(0, x - bantYari), 0, Math.min(boy, x + bantYari), 0);
          gr.addColorStop(0, "rgba(255,255,255,0)");
          gr.addColorStop(0.5, `rgba(255,255,255,${saydam})`);
          gr.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = gr;
          ctx.fillRect(0, r * goz, boy, goz);
        }
        for (const c of temiz.sutunlar) {
          const y = supurme * boy;
          const gr = ctx.createLinearGradient(0, Math.max(0, y - bantYari), 0, Math.min(boy, y + bantYari));
          gr.addColorStop(0, "rgba(255,255,255,0)");
          gr.addColorStop(0.5, `rgba(255,255,255,${saydam})`);
          gr.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = gr;
          ctx.fillRect(c * goz, 0, goz, boy);
        }
      }

      const sok = Math.min(1, Math.max(0, (ilerleme - 0.08) / 0.92));
      if (sok > 0) {
        const satirlar = [...temiz.gozler].map((k) => Number(k.split(",")[0]));
        const sutunlar = [...temiz.gozler].map((k) => Number(k.split(",")[1]));
        const cx = ((Math.min(...sutunlar) + Math.max(...sutunlar) + 1) * goz) / 2;
        const cy = ((Math.min(...satirlar) + Math.max(...satirlar) + 1) * goz) / 2;
        const enBuyuk = boy * 0.8;
        const ters1 = 1 - sok;
        halka(ctx, cx, cy, sok * enBuyuk, `rgba(255,255,255,${ters1 * ters1 * 0.88})`, ters1 * 5 + 1.5);
        if (sok > 0.12) {
          const s2 = (sok - 0.12) / 0.88;
          const ters2 = 1 - s2;
          halka(ctx, cx, cy, s2 * enBuyuk * 0.86, rgba(temiz.renk, ters2 * ters2 * 0.55), ters2 * 3 + 1);
        }
      }
    }
  }, []);

  /** Tam ekran katman: parçacıklar + sürüklenen parça. */
  const katmanCiz = useCallback((simdi: number) => {
    const tuval = katmanRef.current;
    const ctx = tuval?.getContext("2d");
    if (!tuval || !ctx) return;
    const oran = window.devicePixelRatio || 1;
    ctx.setTransform(oran, 0, 0, oran, 0, 0);
    ctx.clearRect(0, 0, tuval.width / oran, tuval.height / oran);

    const temiz = temizRef.current;
    if (parcaciklarRef.current.length > 0 && temiz) {
      const ilerleme = Math.min(1, Math.max(0, (simdi - temiz.bas) / TEMIZLEME_SURE));
      const dt = ilerleme * (TEMIZLEME_SURE / 1000);
      const saydam = Math.min(1, Math.max(0, 1 - ilerleme * 1.3));
      if (saydam > 0) {
        for (const p of parcaciklarRef.current) {
          const px = p.x + p.vx * dt;
          const py = p.y + p.vy * dt + 350 * dt * dt;
          ctx.fillStyle = rgba(p.renk, saydam);
          ctx.beginPath();
          ctx.arc(px, py, p.boy, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    const s = surukleRef.current;
    const parca = s.idx >= 0 ? tepsiRef.current[s.idx] : null;
    if (parca) {
      const goz = gozPxRef.current > 0 ? gozPxRef.current : 36;
      const [sy, sx] = sekilBoyu(parca.sekil);
      const parmakY = s.y - goz * s.kaldirma;
      const x0 = s.x - (sx / 2) * goz;
      const y0 = parmakY - (sy / 2) * goz;
      for (const [r, c] of parca.sekil) blokCiz(ctx, x0 + c * goz, y0 + r * goz, goz, parca.renk);
    }
  }, []);

  /* ----------------------------------------------------- animasyon döngüsü */

  useEffect(() => {
    let kare = 0;
    let calisiyor = true;
    const dongu = () => {
      if (!calisiyor) return;
      const simdi = performance.now();
      izgaraCiz(simdi);
      katmanCiz(simdi);
      const gerekli = surukleRef.current.idx >= 0 || temizRef.current !== null;
      if (gerekli) kare = requestAnimationFrame(dongu);
      else kare = 0;
    };
    // Durum değişince tek kare çiz; animasyon gerekiyorsa döngü kendini sürdürür
    dongu();
    return () => { calisiyor = false; if (kare) cancelAnimationFrame(kare); };
  }, [izgara, surukleIdx, izgaraCiz, katmanCiz]);

  /* --------------------------------------------------------- ölçü / tuvaller */

  useEffect(() => {
    const olc = () => {
      const oran = window.devicePixelRatio || 1;
      const t = tuvalRef.current;
      if (t) {
        const k = t.getBoundingClientRect();
        t.width = Math.round(k.width * oran);
        t.height = Math.round(k.width * oran);
        gozPxRef.current = k.width / BB_BOYUT;
      }
      const k2 = katmanRef.current;
      if (k2) {
        k2.width = Math.round(window.innerWidth * oran);
        k2.height = Math.round(window.innerHeight * oran);
      }
      izgaraCiz(performance.now());
    };
    olc();
    window.addEventListener("resize", olc);
    return () => window.removeEventListener("resize", olc);
  }, [izgaraCiz]);

  // Tepsi parçalarının çizimi
  useEffect(() => {
    const oran = window.devicePixelRatio || 1;
    tepsi.forEach((parca, i) => {
      const t = tepsiTuvalleri.current[i];
      if (!t) return;
      const ctx = t.getContext("2d");
      if (!ctx) return;
      if (!parca || surukleIdx === i) {
        t.width = 1; t.height = 1;
        ctx.clearRect(0, 0, 1, 1);
        return;
      }
      const goz = parcaGozBoyutu(parca.sekil);
      const [sy, sx] = sekilBoyu(parca.sekil);
      t.style.width = `${sx * goz}px`;
      t.style.height = `${sy * goz}px`;
      t.width = Math.round(sx * goz * oran);
      t.height = Math.round(sy * goz * oran);
      ctx.setTransform(oran, 0, 0, oran, 0, 0);
      ctx.clearRect(0, 0, sx * goz, sy * goz);
      for (const [r, c] of parca.sekil) blokCiz(ctx, c * goz, r * goz, goz, parca.renk);
    });
  }, [tepsi, surukleIdx]);

  /* -------------------------------------------------------------- sürükleme */

  const onizlemeTazele = useCallback(() => {
    const s = surukleRef.current;
    const parca = s.idx >= 0 ? tepsiRef.current[s.idx] : null;
    const tuval = tuvalRef.current;
    if (!parca || !tuval || gozPxRef.current <= 0) return;
    const kutu = tuval.getBoundingClientRect();
    const goz = gozPxRef.current;
    const parmakY = s.y - goz * s.kaldirma;
    const sekilG = Math.max(...parca.sekil.map((p) => p[1]));
    const sekilY = Math.max(...parca.sekil.map((p) => p[0]));
    // Kotlin toInt() sıfıra doğru keser → Math.trunc (Math.floor DEĞİL)
    const sutun = Math.trunc((s.x - kutu.left) / goz - sekilG / 2);
    const satir = Math.trunc((parmakY - kutu.top) / goz - sekilY / 2);
    s.onizR = satir;
    s.onizC = sutun;
    s.gecerli = konabilirMi(izgaraRef.current, parca.sekil, satir, sutun);
  }, []);

  const basildi = (e: React.PointerEvent) => {
    if (bitti || cikisSor || temizRef.current) return;
    const s = surukleRef.current;
    if (s.idx >= 0) return;
    for (let i = 0; i < 3; i++) {
      const kutu = tepsiKutulari.current[i]?.getBoundingClientRect();
      if (!kutu || !tepsiRef.current[i]) continue;
      if (e.clientX >= kutu.left && e.clientX <= kutu.right && e.clientY >= kutu.top && e.clientY <= kutu.bottom) {
        const dokunmatik = e.pointerType === "touch";
        s.idx = i;
        s.baslangicDokunus = { x: e.clientX, y: e.clientY };
        s.baslangicKonum = { x: e.clientX, y: e.clientY };
        s.x = e.clientX; s.y = e.clientY;
        s.carpan = dokunmatik ? 1.4 : 1;      // bkz. dosya başındaki sapma notu
        s.kaldirma = dokunmatik ? 2.2 : 0;
        sesCal("bb_alma", 0.5);
        setSurukleIdx(i);
        onizlemeTazele();
        break;
      }
    }
  };

  const hareket = (e: React.PointerEvent) => {
    const s = surukleRef.current;
    if (s.idx < 0) return;
    s.x = s.baslangicKonum.x + (e.clientX - s.baslangicDokunus.x) * s.carpan;
    s.y = s.baslangicKonum.y + (e.clientY - s.baslangicDokunus.y) * s.carpan;
    onizlemeTazele();
  };

  const birakildi = () => {
    const s = surukleRef.current;
    if (s.idx >= 0 && s.gecerli && s.onizR >= 0 && !temizRef.current) {
      const idx = s.idx;
      const parca = tepsiRef.current[idx];
      if (parca) {
        sesCal("bb_yerlestir", 0.5);
        parcayiKoy(parca, s.onizR, s.onizC, idx);
      }
    }
    s.idx = -1; s.onizR = -1; s.onizC = -1; s.gecerli = false;
    setSurukleIdx(-1);
  };

  /* ------------------------------------------------------------ oyun akışı */

  const rozetGoster = useCallback((metin: string, renk: string) => {
    rozetJetonRef.current += 1;
    const jeton = rozetJetonRef.current;
    setRozet({ metin, renk });
    window.setTimeout(() => { if (rozetJetonRef.current === jeton) setRozet(null); }, 950);
  }, []);

  const skorEkle = useCallback((delta: number) => {
    const yeni = skorRef.current + delta;
    skorRef.current = yeni;
    setSkor(yeni);
    if (yeni > enIyiRef.current) {
      enIyiRef.current = yeni;
      setEnIyi(yeni);
      if (kullanici) void enIyiSkorYaz(kullanici.uid, "blockBlast", yeni).catch(() => {});
    }
    setSkorZipla(true);
    window.setTimeout(() => setSkorZipla(false), 220);
  }, [kullanici]);

  const bitisKontrol = useCallback((g: Izgara, t: (Parca | null)[]) => {
    if (temizRef.current) return;
    const kalan = t.filter((p): p is Parca => p !== null);
    if (kalan.length === 0) return;
    if (kalan.every((p) => !birYereUyarMi(g, p.sekil))) {
      setBitti(true);
      setZemin(BB_ZEMIN);
    }
  }, []);

  const tepsidenDus = useCallback((idx: number, g: Izgara) => {
    const yeni = [...tepsiRef.current];
    yeni[idx] = null;
    tepsiRef.current = yeni;
    setTepsi(yeni);

    if (!yeni.every((p) => p === null)) {
      bitisKontrol(g, yeni);
      return;
    }
    // Tepsi boşaldı: kısa bekleme, seri rozeti, yeni tepsi (uygulamadaki 150 ms)
    window.setTimeout(() => {
      if (buTurTemizlendiRef.current) {
        seriRef.current += 1;
        if (seriRef.current >= 2) rozetGoster(`🔥 ${seriRef.current} TUR SERİSİ!`, "#FFD740");
      } else {
        seriRef.current = 0;
      }
      buTurTemizlendiRef.current = false;
      const tazeTepsi = yeniTepsi(izgaraRef.current);
      tepsiRef.current = tazeTepsi;
      setTepsi(tazeTepsi);
      bitisKontrol(izgaraRef.current, tazeTepsi);
    }, 150);
  }, [bitisKontrol, rozetGoster]);

  const parcayiKoy = useCallback((parca: Parca, satir: number, sutun: number, idx: number) => {
    const g = izgaraRef.current.map((s) => [...s]);
    for (const [dr, dc] of parca.sekil) g[satir + dr][sutun + dc] = parca.renk;

    const doluSatirlar = [...Array(BB_BOYUT).keys()].filter((r) => g[r].every((v) => v !== null));
    const doluSutunlar = [...Array(BB_BOYUT).keys()].filter((c) => g.every((s) => s[c] !== null));
    const cizgi = doluSatirlar.length + doluSutunlar.length;
    const temelPuan = parca.sekil.length + (cizgi > 0 ? cizgi * 10 * cizgi : 0);

    if (cizgi === 0) {
      comboRef.current = 0;
      izgaraRef.current = g;
      setIzgara(g);
      skorEkle(temelPuan);
      tepsidenDus(idx, g);
      return;
    }

    buTurTemizlendiRef.current = true;
    const patlama = cizgi >= 3;
    const combo = Math.min(comboRef.current + 1, 4);
    comboRef.current = combo;
    const gercekPuan = Math.trunc(temelPuan * comboCarpani(combo) * (patlama ? 1.5 : 1));

    sesCal(patlama ? "bb_combo4" : COMBO_SESI[combo], 0.55);

    if (patlama) {
      setZemin(rgba(koyu(parca.renk, 0.35)));
      rozetGoster("💥 BLAST!", "#FF6E40");
    } else {
      const [metin, renk] =
        combo === 1 ? ["İYİ!", "#80DEEA"] :
        combo === 2 ? ["HARIKA!", "#69F0AE"] :
        combo === 3 ? ["MÜKEMMEL!", "#FFD740"] : ["EFSANEVİ!", "#FF6E40"];
      rozetGoster(metin, renk);
    }

    const gozler = new Set<string>();
    for (const r of doluSatirlar) for (let c = 0; c < BB_BOYUT; c++) gozler.add(`${r},${c}`);
    for (const c of doluSutunlar) for (let r = 0; r < BB_BOYUT; r++) gozler.add(`${r},${c}`);

    izgaraRef.current = g;
    setIzgara(g);

    // Parçacıklar tam ekran katmanda, ekran koordinatlarında
    const kutu = tuvalRef.current?.getBoundingClientRect();
    const goz = gozPxRef.current;
    const yeniParcaciklar: Parcacik[] = [];
    if (kutu) {
      for (const anahtar of gozler) {
        const [r, c] = anahtar.split(",").map(Number);
        const cx = kutu.left + (c + 0.5) * goz;
        const cy = kutu.top + (r + 0.5) * goz;
        for (let i = 0; i < 4; i++) {
          const aci = Math.random() * Math.PI * 2;
          const hiz = 180 + Math.random() * 320;
          yeniParcaciklar.push({
            x: cx, y: cy, vx: Math.cos(aci) * hiz, vy: Math.sin(aci) * hiz,
            renk: parca.renk, boy: (5 + Math.random() * 7) * (goz / 50),
          });
        }
      }
    }
    parcaciklarRef.current = yeniParcaciklar;
    temizRef.current = {
      gozler, satirlar: doluSatirlar, sutunlar: doluSutunlar,
      renk: parca.renk, bas: performance.now(),
    };
    setSurukleIdx(-1);   // animasyon döngüsünü uyandırır

    window.setTimeout(() => {
      const temizlenmis = izgaraRef.current.map((s) => [...s]);
      for (const anahtar of gozler) {
        const [r, c] = anahtar.split(",").map(Number);
        temizlenmis[r][c] = null;
      }
      izgaraRef.current = temizlenmis;
      setIzgara(temizlenmis);
      skorEkle(gercekPuan);
      setPopup(gercekPuan);
      window.setTimeout(() => setPopup(0), 700);
      temizRef.current = null;
      parcaciklarRef.current = [];
      tepsidenDus(idx, temizlenmis);
    }, TEMIZLEME_SURE);
  }, [rozetGoster, skorEkle, tepsidenDus]);

  const yenidenBasla = useCallback(() => {
    const g = baslangicIzgarasi();
    const t = yeniTepsi(g);
    izgaraRef.current = g;
    tepsiRef.current = t;
    skorRef.current = 0;
    setIzgara(g);
    setTepsi(t);
    setSkor(0); setBitti(false); setPopup(0); setRozet(null); setZemin(BB_ZEMIN);
    comboRef.current = 0; seriRef.current = 0; buTurTemizlendiRef.current = false;
    temizRef.current = null; parcaciklarRef.current = [];
  }, []);

  /* ------------------------------------------------------------------ çizim */

  return (
    <div className="bk">
      <div
        className="bk-bb"
        style={{ background: zemin }}
        onPointerDown={basildi}
        onPointerMove={hareket}
        onPointerUp={birakildi}
        onPointerCancel={birakildi}
      >
        <div className="bk-bb-ust">
          <div className="orta">
            <span>SKOR</span>
            <b data-zipla={skorZipla}>{skor}</b>
          </div>
          <div className="sag">
            <span>EN İYİ</span>
            <i>{enIyi}</i>
          </div>
        </div>

        <div className="bk-bb-izgara">
          <canvas ref={tuvalRef} />
        </div>

        <div className="bk-bb-rozet">
          {rozet && <span style={{ color: rozet.renk }}>{rozet.metin}</span>}
        </div>

        <div className="bk-bb-tepsi">
          {[0, 1, 2].map((i) => (
            <div key={i} ref={(el) => { tepsiKutulari.current[i] = el; }} className="kutu">
              <canvas ref={(el) => { tepsiTuvalleri.current[i] = el; }} />
            </div>
          ))}
        </div>

        <p className="bk-oyun-ipucu">Parçayı tahtaya sürükle; satır ya da sütun dolunca patlar</p>

        {/* Banner — uygulamada da bu ekranın en altında (GamesScreen.BlockBlastGame) */}
        <Reklam />

        {!bitti && (
          <button className="bk-bb-geri" aria-label="Geri" onClick={() => setCikisSor(true)}>←</button>
        )}

        {popup > 0 && <div className="bk-bb-popup">+{popup}</div>}
      </div>

      <canvas ref={katmanRef} className="bk-bb-katman" />

      {bitti && (
        <div className="bk-oyun-ortu" style={{ background: "rgba(0,0,0,.78)" }}>
          <div className="govde">
            <div style={{ fontSize: 30, fontWeight: 700 }}>OYUN BİTTİ</div>
            <div style={{ fontSize: 20 }}>Skor: {skor}</div>
            <div className="bk-oyun-dugmeler" style={{ marginTop: 8 }}>
              <button className="bk-oyun-dugme beyaz" onClick={yenidenBasla}>Tekrar Oyna</button>
              <button className="bk-oyun-dugme" onClick={cik}>Çık</button>
            </div>
          </div>
        </div>
      )}

      {cikisSor && (
        <div className="bk-oyun-ortu hafif" onClick={() => setCikisSor(false)}>
          <div className="bk-oyun-onay" onClick={(e) => e.stopPropagation()}>
            <div className="sor">Çıkmak istiyor musun?</div>
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

const acikla = (c: Renk, f: number): Renk =>
  [Math.min(255, c[0] + f * 255), Math.min(255, c[1] + f * 255), Math.min(255, c[2] + f * 255)];

function cerceve(ctx: CanvasRenderingContext2D, x: number, y: number, b: number, renk: string, kalinlik: number) {
  ctx.strokeStyle = renk;
  ctx.lineWidth = kalinlik;
  ctx.strokeRect(x, y, b, b);
}

function halka(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, renk: string, kalinlik: number) {
  if (r <= 0) return;
  ctx.strokeStyle = renk;
  ctx.lineWidth = kalinlik;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}
