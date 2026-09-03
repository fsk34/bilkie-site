"use client";

// Yazılı çalışması — uygulamadaki zincirin tamamı:
//   sıralama → açık uçlu → test → doğru-yanlış
// Uygulamada olduğu gibi ilerleme ve ödüller SON halkada yazılır
// (completedSteps + XP = doğru-yanlış doğrusu × 4 + ACT_YAZILI serisi).

import Link from "next/link";
import SonucAkisi, { type SeriArgs } from "../../../sonuc/SonucAkisi";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOturum } from "../../../../lib/oturum";
import {
  CAN_LIMITI,
  acikCevapDogruMu,
  canYaz,
  canlariTazele,
  siralamaKarsilastir,
  yaziliAcikSorulari,
  yaziliDersCoz,
  yaziliDogruYanlisSorulari,
  yaziliGorselAdresi,
  yaziliIlerlemesi,
  yaziliSiradakiAdim,
  yaziliSiralamaSorulari,
  ACT_YAZILI,
  XP_DOGRU_YAZILI,
  yaziliTamamla,
  yaziliTestSorulari,
  type AcikSorusu,
  type DogruYanlisSorusu,
  type SiralamaSorusu,
  type YaziliTestSorusu,
} from "../../../../lib/veri";
import { enUzunSeriGuncelle, yaziliBittiIsle } from "../../../../lib/ilerleme";

const DERS_ADI: Record<string, string> = {
  turkce: "Türkçe", matematik: "Matematik", fen: "Fen Bilimleri",
  ingilizce: "İngilizce", sosyal: "Sosyal Bilgiler",
};

type Bolum = "siralama" | "acikuclu" | "test" | "dogruyanlis";
const BOLUM_ADI: Record<Bolum, string> = {
  siralama: "Sıralama", acikuclu: "Açık Uçlu", test: "Test", dogruyanlis: "Doğru-Yanlış",
};

type Durum = "yukleniyor" | "hata" | "cozuluyor" | "bitti";

