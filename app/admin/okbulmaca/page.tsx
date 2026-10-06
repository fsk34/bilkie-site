"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ref, get } from "firebase/database";
import { signOut } from "firebase/auth";
import { auth, okBulmacaDb } from "../../lib/firebase";

/**
 * Ok Bulmaca bölümleri — salt okunur görüntüleyici (6 Eki 2026).
 * Kaynak: `okbulmaca` veritabanı `bolumler` (üç platformun TEK kaynağı). Her bölüm için önizleme +
 * biçim denetimi (uygulamalardaki okBolumGecerli) + çözülebilirlik (ok_uret.py `cozulebilir`).
 * Düzenleme Firebase konsolundan; bu sayfa yazmaz (veritabanı kuralı .write: false).
 */

type Hucre = [number, number];
type Bolum = { satir: number; sutun: number; oklar: { hucreler: Hucre[] }[] };

const NAV = [
  { label: "Testler", path: "/admin/testler" },
  { label: "Defterler", path: "/admin/defterler" },
  { label: "Yazılılar", path: "/admin/yazililar" },
  { label: "Kelime Gezmece", path: "/admin/kelimegezmece" },
  { label: "Ok Bulmaca", path: "/admin/okbulmaca" },
];

const btn = (bg = "#F3A24C"): React.CSSProperties => ({
  background: bg, color: bg === "#F3A24C" ? "#0C1A3F" : "#EAF2FF",
  border: "none", borderRadius: 999, padding: "7px 18px",
  fontSize: 13, fontWeight: 700, cursor: "pointer",
});

/** DB'deki ham bölüm → Bolum; eksik/bozuk koordinat -1 (denetimde yakalanır). */
function bolumCoz(v: unknown): Bolum {
  const o = (v ?? {}) as Record<string, unknown>;
  const dizi = (x: unknown): unknown[] => (Array.isArray(x) ? x : x && typeof x === "object" ? Object.values(x) : []);
  const n = (x: unknown) => (typeof x === "number" ? x : -1);
  return {
    satir: n(o.satir), sutun: n(o.sutun),
    oklar: dizi(o.oklar).map((ok) => ({
      hucreler: dizi((ok as Record<string, unknown>)?.hucreler).map((h) => { const p = dizi(h); return [n(p[0]), n(p[1])] as Hucre; }),
    })),
  };
}

/** Uygulamalardaki okBolumGecerli: hata metni ya da null. */
function bicimHatasi(b: Bolum): string | null {
  if (!(b.satir > 0) || !(b.sutun > 0)) return "satir/sutun eksik";
  if (b.oklar.length === 0) return "ok yok";
  for (let i = 0; i < b.oklar.length; i++) {
    const h = b.oklar[i].hucreler;
    if (h.length < 2) return `ok ${i}: 2'den az hücre`;
    for (const [r, c] of h) if (r < 0 || c < 0 || r >= b.satir || c >= b.sutun) return `ok ${i}: ızgara dışında hücre`;
    for (let k = 1; k < h.length; k++)
      if (Math.abs(h[k][0] - h[k - 1][0]) + Math.abs(h[k][1] - h[k - 1][1]) !== 1) return `ok ${i}: kopuk hücre`;
  }
  return null;
}

/** Aynı hücre iki okta mı (uygulamalar listeyi kesmez ama oyun bozuk görünür) — çözülmez sayılır. */
function cakisma(b: Bolum): boolean {
  const gorulen = new Set<string>();
  for (const o of b.oklar) for (const [r, c] of o.hucreler) {
    const k = `${r},${c}`;
    if (gorulen.has(k)) return true;
    gorulen.add(k);
  }
  return false;
}

/** ok_uret.py `cozulebilir`: önü açık bir ok bulunup çıkarılır; hepsi çıkarsa çözülebilir. */
function cozulebilir(b: Bolum): boolean {
  const kalan = b.oklar.map((o) => o.hucreler);
  const dolu = new Set<string>();
  for (const o of kalan) for (const [r, c] of o) dolu.add(`${r},${c}`);
  while (kalan.length) {
    const i = kalan.findIndex((o) => {
      const [hr, hc] = o[o.length - 1], [pr, pc] = o[o.length - 2];
      const dr = hr - pr, dc = hc - pc;
      let r = hr + dr, c = hc + dc;
      while (r >= 0 && c >= 0 && r < b.satir && c < b.sutun) {
        if (dolu.has(`${r},${c}`)) return false;
        r += dr; c += dc;
      }
      return true;
    });
    if (i < 0) return false;
    for (const [r, c] of kalan[i]) dolu.delete(`${r},${c}`);
    kalan.splice(i, 1);
  }
  return true;
}

