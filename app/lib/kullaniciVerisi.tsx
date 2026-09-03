"use client";

// YEREL ÖNCE (local-first) kullanıcı verisi.
//
// Kural: kullanıcının KENDİ verisi cihazda durur. Ekran açıldığında değer zaten
// elimizdedir; ağ arkada eşitler. Böylece hiçbir ekran "önce boş, sonra dolu"
// görünmez — Duolingo'nun yaptığı da budur.
//
// Üç durum vardır ve kancalar bunu TEK bir dönüş değeriyle anlatır:
//   • `null`  → HENÜZ BİLİNMİYOR. Yalnızca iki halde olur: kimlik çözülüyor, ya da
//               kullanıcı bu cihazda ilk kez açıyor ve ilk cevap gelmedi.
//               Ekran bu durumda içeriği ÇİZMEZ.
//   • boş değer ({} / []) → biliniyor, veri yok. Misafirde de bu döner.
//   • dolu değer → biliniyor.
//
// Yani `null` tek anlamlıdır: "çizme". Ekranlarda üç ayrı bayrak kontrolü yoktur.

import { useMemo } from "react";
import type { Database } from "firebase/database";
import { useCanli, useCanliCoklu } from "./canli";
import { useOturum } from "./oturum";

/** Kullanıcının kendi verisi HER ZAMAN hatırlanır (yerel önce kuralının tek uygulandığı yer). */
const KULLANICI_VERISI = { hatirla: true } as const;

export type KullaniciDurumu = {
  /** Kimlik çözüldü mü — çözülmeden hiçbir kullanıcı verisi "biliniyor" sayılmaz. */
  hazir: boolean;
  uid: string | null;
  sinif: number;
};

export function useKullanici(): KullaniciDurumu {
  const { kullanici, sinif, yukleniyor } = useOturum();
  return useMemo(
    () => ({ hazir: !yukleniyor, uid: kullanici?.uid ?? null, sinif }),
    [yukleniyor, kullanici, sinif]
  );
}

/**
 * Kullanıcının kendi tek düğümü.
 * `bosDeger`, kullanıcı yokken (misafir) ve düğüm boşken dönen değerdir.
 */
export function useKullaniciDugumu<T>(
  db: Database,
  yolUret: (uid: string) => string,
  coz: (ham: unknown) => T,
  bosDeger: T
): T | null {
  const { hazir, uid } = useKullanici();
  const yol = hazir && uid ? yolUret(uid) : null;
  const { veri, yuklendi } = useCanli<unknown>(db, yol, KULLANICI_VERISI);

  return useMemo(() => {
    if (!hazir) return null;        // kimlik çözülmedi → bilinmiyor
    if (!uid) return bosDeger;      // misafir → biliniyor, veri yok
    if (!yuklendi) return null;     // bu cihazda ilk açılış, ilk cevap gelmedi
    return coz(veri);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hazir, uid, veri, yuklendi]);
}

/** Kullanıcının kendi birkaç düğümü birlikte (ör. üst bilgi 4 düğüm okur). */
export function useKullaniciDugumleri<T>(
  db: Database,
  yollarUret: (uid: string) => string[],
  coz: (veriler: unknown[]) => T,
  bosDeger: T,
  yolSayisi: number
): T | null {
  const { hazir, uid } = useKullanici();
  const yollar = useMemo(
    () => (hazir && uid ? yollarUret(uid) : Array<string | null>(yolSayisi).fill(null)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hazir, uid, yolSayisi]
  );
  const { veriler, yuklendi } = useCanliCoklu(db, yollar, KULLANICI_VERISI);

  return useMemo(() => {
    if (!hazir) return null;
    if (!uid) return bosDeger;
    if (!yuklendi) return null;
    return coz(veriler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hazir, uid, veriler, yuklendi]);
}
