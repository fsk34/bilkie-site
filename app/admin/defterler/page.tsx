"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ref, get, set } from "firebase/database";
import { signOut } from "firebase/auth";
import { auth, defterleriDb } from "../../lib/firebase";

// ─── Tipler ───────────────────────────────────────────────────────────────────

type TextBlock = { type: "title" | "subtitle" | "paragraph" | "info" | "rule" | "formula" | "warning" | "pattern" | "example"; text: string };
type DefinitionBlock = { type: "definition"; term: string; text: string };
type TitledBlock = { type: "problem" | "strategy"; title?: string; text?: string };
type ListBlock = { type: "list"; items: string[] };
type StepsBlock = { type: "steps"; title?: string; steps: string[] };
type TableBlock = { type: "table"; headers: string[]; rows: string[][] };
type Block = TextBlock | DefinitionBlock | TitledBlock | ListBlock | StepsBlock | TableBlock;
type Page = { pageNo: number; blocks: Block[] };

const GRADES = ["grade3", "grade4", "grade5", "grade6", "grade7", "grade8"];
const GRADE_LABELS: Record<string, string> = {
  grade3: "3. Sınıf", grade4: "4. Sınıf", grade5: "5. Sınıf",
  grade6: "6. Sınıf", grade7: "7. Sınıf", grade8: "8. Sınıf",
};

const TYPE_COLORS: Record<string, string> = {
  title: "#7C3AED", subtitle: "#2563EB", paragraph: "#64748B",
  info: "#0891B2", rule: "#D97706", formula: "#059669",
  warning: "#DC2626", pattern: "#DB2777", example: "#65A30D",
  definition: "#4F46E5", problem: "#EA580C", strategy: "#7C3AED",
  list: "#CA8A04", steps: "#0D9488", table: "#9333EA",
};

const TYPE_LABELS: Record<string, string> = {
  title: "Başlık", subtitle: "Alt Başlık", paragraph: "Paragraf",
  info: "Bilgi", rule: "Kural", formula: "Formül",
  warning: "Uyarı", pattern: "Örüntü", example: "Örnek",
  definition: "Tanım", problem: "Problem", strategy: "Strateji",
  list: "Liste", steps: "Adımlar", table: "Tablo",
};

const TEXT_TYPES = ["title", "subtitle", "paragraph", "info", "rule", "formula", "warning", "pattern", "example"];

// ─── Stiller ──────────────────────────────────────────────────────────────────

const sel: React.CSSProperties = {
  background: "#1A2550", color: "#EAF2FF", border: "1px solid #4A538E",
  borderRadius: 10, padding: "8px 12px", fontSize: 14, cursor: "pointer", outline: "none",
};
const inp: React.CSSProperties = {
  background: "#1A2550", color: "#EAF2FF", border: "1px solid #4A538E",
  borderRadius: 10, padding: "8px 12px", fontSize: 14, outline: "none",
  width: "100%", boxSizing: "border-box",
};
const txa: React.CSSProperties = { ...inp, resize: "vertical", minHeight: 80, fontFamily: "inherit" };
const btn = (bg = "#F3A24C"): React.CSSProperties => ({
  background: bg, color: bg === "#F3A24C" ? "#0C1A3F" : "#EAF2FF",
  border: "none", borderRadius: 999, padding: "6px 16px",
  fontSize: 13, fontWeight: 700, cursor: "pointer",
});

// ─── Block önizlemesi ─────────────────────────────────────────────────────────

function blockPreview(block: Block): string {
  if (TEXT_TYPES.includes(block.type)) return (block as TextBlock).text?.slice(0, 80) || "";
  if (block.type === "definition") return `${(block as DefinitionBlock).term}: ${(block as DefinitionBlock).text?.slice(0, 60)}`;
  if (block.type === "problem" || block.type === "strategy") {
    const b = block as TitledBlock;
    return b.title || b.text?.slice(0, 80) || "";
  }
  if (block.type === "list") return `${(block as ListBlock).items.length} madde: ${(block as ListBlock).items[0]?.slice(0, 50)}...`;
  if (block.type === "steps") return `${(block as StepsBlock).steps?.length || 0} adım — ${(block as StepsBlock).title || ""}`;
  if (block.type === "table") {
    const t = block as TableBlock;
    return `${t.headers?.length || 0} sütun, ${t.rows?.length || 0} satır`;
  }
  return "";
}

// ─── Block editörü ────────────────────────────────────────────────────────────

