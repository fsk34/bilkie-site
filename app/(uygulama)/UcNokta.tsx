// Android `ThreeDotLoader` (MainActivity.kt) birebir: 3 beyaz nokta, saydamlık 0,25 ↔ 1,0,
// 450 ms ileri-geri, 0 / 150 / 300 ms faz farkı. Varsayılan 10px nokta, 8px aralık.
// (Lig ekranındaki ZIPLAYAN üç nokta ayrı: Android'de de orada satır içi farklı bir kopya var.)

export default function UcNokta({ boyut = 10, aralik = 8, style, etiket = "Yükleniyor" }: {
  boyut?: number; aralik?: number; style?: React.CSSProperties; etiket?: string;
}) {
  return (
    <div
      className="bk-uc-nokta"
      role="status"
      aria-label={etiket}
      style={{ gap: aralik, ...style }}
    >
      {[0, 1, 2].map((i) => (
        <i key={i} style={{ width: boyut, height: boyut, animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  );
}
