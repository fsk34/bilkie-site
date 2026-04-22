import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gizlilik Politikası | Bilkie",
  description: "Bilkie uygulaması gizlilik politikası ve kişisel veri işleme bildirimi.",
};

const sections = [
  {
    title: "1. Giriş",
    content:
      "Bilkie olarak kişisel verilerinizin korunmasını ciddiye alıyoruz. Bu politika, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında hangi verileri topladığımızı, nasıl kullandığımızı ve nasıl koruduğumuzu açıklamaktadır.",
  },
  {
    title: "2. Toplanan Veriler",
    subsections: [
      {
        subtitle: "a) Hesap Bilgileri",
        items: [
          "E-posta adresi (kayıt ve giriş için)",
          "Kullanıcı adı ve görünen ad",
          "Profil fotoğrafı / avatar seçimi",
        ],
      },
      {
        subtitle: "b) Kullanım Verileri",
        items: [
          "Uygulama içi ilerleme (çözülen testler, okunan defterler, puan, başarımlar)",
          "Seri ve lig bilgileri",
          "Bildirim tercihleri ve ses ayarları",
        ],
      },
      {
        subtitle: "c) Teknik Veriler",
        items: [
          "Cihaz türü ve işletim sistemi sürümü",
          "Uygulama kullanım süreleri (anonim)",
        ],
      },
    ],
    note: "Bilkie, 13 yaşından küçük kullanıcılara ait verileri bilerek toplamaz. Bir ebeveyn olarak çocuğunuzun hesap oluşturduğunu düşünüyorsanız bizimle iletişime geçiniz.",
  },
  {
    title: "3. Verilerin Kullanım Amacı",
    content: "Topladığımız veriler yalnızca şu amaçlarla kullanılır:",
    items: [
      "Hesap oluşturma ve kimlik doğrulama",
      "Eğitim içeriğini kişiselleştirme ve ilerleme takibi",
      "Lig sıralamalarını oluşturma",
      "Bildirim gönderme (tercihe bağlı)",
      "Uygulama performansını iyileştirme",
    ],
  },
  {
    title: "4. Üçüncü Taraf Hizmetleri",
    thirdParties: [
      {
        name: "Google Firebase",
        desc: "Kimlik doğrulama, veri depolama ve bulut altyapısı için kullanılmaktadır. Veriler Google sunucularında işlenebilir.",
        link: { label: "Google Gizlilik Politikası", url: "https://policies.google.com/privacy" },
      },
      {
        name: "Google Sign-In",
        desc: "İsteğe bağlı Google hesabıyla giriş için kullanılmaktadır.",
      },
      {
        name: "Google AdMob",
        desc: "Yalnızca kullanıcının kendi isteğiyle izlediği ödüllü reklamlar için kullanılmaktadır. AdMob reklam tanımlayıcıları toplayabilir.",
        link: { label: "AdMob Gizlilik Politikası", url: "https://support.google.com/admob/answer/6128543" },
      },
    ],
  },
  {
    title: "5. Yurt Dışı Veri Aktarımı",
    content:
      "Google Firebase altyapısı nedeniyle verileriniz yurt dışındaki sunucularda işlenebilir. KVKK Madde 9 kapsamında bu aktarım için kayıt sırasında açık rızanız alınmaktadır. Açık rızanızı geri almak istediğinizde destek@bilkie.app adresi üzerinden hesabınızın silinmesini talep edebilirsiniz.",
  },
  {
    title: "6. Veri Güvenliği",
    content:
      "Verileriniz Google Firebase altyapısında şifreli olarak saklanmaktadır. Yetkisiz erişimi önlemek için Firebase güvenlik kuralları uygulanmaktadır. Veri ihlali tespit edilmesi halinde KVK Kurulu'na 72 saat içinde bildirim yapılır ve etkilenen kullanıcılar bilgilendirilir.",
  },
  {
    title: "7. Veri Paylaşımı",
    content:
      "Kişisel verileriniz hiçbir koşulda üçüncü taraflara satılmaz. Veriler yalnızca yukarıda belirtilen hizmet sağlayıcılarla ve yasal zorunluluklar gerektirdiğinde yetkili makamlarla paylaşılır.",
  },
  {
    title: "8. Veri Saklama Süresi",
    content:
      "Verileriniz hesabınız aktif olduğu sürece saklanır. Hesabınızı silmeniz durumunda kişisel verileriniz 30 gün içinde sistemlerimizden kalıcı olarak silinir.",
  },
  {
    title: "9. Haklarınız (KVKK Madde 11)",
    content: "KVKK kapsamında aşağıdaki haklara sahipsiniz:",
    items: [
      "Kişisel verilerinizin işlenip işlenmediğini öğrenme",
      "İşlenmişse buna ilişkin bilgi talep etme",
      "Yanlış veya eksik verilerin düzeltilmesini isteme",
      "Verilerin silinmesini talep etme",
      "İşlemeye itiraz etme",
      "Veri aktarımı hakkında bilgi alma",
    ],
    note: "Bu haklarınızı kullanmak için destek@bilkie.app adresine yazabilir ya da kvkk.gov.tr üzerinden KVK Kurumu'na başvurabilirsiniz.",
  },
  {
    title: "10. Politika Değişiklikleri",
    content:
      "Bu politika güncellendiğinde yeni versiyon uygulama içinde ve web sitemizde yayımlanır. Önemli değişiklikler e-posta yoluyla da bildirilecektir.",
  },
  {
    title: "11. İletişim",
    content: "Bilkie — destek@bilkie.app",
  },
];