export default function YaziliCalismaSayfasi() {
  const params = useParams<{ sinav: string; ders: string }>();
  const sinavKey = params?.sinav ?? "";
  const dersKey = params?.ders ?? "";
  const { yukleniyor, kullanici, sinif } = useOturum();

  const [durum, setDurum] = useState<Durum>("yukleniyor");
  const [adim, setAdim] = useState<"step1" | "step2">("step1");
  const [siralama, setSiralama] = useState<SiralamaSorusu[]>([]);
  const [acik, setAcik] = useState<AcikSorusu[]>([]);
  const [test, setTest] = useState<YaziliTestSorusu[]>([]);
  const [dy, setDy] = useState<DogruYanlisSorusu[]>([]);
  const [bolumler, setBolumler] = useState<Bolum[]>([]);
  const [bolumIndeks, setBolumIndeks] = useState(0);
  const [indeks, setIndeks] = useState(0);
  const [can, setCan] = useState(CAN_LIMITI);

  // cevap durumları
  const [havuz, setHavuz] = useState<string[]>([]);
  const [secilen, setSecilen] = useState<number[]>([]);
  const [yazilan, setYazilan] = useState("");
  const [sik, setSik] = useState<string | null>(null);
  const [dySecim, setDySecim] = useState<"D" | "Y" | null>(null);
  const [kontrol, setKontrol] = useState(false);
  const [dogruMu, setDogruMu] = useState(false);
  const [gorsel, setGorsel] = useState<string | null>(null);

  // sonuçlar
  const [dogrular, setDogrular] = useState<Record<Bolum, number>>({
    siralama: 0, acikuclu: 0, test: 0, dogruyanlis: 0,
  });
  const [kazanilanXp, setKazanilanXp] = useState(0);
  const [seriSayisi, setSeriSayisi] = useState<number | null>(null);
  // Seri bugün ilk kez işaretlendiyse uygulamadaki seri özeti gösterilir.
  const [seriAkisi, setSeriAkisi] = useState<SeriArgs | null>(null);
  const seriSozu = useMemo(() => (seriAkisi ? Promise.resolve(seriAkisi) : null), [seriAkisi]);

  const bolum = bolumler[bolumIndeks];

  /* ------------------------------------------------------------- yükleme */

  useEffect(() => {
    if (yukleniyor) return;
    let iptal = false;

    (async () => {
      try {
        const icerikDers = await yaziliDersCoz(sinif, dersKey, sinavKey);
        let siradaki: "step1" | "step2" = "step1";
        if (kullanici) {
          const [ilerleme, kalanCan] = await Promise.all([
            // ⚠️ ilerleme SADE ders anahtarıyla tutulur
            yaziliIlerlemesi(kullanici.uid, [dersKey], sinavKey),
            canlariTazele(kullanici.uid),
          ]);
          if (iptal) return;
          siradaki = yaziliSiradakiAdim(ilerleme[dersKey] ?? 0);
          setCan(kalanCan);
        }
        setAdim(siradaki);

        const [s, a, t, d] = await Promise.all([
          yaziliSiralamaSorulari(sinif, icerikDers, sinavKey, siradaki),
          yaziliAcikSorulari(sinif, icerikDers, sinavKey, siradaki),
          yaziliTestSorulari(sinif, icerikDers, sinavKey, siradaki),
          yaziliDogruYanlisSorulari(sinif, icerikDers, sinavKey, siradaki),
        ]);
        if (iptal) return;

        setSiralama(s); setAcik(a); setTest(t); setDy(d);
        // Boş bölümler atlanır (uygulamada da o ekran hata verirdi)
        const sira: Bolum[] = [];
        if (s.length) sira.push("siralama");
        if (a.length) sira.push("acikuclu");
        if (t.length) sira.push("test");
        if (d.length) sira.push("dogruyanlis");
        setBolumler(sira);

        if (sira.length === 0) { setDurum("hata"); return; }
        if (sira[0] === "siralama") setHavuz(karistir(s[0].parcalar));
        setDurum("cozuluyor");
      } catch {
        if (!iptal) setDurum("hata");
      }
    })();

    return () => { iptal = true; };
  }, [yukleniyor, kullanici, sinif, dersKey, sinavKey]);

  // Soru görseli (test / açık uçlu)
  useEffect(() => {
    setGorsel(null);
    const yol =
      bolum === "test" ? test[indeks]?.gorselYolu
      : bolum === "acikuclu" ? acik[indeks]?.gorselYolu
      : undefined;
    if (!yol) return;
    let iptal = false;
    yaziliGorselAdresi(yol).then((u) => { if (!iptal) setGorsel(u); });
    return () => { iptal = true; };
  }, [bolum, indeks, test, acik]);

  /* -------------------------------------------------------------- akış */

  const soruSayisi =
    bolum === "siralama" ? siralama.length
    : bolum === "acikuclu" ? acik.length
    : bolum === "test" ? test.length
    : dy.length;

  // Adımın başlangıcı — istatistikteki ortalama süre için (Android: durationSec)
  const baslangicRef = useRef(Date.now());

  const bitir = useCallback(async (dyDogru: number) => {
    setDurum("bitti");
    if (!kullanici) return;
    try {
      const sonuc = await yaziliTamamla({
        uid: kullanici.uid, sinif, dersKey, sinavKey, adim, dogru: dyDogru,
      });
      setKazanilanXp(sonuc.xp);
      if (sonuc.seri?.basarili) {
        setSeriSayisi(sonuc.seri.sayi);
        if (sonuc.seri.ilkAktiviteBugun) {
          setSeriAkisi({ sayi: sonuc.seri.sayi, maske: sonuc.seri.maske, tetik: ACT_YAZILI });
        }
        if (sonuc.seri.sayi > 0) {
          await enUzunSeriGuncelle(kullanici.uid, sinif, sonuc.seri.sayi);
        }
      }
      // Başarımlar + görevler + istatistik — Android onYaziliCompleted zinciri.
      // Doğru/toplam yalnız SON halkadan (doğru-yanlış) geliyor; XP de öyle veriliyor.
      await yaziliBittiIsle({
        uid: kullanici.uid, sinif, dersKey, sinavKey,
        dogru: dyDogru, toplam: dy.length,
        sureSn: Math.max(1, Math.round((Date.now() - baslangicRef.current) / 1000)),
        puan: Math.max(0, dyDogru) * XP_DOGRU_YAZILI,
      });
    } catch {
      /* yazma hatası akışı durdurmasın */
    }
  }, [kullanici, sinif, dersKey, sinavKey, adim, dy.length]);

  function canAzalt() {
    const yeni = Math.max(0, can - 1);
    setCan(yeni);
    if (kullanici) canYaz(kullanici.uid, yeni).catch(() => {});
  }

  function kontrolEt() {
    if (kontrol) return;
    let d = false;
    if (bolum === "siralama") {
      if (secilen.length === 0) return;
      d = siralamaKarsilastir(secilen.map((i) => havuz[i]).join(" "), siralama[indeks].hedef);
    } else if (bolum === "acikuclu") {
      if (!yazilan.trim()) return;
      d = acikCevapDogruMu(yazilan, acik[indeks].cevaplar, acik[indeks].buyukKucukOnemli);
    } else if (bolum === "test") {
      if (!sik) return;
      d = sik.toLocaleUpperCase("tr") === test[indeks].dogru;
    } else {
      if (!dySecim) return;
      d = dySecim === dy[indeks].dogru;
    }

    setDogruMu(d);
    setKontrol(true);
    if (d) setDogrular((x) => ({ ...x, [bolum]: x[bolum] + 1 }));
    else canAzalt();
  }

  function devamEt() {
    const sonSoru = indeks + 1 >= soruSayisi;
    if (!sonSoru) {
      const sonraki = indeks + 1;
      setIndeks(sonraki);
      if (bolum === "siralama") setHavuz(karistir(siralama[sonraki].parcalar));
      sifirla();
      return;
    }
    // Bölüm bitti → sıradaki bölüm ya da yazılı bitişi
    if (bolumIndeks + 1 < bolumler.length) {
      const sonrakiBolum = bolumler[bolumIndeks + 1];
      setBolumIndeks(bolumIndeks + 1);
      setIndeks(0);
      if (sonrakiBolum === "siralama") setHavuz(karistir(siralama[0].parcalar));
      sifirla();
    } else {
      // XP uygulamadaki gibi YALNIZCA doğru-yanlış bölümünün doğrusundan hesaplanır.
      // Son sorunun doğrusu kontrolEt'te zaten sayıldığı için sayaç güncel.
      bitir(dogrular.dogruyanlis);
    }
  }

  function sifirla() {
    setSecilen([]); setYazilan(""); setSik(null); setDySecim(null);
    setKontrol(false); setDogruMu(false);
  }

  /* ---------------------------------------------------------- ekranlar */

  if (durum === "yukleniyor") return <Perde metin="Yazılı soruları yükleniyor…" />;

  if (durum === "hata") {
    return (
      <Perde metin={kullanici
        ? "Bu ders için yazılı sorusu bulunamadı."
        : "Sorular yüklenemedi. Yazılı çalışması için giriş yapman gerekebilir."}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <Link className="bk-dugme" href={`/yazili/${sinavKey}`}>Derslere dön</Link>
          {!kullanici && <Link className="bk-dugme acik" href="/giris">Giriş yap</Link>}
        </div>
      </Perde>
    );
  }

  if (seriAkisi) {
    return (
      <SonucAkisi
        sonuc={null}
        seriSozu={seriSozu}
        uid={kullanici?.uid ?? null}
        onBitti={() => setSeriAkisi(null)}
      />
    );
  }

  if (durum === "bitti") {
    const toplamDogru = bolumler.reduce((t, b) => t + dogrular[b], 0);
    const toplamSoru = siralama.length + acik.length + test.length + dy.length;
    return (
      <div className="bk">
        <div className="bk-test" style={{ textAlign: "center", paddingTop: 56 }}>
          <div style={{ fontSize: 64, marginBottom: 8 }}>✍️</div>
          <h1 style={{ fontSize: 26 }}>Yazılı çalışması bitti!</h1>
          <p className="bk-soluk" style={{ margin: "8px 0 22px" }}>
            {DERS_ADI[dersKey] ?? dersKey} · {adim === "step1" ? "1." : "2."} çalışma
          </p>

          <div className="bk-rozetler" style={{ maxWidth: 460, margin: "0 auto 18px" }}>
            <div className="bk-rozet"><span>✅</span><span>{toplamDogru}/{toplamSoru}</span></div>
            <div className="bk-rozet"><span>⚡</span><span>+{kazanilanXp} XP</span></div>
            {seriSayisi != null && <div className="bk-rozet"><span>🔥</span><span>{seriSayisi}</span></div>}
          </div>

          <div className="bk-kart" style={{ maxWidth: 460, margin: "0 auto 22px", textAlign: "left" }}>
            {bolumler.map((b) => (
              <div key={b} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                <span className="bk-soluk" style={{ fontSize: 14 }}>{BOLUM_ADI[b]}</span>
                <span style={{ fontFamily: "bk-baslik, system-ui", fontSize: 14 }}>
                  {dogrular[b]}/{b === "siralama" ? siralama.length : b === "acikuclu" ? acik.length : b === "test" ? test.length : dy.length}
                </span>
              </div>
            ))}
          </div>

          {!kullanici && (
            <p className="bk-soluk" style={{ margin: "0 auto 20px", maxWidth: 400, fontSize: 14 }}>
              Misafir olarak çalıştın — sonuç kaydedilmedi.
            </p>
          )}

          <Link className="bk-dugme" href={`/yazili/${sinavKey}`}>Derslere dön</Link>
        </div>
      </div>
    );
  }

  const cevapVar =
    bolum === "siralama" ? secilen.length > 0
    : bolum === "acikuclu" ? yazilan.trim().length > 0
    : bolum === "test" ? sik != null
    : dySecim != null;

  const oran = ((indeks + (kontrol ? 1 : 0)) / Math.max(1, soruSayisi)) * 100;

  return (
    <div className="bk">
      <div className="bk-test">
        <div className="bk-test-ust">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <Link href={`/yazili/${sinavKey}`} className="bk-cikis" aria-label="Çık"><img src="/uygulama/cikis.png" alt="" /></Link>
          <div className="bk-cubuk" style={{ flex: 1 }}><i style={{ width: `${oran}%` }} /></div>
          <div style={{ fontFamily: "bk-baslik, system-ui" }}>❤️ {can}</div>
        </div>

        <p className="bk-soluk" style={{ fontSize: 13, marginBottom: 6 }}>
          {DERS_ADI[dersKey] ?? dersKey} · {BOLUM_ADI[bolum]} ({bolumIndeks + 1}/{bolumler.length}) ·
          {" "}{indeks + 1}/{soruSayisi}
        </p>

        {gorsel && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={gorsel}
            alt=""
            style={{ maxWidth: "100%", borderRadius: 14, marginBottom: 14 }}
          />
        )}

        {bolum === "siralama" && (
          <>
            <h2 style={{ fontSize: 20, lineHeight: 1.35, marginBottom: 18 }}>
              {siralama[indeks].yonerge || "Kelimeleri doğru sırayla diz."}
            </h2>
            <div className="bk-siralama-hedef">
              {secilen.length === 0 && (
                <span className="bk-soluk" style={{ fontSize: 14 }}>Parçalara dokunarak cümleyi kur.</span>
              )}
              {secilen.map((i, sira) => (
                <button
                  key={`${i}-${sira}`}
                  className="bk-parca"
                  disabled={kontrol}
                  onClick={() => setSecilen((s) => s.filter((_, x) => x !== sira))}
                >
                  {havuz[i]}
                </button>
              ))}
            </div>
            <div className="bk-parca-havuz">
              {havuz.map((p, i) => (
                <button
                  key={`${p}-${i}`}
                  className="bk-parca"
                  data-secili={secilen.includes(i)}
                  disabled={secilen.includes(i) || kontrol}
                  onClick={() => setSecilen((s) => [...s, i])}
                >
                  {p}
                </button>
              ))}
            </div>
          </>
        )}

        {bolum === "acikuclu" && (
          <>
            {acik[indeks].pasaj && (
              <p className="bk-soluk" style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 12 }}>
                {acik[indeks].pasaj}
              </p>
            )}
            <h2 style={{ fontSize: 20, lineHeight: 1.35, marginBottom: 16 }}>{acik[indeks].soru}</h2>
            <input
              className="bk-alan"
              placeholder="Cevabını yaz"
              value={yazilan}
              disabled={kontrol}
              onChange={(e) => setYazilan(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") kontrol ? devamEt() : kontrolEt(); }}
            />
          </>
        )}

        {bolum === "test" && (
          <>
            <h2 style={{ fontSize: 20, lineHeight: 1.35, marginBottom: 18 }}>{test[indeks].soru}</h2>
            {test[indeks].secenekler.map((s) => (
              <button
                key={s.anahtar}
                className="bk-secenek"
                disabled={kontrol}
                data-durum={
                  kontrol
                    ? s.anahtar.toLocaleUpperCase("tr") === test[indeks].dogru ? "dogru"
                      : s.anahtar === sik ? "yanlis" : undefined
                    : s.anahtar === sik ? "secili" : undefined
                }
                onClick={() => setSik(s.anahtar)}
              >
                <b style={{ marginRight: 8 }}>{s.anahtar.toLocaleUpperCase("tr")})</b>{s.metin}
              </button>
            ))}
          </>
        )}

        {bolum === "dogruyanlis" && (
          <>
            <h2 style={{ fontSize: 20, lineHeight: 1.45, marginBottom: 22 }}>{dy[indeks].ifade}</h2>
            <div style={{ display: "flex", gap: 12 }}>
              {(["D", "Y"] as const).map((v) => (
                <button
                  key={v}
                  className="bk-secenek"
                  style={{ flex: 1, textAlign: "center" }}
                  disabled={kontrol}
                  data-durum={
                    kontrol
                      ? v === dy[indeks].dogru ? "dogru" : v === dySecim ? "yanlis" : undefined
                      : v === dySecim ? "secili" : undefined
                  }
                  onClick={() => setDySecim(v)}
                >
                  {v === "D" ? "Doğru" : "Yanlış"}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className={`bk-alt-bant ${kontrol ? (dogruMu ? "dogru" : "yanlis") : ""}`}>
        {kontrol && (
          <div className="bk-alt-bant-yazi">
            {dogruMu ? "Doğru! 🎉" : `Doğrusu: ${dogruCevapMetni(bolum, indeks, siralama, acik, test, dy)}`}
          </div>
        )}
        {kontrol ? (
          <button className="bk-eylem" data-ton={dogruMu ? "dogru" : "yanlis"} onClick={devamEt}>
            {indeks + 1 >= soruSayisi && bolumIndeks + 1 >= bolumler.length ? "Bitir" : "Devam Et"}
          </button>
        ) : (
          <button className="bk-eylem" onClick={kontrolEt} disabled={!cevapVar}>Kontrol Et</button>
        )}
      </div>
    </div>
  );
}

function dogruCevapMetni(
  bolum: Bolum, i: number,
  siralama: SiralamaSorusu[], acik: AcikSorusu[],
  test: YaziliTestSorusu[], dy: DogruYanlisSorusu[]
): string {
  switch (bolum) {
    case "siralama":  return siralama[i]?.hedef ?? "";
    case "acikuclu":  return acik[i]?.cevaplar[0] ?? "";
    case "test": {
      const s = test[i];
      return s?.secenekler.find((x) => x.anahtar.toLocaleUpperCase("tr") === s.dogru)?.metin ?? s?.dogru ?? "";
    }
    case "dogruyanlis": return dy[i]?.dogru === "D" ? "Doğru" : "Yanlış";
  }
}

function karistir<T>(dizi: T[]): T[] {
  const k = [...dizi];
  for (let i = k.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [k[i], k[j]] = [k[j], k[i]];
  }
  return k;
}

function Perde({ metin, children }: { metin: string; children?: React.ReactNode }) {
  return (
    <div className="bk" style={{ display: "grid", placeItems: "center", minHeight: "100vh", padding: 24 }}>
      <div style={{ textAlign: "center", display: "grid", gap: 18, justifyItems: "center" }}>
        <p className="bk-soluk" style={{ fontSize: 16, maxWidth: 420 }}>{metin}</p>
        {children}
      </div>
    </div>
  );
}
