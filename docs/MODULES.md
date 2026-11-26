# Module Reference

## `src/background/`

| File | Description |
|---|---|
| `background.js` | Service worker entry point |
| `BackgroundManager.js` | Registers all handlers on install/startup |
| `handlers/TabHandler.js` | Tab lifecycle events |
| `handlers/MessageHandler.js` | Routes `chrome.runtime.onMessage` to correct module |
| `handlers/ContextMenuHandler.js` | Creates and handles right-click context menu items |

---

## `src/content/`

| File | Description |
|---|---|
| `content.js` | Content script entry point |
| `ContentManager.js` | Coordinates extraction, selection, highlighting |
| `extraction/PageExtractor.js` | Extracts clean article text |
| `extraction/ArticleDetector.js` | Heuristically finds the main article element |
| `extraction/TextCleaner.js` | Strips whitespace noise from raw text |
| `selection/SelectionManager.js` | Monitors and exposes text selection events |
| `highlighting/HighlightManager.js` | Manages highlight lifecycle |
| `highlighting/HighlightRenderer.js` | Wraps DOM ranges in `<mark>` elements |

---

## `src/modules/reader/`

| File | Description |
|---|---|
| `ReaderManager.js` | Orchestrates read-aloud with queue and engine |
| `SpeechEngine.js` | Wraps `SpeechSynthesis` API |
| `SpeechQueue.js` | FIFO sentence queue |
| `VoiceManager.js` | Loads and selects available TTS voices |

---

## `src/modules/notes/`

| File | Description |
|---|---|
| `NoteManager.js` | CRUD business logic for notes |
| `NoteRepository.js` | `chrome.storage.local` persistence |
| `NoteExporter.js` | Export notes as Markdown, JSON, CSV |

---

## `src/modules/highlights/`

| File | Description |
|---|---|
| `HighlightRepository.js` | Persist highlights in `chrome.storage.local` |
| `HighlightService.js` | Business logic for creating/deleting highlights |

---

## `src/modules/ai/`

| File | Description |
|---|---|
| `AIManager.js` | Facade over all AI services |
| `SummaryService.js` | Generates page/text summaries |
| `ExplanationService.js` | Explains selected text |
| `QuestionGenerator.js` | Creates multiple-choice quiz questions |

---

## `src/storage/`

| File | Description |
|---|---|
| `StorageManager.js` | Facade — routes to local or IDB |
| `LocalStorage.js` | Wraps `chrome.storage.local` with Promises |
| `IndexedDBManager.js` | Full CRUD over IndexedDB object stores |
| `SyncManager.js` | Merges local and remote data |

---

## `src/services/`

| File | Description |
|---|---|
| `ApiClient.js` | Authenticated HTTP client |
| `AuthService.js` | OAuth token via `chrome.identity` |
| `SyncService.js` | Push/pull data from backend |

---

## `src/shared/`

| File | Description |
|---|---|
| `constants/AppConstants.js` | App-wide enums and constants |
| `constants/StorageKeys.js` | Centralized storage key names |
| `utils/Logger.js` | Leveled logging utility |
| `utils/Validator.js` | Input validation and sanitization |
| `utils/DomUtils.js` | DOM helper functions |
| `errors/AppError.js` | Custom error class hierarchy |
