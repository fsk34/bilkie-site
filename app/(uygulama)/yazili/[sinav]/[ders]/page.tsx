"use client";

// Yazılı çalışması — uygulamadaki zincirin tamamı:
//   sıralama → açık uçlu → test → doğru-yanlış
// Uygulamada olduğu gibi ilerleme ve ödüller SON halkada yazılır. Doğru/toplam = adımın TÜM
// bölümlerinin toplamı (şartname KARAR S1, Android YaziliSessionState): XP = toplam doğru × 4,
// istatistik ve görev de bu toplamla. Eskiden web yalnız doğru-yanlış bölümünü sayıyordu.
// Olay modu (§7.3): tek olay yazması; completedSteps, XP, seri, görev sunucuda.

import { AksiyonDugmesi, AltSonucBandi } from "../../../TestAlt";
import CikisOnayi from "../../../CikisOnayi";
import Link from "next/link";
import Perde from "../../../Perde";
import SonucAkisi, { type SeriArgs, type SonucArgs } from "../../../sonuc/SonucAkisi";
import type { GorevDegisimi } from "../../../../lib/gorevYaz";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useOturum } from "../../../../lib/oturum";
import { useHakSistemi } from "../../../../lib/hak";
import { useUstBilgi } from "../../../../lib/canliVeri";
import { sessizHata, tavanli } from "../../../../lib/hata";
import {
  CAN_LIMITI,
  acikCevapDogruMu,
  canDegistir,
  siralamaKarsilastir,
  yaziliAcikSorulari,
  yaziliDersCoz,
  yaziliDogruYanlisSorulari,
  yaziliGorselAdresi,
  yaziliGorselleriniOnYukle,
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
import { olayModuAcikMi } from "../../../../lib/olay/mod";
import { yaziliOlayiniYaz } from "../../../../lib/olay/bitisler";
import { bitisOzeti } from "../../../../lib/olay/tahmin";

const DERS_ADI: Record<string, string> = {
  turkce: "Türkçe", matematik: "Matematik", fen: "Fen Bilimleri",
  ingilizce: "İngilizce", sosyal: "Sosyal Bilgiler",
};

type Bolum = "siralama" | "acikuclu" | "test" | "dogruyanlis";
const BOLUM_ADI: Record<Bolum, string> = {
  siralama: "Sıralama", acikuclu: "Açık Uçlu", test: "Test", dogruyanlis: "Doğru-Yanlış",
};

type Durum = "yukleniyor" | "hata" | "cozuluyor" | "sonuc";

export default function YaziliCalismaSayfasi() {
  const router = useRouter();
  const [cikisSor, setCikisSor] = useState(false);   // Android ExitConfirmDialog — eskiden onaysız çıkıyordu
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
  // Can CANLI dinleyiciden; yazma transaction'la (canDegistir), yerelde anında yansır
  const ust = useUstBilgi(sinif);
  const can = kullanici ? (ust?.can ?? CAN_LIMITI) : CAN_LIMITI;
  // Web'de hak sistemi kapalı (lib/hak.ts): hak düşmez, sayaç görünmez — altyapı yerinde
  const hakAcik = useHakSistemi();
  // Son soruda "Devam Et" çift dokunuşu: ikinci basış bitişi (XP/görev/istatistik) iki kez yazmasın
  const bitirildi = useRef(false);

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
  const [akis, setAkis] = useState<{ sonuc: SonucArgs; seriSozu: Promise<SeriArgs | null>; gorevSozu: Promise<GorevDegisimi[]> } | null>(null);

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
          canDegistir(kullanici.uid, 0);   // gün değiştiyse canlar 3'e (tek transaction, beklenmez)
          // ⚠️ ilerleme SADE ders anahtarıyla tutulur
          const ilerleme = await tavanli(yaziliIlerlemesi(kullanici.uid, sinif, [dersKey], sinavKey), 6000);
          if (iptal) return;
          // Okunamazsa açılmaz: tamamlanmış adım yeniden çözdürülmesin
          if (!ilerleme) { setDurum("hata"); return; }
          siradaki = yaziliSiradakiAdim(ilerleme[dersKey] ?? 0);
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
        // Bütün bölümler zaten burada okundu; görseller de şimdi iner (internet giderse adım sürsün)
        yaziliGorselleriniOnYukle([...t.map((x) => x.gorselYolu), ...a.map((x) => x.gorselYolu)]);
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

  // Bitiş: Android'deki gibi genel Sonuç akışı (sonuç kartı → seri özeti → görev özeti). Puan kartta
  // doğru × 4 (Android ResultArgs.score); ödül yazımı kart ekrandayken arkada sürer.
  const bitir = useCallback((dogru: number, toplam: number) => {
    if (bitirildi.current) return;
    bitirildi.current = true;
    const sureSn = Math.max(1, Math.round((Date.now() - baslangicRef.current) / 1000));
    const puan = Math.max(0, dogru) * XP_DOGRU_YAZILI;
    let gorevCoz: (d: GorevDegisimi[]) => void = () => {};
    const gorevSozu = new Promise<GorevDegisimi[]>((c) => { gorevCoz = c; });

    const seriSozu: Promise<SeriArgs | null> = (async () => {
      if (!kullanici) { gorevCoz([]); return null; }
      const uid = kullanici.uid;
      // Olay modu: karar BİR KEZ burada — aynı bitiş asla iki yoldan yazılmaz
      if (olayModuAcikMi(uid)) {
        try {
          const o = await yaziliOlayiniYaz({ uid, sinif, ders: dersKey, sinav: sinavKey, adim, dogru, toplam, sureSn });
          if (o) {
            const oz = await bitisOzeti(uid, o);
            gorevCoz(oz.gorevler);
            return oz.seri?.ilkBugun ? { sayi: oz.seri.sayi, maske: oz.seri.maske, tetik: ACT_YAZILI } : null;
          }
        } catch (e) {
          sessizHata("olayYaz", e);   // eski yola düşer
        }
      }
      // Eski yol — başarımlar + görevler + istatistik (Android onYaziliCompleted); ilerleme/XP/seri
      // yazmasından BAĞIMSIZ başlar (çevrimdışıyken biri dönmese de diğeri yürür). S1: tüm bölümler.
      yaziliBittiIsle({
        uid, sinif, dersKey, sinavKey, dogru, toplam, sureSn, puan,
        // Android: incrementCounter = stepKey == "step1" — hazırlanan yazılı sayacı adım 2'de artmaz
        sayaciArtir: adim === "step1",
      }).then(gorevCoz, () => gorevCoz([]));
      // Çevrimdışıyken yazma sözleri dönmez → en çok 6 sn beklenir (Android), iş arkada sürer
      const sonuc = await tavanli(yaziliTamamla({ uid, sinif, dersKey, sinavKey, adim, dogru, toplam }), 6000);
      if (!sonuc?.seri?.basarili) return null;
      // En uzun seri rekoru: tek yazma, sınıfa göre kırpılmış (beklenmez)
      if (sonuc.seri.sayi > 0) void enUzunSeriGuncelle(uid, sinif, sonuc.seri.sayi).catch((e) => sessizHata("seriRekor", e));
      return sonuc.seri.ilkAktiviteBugun ? { sayi: sonuc.seri.sayi, maske: sonuc.seri.maske, tetik: ACT_YAZILI } : null;
    })();

    setDurum("sonuc");
    setAkis({ sonuc: { dogru, toplam, sureSn, puan }, seriSozu, gorevSozu });
  }, [kullanici, sinif, dersKey, sinavKey, adim]);

  function canAzalt() {
    // Gün kontrolü + 1 azaltma tek transaction'da (mutlak değer yazılmaz); ekran dinleyiciden
    if (kullanici && hakAcik) canDegistir(kullanici.uid, -1);
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
      // S1: adımın TÜM bölümlerinin doğrusu/sorusu. Son sorunun doğrusu kontrolEt'te zaten sayıldı.
      const dogru = bolumler.reduce((t, b) => t + dogrular[b], 0);
      const toplam = siralama.length + acik.length + test.length + dy.length;
      bitir(dogru, toplam);
    }
  }

  function sifirla() {
    setSecilen([]); setYazilan(""); setSik(null); setDySecim(null);
    setKontrol(false); setDogruMu(false);
  }

  /* ---------------------------------------------------------- ekranlar */

  if (durum === "yukleniyor") return <Perde metin="Yazılı soruları yükleniyor…" nokta />;

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

  if (durum === "sonuc" && akis) {
    return (
      <SonucAkisi
        sonuc={akis.sonuc}
        seriSozu={akis.seriSozu}
        gorevSozu={akis.gorevSozu}
        uid={kullanici?.uid ?? null}
        misafir={!kullanici}
        onBitti={() => router.push(`/yazili/${sinavKey}`)}
      />
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
          <button className="bk-cikis" aria-label="Çık" onClick={() => setCikisSor(true)}><img src="/uygulama/cikis.png" alt="" /></button>
          {cikisSor && <CikisOnayi onVazgec={() => setCikisSor(false)} onCik={() => router.push(`/yazili/${sinavKey}`)} />}
          <div className="bk-cubuk" style={{ flex: 1 }}><i style={{ width: `${oran}%` }} /></div>
          {hakAcik && <div style={{ fontFamily: "bk-baslik, system-ui" }}>❤️ {can}</div>}
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

      <AltSonucBandi
        gorunur={kontrol}
        dogru={dogruMu}
        dogruCevap={bolum === "siralama" || bolum === "acikuclu" ? dogruCevapMetni(bolum, indeks, siralama, acik, test, dy) : null}
      />
      <AksiyonDugmesi
        etiket={kontrol ? "Devam Et" : "Kontrol Et"}
        etkin={kontrol || cevapVar}
        ton={!kontrol ? "normal" : dogruMu ? "dogru" : "yanlis"}
        onClick={kontrol ? devamEt : kontrolEt}
      />
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

