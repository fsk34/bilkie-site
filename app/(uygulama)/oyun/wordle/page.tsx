"use client";

// Wordle — Android `WordleScreen.kt` portu (WordleEntryScreen + WordleScreen tek sayfada).
// Tam ekrandır. Kelime uzunluğu bölüme göre değişir; klavye Türkçe düzenli.
//
// Web eklemesi: FİZİKSEL KLAVYE de çalışıyor (harf tuşları, Backspace, Enter).
// Uygulamada dokunmatik klavye tek yol; tarayıcıda yazmayı beklemek doğal olduğu için eklendi.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOturum } from "../../../lib/oturum";
import {
  WORDLE_BOLUM_SAYISI,
  wordleKelime,
  wordleSeviyeIlerlet,
  wordleSeviyeOku,
} from "../../../lib/veri";
import { sesCal } from "../../ses";

type Durum = "bos" | "yazili" | "dogru" | "yerinde" | "yok";
type Goz = { harf: string; durum: Durum };

const SATIR_SAYISI = 6;

/** Türkçe klavye düzeni — Android WL_KEYS ile birebir. */
const KLAVYE = [
  ["E", "R", "T", "Y", "U", "I", "O", "P", "Ğ", "Ü"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ş", "İ"],
  ["Z", "C", "V", "B", "N", "M", "Ö", "Ç"],
];
const HARFLER = new Set(KLAVYE.flat());

const bosGoz = (): Goz => ({ harf: "", durum: "bos" });

/** Tahmini hedefe göre değerlendirir (Android wlEvaluate): önce tam yerinde, sonra havuzdan eşleşme. */
function degerlendir(tahmin: string, hedef: string): Durum[] {
  const sonuc: Durum[] = Array.from(tahmin, () => "yok");
  const havuz = Array.from(hedef);
  for (let i = 0; i < tahmin.length; i++) {
    if (tahmin[i] === hedef[i]) { sonuc[i] = "dogru"; havuz[i] = " "; }
  }
  for (let i = 0; i < tahmin.length; i++) {
    if (sonuc[i] === "dogru") continue;
    const j = havuz.indexOf(tahmin[i]);
    if (j !== -1) { sonuc[i] = "yerinde"; havuz[j] = " "; }
  }
  return sonuc;
}

export default function Wordle() {
  const router = useRouter();
  const { kullanici, yukleniyor } = useOturum();
  const [ekran, setEkran] = useState<"giris" | "oyun">("giris");
  const [seviye, setSeviye] = useState(1);          // 1 tabanlı
  const [seviyeYuklendi, setSeviyeYuklendi] = useState(false);

  useEffect(() => {
    if (!kullanici) return;
    let iptal = false;
    wordleSeviyeOku(kullanici.uid)
      .then((v) => { if (!iptal) { setSeviye(v); setSeviyeYuklendi(true); } })
      .catch(() => { if (!iptal) setSeviyeYuklendi(true); });
    return () => { iptal = true; };
  }, [kullanici]);

  const cik = useCallback(() => router.push("/oyunlar"), [router]);

  if (yukleniyor) return <div className="bk"><div className="bk-wl-sahne" /></div>;

  if (!kullanici) {
    return (
      <div className="bk">
        <div className="bk-wl-sahne">
          <button className="bk-wl-geri" aria-label="Geri" onClick={cik}>←</button>
          <Gokkusagi />
          <p className="bk-soluk" style={{ marginTop: 32, fontSize: 14, textAlign: "center" }}>
            Bölümlerin hesabınla saklanıyor. Oynamak için giriş yapman gerekiyor.
          </p>
          <Link className="bk-dugme" href="/giris" style={{ marginTop: 18 }}>Giriş yap</Link>
        </div>
      </div>
    );
  }

  if (ekran === "giris") {
    return (
      <Giris
        seviye={seviye}
        yuklendi={seviyeYuklendi}
        onCik={cik}
        onBasla={() => setEkran("oyun")}
      />
    );
  }

  return (
    <Oyun
      bolumIndeksi={seviye - 1}
      uid={kullanici.uid}
      onCik={() => setEkran("giris")}
      // Bölüm bitince DOĞRUDAN sonraki bölüm açılır; giriş ekranına dönülmez.
      // (Seviye artınca `Oyun` bileşeni yeni kelimeyi kendisi yükleyip durumu sıfırlar.)
      onBolumBitti={() => setSeviye((s) => Math.min(WORDLE_BOLUM_SAYISI, s + 1))}
    />
  );
}

/* ----------------------------------------------------------------- giriş */

function Gokkusagi() {
  // Android WL_RAINBOW — harf başına bir renk
  const renkler = ["#E74C3C", "#FF8C00", "#FFD700", "#538D4E", "#3B8FD4", "#9B59B6"];
  return (
    <h1 className="bk-wl-baslik">
      {"WORDLE".split("").map((h, i) => (
        <span key={i} style={{ color: renkler[i] }}>{h}</span>
      ))}
    </h1>
  );
}

function Giris({
  seviye, yuklendi, onCik, onBasla,
}: { seviye: number; yuklendi: boolean; onCik: () => void; onBasla: () => void }) {
  const oran = Math.max(0.5, ((seviye - 1) / WORDLE_BOLUM_SAYISI) * 100);
  return (
    <div className="bk">
      <div className="bk-wl-sahne">
        <button className="bk-wl-geri" aria-label="Geri" onClick={onCik}>←</button>
        <Gokkusagi />
        {!yuklendi ? (
          <p className="bk-wl-not" style={{ marginTop: 48 }}>Yükleniyor...</p>
        ) : (
          <>
            <div className="bk-wl-cubuk" style={{ marginTop: 48 }}>
              <i style={{ width: `${oran}%` }} />
            </div>
            <p className="bk-wl-not" style={{ marginTop: 10 }}>
              Bölüm {seviye} / {WORDLE_BOLUM_SAYISI}
            </p>
            <button className="bk-wl-dugme" style={{ marginTop: 52 }} onClick={onBasla}>
              {seviye === 1 ? "Başla" : "Devam Et"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ oyun */

function Oyun({
  bolumIndeksi, uid, onCik, onBolumBitti,
}: { bolumIndeksi: number; uid: string; onCik: () => void; onBolumBitti: () => void }) {
  const [hedef, setHedef] = useState("");
  const [yukleniyor, setYukleniyor] = useState(true);
  const [tahminler, setTahminler] = useState<Goz[][]>([]);
  const [suanki, setSuanki] = useState("");
  const [bitti, setBitti] = useState(false);
  const [kazandi, setKazandi] = useState(false);
  const [sarsinti, setSarsinti] = useState(0);
  const [kutlama, setKutlama] = useState(false);
  const [cikisSor, setCikisSor] = useState(false);
  const [ilerlemeHedefi, setIlerlemeHedefi] = useState(0);

  const harfSayisi = hedef.length || 5;

  const kelimeYukle = useCallback(() => {
    setYukleniyor(true);
    setTahminler([]); setSuanki(""); setBitti(false); setKazandi(false); setKutlama(false);
    wordleKelime(bolumIndeksi)
      .then((k) => { setHedef(k); setYukleniyor(false); })
      .catch(() => { setHedef(""); setYukleniyor(false); });
  }, [bolumIndeksi]);

  useEffect(() => { kelimeYukle(); }, [kelimeYukle]);

  // Kazanınca: 700 ms sonra kutlama örtüsü + sonraki kelimeyi arka planda çek (uygulamadaki prefetch)
  useEffect(() => {
    if (!kazandi) return;
    if (bolumIndeksi < WORDLE_BOLUM_SAYISI - 1) void wordleKelime(bolumIndeksi + 1).catch(() => {});
    const z = window.setTimeout(() => {
      setKutlama(true);
      sesCal("wordle_levelcompleted", 0.6);
      void wordleSeviyeIlerlet(uid, bolumIndeksi + 1).catch(() => {});
      // Çubuk dolumu: mevcut bölümden sonrakine (uygulamadaki 1 sn'lik animasyon)
      window.setTimeout(() => setIlerlemeHedefi(1), 400);
    }, 700);
    return () => window.clearTimeout(z);
  }, [kazandi, bolumIndeksi, uid]);

  useEffect(() => { setIlerlemeHedefi(0); }, [bolumIndeksi]);

  /** Klavyede her harfin en iyi bilinen durumu (doğru > yerinde > yok). */
  const tusDurumlari = useMemo(() => {
    const harita: Record<string, Durum> = {};
    for (const satir of tahminler) {
      for (const g of satir) {
        const onceki = harita[g.harf];
        if (!onceki || g.durum === "dogru" || (g.durum === "yerinde" && onceki === "yok")) {
          harita[g.harf] = g.durum;
        }
      }
    }
    return harita;
  }, [tahminler]);

  // ⚠️ setState güncelleyicisinin İÇİNDE yan etki (ses, başka setState) OLMAZ:
  // React geliştirme kipinde güncelleyiciyi iki kez çağırıyor → tahmin iki kez ekleniyordu.
  // Güncel değerler doğrudan okunur, yazmalar güncelleyicinin dışında yapılır.
  const tus = useCallback((t: string) => {
    if (bitti || yukleniyor || !hedef) return;

    if (t === "SIL") { setSuanki((s) => s.slice(0, -1)); return; }

    if (t === "GIR") {
      if (suanki.length < hedef.length) { setSarsinti((n) => n + 1); return; }
      const durumlar = degerlendir(suanki, hedef);
      const gozler: Goz[] = Array.from(suanki, (h, i) => ({ harf: h, durum: durumlar[i] }));
      sesCal("wordle_harf", 0.5);
      if (durumlar.some((d) => d === "dogru")) sesCal("wordle_dogruharf", 0.5);

      const yeniTahminler = [...tahminler, gozler];
      setTahminler(yeniTahminler);
      setSuanki("");
      if (suanki === hedef) { setKazandi(true); setBitti(true); }
      else if (yeniTahminler.length >= SATIR_SAYISI) setBitti(true);
      return;
    }

    if (suanki.length < hedef.length) setSuanki(suanki + t);
  }, [bitti, yukleniyor, hedef, suanki, tahminler]);

  // Fiziksel klavye (web eklemesi)
  useEffect(() => {
    const dinle = (e: KeyboardEvent) => {
      if (cikisSor || kutlama) return;
      if (e.key === "Backspace") { e.preventDefault(); tus("SIL"); return; }
      if (e.key === "Enter") { e.preventDefault(); tus("GIR"); return; }
      if (e.key.length !== 1) return;
      const h = e.key.toLocaleUpperCase("tr");
      if (HARFLER.has(h)) { e.preventDefault(); tus(h); }
    };
    window.addEventListener("keydown", dinle);
    return () => window.removeEventListener("keydown", dinle);
  }, [tus, cikisSor, kutlama]);

  const satirlar: Goz[][] = [];
  for (let r = 0; r < SATIR_SAYISI; r++) {
    if (r < tahminler.length) satirlar.push(tahminler[r]);
    else if (r === tahminler.length) {
      satirlar.push(Array.from({ length: harfSayisi }, (_, c) => {
        const h = suanki[c];
        return h ? { harf: h, durum: "yazili" as Durum } : bosGoz();
      }));
    } else satirlar.push(Array.from({ length: harfSayisi }, bosGoz));
  }

  const bolumNo = bolumIndeksi + 1;
  const cubukBaslangic = (bolumNo / WORDLE_BOLUM_SAYISI) * 100;
  const cubukBitis = Math.min(100, ((bolumNo + 1) / WORDLE_BOLUM_SAYISI) * 100);

  return (
    <div className="bk">
      <div className="bk-wl-sahne oyun">
        <div className="bk-wl-ust">
          <button className="bk-wl-geri duz" aria-label="Geri" onClick={() => (bitti ? onCik() : setCikisSor(true))}>←</button>
          <div className="orta">
            <b>Wordle</b>
            {!yukleniyor && <span>Bölüm {bolumNo}&nbsp;&nbsp;•&nbsp;&nbsp;{harfSayisi} harf</span>}
          </div>
          <button className="bk-wl-tekrar" onClick={kelimeYukle}>Tekrar</button>
        </div>

        {yukleniyor ? (
          <p className="bk-wl-not" style={{ marginTop: 40 }}>Yükleniyor...</p>
        ) : !hedef ? (
          <div style={{ marginTop: 40, display: "grid", justifyItems: "center", gap: 12 }}>
            <p style={{ color: "#CC4444", fontSize: 14 }}>Bağlantı hatası</p>
            <button className="bk-wl-tekrar" onClick={kelimeYukle}>Tekrar Dene</button>
          </div>
        ) : (
          <>
            <div className="bk-wl-izgara" data-sarsinti={sarsinti % 2}>
              {satirlar.map((satir, r) => (
                <div
                  key={r}
                  className="satir"
                  data-sallan={r === tahminler.length && sarsinti > 0}
                  style={{ gridTemplateColumns: `repeat(${harfSayisi}, 1fr)` }}
                >
                  {satir.map((g, c) => (
                    <div key={c} className="goz" data-durum={g.durum}>{g.harf}</div>
                  ))}
                </div>
              ))}
            </div>

            {bitti && !kazandi && <p className="bk-wl-not" style={{ marginTop: 14 }}>Bir dahaki sefere! 💪</p>}

            <div style={{ flex: 1 }} />

            <div className="bk-wl-klavye">
              {KLAVYE.map((satir, i) => (
                <div key={i} className="satir">
                  {satir.map((t) => (
                    <button key={t} className="tus" data-durum={tusDurumlari[t] ?? "yok-bilinmiyor"} onClick={() => tus(t)}>
                      {t}
                    </button>
                  ))}
                  {i === KLAVYE.length - 1 && (
                    <div className="ikili">
                      <button className="tus sil" onClick={() => tus("SIL")}>SİL</button>
                      <button className="tus gir" onClick={() => tus("GIR")}>ENTER</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {kutlama && (
        <div className="bk-oyun-ortu">
          <div className="govde" style={{ width: "100%", maxWidth: 420 }}>
            <div style={{ fontSize: 28, fontWeight: 800 }}>Harika! 🎉</div>
            <div style={{ fontSize: 15, color: "#AAAAAA" }}>Bölüm {bolumNo} tamamlandı</div>
            <div className="bk-wl-cubuk" style={{ width: "100%", marginTop: 32 }}>
              <i style={{ width: `${ilerlemeHedefi ? cubukBitis : cubukBaslangic}%`, transition: "width 1s cubic-bezier(.4,0,.2,1)" }} />
            </div>
            <div className="bk-wl-not">{bolumNo + 1} / {WORDLE_BOLUM_SAYISI}</div>
            <button className="bk-wl-dugme" style={{ marginTop: 36 }} onClick={onBolumBitti}>
              {bolumIndeksi >= WORDLE_BOLUM_SAYISI - 1 ? "Tebrikler!" : "Devam Et"}
            </button>
          </div>
        </div>
      )}

      {cikisSor && (
        <div className="bk-oyun-ortu hafif" onClick={() => setCikisSor(false)}>
          <div className="bk-oyun-onay" onClick={(e) => e.stopPropagation()}>
            <div className="sor">Çıkmak istiyor musun?</div>
            <div className="ikili">
              <button className="hayir" onClick={() => setCikisSor(false)}>Hayır</button>
              <button className="evet" onClick={onCik}>Evet, Çık</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
