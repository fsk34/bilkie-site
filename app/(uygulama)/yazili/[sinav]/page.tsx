"use client";

// Yazılı — ders seçimi. Uygulamadaki YaziliSubjectsScreen: kabartmalı ders kartları,
// ilerleme çubuğu (2 adım üzerinden yüzde) ve ders ikonu.

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import Kabuk from "../../Kabuk";
import { useOturum } from "../../../lib/oturum";
import { useYaziliIlerlemesi } from "../../../lib/canliVeri";
import Bekleme from "../../Bekleme";
import { YAZILI_ADIM_SAYISI } from "../../../lib/veri";

const DERSLER = [
  { key: "turkce",    ad: "Türkçe",          ust: "#72CEFD", alt: "#1E608F", dolgu: "#A3D9FF", ikon: "abc" },
  { key: "matematik", ad: "Matematik",       ust: "#F04B74", alt: "#A2314D", dolgu: "#FF789A", ikon: "abakus" },
  { key: "fen",       ad: "Fen Bilimleri",   ust: "#40DB18", alt: "#206B0D", dolgu: "#72D759", ikon: "deney" },
  { key: "ingilizce", ad: "İngilizce",       ust: "#971FB5", alt: "#5B0B6E", dolgu: "#E78AFE", ikon: "hello" },
  { key: "sosyal",    ad: "Sosyal Bilgiler", ust: "#F0EB4B", alt: "#8F8C2E", dolgu: "#FFFA5D", ikon: "dunya" },
];

export default function YaziliDerslerSayfasi() {
  return (
    <Kabuk>
      <Icerik />
    </Kabuk>
  );
}

function Icerik() {
  const params = useParams<{ sinav: string }>();
  const sinavKey = params?.sinav ?? "";
  const router = useRouter();
  const { sinif } = useOturum();
  // Tüm yazılı ilerlemesi TEK canlı düğümden (ders → sınav → tamamlanan adım).
  const tumIlerleme = useYaziliIlerlemesi();
  const ilerleme = useMemo(() => {
    const out: Record<string, number> = {};
    for (const d of DERSLER) out[d.key] = tumIlerleme?.[d.key]?.[sinavKey] ?? 0;
    return out;
  }, [tumIlerleme, sinavKey]);

  // `null` = henüz bilinmiyor (kimlik çözülüyor ya da cihazda ilk açılış).
  if (tumIlerleme === null) return <Bekleme satir={5} />;

  return (
    <>
      <div className="bk-ustbar">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
            <button className="bk-ustbar-geri" onClick={() => router.push("/yazili")} aria-label="Geri">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/uygulama/cikis.png" alt="" />
            </button>
            <h1>YAZILIYA HAZIRLIK</h1>
          </div>
          <p>Yazılılara en iyi şekilde hazırlan</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/uygulama/yazili.png" alt="" />
      </div>

      {DERSLER.map((d) => {
        const tamamlanan = ilerleme[d.key] ?? 0;
        const oran = tamamlanan / YAZILI_ADIM_SAYISI;
        const etiket =
          d.key === "sosyal" && sinif === 3 ? "Hayat Bilgisi"
          : d.key === "sosyal" && sinif === 8 ? "T.C. İnkılap Tarihi"
          : d.ad;
        return (
          <Link
            key={d.key}
            href={`/yazili/${sinavKey}/${d.key}`}
            className="bk-yazili-ders"
            style={{ background: d.alt }}
          >
            <div className="bk-yazili-ders-ic" style={{ background: d.ust }}>
              <div className="bk-yazili-ders-bas">
                <span>{etiket}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/uygulama/${d.ikon}.png`} alt="" />
              </div>
              <div className="bk-yazili-cubuk-satir">
                <div className="bk-akordiyon-cubuk" style={{ background: d.alt, flex: 1 }}>
                  <i style={{ width: `${oran * 100}%`, background: d.dolgu }} />
                </div>
                <span className="bk-yazili-yuzde">{Math.round(oran * 100)}%</span>
              </div>
            </div>
          </Link>
        );
      })}
    </>
  );
}
