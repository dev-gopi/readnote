import type { ExtensionResponse, ReaderSettings } from '../../shared/types';
import { StorageKeys } from '../../shared/constants/StorageKeys';
import { SpeechEngine } from './SpeechEngine';
import { SpeechQueue } from './SpeechQueue';
import { VoiceManager } from './VoiceManager';

// Orchestrates text-to-speech reading
export class ReaderManager {
  private readonly engine: SpeechEngine;
  private readonly queue: SpeechQueue;
  private readonly voiceManager: VoiceManager;
  private isPlaying = false;
  private rate = 1.0;
  private pitch = 1.0;
  private translateBeforeSpeak = false;
  private targetLanguage = 'bn';

  constructor() {
    this.engine = new SpeechEngine();
    this.queue = new SpeechQueue();
    this.voiceManager = new VoiceManager();
    this._syncSettingsFromStorage();
  }

  private _applySettings(settings: Partial<ReaderSettings> | undefined): void {
    if (!settings) return;
    if (typeof settings.rate === 'number') this.rate = settings.rate;
    if (typeof settings.pitch === 'number') this.pitch = settings.pitch;
    if (typeof settings.translateBeforeSpeak === 'boolean') {
      this.translateBeforeSpeak = settings.translateBeforeSpeak;
    }
    if (typeof settings.targetLanguage === 'string' && settings.targetLanguage) {
      this.targetLanguage = settings.targetLanguage;
    }
    if (typeof settings.voiceName === 'string' && settings.voiceName) {
      this.voiceManager.setVoice(settings.voiceName);
    }
  }

  private _syncSettingsFromStorage(): void {
    chrome.storage.local.get([StorageKeys.SETTINGS], (result) => {
      this._applySettings(result[StorageKeys.SETTINGS] as Partial<ReaderSettings> | undefined);
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') return;
      const change = changes[StorageKeys.SETTINGS];
      if (change) {
        this._applySettings(change.newValue as Partial<ReaderSettings> | undefined);
      }
    });
  }

  private async _translateText(text: string, targetLang: string): Promise<string> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage<ExtensionResponse<string>>(
        { type: 'TRANSLATE_TEXT', payload: { text, targetLang } },
        (response) => {
          if (chrome.runtime.lastError || !response?.success || !response.data) {
            resolve(text);
            return;
          }
          resolve(response.data);
        }
      );
    });
  }

  async start(text: string): Promise<void> {
    await new Promise<void>((resolve) => {
      chrome.storage.local.get([StorageKeys.SETTINGS], (result) => {
        this._applySettings(result[StorageKeys.SETTINGS] as Partial<ReaderSettings> | undefined);
        resolve();
      });
    });

    let spokenText = text;
    let activeLang: string | undefined;
    if (this.voiceManager.getSelectedVoice() === null && this.targetLanguage === 'bn') {
      // Check if user explicitly selected the cloud Bengali voice
    }

    if (this.translateBeforeSpeak && this.targetLanguage) {
      spokenText = await this._translateText(text, this.targetLanguage);
      activeLang = this.targetLanguage;
    } else if (await this._isCloudBengaliSelected()) {
      activeLang = 'bn';
    }

    const sentences = spokenText.match(/[^.!?।\n]+[.!?।]?/g) ?? [spokenText];
    sentences
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((s) => this.queue.enqueue(s));

    this.isPlaying = true;
    this._processQueue(activeLang);
  }

  private async _isCloudBengaliSelected(): Promise<boolean> {
    return new Promise((resolve) => {
      chrome.storage.local.get([StorageKeys.SETTINGS], (result) => {
        const settings = result[StorageKeys.SETTINGS] as Partial<ReaderSettings> | undefined;
        resolve(settings?.voiceName === '__cloud_bn__');
      });
    });
  }

  private _processQueue(langOverride?: string): void {
    if (!this.isPlaying || this.queue.isEmpty()) {
      this.isPlaying = false;
      return;
    }
    const sentence = this.queue.dequeue();
    if (!sentence) {
      this.isPlaying = false;
      return;
    }

    let voice = this.voiceManager.getSelectedVoice();
    if (langOverride) {
      const langPrefix = langOverride.toLowerCase().split('-')[0] ?? langOverride.toLowerCase();
      voice =
        this.voiceManager
          .getVoices()
          .find((v) => v.lang.toLowerCase().startsWith(langPrefix)) ?? null;
    }

    this.engine.speak(
      sentence,
      voice,
      () => this._processQueue(langOverride),
      this.rate,
      this.pitch,
      langOverride
    );
  }

  pause(): void {
    this.engine.pause();
    this.isPlaying = false;
  }

  resume(): void {
    this.isPlaying = true;
    this.engine.resume();
  }

  stop(): void {
    this.isPlaying = false;
    this.queue.clear();
    this.engine.stop();
  }
}
