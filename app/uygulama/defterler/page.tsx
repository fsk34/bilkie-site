"use client";

// Konu Defterleri — ders listesi.
// Tasarım uygulamadaki KonuDefterleriScreen'in aynısı: üstte geri oklu büyük kutu,
// altında ders görselli kutular (sağda ikon, altta ilerleme çubuğu, basınca %92 küçülme).

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import Kabuk from "../Kabuk";
import { useOturum } from "../../lib/oturum";
import { uniteler } from "../../lib/katalog";
import { useDefterIlerlemesi } from "../../lib/canliVeri";
import Bekleme from "../Bekleme";

// Uygulamadaki sıra ve etiketler
const DERS_SIRASI = [
  { key: "turkce",    ad: "Türkçe",          ust: "#72CEFD", alt: "#1E608F", ikon: "abc",    dolgu: "#A3D9FF", parlak: "#DEF2FF" },
  { key: "ingilizce", ad: "İngilizce",       ust: "#971FB5", alt: "#5B0B6E", ikon: "hello",  dolgu: "#E78AFE", parlak: "#F4C8FF" },
  { key: "sosyal",    ad: "Sosyal Bilgiler", ust: "#F0EB4B", alt: "#8F8C2E", ikon: "dunya",  dolgu: "#FFFA5D", parlak: "#FFFDBC" },
  { key: "matematik", ad: "Matematik",       ust: "#F04B74", alt: "#A2314D", ikon: "abakus", dolgu: "#FF789A", parlak: "#FFBDCE" },
  { key: "fen",       ad: "Fen Bilimleri",   ust: "#40DB18", alt: "#206B0D", ikon: "deney",  dolgu: "#72D759", parlak: "#B8F0AE" },
];

function dersEtiketi(key: string, ad: string, sinif: number): string {
  if (key !== "sosyal") return ad;
  if (sinif === 3) return "Hayat Bilgisi";
  if (sinif === 8) return "T.C. İnkılap Tarihi";
  return ad;
}

export default function KonuDefterleriSayfasi() {
  return (
    <Kabuk>
      <DersListesi />
    </Kabuk>
  );
}

function DersListesi() {
  const { sinif } = useOturum();
  const router = useRouter();
  // Sınıfın tüm defter ilerlemesi TEK canlı düğümden; ders içi ekranla aynı abonelik.
  const ilerleme = useDefterIlerlemesi(sinif);

  const oran = useMemo(() => {
    const sonuc: Record<string, number> = {};
    if (!ilerleme) return sonuc;
    for (const d of DERS_SIRASI) {
      const uList = uniteler(sinif, d.key);
      if (uList.length === 0) continue;
      const durum = ilerleme[d.key] ?? {};
      // Uygulamadaki hesap: biten ünite 10/10; bitmeyende hedef = totalPages(2-10 arası) ya da 10
      let toplamOkunan = 0;
      let toplamHedef = 0;
      for (const u of uList) {
        const anahtar = u.defterKey && u.defterKey.length > 0 ? u.defterKey : u.key;
        const v = durum[anahtar];
        if (v?.bitti) { toplamOkunan += 10; toplamHedef += 10; continue; }
        const hedef = (v?.toplamSayfa ?? 0) >= 2 ? Math.min(v.toplamSayfa, 10) : 10;
        toplamOkunan += Math.max(0, Math.min(v?.okunanSayfa ?? 0, hedef));
        toplamHedef += hedef;
      }
      sonuc[d.key] = toplamHedef > 0 ? Math.min(1, toplamOkunan / toplamHedef) : 0;
    }
    return sonuc;
  }, [ilerleme, sinif]);

  const dersler = DERS_SIRASI.filter((d) => uniteler(sinif, d.key).length > 0);

  // `null` = henüz bilinmiyor (kimlik çözülüyor ya da cihazda ilk açılış).
  if (ilerleme === null) return <Bekleme satir={5} />;

  return (
    <>
      <div className="bk-ustbar">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
            <button className="bk-ustbar-geri" onClick={() => router.push("/uygulama")} aria-label="Geri">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/uygulama/cikis.png" alt="" />
            </button>
            <h1>KONU DEFTERLERİ</h1>
          </div>
          <p>Konu defterlerini oku ve pekiştir</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/uygulama/defter.png" alt="" />
      </div>

      {dersler.map((d) => {
        const p = oran[d.key] ?? 0;
        return (
          <Link
            key={d.key}
            href={`/uygulama/defter/${d.key}`}
            className="bk-ders-kutu"
            style={{ background: d.ust, borderBottom: `7px solid ${d.alt}` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="ikon" src={`/uygulama/${d.ikon}.png`} alt="" />
            <span className="ad">{dersEtiketi(d.key, d.ad, sinif)}</span>
            <span className="iz">
              <i className="dolgu" style={{ width: `calc(${p * 100}% - 6px)`, background: d.dolgu }} />
              <i className="parlak" style={{ width: `calc(${p * 100}% - 14px)`, background: d.parlak }} />
            </span>
          </Link>
        );
      })}
    </>
  );
}
