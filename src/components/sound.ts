/** Soft synthesized tone. Only plays when the player has enabled sound. No audio files, no network. */
let ctx: AudioContext | undefined;

export function chime(enabled: boolean, kind: 'end' | 'reward' = 'end') {
  if (!enabled) return;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const notes = kind === 'end' ? [523.25, 659.25] : [587.33, 783.99, 987.77];
    notes.forEach((f, i) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      const t = ctx!.currentTime + i * 0.18;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      o.connect(g).connect(ctx!.destination);
      o.start(t);
      o.stop(t + 1.5);
    });
  } catch {
    /* audio unavailable — silent is fine */
  }
}
