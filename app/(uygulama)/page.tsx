// Sitenin kökü. SUNUCU bileşeni: tanıtım metni HTML'e burada giriyor.
// Hangisinin görüneceğine KokKapi (oturum) karar verir.

import AnaEkran from "./AnaEkran";
import KokKapi from "./KokKapi";
import Tanitim from "./Tanitim";

export default function Kok() {
  return (
    <KokKapi tanitim={<Tanitim />}>
      <AnaEkran />
    </KokKapi>
  );
}
