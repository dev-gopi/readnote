export type ReaderSpeed = 0.5 | 0.75 | 1.0 | 1.25 | 1.5 | 1.75 | 2.0;

export interface ReaderSettings {
  voiceName: string;
  rate: number;
  pitch: number;
  translateBeforeSpeak: boolean;
  targetLanguage: string;
}

export interface ReaderState {
  isPlaying: boolean;
  currentSentence: string | null;
  selectedVoice: SpeechSynthesisVoice | null;
  speed: number;
  pitch: number;
}
