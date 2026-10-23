"use client";

// Seri ekranı — mobil uygulamadaki StreakScreen'in web karşılığı.
// Aynı veri: users/{uid}/streak (count, lastDay, days/{yyyy-MM}/{gün} = aktivite maskesi).
// Aynı görsel dil: kitap yığınlı gün hücreleri, ardışık günlerin arkasında turuncu seri şeridi.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Kabuk from "../Kabuk";
import { useOturum } from "../../lib/oturum";
import { ACT_DEFTER, ACT_TEST, ACT_YAZILI } from "../../lib/veri";
import { gunAnahtari, seriyiCoz } from "../../lib/tarih";
import { useSeriDugumu } from "../../lib/canliVeri";
import Rive, { SeriGosterilen, seriGirdileri, seriGunResim } from "../Rive";

const AYLAR = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran",
               "Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const HAFTA = ["Pt","Sa","Ça","Pe","Cu","Ct","Pa"];

const RENK_SERI   = "#CB8000";

/** Bir ayın gün → maske tablosu (gün anahtarı sıfırsız "6"). */
function ayMaskeleri(seri: Record<string, unknown> | null, ay: string): Record<number, number> {
  const d = ((seri?.days ?? {}) as Record<string, Record<string, unknown>>)[ay] ?? {};
  const out: Record<number, number> = {};
  for (const [k, v] of Object.entries(d)) {
    const g = Number.parseInt(k, 10);
    if (g >= 1 && g <= 31) out[g] = Math.max(0, Math.trunc(Number(v) || 0));
  }
  return out;
}

export default function SeriSayfasi() {
  return (
    <Kabuk>
      <SeriIcerik />
    </Kabuk>
  );
}

