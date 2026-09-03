"use client";

// Kayıt akışının ortak parçaları. Ölçüler ve renkler Android `RegisterScreens.kt`'ten:
//   seçili kutu  dış #4A538E / iç #2C335E     seçili değil  dış #2E3460 / iç #181D3A
//   köşe 12/10, 3px çerçeve, altta 12px dudak (drawRoundRect ofsetlerinin karşılığı)

import { AVATARLAR, SINIFLAR } from "../../lib/kayit";

/** Android RegLinearProgress: adım/toplam oranı, 500 ms yumuşak geçiş. */
export function AdimCubugu({ adim, toplam }: { adim: number; toplam: number }) {
  const oran = Math.min(Math.max(adim, 0), toplam) / toplam;
  return (
    <div className="bk-kayit-iz">
      <i style={{ width: `${oran * 100}%` }} />
    </div>
  );
}

export function KayitBasligi({
  adim,
  toplam,
  geri,
}: {
  adim: number;
  toplam: number;
  geri: () => void;
}) {
  return (
    <div className="bk-kayit-ust">
      <button type="button" className="bk-kayit-cikis" onClick={geri} aria-label="Geri">
        ✕
      </button>
      <AdimCubugu adim={adim} toplam={toplam} />
    </div>
  );
}

export function OnaySatiri({
  isaretli,
  degistir,
  metin,
  bagMetni,
  bagAdresi,
}: {
  isaretli: boolean;
  degistir: (v: boolean) => void;
  metin: string;
  bagMetni: string;
  bagAdresi: string;
}) {
  return (
    <label className="bk-onay">
      <input type="checkbox" checked={isaretli} onChange={(e) => degistir(e.target.checked)} />
      <span>
        {metin}
        <a href={bagAdresi} target="_blank" rel="noreferrer">
          {bagMetni}
        </a>
      </span>
    </label>
  );
}

export function SinifSecimi({
  secili,
  sec,
}: {
  secili: number;
  sec: (s: number) => void;
}) {
  return (
    <div className="bk-secim-izgara sinif">
      {SINIFLAR.map((s) => (
        <button
          key={s}
          type="button"
          className="bk-secim-kutu"
          data-secili={s === secili}
          onClick={() => sec(s)}
        >
          {s}. Sınıf
        </button>
      ))}
    </div>
  );
}

export function AvatarSecimi({
  secili,
  sec,
}: {
  secili: string;
  sec: (a: string) => void;
}) {
  return (
    <div className="bk-secim-izgara avatar">
      {AVATARLAR.map((a) => (
        <button
          key={a}
          type="button"
          className="bk-secim-kutu kare"
          data-secili={a === secili}
          onClick={() => sec(a)}
          aria-label={a}
        >
          {/* Projenin geri kalanı gibi düz <img>: avatarlar zaten public/ altında sabit boyutlu */}
          <img src={`/uygulama/avatar/${a}.png`} alt="" />
          {a === secili && <b className="bk-secim-tik">✓</b>}
        </button>
      ))}
    </div>
  );
}

/** Kayıt adımlarının ortak gövdesi: başlık + içerik + altta sabit "Devam Et". */
export function KayitAdimi({
  baslik,
  children,
  dugmeMetni = "Devam Et",
  dugmeAktif = true,
  dugmeyeBas,
  altinda,
}: {
  baslik?: string;
  children: React.ReactNode;
  dugmeMetni?: string;
  dugmeAktif?: boolean;
  dugmeyeBas: () => void;
  /** Ana düğmenin ALTINA gelen ek içerik (Android'de Google düğmesi orada duruyor). */
  altinda?: React.ReactNode;
}) {
  return (
    <>
      {baslik && <h2 className="bk-kayit-baslik">{baslik}</h2>}
      <div className="bk-kayit-govde">{children}</div>
      <button
        type="button"
        className="bk-dugme tam"
        disabled={!dugmeAktif}
        onClick={dugmeyeBas}
      >
        {dugmeMetni}
      </button>
      {altinda}
    </>
  );
}
