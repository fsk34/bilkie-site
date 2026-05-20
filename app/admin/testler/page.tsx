"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ref, get, set, remove } from "firebase/database";
import { signOut } from "firebase/auth";
import { auth, db } from "../../lib/firebase";

const GRADES = ["grade3", "grade4", "grade5", "grade6", "grade7", "grade8"];
const GRADE_LABELS: Record<string, string> = {
  grade3: "3. Sınıf", grade4: "4. Sınıf", grade5: "5. Sınıf",
  grade6: "6. Sınıf", grade7: "7. Sınıf", grade8: "8. Sınıf",
};
const SUBJECTS = ["fen", "ingilizce", "matematik", "sosyal", "turkce"];
const SUBJECT_LABELS: Record<string, string> = {
  fen: "Fen Bilimleri", ingilizce: "İngilizce",
  matematik: "Matematik", sosyal: "Sosyal Bilgiler", turkce: "Türkçe",
};
const TESTS = Array.from({ length: 25 }, (_, i) => `t${i + 1}`);
const SECTIONS = ["s1", "s2", "s3"];

type Question = { text: string; options: string[]; correct: number };
type QuestionsMap = Record<string, Question>;

const EMPTY_Q: Question = { text: "", options: ["", "", "", ""], correct: 0 };

function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

const select: React.CSSProperties = {
  background: "#1A2550",
  color: "#EAF2FF",
  border: "1px solid #4A538E",
  borderRadius: 10,
  padding: "8px 12px",
  fontSize: 14,
  cursor: "pointer",
  outline: "none",
};

const btn = (color = "#F3A24C"): React.CSSProperties => ({
  background: color,
  color: color === "#F3A24C" ? "#0C1A3F" : "#EAF2FF",
  border: "none",
  borderRadius: 999,
  padding: "7px 18px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
});

const input: React.CSSProperties = {
  background: "#1A2550",
  color: "#EAF2FF",
  border: "1px solid #4A538E",
  borderRadius: 10,
  padding: "8px 12px",
  fontSize: 14,
  width: "100%",
  outline: "none",
  boxSizing: "border-box",
};

function QuestionForm({
  form,
  onChange,
  onSave,
  onCancel,
  saveLabel,
}: {
  form: Question;
  onChange: (q: Question) => void;
  onSave: () => void;
  onCancel: () => void;
  saveLabel: string;
}) {
  function setOption(i: number, val: string) {
    const opts = [...form.options];
    opts[i] = val;
    onChange({ ...form, options: opts });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
      <input
        style={input}
        placeholder="Soru metni"
        value={form.text}
        onChange={(e) => onChange({ ...form, text: e.target.value })}
      />
      {form.options.map((opt, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="radio"
            name="correct"
            checked={form.correct === i}
            onChange={() => onChange({ ...form, correct: i })}
            style={{ accentColor: "#F3A24C", width: 16, height: 16, cursor: "pointer", flexShrink: 0 }}
          />
          <input
            style={input}
            placeholder={`Şık ${i + 1}`}
            value={opt}
            onChange={(e) => setOption(i, e.target.value)}
          />
        </div>
      ))}
      <p style={{ color: "#8FB3D9", fontSize: 12, marginTop: -4 }}>
        Dolu daire = doğru cevap
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <button style={btn()} onClick={onSave}>{saveLabel}</button>
        <button style={btn("#4A538E")} onClick={onCancel}>İptal</button>
      </div>
    </div>
  );
}

