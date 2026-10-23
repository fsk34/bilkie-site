"use client";

// Yazılı çalışması — uygulamadaki zincirin tamamı:
//   boşluk doldurma → açık uçlu → test / doğru-yanlış (22 Eki: sıralama kaldırıldı, boşluk doldurma geldi;
//   açık uçluda "örnek cevap" soruları hüküm vermez)
// Uygulamada olduğu gibi ilerleme ve ödüller SON halkada yazılır. Doğru/toplam = adımın TÜM
// bölümlerinin toplamı (şartname KARAR S1, Android YaziliSessionState): XP = toplam doğru × 4,
// istatistik ve görev de bu toplamla. Eskiden web yalnız doğru-yanlış bölümünü sayıyordu.
// Olay modu (§7.3): tek olay yazması; completedSteps, XP, seri, görev sunucuda.

import { AksiyonDugmesi, AltSonucBandi } from "../../../TestAlt";
import CikisOnayi from "../../../CikisOnayi";
import Link from "next/link";
import Perde from "../../../Perde";
import SoruCubugu from "../../../SoruCubugu";
import { sesCal } from "../../../ses";
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
  yaziliAcikSorulari,
  yaziliBoslukDoldurma,
  yaziliSonAdim,
  yaziliDersCoz,
  yaziliDogruYanlisSorulari,
  yaziliGorselAdresi,
  yaziliGorselleriniOnYukle,
  yaziliIlerlemesi,
  yaziliSiradakiAdim,
  ACT_YAZILI,
  XP_DOGRU_YAZILI,
  yaziliTamamla,
  yaziliTestSorulari,
  type AcikSorusu,
  type BoslukDoldurma,
  type DogruYanlisSorusu,
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

/** Yazılı ekranlarının çubuk zemini (Android Color(0x33252733)) */
const YAZILI_IZ = "rgba(37, 39, 51, 0.2)";

