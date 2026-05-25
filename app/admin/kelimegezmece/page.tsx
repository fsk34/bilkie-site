"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ref, get, set, remove } from "firebase/database";
import { signOut } from "firebase/auth";
import { auth, kelimeGezmeceDb } from "../../lib/firebase";

type Dir = "right" | "down";
type WordInfo = { row: number; col: number; dir: Dir };
type Level = {
  letters: string[];
  words: Record<string, WordInfo>;
  bonus: string[];
};

const NAV = [
  { label: "Testler", path: "/admin/testler" },
  { label: "Defterler", path: "/admin/defterler" },
  { label: "Yazılılar", path: "/admin/yazililar" },
  { label: "Kelime Gezmece", path: "/admin/kelimegezmece" },
];

const WORD_COLORS = [
  "#F3A24C","#4FC3F7","#81C784","#F06292","#CE93D8",
  "#FFD54F","#4DB6AC","#FF8A65","#90CAF9","#A5D6A7",
];

function GridPreview({
  words, activeWord, onWordClick,
}: {
  words: Record<string, WordInfo>;
  activeWord: string | null;
  onWordClick: (w: string) => void;
}) {
  if (!Object.keys(words).length) return null;

  // Hücre haritası: "r,c" → [kelime]
  const cellMap = new Map<string, string[]>();
  const wordList = Object.keys(words);
  const colorMap: Record<string, string> = {};
  wordList.forEach((w, i) => { colorMap[w] = WORD_COLORS[i % WORD_COLORS.length]; });

  for (const [word, info] of Object.entries(words)) {
    for (let i = 0; i < word.length; i++) {
      const r = info.row + (info.dir === "down" ? i : 0);
      const c = info.col + (info.dir === "right" ? i : 0);
      const key = `${r},${c}`;
      if (!cellMap.has(key)) cellMap.set(key, []);
      cellMap.get(key)!.push(word);
    }
  }

  // Sınır
  const rows = [...cellMap.keys()].map(k => parseInt(k.split(",")[0]));
  const cols = [...cellMap.keys()].map(k => parseInt(k.split(",")[1]));
  const minR = Math.min(...rows) - 1, maxR = Math.max(...rows) + 1;
  const minC = Math.min(...cols) - 1, maxC = Math.max(...cols) + 1;

  const CELL = 36;

  return (
    <div style={{ overflowX: "auto", paddingBottom: 8 }}>
      <div style={{ display: "inline-block", background: "#0C1A3F", borderRadius: 12, padding: 12 }}>
        {Array.from({ length: maxR - minR + 1 }, (_, ri) => {
          const r = minR + ri;
          return (
            <div key={r} style={{ display: "flex" }}>
              {Array.from({ length: maxC - minC + 1 }, (_, ci) => {
                const c = minC + ci;
                const key = `${r},${c}`;
                const cellWords = cellMap.get(key) ?? [];
                const isEmpty = cellWords.length === 0;
                const isActive = activeWord ? cellWords.includes(activeWord) : false;
                const isIntersect = cellWords.length > 1;
                // Baskın renk
                const baseColor = cellWords[0] ? colorMap[cellWords[0]] : "transparent";
                const letter = (() => {
                  if (!cellWords[0]) return "";
                  const w = cellWords[0];
                  const info = words[w];
                  const idx = info.dir === "right" ? c - info.col : r - info.row;
                  return w[idx]?.toUpperCase() ?? "";
                })();

                return (
                  <div
                    key={c}
                    onClick={() => cellWords[0] && onWordClick(cellWords[0])}
                    style={{
                      width: CELL, height: CELL,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      margin: 2, borderRadius: 8,
                      cursor: cellWords[0] ? "pointer" : "default",
                      background: isEmpty ? "#1A2550" : isActive ? baseColor : `${baseColor}55`,
                      border: isIntersect
                        ? "2px solid #FFFFFF88"
                        : isActive
                        ? `2px solid ${baseColor}`
                        : isEmpty
                        ? "1px solid #2C335E"
                        : `1px solid ${baseColor}88`,
                      transition: "all 0.15s",
                      fontSize: 15, fontWeight: 800,
                      color: isEmpty ? "#2C335E" : isActive ? "#0C1A3F" : "#EAF2FF",
                      boxSizing: "border-box",
                    }}
                    title={cellWords.join(" + ")}
                  >
                    {isEmpty ? "·" : letter}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const sel: React.CSSProperties = {
  background: "#1A2550", color: "#EAF2FF", border: "1px solid #4A538E",
  borderRadius: 10, padding: "8px 12px", fontSize: 14, cursor: "pointer", outline: "none",
};
const inp: React.CSSProperties = {
  background: "#1A2550", color: "#EAF2FF", border: "1px solid #4A538E",
  borderRadius: 10, padding: "8px 12px", fontSize: 14, outline: "none",
  boxSizing: "border-box",
};
const btn = (bg = "#F3A24C"): React.CSSProperties => ({
  background: bg, color: bg === "#F3A24C" ? "#0C1A3F" : "#EAF2FF",
  border: "none", borderRadius: 999, padding: "7px 18px",
  fontSize: 13, fontWeight: 700, cursor: "pointer",
});

function getPositions(word: string, row: number, col: number, dir: Dir) {
  const map = new Map<string, string>();
  for (let i = 0; i < word.length; i++) {
    const r = row + (dir === "down" ? i : 0);
    const c = col + (dir === "right" ? i : 0);
    map.set(`${r},${c}`, word[i]);
  }
  return map;
}

function checkConflicts(words: Record<string, WordInfo>): string | null {
  const allPos = new Map<string, string>();
  for (const [word, info] of Object.entries(words)) {
    for (const [key, ch] of getPositions(word, info.row, info.col, info.dir)) {
      if (allPos.has(key) && allPos.get(key) !== ch)
        return `"${word}" çakışıyor (${key}): "${allPos.get(key)}" vs "${ch}"`;
      allPos.set(key, ch);
    }
  }
  return null;
}

const EMPTY_INFO: WordInfo = { row: 0, col: 0, dir: "right" };

function WordForm({
  wordKey, wordInfo, onChangeKey, onChangeInfo, onSave, onCancel, saveLabel,
}: {
  wordKey: string; wordInfo: WordInfo;
  onChangeKey: (k: string) => void; onChangeInfo: (i: WordInfo) => void;
  onSave: () => void; onCancel: () => void; saveLabel: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 11, color: "#8FB3D9" }}>Kelime</label>
          <input
            style={{ ...inp, width: 130 }}
            value={wordKey}
            onChange={e => onChangeKey(e.target.value.toLowerCase())}
            placeholder="tablo"
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 11, color: "#8FB3D9" }}>Row</label>
          <input
            style={{ ...inp, width: 72 }}
            type="number"
            value={wordInfo.row}
            onChange={e => onChangeInfo({ ...wordInfo, row: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 11, color: "#8FB3D9" }}>Col</label>
          <input
            style={{ ...inp, width: 72 }}
            type="number"
            value={wordInfo.col}
            onChange={e => onChangeInfo({ ...wordInfo, col: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 11, color: "#8FB3D9" }}>Yön</label>
          <select
            style={sel}
            value={wordInfo.dir}
            onChange={e => onChangeInfo({ ...wordInfo, dir: e.target.value as Dir })}
          >
            <option value="right">→ sağ</option>
            <option value="down">↓ aşağı</option>
          </select>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button style={btn()} onClick={onSave}>{saveLabel}</button>
        <button style={btn("#4A538E")} onClick={onCancel}>İptal</button>
      </div>
    </div>
  );
}

export default function KelimeGezmeceAdminPage() {
  const router = useRouter();

  const [levelKeys, setLevelKeys] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [level, setLevel] = useState<Level | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Letters
  const [editingLetters, setEditingLetters] = useState(false);
  const [lettersInput, setLettersInput] = useState("");

  // Word edit
  const [editingWord, setEditingWord] = useState<string | null>(null);
  const [editKey, setEditKey] = useState("");
  const [editInfo, setEditInfo] = useState<WordInfo>(EMPTY_INFO);

  // Add word
  const [showAdd, setShowAdd] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newInfo, setNewInfo] = useState<WordInfo>(EMPTY_INFO);

  // Grid
  const [activeWord, setActiveWord] = useState<string | null>(null);

  // Add level
  const [showAddLevel, setShowAddLevel] = useState(false);
  const [newLevelNum, setNewLevelNum] = useState("");
  const [newLevelLetters, setNewLevelLetters] = useState("");

  useEffect(() => { loadKeys(); }, []);
  useEffect(() => { if (selected) loadLevel(selected); }, [selected]);

  async function loadKeys() {
    setLoading(true);
    try {
      const snap = await get(ref(kelimeGezmeceDb, "levels"));
      if (snap.exists()) {
        const keys = Object.keys(snap.val()).sort((a, b) => {
          const na = parseInt(a.replace("level_", ""), 10);
          const nb = parseInt(b.replace("level_", ""), 10);
          return na - nb;
        });
        setLevelKeys(keys);
        setSelected(prev => prev || keys[0] || "");
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadLevel(key: string) {
    setLoading(true);
    setEditingLetters(false);
    setEditingWord(null);
    setShowAdd(false);
    setError("");
    try {
      const snap = await get(ref(kelimeGezmeceDb, `levels/${key}`));
      setLevel(snap.exists() ? snap.val() : null);
    } finally {
      setLoading(false);
    }
  }

  async function saveLetters() {
    if (!selected || !level) return;
    const letters = lettersInput.split(",").map(l => l.trim().toLowerCase()).filter(Boolean);
    if (!letters.length) return;
    setSaving(true);
    await set(ref(kelimeGezmeceDb, `levels/${selected}/letters`), letters);
    setLevel({ ...level, letters });
    setEditingLetters(false);
    setSaving(false);
  }

  async function saveWord(oldWord: string) {
    if (!selected || !level || !editKey.trim()) return;
    const newWords = { ...level.words };
    if (oldWord !== editKey) delete newWords[oldWord];
    newWords[editKey] = editInfo;
    const conflict = checkConflicts(newWords);
    if (conflict) { setError(conflict); return; }
    setError("");
    setSaving(true);
    if (oldWord !== editKey)
      await remove(ref(kelimeGezmeceDb, `levels/${selected}/words/${oldWord}`));
    await set(ref(kelimeGezmeceDb, `levels/${selected}/words/${editKey}`), editInfo);
    setLevel({ ...level, words: newWords });
    setEditingWord(null);
    setSaving(false);
  }

  async function deleteWord(word: string) {
    if (!selected || !level) return;
    if (!confirm(`"${word}" kelimesini silmek istiyor musunuz?`)) return;
    setSaving(true);
    await remove(ref(kelimeGezmeceDb, `levels/${selected}/words/${word}`));
    const newWords = { ...level.words };
    delete newWords[word];
    setLevel({ ...level, words: newWords });
    setSaving(false);
  }

  async function addWord() {
    if (!selected || !level || !newKey.trim()) return;
    const trimmed = newKey.trim().toLowerCase();
    const newWords = { ...level.words, [trimmed]: newInfo };
    const conflict = checkConflicts(newWords);
    if (conflict) { setError(conflict); return; }
    setError("");
    setSaving(true);
    await set(ref(kelimeGezmeceDb, `levels/${selected}/words/${trimmed}`), newInfo);
    setLevel({ ...level, words: newWords });
    setShowAdd(false);
    setNewKey("");
    setNewInfo(EMPTY_INFO);
    setSaving(false);
  }

  async function deleteLevel() {
    if (!selected) return;
    if (!confirm(`"${selected}" levelını tamamen silmek istiyor musunuz?`)) return;
    setSaving(true);
    await remove(ref(kelimeGezmeceDb, `levels/${selected}`));
    const newKeys = levelKeys.filter(k => k !== selected);
    setLevelKeys(newKeys);
    setSelected(newKeys[0] || "");
    setLevel(null);
    setSaving(false);
  }

  async function addLevel() {
    const num = newLevelNum.trim();
    if (!num) return;
    const key = num.startsWith("level_") ? num : `level_${num}`;
    if (levelKeys.includes(key)) { setError("Bu level zaten var."); return; }
    const letters = newLevelLetters.split(",").map(l => l.trim().toLowerCase()).filter(Boolean);
    const newLvl: Level = { letters, words: {}, bonus: [] };
    setSaving(true);
    await set(ref(kelimeGezmeceDb, `levels/${key}`), newLvl);
    const newKeys = [...levelKeys, key].sort((a, b) => {
      const na = parseInt(a.replace("level_", ""), 10);
      const nb = parseInt(b.replace("level_", ""), 10);
      return isNaN(na) || isNaN(nb) ? a.localeCompare(b) : na - nb;
    });
    setLevelKeys(newKeys);
    setSelected(key);
    setShowAddLevel(false);
    setNewLevelNum("");
    setNewLevelLetters("");
    setError("");
    setSaving(false);
  }

  const sortedWords = level
    ? Object.entries(level.words).sort((a, b) =>
        a[1].row !== b[1].row ? a[1].row - b[1].row : a[1].col - b[1].col
      )
    : [];

  const wordColorMap = Object.fromEntries(
    sortedWords.map(([w], i) => [w, WORD_COLORS[i % WORD_COLORS.length]])
  );

  return (
    <main style={{ minHeight: "100vh", background: "#0C1A3F", color: "#EAF2FF", padding: "24px 16px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#8FB3D9", letterSpacing: -0.5 }}>
            bilkie <span style={{ color: "#4A538E", fontWeight: 400, fontSize: 16 }}>/ yönetici</span>
          </h1>
          <button style={btn("#4A538E")} onClick={async () => { await signOut(auth); router.replace("/admin/login"); }}>
            Çıkış Yap
          </button>
        </div>

        {/* Nav */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          {NAV.map(({ label, path }) => (
            <button key={path} style={btn(path === "/admin/kelimegezmece" ? "#F3A24C" : "#3A4480")} onClick={() => router.push(path)}>
              {label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "#3A1010", border: "1px solid #7A2020", borderRadius: 12, padding: "12px 16px", marginBottom: 16, color: "#FF8080", fontSize: 13 }}>
            ⚠ {error}
            <button style={{ marginLeft: 12, background: "none", border: "none", color: "#FF8080", cursor: "pointer", fontSize: 13 }} onClick={() => setError("")}>✕</button>
          </div>
        )}

        {/* Level Seçici */}
        <div style={{ background: "#2C335E", border: "1px solid #4A538E", borderRadius: 16, padding: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, color: "#8FB3D9", textTransform: "uppercase", letterSpacing: 0.5 }}>Level</label>
              <select style={sel} value={selected} onChange={e => setSelected(e.target.value)}>
                {levelKeys.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <button style={btn()} onClick={() => setShowAddLevel(v => !v)}>+ Yeni Level</button>
            {selected && (
              <button style={btn("#7A2020")} onClick={deleteLevel}>Level Sil</button>
            )}
          </div>
          <p style={{ marginTop: 10, fontSize: 12, color: "#4A538E" }}>
            levels / {selected} — Toplam {levelKeys.length} level
            {saving && <span style={{ color: "#F3A24C", marginLeft: 10 }}>Kaydediliyor...</span>}
          </p>
        </div>

        {/* Yeni Level Formu */}
        {showAddLevel && (
          <div style={{ background: "#2C335E", border: "1px solid #F3A24C", borderRadius: 16, padding: 20, marginBottom: 20 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#F3A24C", marginBottom: 12 }}>Yeni Level</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: "#8FB3D9", display: "block", marginBottom: 4 }}>Level numarası</label>
                <input style={{ ...inp, width: 200 }} placeholder="101" value={newLevelNum} onChange={e => setNewLevelNum(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#8FB3D9", display: "block", marginBottom: 4 }}>Harfler (virgülle: t,a,b,l,o)</label>
                <input style={{ ...inp, width: "100%", maxWidth: 400 }} placeholder="t,a,b,l,o" value={newLevelLetters} onChange={e => setNewLevelLetters(e.target.value)} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={btn()} onClick={addLevel}>Oluştur</button>
                <button style={btn("#4A538E")} onClick={() => setShowAddLevel(false)}>İptal</button>
              </div>
            </div>
          </div>
        )}

        {loading && <p style={{ color: "#8FB3D9", textAlign: "center", padding: 24 }}>Yükleniyor...</p>}

        {!loading && level && (
          <>
            {/* Harfler */}
            <div style={{ background: "#2C335E", border: "1px solid #4A538E", borderRadius: 16, padding: 20, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "#C9D9F2" }}>
                  Harfler ({level.letters.length})
                </h2>
                {!editingLetters && (
                  <button style={btn("#3A4480")} onClick={() => { setLettersInput(level.letters.join(",")); setEditingLetters(true); }}>
                    Düzenle
                  </button>
                )}
              </div>
              {!editingLetters ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {level.letters.map((l, i) => (
                    <span key={i} style={{ background: "#1A2550", border: "1px solid #4A538E", borderRadius: 10, padding: "8px 16px", fontSize: 22, fontWeight: 800, color: "#EAF2FF", letterSpacing: 1, minWidth: 44, textAlign: "center" }}>
                      {l.toUpperCase()}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input style={{ ...inp, maxWidth: 400 }} value={lettersInput} onChange={e => setLettersInput(e.target.value)} placeholder="t,a,b,l,o" />
                  <p style={{ fontSize: 12, color: "#8FB3D9" }}>Harfleri virgülle ayırın. Tekrar eden harfleri ayrı yazın: ş,a,p,k,a</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={btn()} onClick={saveLetters}>Kaydet</button>
                    <button style={btn("#4A538E")} onClick={() => setEditingLetters(false)}>İptal</button>
                  </div>
                </div>
              )}
            </div>

            {/* Grid Önizleme */}
            {level && Object.keys(level.words).length > 0 && (
              <div style={{ background: "#2C335E", border: "1px solid #4A538E", borderRadius: 16, padding: 20, marginBottom: 16 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "#C9D9F2", marginBottom: 14 }}>
                  Grid Önizleme
                  {activeWord && (
                    <span style={{ fontSize: 12, color: "#F3A24C", marginLeft: 10, fontWeight: 400 }}>
                      seçili: {activeWord}
                      <button onClick={() => setActiveWord(null)} style={{ marginLeft: 8, background: "none", border: "none", color: "#8FB3D9", cursor: "pointer", fontSize: 12 }}>✕</button>
                    </span>
                  )}
                </h2>
                <GridPreview
                  words={level.words}
                  activeWord={activeWord}
                  onWordClick={(w) => {
                    setActiveWord(w);
                    setEditingWord(w);
                    setEditKey(w);
                    setEditInfo({ ...level.words[w] });
                    setShowAdd(false);
                  }}
                />
                <p style={{ fontSize: 11, color: "#4A538E", marginTop: 10 }}>
                  Hücreye tıklayarak kelimeyi seçin ve aşağıdan düzenleyin. Beyaz kenarlık = iki kelimenin kesişimi.
                </p>
              </div>
            )}

            {/* Kelimeler */}
            <div style={{ background: "#2C335E", border: "1px solid #4A538E", borderRadius: 16, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "#C9D9F2" }}>
                  Kelimeler ({sortedWords.length})
                </h2>
                {!showAdd && (
                  <button style={btn()} onClick={() => setShowAdd(true)}>+ Kelime Ekle</button>
                )}
              </div>

              {/* Kelime Ekle Formu */}
              {showAdd && (
                <div style={{ background: "#1A2550", border: "1px solid #F3A24C", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#F3A24C", marginBottom: 10 }}>Yeni Kelime</p>
                  <WordForm
                    wordKey={newKey} wordInfo={newInfo}
                    onChangeKey={setNewKey} onChangeInfo={setNewInfo}
                    onSave={addWord}
                    onCancel={() => { setShowAdd(false); setNewKey(""); setNewInfo(EMPTY_INFO); }}
                    saveLabel="Ekle"
                  />
                </div>
              )}

              {sortedWords.length === 0 && !showAdd && (
                <p style={{ color: "#4A538E", textAlign: "center", padding: "20px 0" }}>Bu level'da henüz kelime yok.</p>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {sortedWords.map(([word, info]) => {
                  const isEditing = editingWord === word;
                  return (
                    <div
                      key={word}
                      onClick={() => !isEditing && setActiveWord(word === activeWord ? null : word)}
                      style={{ background: "#1A2550", border: `1px solid ${isEditing ? "#F3A24C" : word === activeWord ? wordColorMap[word] : "#3A4480"}`, borderRadius: 12, padding: 14, cursor: isEditing ? "default" : "pointer" }}
                    >
                      {isEditing ? (
                        <>
                          <p style={{ fontSize: 12, color: "#F3A24C", fontWeight: 700, marginBottom: 10 }}>Düzenleniyor: {word}</p>
                          <WordForm
                            wordKey={editKey} wordInfo={editInfo}
                            onChangeKey={setEditKey} onChangeInfo={setEditInfo}
                            onSave={() => saveWord(word)}
                            onCancel={() => setEditingWord(null)}
                            saveLabel="Kaydet"
                          />
                        </>
                      ) : (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                            <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: wordColorMap[word], flexShrink: 0 }} />
                            <span style={{ fontSize: 17, fontWeight: 800, color: "#EAF2FF", minWidth: 90 }}>
                              {word}
                            </span>
                            <span style={{ fontSize: 12, color: "#8FB3D9", background: "#2C335E", borderRadius: 6, padding: "3px 10px" }}>
                              {info.dir === "right" ? "→" : "↓"} row={info.row} col={info.col}
                            </span>
                          </div>
                          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                            <button
                              style={btn("#3A4480")}
                              onClick={() => { setEditingWord(word); setEditKey(word); setEditInfo({ ...info }); }}
                            >
                              Düzenle
                            </button>
                            <button style={btn("#7A2020")} onClick={() => deleteWord(word)}>
                              Sil
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
