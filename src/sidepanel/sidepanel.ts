import type {
  ExtensionMessage,
  ExtensionResponse,
  Highlight,
  Note,
  QuizQuestion,
  ReaderSettings,
  ViewId,
} from '../shared/types';
import { StorageKeys } from '../shared/constants/StorageKeys';
import { NoteExporter } from '../modules/notes/NoteExporter';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { Notification } from './components/Notification';

function sendRuntimeMessage<T = unknown>(
  message: ExtensionMessage
): Promise<ExtensionResponse<T>> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage<ExtensionResponse<T>>(message, (response) => {
      if (chrome.runtime.lastError) {
        resolve({
          success: false,
          error: chrome.runtime.lastError.message ?? 'Extension communication failed.',
        });
        return;
      }
      resolve(response ?? { success: false, error: 'No response received.' });
    });
  });
}

function renderLoading(container: HTMLElement | null, label: string): void {
  if (!container) return;
  container.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'loading-state';
  const spinner = document.createElement('span');
  spinner.className = 'spinner';
  const text = document.createElement('span');
  text.textContent = label;
  wrap.append(spinner, text);
  container.appendChild(wrap);
}

function renderError(container: HTMLElement | null, message: string): void {
  if (!container) return;
  container.innerHTML = '';
  const p = document.createElement('p');
  p.className = 'error-text';
  p.textContent = message;
  container.appendChild(p);
}

