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
  const zemin = oyun === "2048" ? "#3A1A00" : oyun === "wordle" ? "#1A2A10" : "#0A2060";
  return (
    <svg width={72} height={72} viewBox="0 0 72 72" aria-hidden>
      <rect width={72} height={72} rx={14} fill={zemin} />
      {oyun === "kelime" && <Kelime />}
      {oyun === "sudoku" && <Sudoku />}
      {oyun === "blok" && <Blok />}
      {oyun === "2048" && <T2048 />}
      {oyun === "wordle" && <Wordle />}
    </svg>
  );
}

/** 2 satır × 3 harf, 18×18 kutular, aralık 2 → toplam 58×38, ortalanır. */
function Kelime() {
  const k = 18, ara = 2;
  const g = 3 * k + 2 * ara;
  const y0 = (72 - (2 * k + ara)) / 2;
  const x0 = (72 - g) / 2;
  return (
    <g>
      {KELIME_HARF.map((satir, r) =>
        satir.map((harf, c) => {
          const x = x0 + c * (k + ara);
          const y = y0 + r * (k + ara);
          return (
            <g key={`${r}-${c}`}>
              <rect x={x} y={y} width={k} height={k} rx={4} fill="#4A7BFF" fillOpacity={0.3} />
              <text
                x={x + k / 2} y={y + k / 2} fill="#fff" fontSize={10} fontWeight="700"
                textAnchor="middle" dominantBaseline="central"
              >
                {harf}
              </text>
            </g>
          );
        })
      )}
    </g>
  );
}

/** 44×44 alanda 3×3 ızgara + dış çerçeve. */
function Sudoku() {
  const b = 44, o = (72 - b) / 2, h = b / 3;
  return (
    <g>
      {[1, 2].map((i) => (
        <g key={i} stroke="#3A5AAA" strokeOpacity={0.5} strokeWidth={1}>
          <line x1={o + i * h} y1={o} x2={o + i * h} y2={o + b} />
          <line x1={o} y1={o + i * h} x2={o + b} y2={o + i * h} />
        </g>
      ))}
      <rect x={o} y={o} width={b} height={b} fill="none" stroke="#4A7CFF" strokeWidth={2} />
    </g>
  );
}

/** 44×44 alanda 4×4 göz, aralık 3. */
function Blok() {
  const b = 44, o = (72 - b) / 2, h = b / 4, ara = 3;
  return (
    <g>
      {BLOK.map(([r, c, renk]) => (
        <rect
          key={`${r}-${c}`}
          x={o + c * h + ara} y={o + r * h + ara}
          width={h - ara * 2} height={h - ara * 2}
          rx={4} fill={renk}
        />
      ))}
    </g>
  );
}

/** 44×44 alanda 2×2 göz, aralık 3. */
function T2048() {
  const b = 44, o = (72 - b) / 2, h = b / 2, ara = 3;
  return (
    <g>
      {[0, 1].map((r) =>
        [0, 1].map((c) => (
          <rect
            key={`${r}-${c}`}
            x={o + c * h + ara} y={o + r * h + ara}
            width={h - ara * 2} height={h - ara * 2}
            rx={5} fill={T2048_RENK[r * 2 + c]}
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
