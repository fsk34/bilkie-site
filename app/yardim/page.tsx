"use client";

import { useState } from "react";
import { helpCenterData } from "@/data/help-center";

export default function YardimPage() {
  const [acikSoru, setAcikSoru] = useState<string | null>(null);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0C1A3F",
        color: "#EAF2FF",
        padding: "32px 16px 72px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "860px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: "28px",
          }}
        >
          <h1
            style={{
              fontSize: "clamp(32px, 8vw, 52px)",
              lineHeight: 1.1,
              fontWeight: 800,
              marginBottom: "12px",
            }}
          >
            Yardım Merkezi
          </h1>

          <p
            style={{
              maxWidth: "620px",
              margin: "0 auto",
              color: "#B9CAE9",
              fontSize: "16px",
              lineHeight: 1.7,
            }}
          >
            Bilkie ile ilgili en sık sorulan konulara ve temel çözüm adımlarına
            buradan ulaşabilirsiniz.
          </p>
        </div>

        {helpCenterData.map((kategori, kategoriIndex) => (
          <section
            key={kategori.kategori}
            style={{
              marginBottom: kategoriIndex === helpCenterData.length - 1 ? 0 : "30px",
            }}
          >
            <h2
              style={{
                fontSize: "24px",
                lineHeight: 1.2,
                fontWeight: 800,
                marginBottom: "14px",
                color: "#EAF2FF",
              }}
            >
              {kategori.kategori}
            </h2>

            <div
              style={{
                background: "#0F203B",
                border: "1px solid #31496E",
                borderRadius: "22px",
                overflow: "hidden",
              }}
            >
              {kategori.sorular.map((soru, soruIndex) => {
                const acik = acikSoru === soru.id;

                return (
                  <div
                    key={soru.id}
                    style={{
                      borderTop:
                        soruIndex === 0 ? "none" : "1px solid #31496E",
                    }}
                  >
                    <button
                      onClick={() => setAcikSoru(acik ? null : soru.id)}
                      style={{
                        width: "100%",
                        background: "transparent",
                        border: "none",
                        color: "#EAF2FF",
                        textAlign: "left",
                        padding: "20px 18px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "16px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "18px",
                          lineHeight: 1.5,
                          fontWeight: 500,
                        }}
                      >
                        {soru.baslik}
                      </span>

                      <span
                        style={{
                          flexShrink: 0,
                          color: "#8FB3D9",
                          fontSize: "24px",
                          lineHeight: 1,
                        }}
                      >
                        {acik ? "−" : "⌄"}
                      </span>
                    </button>

                    {acik && (
                      <div
                        style={{
                          padding: "0 18px 20px 18px",
                          color: "#C9D9F2",
                        }}
                      >
                        <ol
                          style={{
                            margin: 0,
                            paddingLeft: "20px",
                            lineHeight: 1.8,
                            fontSize: "15px",
                          }}
                        >
                          {soru.adimlar.map((adim, index) => (
                            <li key={index} style={{ marginBottom: "6px" }}>
                              {adim}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <div
          style={{
            marginTop: "34px",
            background: "#12264A",
            border: "1px solid #31496E",
            borderRadius: "22px",
            padding: "22px 18px",
          }}
        >
          <h3
            style={{
              fontSize: "22px",
              lineHeight: 1.2,
              fontWeight: 800,
              marginBottom: "10px",
              color: "#EAF2FF",
            }}
          >
            Aradığınız cevabı bulamadınız mı?
          </h3>

          <p
            style={{
              color: "#C9D9F2",
              lineHeight: 1.8,
              fontSize: "15px",
              marginBottom: "16px",
            }}
          >
            Sorununuzu bize geri bildirim formu üzerinden iletebilirsiniz. Ekran görüntüsü,
            sınıf, ders veya yaşadığınız bölüm bilgisini eklerseniz daha hızlı
            yardımcı olabiliriz.
          </p>

          <a
            href="/yardim/geribildirim"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#F3A24C",
              color: "#0C1A3F",
              textDecoration: "none",
              padding: "14px 20px",
              borderRadius: "999px",
              fontWeight: 800,
            }}
          >
            Geri Bildirim Gönder
          </a>
        </div>
      </div>
    </main>
  );
}