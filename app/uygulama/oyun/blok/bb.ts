// Blok Patla — oyun mantığı ve blok çizimi.
// KAYNAK: Android `GamesScreen.kt` içindeki BlockBlastGame (asıl sürüm; iOS ondan portlanmış).
// Sabitler, şekil listesi, ağırlıklı parça seçimi ve 3B blok çizimi birebir aktarıldı.

export const BB_BOYUT = 8;

export const BB_ZEMIN = "#3A4F8C";
export const BB_IZGARA_ZEMIN = "#1C2B52";
export const BB_IZGARA_CERCEVE = "#2A3F70";
export const BB_BOS_GOZ = "#1E2E58";

/** Renk 0-255 üçlüsü — Android'deki Color.lighter/darker karşılıkları için. */
export type Renk = [number, number, number];

export const acik = (c: Renk, f: number): Renk =>
  [Math.min(255, c[0] + f * 255), Math.min(255, c[1] + f * 255), Math.min(255, c[2] + f * 255)];
export const koyu = (c: Renk, f: number): Renk =>
  [Math.max(0, c[0] - f * 255), Math.max(0, c[1] - f * 255), Math.max(0, c[2] - f * 255)];
export const rgba = (c: Renk, a = 1) =>
  `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
const onaltilikRenk = (h: string): Renk =>
  [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

export type Sekil = [number, number][];
export type Parca = { sekil: Sekil; renk: Renk };

/** Android BB_SHAPES — 20 şekil (1-5 çizgiler, 2x2, 3x3, L/S/T, köşeler). */
export const BB_SEKILLER: Sekil[] = [
  [[0, 0]],
  [[0, 0], [0, 1]],
  [[0, 0], [0, 1], [0, 2]],
  [[0, 0], [0, 1], [0, 2], [0, 3]],
  [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
  [[0, 0], [1, 0]],
  [[0, 0], [1, 0], [2, 0]],
  [[0, 0], [1, 0], [2, 0], [3, 0]],
  [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],
  [[0, 0], [0, 1], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]],
  [[0, 0], [1, 0], [2, 0], [2, 1]],
  [[0, 1], [1, 1], [2, 0], [2, 1]],
  [[0, 0], [0, 1], [1, 1], [1, 2]],
  [[0, 1], [0, 2], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 1]],
  [[0, 0], [0, 1], [1, 0]],
  [[0, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [1, 1]],
  [[0, 1], [1, 0], [1, 1]],
];

/** Android BB_COLORS — 8 canlı renk. */
export const BB_RENKLER: Renk[] = [
  "#29B6F6", "#7C4DFF", "#FF7043", "#AB47BC",
  "#66BB6A", "#FFEE58", "#EF5350", "#26C6DA",
].map(onaltilikRenk);

export type Izgara = (Renk | null)[][];

const rastgeleSecim = <T,>(d: T[]): T => d[Math.floor(Math.random() * d.length)];

export const bosIzgara = (): Izgara =>
  Array.from({ length: BB_BOYUT }, () => Array<Renk | null>(BB_BOYUT).fill(null));

export function konabilirMi(izgara: Izgara, sekil: Sekil, satir: number, sutun: number): boolean {
  return sekil.every(([dr, dc]) => {
    const r = satir + dr;
    const c = sutun + dc;
    return r >= 0 && r < BB_BOYUT && c >= 0 && c < BB_BOYUT && izgara[r][c] === null;
  });
}

function uyanSayisi(izgara: Izgara, sekil: Sekil): number {
  let n = 0;
  for (let r = 0; r < BB_BOYUT; r++) for (let c = 0; c < BB_BOYUT; c++) if (konabilirMi(izgara, sekil, r, c)) n += 1;
  return n;
}

export function birYereUyarMi(izgara: Izgara, sekil: Sekil): boolean {
  for (let r = 0; r < BB_BOYUT; r++) for (let c = 0; c < BB_BOYUT; c++) if (konabilirMi(izgara, sekil, r, c)) return true;
  return false;
}

const rastgeleParca = (): Parca => ({ sekil: rastgeleSecim(BB_SEKILLER), renk: rastgeleSecim(BB_RENKLER) });

/** Ağırlıklı seçim: bir şekil tahtaya kaç yere sığıyorsa o kadar olası (Android bbRandPieceForGrid). */
export function izgaraIcinParca(izgara: Izgara): Parca {
  const agirliklar = BB_SEKILLER.map((s) => uyanSayisi(izgara, s));
  const toplam = agirliklar.reduce((t, a) => t + a, 0);
  if (toplam === 0) {
    return { sekil: rastgeleSecim(BB_SEKILLER.filter((s) => s.length <= 2)), renk: rastgeleSecim(BB_RENKLER) };
  }
  const hedef = Math.random() * toplam;
  let birikim = 0;
  for (let i = 0; i < BB_SEKILLER.length; i++) {
    birikim += agirliklar[i];
    if (hedef <= birikim) return { sekil: BB_SEKILLER[i], renk: rastgeleSecim(BB_RENKLER) };
  }
  return { sekil: BB_SEKILLER[BB_SEKILLER.length - 1], renk: rastgeleSecim(BB_RENKLER) };
}

export const yeniTepsi = (izgara: Izgara): (Parca | null)[] =>
  [izgaraIcinParca(izgara), izgaraIcinParca(izgara), izgaraIcinParca(izgara)];

/** Oyun 5 rastgele parçayla dolu başlar (Android bbGenerateStartGrid). */
export function baslangicIzgarasi(): Izgara {
  const izgara = bosIzgara();
  let konan = 0;
  for (let i = 0; i < 200 && konan < 5; i++) {
    const p = rastgeleParca();
    const r = Math.floor(Math.random() * BB_BOYUT);
    const c = Math.floor(Math.random() * BB_BOYUT);
    if (konabilirMi(izgara, p.sekil, r, c)) {
      for (const [dr, dc] of p.sekil) izgara[r + dr][c + dc] = p.renk;
      konan += 1;
    }
  }
  return izgara;
}

export const comboCarpani = (combo: number): number =>
  combo === 1 ? 1.5 : combo === 2 ? 2.5 : combo === 3 ? 4 : 6;

/** 3B blok — Android drawBbBlock birebir: dış zemin + 4 trapez yan yüz + gradyanlı iç yüz. */
export function blokCiz(
  ctx: CanvasRenderingContext2D,
  sol: number, ust: number, boy: number, renk: Renk,
  alpha = 1, disBosluk = 0
) {
  const l = sol + disBosluk;
  const t = ust + disBosluk;
  const w = boy - disBosluk * 2;
  const h = boy - disBosluk * 2;
  const ic = w * 0.10;

  const ol = l, ot = t, or = l + w, ob = t + h;
  const il = l + ic, it = t + ic, ir = l + w - ic, ib = t + h - ic;

  const dortgen = (noktalar: [number, number][], dolgu: string) => {
    ctx.beginPath();
    ctx.moveTo(noktalar[0][0], noktalar[0][1]);
    for (let i = 1; i < noktalar.length; i++) ctx.lineTo(noktalar[i][0], noktalar[i][1]);
    ctx.closePath();
    ctx.fillStyle = dolgu;
    ctx.fill();
  };

  ctx.fillStyle = rgba(koyu(renk, 0.48), alpha);
  ctx.fillRect(ol, ot, w, h);

  dortgen([[ol, ot], [or, ot], [ir, it], [il, it]], rgba(acik(renk, 0.08), alpha));   // üst
  dortgen([[il, ib], [ir, ib], [or, ob], [ol, ob]], rgba(koyu(renk, 0.38), alpha));   // alt
  dortgen([[ol, ot], [il, it], [il, ib], [ol, ob]], rgba(koyu(renk, 0.18), alpha));   // sol
  dortgen([[ir, it], [or, ot], [or, ob], [ir, ib]], rgba(koyu(renk, 0.25), alpha));   // sağ

  const gradyan = ctx.createLinearGradient(0, it, 0, ib);
  gradyan.addColorStop(0, rgba(acik(renk, 0.20), alpha));
  gradyan.addColorStop(1, rgba(renk, alpha));
  ctx.fillStyle = gradyan;
  ctx.fillRect(il, it, ir - il, ib - it);
}

/** Parça önizlemesi (tepsi ve sürüklenen görsel) — göz boyutu min(32, 100/enBüyükBoyut). */
export function parcaGozBoyutu(sekil: Sekil): number {
  const satir = Math.max(...sekil.map((s) => s[0])) + 1;
  const sutun = Math.max(...sekil.map((s) => s[1])) + 1;
  return Math.min(32, 100 / Math.max(satir, sutun));
}

export const sekilBoyu = (sekil: Sekil): [number, number] => [
  Math.max(...sekil.map((s) => s[0])) + 1,
  Math.max(...sekil.map((s) => s[1])) + 1,
];