function BlockEditor({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  if (TEXT_TYPES.includes(block.type)) {
    const b = block as TextBlock;
    return (
      <textarea style={txa} value={b.text || ""} onChange={(e) => onChange({ ...b, text: e.target.value })} />
    );
  }

  if (block.type === "definition") {
    const b = block as DefinitionBlock;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input style={inp} placeholder="Terim" value={b.term || ""} onChange={(e) => onChange({ ...b, term: e.target.value })} />
        <textarea style={txa} placeholder="Tanım" value={b.text || ""} onChange={(e) => onChange({ ...b, text: e.target.value })} />
      </div>
    );
  }

  if (block.type === "problem" || block.type === "strategy") {
    const b = block as TitledBlock;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input style={inp} placeholder="Başlık" value={b.title || ""} onChange={(e) => onChange({ ...b, title: e.target.value })} />
        <textarea style={txa} placeholder="İçerik" value={b.text || ""} onChange={(e) => onChange({ ...b, text: e.target.value })} />
      </div>
    );
  }

  if (block.type === "list") {
    const b = block as ListBlock;
    const items = b.items || [];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 6 }}>
            <textarea
              style={{ ...txa, minHeight: 40 }}
              value={item}
              onChange={(e) => {
                const next = [...items];
                next[i] = e.target.value;
                onChange({ ...b, items: next });
              }}
            />
            <button
              style={{ ...btn("#7A2020"), padding: "4px 10px", flexShrink: 0 }}
              onClick={() => onChange({ ...b, items: items.filter((_, j) => j !== i) })}
            >✕</button>
          </div>
        ))}
        <button style={btn("#3A4480")} onClick={() => onChange({ ...b, items: [...items, ""] })}>+ Madde Ekle</button>
      </div>
    );
  }

  if (block.type === "steps") {
    const b = block as StepsBlock;
    const steps = b.steps || [];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input style={inp} placeholder="Başlık" value={b.title || ""} onChange={(e) => onChange({ ...b, title: e.target.value })} />
        {steps.map((step, i) => (
          <div key={i} style={{ display: "flex", gap: 6 }}>
            <textarea
              style={{ ...txa, minHeight: 40 }}
              value={step}
              onChange={(e) => {
                const next = [...steps];
                next[i] = e.target.value;
                onChange({ ...b, steps: next });
              }}
            />
            <button
              style={{ ...btn("#7A2020"), padding: "4px 10px", flexShrink: 0 }}
              onClick={() => onChange({ ...b, steps: steps.filter((_, j) => j !== i) })}
            >✕</button>
          </div>
        ))}
        <button style={btn("#3A4480")} onClick={() => onChange({ ...b, steps: [...steps, ""] })}>+ Adım Ekle</button>
      </div>
    );
  }

  if (block.type === "table") {
    const b = block as TableBlock;
    const headers = b.headers || [];
    const rows = b.rows || [];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowX: "auto" }}>
        <p style={{ color: "#8FB3D9", fontSize: 12, margin: 0 }}>Başlıklar</p>
        <div style={{ display: "flex", gap: 6 }}>
          {headers.map((h, i) => (
            <input
              key={i}
              style={{ ...inp, width: "auto", flex: 1 }}
              value={h}
              onChange={(e) => {
                const next = [...headers];
                next[i] = e.target.value;
                onChange({ ...b, headers: next });
              }}
            />
          ))}
        </div>
        <p style={{ color: "#8FB3D9", fontSize: 12, margin: 0 }}>Satırlar</p>
        {rows.map((row, ri) => (
          <div key={ri} style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {row.map((cell, ci) => (
              <input
                key={ci}
                style={{ ...inp, width: "auto", flex: 1 }}
                value={cell}
                onChange={(e) => {
                  const nextRows = rows.map((r, rr) =>
                    rr === ri ? r.map((c, cc) => (cc === ci ? e.target.value : c)) : r
                  );
                  onChange({ ...b, rows: nextRows });
                }}
              />
            ))}
            <button
              style={{ ...btn("#7A2020"), padding: "4px 10px", flexShrink: 0 }}
              onClick={() => onChange({ ...b, rows: rows.filter((_, rr) => rr !== ri) })}
            >✕</button>
          </div>
        ))}
        <button
          style={btn("#3A4480")}
          onClick={() => onChange({ ...b, rows: [...rows, headers.map(() => "")] })}
        >+ Satır Ekle</button>
      </div>
    );
  }

  return <p style={{ color: "#8FB3D9", fontSize: 13 }}>Bu blok tipi için editör henüz desteklenmiyor.</p>;
}

// ─── Ana sayfa ────────────────────────────────────────────────────────────────

