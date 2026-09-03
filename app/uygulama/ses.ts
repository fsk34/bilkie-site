// Uygulamadaki SoundManager'ın web karşılığı — aynı mp3 dosyaları.
// Tarayıcı otomatik oynatmayı engelleyebilir (kullanıcı henüz tıklamadıysa);
// bu durumda sessizce vazgeçilir, akış bozulmaz.

const onbellek = new Map<string, HTMLAudioElement>();

export type SesAdi =
  | "dogru" | "yanlis" | "result" | "streak"
  | "t2048_pop" | "t2048_kaydirma"
  | "bb_alma" | "bb_yerlestir"
  | "bb_combo1" | "bb_combo2" | "bb_combo3" | "bb_combo4"
  | "wordle_harf" | "wordle_dogruharf" | "wordle_levelcompleted"
  | "levelcompleted"
  | "note_do" | "note_re" | "note_mi" | "note_fa" | "note_sol"
  | "note_la" | "note_si" | "note_do2" | "note_re2" | "note_mi3";

export function sesCal(ad: SesAdi, sesSeviyesi = 0.7) {
  if (typeof window === "undefined") return;
  try {
    let a = onbellek.get(ad);
    if (!a) {
      a = new Audio(`/uygulama/ses/${ad}.mp3`);
      a.preload = "auto";
      onbellek.set(ad, a);
    }
    a.volume = sesSeviyesi;
    a.currentTime = 0;
    void a.play().catch(() => {});
  } catch {
    /* ses yoksa akış devam eder */
  }
}