export default function TestlerPage() {
  const router = useRouter();
  const [grade, setGrade] = useState("grade3");
  const [subject, setSubject] = useState("fen");
  const [test, setTest] = useState("t1");
  const [section, setSection] = useState("s1");

  const [questions, setQuestions] = useState<QuestionsMap | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Question>(EMPTY_Q);

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<Question>(EMPTY_Q);

  useEffect(() => {
    loadQuestions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grade, subject, test, section]);

  async function loadQuestions() {
    setLoading(true);
    setEditingId(null);
    setShowAdd(false);
    const snap = await get(ref(db, `tests/${grade}/${subject}/${test}/${section}`));
    setQuestions(snap.exists() ? snap.val() : {});
    setLoading(false);
  }

  async function saveEdit(id: string) {
    setSaving(true);
    await set(ref(db, `tests/${grade}/${subject}/${test}/${section}/${id}`), editForm);
    setEditingId(null);
    await loadQuestions();
    setSaving(false);
  }

  async function deleteQuestion(id: string) {
    if (!confirm(`"${questions?.[id]?.text?.slice(0, 40)}..." sorusunu silmek istiyor musunuz?`)) return;
    setSaving(true);
    await remove(ref(db, `tests/${grade}/${subject}/${test}/${section}/${id}`));
    await loadQuestions();
    setSaving(false);
  }

  async function addQuestion() {
    const existing = Object.keys(questions || {});
    const maxNum = existing.reduce((max, k) => {
      const n = parseInt(k.replace("q", ""), 10);
      return isNaN(n) ? max : Math.max(max, n);
    }, 0);
    const newKey = `q${maxNum + 1}`;
    setSaving(true);
    await set(ref(db, `tests/${grade}/${subject}/${test}/${section}/${newKey}`), addForm);
    setShowAdd(false);
    setAddForm(clone(EMPTY_Q));
    await loadQuestions();
    setSaving(false);
  }

  const sortedKeys = Object.keys(questions || {}).sort((a, b) => {
    const na = parseInt(a.replace("q", ""), 10);
    const nb = parseInt(b.replace("q", ""), 10);
    return na - nb;
  });

  return (
    <main style={{ minHeight: "100vh", background: "#0C1A3F", color: "#EAF2FF", padding: "24px 16px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>

        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#8FB3D9", letterSpacing: -0.5 }}>
            bilkie <span style={{ color: "#4A538E", fontWeight: 400, fontSize: 16 }}>/ yönetici</span>
          </h1>
          <button
            style={btn("#4A538E")}
            onClick={async () => { await signOut(auth); router.replace("/admin/login"); }}
          >
            Çıkış Yap
          </button>
        </div>

        {/* NAVİGASYON */}
        <div style={{ background: "#2C335E", border: "1px solid #4A538E", borderRadius: 16, padding: 20, marginBottom: 24 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, color: "#8FB3D9", textTransform: "uppercase", letterSpacing: 0.5 }}>Sınıf</label>
              <select style={select} value={grade} onChange={(e) => setGrade(e.target.value)}>
                {GRADES.map((g) => <option key={g} value={g}>{GRADE_LABELS[g]}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, color: "#8FB3D9", textTransform: "uppercase", letterSpacing: 0.5 }}>Ders</label>
              <select style={select} value={subject} onChange={(e) => setSubject(e.target.value)}>
                {SUBJECTS.map((s) => <option key={s} value={s}>{SUBJECT_LABELS[s]}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, color: "#8FB3D9", textTransform: "uppercase", letterSpacing: 0.5 }}>Test</label>
              <select style={select} value={test} onChange={(e) => setTest(e.target.value)}>
                {TESTS.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, color: "#8FB3D9", textTransform: "uppercase", letterSpacing: 0.5 }}>Bölüm</label>
              <select style={select} value={section} onChange={(e) => setSection(e.target.value)}>
                {SECTIONS.map((s) => <option key={s} value={s}>{s.toUpperCase()}</option>)}
              </select>
            </div>
          </div>
          <p style={{ marginTop: 12, fontSize: 12, color: "#4A538E" }}>
            tests / {grade} / {subject} / {test} / {section}
          </p>
        </div>

        {/* SORULAR */}
        <div style={{ background: "#2C335E", border: "1px solid #4A538E", borderRadius: 16, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#C9D9F2" }}>
              {loading ? "Yükleniyor..." : `${sortedKeys.length} Soru`}
              {saving && <span style={{ color: "#F3A24C", fontSize: 13, marginLeft: 8 }}>Kaydediliyor...</span>}
            </h2>
            {!showAdd && (
              <button style={btn()} onClick={() => { setShowAdd(true); setAddForm(clone(EMPTY_Q)); }}>
                + Yeni Soru
              </button>
            )}
          </div>

          {/* YENİ SORU FORMU */}
          {showAdd && (
            <div style={{ background: "#1A2550", border: "1px solid #F3A24C", borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: "#F3A24C", fontWeight: 700, marginBottom: 8 }}>Yeni Soru</p>
              <QuestionForm
                form={addForm}
                onChange={setAddForm}
                onSave={addQuestion}
                onCancel={() => setShowAdd(false)}
                saveLabel="Ekle"
              />
            </div>
          )}

          {/* SORU LİSTESİ */}
          {!loading && sortedKeys.length === 0 && (
            <p style={{ color: "#4A538E", fontSize: 14, textAlign: "center", padding: "24px 0" }}>
              Bu bölümde henüz soru yok.
            </p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sortedKeys.map((id) => {
              const q = questions![id];
              const isEditing = editingId === id;
              return (
                <div
                  key={id}
                  style={{
                    background: "#1A2550",
                    border: `1px solid ${isEditing ? "#F3A24C" : "#3A4480"}`,
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 11, color: "#4A538E", fontWeight: 700, textTransform: "uppercase", marginRight: 8 }}>
                        {id}
                      </span>
                      <span style={{ fontSize: 14, color: "#EAF2FF" }}>{q.text}</span>
                    </div>
                    {!isEditing && (
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button
                          style={btn("#3A4480")}
                          onClick={() => { setEditingId(id); setEditForm(clone(q)); }}
                        >
                          Düzenle
                        </button>
                        <button
                          style={btn("#7A2020")}
                          onClick={() => deleteQuestion(id)}
                        >
                          Sil
                        </button>
                      </div>
                    )}
                  </div>

                  {!isEditing && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                      {q.options.map((opt, i) => (
                        <span
                          key={i}
                          style={{
                            background: i === q.correct ? "#1E4A1E" : "#2C335E",
                            border: `1px solid ${i === q.correct ? "#4CAF50" : "#4A538E"}`,
                            borderRadius: 8,
                            padding: "4px 10px",
                            fontSize: 12,
                            color: i === q.correct ? "#7CFC00" : "#C9D9F2",
                          }}
                        >
                          {i === q.correct ? "✓ " : ""}{opt}
                        </span>
                      ))}
                    </div>
                  )}

                  {isEditing && (
                    <QuestionForm
                      form={editForm}
                      onChange={setEditForm}
                      onSave={() => saveEdit(id)}
                      onCancel={() => setEditingId(null)}
                      saveLabel="Kaydet"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
