import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kullanım Şartları | Bilkie",
  description: "Bilkie uygulaması kullanım şartları ve koşulları.",
};

const sections = [
  {
    title: "1. Kabul",
    content:
      "Bilkie uygulamasını ("Uygulama") kullanarak aşağıdaki şartları kabul etmiş sayılırsınız. 13 yaşından küçük kullanıcıların Uygulamayı yalnızca ebeveyn veya veli gözetiminde kullanması gerekmektedir.",
  },
  {
    title: "2. Hizmetin Kapsamı",
    content:
      "Bilkie; ilkokul ve ortaokul öğrencilerine yönelik konu testleri, konu defterleri ve yazılı sınavı hazırlık materyalleri sunan bir eğitim uygulamasıdır. Uygulama içindeki puan, başarım, seri ve lig sistemleri tamamen eğlence ve motivasyon amaçlıdır; herhangi bir maddi değer taşımaz.",
  },
  {
    title: "3. Hesap",
    items: [
      "Uygulamayı kullanabilmek için geçerli bir e-posta adresiyle veya Google hesabıyla kayıt olmanız gerekmektedir.",
      "Hesap bilgilerinizin güvenliğini korumak sizin sorumluluğunuzdadır.",
      "Gerçeğe aykırı bilgi girerek hesap oluşturmak yasaktır.",
      "Hesabınızı başkasına devredemezsiniz.",
    ],
  },
  {
    title: "4. Kabul Edilemez Kullanım",
    content: "Aşağıdaki kullanımlar kesinlikle yasaktır:",
    items: [
      "Uygulamayı tersine mühendislik, kopyalama veya izinsiz dağıtma",
      "Sistemlere yetkisiz erişim girişiminde bulunma",
      "Diğer kullanıcılara zarar verecek içerik üretme veya paylaşma",
      "Otomatik araçlarla (bot, script) veri toplama",
    ],
  },
  {
    title: "5. Fikri Mülkiyet",
    content:
      "Uygulamada yer alan tüm içerik (görseller, metinler, ses dosyaları, tasarım) Bilkie'ye aittir ve Türk Fikir ve Sanat Eserleri Kanunu kapsamında korunmaktadır. İzinsiz kullanım yasaktır.",
  },
  {
    title: "6. Reklamlar",
    content:
      "Uygulama, Google AdMob aracılığıyla isteğe bağlı ödüllü reklamlar içerebilir. Reklamlar zorunlu değildir ve yalnızca kullanıcının kendi isteğiyle gösterilir.",
  },
  {
    title: "7. Hizmetin Askıya Alınması",
    content:
      "Kullanım şartlarını ihlal etmeniz durumunda hesabınız önceden bildirim yapılmaksızın askıya alınabilir veya silinebilir.",
  },
  {
    title: "8. Sorumluluk Sınırı",
    content:
      "Bilkie, Uygulamanın kesintisiz veya hatasız çalışacağını garanti etmez. Teknik arızalardan, veri kayıplarından veya üçüncü taraf hizmetlerinden kaynaklanabilecek zararlardan Bilkie sorumlu tutulamaz.",
  },
  {
    title: "9. Değişiklikler",
    content:
      "Bu şartlar önceden bildirim yapılmaksızın güncellenebilir. Güncel şartlar her zaman uygulama içinde ve web sitemizde yayımlanır. Uygulamayı kullanmaya devam etmeniz güncel şartları kabul ettiğiniz anlamına gelir.",
  },
  {
    title: "10. İletişim",
    content: "Sorularınız için destek@bilkie.app adresine yazabilirsiniz.",
  },
];

export default function SartlarPage() {
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
            Kullanım Şartları
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
                    marginBottom: section.items ? "10px" : 0,
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
            </div>
          ))}
        </div>

        {/* Alt bağlantı */}
        <div style={{ textAlign: "center", marginTop: "32px" }}>
          <a
            href="https://www.bilkie.com/gizlilik"
            style={{
              color: "#55C7FF",
              fontSize: "15px",
              textDecoration: "none",
            }}
          >
            Gizlilik Politikası'nı görüntüle →
          </a>
        </div>
      </div>
    </main>
  );
}
