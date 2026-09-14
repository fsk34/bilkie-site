// Tam ekran bilgi perdesi — test/quiz gibi Kabuk'suz ekranların yükleniyor/hata/bitiş
// hâli. Ortada kısa metin + altına düğmeler. (Eskiden test sayfasının içinde özeldi.)

import UcNokta from "./UcNokta";

/** `nokta`: metin yerine Android ThreeDotLoader (yükleme hâli); metin yalnız erişilebilirlik etiketi olur. */
export default function Perde({ metin, nokta = false, children }: { metin: string; nokta?: boolean; children?: React.ReactNode }) {
  return (
    <div className="bk" style={{ display: "grid", placeItems: "center", minHeight: "100vh", padding: 24 }}>
      <div style={{ textAlign: "center", display: "grid", gap: 18, justifyItems: "center" }}>
        {nokta ? <UcNokta etiket={metin} /> : <p className="bk-soluk" style={{ fontSize: 16, maxWidth: 420 }}>{metin}</p>}
        {children}
      </div>
    </div>
  );
}