export default function DefterlerPage() {
  const router = useRouter();

  const [grade, setGrade] = useState("grade3");
  const [subjects, setSubjects] = useState<Record<string, string>>({}); // key → title
  const [subject, setSubject] = useState("");
  const [units, setUnits] = useState<string[]>([]);
  const [unit, setUnit] = useState("");
  const [pages, setPages] = useState<Page[]>([]);
  const [pageIdx, setPageIdx] = useState(0);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Block | null>(null);

  // Grade değişince dersleri yükle
  useEffect(() => {
    setSubject("");
    setUnits([]);
    setUnit("");
    setPages([]);
    loadSubjects();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grade]);

  async function loadSubjects() {
    const snap = await get(ref(defterleriDb, `defterler/${grade}/subjects`));
    if (!snap.exists()) return;
    const data = snap.val() as Record<string, { title?: string }>;
    const map: Record<string, string> = {};
    for (const [key, val] of Object.entries(data)) {
      map[key] = val.title || key;
    }
    setSubjects(map);
    const first = Object.keys(map)[0];
    if (first) setSubject(first);
  }

  // Ders değişince üniteleri yükle
  useEffect(() => {
    if (!subject) return;
    setUnits([]);
    setUnit("");
    setPages([]);
    loadUnits();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, grade]);

  async function loadUnits() {
    const snap = await get(ref(defterleriDb, `defterler/${grade}/subjects/${subject}/units`));
    if (!snap.exists()) return;
    const keys = Object.keys(snap.val()).sort((a, b) => {
      return parseInt(a.replace("u", ""), 10) - parseInt(b.replace("u", ""), 10);
    });
    setUnits(keys);
    if (keys[0]) setUnit(keys[0]);
  }

  // Ünite değişince sayfaları yükle
  useEffect(() => {
    if (!unit) return;
    loadPages();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit, subject, grade]);

  async function loadPages() {
    setLoading(true);
    setEditingIdx(null);
    const snap = await get(ref(defterleriDb, `defterler/${grade}/subjects/${subject}/units/${unit}/pages`));
    if (snap.exists()) {
      const val = snap.val();
      const arr: Page[] = Array.isArray(val) ? val : Object.values(val);
      setPages(arr);
      setPageIdx(0);
    } else {
      setPages([]);
    }
    setLoading(false);
  }

  async function savePages(newPages: Page[]) {
    setSaving(true);
    await set(ref(defterleriDb, `defterler/${grade}/subjects/${subject}/units/${unit}/pages`), newPages);
    setPages(newPages);
    setSaving(false);
  }

  async function saveEdit(blockIdx: number) {
    if (!editForm) return;
    const newPages = pages.map((p, i) => {
      if (i !== pageIdx) return p;
      const newBlocks = [...p.blocks];
      newBlocks[blockIdx] = editForm;
      return { ...p, blocks: newBlocks };
    });
    await savePages(newPages);
    setEditingIdx(null);
  }

  async function deleteBlock(blockIdx: number) {
    const preview = blockPreview(pages[pageIdx].blocks[blockIdx]).slice(0, 40);
    if (!confirm(`"${preview}..." bloğunu silmek istiyor musunuz?`)) return;
    const newPages = pages.map((p, i) => {
      if (i !== pageIdx) return p;
      return { ...p, blocks: p.blocks.filter((_, j) => j !== blockIdx) };
    });
    await savePages(newPages);
  }

  async function reorderBlock(fromIdx: number, toIdx: number) {
    if (toIdx < 0 || toIdx >= currentBlocks.length) return;
    const newBlocks = [...currentBlocks];
    const [moved] = newBlocks.splice(fromIdx, 1);
    newBlocks.splice(toIdx, 0, moved);
    const newPages = pages.map((p, i) => i === pageIdx ? { ...p, blocks: newBlocks } : p);
    await savePages(newPages);
  }

  const currentBlocks = pages[pageIdx]?.blocks || [];

  return (
    <main style={{ minHeight: "100vh", background: "#0C1A3F", color: "#EAF2FF", padding: "24px 16px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>

        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#8FB3D9", letterSpacing: -0.5 }}>
            bilkie <span style={{ color: "#4A538E", fontWeight: 400, fontSize: 16 }}>/ yönetici</span>
          </h1>
          <button
            style={btn("#4A538E")}
            onClick={async () => { await signOut(auth); router.replace("/admin/login"); }}
          >Çıkış Yap</button>
        </div>

        {/* NAV TABS */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          <button style={{ ...btn("#3A4480"), background: "#3A4480" }} onClick={() => router.push("/admin/testler")}>
            Testler
          </button>
          <button style={{ ...btn("#F3A24C") }}>
            Defterler
          </button>
        </div>

        {/* NAVİGASYON */}
        <div style={{ background: "#2C335E", border: "1px solid #4A538E", borderRadius: 16, padding: 20, marginBottom: 24 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, color: "#8FB3D9", textTransform: "uppercase", letterSpacing: 0.5 }}>Sınıf</label>
              <select style={sel} value={grade} onChange={(e) => setGrade(e.target.value)}>
                {GRADES.map((g) => <option key={g} value={g}>{GRADE_LABELS[g]}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, color: "#8FB3D9", textTransform: "uppercase", letterSpacing: 0.5 }}>Ders</label>
              <select style={sel} value={subject} onChange={(e) => setSubject(e.target.value)} disabled={!Object.keys(subjects).length}>
                {Object.entries(subjects).map(([key, title]) => <option key={key} value={key}>{title}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, color: "#8FB3D9", textTransform: "uppercase", letterSpacing: 0.5 }}>Ünite</label>
              <select style={sel} value={unit} onChange={(e) => setUnit(e.target.value)} disabled={!units.length}>
                {units.map((u) => <option key={u} value={u}>{u.toUpperCase()}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, color: "#8FB3D9", textTransform: "uppercase", letterSpacing: 0.5 }}>Sayfa</label>
              <select style={sel} value={pageIdx} onChange={(e) => { setPageIdx(Number(e.target.value)); setEditingIdx(null); }} disabled={!pages.length}>
                {pages.map((p, i) => <option key={i} value={i}>Sayfa {p.pageNo}</option>)}
              </select>
            </div>
          </div>
          {unit && (
            <p style={{ marginTop: 12, fontSize: 12, color: "#4A538E" }}>
              defterler / {grade} / subjects / {subject} / units / {unit}
            </p>
          )}
        </div>

        {/* BLOKLAR */}
        <div style={{ background: "#2C335E", border: "1px solid #4A538E", borderRadius: 16, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#C9D9F2" }}>
              {loading ? "Yükleniyor..." : `${currentBlocks.length} Blok`}
              {saving && <span style={{ color: "#F3A24C", fontSize: 13, marginLeft: 8 }}>Kaydediliyor...</span>}
            </h2>
          </div>

          {!loading && currentBlocks.length === 0 && (
            <p style={{ color: "#4A538E", fontSize: 14, textAlign: "center", padding: "24px 0" }}>
              Bu sayfada blok yok.
            </p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {currentBlocks.map((block, idx) => {
              const isEditing = editingIdx === idx;
              const color = TYPE_COLORS[block.type] || "#4A538E";
              return (
                <div
                  key={idx}
                  style={{
                    background: "#1A2550",
                    border: `1px solid ${isEditing ? "#F3A24C" : "#3A4480"}`,
                    borderRadius: 12,
                    padding: 16,
                    display: "flex",
                    gap: 10,
                  }}
                >
                  {/* Sıralama okları */}
                  {!isEditing && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={() => reorderBlock(idx, idx - 1)}
                        disabled={idx === 0 || saving}
                        style={{ background: "none", border: "1px solid #4A538E", borderRadius: 6, color: idx === 0 ? "#2C335E" : "#8FB3D9", cursor: idx === 0 ? "default" : "pointer", width: 28, height: 28, fontSize: 14, lineHeight: 1 }}
                      >↑</button>
                      <button
                        onClick={() => reorderBlock(idx, idx + 1)}
                        disabled={idx === currentBlocks.length - 1 || saving}
                        style={{ background: "none", border: "1px solid #4A538E", borderRadius: 6, color: idx === currentBlocks.length - 1 ? "#2C335E" : "#8FB3D9", cursor: idx === currentBlocks.length - 1 ? "default" : "pointer", width: 28, height: 28, fontSize: 14, lineHeight: 1 }}
                      >↓</button>
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                  {/* Blok başlığı */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: isEditing ? 12 : 0 }}>
                    <div style={{ flex: 1, display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <span style={{
                        background: color + "33",
                        color: color,
                        border: `1px solid ${color}55`,
                        borderRadius: 6,
                        padding: "2px 8px",
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        flexShrink: 0,
                      }}>
                        {TYPE_LABELS[block.type] || block.type}
                      </span>
                      {!isEditing && (
                        <span style={{ fontSize: 13, color: "#C9D9F2", lineHeight: 1.4 }}>
                          {blockPreview(block)}
                        </span>
                      )}
                    </div>
                    {!isEditing && (
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button
                          style={btn("#3A4480")}
                          onClick={() => { setEditingIdx(idx); setEditForm(JSON.parse(JSON.stringify(block))); }}
                        >Düzenle</button>
                        <button style={btn("#7A2020")} onClick={() => deleteBlock(idx)}>Sil</button>
                      </div>
                    )}
                  </div>

                  {/* Editör */}
                  {isEditing && editForm && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <BlockEditor block={editForm} onChange={setEditForm} />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button style={btn()} onClick={() => saveEdit(idx)}>Kaydet</button>
                        <button style={btn("#4A538E")} onClick={() => setEditingIdx(null)}>İptal</button>
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
