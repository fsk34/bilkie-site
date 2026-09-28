"use client";

// Defterin sayfa bölmesini düzenleme görünümü. Sayfalar öğrencinin gördüğü kâğıtla birebir
// aynı çizilir (okuyucunun DefterBlokGorunumu bileşeni + uygulama.css), yan yana dizilir.
// Blok içeriğine DOKUNMAZ: yalnız sayfa sınırlarını taşır. Bloklar tek düz akış olarak
// tutulur, sınırlar "hangi blok yeni sayfa başlatıyor" kümesidir; kayıtta sayfalar yeniden
// numaralanır.

import { useMemo, useState } from "react";
import "../../(uygulama)/uygulama.css";
import DefterBlokGorunumu from "../../(uygulama)/defter/DefterBlokGorunumu";
import { dersBul } from "../../(uygulama)/dersler";
import { blokCevir } from "../../lib/defterBicim";

type HamBlok = { type: string } & Record<string, unknown>;
export type HamSayfa = { pageNo: number; blocks: HamBlok[] };
/** Hazırlanmış bölme önerisi. `tipler` defterin blok türü dizisi: canlı defter öneri
    hazırlandığından beri değiştiyse (blok eklendi/silindi) öneri uygulanmaz. */
export type BolmeOnerisi = { tipler: string[]; sinirlar: number[] };

const BASLIK_TIPLERI = new Set(["title", "subtitle"]);

function sinirlariCikar(sayfalar: HamSayfa[]): number[] {
  const out: number[] = [];
  let n = 0;
  sayfalar.forEach((s, i) => {
    if (i > 0) out.push(n);
    n += (s.blocks ?? []).length;
  });
  return out;
}

