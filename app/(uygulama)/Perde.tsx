// Tam ekran bilgi perdesi — test/quiz gibi Kabuk'suz ekranların yükleniyor/hata/bitiş
// hâli. Ortada kısa metin + altına düğmeler. (Eskiden test sayfasının içinde özeldi.)

export default function Perde({ metin, children }: { metin: string; children?: React.ReactNode }) {
  return (
    <div className="bk" style={{ display: "grid", placeItems: "center", minHeight: "100vh", padding: 24 }}>
      <div style={{ textAlign: "center", display: "grid", gap: 18, justifyItems: "center" }}>
        <p className="bk-soluk" style={{ fontSize: 16, maxWidth: 420 }}>{metin}</p>
        {children}
      </div>
    </div>
  );
}
