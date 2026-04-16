import localFont from "next/font/local";

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
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          textAlign: "center",
          padding: "20px",
          position: "relative",
          overflow: "hidden",
        }}
      >

        {/* SAĞ ÜST MOTİF */}
        <div
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

        <h1
          className={bilkieFont.className}
          style={{
            fontSize: "80px",
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
            fontSize: "22px",
            marginBottom: "40px",
            color: "#AFC6E6",
            position: "relative",
            zIndex: 2,
          }}
        >
          Öğrenciler için oyunlaştırılmış öğrenme
        </p>

        <div
          style={{
            display: "flex",
            gap: "20px",
            flexWrap: "wrap",
            justifyContent: "center",
            position: "relative",
            zIndex: 2,
          }}
        >
          <button className={baslikFont.className} style={btn("#D8C58A")}>
            Konu Testleri
          </button>

          <button className={baslikFont.className} style={btn("#E6A893")}>
            Konu Defterleri
          </button>

          <button className={baslikFont.className} style={btn("#A6A0D6")}>
            Yazılılar
          </button>
        </div>
      </section>

      {/* NEDEN BİLKİE */}
      <section
        style={{
          background: "#86B7DD",
          padding: "80px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div style={{ maxWidth: "500px", transform: "translateX(-30px)" }}>
          <h2
            className={bilkieFont.className}
            style={{
              fontSize: "52px",
              marginBottom: "20px",
              color: "#0C1A3F",
            }}
          >
            Neden bilkie?
          </h2>

          <p
            className={mainFont.className}
            style={{
              fontSize: "20px",
              color: "#0C1A3F",
              lineHeight: "1.4",
              fontWeight: 600,
            }}
          >
            Bilkie, sadece eğitim sunmaz, alışkanlık oluşturur.
            <br />
            Bilkie, öğrenmeyi oyunlaştırarak motivasyon problemini çözer.
          </p>
        </div>

        <div
          style={{
            width: "270px",
            height: "560px",
            background: "#111827",
            borderRadius: "36px",
            padding: "14px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
            position: "relative",
            transform: "translateX(30px)",
          }}
        >
          <div
            style={{
              width: "120px",
              height: "26px",
              background: "#0b1220",
              borderRadius: "0 0 18px 18px",
              position: "absolute",
              top: "0",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 3,
            }}
          />

          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "24px",
              overflow: "hidden",
              position: "relative",
              display: "flex",
              flexDirection: "column",
              background: "#ffffff",
            }}
          >
            <img
              src="/bilkie.png"
              alt="bilkie app"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>
        </div>
      </section>

      {/* KONU TESTLERİ */}
      <section>
        <div
          style={{
            background: "#86B7DD",
            padding: "70px 40px 35px 40px",
            textAlign: "center",
          }}
        >
          <h2
            className={baslikFont.className}
            style={{
              fontSize: "52px",
              marginBottom: "18px",
              color: "#0C1A3F",
            }}
          >
            Konu Testleri
          </h2>

          <p
            className={mainFont.className}
            style={{
              fontSize: "20px",
              color: "#0C1A3F",
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
          style={{
            background: "#F4E1B9",
            padding: "70px 40px 80px 40px",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            gap: "50px",
            flexWrap: "wrap",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* İLERLEME YOLU */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: "1040px",
              height: "300px",
              pointerEvents: "none",
              zIndex: 0,
              opacity: 0.98,
            }}
          >
            <svg
              viewBox="0 0 1040 300"
              style={{
                width: "100%",
                height: "100%",
                overflow: "visible",
              }}
            >
              <defs>
                <linearGradient id="testRoadGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#7FB2E6" />
                  <stop offset="45%" stopColor="#6FA0D8" />
                  <stop offset="100%" stopColor="#5B8FCD" />
                </linearGradient>
                <filter id="roadGlow" x="-20%" y="-60%" width="140%" height="220%">
                  <feGaussianBlur stdDeviation="16" />
                </filter>
              </defs>

              {/* GENİŞ GLOW */}
              <path
                d="M 50 190 C 175 118, 295 238, 430 172 S 705 102, 990 182"
                fill="none"
                stroke="rgba(255,255,255,0.16)"
                strokeWidth="38"
                strokeLinecap="round"
                filter="url(#roadGlow)"
              />

              {/* ANA YOL */}
              <path
                d="M 50 190 C 175 118, 295 238, 430 172 S 705 102, 990 182"
                fill="none"
                stroke="url(#testRoadGradient)"
                strokeWidth="24"
                strokeLinecap="round"
              />

              {/* İÇ VURGU */}
              <path
                d="M 50 190 C 175 118, 295 238, 430 172 S 705 102, 990 182"
                fill="none"
                stroke="rgba(255,255,255,0.18)"
                strokeWidth="8"
                strokeLinecap="round"
              />

              {/* DASHED İLERLEME ÇİZGİSİ */}
              <path
                d="M 50 190 C 175 118, 295 238, 430 172 S 705 102, 990 182"
                fill="none"
                stroke="#F7F2E8"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray="12 14"
                opacity="0.95"
              />

              {/* SOL YILDIZ */}
              <g transform="translate(165 150)">
                <circle r="30" fill="#4A538E" opacity="0.12" />
                <circle r="23" fill="#F3E0A2" opacity="0.18" />
                <path
                  d="M 0 -18 L 5 -6 L 18 -6 L 8 2 L 12 16 L 0 8 L -12 16 L -8 2 L -18 -6 L -5 -6 Z"
                  fill="#F1C83F"
                />
              </g>

              {/* ORTA KİLİT */}
              <g transform="translate(518 176)">
                <circle r="32" fill="#5FAA4A" opacity="0.12" />
                <circle r="24" fill="#9CCC65" />
                <rect x="-10" y="-2" width="20" height="16" rx="4" fill="#F7F2E8" />
                <path
                  d="M -7 -2 V -8 A 7 7 0 0 1 7 -8 V -2"
                  fill="none"
                  stroke="#F7F2E8"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </g>

              {/* SAĞ TİK */}
              <g transform="translate(862 150)">
                <circle r="32" fill="#4A538E" opacity="0.12" />
                <circle r="24" fill="#8FD36B" />
                <path
                  d="M -10 1 L -2 10 L 12 -8"
                  fill="none"
                  stroke="#F7F2E8"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>

              {/* KÜÇÜK DÜĞÜMLER */}
              <circle cx="310" cy="212" r="7" fill="#F7F2E8" opacity="0.95" />
              <circle cx="690" cy="132" r="7" fill="#F7F2E8" opacity="0.95" />
            </svg>
          </div>
          {[
            "/konutesti1.png",
            "/konutesti2.png",
            "/konutesti3.png",
          ].map((src, index) => (
            <div
              key={index}
              style={{
                width: "210px",
                height: "430px",
                background: "#111827",
                borderRadius: "30px",
                padding: "11px",
                boxShadow: "0 18px 40px rgba(0,0,0,0.22)",
                position: "relative",
                marginTop: "-50px",
                zIndex: 2,
              }}
            >
              <div
                style={{
                  width: "96px",
                  height: "20px",
                  background: "#0b1220",
                  borderRadius: "0 0 14px 14px",
                  position: "absolute",
                  top: "0",
                  left: "50%",
                  transform: "translateX(-50%)",
                  zIndex: 3,
                }}
              />

              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "20px",
                  overflow: "hidden",
                  background: "#ffffff",
                }}
              >
                <img
                  src={src}
                  alt={`bilkie konu testi ${index + 1}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* KONU DEFTERLERİ */}
      <section>
        <div
          style={{
            background: "#86B7DD",
            padding: "70px 40px 35px 40px",
            textAlign: "center",
          }}
        >
          <h2
            className={baslikFont.className}
            style={{
              fontSize: "52px",
              marginBottom: "18px",
              color: "#0C1A3F",
            }}
          >
            Konu Defterleri
          </h2>

          <p
            className={mainFont.className}
            style={{
              fontSize: "20px",
              color: "#0C1A3F",
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
          style={{
            background: "#E6A893",
            padding: "70px 40px 80px 40px",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            gap: "50px",
            flexWrap: "wrap",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* DEFTER YOLU */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: "1040px",
              height: "300px",
              pointerEvents: "none",
              zIndex: 0,
              opacity: 0.98,
            }}
          >
            <svg
              viewBox="0 0 1040 300"
              style={{
                width: "100%",
                height: "100%",
                overflow: "visible",
              }}
            >
              <defs>
                <linearGradient id="defterRoadGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#F3C1AE" />
                  <stop offset="45%" stopColor="#E9AF98" />
                  <stop offset="100%" stopColor="#D9987E" />
                </linearGradient>
                <filter id="defterRoadGlow" x="-20%" y="-60%" width="140%" height="220%">
                  <feGaussianBlur stdDeviation="16" />
                </filter>
              </defs>

              {/* GENİŞ GLOW */}
              <path
                d="M 60 182 C 185 112, 300 232, 445 170 S 720 108, 990 176"
                fill="none"
                stroke="rgba(255,255,255,0.14)"
                strokeWidth="38"
                strokeLinecap="round"
                filter="url(#defterRoadGlow)"
              />

              {/* ANA YOL */}
              <path
                d="M 60 182 C 185 112, 300 232, 445 170 S 720 108, 990 176"
                fill="none"
                stroke="url(#defterRoadGradient)"
                strokeWidth="24"
                strokeLinecap="round"
              />

              {/* İÇ VURGU */}
              <path
                d="M 60 182 C 185 112, 300 232, 445 170 S 720 108, 990 176"
                fill="none"
                stroke="rgba(255,255,255,0.16)"
                strokeWidth="8"
                strokeLinecap="round"
              />

              {/* DEFTER ÇİZGİSİ */}
              <path
                d="M 60 182 C 185 112, 300 232, 445 170 S 720 108, 990 176"
                fill="none"
                stroke="#FFF3EC"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray="12 14"
                opacity="0.92"
              />

              {/* SOL KİTAP */}
              <g transform="translate(170 146)">
                <circle r="30" fill="#4A538E" opacity="0.12" />
                <rect x="-18" y="-18" width="36" height="36" rx="7" fill="#F6E4D8" />
                <line x1="-6" y1="-11" x2="-6" y2="11" stroke="#D79B82" strokeWidth="3" strokeLinecap="round" />
                <line x1="2" y1="-8" x2="10" y2="-8" stroke="#D79B82" strokeWidth="3" strokeLinecap="round" />
                <line x1="2" y1="0" x2="10" y2="0" stroke="#D79B82" strokeWidth="3" strokeLinecap="round" />
                <line x1="2" y1="8" x2="10" y2="8" stroke="#D79B82" strokeWidth="3" strokeLinecap="round" />
              </g>

              {/* ORTA AYRAÇ */}
              <g transform="translate(520 178)">
                <circle r="32" fill="#4A538E" opacity="0.12" />
                <rect x="-12" y="-18" width="24" height="38" rx="4" fill="#8C63D2" />
                <path d="M -12 -18 H 12 V -2 L 0 8 L -12 -2 Z" fill="#B895F2" />
              </g>

              {/* SAĞ SAYFA TİK */}
              <g transform="translate(860 146)">
                <circle r="32" fill="#4A538E" opacity="0.12" />
                <rect x="-16" y="-18" width="32" height="36" rx="6" fill="#FFF3EC" />
                <path d="M -7 3 L -1 9 L 9 -4" fill="none" stroke="#86B76B" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="-8" y1="-8" x2="8" y2="-8" stroke="#D79B82" strokeWidth="3" strokeLinecap="round" />
              </g>

              {/* KÜÇÜK DÜĞÜMLER */}
              <circle cx="318" cy="208" r="7" fill="#FFF3EC" opacity="0.92" />
              <circle cx="692" cy="136" r="7" fill="#FFF3EC" opacity="0.92" />
            </svg>
          </div>
          {[
            "/konudefteri1.png",
            "/konudefteri2.png",
            "/konudefteri3.png",
          ].map((src, index) => (
            <div
              key={index}
              style={{
                width: "210px",
                height: "430px",
                background: "#111827",
                borderRadius: "30px",
                padding: "11px",
                boxShadow: "0 18px 40px rgba(0,0,0,0.22)",
                position: "relative",
                marginTop: "-50px",
                zIndex: 2,
              }}
            >
              <div
                style={{
                  width: "96px",
                  height: "20px",
                  background: "#0b1220",
                  borderRadius: "0 0 14px 14px",
                  position: "absolute",
                  top: "0",
                  left: "50%",
                  transform: "translateX(-50%)",
                  zIndex: 3,
                }}
              />

              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "20px",
                  overflow: "hidden",
                  background: "#ffffff",
                }}
              >
                <img
                  src={src}
                  alt={`bilkie konu defteri ${index + 1}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* YAZILILAR */}
      <section>
        <div
          style={{
            background: "#86B7DD",
            padding: "70px 40px 35px 40px",
            textAlign: "center",
          }}
        >
          <h2
            className={baslikFont.className}
            style={{
              fontSize: "52px",
              marginBottom: "18px",
              color: "#0C1A3F",
            }}
          >
            Yazılılar
          </h2>

          <p
            className={mainFont.className}
            style={{
              fontSize: "20px",
              color: "#0C1A3F",
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
          style={{
            background: "#A6A0D6",
            padding: "70px 40px 80px 40px",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            gap: "50px",
            flexWrap: "wrap",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* YAZILI YOLU */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: "1040px",
              height: "300px",
              pointerEvents: "none",
              zIndex: 0,
              opacity: 0.98,
            }}
          >
            <svg
              viewBox="0 0 1040 300"
              style={{
                width: "100%",
                height: "100%",
                overflow: "visible",
              }}
            >
              <defs>
                <linearGradient id="yaziliRoadGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#C9C2F1" />
                  <stop offset="45%" stopColor="#B6AFE6" />
                  <stop offset="100%" stopColor="#9D97D7" />
                </linearGradient>
                <filter id="yaziliRoadGlow" x="-20%" y="-60%" width="140%" height="220%">
                  <feGaussianBlur stdDeviation="16" />
                </filter>
              </defs>

              {/* GENİŞ GLOW */}
              <path
                d="M 60 182 C 185 112, 300 232, 445 170 S 720 108, 990 176"
                fill="none"
                stroke="rgba(255,255,255,0.14)"
                strokeWidth="38"
                strokeLinecap="round"
                filter="url(#yaziliRoadGlow)"
              />

              {/* ANA YOL */}
              <path
                d="M 60 182 C 185 112, 300 232, 445 170 S 720 108, 990 176"
                fill="none"
                stroke="url(#yaziliRoadGradient)"
                strokeWidth="24"
                strokeLinecap="round"
              />

              {/* İÇ VURGU */}
              <path
                d="M 60 182 C 185 112, 300 232, 445 170 S 720 108, 990 176"
                fill="none"
                stroke="rgba(255,255,255,0.16)"
                strokeWidth="8"
                strokeLinecap="round"
              />

              {/* YAZILI ÇİZGİSİ */}
              <path
                d="M 60 182 C 185 112, 300 232, 445 170 S 720 108, 990 176"
                fill="none"
                stroke="#F6F2FF"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray="12 14"
                opacity="0.92"
              />

              {/* SOL KALEM */}
              <g transform="translate(170 146)">
                <circle r="30" fill="#4A538E" opacity="0.12" />
                <g transform="rotate(-18)">
                  <rect x="-7" y="-18" width="14" height="28" rx="4" fill="#F3C54B" />
                  <polygon points="-7,10 7,10 0,20" fill="#E7D6C7" />
                  <rect x="-7" y="-22" width="14" height="6" rx="2" fill="#FF7FA2" />
                </g>
              </g>

              {/* ORTA KLASÖR / PANO */}
              <g transform="translate(520 178)">
                <circle r="32" fill="#4A538E" opacity="0.12" />
                <rect x="-16" y="-16" width="32" height="34" rx="6" fill="#F3C54B" />
                <rect x="-8" y="-22" width="16" height="8" rx="3" fill="#7C7C7C" />
                <path d="M -7 -2 L -1 4 L 8 -6" fill="none" stroke="#0C1A3F" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="-7" y1="8" x2="7" y2="8" stroke="#0C1A3F" strokeWidth="3" strokeLinecap="round" />
              </g>

              {/* SAĞ SONUÇ YILDIZI */}
              <g transform="translate(860 146)">
                <circle r="32" fill="#4A538E" opacity="0.12" />
                <path
                  d="M 0 -19 L 5 -6 L 18 -6 L 8 2 L 12 16 L 0 8 L -12 16 L -8 2 L -18 -6 L -5 -6 Z"
                  fill="#F1C83F"
                />
              </g>

              {/* KÜÇÜK DÜĞÜMLER */}
              <circle cx="318" cy="208" r="7" fill="#F6F2FF" opacity="0.92" />
              <circle cx="692" cy="136" r="7" fill="#F6F2FF" opacity="0.92" />
            </svg>
          </div>
          {[
            "/yazili1.png",
            "/yazili2.png",
            "/yazili3.png",
          ].map((src, index) => (
            <div
              key={index}
              style={{
                width: "210px",
                height: "430px",
                background: "#111827",
                borderRadius: "30px",
                padding: "11px",
                boxShadow: "0 18px 40px rgba(0,0,0,0.22)",
                position: "relative",
                marginTop: "-50px",
                zIndex: 2,
              }}
            >
              <div
                style={{
                  width: "96px",
                  height: "20px",
                  background: "#0b1220",
                  borderRadius: "0 0 14px 14px",
                  position: "absolute",
                  top: "0",
                  left: "50%",
                  transform: "translateX(-50%)",
                  zIndex: 3,
                }}
              />

              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "20px",
                  overflow: "hidden",
                  background: "#ffffff",
                }}
              >
                <img
                  src={src}
                  alt={`bilkie yazili ${index + 1}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* OYUNLAŞTIRMA */}
      <section
        style={{
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* ÜST YAZI */}
        <div
          style={{
            background: "#0C1A3F",
            padding: "80px 40px 40px 40px",
            textAlign: "center",
            position: "relative",
            zIndex: 4,
          }}
        >
          <h2
            className={baslikFont.className}
            style={{
              fontSize: "52px",
              marginBottom: "20px",
              color: "#8FB3D9",
            }}
          >
            Oyunlaştırma
          </h2>

          <p
            className={mainFont.className}
            style={{
              fontSize: "20px",
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
          style={{
            background: "#0C1A3F",
            padding: "50px 40px 100px 40px",
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
          {[
            "/oyunlastirma1.png",
            "/oyunlastirma2.png",
            "/oyunlastirma3.png",
          ].map((src, index) => (
            <div
              key={index}
              style={{
                width: index === 1 ? "240px" : "200px",
                height: index === 1 ? "480px" : "420px",
                background: "#111827",
                borderRadius: "30px",
                padding: "11px",
                boxShadow: "0 18px 40px rgba(0,0,0,0.22)",
                position: "relative",
                marginTop: index === 1 ? "-25px" : "-20px",
                zIndex: 2,
              }}
            >
              <div
                style={{
                  width: "90px",
                  height: "20px",
                  background: "#0b1220",
                  borderRadius: "0 0 14px 14px",
                  position: "absolute",
                  top: "0",
                  left: "50%",
                  transform: "translateX(-50%)",
                  zIndex: 3,
                }}
              />

              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "20px",
                  overflow: "hidden",
                  background: "#ffffff",
                }}
              >
                <img
                  src={src}
                  alt={`bilkie oyun ${index + 1}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: index === 1 ? "contain" : "cover",
                    background: "#0C1A3F",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* MICROLEARNING METODU */}
      <section>
        {/* ÜST YAZI */}
        <div
          style={{
            background: "#0C1A3F",
            padding: "70px 40px 30px 40px",
            textAlign: "center",
          }}
        >
          <h2
            className={baslikFont.className}
            style={{
              fontSize: "52px",
              marginBottom: "18px",
              color: "#8FB3D9",
            }}
          >
            Microlearning Metodu
          </h2>

          <p
            className={mainFont.className}
            style={{
              fontSize: "20px",
              color: "#AFC6E6",
              lineHeight: "1.4",
              fontWeight: 600,
              maxWidth: "860px",
              margin: "0 auto",
            }}
          >
            Kısa dikkat sürelerine uygun, öğrenmeyi hızlandıran ve istendiği zaman erişilebilen bu yöntem, geleneksel uzun eğitimlerin yerini alan modern bir yaklaşım olarak öne çıkar.
          </p>
        </div>

        {/* ALT BİLGİ KARTLARI */}
        <div
          style={{
            padding: "35px 30px 70px 30px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px",
              alignItems: "stretch",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "20px",
              }}
            >
              {/* ESNEKLİK */}
              <div
                style={{
                  background: "#F3A24C",
                  minHeight: "220px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "28px 30px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "80px",
                    marginBottom: "16px",
                    overflow: "hidden",
                  }}
                >
                  <img
                    src="/micro1.png"
                    alt="Esneklik"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />
                </div>

                <p
                  className={mainFont.className}
                  style={{
                    fontSize: "17px",
                    lineHeight: "1.45",
                    fontWeight: 600,
                    color: "#0C1A3F",
                    maxWidth: "560px",
                  }}
                >
                  Esneklik: Çalışanların veya öğrencilerin yoğun tempolarına uyum sağlar, "ihtiyaç anında" öğrenmeyi destekler.
                </p>
              </div>

              {/* ARTAN KALICILIK */}
              <div
                style={{
                  background: "#0C1A3F",
                  minHeight: "220px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "28px 30px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "80px",
                    marginBottom: "16px",
                    overflow: "hidden",
                  }}
                >
                  <img
                    src="/micro2.png"
                    alt="Artan Kalıcılık"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />
                </div>

                <p
                  className={mainFont.className}
                  style={{
                    fontSize: "17px",
                    lineHeight: "1.45",
                    fontWeight: 600,
                    color: "#D8E4F3",
                    maxWidth: "560px",
                  }}
                >
                  Artan Kalıcılık: Küçük parçalar halinde öğrenme, bilginin akılda kalıcılığını artırır ve bilişsel yükü azaltır.
                </p>
              </div>
            </div>

            {/* DİJİTAL VE ERİŞİLEBİLİR */}
            <div
              style={{
                background: "#F7F5F0",
                minHeight: "460px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "28px 30px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "90px",
                  marginBottom: "18px",
                  overflow: "hidden",
                }}
              >
                <img
                  src="/micro3.png"
                  alt="Dijital ve Erişilebilir"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              </div>

              <p
                className={mainFont.className}
                style={{
                  fontSize: "17px",
                  lineHeight: "1.45",
                  fontWeight: 600,
                  color: "#0C1A3F",
                  maxWidth: "560px",
                }}
              >
                Dijital ve Erişilebilir: Akıllı telefonlar, tabletler veya bilgisayarlar üzerinden her zaman, her yerde erişim sağlar.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* İSTATİSTİK */}
      <section>
        {/* ÜST YAZI */}
        <div
          style={{
            background: "#0C1A3F",
            padding: "70px 40px 35px 40px",
            textAlign: "center",
          }}
        >
          <h2
            className={baslikFont.className}
            style={{
              fontSize: "52px",
              marginBottom: "18px",
              color: "#8FB3D9",
            }}
          >
            İstatistik
          </h2>

          <p
            className={mainFont.className}
            style={{
              fontSize: "20px",
              color: "#AFC6E6",
              lineHeight: "1.4",
              fontWeight: 600,
              maxWidth: "820px",
              margin: "0 auto",
            }}
          >
            Kişisel ilerlemeni görmek için İstatistik bölümüne girip eksik olduğun dersi, üniteyi ve konuyu görebilirsin.
          </p>
        </div>

        {/* ALT GÖRSELLER */}
        <div
          style={{
            display: "flex",
            width: "100%",
            flexWrap: "wrap",
          }}
        >
          {[
            { title: "Konu Testleri", color: "#F4E1B9", img: "/istatistik1.png" },
            { title: "Konu Defterleri", color: "#E6A893", img: "/istatistik2.png" },
            { title: "Yazılılar", color: "#A6A0D6", img: "/istatistik3.png" },
          ].map((item, index) => (
            <div
              key={index}
              style={{
                flex: "1 1 300px",
                background: item.color,
                padding: "40px 20px 60px 20px",
                textAlign: "center",
              }}
            >
              <h3
                className={baslikFont.className}
                style={{
                  fontSize: "28px",
                  marginBottom: "20px",
                  color: "#0C1A3F",
                }}
              >
                {item.title}
              </h3>

              <div
                style={{
                  width: "180px",
                  height: "360px",
                  margin: "0 auto",
                  background: "#111827",
                  borderRadius: "26px",
                  padding: "10px",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: "80px",
                    height: "16px",
                    background: "#0b1220",
                    borderRadius: "0 0 12px 12px",
                    position: "absolute",
                    top: "0",
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 3,
                  }}
                />

                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "18px",
                    overflow: "hidden",
                    background: "#ffffff",
                  }}
                >
                  <img
                    src={item.img}
                    alt={item.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      background: "#0C1A3F",
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* LİGLER */}
      <section>
        <div
          style={{
            background: "#0C1A3F",
            padding: "80px 40px",
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
                fontSize: "52px",
                marginBottom: "18px",
                color: "#8FB3D9",
              }}
            >
              Ligler
            </h2>

            <p
              className={mainFont.className}
              style={{
                fontSize: "20px",
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
              width: "250px",
              height: "500px",
              background: "#111827",
              borderRadius: "34px",
              padding: "12px",
              boxShadow: "0 18px 40px rgba(0,0,0,0.22)",
              position: "relative",
            }}
          >
            {/* SHINE EFEKTİ */}
            <div
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
            <div
              style={{
                width: "104px",
                height: "22px",
                background: "#0b1220",
                borderRadius: "0 0 16px 16px",
                position: "absolute",
                top: "0",
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 3,
              }}
            />

            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "22px",
                overflow: "hidden",
                background: "#ffffff",
              }}
            >
              <img
                src="/ligler.png"
                alt="Ligler"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  background: "#0C1A3F",
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* PROFİL */}
      <section>
        <div
          style={{
            background: "#0C1A3F",
            padding: "90px 50px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "40px",
          }}
        >
          {/* SOL YAZI */}
          <div style={{ maxWidth: "760px", flex: "1 1 520px" }}>
            <h2
              className={baslikFont.className}
              style={{
                fontSize: "72px",
                marginBottom: "24px",
                color: "#8FB3D9",
              }}
            >
              Profil
            </h2>

            <p
              className={mainFont.className}
              style={{
                fontSize: "34px",
                color: "#AFC6E6",
                lineHeight: "1.35",
                fontWeight: 600,
                maxWidth: "760px",
                marginBottom: "40px",
              }}
            >
              Kişiselleştirme ile avatarını ve kullanıcı adını değiştirebilirsin.
              <br />
              Diğer sınıfların içeriklerine de göz atıp kendini deneyebilirsin.
            </p>

            <div
              style={{
                display: "flex",
                gap: "20px",
                flexWrap: "wrap",
              }}
            >
              <button
                className={baslikFont.className}
                style={{
                  background: "#F3A24C",
                  border: "none",
                  padding: "28px 90px",
                  fontSize: "30px",
                  cursor: "pointer",
                  color: "#0C1A3F",
                  minWidth: "360px",
                }}
              >
                Başarımlar
              </button>

              <button
                className={baslikFont.className}
                style={{
                  background: "#F3A24C",
                  border: "none",
                  padding: "28px 90px",
                  fontSize: "30px",
                  cursor: "pointer",
                  color: "#0C1A3F",
                  minWidth: "360px",
                }}
              >
                Rozetler
              </button>
            </div>
          </div>

          {/* SAĞ TELEFONLAR */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "28px",
              flexWrap: "wrap",
              flex: "1 1 520px",
            }}
          >
            {[
              "/profil1.png",
              "/profil2.png",
            ].map((src, index) => (
              <div
                key={index}
                style={{
                  width: "250px",
                  height: "500px",
                  background: "#111827",
                  borderRadius: "34px",
                  padding: "12px",
                  boxShadow: "0 18px 40px rgba(0,0,0,0.22)",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: "104px",
                    height: "22px",
                    background: "#0b1220",
                    borderRadius: "0 0 16px 16px",
                    position: "absolute",
                    top: "0",
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 3,
                  }}
                />

                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "22px",
                    overflow: "hidden",
                    background: "#ffffff",
                  }}
                >
                  <img
                    src={src}
                    alt={`Profil ${index + 1}`}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      background: "#0C1A3F",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* İLETİŞİM */}
      <section>
        <div
          style={{
            background: "#0C1A3F",
            padding: "70px 40px 60px 40px",
            textAlign: "center",
            borderTop: "1px solid rgba(143,179,217,0.12)",
          }}
        >
          <h2
            className={baslikFont.className}
            style={{
              fontSize: "52px",
              marginBottom: "18px",
              color: "#8FB3D9",
            }}
          >
            İletişim
          </h2>

          <p
            className={mainFont.className}
            style={{
              fontSize: "20px",
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
              href="#"
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
              Instagram
            </a>

            <a
              href="#"
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
              LinkedIn
            </a>
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
      `}</style>
    </main>
  );
}

/* BUTON STYLE */
function btn(color: string) {
  return {
    background: color,
    border: "none",
    padding: "14px 28px",
    borderRadius: "999px",
    fontSize: "18px",
    cursor: "pointer",
    color: "#0C1A3F",
  };
}