export default function SayfaGorunumu({
  sayfalar,
  dersKey,
  kaydediliyor,
  onKaydet,
  oneri,
}: {
  sayfalar: HamSayfa[];
  dersKey: string;
  kaydediliyor: boolean;
  onKaydet: (yeni: HamSayfa[]) => Promise<void>;
  oneri?: BolmeOnerisi;
}) {
  // 3. sınıfta sosyal veritabanında hayat_bilgisi — renk sosyalinki
  const ders = dersBul(dersKey === "hayat_bilgisi" ? "sosyal" : dersKey);
  const renk = ders?.ana ?? "#72CEFD";
  const kareli = dersKey === "matematik" || dersKey === "fen";

  const bloklar = useMemo(() => sayfalar.flatMap((s) => s.blocks ?? []), [sayfalar]);
  const ilkSinirlar = useMemo(() => sinirlariCikar(sayfalar), [sayfalar]);
  const [sinirlar, setSinirlar] = useState<number[]>(ilkSinirlar);

  const degisti = sinirlar.join(",") !== ilkSinirlar.join(",");
  const oneriUyuyor = !!oneri && oneri.tipler.join(",") === bloklar.map((b) => b.type).join(",");
  const oneriUygulandi = oneriUyuyor && sinirlar.join(",") === oneri.sinirlar.join(",");

  // Sınırlardan sayfa aralıkları: [başlangıç, bitiş)
  const araliklar = useMemo(() => {
    const noktalar = [0, ...sinirlar, bloklar.length];
    return noktalar.slice(0, -1).map((b, i) => [b, noktalar[i + 1]] as const);
  }, [sinirlar, bloklar.length]);

  function bol(blokIndeksi: number) {
    if (blokIndeksi <= 0 || sinirlar.includes(blokIndeksi)) return;
    setSinirlar([...sinirlar, blokIndeksi].sort((a, b) => a - b));
  }
  function birlestir(blokIndeksi: number) {
    setSinirlar(sinirlar.filter((x) => x !== blokIndeksi));
  }

  async function kaydet() {
    const yeni: HamSayfa[] = araliklar.map(([b, e], i) => ({ pageNo: i + 1, blocks: bloklar.slice(b, e) }));
    // Güvenlik: blok sayısı ve sırası aynı kalmalı (yalnız sınırlar değişir)
    if (yeni.flatMap((s) => s.blocks).length !== bloklar.length) {
      alert("Blok sayısı tutmadı, kaydedilmedi.");
      return;
    }
    if (!confirm(`Sayfa bölmesi kaydedilsin mi? (${sayfalar.length} sayfa → ${yeni.length} sayfa)\n\nBu defteri yarıda bırakmış öğrenciler kaldıkları sayfa numarasından devam eder; sayfa kaydığı için yeri biraz oynayabilir.`)) return;
    await onKaydet(yeni);
  }

  const sondaBaslik = araliklar.filter(([b, e]) => e > b && BASLIK_TIPLERI.has(bloklar[e - 1]?.type)).length;

  return (
    <div>
      {/* Üst şerit: özet + kaydet */}
      <div style={{
        position: "sticky", top: 0, zIndex: 5, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12,
        background: "#2C335E", border: "1px solid #4A538E", borderRadius: 14, padding: "12px 16px", marginBottom: 16,
      }}>
        <span style={{ fontSize: 14, color: "#C9D9F2", fontWeight: 700 }}>
          {araliklar.length} sayfa{degisti ? ` (önce ${sayfalar.length})` : ""}
        </span>
        {sondaBaslik > 0 && (
          <span style={{ fontSize: 13, color: "#F3A24C" }}>⚠ {sondaBaslik} sayfa başlıkla bitiyor</span>
        )}
        <span style={{ flex: 1 }} />
        {oneri && !oneriUyuyor && (
          <span style={{ fontSize: 13, color: "#F3A24C" }}>Öneri bu defterin güncel hâliyle uyuşmuyor (blok eklenmiş/silinmiş)</span>
        )}
        {oneriUyuyor && (oneriUygulandi ? (
          <span style={{ fontSize: 13, color: "#7EE08A", fontWeight: 700 }}>✓ Öneri ekranda — beğenirsen Kaydet</span>
        ) : (
          <button style={dugme("#4a7bff")} onClick={() => setSinirlar(oneri.sinirlar)} disabled={kaydediliyor}>Öneriyi uygula</button>
        ))}
        {degisti && (
          <button style={dugme("#4A538E")} onClick={() => setSinirlar(ilkSinirlar)} disabled={kaydediliyor}>Geri al</button>
        )}
        <button style={dugme(degisti ? "#F3A24C" : "#3A4480")} onClick={kaydet} disabled={!degisti || kaydediliyor}>
          {kaydediliyor ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>

      <p style={{ fontSize: 12, color: "#8FB3D9", margin: "0 0 14px" }}>
        İki blok arasına gelip <b>✂ Buradan böl</b> · sayfanın üstündeki <b>⤒ Öncekiyle birleştir</b>. İçerik değişmez, yalnız sayfa sınırları.
      </p>

      {/* Sayfalar: telefon genişliğinde kâğıtlar, yan yana */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start" }}>
        {araliklar.map(([bas, son], sIdx) => {
          const sonBlok = bloklar[son - 1];
          const baslikla = !!sonBlok && BASLIK_TIPLERI.has(sonBlok.type);
          return (
            <div key={bas} style={{ width: 390, flex: "0 0 390px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, minHeight: 28 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#C9D9F2" }}>
                  Sayfa {sIdx + 1}
                  <span style={{ fontWeight: 400, color: "#8FB3D9" }}> · {son - bas} blok</span>
                </span>
                {sIdx > 0 && (
                  <button style={dugme("#3A4480")} onClick={() => birlestir(bas)} disabled={kaydediliyor}>⤒ Öncekiyle birleştir</button>
                )}
              </div>
              <div
                className="bk-defter-kagit"
                data-kareli={kareli}
                style={{
                  // background kısaltması çizgili zemini (background-image) silerdi — yalnız renk
                  padding: "22px 20px 24px", backgroundColor: "#fdfdfd", color: "#1a1a2e", borderRadius: 10,
                  outline: baslikla ? "3px solid #F3A24C" : "none",
                }}
              >
                {bloklar.slice(bas, son).map((ham, i) => {
                  const gi = bas + i;
                  const blok = blokCevir(ham);
                  return (
                    <div key={gi}>
                      {i > 0 && <BolmeCizgisi onBol={() => bol(gi)} pasif={kaydediliyor} />}
                      <div className="bk-blok">
                        {blok ? <DefterBlokGorunumu blok={blok} renk={renk} /> : (
                          <p style={{ color: "#b00", fontSize: 12 }}>[çizilemeyen blok: {ham.type}]</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** İki blok arası: üstüne gelince "✂ Buradan böl" görünür. */
function BolmeCizgisi({ onBol, pasif }: { onBol: () => void; pasif: boolean }) {
  const [ustunde, setUstunde] = useState(false);
  return (
    <div
      onMouseEnter={() => setUstunde(true)}
      onMouseLeave={() => setUstunde(false)}
      style={{ position: "relative", height: 14, margin: "-7px 0 -7px", zIndex: 2 }}
    >
      {ustunde && !pasif && (
        <>
          <div style={{ position: "absolute", left: 0, right: 0, top: 6, borderTop: "2px dashed #4a7bff" }} />
          <button
            onClick={onBol}
            style={{
              position: "absolute", right: 0, top: -4, background: "#4a7bff", color: "#fff", border: 0,
              borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}
          >✂ Buradan böl</button>
        </>
      )}
    </div>
  );
}

function dugme(bg: string): React.CSSProperties {
  return {
    background: bg, color: bg === "#F3A24C" ? "#0C1A3F" : "#EAF2FF", border: "none", borderRadius: 999,
    padding: "6px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer",
  };
}
