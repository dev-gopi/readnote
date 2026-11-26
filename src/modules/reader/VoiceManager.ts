// Manages available TTS voices
export class VoiceManager {
  private voices: SpeechSynthesisVoice[] = [];
  private selectedVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    this._loadVoices();
  }

  private _loadVoices(): void {
    const load = (): void => {
      this.voices = window.speechSynthesis.getVoices();
      if (!this.selectedVoice && this.voices.length > 0) {
        this.selectedVoice =
          this.voices.find((v) => v.lang.startsWith('en')) ?? this.voices[0] ?? null;
      }
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
  }

  getVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  getSelectedVoice(): SpeechSynthesisVoice | null {
    return this.selectedVoice;
  }

  setVoice(voiceName: string): void {
    this.selectedVoice =
      this.voices.find((v) => v.name === voiceName) ?? this.selectedVoice;
  }
}