/** Oyundaki görünüme yakın önizleme: beyaz tahta, boş hücrede nokta, lacivert oklar. */
function Onizleme({ b, boy }: { b: Bolum; boy: number }) {
  const hucre = boy / Math.max(b.sutun, b.satir, 1);
  const dolu = new Set(b.oklar.flatMap((o) => o.hucreler.map(([r, c]) => `${r},${c}`)));
  const m = (v: number) => (v + 0.5) * hucre;
  return (
    <svg width={b.sutun * hucre} height={b.satir * hucre} style={{ background: "#fff", borderRadius: hucre * 0.16, display: "block" }}>
      {Array.from({ length: b.satir }, (_, r) => Array.from({ length: b.sutun }, (_, c) =>
        dolu.has(`${r},${c}`) ? null : <circle key={`${r}-${c}`} cx={m(c)} cy={m(r)} r={hucre * 0.06} fill="#BCC3D4" />))}
      {b.oklar.map((o, i) => {
        const h = o.hucreler;
        if (h.length < 2) return null;
        const [hr, hc] = h[h.length - 1], [pr, pc] = h[h.length - 2];
        const dr = hr - pr, dc = hc - pc;
        const ux = dc, uy = dr;   // yön (x = sütun, y = satır)
        const bx = m(hc), by = m(hr);
        const uc = { x: bx + ux * hucre * 0.3, y: by + uy * hucre * 0.3 };
        const sol = { x: bx - uy * hucre * 0.15, y: by + ux * hucre * 0.15 };
        const sag = { x: bx + uy * hucre * 0.15, y: by - ux * hucre * 0.15 };
        return (
          <g key={i}>
            <polyline points={h.map(([r, c]) => `${m(c)},${m(r)}`).join(" ")} fill="none" stroke="#2B3350"
              strokeWidth={Math.max(1.2, hucre * 0.1)} strokeLinecap="round" strokeLinejoin="round" />
            <polygon points={`${uc.x},${uc.y} ${sol.x},${sol.y} ${sag.x},${sag.y}`} fill="#2B3350" />
          </g>
        );
      })}
    </svg>
  );
}

type Kayit = { no: number; b: Bolum; hata: string | null; cozulur: boolean };

