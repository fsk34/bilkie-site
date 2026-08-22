"use client";

/* ══ CİHAZ ÇERÇEVESİ ══════════════════════════════════════════════════════
   Eskiden çerçeve 19 PNG'nin İÇİNE gömülüydü (400×815, kenar L8 R10 T13 B13).
   Sonucu: çerçeve ile ekran görüntüsü birbirine kaynaklıydı — rengini, cihazı,
   ölçeğini değiştirmek 19 dosyayı yeniden dışa aktarmak demekti. Üstelik gömülü
   olan şey de basit bir siyah yuvarlak dikdörtgendi: çentik yok, tuş yok,
   derinlik yok; "cihaz" değil "kenarlık" gibi duruyordu.
   Artık ekranlar /ekran/ altında çerçevesiz duruyor, kasa burada çiziliyor:
   tek yerden değişir, her ölçekte keskin, ek bayt yok.
   Ölçüler oransal (em/%) — kart genişliği ne olursa olsun bozulmaz. */
export default function PhoneFrame({
  src,
  alt,
  egim = 0,
  video,
  videoRef,
  kamera = true,
  children,
}: {
  src: string;
  alt: string;
  egim?: number; // derece — 0 düz, 12-18 arası hafif 3B
  /* Verilirse ekranda durağan görsel yerine sessiz, döngülü video oynar.
     `src` o zaman POSTER olur: video inene kadar bugünkü ekran görüntüsü
     durur, hiçbir kutu boş kalmaz.
     preload="none" — video yalnız bölüm görüş alanına girince inmeye
     başlar; sayfanın açılış maliyeti hiç artmaz. Oynat/durdur işini
     KaydirBelir'deki mevcut görünürlük gözlemcisi yapıyor.
     muted + playsInline ŞART: tarayıcılar sesli videoyu kendiliğinden
     oynatmaz. Ses kanalı zaten hiç olmamalı — hem bayt hem izin. */
  video?: string;
  /* Video düğümünü dışarı verir. Oyun vitrini oynat/durdur kararını kendi
     veriyor (yalnız ortadaki kart oynar), düğüme erişmesi gerekiyor. */
  videoRef?: (el: HTMLVideoElement | null) => void;
  /* İstatistik ekranlarında delik kamera GÖRSELİN İÇİNE gömülü geliyor
     (kaynak dosyalarda çerçeve baskılı). Kasa bir de kendisi çizerse
     ekranda iki kamera oluyor. false verilince kendi kamerasını çizmez. */
  kamera?: boolean;
  /* Ekran YUVASININ İÇİNE giren içerik. Dışarıdan mutlak konumlu bir
     katman koymak yerine bu var: kasa payı yüzde olarak genişliğe bağlı
     (%2,1) ama yüksekliğe oranı başka çıkıyor, dışarıdan taklit edilen
     her hiza kayıyor (ölçüldü: 8 px). Burada yuva neyse o. */
  children?: React.ReactNode;
}) {
  return (
    <div className="tel-sahne" style={egim ? { ["--egim" as string]: `${egim}deg` } : undefined}>
      <div className={"tel-kasa" + (egim ? " egik" : "")}>
        <span className="tel-yan" />
        <span className="tel-tus tel-tus-guc" />
        <span className="tel-tus tel-tus-ses" />
        <div className="tel-ekran">
          {video ? (
            <video
              ref={videoRef}
              className="tel-video"
              src={video}
              poster={src}
              muted
              loop
              playsInline
              preload="none"
              aria-label={alt}
            />
          ) : (
            <img src={src} alt={alt} loading="lazy" />
          )}
          {children}
          {kamera && <span className="tel-kamera" />}
          <span className="tel-parlama" />
        </div>
      </div>
      <span className="tel-golge" />
    </div>
  );
}
