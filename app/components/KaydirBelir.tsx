"use client";

import { useEffect } from "react";

/* ————————————————————————————————————————————————————————————
   KAYDIRDIKÇA BELİRME

   Telefon kartları görüş alanına girince aşağıdan yükselerek beliriyor,
   aynı şeritteki kartlar sırayla.

   Gizleme JS TARAFINDAN AÇILIYOR (kök öğeye data-belir="acik"). Başlangıç
   durumunu CSS'e yazsaydık ve script çalışmasaydı (hata, eski tarayıcı,
   JS kapalı) telefonlar KALICI olarak görünmez kalırdı — sayfanın yarısı
   boş. Bu sırayla, en kötü ihtimalde animasyon olmaz, içerik durur.

   IntersectionObserver kullanılıyor, kaydırma olayı DEĞİL: tarayıcı kesişimi
   kendi hesaplıyor, her kaydırma karesinde JS çalıştırmıyoruz.
   ———————————————————————————————————————————————————————————— */

export default function KaydirBelir() {
  useEffect(() => {
    // Hareket hassasiyeti olan kullanıcıya dayatma yok: hiç başlatma.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const kartlar = Array.from(
      document.querySelectorAll<HTMLElement>(".phone-card")
    );
    if (!kartlar.length) return;

    /* KARTI DEĞİL ŞERİDİ gözlemliyoruz.
       Kartları tek tek gözlemlemek ölçüldü ve YETMEDİ: 14 karttan 5'i sayfa
       sonuna kadar kaydırıldığı hâlde görünmez kaldı. Sebebi, telefonda bu
       kartların yana kaydırmalı bir şeritte durması — sağdaki kartlar görüş
       alanına YATAYDA hiç girmiyor, IntersectionObserver iki ekseni birden
       bakar ve kesişme hiç olmuyor. Şeridi gözleyince şerit dikeyde göründüğü
       anda içindeki kartların hepsi sırayla beliriyor; kullanıcı yana
       kaydırdığında kart çoktan yerinde oluyor. */
    const seritler = new Map<HTMLElement, HTMLElement[]>();
    kartlar.forEach((el) => {
      const serit = (el.parentElement as HTMLElement) ?? el;
      const liste = seritler.get(serit) ?? [];
      liste.push(el);
      seritler.set(serit, liste);
    });

    /* Her karta iki sayı yazılıyor:
       --sira : şeritteki kaçıncı olduğu   → belirme gecikmesi
       --yay  : merkeze göre yeri (-1..+1) → yatay eğim ve paralaks katsayısı
       Üçlü bir şeritte -1 / 0 / +1 çıkıyor; ikili ya da dörtlüde de doğru
       çalışsın diye orana göre hesaplanıyor, sabit tablo değil. */
    seritler.forEach((liste) => {
      const son = Math.max(1, liste.length - 1);
      liste.forEach((el, i) => {
        el.style.setProperty("--sira", String(i));
        el.style.setProperty("--yay", (i / son) * 2 - 1 + "");
      });
    });

    document.documentElement.setAttribute("data-belir", "acik");

    const temizle: Array<() => void> = [];

    /* Genel amaçlı belirme: .belir sınıfı taşıyan her öğe görüş alanına
       girince .belirdi alıyor. Telefon kartları kendi (daha karmaşık, şerit
       bazlı) yolunu kullanmaya devam ediyor; bu, küçük parçalar gibi tekil
       öğeler için. --sira varsa gecikme ondan geliyor. */
    const basitler = Array.from(document.querySelectorAll<HTMLElement>(".belir"));
    if (basitler.length) {
      const basitGozlemci = new IntersectionObserver(
        (girisler) => {
          girisler.forEach((g) => {
            if (!g.isIntersecting) return;
            g.target.classList.add("belirdi");
            basitGozlemci.unobserve(g.target);
          });
        },
        { threshold: 0.2 }
      );
      basitler.forEach((el) => basitGozlemci.observe(el));
      temizle.push(() => basitGozlemci.disconnect());
    }

    const gozlemci = new IntersectionObserver(
      (girisler) => {
        girisler.forEach((g) => {
          if (!g.isIntersecting) return;
          seritler.get(g.target as HTMLElement)?.forEach((el) => el.classList.add("belirdi"));
          // Bir kez belirdi mi işi bitti — geri kaydırınca tekrar oynamasın.
          gozlemci.unobserve(g.target);
        });
      },
      // Şerit görüş alanına biraz girdiğinde başlasın; tam ortada
      // tetiklenirse animasyon geç kalıyor.
      { threshold: 0.06, rootMargin: "0px 0px -6% 0px" }
    );
    seritler.forEach((_liste, serit) => gozlemci.observe(serit));

    /* ——— KAYDIRMA PARALAKSI ———
       Şerit ekrandan geçerken kartlar farklı hızda süzülüyor: kenardakiler
       çok, ortadaki az. Aradaki fark derinlik hissi veriyor — kaldırılan
       yolun yaptığı işi hareket üstleniyor.

       Yazma işi telefonun İÇ kabına (.tel-sahne) yapılıyor, .phone-card'a
       DEĞİL: belirme animasyonu zaten .phone-card'ın transform'unu bir CSS
       geçişiyle sürüyor. İkisi aynı özelliği yazsaydı her karede geçiş
       yeniden başlar, titrerdi. Ayrı öğe = çakışma yok.

       Döngü yalnız görünen şerit varken dönüyor; sayfanın geri kalanında
       hiç kare harcanmıyor. */
    const gorunen = new Set<HTMLElement>();
    const hedefler = new Map<HTMLElement, { ic: HTMLElement; kat: number }[]>();
    seritler.forEach((liste, serit) => {
      hedefler.set(
        serit,
        liste
          .map((el) => {
            const ic = el.querySelector<HTMLElement>(".tel-sahne");
            const yay = parseFloat(el.style.getPropertyValue("--yay") || "0");
            // Kenar kart tam hızda, orta kart yarı hızda.
            return ic ? { ic, kat: 0.45 + Math.abs(yay) * 0.55 } : null;
          })
          .filter(Boolean) as { ic: HTMLElement; kat: number }[]
      );
    });

    let raf = 0;
    const kare = () => {
      raf = gorunen.size ? requestAnimationFrame(kare) : 0;
      const ekran = window.innerHeight;
      gorunen.forEach((serit) => {
        const k = serit.getBoundingClientRect();
        // -1 (şerit ekranın altında) .. +1 (üstünde)
        const oran = Math.max(-1, Math.min(1, (ekran / 2 - (k.top + k.height / 2)) / (ekran / 2 + k.height / 2)));
        hedefler.get(serit)?.forEach(({ ic, kat }) => {
          ic.style.transform = `translate3d(0, ${(oran * 22 * kat).toFixed(1)}px, 0)`;
        });
      });
    };

    /* Videolar da aynı görünürlük sinyaline bağlı: şerit ekrandayken oynar,
       çıkınca durur. Ayrı bir gözlemci ya da kaydırma dinleyicisi yok.
       Görünmeyen bölümün videosu hiç oynamaz — preload="none" ile birlikte
       sayfayı açan kişi hiç bakmadığı bölümün baytını da indirmez.
       play() bir söz döndürür ve REDDEDİLEBİLİR (iPhone'da Düşük Güç Modu
       otomatik oynatmayı tamamen engeller). Yakalanmazsa konsola yakalanmamış
       hata düşer; yakalıyoruz ve poster görünmeye devam ediyor. */
    const videolar = (serit: HTMLElement) =>
      Array.from(serit.querySelectorAll<HTMLVideoElement>("video.tel-video"));

    const gorunurluk = new IntersectionObserver(
      (girisler) => {
        girisler.forEach((g) => {
          const el = g.target as HTMLElement;
          if (g.isIntersecting) {
            gorunen.add(el);
            videolar(el).forEach((v) => {
              void v.play().catch(() => {});
            });
          } else {
            gorunen.delete(el);
            videolar(el).forEach((v) => v.pause());
          }
        });
        if (gorunen.size && !raf) raf = requestAnimationFrame(kare);
      },
      { rootMargin: "20% 0px 20% 0px" }
    );
    seritler.forEach((_liste, serit) => gorunurluk.observe(serit));
    return () => {
      gozlemci.disconnect();
      gorunurluk.disconnect();
      cancelAnimationFrame(raf);
      temizle.forEach((f) => f());
    };
  }, []);

  return null;
}
