// Oyun kartlarının 72×72 ikonları — uygulamadakiler Canvas ile çiziliyor
// (GamesHubScreen: kelimeIcon / sudokuIcon / blockBlastIcon / t2048Icon / wordleIcon).
// Web'de aynı ölçü ve renklerle SVG olarak çizildi; hazır görsel dosyası yok.

const KELIME_HARF = [["K", "E", "L"], ["İ", "M", "E"]];

/** Blok Patla ikonundaki dolu gözler: [satır, sütun, renk] */
const BLOK: [number, number, string][] = [
  [0, 0, "#4FC3F7"], [0, 1, "#4FC3F7"], [1, 0, "#4FC3F7"],
  [2, 1, "#FFB74D"], [2, 2, "#FFB74D"], [2, 3, "#FFB74D"],
  [3, 3, "#81C784"],
];

const T2048_RENK = ["#EDC850", "#ED9C3A", "#ED6C3A", "#EDC850"];
const WORDLE_RENK = ["#538D4E", "#B59F3B", "#538D4E", "#3A3A5C", "#538D4E"];

export default function OyunIkon({ oyun }: { oyun: string }) {
  const zemin = oyun === "2048" ? "#3A1A00" : oyun === "wordle" ? "#1A2A10" : oyun === "ok" ? "#F3F5FA" : "#0A2060";
  return (
    <svg width={72} height={72} viewBox="0 0 72 72" aria-hidden>
      <rect width={72} height={72} rx={14} fill={zemin} />
      {oyun === "kelime" && <Kelime />}
      {oyun === "sudoku" && <Sudoku />}
      {oyun === "blok" && <Blok />}
      {oyun === "2048" && <T2048 />}
      {oyun === "wordle" && <Wordle />}
      {oyun === "ok" && <Ok />}
      {oyun === "yapboz" && <Yapboz />}
    </svg>
  );
}

/** Android: R.drawable.kelime (72dp, Crop, köşe 14) — eskiden harf kutucukları çiziliyordu */
function Kelime() {
  return (
    <>
      <clipPath id="bk-kelime-kirp"><rect width={72} height={72} rx={14} /></clipPath>
      <image href="/uygulama/kelime.png" width={72} height={72} preserveAspectRatio="xMidYMid slice" clipPath="url(#bk-kelime-kirp)" />
    </>
  );
}

/** Android: 48dp kanvas, ince çizgi #3A5AAA (saydamlık yok) 1dp, çerçeve #4A7CFF 2dp */
function Sudoku() {
  const b = 48, o = (72 - b) / 2, h = b / 3;
  return (
    <g>
      {[1, 2].map((i) => (
        <g key={i} stroke="#3A5AAA" strokeWidth={1}>
          <line x1={o + i * h} y1={o} x2={o + i * h} y2={o + b} />
          <line x1={o} y1={o + i * h} x2={o + b} y2={o + i * h} />
        </g>
      ))}
      <rect x={o} y={o} width={b} height={b} fill="none" stroke="#4A7CFF" strokeWidth={2} />
    </g>
  );
}

/** Android: 44dp kanvas, 4×4; aralık 3f / köşe 4f PİKSEL (≈1.1 / 1.45 dp) */
function Blok() {
  const b = 44, o = (72 - b) / 2, h = b / 4, ara = 3 / 2.75;
  return (
    <g>
      {BLOK.map(([r, c, renk]) => (
        <rect
          key={`${r}-${c}`}
          x={o + c * h + ara} y={o + r * h + ara}
          width={h - ara * 2} height={h - ara * 2}
          rx={4 / 2.75} fill={renk}
        />
      ))}
    </g>
  );
}

/** Android: 48dp kanvas, 2×2; aralık 3f / köşe 5f PİKSEL */
function T2048() {
  const b = 48, o = (72 - b) / 2, h = b / 2, ara = 3 / 2.75;
  return (
    <g>
      {[0, 1].map((r) =>
        [0, 1].map((c) => (
          <rect
            key={`${r}-${c}`}
            x={o + c * h + ara} y={o + r * h + ara}
            width={h - ara * 2} height={h - ara * 2}
            rx={5 / 2.75} fill={T2048_RENK[r * 2 + c]}
          />
        ))
      )}
    </g>
  );
}

/** 5 kare 10×10, aralık 3. */
function Wordle() {
  const k = 10, ara = 3;
  const g = 5 * k + 4 * ara;
  const x0 = (72 - g) / 2;
  return (
    <g>
      {WORDLE_RENK.map((renk, i) => (
        <rect key={i} x={x0 + i * (k + ara)} y={(72 - k) / 2} width={k} height={k} rx={2} fill={renk} />
      ))}
    </g>
  );
}

/** Android GamesHubScreen: 48dp kanvas, 4×4 nokta (r = hücre×0.07), iki kıvrımlı lacivert ok (kalınlık hücre×0.22,
 *  uç hücre×0.55, yarım genişlik hücre×0.3) */
function Ok() {
  const b = 48, o = (72 - b) / 2, h = b / 4;
  const p = (c: number, r: number) => [o + (c + 0.5) * h, o + (r + 0.5) * h] as const;
  const ok = (yol: (readonly [number, number])[], dx: number, dy: number, k: number) => {
    const [hx, hy] = yol[yol.length - 1];
    const px = -dy, py = dx;
    const uc = `${hx + dx * h * 0.55},${hy + dy * h * 0.55} ${hx + px * h * 0.3},${hy + py * h * 0.3} ${hx - px * h * 0.3},${hy - py * h * 0.3}`;
    return (
      <g key={k}>
        <path d={"M" + yol.map(([x, y]) => `${x} ${y}`).join(" L")} fill="none" stroke="#2B3350" strokeWidth={h * 0.22} strokeLinecap="round" strokeLinejoin="round" />
        <polygon points={uc} fill="#2B3350" />
      </g>
    );
  };
  return (
    <g>
      {[0, 1, 2, 3].map((r) => [0, 1, 2, 3].map((c) => (
        <circle key={`${r}-${c}`} cx={o + (c + 0.5) * h} cy={o + (r + 0.5) * h} r={h * 0.07} fill="#BCC3D4" />
      )))}
      {ok([p(0, 2), p(0, 0), p(2, 0)], 1, 0, 1)}
      {ok([p(1, 3), p(3, 3), p(3, 1.4)], 0, -1, 2)}
    </g>
  );
}

/** Android: 3×3, 13dp kare, aralık 3, köşe 3; mavi tonlar, sağ alt boş (çizgisiz) */
function Yapboz() {
  const k = 13, ara = 3, x0 = (72 - (3 * k + 2 * ara)) / 2;
  const renk = ["#4A7CFF", "#3A6AE0", "#5B8CFF", "#3A6AE0", "#5B8CFF", "#4A7CFF", "#5B8CFF", "#4A7CFF", ""];
  return (
    <g>
      {renk.map((r, i) => r && (
        <rect key={i} x={x0 + (i % 3) * (k + ara)} y={x0 + Math.floor(i / 3) * (k + ara)} width={k} height={k} rx={3} fill={r} />
      ))}
    </g>
  );
}
