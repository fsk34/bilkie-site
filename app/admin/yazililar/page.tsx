"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ref as dbRef, get, set, remove } from "firebase/database";
import { ref as storageRef, getDownloadURL, uploadBytes } from "firebase/storage";
import { signOut } from "firebase/auth";
import { auth, yazillarDb, storage } from "../../lib/firebase";

// ─── Tipler ───────────────────────────────────────────────────────────────────

type AcikUcluQ = { id: string; question: string; passage?: string; answers: string[]; caseSensitive: boolean; imageRef?: string };
type TestQ = { id: string; question: string; options: Record<string, string>; correct: string };
type SiralamaQ = { id: string; instruction?: string; tokens: string[]; correctSentence: string };
type DogruYanlisQ = { id: string; statement: string; correct: string };
type AnyQuestion = AcikUcluQ | TestQ | SiralamaQ | DogruYanlisQ;
type QType = "acikuclu" | "test" | "siralama" | "dogruyanlis";
type StepData = Partial<Record<QType, Record<string, AnyQuestion>>>;

// ─── Sabitler ─────────────────────────────────────────────────────────────────

const GRADES = ["grade3", "grade4", "grade5", "grade6", "grade7", "grade8"];
const GRADE_LABELS: Record<string, string> = {
  grade3: "3. Sınıf", grade4: "4. Sınıf", grade5: "5. Sınıf",
  grade6: "6. Sınıf", grade7: "7. Sınıf", grade8: "8. Sınıf",
};
const EXAM_LABELS: Record<string, string> = {
  term1_exam1: "1. Dönem - 1. Yazılı", term1_exam2: "1. Dönem - 2. Yazılı",
  term2_exam1: "2. Dönem - 1. Yazılı", term2_exam2: "2. Dönem - 2. Yazılı",
};
const QTYPE_LABELS: Record<QType, string> = {
  acikuclu: "Açık Uçlu", test: "Test", siralama: "Sıralama", dogruyanlis: "Doğru / Yanlış",
};
const QTYPE_COLORS: Record<QType, string> = {
  acikuclu: "#0891B2", test: "#059669", siralama: "#D97706", dogruyanlis: "#7C3AED",
};
const QTYPES: QType[] = ["acikuclu", "test", "siralama", "dogruyanlis"];

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
const txa: React.CSSProperties = { ...inp, resize: "vertical", minHeight: 72, fontFamily: "inherit" };
const btn = (bg = "#F3A24C"): React.CSSProperties => ({
  background: bg, color: bg === "#F3A24C" ? "#0C1A3F" : "#EAF2FF",
  border: "none", borderRadius: 999, padding: "6px 16px",
  fontSize: 13, fontWeight: 700, cursor: "pointer",
});
const arrowBtn = (disabled: boolean): React.CSSProperties => ({
  background: "none", border: "1px solid #4A538E", borderRadius: 6,
  color: disabled ? "#2C335E" : "#8FB3D9", cursor: disabled ? "default" : "pointer",
  width: 28, height: 28, fontSize: 14, lineHeight: "1",
});

// ─── Görsel önizleme ──────────────────────────────────────────────────────────

function ImagePreview({ imageRef: imgRef }: { imageRef: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    getDownloadURL(storageRef(storage, imgRef)).then(setUrl).catch(() => setUrl("error"));
  }, [imgRef]);
  if (!url) return <span style={{ color: "#4A538E", fontSize: 12 }}>Görsel yükleniyor...</span>;
  if (url === "error") return <span style={{ color: "#DC2626", fontSize: 12 }}>Görsel bulunamadı</span>;
  return <img src={url} alt="" style={{ maxWidth: 180, maxHeight: 120, borderRadius: 8, border: "1px solid #4A538E" }} />;
}

// ─── Görsel yükleyici ─────────────────────────────────────────────────────────

