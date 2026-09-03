"use client";

// Atasözleri ve Deyimler — uygulamadaki AtasozDeyimlerScreen'in web karşılığı.
// Veri: content/atasozleri_deyimler → meta/counts/{harf} + letters/{HARF}/{atasozleri|deyimler}
// Önizleme kartları GÜNÜN seçimini gösterir (uygulamadaki tohum: harf sırası + tür + tarih).
// "Tümünü Gör" → arama kutulu tam liste (uygulamada sağdan kayan sayfa).

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { KesifGirisGerekli } from "../kesif/ortak";
import { useOturum } from "../../lib/oturum";
import {
  TR_HARFLER,
  adyListeGetir,
  adyOnizlemeGetir,
  adySayilariOnbellekten,
  adySayilariniGetir,
  type AdyOge,
  type AdySayilari,
  type AdyTur,
} from "../../lib/kesif";

export default function AtasozleriSayfasi() {
  return (
    <div className="bk bk-kesif-sahne">
      <Icerik />
    </div>
  );
}

function Icerik() {
  const { yukleniyor, kullanici } = useOturum();

  const misafirPerdesi =
    !yukleniyor && !kullanici
      ? <KesifGirisGerekli tur="atasozleri" baslik={"Atasözleri ve Deyimler"} aciklama={"Atasözü ve deyim içeriğini görmek için giriş yapman gerekiyor."} />
      : null;
  const [sayilar, setSayilar] = useState<Record<string, AdySayilari> | null>(adySayilariOnbellekten());
  const [harf, setHarf] = useState("A");
  const [onizleme, setOnizleme] = useState<{ ata: AdyOge | null; dey: AdyOge | null } | null>(null);
  const [secici, setSecici] = useState(false);
  const [tumu, setTumu] = useState<AdyTur | null>(null);

  useEffect(() => {
    if (sayilar) return;
    let iptal = false;
    adySayilariniGetir()
      .then((v) => { if (!iptal) setSayilar(v); })
      .catch(() => { if (!iptal) setSayilar({}); });
    return () => { iptal = true; };
  }, [sayilar]);

  useEffect(() => {
    if (!sayilar) return;
    let iptal = false;
    setOnizleme(null);
    adyOnizlemeGetir(harf, sayilar).then((v) => { if (!iptal) setOnizleme(v); });
    return () => { iptal = true; };
  }, [harf, sayilar]);

  const varMi = useMemo(() => {
    const f: Record<string, boolean> = {};
    for (const l of TR_HARFLER) {
      const c = sayilar?.[l];
      f[l] = sayilar == null ? true : (c?.atasozleri ?? 0) + (c?.deyimler ?? 0) > 0;
    }
    return f;
  }, [sayilar]);

  if (misafirPerdesi) return misafirPerdesi;

  if (tumu) {
    return <TumListe harf={harf} tur={tumu} onKapat={() => setTumu(null)} />;
  }

  return (
    <div className="bk-kesif" data-tur="atasozleri">
      <div className="bk-kesif-ust">
        <Link className="geri" href="/uygulama" aria-label="Geri">✕</Link>
        <div>
          <h1>Atasözleri ve Deyimler</h1>
          <div className="alt">Harf seç, keşfet, öğren!</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div className="bk-kesif-serit" style={{ flex: 1 }}>
          {TR_HARFLER.map((l) => (
            <button
              key={l}
              className="bk-ady-harf"
              data-secili={l === harf}
              disabled={!varMi[l]}
              onClick={() => setHarf(l)}
            >
              {l}
            </button>
          ))}
        </div>
        <button className="bk-ady-harf" onClick={() => setSecici(true)} aria-label="Harf seç">
          {sayilar == null ? "…" : "🔤"}
        </button>
      </div>

      <OnizlemeKarti
        baslik="Atasözleri"
        oge={onizleme?.ata ?? null}
        yukleniyor={onizleme == null}
        onTumu={() => setTumu("atasozleri")}
      />
      <OnizlemeKarti
        baslik="Deyimler"
        oge={onizleme?.dey ?? null}
        yukleniyor={onizleme == null}
        onTumu={() => setTumu("deyimler")}
      />

      <div className="bk-ady-ipucu">İpucu: Üstten harf seç. &quot;Tümünü Gör&quot; ile listeye git.</div>

      {secici && (
        <HarfSecici
          secili={harf}
          varMi={varMi}
          onSec={(l) => { setHarf(l); setSecici(false); }}
          onKapat={() => setSecici(false)}
        />
      )}
    </div>
  );
}