export default function OkBulmacaAdmin() {
  const router = useRouter();
  const [kayitlar, setKayitlar] = useState<Kayit[] | null>(null);
  const [hata, setHata] = useState("");
  const [secili, setSecili] = useState<number | null>(null);
  const [yalnizSorunlu, setYalnizSorunlu] = useState(false);

  useEffect(() => {
    let iptal = false;
    get(ref(okBulmacaDb, "bolumler"))
      .then((snap) => {
        if (iptal) return;
        const v = snap.val();
        const ham: unknown[] = Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v) : [];
        setKayitlar(ham.map((x, i) => {
          const b = bolumCoz(x);
          const h = bicimHatasi(b);
          return { no: i + 1, b, hata: h, cozulur: h == null && !cakisma(b) && cozulebilir(b) };
        }));
      })
      .catch((e: unknown) => { if (!iptal) setHata(e instanceof Error ? e.message : String(e)); });
    return () => { iptal = true; };
  }, []);

  const ozet = useMemo(() => {
    if (!kayitlar) return null;
    const boyut = new Map<string, number>();
    for (const k of kayitlar) { const s = `${k.b.satir}×${k.b.sutun}`; boyut.set(s, (boyut.get(s) ?? 0) + 1); }
    // Uygulamalar ilk bozuk bölümde listeyi keser — sonrası oyunda GÖRÜNMEZ
    const ilkBozuk = kayitlar.find((k) => k.hata)?.no ?? null;
    return { boyut: [...boyut.entries()], ilkBozuk, cozulmez: kayitlar.filter((k) => !k.hata && !k.cozulur).length };
  }, [kayitlar]);

  const liste = (kayitlar ?? []).filter((k) => !yalnizSorunlu || k.hata || !k.cozulur);
  const acik = secili != null ? kayitlar?.[secili - 1] : null;

  return (
    <main style={{ minHeight: "100vh", background: "#0C1A3F", color: "#EAF2FF", padding: "24px 16px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#8FB3D9", letterSpacing: -0.5 }}>
            bilkie <span style={{ color: "#4A538E", fontWeight: 400, fontSize: 16 }}>/ yönetici</span>
          </h1>
          <button style={btn("#4A538E")} onClick={async () => { await signOut(auth); router.replace("/admin/login"); }}>Çıkış Yap</button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          {NAV.map(({ label, path }) => (
            <button key={path} style={btn(path === "/admin/okbulmaca" ? "#F3A24C" : "#3A4480")} onClick={() => router.push(path)}>{label}</button>
          ))}
        </div>

        {hata && <div style={{ background: "#3A1010", border: "1px solid #7A2020", borderRadius: 12, padding: "12px 16px", marginBottom: 16, color: "#FF8080", fontSize: 13 }}>⚠ {hata}</div>}
        {!kayitlar && !hata && <p style={{ color: "#8FB3D9" }}>Yükleniyor...</p>}

        {kayitlar && ozet && (
          <div style={{ background: "#2C335E", border: "1px solid #4A538E", borderRadius: 16, padding: 20, marginBottom: 20, fontSize: 14, lineHeight: 1.7 }}>
            <div><b>{kayitlar.length}</b> bölüm · {ozet.boyut.map(([s, n]) => `${s}: ${n}`).join(" · ")}</div>
            {ozet.ilkBozuk != null
              ? <div style={{ color: "#FF8080" }}>⚠ {ozet.ilkBozuk}. bölümün biçimi bozuk — uygulamalar listeyi orada keser, sonrası oyunda GÖRÜNMEZ.</div>
              : <div style={{ color: "#81C784" }}>✓ Tüm bölümlerin biçimi geçerli.</div>}
            {ozet.cozulmez > 0
              ? <div style={{ color: "#FFB74D" }}>⚠ {ozet.cozulmez} bölüm çözülemiyor (oyunda takılır).</div>
              : <div style={{ color: "#81C784" }}>✓ Tüm bölümler çözülebilir.</div>}
            <div style={{ color: "#8FB3D9", fontSize: 12, marginTop: 6 }}>
              Düzenleme: Firebase konsolu → okbulmaca → bolumler (N. bölüm = {"{N-1}"} numaralı kayıt). Yalnız düzenleyin ya da sona ekleyin; ortadan silmek numaraları kaydırır.
            </div>
            <label style={{ display: "inline-flex", gap: 6, alignItems: "center", marginTop: 10, cursor: "pointer", fontSize: 13 }}>
              <input type="checkbox" checked={yalnizSorunlu} onChange={(e) => setYalnizSorunlu(e.target.checked)} /> Yalnız sorunlu bölümler
            </label>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
          {liste.map((k) => (
            <button key={k.no} onClick={() => setSecili(k.no)}
              style={{ background: "#2C335E", border: `1px solid ${k.hata ? "#7A2020" : !k.cozulur ? "#8A6020" : "#4A538E"}`, borderRadius: 14, padding: 10, cursor: "pointer", color: "#EAF2FF", textAlign: "left" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                <b>Bölüm {k.no}</b>
                <span style={{ color: k.hata ? "#FF8080" : !k.cozulur ? "#FFB74D" : "#81C784" }}>{k.hata ? "bozuk" : !k.cozulur ? "çözülmez" : "✓"}</span>
              </div>
              {k.hata ? <div style={{ fontSize: 12, color: "#FF8080" }}>{k.hata}</div> : <Onizleme b={k.b} boy={128} />}
              <div style={{ fontSize: 11, color: "#8FB3D9", marginTop: 6 }}>{k.b.satir}×{k.b.sutun} · {k.b.oklar.length} ok</div>
            </button>
          ))}
        </div>
      </div>

      {acik && (
        <div onClick={() => setSecili(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 10 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#2C335E", borderRadius: 18, padding: 20, maxWidth: "95vw" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 16 }}>
              <b>Bölüm {acik.no} · {acik.b.satir}×{acik.b.sutun} · {acik.b.oklar.length} ok · kayıt {acik.no - 1}</b>
              <div style={{ display: "flex", gap: 6 }}>
                <button style={btn("#3A4480")} disabled={acik.no <= 1} onClick={() => setSecili(acik.no - 1)}>‹</button>
                <button style={btn("#3A4480")} disabled={acik.no >= (kayitlar?.length ?? 0)} onClick={() => setSecili(acik.no + 1)}>›</button>
                <button style={btn("#4A538E")} onClick={() => setSecili(null)}>Kapat</button>
              </div>
            </div>
            {acik.hata ? <p style={{ color: "#FF8080" }}>{acik.hata}</p> : <Onizleme b={acik.b} boy={Math.min(560, typeof window !== "undefined" ? window.innerWidth - 80 : 560)} />}
          </div>
        </div>
      )}
    </main>
  );
}
