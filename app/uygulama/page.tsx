"use client";

// Ana ekran — mobil uygulamanın ana ekranının aynısı:
// üstte 4 keşif kutusu, altında KONU TESTLERİ / KONU DEFTERLERİ / YAZILIYA HAZIRLIK.
// Başlıklar, alt yazılar, görseller ve renkler uygulamadan birebir alındı (HomeScreen.swift).

import Link from "next/link";
import Kabuk from "./Kabuk";

const KUTULAR = [
  { ad: "Atasözleri\nve Deyimler", gorsel: "atasozu",     ust: "#1F2C6B", alt: "#262F6F", yol: "/uygulama/atasozleri" },
  { ad: "Dünya\nHarikaları",       gorsel: "harikalar",   ust: "#10496E", alt: "#0F5870", yol: "/uygulama/harikalar" },
  { ad: "Türkiye'yi\nKeşfet",      gorsel: "turkbayragi", ust: "#25256B", alt: "#453486", yol: "/uygulama/turkiye" },
  { ad: "Meslek\nGrupları",        gorsel: "meslek",      ust: "#2967A5", alt: "#346EB5", yol: "/uygulama/meslekler" },
];

const BUYUKLER = [
  { baslik: "KONU TESTLERİ",    alt: "Testleri çöz ve kusursuz ol",        gorsel: "test",   yol: "/uygulama/testler" },
  { baslik: "KONU DEFTERLERİ",  alt: "Defterleri oku, konuları pekiştir",  gorsel: "defter", yol: "/uygulama/defterler" },
  { baslik: "YAZILIYA HAZIRLIK", alt: "Yazılılara en iyi şekilde hazırlan", gorsel: "yazili", yol: "/uygulama/yazili" },
];

export default function AnaEkran() {
  return (
    <Kabuk>
      {/* Başlık yok: içerik doğrudan yukarıdan başlar, sağ raydaki kartlarla aynı hizada.
          Sınıf bilgisi sağ raydaki profil kartında duruyor. */}
      <div className="bk-kutular">
        {KUTULAR.map((k) => (
          <Link
            key={k.gorsel}
            href={k.yol}
            className="bk-kutu"
            style={{ background: `linear-gradient(${k.ust}, ${k.alt})` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/uygulama/${k.gorsel}.png`} alt="" />
            <span>{k.ad}</span>
          </Link>
        ))}
      </div>

      <div className="bk-buyukler">
        {BUYUKLER.map((b) => (
          <Link key={b.gorsel} href={b.yol} className="bk-buyuk">
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2>{b.baslik}</h2>
              <p>{b.alt}</p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/uygulama/${b.gorsel}.png`} alt="" />
          </Link>
        ))}
      </div>
    </Kabuk>
  );
}