function OnizlemeKarti({
  baslik, oge, yukleniyor, onTumu,
}: { baslik: string; oge: AdyOge | null; yukleniyor: boolean; onTumu: () => void }) {
  return (
    <div className="bk-kesif-kart bk-ady-onizleme">
      <div className="ust">
        <h2>{baslik}</h2>
        <button className="tumu" onClick={onTumu}>Tümünü Gör</button>
      </div>
      {oge ? (
        <>
          <div className="ifade">{oge.metin}</div>
          <div className="anlam">{oge.anlam}</div>
        </>
      ) : (
        <div className="anlam">{yukleniyor ? "Yükleniyor…" : "Bu harfte içerik bulunamadı."}</div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- harf seçici */

function HarfSecici({
  secili, varMi, onSec, onKapat,
}: {
  secili: string;
  varMi: Record<string, boolean>;
  onSec: (l: string) => void;
  onKapat: () => void;
}) {
  return (
    <div className="bk-ady-perde" onClick={onKapat}>
      <div className="bk-ady-pencere" onClick={(e) => e.stopPropagation()}>
        <h2>Harf Seç</h2>
        <div className="alt">Bir harf seç ve atasözleri / deyimleri keşfet.</div>
        <div className="bk-ady-izgara">
          {TR_HARFLER.map((l) => (
            <button key={l} data-secili={l === secili} disabled={!varMi[l]} onClick={() => onSec(l)}>
              {l}
            </button>
          ))}
        </div>
        <button className="kapat" onClick={onKapat}>Kapat</button>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- tüm liste */

function TumListe({ harf, tur, onKapat }: { harf: string; tur: AdyTur; onKapat: () => void }) {
  const [liste, setListe] = useState<AdyOge[] | null>(null);
  const [arama, setArama] = useState("");

  useEffect(() => {
    let iptal = false;
    setListe(null);
    adyListeGetir(harf, tur).then((v) => { if (!iptal) setListe(v); });
    return () => { iptal = true; };
  }, [harf, tur]);

  const suzulmus = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase("tr");
    if (!q || !liste) return liste ?? [];
    return liste.filter(
      (o) => o.metin.toLocaleLowerCase("tr").includes(q) || o.anlam.toLocaleLowerCase("tr").includes(q)
    );
  }, [liste, arama]);

  const baslik = tur === "atasozleri" ? "Atasözleri" : "Deyimler";

  return (
    <div className="bk-kesif" data-tur="atasozleri">
      <div className="bk-kesif-ust">
        <button className="geri" onClick={onKapat} aria-label="Geri">✕</button>
        <h1>{baslik} • {harf}</h1>
      </div>

      <input
        className="bk-ady-ara"
        placeholder="Ara (ifade / açıklama)"
        value={arama}
        onChange={(e) => setArama(e.target.value)}
      />

      {liste == null ? (
        <div className="bk-kesif-bos">Yükleniyor…</div>
      ) : suzulmus.length === 0 ? (
        <div className="bk-kesif-bos">Sonuç bulunamadı.</div>
      ) : (
        <div className="bk-ady-liste">
          {suzulmus.map((o) => (
            <div key={o.id} className="oge">
              <div className="ifade">{o.metin}</div>
              <div className="anlam">{o.anlam}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
