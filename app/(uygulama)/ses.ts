// Uygulamadaki SoundManager'ın web karşılığı — aynı mp3 dosyaları.
//
// 14 Eyl 2026: kullanıcı "sesler hafif gecikmeli" dedi. Sebep dosya değil (dogru.mp3'te
// baştaki sessizlik 0 ms ölçüldü), oynatma yoluydu: `new Audio()` ilk seste indirip çözüyor,
// `HTMLAudioElement.play()` her çağrıda 50–150 ms gecikiyor (mobil Safari'de daha çok).
// Android `SoundPool` ile önceden belleğe alıp anında çalıyor; burası artık onun karşılığı:
//   • Web Audio API — dosya bir kez indirilip AudioBuffer'a çözülür, çalma ~0 ms.
//   • Sık kullanılan sesler ilk kullanıcı dokunuşunda ÖN YÜKLENİR (test ekranına gelmeden hazır).
//   • AudioContext ilk dokunuşta "unlock" edilir (tarayıcıların otomatik ses engeli).
//   • Web Audio yoksa ya da tampon henüz inmediyse eski HTMLAudio yoluna düşer; ses kaybolmaz.

const onbellek = new Map<string, HTMLAudioElement>();
const tamponlar = new Map<string, AudioBuffer>();
const inenler = new Map<string, Promise<AudioBuffer | null>>();
let baglam: AudioContext | null = null;
let onYuklemeBasladi = false;

export type SesAdi =
  | "dogru" | "yanlis" | "result" | "streak"
  | "t2048_pop" | "t2048_kaydirma"
  | "bb_alma" | "bb_yerlestir"
  | "bb_combo1" | "bb_combo2" | "bb_combo3" | "bb_combo4"
  | "wordle_harf" | "wordle_dogruharf" | "wordle_levelcompleted"
  | "levelcompleted"
  | "task" | "gorevtamamlandi"
  | "note_do" | "note_re" | "note_mi" | "note_fa" | "note_sol"
  | "note_la" | "note_si" | "note_do2" | "note_re2" | "note_mi3";

/** Öğrenme akışında her an lazım olanlar — ilk dokunuşta indirilip çözülür (~200 KB). */
const ON_YUKLENENLER: SesAdi[] = ["dogru", "yanlis", "result", "streak", "task", "gorevtamamlandi", "levelcompleted"];

function baglamAl(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (baglam) return baglam;
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  try { baglam = new Ctx(); } catch { return null; }
  return baglam;
}

function tamponIndir(ad: SesAdi): Promise<AudioBuffer | null> {
  const var_ = inenler.get(ad);
  if (var_) return var_;
  const ctx = baglamAl();
  if (!ctx) return Promise.resolve(null);
  const p = fetch(`/uygulama/ses/${ad}.mp3`)
    .then((r) => r.arrayBuffer())
    .then((ab) => ctx.decodeAudioData(ab))
    .then((b) => { tamponlar.set(ad, b); return b; })
    .catch(() => { inenler.delete(ad); return null; });
  inenler.set(ad, p);
  return p;
}

/** İlk kullanıcı dokunuşunda: bağlamı aç + sık sesleri ön yükle. Kabuk bir kez çağırır. */
export function sesleriHazirla() {
  if (typeof window === "undefined" || onYuklemeBasladi) return;
  onYuklemeBasladi = true;
  const uyandir = () => {
    const ctx = baglamAl();
    if (ctx && ctx.state === "suspended") void ctx.resume().catch(() => {});
    for (const ad of ON_YUKLENENLER) void tamponIndir(ad);
    window.removeEventListener("pointerdown", uyandir);
    window.removeEventListener("keydown", uyandir);
  };
  window.addEventListener("pointerdown", uyandir, { passive: true });
  window.addEventListener("keydown", uyandir);
}

export function sesCal(ad: SesAdi, sesSeviyesi = 0.7) {
  if (typeof window === "undefined") return;
  try {
    const ctx = baglamAl();
    const tampon = tamponlar.get(ad);
    if (ctx && tampon) {
      if (ctx.state === "suspended") void ctx.resume().catch(() => {});
      const kaynak = ctx.createBufferSource();
      kaynak.buffer = tampon;
      const ses = ctx.createGain();
      ses.gain.value = sesSeviyesi;
      kaynak.connect(ses).connect(ctx.destination);
      kaynak.start();
      return;
    }
    // Tampon yok: bir sonraki sefer için indir, bu seferlik eski yol
    if (ctx) void tamponIndir(ad);
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
