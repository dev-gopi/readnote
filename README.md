# ReadNote

> An AI-powered Chrome extension for smarter reading — summarize pages, take notes, highlight text, listen with text-to-speech, and generate quizzes.

---

## ✨ Features

- **AI Summaries** — Instantly summarize any article or web page
- **Smart Notes** — Capture and organize notes tied to web pages
- **Highlights** — Highlight passages with color-coded marks, persisted across sessions
- **Read Aloud** — Text-to-speech with voice and speed controls
- **Quiz Generator** — Auto-generate comprehension quizzes from page content
- **Side Panel UI** — Non-intrusive side panel that stays open while you browse

---

## 🗂 Project Structure

```
readnote/
├── assets/           # Icons and images
├── src/
│   ├── background/   # Service worker & handlers
│   ├── popup/        # Extension popup UI
│   ├── sidepanel/    # Side panel UI & components
│   ├── content/      # Content scripts (extraction, selection, highlighting)
│   ├── modules/      # Feature modules (reader, notes, highlights, ai)
│   ├── storage/      # Storage backends
│   ├── services/     # API client, auth, sync
│   ├── shared/       # Constants, utils, error types
│   └── styles/       # Shared CSS
├── tests/            # Unit and integration tests
└── docs/             # Documentation
```

Plasmo entry files (`background.ts`, `contents/readnote.ts`, `popup.tsx`, and
`sidepanel.tsx`) live at the project root. The popup and side panel use only
the DOM APIs—`.tsx` is used solely because it is Plasmo's file-based entry
convention, not because the project uses React.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Chrome / Chromium browser

### Installation

```bash
# Clone the repo
git clone https://github.com/yourusername/readnote.git
cd readnote

# Install dependencies
npm install

# Copy env file
cp .env.example .env
# Edit .env with your API keys
```

### Load in Chrome

1. Run `npm run build`.
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select `build/chrome-mv3-prod`.

### Development

```bash
npm run dev      # Plasmo development build with file watching
npm run lint     # Lint source files
npm test         # Run all tests
npm run build    # Production build
npm run package  # Package for distribution
```

---

## 📖 Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [Module Reference](docs/MODULES.md)
- [Development Guide](docs/DEVELOPMENT.md)

---

## 🛠 Tech Stack

- **Manifest V3** Chrome Extension API
- **Vanilla JS ES Modules** — no framework overhead in content scripts
- **Web Speech API** — built-in text-to-speech
- **IndexedDB + chrome.storage.local** — offline-first storage
- **Chrome Side Panel API** — persistent reading panel

---

## 📄 License

MIT © ReadNote
