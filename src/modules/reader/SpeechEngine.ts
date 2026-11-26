// Wraps Web Speech API SpeechSynthesis with free TTS audio fallback for languages like Bengali
export class SpeechEngine {
  private readonly synth: SpeechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentAudio: HTMLAudioElement | null = null;

  constructor() {
    this.synth = window.speechSynthesis;
  }

  speak(
    text: string,
    voice: SpeechSynthesisVoice | null,
    onEnd: () => void,
    rate = 1.0,
    pitch = 1.0,
    lang?: string
  ): void {
    const clampedRate = Math.min(2.0, Math.max(0.5, rate));
    const clampedPitch = Math.min(2.0, Math.max(0.5, pitch));

    // If a specific non-default language is requested and no matching local voice exists,
    // use free Google Translate TTS audio fallback (supports Bengali 'bn', Hindi 'hi', etc.)
    if (!voice && lang && !lang.toLowerCase().startsWith('en')) {
      this._speakViaAudioFallback(text, lang, clampedRate, onEnd);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else if (lang) {
      utterance.lang = lang;
    }
    utterance.rate = clampedRate;
    utterance.pitch = clampedPitch;
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  private _speakViaAudioFallback(
    text: string,
    lang: string,
    rate: number,
    onEnd: () => void
  ): void {
    const trimmed = text.slice(0, 180).trim();
    if (!trimmed) {
      onEnd();
      return;
    }
    const ttsLang = lang.split('-')[0] || lang;
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(ttsLang)}&client=tw-ob&q=${encodeURIComponent(trimmed)}`;
    const audio = new Audio(url);
    audio.playbackRate = rate;
    audio.onended = () => {
      this.currentAudio = null;
      onEnd();
    };
    audio.onerror = () => {
      this.currentAudio = null;
      const fallback = new SpeechSynthesisUtterance(text);
      fallback.lang = lang;
      fallback.rate = rate;
      fallback.onend = onEnd;
      this.currentUtterance = fallback;
      this.synth.speak(fallback);
    };
    this.currentAudio = audio;
    void audio.play().catch(() => {
      audio.onerror?.(new Event('error'));
    });
  }

  getCurrentUtterance(): SpeechSynthesisUtterance | null {
    return this.currentUtterance;
  }

  pause(): void {
    this.synth.pause();
    this.currentAudio?.pause();
  }

  resume(): void {
    this.synth.resume();
    void this.currentAudio?.play();
  }

  stop(): void {
    this.synth.cancel();
    this.currentUtterance = null;
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.src = '';
      this.currentAudio = null;
    }
  }
}
