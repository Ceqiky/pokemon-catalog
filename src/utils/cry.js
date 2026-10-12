// Воспроизведение крика с плавным появлением и затуханием, чтобы звук не резало в начале и конце.
const MAX_VOLUME = 0.35;
const FADE_IN = 0.06; // сек
const FADE_OUT = 0.22; // сек

let current = null;

function ramp(audio, from, to, ms, done) {
  const start = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - start) / ms);
    audio.volume = Math.max(0, Math.min(1, from + (to - from) * k));
    if (k < 1) requestAnimationFrame(step);
    else done?.();
  };
  requestAnimationFrame(step);
}

/** Плавно останавливает текущий крик. */
export function stopCry() {
  const audio = current;
  if (!audio) return;
  current = null;
  audio.onended = null;
  audio.ontimeupdate = null;
  ramp(audio, audio.volume, 0, 120, () => audio.pause());
}

/** Запускает крик. onEnd вызывается, когда звук закончился или был остановлен. */
export function playCry(url, onEnd) {
  stopCry();
  const audio = new Audio(url);
  audio.volume = 0;
  current = audio;
  let fading = false;

  audio.ontimeupdate = () => {
    if (fading || !isFinite(audio.duration)) return;
    const left = audio.duration - audio.currentTime;
    if (left <= FADE_OUT) {
      fading = true;
      ramp(audio, audio.volume, 0, Math.max(40, left * 1000));
    }
  };
  audio.onended = () => {
    if (current === audio) current = null;
    onEnd?.();
  };
  audio.play()
    .then(() => ramp(audio, 0, MAX_VOLUME, FADE_IN * 1000))
    .catch(() => { if (current === audio) current = null; onEnd?.(); });
}
