

"use client";

import { useState } from "react";

const konuBasliklari = [
  "Uygulama Sorunları",
  "Hesap / Giriş Sorunları",
  "Puan / Seri / Ödül Sorunları",
  "İçerik Sorunları",
  "Öneri",
  "Diğer",
];

export default function GeriBildirimPage() {
  const [seciliKonu, setSeciliKonu] = useState(konuBasliklari[0]);
  const [mesaj, setMesaj] = useState("");
  const [email, setEmail] = useState("");
  const [gonderildi, setGonderildi] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Şimdilik backend yok → mailto ile açabiliriz
    const subject = encodeURIComponent(`Bilkie Geri Bildirim - ${seciliKonu}`);
    const body = encodeURIComponent(
      `Konu: ${seciliKonu}\n\nMesaj:\n${mesaj}\n\nİletişim (opsiyonel): ${email}`
    );

    window.location.href = `mailto:info@bilkie.com?subject=${subject}&body=${body}`;

    setGonderildi(true);
  };

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
            Geri Bildirim Gönder
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
            Yaşadığınız sorunu veya önerinizi bize iletin. Ne kadar detay
            paylaşırsanız size o kadar hızlı yardımcı olabiliriz.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            background: "#0F203B",
            border: "1px solid #31496E",
            borderRadius: "22px",
            padding: "22px 18px",
          }}
        >
          {/* KONU */}
          <div style={{ marginBottom: "18px" }}>
            <label
              style={{
                display: "block",
                fontSize: "15px",
                fontWeight: 700,
                marginBottom: "8px",
              }}
            >
              Konu
            </label>

            <select
              value={seciliKonu}
              onChange={(e) => setSeciliKonu(e.target.value)}
              style={{
                width: "100%",
                background: "#12264A",
                color: "#EAF2FF",
                border: "1px solid #31496E",
                borderRadius: "14px",
                padding: "14px 16px",
                fontSize: "15px",
                outline: "none",
              }}
            >
              {konuBasliklari.map((konu) => (
                <option key={konu} value={konu}>
                  {konu}
                </option>
              ))}
            </select>
          </div>

          {/* MESAJ */}
          <div style={{ marginBottom: "18px" }}>
            <label
              style={{
                display: "block",
                fontSize: "15px",
                fontWeight: 700,
                marginBottom: "8px",
              }}
            >
              Açıklama
            </label>

            <textarea
              value={mesaj}
              onChange={(e) => setMesaj(e.target.value)}
              required
              placeholder="Sorununuzu detaylı şekilde yazın..."
              style={{
                width: "100%",
                minHeight: "140px",
                resize: "vertical",
                background: "#12264A",
                color: "#EAF2FF",
                border: "1px solid #31496E",
                borderRadius: "14px",
                padding: "14px 16px",
                fontSize: "15px",
                outline: "none",
              }}
            />
          </div>

          {/* EMAIL */}
          <div style={{ marginBottom: "22px" }}>
            <label
              style={{
                display: "block",
                fontSize: "15px",
                fontWeight: 700,
                marginBottom: "8px",
              }}
            >
              E-posta (isteğe bağlı)
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Geri dönüş için e-posta"
              style={{
                width: "100%",
                background: "#12264A",
                color: "#EAF2FF",
                border: "1px solid #31496E",
                borderRadius: "14px",
                padding: "14px 16px",
                fontSize: "15px",
                outline: "none",
              }}
            />
          </div>

          {/* SUBMIT */}
          <button
            type="submit"
            style={{
              width: "100%",
              background: "#F3A24C",
              color: "#0C1A3F",
              border: "none",
              borderRadius: "999px",
              padding: "16px",
              fontWeight: 800,
              fontSize: "16px",
              cursor: "pointer",
            }}
          >
            Geri Bildirim Gönder
          </button>

          {gonderildi && (
            <p
              style={{
                marginTop: "14px",
                color: "#8FD1A8",
                fontSize: "14px",
              }}
            >
              Mail uygulamanız açıldı. Gönder butonuna basmayı unutmayın.
            </p>
          )}
        </form>
      </div>
    </main>
  );
}