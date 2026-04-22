

"use client";

import { useMemo, useState } from "react";
import { helpCenterData } from "@/data/help-center";

export default function YardimPage() {
  const [aktifKategori, setAktifKategori] = useState(
    helpCenterData[0].kategori
  );
  const [acikSoru, setAcikSoru] = useState<string | null>(null);
  const [arama, setArama] = useState("");

  const aktifKategoriData = useMemo(() => {
    return (
      helpCenterData.find((k) => k.kategori === aktifKategori) ??
      helpCenterData[0]
    );
  }, [aktifKategori]);

  const filtreliSorular = useMemo(() => {
    const q = arama.toLowerCase();
    if (!q) return aktifKategoriData.sorular;

    return aktifKategoriData.sorular.filter((soru) => {
      return (
        soru.baslik.toLowerCase().includes(q) ||
        soru.adimlar.some((a) => a.toLowerCase().includes(q))
      );
    });
  }, [arama, aktifKategoriData]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0C1A3F",
        color: "#EAF2FF",
        padding: "40px 20px",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ fontSize: 40, marginBottom: 10 }}>Yardım Merkezi</h1>
        <p style={{ color: "#C9D9F2", marginBottom: 30 }}>
          Bilkie ile ilgili yaşadığınız sorunlara hızlıca çözüm bulun.
        </p>

        {/* ARAMA */}
        <input
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          placeholder="Sorun ara..."
          style={{
            width: "100%",
            padding: 14,
            borderRadius: 12,
            marginBottom: 20,
            border: "none",
            background: "#1B2551",
            color: "white",
          }}
        />

        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {/* KATEGORİLER */}
          <div style={{ minWidth: 250 }}>
            {helpCenterData.map((k) => (
              <div
                key={k.kategori}
                onClick={() => {
                  setAktifKategori(k.kategori);
                  setAcikSoru(null);
                }}
                style={{
                  padding: 14,
                  marginBottom: 10,
                  borderRadius: 12,
                  cursor: "pointer",
                  background:
                    aktifKategori === k.kategori
                      ? "#4A538E"
                      : "#16214A",
                }}
              >
                {k.kategori}
              </div>
            ))}
          </div>

          {/* SORULAR */}
          <div style={{ flex: 1 }}>
            {filtreliSorular.map((soru) => {
              const acik = acikSoru === soru.id;

              return (
                <div
                  key={soru.id}
                  style={{
                    background: "#1B2551",
                    borderRadius: 14,
                    marginBottom: 12,
                  }}
                >
                  <div
                    onClick={() =>
                      setAcikSoru(acik ? null : soru.id)
                    }
                    style={{
                      padding: 16,
                      cursor: "pointer",
                      fontWeight: "bold",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    {soru.baslik}
                    <span>{acik ? "−" : "+"}</span>
                  </div>

                  {acik && (
                    <ol style={{ padding: "0 20px 16px" }}>
                      {soru.adimlar.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ol>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}