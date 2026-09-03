"use client";

// Konu Testleri — ders listesi. Tasarım uygulamadaki KonuTestleriScreen'in aynısı.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import Kabuk from "../Kabuk";
import { useOturum } from "../../lib/oturum";
import { konuAyristir, uniteler } from "../../lib/katalog";
import { useTestIlerlemesi } from "../../lib/canliVeri";
import Bekleme from "../Bekleme";
import { ADIM_SAYISI } from "../../lib/veri";

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

export default function KonuTestleriSayfasi() {
  return (
    <Kabuk>
      <DersListesi />
    </Kabuk>
  );
}

function DersListesi() {
  const { sinif } = useOturum();
  const router = useRouter();
  // Sınıfın tüm test ilerlemesi TEK canlı düğümden; ders içi ekranla aynı abonelik.
  const ilerleme = useTestIlerlemesi(sinif);

  const oran = useMemo(() => {
    const sonuc: Record<string, number> = {};
    if (!ilerleme) return sonuc;
    for (const d of DERS_SIRASI) {
      const konular = uniteler(sinif, d.key).flatMap((u) =>
        u.topics.map((t) => konuAyristir(t).testKey).filter(Boolean)
      );
      if (konular.length === 0) continue;
      const dersIlerleme = ilerleme[d.key] ?? {};
      // Her konu 3 adım: toplam adım üzerinden oran
      const yapilan = konular.reduce((t, k) => t + Math.min(ADIM_SAYISI, dersIlerleme[k] ?? 0), 0);
      sonuc[d.key] = Math.min(1, yapilan / (konular.length * ADIM_SAYISI));
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
            <button className="bk-ustbar-geri" onClick={() => router.push("/")} aria-label="Geri">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/uygulama/cikis.png" alt="" />
            </button>
            <h1>KONU TESTLERİ</h1>
          </div>
          <p>Testleri çöz ve kusursuz ol</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/uygulama/test.png" alt="" />
      </div>

      {dersler.map((d) => {
        const p = oran[d.key] ?? 0;
        return (
          <Link
            key={d.key}
            href={`/ders/${d.key}`}
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
