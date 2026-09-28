// Defter bloğunun ekrandaki hâli — okuyucu (/defter) ve yönetim panelindeki sayfa görünümü
// aynı bileşeni kullanır; panelde görülen, öğrencinin gördüğüyle birebir aynı olsun diye.
// Stiller uygulama.css'te (.bk-b-*).

import type { DefterBlok } from "../../lib/defterBicim";

/* ------------------------------------------------------------------ bloklar */

export default function DefterBlokGorunumu({ blok, renk }: { blok: DefterBlok; renk: string }) {
  const koyu = "#1a1a2e";
  switch (blok.tip) {
    case "baslik":
      return <h2 className="bk-b-baslik" style={{ color: renk }}>{blok.baslik}</h2>;

    case "altbaslik":
      return <h3 className="bk-b-altbaslik" style={{ color: renk, opacity: .85 }}>{blok.metin}</h3>;

    case "paragraf":
      return <p className="bk-b-paragraf">{blok.metin}</p>;

    case "liste":
      return (
        <div className="bk-b-liste">
          {blok.baslik ? (
            <div className="bk-b-altbaslik" style={{ color: renk, opacity: .85, paddingTop: 0 }}>
              {blok.baslik}
            </div>
          ) : null}
          {(blok.maddeler ?? []).map((m, i) => (
            <div className="satir" key={i}>
              <span className="ok" style={{ color: renk }}>→</span>
              <span className="yazi">{m}</span>
            </div>
          ))}
        </div>
      );

    case "adimlar":
      return (
        <div>
          {blok.baslik ? (
            <div className="bk-b-altbaslik" style={{ color: renk, opacity: .85, paddingTop: 0 }}>
              {blok.baslik}
            </div>
          ) : null}
          {(blok.adimlar ?? []).map((a, i) => (
            <div className="bk-b-adim" key={i}>
              <b style={{ color: renk }}>{i + 1}.</b>
              <span>{a}</span>
            </div>
          ))}
        </div>
      );

    case "tanim":
      return (
        <div className="bk-b-tanim" style={{ background: `${renk}12` }}>
          <b style={{ color: renk }}>{blok.terim}</b>
          <span>{blok.metin}</span>
        </div>
      );

    case "ornek":
      return (
        <div className="bk-b-serit" style={{ background: "#FFF9C4" }}>
          <i style={{ background: "#FBC02D" }} />
          <p style={{ color: "#5D4037" }}>{blok.metin}</p>
        </div>
      );

    case "uyari":
      return (
        <div className="bk-b-serit" style={{ background: "#FFF3E0" }}>
          <i style={{ background: "#FF8F00" }} />
          <p style={{ color: "#5D4037" }}>{blok.metin}</p>
        </div>
      );

    case "kural":
      return (
        <div className="bk-b-serit kural" style={{ background: `${renk}14` }}>
          <i style={{ background: renk }} />
          <p>{blok.metin}</p>
        </div>
      );

    case "formul":
      return (
        <div
          className="bk-b-formul"
          style={{ background: `${renk}14`, border: `1px solid ${renk}59`, color: koyu }}
        >
          {blok.metin}
        </div>
      );

    case "bilgi":
      return (
        <div
          className="bk-b-bilgi"
          style={{
            background: `${renk}1F`,
            border: `1.5px solid ${renk}73`,
            color: koyu,
            ["--balon-zemin" as string]: `${renk}1F`,
          } as React.CSSProperties}
        >
          {blok.metin}
        </div>
      );

    case "kalip":
      return <p className="bk-b-kalip">{blok.metin}</p>;

    case "problem":
      return (
        <div className="bk-b-problem">
          {blok.baslik ? <b style={{ color: renk }}>{blok.baslik}</b> : null}
          {blok.metin ? <span>{blok.metin}</span> : null}
        </div>
      );

    case "tablo":
      return (
        <div style={{ overflowX: "auto" }}>
          <table className="bk-b-tablo">
            {(blok.basliklar ?? []).length > 0 && (
              <thead>
                <tr>
                  {(blok.basliklar ?? []).map((h, i) => (
                    <th key={i} style={{ background: `${renk}47`, color: koyu }}>{h}</th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {(blok.satirlar ?? []).map((satir, i) => (
                <tr key={i}>
                  {satir.map((h, j) => <td key={j}>{h}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    default:
      return null;
  }
}

