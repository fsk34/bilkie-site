// Apple ile Giriş (8 Eki 2026) — iOS'ta App Store 4.8 şartı; üç platformda aynı Firebase sağlayıcısı (apple.com),
// iPhone'da Apple ile kaydolan webde de aynı hesaba girer. Yeni kullanıcı Google ile aynı kurulumdan geçer
// (/kayit/google). Apple adı/e-postayı YALNIZ ilk girişte verir; "E-postamı gizle" → …@privaterelay.appleid.com.
// Hesap silmede Apple izni iptal edilir (Apple şartı): yeniden doğrulamadan gelen erişim jetonuyla.

import { OAuthProvider, type User } from "firebase/auth";

export const APPLE = "apple.com";

export function appleSaglayici(): OAuthProvider {
  const p = new OAuthProvider(APPLE);
  p.addScope("email");
  p.addScope("name");
  p.setCustomParameters({ locale: "tr_TR" });
  return p;
}

/** Google ya da Apple ile giren hesabın parolası yok. */
export function sosyalMi(user: User | null | undefined): boolean {
  return !!user?.providerData.some((p) => p.providerId === "google.com" || p.providerId === APPLE);
}

export function appleMi(user: User | null | undefined): boolean {
  return !!user?.providerData.some((p) => p.providerId === APPLE);
}

/** Gizli e-posta: @ öncesi rastgele harfler — ad olarak kullanılmaz. */
export function gizliEpostaMi(eposta: string): boolean {
  return eposta.toLowerCase().endsWith("@privaterelay.appleid.com");
}
