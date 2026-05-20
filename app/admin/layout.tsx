"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../lib/firebase";

const ADMIN_EMAIL = "fatihkurul@bilkie.com";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  if (user === undefined) {
    return (
      <main style={{ minHeight: "100vh", background: "#0C1A3F", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#8FB3D9", fontSize: 18 }}>Yükleniyor...</p>
      </main>
    );
  }

  if (!user && pathname !== "/admin/login") {
    router.replace("/admin/login");
    return null;
  }

  if (user && user.email !== ADMIN_EMAIL && pathname !== "/admin/login") {
    return (
      <main style={{ minHeight: "100vh", background: "#0C1A3F", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "#2C335E", border: "1px solid #4A538E", borderRadius: 24, padding: 32, textAlign: "center", color: "#EAF2FF" }}>
          <p style={{ marginBottom: 16 }}>Bu panele erişim yetkiniz yok.</p>
          <button
            onClick={() => auth.signOut()}
            style={{ background: "#F3A24C", color: "#0C1A3F", border: "none", borderRadius: 999, padding: "10px 24px", cursor: "pointer", fontWeight: 700 }}
          >
            Çıkış Yap
          </button>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
