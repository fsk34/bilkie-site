// ⚠️ OTOMATİK KOPYA — elle değiştirme. Kaynak: functions/src/motor/gorev.ts (scripts/motor_esitle.sh)
// Görevler — Android domain/TaskManager.kt (applyEvent :686, taskTarget :471, olayIlgili :670) birebir.
// KARAR S3 (5 Eki: Hata Turu/Evde görev ilerletir) 6 Eki'de GERİ ALINDI: 1-2 tekrar sorusu ya da
// doğrulanamayan elle giriş "bugün çalıştım" sayılmaz → Hata Turu yalnız XP, Evde hiçbir şey.

import { ayNo, gunNo, isoHafta } from "./tarih";
import { dugum, tamSayi, type Dugum } from "./sayi";
import type { GorevDegisimi, GorevTanimi, Katalog, Yazilacak } from "./tipler";

export type GorevOlayTipi =
  | "NOTEBOOK_PAGES" | "NOTEBOOK_COMPLETE" | "TEST_FINISHED" | "YAZILI_COMPLETE"
  | "QUIZ_COMPLETE" | "GAME_PLAY";

export interface GorevOlayi {
  tip: GorevOlayTipi;
  correct?: number;
  total?: number;
  pagesDelta?: number;
  /** "ders/konu" — iç içe yol (Android child("ders/konu")) */
  notebookId?: string;
  testId?: string;
}

/* ------------------------------------------------------------------ katalog */

function tanimCoz(anahtar: string, ham: unknown): GorevTanimi | null {
  const c = dugum(ham);
  const id = typeof c.id === "string" && c.id ? c.id : anahtar;
  const title = typeof c.title === "string" ? c.title : "";
  const kind = typeof c.kind === "string" ? c.kind : "";
  if (!id || !title || !kind) return null;
  return { id, title, kind, xp: tamSayi(c.xp), params: dugum(c.params) };
}

function girdiler(ham: unknown): Array<[string, unknown]> {
  if (Array.isArray(ham)) return ham.map((v, i) => [String(i), v] as [string, unknown]).filter(([, v]) => v != null);
  return Object.entries(dugum(ham));
}

const donem = (c: unknown) => (typeof dugum(c).period === "string" ? (dugum(c).period as string).toLowerCase() : "");

/** Katalog ayı 1..12 ise 0-tabanlıya çevrilir (TaskManager.normalizeMonth0Based) */
const ay0 = (ham: number) => (ham >= 1 && ham <= 12 ? ham - 1 : ham);

/**
 * Olayın gününe göre geçerli tanımlar (taskCatalog/{daily,weekly,monthly} ham düğümleri).
 * Günlük: month (1-12) + day = gün · Haftalık: week = ISO hafta, Temmuz/Ağustos boş · Aylık: month = ay.
 */
export function katalogSec(ham: { daily?: unknown; weekly?: unknown; monthly?: unknown }, gun: string): Katalog {
  const ay = ayNo(gun), g = gunNo(gun), hafta = isoHafta(gun).hafta;
  const sec = (h: unknown, kosul: (c: Dugum) => boolean, d: string) =>
    girdiler(h)
      .filter(([, c]) => donem(c) === d && kosul(dugum(c)))
      .map(([k, c]) => tanimCoz(k, c))
      .filter((t): t is GorevTanimi => t !== null);
  return {
    gunluk: sec(ham.daily, (c) => tamSayi(c.month) === ay && tamSayi(c.day) === g, "daily"),
    haftalik: ay === 7 || ay === 8 ? [] : sec(ham.weekly, (c) => tamSayi(c.week) === hafta, "weekly"),
    aylik: sec(ham.monthly, (c) => ay0(tamSayi(c.month)) === ay - 1, "monthly"),
  };
}

/* -------------------------------------------------------------------- kurallar */

