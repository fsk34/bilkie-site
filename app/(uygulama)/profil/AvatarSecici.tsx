"use client";

// Avatar seçici kip — Profil ve Hesap ekranlarının ORTAK parçası.
//
// Android'de olduğu gibi seçiciye dokunulduğu AN kaydedilir, ayrı Kaydet yok.
// 21 Eyl'e kadar yalnız Hesap ekranındaydı; profildeki avatarı değiştirmek için
// Hesap'a gitmek gerekiyordu. Şimdi profil kartındaki kalemden de açılıyor; mantık
// tek yerde dursun diye buraya çıkarıldı.

import { useState } from "react";
import { useOturum } from "../../lib/oturum";
import { avatarDegistir } from "../../lib/profilYaz";
import { AvatarSecimi } from "../kayit/parcalar";

export type AvatarSonucu = { tamam: boolean; mesaj: string };

export default function AvatarSecici({
  acik,
  kapat,
  onSonuc,
}: {
  acik: boolean;
  kapat: () => void;
  /** Kaydetme bitince: üst ekran kendi bilgi/hata satırında gösterir. */
  onSonuc?: (s: AvatarSonucu) => void;
}) {
  const { kullanici, profil, profiliYenile } = useOturum();
  const kayitli = profil?.avatar || "profil0";
  // Dokunulan avatar hemen seçili görünsün; yazma başarısızsa kayıtlıya döner.
  const [secili, setSecili] = useState<string | null>(null);
  const [kaydediyor, setKaydediyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  if (!acik) return null;

  async function sec(yeni: string) {
    if (!kullanici || kaydediyor || yeni === kayitli) return;
    setSecili(yeni);
    setKaydediyor(true);
    setHata(null);
    try {
      // ⚠️ Lig satırına KAYITLI kullanıcı adı yazılır (Hesap'ta kutuya yazılmış ama
      // kaydedilmemiş ad değil) — sahiplenilmemiş ad liglerde görünmesin.
      await avatarDegistir(kullanici.uid, yeni, profil?.kullaniciAdi || "Kullanıcı");
      await profiliYenile();
      setSecili(null);
      kapat();
      onSonuc?.({ tamam: true, mesaj: "Avatarın güncellendi." });
    } catch {
      setSecili(null);
      const mesaj = "Avatar kaydedilemedi. Bağlantını kontrol edip tekrar dene.";
      setHata(mesaj);
      onSonuc?.({ tamam: false, mesaj });
    } finally {
      setKaydediyor(false);
    }
  }

  return (
    <div className="bk-ortu" onClick={() => !kaydediyor && kapat()}>
      <div className="bk-kart bk-soru-kutu" onClick={(e) => e.stopPropagation()}>
        <h3>Avatarını Seç</h3>
        <div style={{ opacity: kaydediyor ? 0.6 : 1, marginTop: 12 }}>
          <AvatarSecimi secili={secili ?? kayitli} sec={sec} />
        </div>
        {hata && <p className="bk-hata" style={{ marginTop: 12 }}>{hata}</p>}
        <button
          className="bk-dugme acik tam"
          style={{ marginTop: 14 }}
          disabled={kaydediyor}
          onClick={kapat}
        >
          {kaydediyor ? "Kaydediliyor…" : "Kapat"}
        </button>
      </div>
    </div>
  );
}
