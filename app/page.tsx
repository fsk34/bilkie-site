import localFont from "next/font/local";
import AkanGaleri from "./components/AkanGaleri";
import KaydirBelir from "./components/KaydirBelir";
import PhoneFrame from "./components/PhoneFrame";
import OyunVitrini from "./components/OyunVitrini";
import BlokAkisKapi from "./components/BlokAkisKapi";
import BlokYaziBelir from "./components/BlokYaziBelir";
import IstatistikVitrini from "./components/IstatistikVitrini";
import DersKupuKapi from "./components/DersKupuKapi";
import Havai from "./components/Havai";
import ProfilDeste from "./components/ProfilDeste";
import SeritImlec from "./components/SeritImlec";

/* FONTS */
const bilkieFont = localFont({
  src: "./fonts/bilkie.otf",
});

const bilkieAltFont = localFont({
  src: "./fonts/bilkiealt.ttf",
});

const baslikFont = localFont({
  src: "./fonts/baslik.otf",
});

const mainFont = localFont({
  src: "./fonts/main.ttf",
});

/** Hero'nun köşe motifleri (sağ üst gezegen/kitap/yıldız, sol alt bloklar).
 *  Akan galeri denenirken kapatıldı; true yapmak ikisini de geri getirir. */
const MOTIFLER = false;

