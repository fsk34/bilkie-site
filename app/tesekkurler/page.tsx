

"use client";

import { useState } from "react";
import { tesekkurlerData } from "@/data/tesekkurler";

export default function TesekkurlerPage() {
  const [acikBolum, setAcikBolum] = useState<string | null>("kaynaklar");

  const bolumAcik = acikBolum === "kaynaklar";

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
            {tesekkurlerData.title}
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
            Uygulamada kullanılan bazı ikon ve görseller için kaynak ve atıf
            bilgilerini bu sayfada bulabilirsiniz.
          </p>
        </div>

        <div
          style={{
            background: "#0F203B",
            border: "1px solid #31496E",
            borderRadius: "22px",
            overflow: "hidden",
            marginBottom: "28px",
          }}
        >
          <button
            onClick={() => setAcikBolum(bolumAcik ? null : "kaynaklar")}
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
                fontSize: "20px",
                lineHeight: 1.4,
                fontWeight: 700,
              }}
            >
              Kaynaklar ve Atıflar
            </span>

            <span
              style={{
                flexShrink: 0,
                color: "#8FB3D9",
                fontSize: "24px",
                lineHeight: 1,
              }}
            >
              {bolumAcik ? "−" : "⌄"}
            </span>
          </button>

          {bolumAcik && (
            <div
              style={{
                padding: "0 18px 22px 18px",
                color: "#C9D9F2",
              }}
            >
              <div style={{ marginBottom: "18px" }}>
                {tesekkurlerData.paragraphs.map((paragraph, index) => (
                  <p
                    key={index}
                    style={{
                      fontSize: "15px",
                      lineHeight: 1.8,
                      marginBottom: "12px",
                    }}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>

              <div
                style={{
                  background: "#12264A",
                  border: "1px solid #31496E",
                  borderRadius: "18px",
                  padding: "14px",
                  maxHeight: "420px",
                  overflowY: "auto",
                }}
              >
                {tesekkurlerData.links.map((link, index) => (
                  <a
                    key={`${link.href}-${index}`}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "block",
                      color: "#AFC6E6",
                      textDecoration: "none",
                      padding: "10px 8px",
                      borderBottom:
                        index === tesekkurlerData.links.length - 1
                          ? "none"
                          : "1px solid #31496E",
                      fontSize: "14px",
                      lineHeight: 1.6,
                      wordBreak: "break-word",
                    }}
                  >
                    {link.text} — {link.href}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            background: "#12264A",
            border: "1px solid #31496E",
            borderRadius: "22px",
            padding: "22px 18px",
          }}
        >
          <h2
            style={{
              fontSize: "22px",
              lineHeight: 1.2,
              fontWeight: 800,
              marginBottom: "10px",
              color: "#EAF2FF",
            }}
          >
            Lisans ve kullanım notu
          </h2>

          <p
            style={{
              color: "#C9D9F2",
              lineHeight: 1.8,
              fontSize: "15px",
              marginBottom: 0,
            }}
          >
            Bilkie içinde kullanılan üçüncü taraf ikon ve görseller, ilgili
            lisans şartlarına uygun şekilde kullanılmaktadır. Gerekli görülen
            durumlarda bu sayfa güncellenebilir.
          </p>
        </div>
      </div>
    </main>
  );
}