/** TaskManager.taskTarget — `a ?: b` yalnız alan YOKSA b'ye düşer. */
export function gorevHedefi(t: GorevTanimi): number {
  const p = t.params;
  const ya = (a: string, b: string) => tamSayi(p[a] !== undefined && p[a] !== null ? p[a] : p[b]);
  let h: number;
  switch (t.kind.toLowerCase()) {
    case "notebook_pages": h = tamSayi(p.pages); break;
    case "test_correct": h = tamSayi(p.minCorrect); break;
    case "notebook_complete": h = ya("count", "target"); break;
    case "take_test": h = ya("count", "target"); break;
    case "test_total_correct": h = ya("totalCorrect", "target"); break;
    case "test_wrong_max": h = 1; break;
    case "combo_defter_test": h = ya("count", "target"); break;
    case "yazili_complete": h = 1; break;
    case "yazili_correct": h = tamSayi(p.minCorrect); break;
    case "game_play": h = 1; break;
    case "quiz_complete": h = ya("count", "target"); break;
    case "streak_any": h = 1; break;
    case "weekly_active_days": h = tamSayi(p.days); break;
    default: h = 1;
  }
  return Math.max(1, h);
}

/** TaskManager.olayIlgili */
export function olayIlgili(kind: string, tip: GorevOlayTipi): boolean {
  switch (kind) {
    case "weekly_active_days": return true;
    case "streak_any": return tip !== "GAME_PLAY";
    case "notebook_pages": return tip === "NOTEBOOK_PAGES";
    case "notebook_complete": return tip === "NOTEBOOK_COMPLETE";
    case "combo_defter_test": return tip === "NOTEBOOK_COMPLETE" || tip === "TEST_FINISHED";
    case "take_test": case "test_correct": case "test_wrong_max": case "test_total_correct":
      return tip === "TEST_FINISHED";
    case "yazili_complete": case "yazili_correct": return tip === "YAZILI_COMPLETE";
    case "quiz_complete": return tip === "QUIZ_COMPLETE";
    case "game_play": return tip === "GAME_PLAY";
    default: return false;
  }
}

/* -------------------------------------------------------------------- uygulama */

export interface Bolum {
  tanimlar: GorevTanimi[];
  /** tasks/{G} · tasksWeekly/{hafta} · tasksMonthly/{ay} ham düğümü */
  durum: unknown;
  /** users/{uid}/tasks/{G} … */
  temelYol: string;
  /** gün / hafta / ay anahtarı (countedCombos için) */
  donemAnahtari: string;
}

export interface BolumSonucu {
  yeniBitenler: GorevTanimi[];
  /** işlem sonrası durum (Görev Dedektifi kontrolü için) */
  sonDurum: Dugum;
}

const bayrak = (st: Dugum, yol: string): boolean => {
  let v: unknown = st;
  for (const p of yol.split("/")) v = dugum(v)[p];
  return v === true;
};
const bayrakKoy = (st: Dugum, yol: string): void => {
  const parca = yol.split("/");
  let d = st;
  for (const p of parca.slice(0, -1)) {
    if (typeof d[p] !== "object" || d[p] === null) d[p] = {};
    d = d[p] as Dugum;
  }
  d[parca[parca.length - 1]!] = true;
};

/**
 * Bir dönemin görevlerini olay(lar)a göre ilerletir. Aynı olayda birden çok görev olayı olabilir
 * (defter: sayfa + ilk bitiş) — sırayla, aynı yerel durum üzerinde uygulanır.
 * `yaz` ve `farklar` yerinde doldurulur.
 */