// Side Panel UI logic.
export function initializeSidePanel(): void {
  if (window.location.search.includes('grantMic=1')) {
    document.body.innerHTML =
      '<div style="padding:24px;font-family:system-ui,sans-serif;text-align:center;"><h2>ReadNote Microphone Setup</h2><p id="mic-status">Please click <strong>Allow</strong> when Chrome asks for microphone access…</p></div>';
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        stream.getTracks().forEach((t) => t.stop());
        const status = document.getElementById('mic-status');
        if (status) {
          status.textContent =
            'Microphone access granted! You can close this tab and click Record in the Side Panel.';
        }
        setTimeout(() => window.close(), 1500);
      })
      .catch(() => {
        const status = document.getElementById('mic-status');
        if (status) {
          status.textContent =
            'Microphone access was blocked. Allow microphone permission in Chrome site settings for this extension.';
        }
      });
    return;
  }

  const header = new Header(document.getElementById('header-root'));
  const nav = new Navigation(document.getElementById('nav-root'));
  const notification = new Notification(document.getElementById('notification-root'));

  header.render();
  nav.render();
  notification.render();

  const loadNotes = async (): Promise<void> => {
    const list = document.getElementById('notes-list');
    renderLoading(list, 'Loading notes...');
    const res = await sendRuntimeMessage<Note[]>({ type: 'GET_NOTES' });
    if (!list) return;
    list.innerHTML = '';

    if (!res.success) {
      renderError(list, res.error ?? 'Failed to load notes.');
      return;
    }

    const searchInput = document.getElementById('notes-search') as HTMLInputElement | null;
    const query = searchInput?.value.trim().toLowerCase() ?? '';
    const allNotes = res.data ?? [];
    const notes = query
      ? allNotes.filter(
          (n) =>
            n.text.toLowerCase().includes(query) ||
            n.pageTitle.toLowerCase().includes(query) ||
            n.pageUrl.toLowerCase().includes(query)
        )
      : allNotes;

    if (notes.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'placeholder';
      empty.textContent = query
        ? 'No notes match your search.'
        : 'No notes yet. Write one below or right-click text on a page.';
      list.appendChild(empty);
      return;
    }

    notes.forEach((note) => {
      const card = document.createElement('div');
      card.className = 'note-card';

      const body = document.createElement('p');
      body.textContent = note.text;

      const meta = document.createElement('div');
      meta.className = 'card-meta';

      const source = document.createElement('span');
      source.className = 'card-source';
      source.textContent = note.pageTitle || note.pageUrl || 'Note';

      const delBtn = document.createElement('button');
      delBtn.className = 'btn-delete';
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', async () => {
        delBtn.disabled = true;
        await sendRuntimeMessage({ type: 'DELETE_NOTE', payload: { id: note.id } });
        notification.show('Note deleted');
        await loadNotes();
      });

      meta.append(source, delBtn);
      card.append(body, meta);
      list.appendChild(card);
    });
  };

  const loadHighlights = async (): Promise<void> => {
    const list = document.getElementById('highlights-list');
    renderLoading(list, 'Loading highlights...');
    const res = await sendRuntimeMessage<Highlight[]>({ type: 'GET_HIGHLIGHTS' });
    if (!list) return;
    list.innerHTML = '';

    if (!res.success) {
      renderError(list, res.error ?? 'Failed to load highlights.');
      return;
    }

    const searchInput = document.getElementById('highlights-search') as HTMLInputElement | null;
    const query = searchInput?.value.trim().toLowerCase() ?? '';
    const allHighlights = res.data ?? [];
    const highlights = query
      ? allHighlights.filter(
          (h) =>
            h.text.toLowerCase().includes(query) ||
            h.pageTitle.toLowerCase().includes(query) ||
            h.pageUrl.toLowerCase().includes(query)
        )
      : allHighlights;

    if (highlights.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'placeholder';
      empty.textContent = query
        ? 'No highlights match your search.'
        : 'Select text on any page and choose Highlight Selection.';
      list.appendChild(empty);
      return;
    }

    highlights.forEach((hl) => {
      const card = document.createElement('div');
      card.className = 'highlight-card';
      card.style.borderLeftColor = hl.color;

      const body = document.createElement('p');
      body.textContent = `"${hl.text}"`;

      const meta = document.createElement('div');
      meta.className = 'card-meta';

      const source = document.createElement('span');
      source.className = 'card-source';
      source.textContent = hl.pageTitle || hl.pageUrl || 'Highlight';

      const delBtn = document.createElement('button');
      delBtn.className = 'btn-delete';
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', async () => {
        delBtn.disabled = true;
        await sendRuntimeMessage({ type: 'DELETE_HIGHLIGHT', payload: { id: hl.id } });
        notification.show('Highlight removed');
        await loadHighlights();
      });

      meta.append(source, delBtn);
      card.append(body, meta);
      list.appendChild(card);
    });
  };

  const initSettings = (): void => {
    const voiceSelect = document.getElementById('setting-voice') as HTMLSelectElement | null;
    const speedInput = document.getElementById('setting-speed') as HTMLInputElement | null;
    const speedValue = document.getElementById('setting-speed-value');
    const pitchInput = document.getElementById('setting-pitch') as HTMLInputElement | null;
    const pitchValue = document.getElementById('setting-pitch-value');
    const translateToggle = document.getElementById('setting-translate-enable') as HTMLInputElement | null;
    const targetLangSelect = document.getElementById('setting-target-lang') as HTMLSelectElement | null;
    const testBtn = document.getElementById('btn-test-voice') as HTMLButtonElement | null;
    const saveBtn = document.getElementById('btn-save-settings') as HTMLButtonElement | null;

    let savedVoiceName = '';

    const populateVoices = (): void => {
      if (!voiceSelect) return;
      const voices = window.speechSynthesis.getVoices();
      voiceSelect.innerHTML = '';

      const cloudBn = document.createElement('option');
      cloudBn.value = '__cloud_bn__';
      cloudBn.textContent = 'Bengali (বাংলা - Free Cloud Voice)';
      if (savedVoiceName === '__cloud_bn__') cloudBn.selected = true;
      voiceSelect.appendChild(cloudBn);

      if (voices.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Default System Voice';
        voiceSelect.appendChild(opt);
        return;
      }

      voices.forEach((v) => {
        const opt = document.createElement('option');
        opt.value = v.name;
        opt.textContent = `${v.name} (${v.lang})`;
        if (savedVoiceName && v.name === savedVoiceName) {
          opt.selected = true;
        }
        voiceSelect.appendChild(opt);
      });
    };

    chrome.storage.local.get([StorageKeys.SETTINGS], (result) => {
      const settings = result[StorageKeys.SETTINGS] as Partial<ReaderSettings> | undefined;
      if (settings?.voiceName) savedVoiceName = settings.voiceName;
      if (typeof settings?.rate === 'number' && speedInput && speedValue) {
        speedInput.value = String(settings.rate);
        speedValue.textContent = `${settings.rate.toFixed(1)}x`;
      }
      if (typeof settings?.pitch === 'number' && pitchInput && pitchValue) {
        pitchInput.value = String(settings.pitch);
        pitchValue.textContent = settings.pitch.toFixed(1);
      }
      if (translateToggle) {
        translateToggle.checked = Boolean(settings?.translateBeforeSpeak);
      }
      if (targetLangSelect && settings?.targetLanguage) {
        targetLangSelect.value = settings.targetLanguage;
      }
      populateVoices();
    });

    populateVoices();
    window.speechSynthesis.onvoiceschanged = populateVoices;

    speedInput?.addEventListener('input', () => {
      if (speedValue && speedInput) {
        speedValue.textContent = `${Number(speedInput.value).toFixed(1)}x`;
      }
    });

    pitchInput?.addEventListener('input', () => {
      if (pitchValue && pitchInput) {
        pitchValue.textContent = Number(pitchInput.value).toFixed(1);
      }
    });

    testBtn?.addEventListener('click', async () => {
      window.speechSynthesis.cancel();
      let previewText = 'Hello! This is a preview of your ReadNote voice settings.';
      const useTranslate = Boolean(translateToggle?.checked);
      const targetLang = targetLangSelect?.value ?? 'bn';

      if (testBtn) {
        testBtn.disabled = true;
        testBtn.textContent = useTranslate ? 'Translating...' : 'Speaking...';
      }

      try {
        if (useTranslate) {
          const res = await sendRuntimeMessage<string>({
            type: 'TRANSLATE_TEXT',
            payload: { text: previewText, targetLang },
          });
          if (res.success && res.data) previewText = res.data;
        }

        const selectedVoiceVal = voiceSelect?.value ?? '';
        const rate = Number(speedInput?.value ?? 1.0);
        const pitch = Number(pitchInput?.value ?? 1.0);

        if (selectedVoiceVal === '__cloud_bn__' || (useTranslate && targetLang === 'bn')) {
          const ttsLang = useTranslate ? targetLang.split('-')[0] || 'bn' : 'bn';
          const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(ttsLang)}&client=tw-ob&q=${encodeURIComponent(previewText)}`;
          const audio = new Audio(url);
          audio.playbackRate = rate;
          await audio.play();
          return;
        }

        const utterance = new SpeechSynthesisUtterance(previewText);
        const voices = window.speechSynthesis.getVoices();
        const chosen = voices.find((v) => v.name === selectedVoiceVal);
        if (chosen) utterance.voice = chosen;
        if (useTranslate) utterance.lang = targetLang;
        utterance.rate = rate;
        utterance.pitch = pitch;
        window.speechSynthesis.speak(utterance);
      } finally {
        if (testBtn) {
          testBtn.disabled = false;
          testBtn.textContent = 'Test Voice';
        }
      }
    });

    saveBtn?.addEventListener('click', () => {
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
      }
      const settings: ReaderSettings = {
        voiceName: voiceSelect?.value ?? '',
        rate: Number(speedInput?.value ?? 1.0),
        pitch: Number(pitchInput?.value ?? 1.0),
        translateBeforeSpeak: Boolean(translateToggle?.checked),
        targetLanguage: targetLangSelect?.value ?? 'bn',
      };
      chrome.storage.local.set({ [StorageKeys.SETTINGS]: settings }, () => {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save Settings';
        }
        notification.show('Voice & translation settings saved!');
      });
    });
  };

  const runSummarize = async (overrideText?: string): Promise<void> => {
    const btn = document.getElementById('btn-summarize-now') as HTMLButtonElement | null;
    const customInput = document.getElementById('summary-custom-input') as HTMLTextAreaElement | null;
    const output = document.getElementById('summary-output');
    const customText = (overrideText ?? customInput?.value ?? '').trim();

    if (overrideText && customInput) {
      customInput.value = overrideText;
    }

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Summarizing...';
    }
    renderLoading(output, customText ? 'Summarizing selection...' : 'Analyzing page content...');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!customText && tab?.id === undefined) {
        renderError(output, 'No active tab found.');
        return;
      }

      const response = await sendRuntimeMessage({
        type: 'AI_SUMMARIZE',
        payload: {
          ...(tab?.id !== undefined ? { tabId: tab.id } : {}),
          ...(customText ? { text: customText } : {}),
        },
      });

      if (response.success && response.summary && output) {
        output.textContent = response.summary;
      } else {
        renderError(output, response.error ?? 'Failed to generate summary.');
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Summarize';
      }
    }
  };

  const runGenerateQuiz = async (): Promise<void> => {
    const btn = document.getElementById('btn-generate-quiz') as HTMLButtonElement | null;
    const container = document.getElementById('quiz-container');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Generating Quiz...';
    }
    renderLoading(container, 'Building quiz from page...');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id === undefined) {
        renderError(container, 'No active tab found.');
        return;
      }

      const response = await sendRuntimeMessage<QuizQuestion[]>({
        type: 'GENERATE_QUIZ',
        payload: { tabId: tab.id },
      });

      if (!container) return;
      if (!response.success || !response.data || response.data.length === 0) {
        renderError(container, response.error ?? 'Could not generate quiz questions.');
        return;
      }

      container.innerHTML = '';
      response.data.forEach((q, idx) => {
        const card = document.createElement('div');
        card.className = 'quiz-card';

        const questionEl = document.createElement('p');
        questionEl.className = 'quiz-question';
        questionEl.textContent = `${idx + 1}. ${q.question}`;

        const optionsWrap = document.createElement('div');
        optionsWrap.className = 'quiz-options';

        q.options.forEach((opt) => {
          const optBtn = document.createElement('button');
          optBtn.className = 'quiz-option';
          optBtn.textContent = opt;
          optBtn.addEventListener('click', () => {
            optionsWrap.querySelectorAll<HTMLButtonElement>('.quiz-option').forEach((b) => {
              b.disabled = true;
              if (b.textContent === q.answer) {
                b.classList.add('correct');
              }
            });
            if (opt !== q.answer) {
              optBtn.classList.add('wrong');
            }
          });
          optionsWrap.appendChild(optBtn);
        });

        card.append(questionEl, optionsWrap);
        container.appendChild(card);
      });
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Generate Quiz';
      }
    }
  };

  initSettings();

  const prefillNoteFromTab = async (): Promise<void> => {
    const noteInput = document.getElementById('note-input') as HTMLTextAreaElement | null;
    if (!noteInput || noteInput.value.trim().length > 0) return;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id === undefined) return;
    const res = await sendRuntimeMessage({
      type: 'GET_PAGE_CONTENT',
      payload: { tabId: tab.id },
    });
    const selected = res.content?.selectedText?.trim();
    if (selected) {
      noteInput.value = selected;
    }
  };

  // View switching
  nav.onNavigate((viewId) => {
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    const target = document.getElementById(`view-${viewId}`);
    if (target) target.classList.add('active');

    if (viewId === 'notes') {
      void loadNotes();
      void prefillNoteFromTab();
    }
    if (viewId === 'highlights') void loadHighlights();
  });

  // Summarize button
  document.getElementById('btn-summarize-now')?.addEventListener('click', () => {
    void runSummarize();
  });

  // Copy summary & save summary as note
  document.getElementById('btn-copy-summary')?.addEventListener('click', async () => {
    const output = document.getElementById('summary-output');
    const text = output?.textContent?.trim() ?? '';
    if (!text || output?.querySelector('.placeholder')) {
      notification.show('Generate a summary first');
      return;
    }
    await navigator.clipboard.writeText(text);
    notification.show('Summary copied!');
  });

  document.getElementById('btn-save-summary-note')?.addEventListener('click', async () => {
    const output = document.getElementById('summary-output');
    const text = output?.textContent?.trim() ?? '';
    if (!text || output?.querySelector('.placeholder')) {
      notification.show('Generate a summary first');
      return;
    }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const res = await sendRuntimeMessage({
      type: 'SAVE_NOTE',
      payload: {
        text,
        pageUrl: tab?.url ?? '',
        pageTitle: tab?.title ?? 'Page Summary',
      },
    });
    notification.show(res.success ? 'Summary saved as note!' : 'Failed to save summary');
  });

  // Search filters
  document.getElementById('notes-search')?.addEventListener('input', () => {
    void loadNotes();
  });
  document.getElementById('highlights-search')?.addEventListener('input', () => {
    void loadHighlights();
  });

  // Generate quiz button
  document.getElementById('btn-generate-quiz')?.addEventListener('click', () => {
    void runGenerateQuiz();
  });

  // Save note
  document.getElementById('btn-save-note')?.addEventListener('click', async () => {
    const saveBtn = document.getElementById('btn-save-note') as HTMLButtonElement | null;
    const noteInput = document.getElementById('note-input') as HTMLTextAreaElement | null;
    const text = noteInput?.value.trim() ?? '';
    if (!text) return;

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
    }
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const res = await sendRuntimeMessage({
        type: 'SAVE_NOTE',
        payload: {
          text,
          pageUrl: tab?.url ?? '',
          pageTitle: tab?.title ?? 'Untitled Page',
        },
      });
      if (res.success) {
        if (noteInput) noteInput.value = '';
        notification.show('Note saved!');
        await loadNotes();
      } else {
        notification.show(res.error ?? 'Failed to save note');
      }
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Note';
      }
    }
  });

  // Export notes (PDF, Image, Markdown)
  const exporter = new NoteExporter();

  const exportNotes = async (format: 'pdf' | 'image' | 'md', btnId: string): Promise<void> => {
    const btn = document.getElementById(btnId) as HTMLButtonElement | null;
    const prevText = btn?.textContent ?? '';
    if (btn) {
      btn.disabled = true;
      btn.textContent = '...';
    }
    try {
      const res = await sendRuntimeMessage<Note[]>({ type: 'GET_NOTES' });
      const notes = res.data ?? [];
      if (!res.success || notes.length === 0) {
        notification.show('No notes to export');
        return;
      }
      if (format === 'pdf') {
        exporter.exportAsPDF(notes);
        notification.show('Exported PDF!');
      } else if (format === 'image') {
        await exporter.exportAsImage(notes);
        notification.show('Exported Image!');
      } else {
        exporter.downloadFile(exporter.exportAsMarkdown(notes), 'readnote-notes.md', 'text/markdown');
        notification.show('Exported Markdown!');
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = prevText;
      }
    }
  };

  document.getElementById('btn-export-pdf')?.addEventListener('click', () => {
    void exportNotes('pdf', 'btn-export-pdf');
  });
  document.getElementById('btn-export-image')?.addEventListener('click', () => {
    void exportNotes('image', 'btn-export-image');
  });
  document.getElementById('btn-export-md')?.addEventListener('click', () => {
    void exportNotes('md', 'btn-export-md');
  });

  // Voice recording (MediaRecorder + optional SpeechRecognition transcription)
  let mediaRecorder: MediaRecorder | null = null;
  let audioChunks: BlobPart[] = [];
  let recordTimer: ReturnType<typeof setInterval> | null = null;
  let recordSeconds = 0;
  let activeStream: MediaStream | null = null;

  interface SpeechRecognitionLike {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
    start(): void;
    stop(): void;
  }
  let recognition: SpeechRecognitionLike | null = null;

  const stopRecordingUI = (): void => {
    const recBtn = document.getElementById('btn-record-note') as HTMLButtonElement | null;
    const recBar = document.getElementById('recording-bar');
    if (recBtn) recBtn.textContent = '🎤 Record';
    recBar?.classList.add('hidden');
    if (recordTimer !== null) {
      clearInterval(recordTimer);
      recordTimer = null;
    }
    recordSeconds = 0;
  };

  document.getElementById('btn-record-note')?.addEventListener('click', async () => {
    const recBtn = document.getElementById('btn-record-note') as HTMLButtonElement | null;
    const recBar = document.getElementById('recording-bar');
    const timerEl = document.getElementById('recording-timer');
    const previewEl = document.getElementById('audio-preview-container');
    const noteInput = document.getElementById('note-input') as HTMLTextAreaElement | null;

    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      recognition?.stop();
      recognition = null;
      stopRecordingUI();
      return;
    }

    try {
      activeStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];
      mediaRecorder = new MediaRecorder(activeStream);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        if (previewEl) {
          previewEl.innerHTML = '';
          previewEl.classList.remove('hidden');
          const audio = document.createElement('audio');
          audio.controls = true;
          audio.src = url;
          const link = document.createElement('a');
          link.href = url;
          link.download = `readnote-recording-${Date.now()}.webm`;
          link.className = 'audio-download-link';
          link.textContent = 'Download Recording (.webm)';
          previewEl.append(audio, link);
        }
        activeStream?.getTracks().forEach((t) => t.stop());
        activeStream = null;
      };

      mediaRecorder.start();
      if (recBtn) recBtn.textContent = '⏹️ Stop';
      recBar?.classList.remove('hidden');
      recordSeconds = 0;
      if (timerEl) timerEl.textContent = 'Recording 00:00';
      recordTimer = setInterval(() => {
        recordSeconds += 1;
        const mins = String(Math.floor(recordSeconds / 60)).padStart(2, '0');
        const secs = String(recordSeconds % 60).padStart(2, '0');
        if (timerEl) timerEl.textContent = `Recording ${mins}:${secs}`;
      }, 1000);

      // Start live speech-to-text if supported by browser
      const win = window as unknown as {
        SpeechRecognition?: new () => SpeechRecognitionLike;
        webkitSpeechRecognition?: new () => SpeechRecognitionLike;
      };
      const SpeechRec = win.SpeechRecognition ?? win.webkitSpeechRecognition;
      if (SpeechRec) {
        recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        recognition.onresult = (event) => {
          const results = Array.from(event.results);
          const transcript = results
            .filter((r) => r.isFinal)
            .map((r) => r[0]?.transcript ?? '')
            .join(' ')
            .trim();
          if (transcript && noteInput) {
            noteInput.value = noteInput.value
              ? `${noteInput.value.trim()} ${transcript}`
              : transcript;
          }
        };
        try {
          recognition.start();
        } catch {
          // Ignore if speech recognition cannot start
        }
      }
    } catch {
    } catch (err: unknown) {
      stopRecordingUI();
      notification.show('Microphone permission denied or unavailable.');
      const errName = err instanceof DOMException ? err.name : '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        notification.show('Opening tab to grant microphone permission...');
        const baseUrl = window.location.href.split('?')[0];
        void chrome.tabs.create({ url: `${baseUrl}?grantMic=1` });
      } else {
        notification.show('Microphone unavailable on this device.');
      }
    }
  });

  // Live-refresh notes/highlights when changed from context menu or content script
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;
    if (changes[StorageKeys.NOTES]) {
      const notesView = document.getElementById('view-notes');
      if (notesView?.classList.contains('active')) void loadNotes();
    }
    if (changes[StorageKeys.HIGHLIGHTS]) {
      const hlView = document.getElementById('view-highlights');
      if (hlView?.classList.contains('active')) void loadHighlights();
    }
  });

  // Check if opened with a pending action from popup or context menu
  chrome.storage.local.get(
    ['readnote_pending_action', 'readnote_pending_summary_text'],
    (items) => {
      const pending = items['readnote_pending_action'] as ViewId | undefined;
      const pendingText =
        typeof items['readnote_pending_summary_text'] === 'string'
          ? items['readnote_pending_summary_text']
          : undefined;
      if (!pending) return;
      chrome.storage.local.remove([
        'readnote_pending_action',
        'readnote_pending_summary_text',
      ]);
      nav.setActiveView(pending);
      if (pending === 'summary') void runSummarize(pendingText);
      if (pending === 'quiz') void runGenerateQuiz();
    }
  );
}

initializeSidePanel();
