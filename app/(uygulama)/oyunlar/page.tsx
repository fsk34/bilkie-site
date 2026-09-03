"use client";

// Oyunlar — uygulamadaki GamesHubScreen'in web karşılığı.
// Kart dili birebir: #0E1A3A zemin, #1E3060 çerçeve, köşe 20, iç boşluk 20,
// solda 72px çizilmiş ikon, başlık 16 kalın, alt yazı 13 (#6A7AAA).
// Beş oyunun beşi de web'de oynanıyor. `yol` alanı olmayan bir oyun eklenirse
// kart tıklanamaz kalır ve "Yakında" rozeti taşır.

import Link from "next/link";
import Kabuk from "../Kabuk";
import OyunIkon from "./OyunIkon";
import { OYUNLAR } from "./oyunlar";

export default function OyunlarSayfasi() {
  return (
    <Kabuk>
      <h1 className="bk-oyun-baslik">Oyunlar</h1>

      <div className="bk-oyun-liste">
        {OYUNLAR.map((o) => {
          const ic = (
            <>
              <OyunIkon oyun={o.key} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="ad">{o.ad}</div>
                <div className="alt">{o.alt}</div>
              </div>
              {!o.yol && <span className="bk-rozet-yakinda">Yakında</span>}
            </>
          );
          return o.yol ? (
            <Link key={o.key} className="bk-oyun-kart" data-hazir="true" href={o.yol}>
              {ic}
            </Link>
          ) : (
            <div key={o.key} className="bk-oyun-kart" data-hazir="false">
              {ic}
            </div>
          );
        })}
      </div>

    </Kabuk>
  );
}
