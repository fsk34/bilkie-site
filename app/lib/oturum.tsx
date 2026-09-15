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
import { sessizHata } from "./hata";
import { onbellegiBosalt } from "./onbellek";
import { profilOku, type Profil } from "./veri";

/* Profil önbelleği (localStorage, uid başına). Kapı Auth cevabıyla açılır; profil için
   veritabanı BEKLENMEZ — eskiden bekleniyordu ve RTDB'ye ulaşamayan bir ağda (kurum
   filtresi, engellenen WebSocket/reCAPTCHA) iskelet sonsuza kadar kalıyordu (15 Eyl, PC).
   Tekrar gelen kullanıcı önbellekten anında açılır; ilk gelen en çok PROFIL_BEKLEME kadar
   bekler; DB sonradan cevap verirse profil yine güncellenir. */
const PROFIL_ANAHTAR = "bk-profil";
const PROFIL_BEKLEME = 6000;

function onbellektenProfil(uid: string): Profil | null {
  try {
    const ham = localStorage.getItem(`${PROFIL_ANAHTAR}:${uid}`);
    return ham ? (JSON.parse(ham) as Profil) : null;
  } catch { return null; }
}
function onbellegeProfil(uid: string, p: Profil | null) {
  try {
    if (p) localStorage.setItem(`${PROFIL_ANAHTAR}:${uid}`, JSON.stringify(p));
    else localStorage.removeItem(`${PROFIL_ANAHTAR}:${uid}`);
  } catch { /* depolama kapalı */ }
}

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
      const p = await profilOku(u.uid);
      setProfil(p);
      onbellegeProfil(u.uid, p);
    } catch {
      setProfil(null);
    }
  }, []);

  useEffect(() => {
    // Oturum değişince önceki kullanıcının gecikmiş DB cevabı uygulanmasın
    let nesil = 0;
    return onAuthStateChanged(auth, (u) => {
      const bu = ++nesil;
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
      if (!u) { setProfil(null); setYukleniyor(false); return; }

      const onbellek = onbellektenProfil(u.uid);
      setProfil(onbellek);
      if (onbellek) setYukleniyor(false);

      // DB okuması: gelince uygulanır (önbellek varsa bile tazelenir). Kapı ise en çok
      // PROFIL_BEKLEME kadar bekler — ağ cevap vermiyorsa iskelette asılı kalınmaz.
      const okuma = profilOku(u.uid).then(
        (p) => { if (bu === nesil) { setProfil(p); onbellegeProfil(u.uid, p); } return true; },
        (e) => { sessizHata("profilOku", e); return false; }
      );
      if (!onbellek) {
        const zaman = new Promise<false>((r) => setTimeout(() => r(false), PROFIL_BEKLEME));
        Promise.race([okuma, zaman]).then((geldi) => {
          if (bu !== nesil) return;
          if (!geldi) sessizHata("profilOku", new Error(`${PROFIL_BEKLEME} ms içinde cevap yok, kapı profilsiz açıldı`));
          setYukleniyor(false);
        });
      }
    });
  }, []);

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
        if (kullanici) onbellegeProfil(kullanici.uid, null);
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