export default function GizlilikPage() {
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
            Gizlilik Politikası
          </h1>
          <p style={{ color: "#8FB3D9", fontSize: "14px" }}>
            Son güncelleme: Nisan 2025
          </p>
        </div>

        {/* Bölümler */}
        <div
          style={{
            background: "#0F203B",
            border: "1px solid #31496E",
            borderRadius: "22px",
            overflow: "hidden",
          }}
        >
          {sections.map((section, i) => (
            <div
              key={i}
              style={{
                padding: "24px 28px",
                borderTop: i === 0 ? "none" : "1px solid #1E3558",
              }}
            >
              <h2
                style={{
                  fontSize: "17px",
                  fontWeight: 700,
                  color: "#EAF2FF",
                  marginBottom: "10px",
                }}
              >
                {section.title}
              </h2>

              {section.content && (
                <p
                  style={{
                    color: "#C9D9F2",
                    fontSize: "15px",
                    lineHeight: 1.8,
                    marginBottom: section.items || section.subsections ? "10px" : 0,
                  }}
                >
                  {section.content}
                </p>
              )}

              {section.items && (
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: "20px",
                    color: "#C9D9F2",
                    fontSize: "15px",
                    lineHeight: 1.9,
                  }}
                >
                  {section.items.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              )}

              {section.subsections && (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {section.subsections.map((sub, j) => (
                    <div key={j}>
                      <p
                        style={{
                          color: "#EAF2FF",
                          fontSize: "14px",
                          fontWeight: 600,
                          marginBottom: "6px",
                        }}
                      >
                        {sub.subtitle}
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
                        {sub.items.map((item, k) => (
                          <li key={k}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {section.thirdParties && (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {section.thirdParties.map((tp, j) => (
                    <div
                      key={j}
                      style={{
                        background: "#0C1A3F",
                        border: "1px solid #1E3558",
                        borderRadius: "12px",
                        padding: "14px 16px",
                      }}
                    >
                      <p
                        style={{
                          color: "#EAF2FF",
                          fontWeight: 700,
                          fontSize: "15px",
                          marginBottom: "6px",
                        }}
                      >
                        {tp.name}
                      </p>
                      <p
                        style={{
                          color: "#C9D9F2",
                          fontSize: "14px",
                          lineHeight: 1.7,
                          marginBottom: tp.link ? "8px" : 0,
                        }}
                      >
                        {tp.desc}
                      </p>
                      {tp.link && (
                        <a
                          href={tp.link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "#55C7FF", fontSize: "13px", textDecoration: "none" }}
                        >
                          {tp.link.label} →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {section.note && (
                <p
                  style={{
                    marginTop: "12px",
                    color: "#8FB3D9",
                    fontSize: "13px",
                    lineHeight: 1.7,
                    fontStyle: "italic",
                  }}
                >
                  {section.note}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Alt bağlantı */}
        <div style={{ textAlign: "center", marginTop: "32px" }}>
          <a
            href="https://www.bilkie.com/sartlar"
            style={{
              color: "#55C7FF",
              fontSize: "15px",
              textDecoration: "none",
            }}
          >
            Kullanım Şartları'nı görüntüle →
          </a>
        </div>
      </div>
    </main>
  );
}