function SeriIcerik() {
  const { kullanici } = useOturum();
  const router = useRouter();
  const [kaydirma, setKaydirma] = useState(0);   // 0 = bu ay, -1 = önceki ay…

  const bugun = gunAnahtari();
  const [buYil, buAy] = [Number(bugun.slice(0, 4)), Number(bugun.slice(5, 7))];
  const bugunGun = Number(bugun.slice(8, 10));
  const buAyAnahtari = bugun.slice(0, 7);

  // Gösterilen ay (Istanbul takvimine göre kaydırılmış)
  const { yil, ay } = useMemo(() => {
    const t = new Date(Date.UTC(buYil, buAy - 1 + kaydirma, 1, 12));
    return { yil: t.getUTCFullYear(), ay: t.getUTCMonth() + 1 };
  }, [buYil, buAy, kaydirma]);

  const ayAnahtari = `${yil}-${String(ay).padStart(2, "0")}`;
  // Seri düğümü CANLI (+ kutuda bekleyen olaylar) — ilk karede son bilinen değer (useCanli hatırlar),
  // bant/takvim flaş yapmaz; gezilen ay aynı düğümden.
  const seri = useSeriDugumu();
  const sayi = seri ? Math.max(0, seriyiCoz(Math.trunc(Number(seri.count) || 0), (seri.lastDay as string | undefined) ?? null)) : null;
  const gunler = useMemo(() => ayMaskeleri(seri, ayAnahtari), [seri, ayAnahtari]);
  const bugunMaskesi = useMemo(() => ayMaskeleri(seri, buAyAnahtari)[bugunGun] ?? 0, [seri, buAyAnahtari, bugunGun]);

  const bugunAktif = bugunMaskesi !== 0;
  const satirlar = useMemo(() => aylikIzgara(yil, ay), [yil, ay]);

  // Başlık kitapları (Android 23 Eki): ekran açılırken bugün gösterilmiş bölümler sabit kalır, yeni = maske − bu.
  // Veri gelince bugünün maskesi "gösterildi" diye yazılır.
  // Oturum ilk karede henüz yüklenmemiş olabilir: kayıt hesap belli olunca BİR KEZ okunur (Android remember(uid)).
  // Okunmadan maske de 0 verilir — yoksa kitaplar "yeni değil" diye yerinde belirir, sonra düşme kaçar.
  const uid = kullanici?.uid ?? "";
  const [gosterilenKayit, setGosterilenKayit] = useState<{ uid: string; maske: number } | null>(null);
  const gosterilen = gosterilenKayit && gosterilenKayit.uid === uid ? gosterilenKayit.maske : null;
  useEffect(() => {
    if (uid && gosterilenKayit?.uid !== uid) setGosterilenKayit({ uid, maske: SeriGosterilen.oku(uid, bugun) });
  }, [uid, bugun, gosterilenKayit]);
  useEffect(() => {
    if (uid && seri && gosterilen !== null) SeriGosterilen.yaz(uid, bugun, bugunMaskesi);
  }, [uid, seri, bugun, bugunMaskesi, gosterilen]);
  // Bugün yeni bir kitap bu ekranda ilk kez gösteriliyorsa → kitap oturduktan sonra tam ekran konfeti (bir kez, ~5 sn)
  const konfetiHak = !!seri && gosterilen !== null && (bugunMaskesi & (ACT_TEST | ACT_DEFTER | ACT_YAZILI) & ~gosterilen) !== 0;
  const [konfeti, setKonfeti] = useState(false);
  useEffect(() => {
    if (!konfetiHak) return;
    const t1 = setTimeout(() => setKonfeti(true), 900);
    const t2 = setTimeout(() => setKonfeti(false), 900 + 5200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [konfetiHak]);

  if (!kullanici) {
    return (
      <>
        <h1 style={{ fontSize: 24, marginBottom: 10 }}>Seri</h1>
        <div className="bk-kart">
          <p className="bk-soluk" style={{ fontSize: 14, marginBottom: 14 }}>
            Serini görmek için giriş yapman gerekiyor.
          </p>
          <Link className="bk-dugme" href="/giris">Giriş yap</Link>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Android üst bandı: geri + "Seri" üstte, halka + sayı dikey ortada */}
      <div className="bk-seri-bant" style={{ background: bugunAktif ? RENK_SERI : "#2C335E" }}>
        {/* Doğrudan / yeni sekmede açıldıysa geri gidecek sayfa yok → ana ekrana */}
        <button className="geri" aria-label="Geri"
                onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/uygulama/cikis.png" alt="" />
        </button>
        <span className="baslik">Seri</span>
        {/* Seri kitap yığını: bugünün kitapları yerinde; bu ekranda henüz gösterilmemiş bölümler düşüp oturur */}
        <Rive dosya="seri_kitap_baslik" durumMakinesi="Seri"
              girdiler={gosterilen === null || !seri ? seriGirdileri(0, 0) : seriGirdileri(bugunMaskesi, bugunMaskesi & ~gosterilen)}
              className="kitaplar" style={{ width: 150, height: 138 }} />
        <div className="sayi-grup">
          <div className="sayi">{sayi == null ? "—" : sayi}</div>
          <div className="etiket">günlük seri!</div>
        </div>
      </div>

      <div className="bk-seri-kart bk-seri-takvim">
        <div className="bk-takvim-ust">
          <button className="bk-ay-dugme" onClick={() => setKaydirma((k) => k - 1)} aria-label="Önceki ay">&lt;</button>
          <h3>{AYLAR[ay - 1]} {yil}</h3>
          <button className="bk-ay-dugme" onClick={() => setKaydirma((k) => k + 1)} aria-label="Sonraki ay">&gt;</button>
        </div>

        <div className="bk-hafta">
          {HAFTA.map((g) => <div key={g}>{g}</div>)}
        </div>

        <div className="bk-satirlar">
          {satirlar.map((satir, i) => (
            <div className="bk-hafta-satir" key={i}>
              {/* Ardışık aktif günlerin arkasındaki turuncu çizgi — Android: 20 kalın, yuvarlak uç,
                  rakam merkezinden (üstten 13,5) ilk günün merkezinden son günün merkezine; tek gün ±12 */}
              {seritler(satir, gunler).map((s, j) => {
                const n = s.son - s.bas;
                const ek = n === 0 ? 12 : 0;
                return (
                  <span
                    key={j}
                    className="bk-seri-serit"
                    style={{
                      left: `calc((100% - 84px) / 7 * ${s.bas + 0.5} + ${s.bas * 14 - 10 - ek}px)`,
                      width: `calc((100% - 84px) / 7 * ${n} + ${n * 14 + 20 + ek * 2}px)`,
                    }}
                  />
                );
              })}
              <div className="bk-gunler">
                {satir.map((gun, k) =>
                  gun == null ? (
                    <div className="bk-gun bos" key={k} />
                  ) : (
                    <div className="bk-gun" key={k}>
                      <span className="no">{gun}</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="kitap" src={seriGunResim(gunler[gun] ?? 0)} alt=""
                           style={{ opacity: (gunler[gun] ?? 0) === 0 ? 0.45 : 1 }} />
                    </div>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bk-seri-kart bk-aciklama">
        <p>
          Her gün Test Çözdüğünde, Konu Defteri okuduğunda ya da Yazılıya Hazırlık
          yaptığında seri artar.
        </p>
        <div className="bk-etiketler">
          <Etiket ad="Konu Defteri" kitap="defter" />
          <Etiket ad="Konu Testi" kitap="test" />
          <Etiket ad="Yazılı Çözümü" kitap="yazili" />
        </div>
      </div>

      {konfeti && (
        <div className="bk-konfeti-katman" aria-hidden>
          <Rive dosya="seri_konfeti" durumMakinesi="Konfeti" sigdir="cover" style={{ width: "100%", height: "100%" }} />
        </div>
      )}
    </>
  );
}

/* --------------------------------------------------------------- yardımcı */

/** Android StreakLegendItem: yazı üstte, altında seri kitap yığınındaki kitabın tek başına hâli (23 Eki). */
function Etiket({ ad, kitap }: { ad: string; kitap: string }) {
  return (
    <span className="bk-etiket">
      {ad}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/uygulama/seri-kitap/seri_kitap_${kitap}.png`} alt="" style={{ height: 22 }} />
    </span>
  );
}

/** Ayı haftalara böler; hafta Pazartesi başlar, boş hücreler null. */
function aylikIzgara(yil: number, ay: number): (number | null)[][] {
  const ilk = new Date(Date.UTC(yil, ay - 1, 1, 12));
  const gunSayisi = new Date(Date.UTC(yil, ay, 0, 12)).getUTCDate();
  const bosluk = (ilk.getUTCDay() + 6) % 7;   // Pazartesi = 0

  const hucreler: (number | null)[] = Array(bosluk).fill(null);
  for (let g = 1; g <= gunSayisi; g++) hucreler.push(g);
  while (hucreler.length % 7 !== 0) hucreler.push(null);

  const satirlar: (number | null)[][] = [];
  for (let i = 0; i < hucreler.length; i += 7) satirlar.push(hucreler.slice(i, i + 7));
  while (satirlar.length && satirlar[satirlar.length - 1].every((h) => h == null)) satirlar.pop();
  return satirlar;
}

/** Bir satırdaki ardışık aktif gün aralıkları (sütun indeksleriyle). */
function seritler(satir: (number | null)[], gunler: Record<number, number>) {
  const out: { bas: number; son: number }[] = [];
  let bas: number | null = null;
  satir.forEach((gun, i) => {
    const aktif = gun != null && (gunler[gun] ?? 0) !== 0;
    if (aktif && bas == null) bas = i;
    if (!aktif && bas != null) { out.push({ bas, son: i - 1 }); bas = null; }
  });
  if (bas != null) out.push({ bas, son: satir.length - 1 });
  return out;
}
