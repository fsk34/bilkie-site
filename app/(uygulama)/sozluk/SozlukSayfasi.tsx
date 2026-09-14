"use client";

// Sözlük ekranı — Android SozlukScreen.kt / iOS SozlukScreen.swift birebir.
// Atasözleri & Deyimler kalıbı (harf şeridi + Günün Kelimesi kartı + Tümünü Gör listesi)
// + ana sayfada arama. Tek bileşen, iki sözlük (/sozluk ve /ingilizce-sozluk).

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { KesifGirisGerekli } from "../kesif/ortak";
import UcNokta from "../UcNokta";
import { useOturum } from "../../lib/oturum";
import {
  SOZLUK, gununKelimesi, sozlukAra, sozlukHarfGetir, sozlukSayilariOnbellekten, sozlukSayilariniGetir,
  type SozlukKelime, type SozlukTuru,
} from "../../lib/sozluk";

export default function SozlukSayfasi({ tur }: { tur: SozlukTuru }) {
  return (
    <div className="bk bk-kesif-sahne">
      <Icerik tur={tur} />
    </div>
  );
}

function Icerik({ tur }: { tur: SozlukTuru }) {
  const s = SOZLUK[tur];
  const { yukleniyor, kullanici } = useOturum();
  const [sayilar, setSayilar] = useState<Record<string, number> | null>(sozlukSayilariOnbellekten(tur));
  const [harf, setHarf] = useState(s.harfler[0]);
  const [kelime, setKelime] = useState<SozlukKelime | null | undefined>(undefined); // undefined = yükleniyor
  const [secici, setSecici] = useState(false);
  const [sorgu, setSorgu] = useState("");
  const [sonuclar, setSonuclar] = useState<SozlukKelime[] | null>(null);
  // Seçili harfin tüm kelimeleri — günün kelimesinin altında, kaydırılarak (Tümünü Gör yok)
  const [harfListesi, setHarfListesi] = useState<SozlukKelime[] | null>(null);

  useEffect(() => {
    if (sayilar) return;
    let iptal = false;
    sozlukSayilariniGetir(tur).then((v) => { if (!iptal) setSayilar(v); }).catch(() => { if (!iptal) setSayilar({}); });
    return () => { iptal = true; };
  }, [sayilar, tur]);

  useEffect(() => {
    if (!sayilar) return;
    let iptal = false;
    setKelime(undefined); setHarfListesi(null);
    if ((sayilar[harf] ?? 0) === 0) { setKelime(null); setHarfListesi([]); return; }
    gununKelimesi(tur, harf).then((v) => { if (!iptal) setKelime(v); }).catch(() => { if (!iptal) setKelime(null); });
    sozlukHarfGetir(tur, harf).then((v) => { if (!iptal) setHarfListesi(v); }).catch(() => { if (!iptal) setHarfListesi([]); });
    return () => { iptal = true; };
  }, [harf, sayilar, tur]);

  useEffect(() => {
    if (!sorgu.trim()) { setSonuclar(null); return; }
    let iptal = false;
    sozlukAra(tur, sorgu).then((v) => { if (!iptal) setSonuclar(v); }).catch(() => { if (!iptal) setSonuclar([]); });
    return () => { iptal = true; };
  }, [sorgu, tur]);

  const varMi = useMemo(() => {
    const f: Record<string, boolean> = {};
    for (const l of s.harfler) f[l] = sayilar == null ? true : (sayilar[l] ?? 0) > 0;
    return f;
  }, [sayilar, s.harfler]);

  if (!yukleniyor && !kullanici) {
    return <KesifGirisGerekli tur="sozluk" baslik={s.baslik} aciklama="Sözlüğü kullanmak için giriş yapman gerekiyor." />;
  }
  const ariyor = sorgu.trim().length > 0;

  return (
    <div className="bk-kesif" data-tur={tur === "turkce" ? "sozluk" : "ingsozluk"}>
      <div className="bk-kesif-ust">
        <Link className="geri" href="/" aria-label="Geri">✕</Link>
        <div>
          <h1>{s.baslik}</h1>
          <div className="alt">{s.altBaslik}</div>
        </div>
      </div>

      <div className="bk-sozluk-ara">
        <input
          className="bk-ady-ara"
          placeholder={s.aramaIpucu}
          value={sorgu}
          onChange={(e) => setSorgu(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        {ariyor && <button className="temizle" onClick={() => setSorgu("")} aria-label="Temizle">✕</button>}
      </div>

      {ariyor ? (
        sonuclar == null ? <UcNokta style={{ padding: 24 }} />
        : sonuclar.length === 0 ? <div className="bk-kesif-bos">Sonuç bulunamadı.</div>
        : <div className="bk-ady-liste">{sonuclar.map((k) => <KelimeKarti key={k.id + k.text} k={k} />)}</div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div className="bk-kesif-serit" style={{ flex: 1 }}>
              {s.harfler.map((l) => (
                <button key={l} className="bk-ady-harf" data-secili={l === harf} disabled={!varMi[l]} onClick={() => setHarf(l)}>
                  {l}
                </button>
              ))}
            </div>
            <button className="bk-ady-harf" onClick={() => setSecici(true)} aria-label="Harf seç">
              {sayilar == null ? "…" : "🔤"}
            </button>
          </div>

          <div className="bk-kesif-kart bk-ady-onizleme">
            <div className="ust"><h2>Günün Kelimesi • {harf}</h2></div>
            {kelime === undefined ? <UcNokta style={{ padding: "12px 0" }} boyut={8} aralik={6} />
            : kelime === null ? <div className="anlam">Bu harfte kelime bulunamadı.</div>
            : <KelimeGovdesi k={kelime} />}
          </div>

          <h2 className="bk-sozluk-liste-baslik">{harf} ile başlayan kelimeler{harfListesi ? ` • ${harfListesi.length}` : ""}</h2>
          {harfListesi == null ? <UcNokta style={{ padding: 18 }} />
          : harfListesi.length === 0 ? <div className="bk-kesif-bos">Bu harfte kelime bulunamadı.</div>
          : <div className="bk-ady-liste">{harfListesi.map((k) => <KelimeKarti key={k.id + k.text} k={k} />)}</div>}

          <div className="bk-sozluk-kaynak">Kaynak: Vikisözlük (CC BY-SA)</div>

          {secici && (
            <div className="bk-ady-perde" onClick={() => setSecici(false)}>
              <div className="bk-ady-pencere" onClick={(e) => e.stopPropagation()}>
                <h2>Harf Seç</h2>
                <div className="bk-ady-izgara">
                  {s.harfler.map((l) => (
                    <button key={l} data-secili={l === harf} disabled={!varMi[l]} onClick={() => { setHarf(l); setSecici(false); }}>{l}</button>
                  ))}
                </div>
                <button className="kapat" onClick={() => setSecici(false)}>Kapat</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Kelime + tür rozeti · anlam · örnek (italik) — Android SozlukKelimeGovdesi. */
function KelimeGovdesi({ k }: { k: SozlukKelime }) {
  return (
    <>
      <div className="ifade bk-sozluk-kelime">
        <span>{k.text}</span>
        {k.tur && <span className="bk-sozluk-tur">{k.tur}</span>}
      </div>
      <div className="anlam">{k.meaning}</div>
      {k.ornek && <div className="bk-sozluk-ornek">“{k.ornek}”</div>}
      {k.ornekTr && <div className="bk-sozluk-ornek tr">{k.ornekTr}</div>}
    </>
  );
}

function KelimeKarti({ k }: { k: SozlukKelime }) {
  return <div className="oge"><KelimeGovdesi k={k} /></div>;
}
