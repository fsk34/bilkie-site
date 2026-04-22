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
    const q = arama.trim().toLowerCase();
    if (!q) return aktifKategoriData.sorular;

    return aktifKategoriData.sorular.filter((soru) =>
      soru.baslik.toLowerCase().includes(q) ||
      soru.adimlar.some((adim) => adim.toLowerCase().includes(q))
    );
  }, [arama, aktifKategoriData]);

  return (
    <main style={{ minHeight: "100vh", background: "#F7F9FC", color: "#0C1A3F" }}>
      <section
        style={{
          background: "linear-gradient(180deg, #EEF4FF 0%, #F7F9FC 100%)",
          padding: "72px 20px 48px",
          borderBottom: "1px solid #E4EAF5",
        }}
      >
        <div style={{ maxWidth: 1120, margin: "0 auto", textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              padding: "8px 14px",
              borderRadius: 999,
              background: "#DCE9FF",
              color: "#4A538E",
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            Bilkie Destek
          </div>

          <h1 style={{ fontSize: "clamp(36px,6vw,60px)", fontWeight: 800, marginBottom: 10 }}>
            Sana nasıl yardımcı olabiliriz?
          </h1>

          <p style={{ maxWidth: 700, margin: "0 auto 24px", color: "#5E6C8F" }}>
            Hesap, XP, seri, testler ve uygulama ile ilgili sorunlara hızlıca çözüm bul.
          </p>

          <div
            style={{
              maxWidth: 700,
              margin: "0 auto",
              background: "white",
              borderRadius: 16,
              padding: 8,
              boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
            }}
          >
            <input
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              placeholder="Sorun ara..."
              style={{ width: "100%", border: "none", outline: "none", padding: 14 }}
            />
          </div>
        </div>
      </section>

      <section style={{ padding: "32px 20px 80px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
              gap: 16,
              marginBottom: 24,
            }}
          >
            {helpCenterData.map((k) => {
              const aktif = k.kategori === aktifKategori;

              return (
                <button
                  key={k.kategori}
                  onClick={() => {
                    setAktifKategori(k.kategori);
                    setAcikSoru(null);
                    setArama("");
                  }}
                  style={{
                    padding: 20,
                    borderRadius: 20,
                    background: aktif ? "#EEF4FF" : "white",
                    border: aktif ? "2px solid #4A538E" : "1px solid #E1E7F0",
                    cursor: "pointer",
                  }}
                >
                  <strong>{k.kategori}</strong>
                  <div style={{ fontSize: 13, color: "#68779A" }}>
                    {k.sorular.length} soru
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ background: "white", borderRadius: 20, padding: 20 }}>
            {filtreliSorular.map((soru) => {
              const acik = acikSoru === soru.id;

              return (
                <div key={soru.id} style={{ borderTop: "1px solid #eee" }}>
                  <button
                    onClick={() => setAcikSoru(acik ? null : soru.id)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: 16,
                      display: "flex",
                      justifyContent: "space-between",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                    }}
                  >
                    {soru.baslik}
                    <span>{acik ? "−" : "+"}</span>
                  </button>

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
      </section>
    </main>
  );
}