type Bolum = "bosluk" | "acikuclu" | "test" | "dogruyanlis";
const BOLUM_ADI: Record<Bolum, string> = {
  bosluk: "Boşluk Doldurma", acikuclu: "Açık Uçlu", test: "Test", dogruyanlis: "Doğru-Yanlış",
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
  const [bosluk, setBosluk] = useState<BoslukDoldurma | null>(null);
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
  // boşluk doldurma: karışık havuz; yerlesim[i] = i. boşluktaki havuz kelimesi (-1 boş)
  const [havuz, setHavuz] = useState<string[]>([]);
  const [yerlesim, setYerlesim] = useState<number[]>([]);
  const [seciliBosluk, setSeciliBosluk] = useState(-1);
  const [boslukSonuc, setBoslukSonuc] = useState<boolean[]>([]);
  const [yazilan, setYazilan] = useState("");
  const [sik, setSik] = useState<string | null>(null);
  const [dySecim, setDySecim] = useState<"D" | "Y" | null>(null);
  const [kontrol, setKontrol] = useState(false);
  const [dogruMu, setDogruMu] = useState(false);
  const [gorsel, setGorsel] = useState<string | null>(null);

  // sonuçlar
  const [dogrular, setDogrular] = useState<Record<Bolum, number>>({
    bosluk: 0, acikuclu: 0, test: 0, dogruyanlis: 0,
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
          siradaki = yaziliSiradakiAdim(ilerleme[dersKey] ?? 0, yaziliSonAdim.oku(kullanici.uid, sinif, dersKey, sinavKey));
        }
        setAdim(siradaki);

        const [s, a, t, d] = await Promise.all([
          yaziliBoslukDoldurma(sinif, icerikDers, sinavKey, siradaki),
          yaziliAcikSorulari(sinif, icerikDers, sinavKey, siradaki),
          yaziliTestSorulari(sinif, icerikDers, sinavKey, siradaki),
          yaziliDogruYanlisSorulari(sinif, icerikDers, sinavKey, siradaki),
        ]);
        if (iptal) return;

        setBosluk(s); setAcik(a); setTest(t); setDy(d);
        // Bütün bölümler zaten burada okundu; görseller de şimdi iner (internet giderse adım sürsün)
        yaziliGorselleriniOnYukle([...t.map((x) => x.gorselYolu), ...a.map((x) => x.gorselYolu)]);
        // Boş bölümler atlanır (uygulamada da o ekran hata verirdi)
        const sira: Bolum[] = [];
        if (s) sira.push("bosluk");   // boşluk doldurma yoksa adım açık uçluyla başlar
        if (a.length) sira.push("acikuclu");
        if (t.length) sira.push("test");
        if (d.length) sira.push("dogruyanlis");
        setBolumler(sira);

        if (sira.length === 0) { setDurum("hata"); return; }
        if (s) { setHavuz(karistir(s.havuz)); setYerlesim(s.cumleler.map(() => -1)); }
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
    bolum === "bosluk" ? 1   // tek ekran (cümleler birlikte kontrol edilir)
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
    // Tekrar sırası için en son bitirilen adım (yaziliSiradakiAdim okur)
    if (kullanici) yaziliSonAdim.yaz(kullanici.uid, sinif, dersKey, sinavKey, adim);
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
    setAkis({ sonuc: { dogru, toplam, sureSn, puan, yaziliAdim: adim }, seriSozu, gorevSozu });
  }, [kullanici, sinif, dersKey, sinavKey, adim]);

  function canAzalt() {
    // Gün kontrolü + 1 azaltma tek transaction'da (mutlak değer yazılmaz); ekran dinleyiciden
    if (kullanici && hakAcik) canDegistir(kullanici.uid, -1);
  }

  function kontrolEt() {
    if (kontrol) return;
    let d = false;
    if (bolum === "bosluk") {
      if (!bosluk || yerlesim.some((k) => k < 0)) return;
      // Her boşluk ayrı soru sayılır; ekranda yanlış varsa 1 can
      const sn = bosluk.cumleler.map((c, i) => havuz[yerlesim[i]] === c.cevap);
      const n = sn.filter(Boolean).length;
      setBoslukSonuc(sn);
      setSeciliBosluk(-1);
      setDogruMu(n === sn.length);
      setKontrol(true);
      setDogrular((x) => ({ ...x, bosluk: n }));
      sesCal(n === sn.length ? "dogru" : "yanlis");
      if (n < sn.length) canAzalt();
      return;
    } else if (bolum === "acikuclu") {
      if (!yazilan.trim()) return;
      if (acik[indeks].ornekCevap) {
        // Örnek cevaplı soru: hüküm yok, can gitmez; cevap yazan öğrenci doğru sayılır (XP doğru × 4)
        setDogruMu(true); setKontrol(true);
        setDogrular((x) => ({ ...x, acikuclu: x.acikuclu + 1 }));
        sesCal("dogru");
        return;
      }
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
      sifirla();
      return;
    }
    // Bölüm bitti → sıradaki bölüm ya da yazılı bitişi
    if (bolumIndeks + 1 < bolumler.length) {
      const sonrakiBolum = bolumler[bolumIndeks + 1];
      setBolumIndeks(bolumIndeks + 1);
      setIndeks(0);
      void sonrakiBolum;
      sifirla();
    } else {
      // S1: adımın TÜM bölümlerinin doğrusu/sorusu. Son sorunun doğrusu kontrolEt'te zaten sayıldı.
      const dogru = bolumler.reduce((t, b) => t + dogrular[b], 0);
      const toplam = (bosluk?.cumleler.length ?? 0) + acik.length + test.length + dy.length;
      bitir(dogru, toplam);
    }
  }

  function sifirla() {
    setYazilan(""); setSik(null); setDySecim(null);
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
    bolum === "bosluk" ? yerlesim.length > 0 && yerlesim.every((k) => k >= 0)
    : bolum === "acikuclu" ? yazilan.trim().length > 0
    : bolum === "test" ? sik != null
    : dySecim != null;

  const oran = ((indeks + (kontrol ? 1 : 0)) / Math.max(1, soruSayisi)) * 100;
  const boslukDolu = yerlesim.filter((k) => k >= 0).length;
  const boslukSayisi = bosluk?.cumleler.length ?? 0;
  const boslukDogru = boslukSonuc.filter(Boolean).length;
  const ornekMi = bolum === "acikuclu" && !!acik[indeks]?.ornekCevap;

  /** Kelimeyi boşluğa koy: aynı kelime başka boşluktaysa oradan alınır; hedefteki eski kelime havuza döner. */
  function yerlestir(kelime: number, hedef: number) {
    if (kontrol || hedef < 0 || hedef >= yerlesim.length) return;
    setYerlesim((y) => y.map((k, i) => (i === hedef ? kelime : k === kelime ? -1 : k)));
    setSeciliBosluk(-1);
  }

  return (
    <div className="bk">
      <div className="bk-test">
        <div className="bk-test-ust">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <button className="bk-cikis" aria-label="Çık" onClick={() => setCikisSor(true)}><img src="/uygulama/cikis.png" alt="" /></button>
          {cikisSor && <CikisOnayi onVazgec={() => setCikisSor(false)} onCik={() => router.push(`/yazili/${sinavKey}`)} />}
          {bolum === "bosluk"
            ? <SoruCubugu hedef={boslukSayisi ? boslukDolu / boslukSayisi : 0} mevcut={boslukDolu} toplam={boslukSayisi} izRengi={YAZILI_IZ} />
            : <SoruCubugu hedef={oran / 100} mevcut={indeks + 1} toplam={soruSayisi} izRengi={YAZILI_IZ} />}
          {hakAcik && <div style={{ fontFamily: "bk-baslik, system-ui" }}>❤️ {can}</div>}
        </div>

        <p className="bk-soluk" style={{ fontSize: 13, marginBottom: 6 }}>
          {DERS_ADI[dersKey] ?? dersKey} · {BOLUM_ADI[bolum]} ({bolumIndeks + 1}/{bolumler.length})
        </p>

        {gorsel && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={gorsel}
            alt=""
            style={{ maxWidth: "100%", borderRadius: 14, marginBottom: 14 }}
          />
        )}

        {bolum === "bosluk" && bosluk && (
          <>
            {bosluk.yonerge && <div className="bk-bosluk-yonerge">{bosluk.yonerge}</div>}
            <div className="bk-bosluk-cumleler">
              {bosluk.cumleler.map((c, i) => {
                const k = yerlesim[i] ?? -1;
                const durum = kontrol ? (boslukSonuc[i] ? "dogru" : "yanlis") : seciliBosluk === i ? "secili" : k >= 0 ? "dolu" : "bos";
                return (
                  <div key={c.id} className="bk-bosluk-cumle">
                    <span className="no">{i + 1}.</span>
                    {c.once && <span>{c.once}</span>}
                    <span className="kutu-grup">
                      <button
                        key={`${i}-${k}-${durum}`}
                        className="bk-bosluk-kutu"
                        data-durum={durum}
                        style={{ ["--sira" as string]: i }}
                        disabled={kontrol}
                        onClick={() => {
                          if (k >= 0) { setYerlesim((y) => y.map((x, j) => (j === i ? -1 : x))); setSeciliBosluk(-1); }
                          else setSeciliBosluk((x) => (x === i ? -1 : i));
                        }}
                        onDragOver={(e) => { if (!kontrol) e.preventDefault(); }}
                        onDrop={(e) => { e.preventDefault(); const w = Number(e.dataTransfer.getData("text/plain")); if (w >= 0) yerlestir(w, i); }}
                      >
                        {k >= 0 ? havuz[k] : ""}
                      </button>
                      {c.ek}
                    </span>
                    {c.sonra && <span>{c.sonra}</span>}
                    {kontrol && !boslukSonuc[i] && <div className="dogrusu">Doğrusu: {c.cevap}</div>}
                  </div>
                );
              })}
            </div>
            <div className="bk-bosluk-havuz">
              {havuz.map((w, k) => {
                const kullanildi = yerlesim.includes(k);
                return (
                  <button
                    key={`${w}-${k}`}
                    className="bk-bosluk-kelime"
                    data-kullanildi={kullanildi}
                    disabled={kontrol || kullanildi}
                    draggable={!kontrol && !kullanildi}
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", String(k))}
                    onClick={() => {
                      const hedef = seciliBosluk >= 0 && yerlesim[seciliBosluk] < 0 ? seciliBosluk : yerlesim.findIndex((x) => x < 0);
                      if (hedef >= 0) yerlestir(k, hedef);
                    }}
                  >
                    {w}
                  </button>
                );
              })}
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
            <textarea
              className="bk-alan bk-alan-cok"
              placeholder="Cevabını buraya yaz..."
              rows={4}
              value={yazilan}
              disabled={kontrol}
              onChange={(e) => setYazilan(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); if (kontrol) devamEt(); else kontrolEt(); } }}
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

      {bolum === "bosluk" ? (
        <AltSonucBandi
          gorunur={kontrol}
          dogru={dogruMu}
          baslik={dogruMu ? "Hepsi doğru!" : `${boslukSayisi} boşluktan ${boslukDogru} tanesi doğru`}
          aciklama={dogruMu ? null : "Doğru cevaplar boşlukların altında yazıyor."}
        />
      ) : ornekMi ? (
        <AltSonucBandi gorunur={kontrol} dogru ornek baslik="Örnek cevap"
          aciklama={acik[indeks]?.ornekCevap} not={acik[indeks]?.not} />
      ) : (
        <AltSonucBandi
          gorunur={kontrol}
          dogru={dogruMu}
          dogruCevap={bolum === "acikuclu" ? dogruCevapMetni(bolum, indeks, acik, test, dy) : null}
        />
      )}
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
  acik: AcikSorusu[], test: YaziliTestSorusu[], dy: DogruYanlisSorusu[]
): string {
  switch (bolum) {
    case "bosluk":    return "";
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

