import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hesap Silme | Bilkie",
  description: "Bilkie uygulamasında hesabınızı ve ilişkili verilerinizi nasıl silebileceğinizi öğrenin.",
};

const steps = [
  "Bilkie uygulamasını açın ve hesabınıza giriş yapın.",
  "Alt menüden Profil sekmesine gidin.",
  "Sağ üst köşedeki ayarlar simgesine dokunun.",
  "\"HESABI SİL\" butonuna dokunun.",
  "Açılan onay penceresinde \"Evet, Sil\" seçeneğini onaylayın.",
  "Google ile giriş yaptıysanız kimliğinizi doğrulamanız istenecektir.",
];

const deletedData = [
  "Profil bilgileri (ad, e-posta, kullanıcı adı, avatar)",
  "Tüm öğrenme ilerlemesi (testler, defterler, yazılılar)",
  "Başarımlar ve rozetler",
  "XP puanı ve lig sıralaması",
  "Seri ve günlük aktivite verileri",
  "Görev geçmişi ve istatistikler",
];

export default function HesapSilmePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0C1A3F",
        color: "#EAF2FF",
        padding: "32px 16px 72px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "860px", margin: "0 auto" }}>
        {/* Başlık */}
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <h1
            style={{
              fontSize: "clamp(28px, 7vw, 48px)",
              lineHeight: 1.1,
              fontWeight: 800,
              marginBottom: "12px",
            }}
          >
            Hesap Silme
          </h1>
          <p style={{ color: "#8FB3D9", fontSize: "14px" }}>
            Bilkie — Hesabınızı ve verilerinizi kalıcı olarak silin
          </p>
        </div>

        <div
          style={{
            background: "#0F203B",
            border: "1px solid #31496E",
            borderRadius: "22px",
            overflow: "hidden",
          }}
        >
          {/* Adımlar */}
          <div style={{ padding: "24px 28px", borderBottom: "1px solid #1E3558" }}>
            <h2
              style={{
                fontSize: "17px",
                fontWeight: 700,
                color: "#EAF2FF",
                marginBottom: "16px",
              }}
            >
              Hesabınızı Nasıl Silebilirsiniz?
            </h2>
            <ol
              style={{
                margin: 0,
                paddingLeft: "22px",
                color: "#C9D9F2",
                fontSize: "15px",
                lineHeight: 2,
              }}
            >
              {steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>

          {/* Silinen veriler */}
          <div style={{ padding: "24px 28px", borderBottom: "1px solid #1E3558" }}>
            <h2
              style={{
                fontSize: "17px",
                fontWeight: 700,
                color: "#EAF2FF",
                marginBottom: "10px",
              }}
            >
              Silinen Veriler
            </h2>
            <p style={{ color: "#C9D9F2", fontSize: "15px", lineHeight: 1.8, marginBottom: "10px" }}>
              Hesabınızı sildiğinizde aşağıdaki veriler kalıcı olarak silinir:
            </p>
            <ul
              style={{
                margin: 0,
                paddingLeft: "20px",
                color: "#C9D9F2",
                fontSize: "15px",
                lineHeight: 1.9,
              }}
            >
              {deletedData.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Saklama süresi */}
          <div style={{ padding: "24px 28px", borderBottom: "1px solid #1E3558" }}>
            <h2
              style={{
                fontSize: "17px",
                fontWeight: 700,
                color: "#EAF2FF",
                marginBottom: "10px",
              }}
            >
              Veri Saklama Süresi
            </h2>
            <p style={{ color: "#C9D9F2", fontSize: "15px", lineHeight: 1.8 }}>
              Silme işlemi tamamlandığında tüm kişisel verileriniz sistemlerimizden anında kaldırılır.
              Herhangi bir ek saklama süresi uygulanmaz. Silinen veriler kurtarılamaz.
            </p>
          </div>

          {/* İletişim */}
          <div style={{ padding: "24px 28px" }}>
            <h2
              style={{
                fontSize: "17px",
                fontWeight: 700,
                color: "#EAF2FF",
                marginBottom: "10px",
              }}
            >
              Yardım
            </h2>
            <p style={{ color: "#C9D9F2", fontSize: "15px", lineHeight: 1.8 }}>
              Hesabınızı uygulama üzerinden silemiyorsanız{" "}
              <a
                href="mailto:info@bilkie.com"
                style={{ color: "#55C7FF", textDecoration: "none" }}
              >
                info@bilkie.com
              </a>{" "}
              adresine e-posta göndererek silme talebinde bulunabilirsiniz.
            </p>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: "32px" }}>
          <a
            href="https://www.bilkie.com/gizlilik"
            style={{ color: "#55C7FF", fontSize: "15px", textDecoration: "none" }}
          >
            Gizlilik Politikası'nı görüntüle →
          </a>
        </div>
      </div>
    </main>
  );
}
