"use client";

// Uygulama kabuğu: sol gezinme + içerik + sağ ray.
// Sağ ray düzeni: üstte sayaçlar (seri / puan / can), altında lig ve günlük görev kartları.
// Giriş ZORUNLU: /uygulama altına misafir giremiyor, kapı `Kapi.tsx`te.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useOturum } from "../lib/oturum";
import { useGunlukGorevler, useUstBilgi } from "../lib/canliVeri";
import { ligBul, type Gorev, type UstBilgi } from "../lib/veri";

const MENU = [
  { yol: "/", ad: "Öğren", ikon: "🏠" },
  { yol: "/ligler", ad: "Ligler", ikon: "🏆" },
  { yol: "/gorevler", ad: "Görevler", ikon: "📋" },
  { yol: "/istatistik", ad: "İstatistik", ikon: "📊" },
  { yol: "/oyunlar", ad: "Oyunlar", ikon: "🎮" },
  { yol: "/profil", ad: "Profil", ikon: "🐱" },
  { yol: "/ayarlar", ad: "Daha Fazla", ikon: "⋯" },
];

export default function Kabuk({ children }: { children: React.ReactNode }) {
  const { yukleniyor, kullanici, profil, sinif, cikisYap } = useOturum();
  const yol = usePathname();
  const router = useRouter();

  // "Profil yoksa hesap da yok" (Android: yarım kayıt kuralı). Girişli ama profilsiz
  // kullanıcı 3. sınıf gibi görünüp boş ekranlarda dolaşmasın; kurulumu tamamlasın.
  useEffect(() => {
    if (!yukleniyor && kullanici && !profil) router.replace("/kayit/google");
  }, [yukleniyor, kullanici, profil, router]);

  // Sayaçlar ve görevler CANLI dinleniyor: gezinince yeniden okunmuyor, XP/seri
  // değişince (web'de ya da telefonda) kendiliğinden güncelleniyor.
  const ust = useUstBilgi(sinif);
  const gorevler = useGunlukGorevler();

  const aktifMi = (m: string) => (m === "/" ? yol === m : yol.startsWith(m));

  return (
    <div className="bk">
      <div className="bk-mobil-ust">
        <Link href="/" className="bk-logo" style={{ fontSize: 24, padding: 0 }}>
          bilkie
        </Link>
        <Sayaclar ust={ust} kisa />
      </div>

      <div className="bk-kabuk">
        <aside className="bk-kenar">
          <Link href="/" className="bk-logo">bilkie</Link>
          {MENU.map((m) => (
            <Link key={m.yol} href={m.yol} className="bk-nav" data-aktif={aktifMi(m.yol)}>
              <span className="bk-nav-ikon">{m.ikon}</span>
              {m.ad}
            </Link>
          ))}
          <div style={{ flex: 1 }} />
          {/* Misafir yok: /'ya yalnızca girişli kullanıcı gelebiliyor (bkz. Kapi.tsx) */}
          <button className="bk-nav" onClick={() => cikisYap()}>
            <span className="bk-nav-ikon">↩︎</span> Çıkış yap
          </button>
        </aside>

        <div className="bk-govde">
          <main className="bk-icerik">{children}</main>

          <aside className="bk-ray">
            <Sayaclar ust={ust} />

            {/* Zaten o bölümdeysek sağ rayda tekrar gösterme */}
            {!yol.startsWith("/ligler") && <LigKarti xp={ust?.xp ?? null} />}
            {!yol.startsWith("/gorevler") && <GorevKarti gorevler={gorevler} />}
          </aside>
        </div>
      </div>

      <nav className="bk-mobil-alt">
        {MENU.map((m) => (
          <Link key={m.yol} href={m.yol} data-aktif={aktifMi(m.yol)}>
            <span>{m.ikon}</span>
            {m.ad}
          </Link>
        ))}
      </nav>
    </div>
  );
}

/* ---------------------------------------------------------------- sayaçlar */

function Sayaclar({ ust, kisa = false }: { ust: UstBilgi | null; kisa?: boolean }) {
  const deger = (v?: number) => (ust ? String(v ?? 0) : "–");
  const sonuk = !ust;

  const satir = (
    <>
      <Link href="/seri" className={`bk-sayac seri ${sonuk ? "sonuk" : ""}`} title="Seri">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/uygulama/seriicon.svg" alt="" />
        <b>{deger(ust?.seri)}</b>
      </Link>
      <Link href="/ligler" className={`bk-sayac puan ${sonuk ? "sonuk" : ""}`} title="Toplam XP">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/uygulama/puanicon.svg" alt="" />
        <b>{deger(ust?.xp)}</b>
      </Link>
      <span className={`bk-sayac can ${sonuk ? "sonuk" : ""}`} title="Can">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/uygulama/hakicon.svg" alt="" />
        <b>{deger(ust?.can)}</b>
      </span>
    </>
  );

  if (kisa) return <div style={{ display: "flex", gap: 16 }}>{satir}</div>;
  return <div className="bk-sayaclar">{satir}</div>;
}

/* --------------------------------------------------------------- lig kartı */

function LigKarti({ xp }: { xp: number | null }) {
  const lig = ligBul(xp ?? 0);
  const kalan = lig.max != null && xp != null ? Math.max(0, lig.max + 1 - xp) : null;

  return (
    <div className="bk-kart">
      <div className="bk-kart-ust">
        <h3>{lig.ad} Ligi</h3>
        <Link href="/ligler">LİGİ GÖSTER</Link>
      </div>
      <div className="bk-kart-govde bk-lig-govde">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/uygulama/lig.svg" alt="" />
        <p>
          {xp == null
            ? "Sıralamanı görmek için biraz test çöz."
            : kalan != null
              ? `Bir üst lige geçmek için ${kalan} XP kaldı. Test çözdükçe puanın lige işleniyor.`
              : "En üst ligdesin. Puanın lige işlenmeye devam ediyor."}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ görev kartı */

function GorevKarti({ gorevler }: { gorevler: Gorev[] | null }) {
  return (
    <div className="bk-kart">
      <div className="bk-kart-ust">
        <h3>Günlük Görevler</h3>
        <Link href="/gorevler">TÜMÜNÜ GÖSTER</Link>
      </div>

      <div className="bk-kart-govde">
      {gorevler == null && <p className="bk-soluk" style={{ fontSize: 13 }}>Görevler yükleniyor…</p>}
      {gorevler != null && gorevler.length === 0 && (
        <p className="bk-soluk" style={{ fontSize: 13 }}>Bugün için görev bulunmuyor.</p>
      )}

      {gorevler?.slice(0, 3).map((g) => {
        const oran = Math.min(100, (g.ilerleme / Math.max(1, g.hedef)) * 100);
        return (
          <div className="bk-gorev" key={g.id}>
            <div className="bk-gorev-govde">
              <div className="bk-gorev-ad">{g.baslik}</div>
              <div className="bk-cubuk"><i style={{ width: `${oran}%` }} /></div>
              <div className="bk-gorev-sayi">{g.ilerleme} / {g.hedef}</div>
            </div>
            {g.xp > 0 && <span className="bk-gorev-xp">+{g.xp}</span>}
          </div>
        );
      })}
      </div>
    </div>
  );
}