function ImageUploader({ imageRef: imgRef, questionId, qtype, onChange }: {
  imageRef?: string; questionId: string; qtype: QType;
  onChange: (newRef: string | undefined) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = imgRef || `${qtype}/${questionId}.${ext}`;
    await uploadBytes(storageRef(storage, path), file);
    onChange(path);
    setUploading(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {imgRef && <ImagePreview imageRef={imgRef} />}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button style={btn("#3A4480")} onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? "Yükleniyor..." : imgRef ? "Görseli Değiştir" : "Görsel Ekle"}
        </button>
        {imgRef && (
          <button style={btn("#7A2020")} onClick={() => onChange(undefined)}>
            Görseli Kaldır
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
    </div>
  );
}

// ─── Editörler ────────────────────────────────────────────────────────────────

function AcikUcluEditor({ q, onChange, qtype }: { q: AcikUcluQ; onChange: (q: AcikUcluQ) => void; qtype: QType }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <textarea style={txa} placeholder="Soru metni" value={q.question || ""} onChange={(e) => onChange({ ...q, question: e.target.value })} />
      <textarea style={{ ...txa, minHeight: 56 }} placeholder="Metin (passage, opsiyonel)" value={q.passage || ""} onChange={(e) => onChange({ ...q, passage: e.target.value || undefined })} />
      <p style={{ color: "#8FB3D9", fontSize: 12, margin: 0 }}>Kabul edilen cevaplar:</p>
      {(q.answers || []).map((a, i) => (
        <div key={i} style={{ display: "flex", gap: 6 }}>
          <input style={inp} value={a} onChange={(e) => { const next = [...q.answers]; next[i] = e.target.value; onChange({ ...q, answers: next }); }} />
          <button style={{ ...btn("#7A2020"), padding: "4px 10px", flexShrink: 0 }} onClick={() => onChange({ ...q, answers: q.answers.filter((_, j) => j !== i) })}>✕</button>
        </div>
      ))}
      <button style={btn("#3A4480")} onClick={() => onChange({ ...q, answers: [...(q.answers || []), ""] })}>+ Cevap Ekle</button>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#C9D9F2", cursor: "pointer" }}>
        <input type="checkbox" checked={q.caseSensitive || false} onChange={(e) => onChange({ ...q, caseSensitive: e.target.checked })} style={{ accentColor: "#F3A24C" }} />
        Büyük/küçük harf duyarlı
      </label>
      <p style={{ color: "#8FB3D9", fontSize: 12, margin: 0 }}>Görsel:</p>
      <ImageUploader imageRef={q.imageRef} questionId={q.id} qtype={qtype} onChange={(ref) => onChange({ ...q, imageRef: ref })} />
    </div>
  );
}

function TestEditor({ q, onChange }: { q: TestQ; onChange: (q: TestQ) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <textarea style={txa} placeholder="Soru metni" value={q.question || ""} onChange={(e) => onChange({ ...q, question: e.target.value })} />
      {["A", "B", "C", "D"].map((letter) => (
        <div key={letter} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="radio" name="correct" checked={q.correct === letter} onChange={() => onChange({ ...q, correct: letter })} style={{ accentColor: "#F3A24C", flexShrink: 0 }} />
          <span style={{ color: "#8FB3D9", fontSize: 13, width: 16 }}>{letter}</span>
          <input style={inp} value={q.options?.[letter] || ""} onChange={(e) => onChange({ ...q, options: { ...q.options, [letter]: e.target.value } })} />
        </div>
      ))}
      <p style={{ color: "#8FB3D9", fontSize: 12 }}>Dolu daire = doğru şık</p>
    </div>
  );
}

function SiralamaEditor({ q, onChange }: { q: SiralamaQ; onChange: (q: SiralamaQ) => void }) {
  const tokens = q.tokens || [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <textarea style={{ ...txa, minHeight: 56 }} placeholder="Talimat" value={q.instruction || ""} onChange={(e) => onChange({ ...q, instruction: e.target.value })} />
      <p style={{ color: "#8FB3D9", fontSize: 12, margin: 0 }}>Kelimeler (karışık):</p>
      {tokens.map((t, i) => (
        <div key={i} style={{ display: "flex", gap: 6 }}>
          <input style={inp} value={t} onChange={(e) => { const next = [...tokens]; next[i] = e.target.value; onChange({ ...q, tokens: next }); }} />
          <button style={{ ...btn("#7A2020"), padding: "4px 10px", flexShrink: 0 }} onClick={() => onChange({ ...q, tokens: tokens.filter((_, j) => j !== i) })}>✕</button>
        </div>
      ))}
      <button style={btn("#3A4480")} onClick={() => onChange({ ...q, tokens: [...tokens, ""] })}>+ Kelime Ekle</button>
      <input style={inp} placeholder="Doğru cümle" value={q.correctSentence || ""} onChange={(e) => onChange({ ...q, correctSentence: e.target.value })} />
    </div>
  );
}

function DogruYanlisEditor({ q, onChange }: { q: DogruYanlisQ; onChange: (q: DogruYanlisQ) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <textarea style={txa} placeholder="İfade" value={q.statement || ""} onChange={(e) => onChange({ ...q, statement: e.target.value })} />
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <span style={{ color: "#8FB3D9", fontSize: 13 }}>Doğru cevap:</span>
        {["D", "Y"].map((val) => (
          <label key={val} style={{ display: "flex", gap: 6, alignItems: "center", cursor: "pointer", fontSize: 14, color: q.correct === val ? "#F3A24C" : "#C9D9F2" }}>
            <input type="radio" name="dy" checked={q.correct === val} onChange={() => onChange({ ...q, correct: val })} style={{ accentColor: "#F3A24C" }} />
            {val === "D" ? "Doğru" : "Yanlış"}
          </label>
        ))}
      </div>
    </div>
  );
}

function QuestionEditor({ q, qtype, onChange }: { q: AnyQuestion; qtype: QType; onChange: (q: AnyQuestion) => void }) {
  if (qtype === "acikuclu") return <AcikUcluEditor q={q as AcikUcluQ} onChange={onChange as (q: AcikUcluQ) => void} qtype={qtype} />;
  if (qtype === "test") return <TestEditor q={q as TestQ} onChange={onChange as (q: TestQ) => void} />;
  if (qtype === "siralama") return <SiralamaEditor q={q as SiralamaQ} onChange={onChange as (q: SiralamaQ) => void} />;
  return <DogruYanlisEditor q={q as DogruYanlisQ} onChange={onChange as (q: DogruYanlisQ) => void} />;
}

function questionPreview(q: AnyQuestion, qtype: QType): string {
  if (qtype === "acikuclu") return (q as AcikUcluQ).question?.slice(0, 80) || "";
  if (qtype === "test") return (q as TestQ).question?.slice(0, 80) || "";
  if (qtype === "siralama") return (q as SiralamaQ).correctSentence?.slice(0, 80) || "";
  return (q as DogruYanlisQ).statement?.slice(0, 80) || "";
}

// ─── Ana sayfa ────────────────────────────────────────────────────────────────

export default function YaziliarPage() {
  const router = useRouter();

  const [grade, setGrade] = useState("grade3");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [exam, setExam] = useState("term1_exam1");
  const [step, setStep] = useState("step1");
  const [stepData, setStepData] = useState<StepData>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState<{ qtype: QType; id: string } | null>(null);
  const [editForm, setEditForm] = useState<AnyQuestion | null>(null);

  useEffect(() => { loadSubjects(); }, [grade]);
  useEffect(() => { if (subject) loadStep(); }, [grade, subject, exam, step]);

  async function loadSubjects() {
    setSubject("");
    setStepData({});
    const snap = await get(dbRef(yazillarDb, `writtenCatalog/${grade}`));
    if (!snap.exists()) return;
    const keys = Object.keys(snap.val()).sort();
    setSubjects(keys);
    setSubject(keys[0] || "");
  }

  async function loadStep() {
    setLoading(true);
    setEditing(null);
    const path = `writtenQuestions/${grade}/${subject}/${exam}/steps/${step}`;
    const snap = await get(dbRef(yazillarDb, path));
    setStepData(snap.exists() ? snap.val() : {});
    setLoading(false);
  }

  function basePath() {
    return `writtenQuestions/${grade}/${subject}/${exam}/steps/${step}`;
  }

  async function saveEdit(qtype: QType, id: string) {
    if (!editForm) return;
    setSaving(true);
    await set(dbRef(yazillarDb, `${basePath()}/${qtype}/${id}`), editForm);
    setEditing(null);
    await loadStep();
    setSaving(false);
  }

  async function deleteQuestion(qtype: QType, id: string) {
    const q = stepData[qtype]?.[id];
    const preview = q ? questionPreview(q, qtype).slice(0, 40) : id;
    if (!confirm(`"${preview}..." sorusunu silmek istiyor musunuz?`)) return;
    setSaving(true);
    await remove(dbRef(yazillarDb, `${basePath()}/${qtype}/${id}`));
    await loadStep();
    setSaving(false);
  }

  async function reorderQuestion(qtype: QType, sortedKeys: string[], fromIdx: number, toIdx: number) {
    if (toIdx < 0 || toIdx >= sortedKeys.length) return;
    setSaving(true);
    const keyA = sortedKeys[fromIdx];
    const keyB = sortedKeys[toIdx];
    const qA = stepData[qtype]![keyA];
    const qB = stepData[qtype]![keyB];
    await set(dbRef(yazillarDb, `${basePath()}/${qtype}/${keyA}`), qB);
    await set(dbRef(yazillarDb, `${basePath()}/${qtype}/${keyB}`), qA);
    await loadStep();
    setSaving(false);
  }

  function sortedQKeys(qtype: QType): string[] {
    return Object.keys(stepData[qtype] || {}).sort((a, b) => {
      return parseInt(a.replace("q", ""), 10) - parseInt(b.replace("q", ""), 10);
    });
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0C1A3F", color: "#EAF2FF", padding: "24px 16px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>

        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#8FB3D9", letterSpacing: -0.5 }}>
            bilkie <span style={{ color: "#4A538E", fontWeight: 400, fontSize: 16 }}>/ yönetici</span>
          </h1>
          <button style={btn("#4A538E")} onClick={async () => { await signOut(auth); router.replace("/admin/login"); }}>
            Çıkış Yap
          </button>
        </div>

        {/* NAV TABS */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {[
            { label: "Testler", path: "/admin/testler" },
            { label: "Defterler", path: "/admin/defterler" },
            { label: "Yazılılar", path: "/admin/yazililar" },
          ].map(({ label, path }) => (
            <button
              key={path}
              style={btn(path === "/admin/yazililar" ? "#F3A24C" : "#3A4480")}
              onClick={() => router.push(path)}
            >{label}</button>
          ))}
        </div>

        {/* NAVİGASYON */}
        <div style={{ background: "#2C335E", border: "1px solid #4A538E", borderRadius: 16, padding: 20, marginBottom: 24 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {[
              { label: "Sınıf", content: <select style={sel} value={grade} onChange={(e) => setGrade(e.target.value)}>{GRADES.map(g => <option key={g} value={g}>{GRADE_LABELS[g]}</option>)}</select> },
              { label: "Ders", content: <select style={sel} value={subject} onChange={(e) => setSubject(e.target.value)} disabled={!subjects.length}>{subjects.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</select> },
              { label: "Yazılı", content: <select style={sel} value={exam} onChange={(e) => setExam(e.target.value)}>{Object.entries(EXAM_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select> },
              { label: "Aşama", content: <select style={sel} value={step} onChange={(e) => setStep(e.target.value)}><option value="step1">Aşama 1</option><option value="step2">Aşama 2</option></select> },
            ].map(({ label, content }) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 11, color: "#8FB3D9", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</label>
                {content}
              </div>
            ))}
          </div>
          {subject && (
            <p style={{ marginTop: 12, fontSize: 12, color: "#4A538E" }}>
              writtenQuestions / {grade} / {subject} / {exam} / steps / {step}
            </p>
          )}
        </div>

        {/* SORU TİPLERİ */}
        {loading ? (
          <p style={{ color: "#8FB3D9", textAlign: "center" }}>Yükleniyor...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {QTYPES.map((qtype) => {
              const keys = sortedQKeys(qtype);
              const color = QTYPE_COLORS[qtype];
              return (
                <div key={qtype} style={{ background: "#2C335E", border: "1px solid #4A538E", borderRadius: 16, padding: 20 }}>
                  {/* Bölüm başlığı */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ background: color + "33", color, border: `1px solid ${color}55`, borderRadius: 8, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>
                        {QTYPE_LABELS[qtype]}
                      </span>
                      <span style={{ color: "#8FB3D9", fontSize: 14 }}>{keys.length} soru</span>
                      {saving && <span style={{ color: "#F3A24C", fontSize: 12 }}>Kaydediliyor...</span>}
                    </div>
                  </div>

                  {keys.length === 0 && (
                    <p style={{ color: "#4A538E", fontSize: 13, textAlign: "center", padding: "12px 0" }}>Bu tipte soru yok.</p>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {keys.map((id, idx) => {
                      const q = stepData[qtype]![id];
                      const isEditing = editing?.qtype === qtype && editing?.id === id;
                      const hasImage = qtype === "acikuclu" && !!(q as AcikUcluQ).imageRef;
                      return (
                        <div
                          key={id}
                          style={{
                            background: "#1A2550",
                            border: `1px solid ${isEditing ? "#F3A24C" : "#3A4480"}`,
                            borderRadius: 12,
                            padding: 14,
                            display: "flex",
                            gap: 10,
                          }}
                        >
                          {/* Sıralama okları */}
                          {!isEditing && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                              <button onClick={() => reorderQuestion(qtype, keys, idx, idx - 1)} disabled={idx === 0 || saving} style={arrowBtn(idx === 0 || saving)}>↑</button>
                              <button onClick={() => reorderQuestion(qtype, keys, idx, idx + 1)} disabled={idx === keys.length - 1 || saving} style={arrowBtn(idx === keys.length - 1 || saving)}>↓</button>
                            </div>
                          )}

                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                              <div style={{ flex: 1 }}>
                                <span style={{ fontSize: 11, color: "#4A538E", fontWeight: 700, marginRight: 8 }}>{id}</span>
                                {hasImage && <span style={{ fontSize: 11, background: "#0891B233", color: "#0891B2", border: "1px solid #0891B255", borderRadius: 6, padding: "1px 6px", marginRight: 8 }}>Görsel</span>}
                                <span style={{ fontSize: 13, color: "#C9D9F2" }}>{questionPreview(q, qtype)}</span>
                              </div>
                              {!isEditing && (
                                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                                  <button style={btn("#3A4480")} onClick={() => { setEditing({ qtype, id }); setEditForm(JSON.parse(JSON.stringify(q))); }}>Düzenle</button>
                                  <button style={btn("#7A2020")} onClick={() => deleteQuestion(qtype, id)}>Sil</button>
                                </div>
                              )}
                            </div>

                            {/* Görsel önizleme (düzenleme dışında) */}
                            {!isEditing && hasImage && (
                              <div style={{ marginTop: 10 }}>
                                <ImagePreview imageRef={(q as AcikUcluQ).imageRef!} />
                              </div>
                            )}

                            {/* Editör */}
                            {isEditing && editForm && (
                              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                                <QuestionEditor q={editForm} qtype={qtype} onChange={setEditForm} />
                                <div style={{ display: "flex", gap: 8 }}>
                                  <button style={btn()} onClick={() => saveEdit(qtype, id)}>Kaydet</button>
                                  <button style={btn("#4A538E")} onClick={() => setEditing(null)}>İptal</button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
