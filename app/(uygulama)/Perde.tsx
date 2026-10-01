// Tam ekran bilgi perdesi — test/quiz gibi Kabuk'suz ekranların yükleniyor/hata/bitiş
// hâli. Ortada kısa metin + altına düğmeler. (Eskiden test sayfasının içinde özeldi.)

import Link from "next/link";
import UcNokta from "./UcNokta";

/** `nokta`: metin yerine Android ThreeDotLoader (yükleme hâli); metin yalnız erişilebilirlik etiketi olur.
 *  `cikis`: sol üstte çıkış ikonu (yükleniyor/hata hâlinde de ekrandan çıkılabilsin) — adres verilirse bağlantı. */
export default function Perde({ metin, nokta = false, cikis, children }: {
  metin: string; nokta?: boolean; cikis?: string; children?: React.ReactNode;
}) {
  return (
    <div className="bk" style={{ display: "grid", placeItems: "center", minHeight: "100vh", padding: 24, position: "relative" }}>
      {cikis && (
        <Link className="bk-cikis" aria-label="Çık" href={cikis} style={{ position: "absolute", top: 16, left: 16 }}>
          <img src="/uygulama/cikis.png" alt="" />
        </Link>
      )}
      <div style={{ textAlign: "center", display: "grid", gap: 18, justifyItems: "center" }}>
        {nokta ? <UcNokta etiket={metin} /> : <p className="bk-soluk" style={{ fontSize: 16, maxWidth: 420 }}>{metin}</p>}
        {children}
      </div>
    </div>
  );
}
