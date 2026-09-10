"use client";

// Web uygulamasının oturum katmanı: Firebase Auth durumu + profil (sınıf, avatar).
// Mobil uygulamayla aynı hesap; burada YENİ hesap açılmıyor, mevcut hesapla giriliyor.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "./firebase";
import { hatirlananlariUnut } from "./canli";
import { onbellegiBosalt } from "./onbellek";
import { profilOku, type Profil } from "./veri";

type OturumDurumu = {
  yukleniyor: boolean;
  kullanici: User | null;
  profil: Profil | null;
  sinif: number;
  profiliYenile: () => Promise<void>;
  cikisYap: () => Promise<void>;
};

const Baglam = createContext<OturumDurumu | null>(null);

export function OturumSaglayici({ children }: { children: React.ReactNode }) {
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kullanici, setKullanici] = useState<User | null>(null);
  const [profil, setProfil] = useState<Profil | null>(null);

  const profiliYukle = useCallback(async (u: User | null) => {
    if (!u) {
      setProfil(null);
      return;
    }
    try {
      setProfil(await profilOku(u.uid));
    } catch {
      setProfil(null);
    }
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      // Bayrak SADECE "bu tarayıcıda oturum açılmıştı" bilgisidir; kimlik taşımaz.
      // Kökteki tanıtımın giriş yapmış kullanıcıya bir an görünmesini engelliyor
      // (bkz. app/layout.tsx'teki boyama öncesi betik ve KokKapi.tsx).
      try {
        if (u) localStorage.setItem("bk-oturum", "1");
        else localStorage.removeItem("bk-oturum");
      } catch {
        // Gizli sekmede/depolama kapalıysa bayrak yok: tanıtım kısa bir an görünür,
        // kırılan bir şey olmaz.
      }
      setKullanici(u);
      await profiliYukle(u);
      setYukleniyor(false);
    });
  }, [profiliYukle]);

  const deger = useMemo<OturumDurumu>(
    () => ({
      yukleniyor,
      kullanici,
      profil,
      sinif: profil?.sinif ?? 3,
      profiliYenile: () => profiliYukle(kullanici),
      cikisYap: async () => {
        // Başka kullanıcı aynı tarayıcıda eski sayaç/ilerleme değerlerini görmesin
        hatirlananlariUnut();
        onbellegiBosalt();
        await signOut(auth);
      },
    }),
    [yukleniyor, kullanici, profil, profiliYukle]
  );

  return <Baglam.Provider value={deger}>{children}</Baglam.Provider>;
}

export function useOturum(): OturumDurumu {
  const v = useContext(Baglam);
  if (!v) throw new Error("useOturum, OturumSaglayici içinde kullanılmalı");
  return v;
}