export function bolumeUygula(
  b: Bolum, olaylar: GorevOlayi[], gun: string, simdiMs: number,
  yaz: Yazilacak, farklar: Map<string, GorevDegisimi>
): BolumSonucu {
  const durum: Dugum = structuredClone(dugum(b.durum));
  const yeniBitenler: GorevTanimi[] = [];

  for (const o of olaylar) {
    for (const def of b.tanimlar) {
      const kind = def.kind.toLowerCase();
      if (!olayIlgili(kind, o.tip)) continue;
      const hedef = gorevHedefi(def);
      const st: Dugum = dugum(durum[def.id]);
      durum[def.id] = st;
      const yol = `${b.temelYol}/${def.id}`;

      const curCompleted = st.completed === true;
      if (curCompleted) continue;                       // Transaction.abort
      const curProg = tamSayi(st.progress);
      let newProg = curProg;

      const sayilanKoy = (alt: string) => { bayrakKoy(st, alt); yaz[`${yol}/${alt}`] = true; };

      if (kind === "weekly_active_days") {
        const alt = `countedDays/${gun}`;
        if (!bayrak(st, alt)) { sayilanKoy(alt); newProg = Math.min(curProg + 1, hedef); }
      }

      let tamamlandi = false;
      if (kind === "streak_any" && o.tip !== "GAME_PLAY") {
        newProg = hedef;
        tamamlandi = true;
      }

      if (!tamamlandi) {
        switch (o.tip) {
          case "NOTEBOOK_PAGES":
            if (kind === "notebook_pages") newProg = Math.max(curProg + (o.pagesDelta ?? 0), curProg);
            break;
          case "NOTEBOOK_COMPLETE":
            if (kind === "notebook_complete") {
              if (o.notebookId) {
                const alt = `countedNotebooks/${o.notebookId}`;
                if (!bayrak(st, alt)) { sayilanKoy(alt); newProg = Math.min(curProg + 1, hedef); }
              } else newProg = Math.max(curProg, 1);
            }
            if (kind === "combo_defter_test") {
              st.comboSeenDefter = true; yaz[`${yol}/comboSeenDefter`] = true;
              if (st.comboSeenTest === true) {
                const alt = `countedCombos/${b.donemAnahtari}`;
                if (!bayrak(st, alt)) { sayilanKoy(alt); newProg = Math.min(curProg + 1, hedef); }
              }
            }
            break;
          case "TEST_FINISHED": {
            const c = Math.max(0, o.correct ?? 0), t = Math.max(0, o.total ?? 0);
            if (kind === "take_test") {
              if (o.testId) {
                const alt = `countedTests/${o.testId}`;
                if (!bayrak(st, alt)) { sayilanKoy(alt); newProg = Math.min(curProg + 1, hedef); }
              } else newProg = Math.min(curProg + 1, hedef);
            }
            if (kind === "test_correct") newProg = Math.max(curProg, c);
            if (kind === "test_wrong_max") {
              const maxWrong = Math.max(0, tamSayi(def.params.maxWrong));
              newProg = Math.max(0, t - c) <= maxWrong ? 1 : 0;
            }
            if (kind === "test_total_correct") newProg = Math.min(curProg + c, hedef);
            if (kind === "combo_defter_test") {
              st.comboSeenTest = true; yaz[`${yol}/comboSeenTest`] = true;
              if (st.comboSeenDefter === true) {
                const alt = `countedCombos/${b.donemAnahtari}`;
                if (!bayrak(st, alt)) { sayilanKoy(alt); newProg = Math.min(curProg + 1, hedef); }
              }
            }
            break;
          }
          case "YAZILI_COMPLETE":
            if (kind === "yazili_complete") newProg = 1;
            if (kind === "yazili_correct") newProg = Math.max(curProg, Math.max(0, o.correct ?? 0));
            break;
          case "QUIZ_COMPLETE":
            if (kind === "quiz_complete") newProg = Math.min(hedef, curProg + 1);
            break;
          case "GAME_PLAY":
            if (kind === "game_play") newProg = 1;
            break;
        }
      }

      newProg = Math.min(Math.max(newProg, 0), hedef);
      const done = newProg >= hedef;
      const ilerledi = newProg > curProg || (done && !curCompleted);

      st.progress = newProg; st.target = hedef; st.completed = done;
      yaz[`${yol}/progress`] = newProg;
      yaz[`${yol}/target`] = hedef;
      yaz[`${yol}/completed`] = done;
      if (done) { st.completedAt = simdiMs; yaz[`${yol}/completedAt`] = simdiMs; }

      if (ilerledi) {
        const eski = farklar.get(def.id);
        farklar.set(def.id, { id: def.id, onceki: eski?.onceki ?? curProg, yeni: newProg, hedef, bitti: done });
      }
      if (done) yeniBitenler.push(def);               // completed && !wasCompletedBefore
    }
  }
  return { yeniBitenler, sonDurum: durum };
}

/** Günün TÜM görevleri bitti mi (Görev Dedektifi) — ResultScreens.kt:827 */
export function hepsiBitti(tanimlar: GorevTanimi[], durum: Dugum): boolean {
  if (tanimlar.length === 0) return false;
  return tanimlar.every((t) => {
    const st = dugum(durum[t.id]);
    return st.completed === true || tamSayi(st.progress) >= gorevHedefi(t);
  });
}