export default function Page() {
  return (
    <main
      style={{
        background: "#0C1A3F",
        minHeight: "100vh",
        color: "white",
      }}
    >
           {/* HERO */}
      <section
        className="hero"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          textAlign: "center",
          padding: "24px 16px 40px",
          position: "relative",
          overflow: "hidden",
        }}
      >

        {/* AKAN GALERİ — hero'nun arka planı, yazının ve telefonun ARKASINDA.
            Süs olduğu için tıklanmıyor; sayfadaki tek gerçek eylem
            Google Play düğmesi ve onun önüne hiçbir şey geçmiyor. */}
        <AkanGaleri />

        {/* SAĞ ÜST MOTİF + SOL ALT MOTİF — ŞİMDİLİK KAPALI.
            Akan galeri arka plana geçince ikisi de onunla yarışıyordu.
            Silinmedi, tek bayrağa bağlandı: MOTIFLER = true geri getirir. */}
        {MOTIFLER && (
          <>
          {/* SAĞ ÜST MOTİF */}
          <div
            className="hero-right-motif"
            style={{
              position: "absolute",
              right: "110px",
              top: "150px",
              width: "320px",
              height: "230px",
              pointerEvents: "none",
              zIndex: 1,
            }}
          >
            {/* YÖRÜNGE ÇİZGİLERİ + HAREKET EDEN NOKTALAR */}
            <svg
              width="320"
              height="230"
              viewBox="0 0 320 230"
              style={{
                position: "absolute",
                inset: 0,
                overflow: "visible",
              }}
            >
              <g transform="rotate(-18 156 97)">
                <ellipse
                  cx="156"
                  cy="97"
                  rx="140"
                  ry="85"
                  fill="none"
                  stroke="rgba(167,160,214,0.8)"
                  strokeWidth="2"
                />
                <circle r="7" fill="#F3A24C">
                  <animateMotion
                    dur="10s"
                    repeatCount="indefinite"
                    rotate="0"
                    path="M 156 12 a 140 85 0 1 1 0 170 a 140 85 0 1 1 0 -170"
                  />
                </circle>
              </g>

              <g transform="rotate(22 159 109)">
                <ellipse
                  cx="159"
                  cy="109"
                  rx="135"
                  ry="75"
                  fill="none"
                  stroke="rgba(167,160,214,0.7)"
                  strokeWidth="2"
                />
                <circle r="10" fill="#A870E8">
                  <animateMotion
                    dur="8.5s"
                    repeatCount="indefinite"
                    rotate="0"
                    path="M 294 109 a 135 75 0 1 0 -270 0 a 135 75 0 1 0 270 0"
                  />
                </circle>
              </g>
            </svg>

            {/* KİTAP */}
            <div
              style={{
                position: "absolute",
                right: "88px",
                top: "34px",
                width: "72px",
                height: "98px",
                background: "#59A99D",
                borderRadius: "12px",
                boxShadow: "-13px 0 0 0 #4A538E",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: "15px",
                  top: "18px",
                  width: "30px",
                  height: "40px",
                  background: "#F1C83F",
                  borderRadius: "5px",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: "9px",
                    top: "12px",
                    width: "22px",
                    height: "5px",
                    background: "#F7F5F0",
                    borderRadius: "4px",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: "9px",
                    top: "21px",
                    width: "22px",
                    height: "5px",
                    background: "#F7F5F0",
                    borderRadius: "4px",
                  }}
                />
              </div>
              <div
                style={{
                  position: "absolute",
                  left: "6px",
                  bottom: "7px",
                  width: "60px",
                  height: "14px",
                  background: "#F7F5F0",
                  borderRadius: "10px",
                }}
              />
            </div>

            {/* TURUNCU HİLAL */}
            <div
              style={{
                position: "absolute",
                right: "166px",
                top: "12px",
                width: "74px",
                height: "84px",
                background: "#F3A24C",
                borderRadius: "50%",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  right: "-6px",
                  top: "0px",
                  width: "46px",
                  height: "84px",
                  background: "#0C1A3F",
                  borderRadius: "50%",
                }}
              />
            </div>

            {/* KÜÇÜK NOKTALAR */}

            {/* ÜÇGEN */}
            <div
              style={{
                position: "absolute",
                left: "74px",
                bottom: "18px",
                width: "0",
                height: "0",
                borderLeft: "26px solid transparent",
                borderRight: "26px solid transparent",
                borderBottom: "40px solid #7E8CFF",
              }}
            />

            {/* YILDIZ */}
            <div
              style={{
                position: "absolute",
                right: "48px",
                bottom: "56px",
                width: "48px",
                height: "48px",
                background: "#F1C83F",
                clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
              }}
            />
          </div>

          {/* SOL ALT MOTİF */}
          <div
            className="hero-left-motif"
            style={{
              position: "absolute",
              left: "60px",
              bottom: "60px",
              width: "260px",
              height: "220px",
              pointerEvents: "none",
              zIndex: 1,
            }}
          >
            {/* MOR KEMER */}
            <div
              style={{
                position: "absolute",
                left: "40px",
                bottom: "80px",
                width: "120px",
                height: "140px",
                background: "#4A538E",
                borderRadius: "70px 70px 0 0",
              }}
            />

            {/* TURUNCU DAİRE */}
            <div
              style={{
                position: "absolute",
                left: "0px",
                bottom: "0px",
                width: "120px",
                height: "120px",
                background: "#F3A24C",
                borderRadius: "50%",
              }}
            />

            {/* MAVİ TABAN */}
            <div
              style={{
                position: "absolute",
                left: "110px",
                bottom: "0px",
                width: "150px",
                height: "40px",
                background: "#86B7DD",
              }}
            />

            {/* KÜÇÜK MAVİ BLOK */}
            <div
              style={{
                position: "absolute",
                left: "90px",
                bottom: "0px",
                width: "50px",
                height: "80px",
                background: "#5874F0",
              }}
            />
          </div>
          </>
        )}

        <div className="hero-metin">
        <h1
          className={bilkieFont.className}
          style={{
            fontSize: "clamp(44px, 14vw, 80px)",
            marginBottom: "10px",
            color: "#8FB3D9",
            position: "relative",
            zIndex: 2,
          }}
        >
          bilkie
        </h1>

        <p
          className={bilkieAltFont.className}
          style={{
            fontSize: "clamp(16px, 4.8vw, 22px)",
            marginBottom: "28px",
            color: "#AFC6E6",
            position: "relative",
            zIndex: 2,
          }}
        >
          Öğrenciler için oyunlaştırılmış öğrenme
        </p>

        <div
          className="hero-rozetler"
          style={{
            display: "flex",
            gap: "20px",
            flexWrap: "wrap",
            justifyContent: "center",
            maxWidth: "560px",
            position: "relative",
            zIndex: 2,
          }}
        >
          {/* Bunlar eskiden <button> idi ve HİÇBİR YERE gitmiyordu —
              dekoratifti. Artık kendi bölümlerine götüren bağlantı.
              <a> seçildi, onClick DEĞİL: JavaScript çalışmasa da çalışır,
              sağ tıkla "yeni sekmede aç" beklendiği gibi davranır. */}
          <a href="#konu-testleri" className={baslikFont.className} style={btn("#D8C58A")}>
            Konu Testleri
          </a>

          <a href="#konu-defterleri" className={baslikFont.className} style={btn("#E6A893")}>
            Konu Defterleri
          </a>

          <a href="#yazililar" className={baslikFont.className} style={btn("#A6A0D6")}>
            Yazılılar
          </a>
        </div>

        {/* İNDİRME ÇAĞRISI — sayfada tıklanacak tek gerçek yer burasıydı ve yoktu.
            Üstteki üç düğme <button>, hiçbir yere gitmiyor (dekoratif).
            Ziyaretçi 12 ekran uygulamayı okuyup edinme yolu bulamıyordu. */}
        <div
          className="hero-cta"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "10px",
            marginTop: "34px",
            position: "relative",
            zIndex: 2,
          }}
        >
          <a
            href="https://play.google.com/store/apps/details?id=com.bilkie.app"
            target="_blank"
            rel="noopener"
            className={baslikFont.className}
            aria-label="Bilkie'yi Google Play'den indir"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "12px",
              background: "#8FB3D9",
              color: "#0C1A3F",
              textDecoration: "none",
              padding: "16px 30px",
              borderRadius: "999px",
              fontSize: "20px",
              boxShadow: "0 10px 26px rgba(143,179,217,0.28)",
            }}
          >
            <svg width="22" height="24" viewBox="0 0 24 26" aria-hidden="true">
              <path d="M2 1.5v23l13-11.5L2 1.5z" fill="#0C1A3F" />
              <path d="M15 13l4.6-4.1 2.6 1.5c1.1.6 1.1 2.6 0 3.2l-2.6 1.5L15 13z" fill="#0C1A3F" />
            </svg>
            Google Play&apos;den indir
          </a>
          <span
            className={mainFont.className}
            style={{ fontSize: "14px", color: "#8093B8" }}
          >
            App Store&apos;da yakında
          </span>
        </div>
        </div>

        {/* HERO GÖRSELİ — aşağıdan yükselip hafifçe sağa dönüyor.
            Elde tutulan cihaz düz bir görsel olduğu için gerçek bir katı
            cisim gibi davranmaz; elin kendi hacim ipuçları olduğundan açı
            eski telefondakinden de KÜÇÜK tutuldu (8°), yoksa "eğilmiş
            fotoğraf" gibi duruyor.
            WebP: elin cildi yumuşak geçişli, PNG'yi 190 renge indirince
            parmaklarda bantlanma çıkıyordu; tam renkli PNG ise 1 MB. */}
        <div className="hero-tel-sahne">
          <img
            className="hero-tel"
            src="/hero-el.webp"
            alt="Bilkie uygulaması — elde tutulan telefonda ana ekran: Yaz Kampı, Konu Testleri, Konu Defterleri, Yazılıya Hazırlık"
            width={960}
            height={1308}
          />
        </div>
      </section>

      <KaydirBelir />
      <SeritImlec />

      {/* NEDEN BİLKİE — GEÇİŞ BANDI
          Telefon görseli KALDIRILDI: hero'daki el görseliyle birebir aynı ana
          ekranı, üstelik cihaz kasası olmadan gösteriyordu — iki ekran arayla
          aynı resim. Bölüm artık tek işi yapıyor: hero'dan özellik turuna
          geçerken "niçin" sorusunu yanıtlayan kısa bir ara yazı.
          Sayfadaki TEK açık renkli bant burası; bilerek — koyu akışı bir yerde
          kesiyor ve bölünmeyi göz seçiyor. Diğer bölümler hero ile aynı
          lacivert. */}
      <section
        style={{
          background: "#86B7DD",
          padding: "clamp(44px, 9vw, 76px) 20px",
          textAlign: "center",
        }}
      >
        <h2
          className={bilkieFont.className}
          style={{
            fontSize: "clamp(30px, 9vw, 52px)",
            marginBottom: "18px",
            color: "#0C1A3F",
          }}
        >
          Neden bilkie?
        </h2>

        <p
          className={mainFont.className}
          style={{
            fontSize: "clamp(17px, 4.6vw, 21px)",
            color: "#0C1A3F",
            lineHeight: "1.5",
            fontWeight: 600,
            maxWidth: "640px",
            margin: "0 auto",
          }}
        >
          Sorun bilgiye ulaşmak değil, çalışmaya devam edebilmek.
          <br />
          bilkie öğrenmeyi küçük adımlara böler, her adımı puana çevirir ve
          düzenli çalışmayı alışkanlığa dönüştürür.
        </p>
      </section>

      {/* KONU TESTLERİ */}
      <section
        id="konu-testleri"
        style={{ ["--isik" as string]: "#F4E1B9", ["--isik-rgb" as string]: "244,225,185" }}
      >
        <div
          style={{
            background: "#0C1A3F",
            padding: "70px 20px 35px 20px",
            textAlign: "center",
          }}
        >
          <div className="bolum-no" aria-hidden="true">01</div>

          <h2
            className={baslikFont.className}
            style={{
              fontSize: "clamp(30px, 9vw, 52px)",
              marginBottom: "18px",
              color: "#8FB3D9",
            }}
          >
            Konu Testleri
          </h2>

          <p
            className={mainFont.className}
            style={{
              fontSize: "clamp(16px, 4.5vw, 20px)",
              color: "#AFC6E6",
              lineHeight: "1.4",
              fontWeight: 600,
              maxWidth: "760px",
              margin: "0 auto",
            }}
          >
            Konu testlerini çözerek konuların hakimi sen ol, bir adım öne geç.
          </p>
        </div>

        <div
          className="phones-section"
          style={{
            background: "#0C1A3F",
            padding: "70px 20px 80px 20px",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            gap: "50px",
            flexWrap: "wrap",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Eskiden burada eğri bir "ilerleme yolu" SVG'si vardı (yıldızlar,
              kesikli çizgi, glow). Kaldırıldı: telefonların arkasında ikinci bir
              görsel katman kuruyor, koyu zeminde de dikkati ekranlardan
              çalıyordu. Yerine tek bir ışık lekesi kondu (.sahne-isik) —
              kompozisyonu aynı şekilde topluyor ama okumayı bölmüyor. */}
          <div className="sahne-isik" aria-hidden="true" />
          {[
            "/ekran/konutesti1.png",
            "/ekran/konutesti2.png",
            "/ekran/konutesti3.png",
          ].map((src, index) => (
            <div
              key={index}
              className="phone-card"
              style={{
                /* Ortadaki telefon büyük ve yüksek: yol kalkınca kompozisyonun
                   bir odağa ihtiyacı var, üçü eşit sıra dizilince tablo gibi
                   duruyordu. Oyunlaştırma bölümü zaten bu dili kullanıyordu. */
                width: index === 1 ? "min(46vw, 232px)" : "min(40vw, 196px)",
                position: "relative",
                marginTop: index === 1 ? "-74px" : "-40px",
                zIndex: index === 1 ? 3 : 2,
              }}
            >
              <PhoneFrame src={src} alt={`bilkie konu testi ${index + 1}`} />
            </div>
          ))}
        </div>
      </section>

      {/* KONU DEFTERLERİ */}
      <section
        id="konu-defterleri"
        style={{ ["--isik" as string]: "#E6A893", ["--isik-rgb" as string]: "230,168,147" }}
      >
        <div
          style={{
            background: "#0C1A3F",
            padding: "70px 20px 35px 20px",
            textAlign: "center",
          }}
        >
          <div className="bolum-no" aria-hidden="true">02</div>

          <h2
            className={baslikFont.className}
            style={{
              fontSize: "clamp(30px, 9vw, 52px)",
              marginBottom: "18px",
              color: "#8FB3D9",
            }}
          >
            Konu Defterleri
          </h2>

          <p
            className={mainFont.className}
            style={{
              fontSize: "clamp(16px, 4.5vw, 20px)",
              color: "#AFC6E6",
              lineHeight: "1.4",
              fontWeight: 600,
              maxWidth: "760px",
              margin: "0 auto",
            }}
          >
            Konu defterlerini okuyarak konularını tekrar et, quizler ile pekiştir.
          </p>
        </div>

        <div
          className="phones-section"
          style={{
            background: "#0C1A3F",
            padding: "70px 20px 80px 20px",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            gap: "50px",
            flexWrap: "wrap",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Eskiden burada eğri bir "ilerleme yolu" SVG'si vardı (yıldızlar,
              kesikli çizgi, glow). Kaldırıldı: telefonların arkasında ikinci bir
              görsel katman kuruyor, koyu zeminde de dikkati ekranlardan
              çalıyordu. Yerine tek bir ışık lekesi kondu (.sahne-isik) —
              kompozisyonu aynı şekilde topluyor ama okumayı bölmüyor. */}
          <div className="sahne-isik" aria-hidden="true" />
          {[
            "/ekran/konudefteri1.png",
            // Ortadaki eskiden konudefteri2 idi; yeni eşleştirme ekranıyla
            // değiştirildi, sonra orta ile sağ yer değiştirdi. Sonuç:
            // orta = eski sağdaki (3), sağ = yeni ekran. 2 kullanılmıyor.
            "/ekran/konudefteri3.png",
            "/ekran/konudefteri-eslestirme.png",
          ].map((src, index) => (
            <div
              key={index}
              className="phone-card"
              style={{
                /* Ortadaki telefon büyük ve yüksek: yol kalkınca kompozisyonun
                   bir odağa ihtiyacı var, üçü eşit sıra dizilince tablo gibi
                   duruyordu. Oyunlaştırma bölümü zaten bu dili kullanıyordu. */
                width: index === 1 ? "min(46vw, 232px)" : "min(40vw, 196px)",
                position: "relative",
                marginTop: index === 1 ? "-74px" : "-40px",
                zIndex: index === 1 ? 3 : 2,
              }}
            >

              <PhoneFrame src={src} alt={`bilkie konu defteri ${index + 1}`} />
            </div>
          ))}
        </div>
      </section>

      {/* YAZILILAR */}
      <section
        id="yazililar"
        style={{ ["--isik" as string]: "#A6A0D6", ["--isik-rgb" as string]: "166,160,214" }}
      >
        <div
          style={{
            background: "#0C1A3F",
            padding: "70px 20px 35px 20px",
            textAlign: "center",
          }}
        >
          <div className="bolum-no" aria-hidden="true">03</div>

          <h2
            className={baslikFont.className}
            style={{
              fontSize: "clamp(30px, 9vw, 52px)",
              marginBottom: "18px",
              color: "#8FB3D9",
            }}
          >
            Yazılılar
          </h2>

          <p
            className={mainFont.className}
            style={{
              fontSize: "clamp(16px, 4.5vw, 20px)",
              color: "#AFC6E6",
              lineHeight: "1.4",
              fontWeight: 600,
              maxWidth: "760px",
              margin: "0 auto",
            }}
          >
            3 farklı soru türünü içeren sorularla hazırlanmış yazılıya hazırlık bölümü ile yazılılara en iyi şekilde hazırlan.
          </p>
        </div>

        <div
          className="phones-section"
          style={{
            background: "#0C1A3F",
            padding: "70px 20px 80px 20px",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            gap: "50px",
            flexWrap: "wrap",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Eskiden burada eğri bir "ilerleme yolu" SVG'si vardı (yıldızlar,
              kesikli çizgi, glow). Kaldırıldı: telefonların arkasında ikinci bir
              görsel katman kuruyor, koyu zeminde de dikkati ekranlardan
              çalıyordu. Yerine tek bir ışık lekesi kondu (.sahne-isik) —
              kompozisyonu aynı şekilde topluyor ama okumayı bölmüyor. */}
          <div className="sahne-isik" aria-hidden="true" />
          {[
            "/ekran/yazili1.png",
            "/ekran/yazili2.png",
            "/ekran/yazili3.png",
          ].map((src, index) => (
            <div
              key={index}
              className="phone-card"
              style={{
                /* Ortadaki telefon büyük ve yüksek: yol kalkınca kompozisyonun
                   bir odağa ihtiyacı var, üçü eşit sıra dizilince tablo gibi
                   duruyordu. Oyunlaştırma bölümü zaten bu dili kullanıyordu. */
                width: index === 1 ? "min(46vw, 232px)" : "min(40vw, 196px)",
                position: "relative",
                marginTop: index === 1 ? "-74px" : "-40px",
                zIndex: index === 1 ? 3 : 2,
              }}
            >

              <PhoneFrame src={src} alt={`bilkie yazili ${index + 1}`} />
            </div>
          ))}
        </div>
      </section>

      {/* OYUNLAŞTIRMA */}
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          ["--isik" as string]: "#F3A24C",
          ["--isik-rgb" as string]: "243,162,76",
        }}
      >
        {/* ÜST YAZI */}
        <div
          style={{
            background: "#0C1A3F",
            padding: "80px 20px 40px 20px",
            textAlign: "center",
            position: "relative",
            zIndex: 4,
          }}
        >
          <div className="bolum-no" aria-hidden="true">04</div>

          <h2
            className={baslikFont.className}
            style={{
              fontSize: "clamp(30px, 9vw, 52px)",
              marginBottom: "20px",
              color: "#8FB3D9",
            }}
          >
            Oyunlaştırma
          </h2>

          <p
            className={mainFont.className}
            style={{
              fontSize: "clamp(16px, 4.5vw, 20px)",
              color: "#AFC6E6",
              lineHeight: "1.4",
              fontWeight: 600,
              maxWidth: "760px",
              margin: "0 auto",
            }}
          >
            Öğrenimi oyunlaştırma teknikleri, aralıklı tekrar ve küçük parçalara bölünmüş içeriklerle (micro-learning) eğlenceli ve erişilebilir kılan, araştırmaya dayalı bir yaklaşımdır.
          </p>
        </div>

        {/* ALT TELEFON ALANI */}
        <div
          className="phones-section"
          style={{
            background: "#0C1A3F",
            padding: "40px 20px 56px 20px",
            marginTop: "-20px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "40px",
            flexWrap: "wrap",
            position: "relative",
            overflow: "hidden",
            zIndex: 1,
          }}
        >
          {/* KONFETİLER */}
          <div
            className="phones-road"
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: "900px",
              height: "520px",
              pointerEvents: "none",
              zIndex: 0,
            }}
          >
            {[
              { side: "left", left: "8%", top: "4%", w: 4, h: 12, color: "#F3A24C", radius: "2px", rotate: -24, delay: "0s", duration: "4.2s" },
              { side: "left", left: "11%", top: "14%", w: 7, h: 7, color: "#8FD36B", radius: "50%", rotate: 0, delay: "0.2s", duration: "4.8s" },
              { side: "left", left: "14%", top: "9%", w: 4, h: 15, color: "#A870E8", radius: "2px", rotate: 28, delay: "0.5s", duration: "4.4s" },
              { side: "left", left: "17%", top: "22%", w: 8, h: 8, color: "#59A99D", radius: "3px", rotate: -14, delay: "0.8s", duration: "5s" },
              { side: "left", left: "13%", top: "30%", w: 4, h: 18, color: "#FF7FA2", radius: "2px", rotate: -30, delay: "0.4s", duration: "4.3s" },
              { side: "left", left: "19%", top: "8%", w: 7, h: 7, color: "#F1C83F", radius: "50%", rotate: 0, delay: "0.9s", duration: "4.9s" },
              { side: "left", left: "22%", top: "12%", w: 5, h: 14, color: "#F3A24C", radius: "2px", rotate: 18, delay: "1.1s", duration: "4.6s" },
              { side: "left", left: "25%", top: "18%", w: 8, h: 8, color: "#8FD36B", radius: "50%", rotate: 0, delay: "1.4s", duration: "5.1s" },
              { side: "left", left: "28%", top: "10%", w: 4, h: 16, color: "#A870E8", radius: "2px", rotate: -24, delay: "1.7s", duration: "4.5s" },
              { side: "left", left: "30%", top: "26%", w: 9, h: 9, color: "#59A99D", radius: "3px", rotate: 16, delay: "0.6s", duration: "5.2s" },
              { side: "left", left: "24%", top: "34%", w: 4, h: 18, color: "#FF7FA2", radius: "2px", rotate: 32, delay: "1.9s", duration: "4.7s" },
              { side: "left", left: "31%", top: "6%", w: 7, h: 7, color: "#F1C83F", radius: "50%", rotate: 0, delay: "0.3s", duration: "4.8s" },

              { side: "right", left: "69%", top: "6%", w: 7, h: 7, color: "#F1C83F", radius: "50%", rotate: 0, delay: "0.1s", duration: "4.7s" },
              { side: "right", left: "72%", top: "12%", w: 5, h: 14, color: "#F3A24C", radius: "2px", rotate: -20, delay: "0.7s", duration: "4.5s" },
              { side: "right", left: "75%", top: "20%", w: 8, h: 8, color: "#8FD36B", radius: "50%", rotate: 0, delay: "1s", duration: "5s" },
              { side: "right", left: "78%", top: "10%", w: 4, h: 16, color: "#A870E8", radius: "2px", rotate: 24, delay: "1.3s", duration: "4.6s" },
              { side: "right", left: "81%", top: "28%", w: 9, h: 9, color: "#59A99D", radius: "3px", rotate: -16, delay: "0.4s", duration: "5.2s" },
              { side: "right", left: "73%", top: "34%", w: 4, h: 18, color: "#FF7FA2", radius: "2px", rotate: -28, delay: "1.6s", duration: "4.4s" },
              { side: "right", left: "84%", top: "8%", w: 7, h: 7, color: "#F1C83F", radius: "50%", rotate: 0, delay: "0.5s", duration: "4.9s" },
              { side: "right", left: "66%", top: "14%", w: 4, h: 12, color: "#F3A24C", radius: "2px", rotate: 20, delay: "0.9s", duration: "4.3s" },
              { side: "right", left: "64%", top: "24%", w: 8, h: 8, color: "#59A99D", radius: "3px", rotate: 10, delay: "1.2s", duration: "5.1s" },
              { side: "right", left: "61%", top: "12%", w: 4, h: 16, color: "#A870E8", radius: "2px", rotate: -18, delay: "1.8s", duration: "4.5s" },
              { side: "right", left: "86%", top: "18%", w: 5, h: 14, color: "#FF7FA2", radius: "2px", rotate: 26, delay: "0.2s", duration: "4.8s" },
              { side: "right", left: "88%", top: "30%", w: 8, h: 8, color: "#8FD36B", radius: "50%", rotate: 0, delay: "1.4s", duration: "5.2s" },

              { side: "left", left: "36%", top: "8%", w: 4, h: 12, color: "#F3A24C", radius: "2px", rotate: -20, delay: "0.5s", duration: "4.4s" },
              { side: "left", left: "39%", top: "16%", w: 7, h: 7, color: "#8FD36B", radius: "50%", rotate: 0, delay: "0.8s", duration: "4.9s" },
              { side: "left", left: "42%", top: "10%", w: 4, h: 15, color: "#A870E8", radius: "2px", rotate: 24, delay: "1.1s", duration: "4.5s" },
              { side: "right", left: "58%", top: "8%", w: 4, h: 12, color: "#F1C83F", radius: "50%", rotate: 0, delay: "0.6s", duration: "4.8s" },
              { side: "right", left: "55%", top: "17%", w: 4, h: 16, color: "#FF7FA2", radius: "2px", rotate: -26, delay: "1.5s", duration: "4.6s" },
              { side: "right", left: "52%", top: "12%", w: 8, h: 8, color: "#59A99D", radius: "3px", rotate: 18, delay: "1.9s", duration: "5s" },
            ].map((piece, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: piece.left,
                  top: piece.top,
                  width: `${piece.w}px`,
                  height: `${piece.h}px`,
                  background: piece.color,
                  borderRadius: piece.radius,
                  transform: `rotate(${piece.rotate}deg)`,
                  opacity: 0.95,
                  animation: `${piece.side === "left" ? "confettiFallLeft" : "confettiFallRight"} ${piece.duration} linear ${piece.delay} infinite`,
                }}
              />
            ))}
          </div>
          {/* OYUN VİTRİNİ — üç durağan telefon yerine 3B coverflow.
              Elimizde BEŞ oyun var, yelpazeye üçü sığıyordu. Video için de
              daha ucuz: yelpazede üç video birden kod çözerdi, burada yalnız
              ortadaki oynuyor, kenardakiler duraklatılmış poster. */}
          <OyunVitrini
            oyunlar={[
              { ad: "Kelime Gezmece", video: "/oyun/kelime-gezmece.mp4", poster: "/oyun/kelime-gezmece.jpg" },
              { ad: "Sudoku", video: "/oyun/sudoku.mp4", poster: "/oyun/sudoku.jpg" },
              { ad: "Blok Patla", video: "/oyun/blok-patla.mp4", poster: "/oyun/blok-patla.jpg" },
              { ad: "2048", video: "/oyun/2048.mp4", poster: "/oyun/2048.jpg" },
              { ad: "Wordle", video: "/oyun/wordle.mp4", poster: "/oyun/wordle.jpg" },
            ]}
          />
        </div>
      </section>

      {/* KÜÇÜK ADIMLARLA ÖĞRENME (microlearning)
          Zemin artık sayfanın kendi laciverti — Konu Testleri / Defterleri ile
          aynı. Arkasında akan bloklar (tek WebGL parçası, yalnız bu bölüm).
          Yazılar üç dikdörtgende; giriş metni kaydırınca bloklarla açılıyor. */}
      <section
        className="mikro"
        style={{
          position: "relative",
          overflow: "hidden",
          background: "#0C1A3F",
          padding: "clamp(58px, 10vw, 92px) 20px",
          ["--isik" as string]: "#8FB3D9",
          ["--isik-rgb" as string]: "143,179,217",
        }}
      >
        <BlokAkisKapi />
        {/* Blokların üstünü karartan katman: yazı okunmadan hiçbir arka plan
            efektinin değeri yok. Tek sabit degrade, kare başına hesap yok. */}
        <div className="mikro-perde" aria-hidden="true" />

        <div className="mikro-icerik">
          {/* Doğrudan büyük harf: text-transform Türkçe yerelde "i" harfini
              "İ" yapıyor ve "MİCROLEARNİNG" çıkıyor — kelime İngilizce. */}
          <p className={mainFont.className + " mikro-etiket"}>MICROLEARNING</p>

          <h2
            className={baslikFont.className}
            style={{
              fontSize: "clamp(28px, 8vw, 50px)",
              margin: "0 0 20px",
              color: "#8FB3D9",
              lineHeight: 1.15,
            }}
          >
            Küçük adımlarla öğrenme
          </h2>

          <BlokYaziBelir
            className={mainFont.className + " mikro-giris"}
            yazi="Kısa dikkat sürelerine uygun, öğrenmeyi hızlandıran ve istendiği zaman erişilebilen bu yöntem, uzun ders saatlerinin yerini alan modern bir yaklaşım olarak öne çıkar."
          />

          <div className="mikro-kutular">
            {[
              {
                ad: "Esneklik",
                metin: "Öğrencinin yoğun gününe uyum sağlar; ihtiyaç duyduğu anda öğrenmeyi destekler.",
                renk: "#F3A24C",
              },
              {
                ad: "Artan Kalıcılık",
                metin: "Küçük parçalar hâlinde öğrenme, bilginin akılda kalıcılığını artırır ve bilişsel yükü azaltır.",
                renk: "#A6A0D6",
              },
              {
                ad: "Dijital ve Erişilebilir",
                metin: "Akıllı telefon, tablet ya da bilgisayar üzerinden her zaman, her yerde erişim sağlar.",
                renk: "#59A99D",
              },
            ].map((k, i) => (
              <article
                key={k.ad}
                className="mikro-kutu belir"
                style={{ ["--sira" as string]: i, ["--kutu" as string]: k.renk }}
              >
                <span className="mikro-kutu-cizgi" aria-hidden="true" />
                <h3 className={baslikFont.className}>{k.ad}</h3>
                <p className={mainFont.className}>{k.metin}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* İSTATİSTİK
          Eskiden üç renkli kartta ÇERÇEVESİZ, 148 px'lik ham ekran görüntüsü
          vardı — diğer bölümlerde 273 px'lik cihaz kasası dururken. Yazıları
          okunmuyordu ve bölüm sayfanın geri kalanına hiç benzemiyordu.

          Şimdi uygulamanın KENDİ SEKME YAPISI sayfaya taşındı: İstatistik
          ekranı zaten sekmeli, ziyaretçi de burada aynı sekmeleri geziyor.
          Yanında ders küpü — altı yüz, altı ders rengi. */}
      <section
        className="ist"
        style={{
          position: "relative",
          overflow: "hidden",
          background: "#0C1A3F",
          padding: "clamp(56px, 9vw, 88px) 20px",
          ["--isik" as string]: "#E3D394",
        }}
      >
        <div className="ist-basi ist-onde">
          <h2
            className={baslikFont.className}
            style={{
              fontSize: "clamp(30px, 9vw, 52px)",
              marginBottom: "18px",
              color: "#8FB3D9",
            }}
          >
            İstatistik
          </h2>
          <p
            className={mainFont.className}
            style={{
              fontSize: "clamp(16px, 4.5vw, 20px)",
              color: "#AFC6E6",
              lineHeight: "1.45",
              fontWeight: 600,
              maxWidth: "760px",
              margin: "0 auto",
            }}
          >
            Kişisel ilerlemeni görmek için İstatistik bölümüne girip eksik
            olduğun dersi, üniteyi ve konuyu görebilirsin.
          </p>
        </div>

        {/* Ders küpü artık ARKA PLANDA. Yanda dururken telefonlarla yer
            paylaşıyordu ve dizi sağa itiliyordu; arkaya alınınca telefonlar
            kendiliğinden ortalanıyor. Belirginliği kısıldı — atmosfer,
            içerik değil. Altındaki "Altı yüz, altı ders." yazısı kaldırıldı:
            arka plan öğesi başlık taşımaz; anlam renklerde duruyor. */}
        <div className="ist-kup" aria-hidden="true">
          <DersKupuKapi />
        </div>
        <div className="ist-perde" aria-hidden="true" />

        <div className="ist-duzen">
          <IstatistikVitrini
            ekranlar={[
              { ad: "Konu Testleri", gorsel: "/istatistik/testler-genel.jpg", renk: "#E3D394" },
              { ad: "Ünite kırılımı", gorsel: "/istatistik/testler-unite.jpg", renk: "#E3D394" },
              { ad: "Konu Defterleri", gorsel: "/istatistik/defterler.jpg", renk: "#E6A893" },
              { ad: "Yazılılar", gorsel: "/istatistik/yazililar.jpg", renk: "#A6A0D6" },
            ]}
          />
        </div>
      </section>

      {/* LİGLER
          Arkada havai fişek: bölüm zaten kupa, sıralama ve sezon sonu —
          kutlama görüntüsü içeriğin kendisiyle örtüşüyor, süs değil.
          Canvas 2D, bağımlılık yok; burada WebGL'e gerek olmadığı için
          three.js de kullanılmadı. */}
      <section className="lig">
        <Havai />
        {/* Fişeklerin üstünü yumuşatan katman: yazı ve telefon önde kalsın. */}
        <div className="lig-perde" aria-hidden="true" />
        <div
          className="lig-icerik"
          style={{
            padding: "80px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: "40px",
          }}
        >
          {/* SOL YAZI */}
          <div style={{ maxWidth: "520px" }}>
            <h2
              className={baslikFont.className}
              style={{
                fontSize: "clamp(30px, 9vw, 52px)",
                marginBottom: "18px",
                color: "#8FB3D9",
              }}
            >
              Ligler
            </h2>

            <p
              className={mainFont.className}
              style={{
                fontSize: "clamp(16px, 4.5vw, 20px)",
                color: "#AFC6E6",
                lineHeight: "1.4",
                fontWeight: 600,
                marginBottom: "28px",
                maxWidth: "460px",
              }}
            >
              Öğrencilerin test çözüp, defter okuyup ya da yazılı tamamlayarak kazandıkları deneyim puanlarıyla (XP) diğer kullanıcılarla yarıştığı bölüm.
            </p>

            <div
              style={{
                display: "flex",
                gap: "18px",
                flexWrap: "wrap",
              }}
            >
              <button className={baslikFont.className} style={btn("#F3A24C")}>
                Sezonluk sıralama.
              </button>
              <button className={baslikFont.className} style={btn("#F3A24C")}>
                Kupalar kazan.
              </button>
            </div>
          </div>

          {/* SAĞ TELEFON */}
          <div
            style={{
              width: "min(78vw, 430px)",
              position: "relative",
            }}
          >
            {/* SHINE EFEKTİ */}
            <div
              className="ligler-shine"
              style={{
                position: "absolute",
                top: "-40px",
                left: "-40px",
                width: "320px",
                height: "320px",
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(241,200,63,0.45) 0%, rgba(241,200,63,0.18) 35%, rgba(241,200,63,0.08) 55%, rgba(241,200,63,0) 75%)",
                filter: "blur(18px)",
                zIndex: 0,
                animation: "shinePulse 3.5s ease-in-out infinite",
              }}
            />
            {/* Eğik 3B cihaz mockup'ı. Çerçevesi görselin İÇİNDE olduğu için
                PhoneFrame kullanılmıyor — kasa iki kez çizilmiş olurdu.
                4 MB'lık PNG saydam kenar payından kırpılıp 900 px WebP'e
                indirildi: 77 KB. */}
            <img
              src="/lig-telefon.webp"
              alt="bilkie Ligler ekranı — sezon sıralaması ve kupalar"
              width={900}
              height={972}
              style={{ width: "100%", height: "auto", display: "block", position: "relative", zIndex: 1 }}
            />
          </div>
        </div>
      </section>

      {/* PROFİL */}
      <section>
        <div
          style={{
            background: "#0C1A3F",
            padding: "80px 20px",
            display: "flex",
            alignItems: "center",
            /* space-between DEĞİL: metin sütunu daralınca ikisi iki uca
               yapışıyor ve ortada kocaman bir boşluk kalıyordu. */
            justifyContent: "center",
            flexWrap: "wrap",
            gap: "clamp(28px, 6vw, 72px)",
            maxWidth: "1180px",
            margin: "0 auto",
          }}
        >
          {/* SOL YAZI */}
          {/* flex-grow 0: iki sütun da büyüdüğünde metin sağa, deste sola
              doğru açılıyor ve aralarında 200 px'lik boşluk kalıyordu.
              Büyüme kapalı, ikisi ortada yan yana duruyor. */}
          <div style={{ maxWidth: "460px", flex: "0 1 460px" }}>
            <h2
              className={baslikFont.className}
              style={{
                fontSize: "clamp(30px, 9vw, 52px)",
                marginBottom: "18px",
                color: "#8FB3D9",
              }}
            >
              Profil
            </h2>

            <p
              className={mainFont.className}
              style={{
                fontSize: "clamp(16px, 4.5vw, 20px)",
                color: "#AFC6E6",
                lineHeight: "1.45",
                fontWeight: 600,
                maxWidth: "520px",
                marginBottom: 0,
              }}
            >
              Kişiselleştirme ile avatarını ve kullanıcı adını değiştirebilirsin.
              <br />
              Diğer sınıfların içeriklerine de göz atıp kendini deneyebilirsin.
            </p>

          </div>

          {/* SAĞ DESTE — öndeki ekran net, arkadakiler yelpaze gibi açılıp
              kenarlarından renk gösteriyor. On ekran: profil, rozet takvimi,
              sonra yedi başarım. */}
          <ProfilDeste
            kartlar={[
              { ad: "Profil", gorsel: "/profil/profil.jpg" },
              { ad: "Rozetler", gorsel: "/profil/rozetler.jpg" },
              { ad: "Yaz Kaşifi", gorsel: "/profil/yaz-kasifi.jpg" },
              { ad: "Öğrenci", gorsel: "/profil/ogrenci.jpg" },
              { ad: "Bilim İnsanı", gorsel: "/profil/bilim-insani.jpg" },
              { ad: "Astronot", gorsel: "/profil/astronot.jpg" },
              { ad: "Doktor", gorsel: "/profil/doktor.jpg" },
              { ad: "Dedektif", gorsel: "/profil/dedektif.jpg" },
              { ad: "Sanatçı", gorsel: "/profil/sanatci.jpg" },
              { ad: "Dansçı", gorsel: "/profil/dansci.jpg" },
            ]}
          />
        </div>
      </section>

      {/* İLETİŞİM */}
      <section>
        <div
          style={{
            background: "#0C1A3F",
            padding: "70px 20px 60px 20px",
            textAlign: "center",
            borderTop: "1px solid rgba(143,179,217,0.12)",
          }}
        >
          <h2
            className={baslikFont.className}
            style={{
              fontSize: "clamp(30px, 9vw, 52px)",
              marginBottom: "18px",
              color: "#8FB3D9",
            }}
          >
            İletişim
          </h2>

          <p
            className={mainFont.className}
            style={{
              fontSize: "clamp(16px, 4.5vw, 20px)",
              color: "#AFC6E6",
              lineHeight: "1.4",
              fontWeight: 600,
              marginBottom: "24px",
            }}
          >
            Bizimle iletişime geçmek için aşağıdaki e-posta adresini kullanabilirsin.
          </p>

          <a
            href="mailto:info@bilkie.com"
            className={baslikFont.className}
            style={{
              display: "inline-block",
              background: "#F3A24C",
              color: "#0C1A3F",
              textDecoration: "none",
              padding: "18px 34px",
              borderRadius: "999px",
              fontSize: "26px",
            }}
          >
            info@bilkie.com
          </a>
          {/* Sayfa sonunda indirme yolu yoktu — ziyaretçi buraya kadar okuyup
              elinde sadece bir e-posta adresiyle kalıyordu. */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "16px",
              flexWrap: "wrap",
              marginTop: "24px",
            }}
          >
            <a
              href="https://play.google.com/store/apps/details?id=com.bilkie.app"
              target="_blank"
              rel="noopener"
              className={baslikFont.className}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                background: "#8FB3D9",
                color: "#0C1A3F",
                textDecoration: "none",
                padding: "14px 26px",
                borderRadius: "999px",
                fontSize: "22px",
              }}
            >
              <svg width="18" height="20" viewBox="0 0 24 26" aria-hidden="true">
                <path d="M2 1.5v23l13-11.5L2 1.5z" fill="#0C1A3F" />
                <path d="M15 13l4.6-4.1 2.6 1.5c1.1.6 1.1 2.6 0 3.2l-2.6 1.5L15 13z" fill="#0C1A3F" />
              </svg>
              Google Play
            </a>

            {SOSYAL.map((h) => (
              <a
                key={h.ad}
                href={h.url}
                target="_blank"
                rel="noopener"
                className={baslikFont.className}
                style={{
                  display: "inline-block",
                  background: "#2C335E",
                  color: "#AFC6E6",
                  textDecoration: "none",
                  padding: "14px 26px",
                  borderRadius: "999px",
                  fontSize: "22px",
                  border: "1px solid #4A538E",
                }}
              >
                {h.ad}
              </a>
            ))}
          </div>
        </div>
      </section>
      {/* FOOTER */}
      <footer
        style={{
          background: "#091532",
          padding: "36px 20px",
          textAlign: "center",
          borderTop: "1px solid rgba(143,179,217,0.15)",
        }}
      >
        <p
          className={mainFont.className}
          style={{
            fontSize: "16px",
            color: "#AFC6E6",
            lineHeight: "1.5",
            fontWeight: 500,
            marginBottom: "8px",
          }}
        >
          © 2026 Bilkie. Tüm hakları saklıdır.
        </p>

        <p
          className={mainFont.className}
          style={{
            fontSize: "14px",
            color: "rgba(175,198,230,0.75)",
            lineHeight: "1.5",
            fontWeight: 400,
            maxWidth: "900px",
            margin: "0 auto",
          }}
        >
          Bilkie içerisindeki tüm içerikler, tasarımlar ve görseller izinsiz kopyalanamaz, çoğaltılamaz veya ticari amaçla kullanılamaz.
        </p>
      </footer>
      <style>{`
        @keyframes floatCornerA {
          0% { transform: rotate(18deg) translateY(0px); }
          50% { transform: rotate(10deg) translateY(-12px); }
          100% { transform: rotate(18deg) translateY(0px); }
        }

        @keyframes floatCornerDot {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }

        @keyframes floatCornerC {
          0% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-14px) scale(1.04); }
          100% { transform: translateY(0px) scale(1); }
        }

        @keyframes floatCornerDiamond {
          0% { transform: rotate(45deg) translateY(0px); }
          50% { transform: rotate(55deg) translateY(-10px); }
          100% { transform: rotate(45deg) translateY(0px); }
        }

        @keyframes floatCornerLeft {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
          100% { transform: translateY(0px); }
        }

        @keyframes floatCornerRight {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-14px); }
          100% { transform: translateY(0px); }
        }

        @keyframes confettiFallLeft {
          0% {
            transform: translate(-18px, -26px) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          50% {
            transform: translate(10px, 120px) rotate(150deg);
            opacity: 1;
          }
          100% {
            transform: translate(34px, 260px) rotate(320deg);
            opacity: 0;
          }
        }

        @keyframes confettiFallRight {
          0% {
            transform: translate(18px, -26px) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          50% {
            transform: translate(-10px, 120px) rotate(-150deg);
            opacity: 1;
          }
          100% {
            transform: translate(-34px, 260px) rotate(-320deg);
            opacity: 0;
          }
        }

        @keyframes shinePulse {
          0% {
            transform: scale(0.9);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.05);
            opacity: 1;
          }
          100% {
            transform: scale(0.9);
            opacity: 0.6;
          }
        }

        @media (max-width: 900px) {
          main img {
            max-width: 100%;
          }
        }

        @media (max-width: 768px) {
          section {
            overflow: hidden;
          }
        }

        /* ——— HERO TELEFONU ——— */
        /* GENİŞ EKRANDA YAN YANA: dikey sıralamada telefona ancak %40 yükseklik
           kalıyordu ve küçük görünüyordu. Yan yana geçince metin solda, telefon
           sağda — telefon %78 yüksekliğe çıkıyor ve hero'nun boş yatay alanı da
           doluyor. Dar ekranda eski dikey düzen aynen sürüyor. */
        @media (min-width: 1000px) {
          .hero { flex-direction: row !important; gap: clamp(28px, 5vw, 80px); }
          /* Telefon büyüyünce sağ üstteki kitap/gezegen motifiyle çakışıyor;
             yarısı telefonun arkasında kalıp kazara çarpışmış gibi duruyordu.
             Silmiyoruz — arka plan dokusuna indiriyoruz ki telefonla yarışmasın. */
          .hero-right-motif { opacity: .28; transform: translate(18%, -14%) scale(.82); }
          .hero-metin { display: flex; flex-direction: column; align-items: center; }
          .hero-tel-sahne { margin-top: 0 !important; width: auto !important; }
          .hero-tel { max-height: 88vh !important; max-width: 42vw !important; }
        }
        .hero-tel-sahne {
          perspective: 1500px;
          margin-top: 26px;
          position: relative;
          z-index: 2;
          display: flex;
          justify-content: center;
          width: 100%;
        }
        /* Boyut GENİŞLİĞE değil YÜKSEKLİĞE bağlı: sabit genişlikte hero
           1071px'e çıkıyordu ve telefon 900px'lik katlamanın altında kalıyordu —
           ziyaretçi onu hiç görmüyor, giriş animasyonu ekran dışında bitiyordu.
           Artık görüntü alanının yüksekliğine göre küçülüyor, hero tek ekranda. */
        .hero-tel {
          /* El görselinde cihaz, tuvalin ancak yarısı kadar yer kaplıyor
             (gerisi el ve kolluk). Eski dar telefon görseliyle aynı vh
             değeri bu yüzden ekranı küçük gösteriyordu; dar ekranda pay
             büyütüldü. */
          max-height: 50vh; width: auto; height: auto; max-width: 88vw; display: block;
          transform-origin: 50% 100%;
          filter: drop-shadow(-18px 26px 44px rgba(3,8,22,.55));
          animation: telGel 1.15s cubic-bezier(.16,.84,.34,1) both;
          animation-delay: .25s;
        }
        @keyframes telGel {
          from { opacity: 0; transform: translateY(90px) rotateX(12deg) rotateY(0deg) scale(.94); }
          to   { opacity: 1; transform: translateY(0)    rotateX(3deg)  rotateY(-8deg) scale(1); }
        }
        /* Hareket hassasiyeti olan kullanıcıya animasyon dayatma */
        @media (prefers-reduced-motion: reduce) {
          .hero-tel { animation: none; transform: rotateY(-14deg) rotateX(4deg); }
        }

        /* ——— CİHAZ KASASI ———————————————————————————————————————————
           Fotogerçekçi 3B render değil; CSS 3B dönüşümüyle çizilmiş gerçek
           perspektif. Kazancı: her ölçekte keskin, ek bayt yok, cihazı
           değiştirmek tek yerden. Kaybı: ışık/yansıma simülasyonu yok.
           ANDROID gövdesi — uygulama Play Store'da ve ekran görüntüleri
           Redmi'den. iPhone kasası hem yanlış beyan olurdu hem Apple'ın
           cihaz görselleri yalnız iOS uygulamaları için lisanslı. */
        .tel-sahne { position: relative; width: 100%; perspective: 1400px; }
        .tel-kasa {
          position: relative;
          width: 100%;
          aspect-ratio: 764 / 1558;
          border-radius: 12%/5.8%;
          padding: 2.1%;
          transform-style: preserve-3d;
          /* alüminyum ray: keskin ışık durakları metal hissini veren şey */
          background:
            linear-gradient(100deg,
              #0b0d11 0%, #6f7684 1.4%, #2a2e37 3%, #14171d 12%,
              #1a1d24 50%, #14171d 88%, #2a2e37 97%, #6f7684 98.6%, #0b0d11 100%);
          box-shadow:
            0 0 0 1px rgba(0,0,0,.6),
            0 1px 0 rgba(255,255,255,.18) inset;
        }
        .tel-kasa.egik {
          transform: rotateY(calc(var(--egim) * -1)) rotateX(2deg) rotateZ(.6deg);
        }
        /* gövde kalınlığı — eğimde görünen yan yüz */
        .tel-yan {
          position: absolute; right: 0; top: 2%; bottom: 2%; width: 12px;
          border-radius: 0 8px 8px 0;
          background: linear-gradient(90deg, #23262e, #0a0c10);
          transform: rotateY(90deg) translateZ(6px);
          transform-origin: right center;
          opacity: 0; transition: opacity .2s;
        }
        .egik .tel-yan { opacity: 1; }
        .tel-ekran {
          position: relative; width: 100%; height: 100%;
          border-radius: 10%/5%;
          overflow: hidden; background: #0C1A3F;
        }
        .tel-ekran img,
        .tel-ekran video { width: 100%; height: 100%; display: block; object-fit: cover; }
        /* Android delik kamera — dinamik ada DEĞİL (o iPhone işareti) */
        .tel-kamera {
          position: absolute; top: 1.5%; left: 50%; transform: translateX(-50%);
          width: 3.6%; aspect-ratio: 1; min-width: 6px;
          background: radial-gradient(circle at 32% 28%, #2a3550 0%, #05070c 62%);
          border-radius: 50%;
          box-shadow: 0 0 0 1px rgba(255,255,255,.09);
        }
        /* cama vuran ışık — düz dikdörtgen olmaktan çıkaran şey */
        .tel-parlama {
          position: absolute; inset: 0; pointer-events: none;
          background: linear-gradient(108deg,
            rgba(255,255,255,.20) 0%, rgba(255,255,255,.07) 14%,
            rgba(255,255,255,0) 38%, rgba(255,255,255,0) 100%);
        }
        .tel-tus {
          position: absolute; right: -2px; width: 2.5px; border-radius: 3px;
          background: linear-gradient(180deg, #4a505d, #171a20);
        }
        .tel-tus-guc { top: 27%; height: 8%; }
        .tel-tus-ses { top: 38%; height: 13%; }
        /* zemine değen gölge — cihazı sayfadan ayıran şey */
        .tel-golge {
          position: absolute; left: 8%; right: 8%; bottom: -3%; height: 6%;
          background: radial-gradient(ellipse at center, rgba(4,10,26,.42) 0%, rgba(4,10,26,0) 70%);
          filter: blur(6px); pointer-events: none;
        }

        @media (max-width: 768px) {
          .phones-section {
            overflow-x: auto !important;
            overflow-y: visible !important;
            flex-wrap: nowrap !important;
            justify-content: flex-start !important;
            align-items: flex-start !important;
            gap: 16px !important;
            padding: 30px 20px 50px 36px !important;
            scroll-snap-type: x mandatory;
            scroll-padding-left: 36px;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
          }
          .phones-section::-webkit-scrollbar {
            display: none;
          }
          .phones-road {
            display: none;
          }
          .phone-card {
            margin-top: 0 !important;
            width: 70vw !important;
            height: auto !important;
            flex-shrink: 0 !important;
            scroll-snap-align: start;
          }

          .stats-section {
            flex-wrap: nowrap !important;
            overflow-x: auto !important;
            scroll-snap-type: x mandatory;
            scroll-padding-left: 28px;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            gap: 0 !important;
            padding-left: 28px !important;
          }
          .stats-section::-webkit-scrollbar {
            display: none;
          }
          .stat-card {
            flex: 0 0 82vw !important;
            scroll-snap-align: start;
          }

          .ligler-shine {
            left: 50% !important;
            transform: translateX(-50%) !important;
          }
        }

        /* ——— KAYDIRDIKÇA BELİRME ———
           Başlangıç durumunu data-belir kapısının ARKASINA koyuyoruz; o
           öznitelik yalnızca JS çalışınca kök öğeye ekleniyor. Script
           çalışmazsa telefonlar hiç gizlenmemiş olur, sayfa eksiksiz görünür.
           Sadece transform ve opacity oynatılıyor — ikisi de yeniden yerleşim
           (reflow) istemez, zayıf makinede de akar. */
        /* ——— KÜÇÜK ADIMLARLA ÖĞRENME ——— */
        .mikro-icerik { position: relative; z-index: 2; max-width: 1060px; margin: 0 auto; text-align: center; }
        .blok-akis-kapi,
        .blok-akis { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
        /* Bloklar renkli ve hareketli; araya bu girmezse yazı okunmuyor.
           Bulanıklık DEĞİL sabit degrade — blur, hareket eden WebGL tuvalinin
           üstünde kare başına yeniden hesaplanır, en pahalı şey odur. */
        .mikro-perde {
          position: absolute; inset: 0; z-index: 1; pointer-events: none;
          background:
            radial-gradient(ellipse 66% 62% at 50% 46%, rgba(12,26,63,.94) 0%, rgba(12,26,63,.72) 48%, rgba(12,26,63,.34) 78%, rgba(12,26,63,.15) 100%),
            linear-gradient(to bottom, #0C1A3F 0%, rgba(12,26,63,0) 14%, rgba(12,26,63,0) 86%, #0C1A3F 100%);
        }

        .mikro-etiket {
          margin: 0 0 12px;
          font-size: 12px; font-weight: 700; letter-spacing: .3em;
          color: rgba(175,198,230,.6);
        }
        .mikro-giris {
          margin: 0 auto clamp(34px, 6vw, 52px);
          max-width: 780px;
          font-size: clamp(16px, 4.4vw, 20px);
          font-weight: 600;
          line-height: 1.55;
          color: #AFC6E6;
        }

        .mikro-kutular {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: clamp(14px, 2.4vw, 22px);
          text-align: left;
        }
        .mikro-kutu {
          position: relative;
          overflow: hidden;
          padding: clamp(24px, 3.4vw, 32px) clamp(20px, 2.6vw, 28px);
          border-radius: 18px;
          /* Yarı saydam: arkadaki blokların geçtiği görünüyor ama yazı
             okunuyor. Düz dolgu olsaydı efekt kutuların arkasında ölürdü. */
          background: rgba(20,36,80,.72);
          border: 1px solid rgba(143,179,217,.18);
          box-shadow: 0 18px 40px rgba(3,8,22,.34);
        }
        /* Üstteki renk şeridi — üç kutuyu birbirinden ayıran şey bu. */
        .mikro-kutu-cizgi {
          position: absolute; left: 0; right: 0; top: 0; height: 4px;
          background: var(--kutu, #8FB3D9);
        }
        .mikro-kutu h3 {
          margin: 0 0 10px;
          font-size: clamp(17px, 4.2vw, 20px);
          color: var(--kutu, #8FB3D9);
        }
        .mikro-kutu p {
          margin: 0;
          font-size: clamp(14px, 3.6vw, 16px);
          font-weight: 600;
          line-height: 1.5;
          color: rgba(175,198,230,.86);
        }

        /* Genel belirme (KaydirBelir tarafından tetikleniyor). */
        [data-belir="acik"] .belir { opacity: 0; transform: translateY(20px); }
        [data-belir="acik"] .belir.belirdi {
          opacity: 1; transform: none;
          transition: opacity .55s ease, transform .55s cubic-bezier(.16,.84,.34,1);
          transition-delay: calc(var(--sira, 0) * .1s);
        }
        @media (prefers-reduced-motion: reduce) {
          [data-belir="acik"] .belir { opacity: 1; transform: none; }
        }

        /* Bağlantıyla bölüme giderken yumuşak kaydırma. Hareket hassasiyeti
           olan kullanıcıda kapalı — ani sıçrama onlar için doğrusu. */
        @media (prefers-reduced-motion: no-preference) {
          html { scroll-behavior: smooth; }
        }
        /* NEGATİF scroll-margin: bağlantı bölümün tepesine değil, biraz
           AŞAĞISINA yerleşsin. Ölçüldü — bölümün üstünde 70 px'lik dolgu var
           ve varışta ekranın tepesinde 82 px ölü boşluk kalıyordu; telefonlar
           ise alt kenara dayanıyordu. Bu değer o boşluğu alıp alta veriyor.
           Pozitif değer tersini yapar (öğeyi aşağı iter). */
        #konu-testleri, #konu-defterleri, #yazililar { scroll-margin-top: -48px; }

        /* Şerit imleç: tüm sayfanın üstünde sabit bir tuval.
           pointer-events yok — hiçbir tıklamayı engellemez. */
        .serit-imlec {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100%;
          display: block;
          z-index: 9998;
          pointer-events: none;
        }

        /* ——— PROFİL DESTESİ ——— */
        .deste {
          flex: 0 1 440px;
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 18px;
          outline: none;
          cursor: pointer;
          /* Yatay sürüklerken sayfa yana kaymasın; dikey serbest. */
          touch-action: pan-y;
        }
        .deste-sahne {
          position: relative;
          width: 100%;
          /* Yelpaze dönerken köşeler taşıyor; yükseklik en uzun kartın
             döndürülmüş hâline göre. */
          height: clamp(330px, 66vw, 470px);
        }
        .deste-kart {
          position: absolute;
          /* Kartlar isabet ALIYOR: seçimi tarayıcının kendi isabet testi
             yapıyor. Destede üç boyutlu bağlam yok, 2B döndürmede tarayıcı
             hem şekli hem üst üste binme sırasını doğru çözüyor. */
          pointer-events: auto;
          left: 50%;
          top: 50%;
          width: clamp(150px, 38vw, 208px);
          /* Yelpaze ALT-ORTADAN açılıyor: eldeki iskambil destesi gibi,
             kartların tabanı ortak bir noktada duruyor. Merkezden
             açılsaydı kartlar birbirinin içine girer, kenarlar okunmazdı. */
          transform-origin: 50% 88%;
          transition:
            transform .6s cubic-bezier(.22,1,.36,1),
            opacity .6s cubic-bezier(.22,1,.36,1);
          will-change: transform, opacity;
        }
        .deste-perde {
          position: absolute;
          inset: 0;
          border-radius: 12%/5.8%;
          background: #0C1A3F;
          pointer-events: none;
          transition: opacity .6s cubic-bezier(.22,1,.36,1);
        }
        .deste:focus-visible .deste-alt {
          outline: 2px solid rgba(175,198,230,.75);
          outline-offset: 8px;
          border-radius: 999px;
        }
        .deste-alt { display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .deste-ad {
          margin: 0;
          font-size: clamp(16px, 4vw, 19px);
          font-weight: 700;
          color: #AFC6E6;
        }
        .deste-sayac {
          margin: 0;
          font-size: 13px; font-weight: 700; letter-spacing: .12em;
          color: rgba(175,198,230,.45);
        }
        @media (prefers-reduced-motion: reduce) {
          .deste-kart, .deste-perde { transition: none; }
        }

        /* ——— LİGLER ——— */
        .lig { position: relative; overflow: hidden; background: #0C1A3F; }
        .havai {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          display: block;
          z-index: 0;
          pointer-events: none;
        }
        .lig-perde {
          position: absolute; inset: 0; z-index: 1; pointer-events: none;
          background:
            radial-gradient(ellipse 46% 44% at 50% 50%, rgba(12,26,63,.62) 0%, rgba(12,26,63,.28) 58%, rgba(12,26,63,0) 100%),
            linear-gradient(to bottom, #0C1A3F 0%, rgba(12,26,63,0) 16%, rgba(12,26,63,0) 84%, #0C1A3F 100%);
        }
        .lig-icerik { position: relative; z-index: 2; }

        /* ——— İSTATİSTİK ——— */
        .ist-onde, .ist-duzen { position: relative; z-index: 2; }
        .ist-basi { text-align: center; max-width: 1100px; margin: 0 auto clamp(30px, 5vw, 46px); }
        .ist-duzen { display: flex; justify-content: center; max-width: 1100px; margin: 0 auto; }

        /* Küp: bölümün arkasında, ortalı, soluk. */
        .ist-kup {
          position: absolute;
          left: 50%;
          top: 54%;
          transform: translate(-50%, -50%);
          width: min(760px, 92vw);
          height: min(560px, 66vw);
          z-index: 0;
          opacity: .34;
          pointer-events: none;
        }
        .kup-kapi, .kup { position: relative; width: 100%; height: 100%; }
        /* Küpün üstünü yumuşatan katman: telefonların arkasında desen değil
           atmosfer kalsın. Tek sabit degrade, kare başına hesap yok. */
        .ist-perde {
          position: absolute; inset: 0; z-index: 1; pointer-events: none;
          background:
            radial-gradient(ellipse 52% 48% at 50% 56%, rgba(12,26,63,.72) 0%, rgba(12,26,63,.4) 55%, rgba(12,26,63,.1) 100%),
            linear-gradient(to bottom, #0C1A3F 0%, rgba(12,26,63,0) 18%, rgba(12,26,63,0) 82%, #0C1A3F 100%);
        }
        @media (max-width: 899px) {
          /* Dar ekranda küp yok: telefonların arkasında yer kalmıyor ve
             WebGL'in bedelini mobil hatta ödetmenin anlamı yok. */
          .ist-kup, .ist-perde { display: none; }
        }

        .ist-vitrin { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 14px; }
        .ist-dizi {
          position: relative;
          width: 100%;
          --taban: 110px;
          /* Satır kapsayıcıyı aşarsa yana kaydırılır. Kaydırma çubuğu
             gizli — sayfanın diğer şeritlerinde de öyle. */
          overflow-x: auto;
          overflow-y: hidden;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }
        .ist-dizi::-webkit-scrollbar { display: none; }
        .ist-ray { position: relative; height: 100%; }
        .ist-kart {
          position: absolute;
          left: 0;
          bottom: 0;
          width: var(--taban);
          padding: 0;
          border: 0;
          background: none;
          cursor: pointer;
          /* Ölçek ALTTAN-SOLDAN büyüsün: kartlar ortak bir zemin çizgisine
             basıyor, büyüyen yukarı doğru açılıyor. */
          transform-origin: 0% 100%;
          will-change: transform, opacity;
        }
        .ist-kart:focus-visible { outline: 2px solid #8FB3D9; outline-offset: 4px; border-radius: 10px; }
        .ist-ad {
          margin: 0;
          font-size: clamp(16px, 4vw, 19px);
          font-weight: 700;
          transition: color .3s ease;
        }
        .ist-ipucu { margin: 0; font-size: 13px; font-weight: 600; color: rgba(175,198,230,.5); }

        /* ——— OYUN VİTRİNİ (3B coverflow) ——— */
        .vitrin {
          position: relative;
          z-index: 2;
          width: 100%;
          outline: none;
          /* Yatay sürüklerken sayfa yana kaymasın; dikey kaydırma serbest. */
          touch-action: pan-y;
        }
        /* Odak göstergesi SİLİNMEDİ, taşındı.
           Kapsayıcıya verilen kalın halka tüm vitrini çevreliyordu — ok
           tuşuna basan herkesin ekranını kesen dev bir dikdörtgen. Ama halkayı
           tamamen kaldırmak da olmaz: ok tuşları yalnız vitrin odaktayken
           çalışıyor, gösterge yoksa klavyeyle gezen kişi neyin canlı olduğunu
           hiç bilemez.
           Çözüm: göstergeyi KONTROL YÜZEYİNE koymak. Vitrin odak alınca alttaki
           noktalar halkalanıyor — küçük, tam da tuşların etkilediği yerde. */
        .vitrin:focus-visible { outline: none; }
        .vitrin:focus-visible .vitrin-noktalar {
          outline: 2px solid rgba(175,198,230,.75);
          outline-offset: 6px;
          border-radius: 999px;
        }
        .vitrin-sahne {
          position: relative;
          height: clamp(360px, 62vw, 480px);
          perspective: 1600px;
          /* Kartlar 3B uzayda; boyama sırası z-index DEĞİL 3B konum. */
          transform-style: preserve-3d;
        }
        .vitrin-kart {
          position: absolute;
          left: 50%;
          top: 50%;
          width: clamp(150px, 42vw, 214px);
          transform-style: preserve-3d;
          cursor: pointer;
          transition: transform .62s cubic-bezier(.22,1,.36,1),
                      opacity .62s cubic-bezier(.22,1,.36,1);
        }
        .vitrin-kart.merkez { cursor: default; }
        /* Kenar kartları karartan perde — odak ortada kalsın. */
        .vitrin-perde {
          position: absolute;
          inset: 0;
          background: #0C1A3F;
          opacity: .55;
          border-radius: 14%/7%;
          pointer-events: none;
          transition: opacity .62s cubic-bezier(.22,1,.36,1);
        }
        .vitrin-kart.merkez .vitrin-perde { opacity: 0; }

        .vitrin-alt {
          margin-top: 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
        }
        .vitrin-ad {
          margin: 0;
          font-size: clamp(17px, 4.4vw, 21px);
          font-weight: 700;
          letter-spacing: .01em;
          color: #AFC6E6;
        }
        .vitrin-noktalar { display: flex; gap: 10px; }
        .vitrin-nokta {
          /* Dokunma hedefi 32px; görünen nokta 8px. Küçük bir daireyi
             telefonda ıskalamak çok kolay, görünürü büyütmeden hedefi
             büyütüyoruz. */
          width: 32px; height: 32px; padding: 0;
          border: 0; background: none; cursor: pointer;
          display: grid; place-items: center;
        }
        .vitrin-nokta::before {
          content: "";
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #AFC6E6;
          opacity: .32;
          transition: opacity .25s, transform .25s;
        }
        .vitrin-nokta.secili::before {
          opacity: 1;
          transform: scale(1.5);
          background: var(--isik, #F3A24C);
        }

        @media (prefers-reduced-motion: reduce) {
          .vitrin-kart, .vitrin-perde { transition: none; }
        }

        /* ——— BÖLÜM AYIRICISI: NUMARA + ÇİZGİ ———
           Dört bölüm (Testler / Defterler / Yazılılar / Oyunlaştırma) art arda
           aynı kalıpla geliyor: başlık, alt yazı, üç telefon. Hepsi lacivert
           olunca aralarındaki sınır kayboldu ve tek uzun bir akış gibi
           okunmaya başladı.

           Düz bir çizgi bunu ÇÖZMEZ: ayırır ama ayırt etmez, çizginin ardından
           yine aynı şey gelir. Bunun yerine ayırıcı aynı zamanda bir SAYAÇ:
           "01/04" ziyaretçiye kaçıncı durakta olduğunu da söylüyor. Kaldırılan
           "ilerleme yolu" SVG'sinin anlatmak istediği şey buydu — mobilyayı
           attık, anlamı sayıya taşıdık.

           Renk uydurulmadı: eski krem / somon / mor bantların renkleri.
           Bantlar kalktı, renkler bölümün ışığına ve numarasına geçti —
           lacivert bütünlük bozulmadan her bölüm kendi sıcaklığını koruyor. */
        .bolum-no {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: clamp(10px, 2.4vw, 18px);
          margin-bottom: 18px;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: .26em;
          color: var(--isik, #8FB3D9);
          opacity: .9;
        }
        .bolum-no::before,
        .bolum-no::after {
          content: "";
          height: 1px;
          width: clamp(26px, 8vw, 78px);
          background: linear-gradient(to right, rgba(var(--isik-rgb, 143,179,217), 0), rgba(var(--isik-rgb, 143,179,217), .55));
        }
        .bolum-no::after {
          background: linear-gradient(to left, rgba(var(--isik-rgb, 143,179,217), 0), rgba(var(--isik-rgb, 143,179,217), .55));
        }

        /* Sahne ışığı — kaldırılan "ilerleme yolu" SVG'sinin yerine.
           Tek, SABİT bir degrade: kare başına hiçbir şey hesaplanmıyor,
           yolun üç ayrı path + blur filtresi maliyeti de gitmiş oluyor. */
        .sahne-isik {
          position: absolute;
          left: 50%;
          top: 50%;
          width: min(1120px, 96%);
          height: 560px;
          transform: translate(-50%, -50%);
          pointer-events: none;
          z-index: 0;
          /* İki katman. Tek geniş degrade denendi ve OKUNMADI: 1080x440'lık
             yumuşak bir leke o kadar dağınık ki lacivertten ayrışmıyordu,
             "ışık" değil hafif bir kirlilik gibi duruyor.
             ① tabanda dar ve keskin bir havuz — telefonlara basacak zemin,
             ② üstte geniş ve çok soluk bir hâle — grubu arka plandan ayırır.
             İkisi de sabit degrade; kare başına hesap yok. */
          background:
            radial-gradient(
              ellipse 34% 13% at 50% 78%,
              rgba(var(--isik-rgb, 143,179,217),.34) 0%,
              rgba(var(--isik-rgb, 143,179,217),.13) 45%,
              rgba(var(--isik-rgb, 143,179,217),0) 78%
            ),
            radial-gradient(
              ellipse 46% 44% at 50% 50%,
              rgba(126,140,255,.16) 0%,
              rgba(126,140,255,.05) 52%,
              rgba(126,140,255,0) 80%
            );
        }

        /* Yelpaze: kenar telefonlar hafifçe içe dönük duruyor, ortadaki düz.
           Hero'daki eğik telefonla aynı dil; üçü düz sıralanınca vitrin değil
           tablo gibi duruyordu. Perspektif şeritte, açı kartta. */
        .phones-section { perspective: 1600px; }

        [data-belir="acik"] .phone-card {
          opacity: 0;
          /* Aşağıdan gelirken hem küçük hem de düz: eğim VARIŞTA oturuyor,
             böylece hareketin sonu bir "yerine yerleşme" gibi okunuyor. */
          transform: translateY(72px) scale(.93) rotateY(0deg);
        }
        [data-belir="acik"] .phone-card.belirdi {
          opacity: 1;
          transform: translateY(0) scale(1) rotateY(calc(var(--yay, 0) * -8deg));
          transition:
            opacity .7s cubic-bezier(.16,.84,.34,1),
            transform .8s cubic-bezier(.16,.84,.34,1);
          /* Aynı şeritteki kartlar sırayla: --sira JS'ten geliyor. */
          transition-delay: calc(var(--sira, 0) * .13s);
        }

        @media (max-width: 768px) {
          /* Şerit yana kaydırmalı; ışık lekesi içerikle birlikte kayıp
             telefonların arkasından çıkıyordu. Eğim de tek tek bakılan
             kartta anlamsız — yelpaze üçünü birden görünce iş yapıyor. */
          .sahne-isik { display: none; }
          [data-belir="acik"] .phone-card.belirdi {
            transform: translateY(0) scale(1);
          }
        }

        /* ——— HERO'YU TELEFONDA TEK EKRANA SIĞDIR ———
           Ölçüldü: 390×844'te hero 917px'e çıkıyordu. minHeight 100vh olmasına
           rağmen içerik taşıyor, elin alt kısmı kesiliyor ve altındaki bölümden
           bir dilim görünüyordu — sayfa "bozuk/kocaman" hissi buradan geliyor.

           İki ayrı sorun var:
           ① İçerik yüksekliği: dikey ritim mobilde sıkıştırıldı.
           ② 100vh'ın kendisi: gerçek telefonda adres çubuğu görünürken
              100vh, GÖRÜNEN alandan büyüktür. svh (small viewport height)
              adres çubuğu AÇIKKEN kalan yüksekliktir — doğru ölçü budur.
              Satır içi stildeki 100vh'ı ezmek için !important şart. */
        @supports (height: 100svh) {
          .hero { min-height: 100svh !important; }
        }

        @media (max-width: 640px) {
          .hero { padding-bottom: 20px !important; }
          .hero-metin > p { margin-bottom: 18px !important; }
          .hero-rozetler { gap: 12px !important; }
          .hero-cta { margin-top: 20px !important; }

          /* Telefon görseline SABİT bir vh vermiyoruz: 390×844'te sığan
             değer 360×640'ta taşıyordu (görselin üstündeki metin yığını
             yüksekliğe göre küçülmüyor, oran ekrandan ekrana değişiyor).
             Bunun yerine görsel KALAN ALANI dolduruyor: metin kendi boyunu
             alıyor, artan yer neyse telefon o kadar oluyor. Böylece hiçbir
             ekran yüksekliğinde ne kesiliyor ne de boşluk kalıyor. */
          .hero-metin { flex: 0 0 auto; }
          /* flex-basis 0 ŞART. basis auto iken sahnenin yüksekliği içindeki
             görselden geliyor, görselin max-height 100% değeri de sahneden —
             döngü. Yüzde çözülemeyince görsel kendi tam boyunu alıyor ve hero
             yine taşıyor (ölçüldü: 897px). basis 0 olunca sahnenin yüksekliğini
             artan alan belirliyor, kesinleşiyor, yüzde çözülüyor.
             NOT: bu blok bir şablon dizgisinin içinde — ters tırnak KULLANMA,
             dizgiyi kırar ve sayfa 500 döner. */
          .hero-tel-sahne {
            flex: 1 1 0 !important;
            /* Alt sınır SAHNEDE, görselde değil. Görsele koyunca esnek kutu
               yine 0'a iniyor, görsel kutusundan taşıyor ve indirme
               düğmesinin üstüne biniyordu (320x568'te görüldü).
               190px zemin: normal ekranlarda zaten aşılıyor, etkisiz;
               çok kısa ekranda hero'nun uzamasını sağlıyor. */
            min-height: 190px !important;
            align-items: flex-end;
            margin-top: 12px !important;
          }
          .hero-tel {
            max-height: 100% !important;
            max-width: 88vw !important;
          }
        }

        @media (max-width: 640px) {
          .hero-right-motif,
          .hero-left-motif {
            display: none;
          }

          .neden-text {
            transform: none !important;
            max-width: 100% !important;
          }

          .neden-phone {
            transform: none !important;
            width: min(80vw, 270px) !important;
            height: auto !important;
          }
        }
      `}</style>
    </main>
  );
}

/* BUTON STYLE */
/* Sosyal hesap adresleri. Boş bırakılırsa düğme HİÇ BASILMAZ.
   Eskiden ikisi de href="#" idi: tıklanınca hiçbir şey olmuyordu ve sayfa
   "bakımsız" görünüyordu. Ölü bağlantı, olmayan bağlantıdan kötüdür.
   Gerçek adresler belli olunca buraya yaz, düğmeler kendiliğinden geri gelir. */
const SOSYAL: { ad: string; url: string }[] = [
  // { ad: "Instagram", url: "https://instagram.com/..." },
  // { ad: "LinkedIn",  url: "https://linkedin.com/company/..." },
];

function btn(color: string) {
  return {
    background: color,
    border: "none",
    padding: "14px 28px",
    borderRadius: "999px",
    fontSize: "18px",
    cursor: "pointer",
    color: "#0C1A3F",
    // <a> için: alt çizgiyi kaldır, satır içi öğeyi düğme gibi hizala.
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    lineHeight: 1,
  };
}