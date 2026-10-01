"use client";

// Android TestScreens.kt ExitConfirmDialog'un birebir karşılığı — TÜM "Çıkmak istediğine emin misin?"
// onayları bu tek bileşen (iOS'ta 29 Eyl 2026'da birleştirildi; web'de her ekranın kendi penceresi vardı:
// "Çıkmak istiyor musun? Hayır / Evet, Çık" ve test/defter/yazılı/Hata Turu hiç sormadan çıkıyordu).
// Ölçüler: karartma #000 α 0xAA · kart %82 genişlik, #4A538E kabartma (3/3/9 içeride #0C1A3F), köşe 20/18,
// iç boşluk 24/28, aralık 20 · başlık baslik 18 · açıklama 13 (%70) · butonlar 52 yükseklik, aralık 10,
// Çıkış Yap #8B1A1A/#B71C1C, Vazgeç #4A538E/#2C335E, köşe 12/10, yazı baslik 15.

export default function CikisOnayi({
  onVazgec, onCik, baslik = "Çıkmak istediğine emin misin?", mesaj = "",
}: {
  onVazgec: () => void; onCik: () => void; baslik?: string; mesaj?: string;
}) {
  return (
    <div className="bk-cikis-onay" onClick={onVazgec}>
      <div className="kart" onClick={(e) => e.stopPropagation()}>
        <h3>{baslik}</h3>
        {mesaj && <p>{mesaj}</p>}
        <div className="dugmeler">
          <button className="cik" onClick={onCik}>Çıkış Yap</button>
          <button className="vazgec" onClick={onVazgec}>Vazgeç</button>
        </div>
      </div>
    </div>
  );
}
