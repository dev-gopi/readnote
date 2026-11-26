# Development Guide

## Prerequisites

- **Node.js** 18 or higher
- **Chrome** 114+ (Side Panel API support)
- **Git**

---

## Setup

```bash
git clone https://github.com/yourusername/readnote.git
cd readnote
npm install
cp .env.example .env
# Edit .env with your API credentials
```

---

## Loading the Extension

1. Open Chrome → `chrome://extensions`
2. Toggle **Developer mode** ON (top-right)
3. Click **Load unpacked** → select the `readnote/` directory
4. The ReadNote icon will appear in the toolbar

---

## Development Workflow

```bash
npm run dev      # Launches web-ext with auto-reload on file changes
npm run lint     # ESLint across all source files
npm test         # Run all Jest tests
npm run build    # Bundle for production
npm run zip      # Create distributable .zip
```

After editing files in `src/`, click the **🔄 refresh** icon on the extension card at `chrome://extensions`.

---

## Project Conventions

### JavaScript

- ES Modules (`import`/`export`) throughout
- Class-based architecture — one class per file
- Constructor injection for dependencies (no singletons)
- `async/await` for all async operations

### Naming

| Entity | Convention | Example |
|---|---|---|
| Files | PascalCase for classes | `NoteManager.js` |
| Files | camelCase for entry points | `background.js` |
| Classes | PascalCase | `class NoteManager {}` |
| Constants | SCREAMING_SNAKE_CASE | `const MAX_LENGTH = 500` |
| CSS classes | kebab-case | `.action-btn` |

### Logging

Always use the `Logger` utility — never `console.log` directly:

```js
import { Logger } from '../../shared/utils/Logger.js';
Logger.info('Note saved', note.id);
Logger.error('Failed to sync', err);
```

### Error Handling

Use typed errors from `AppError.js`:

```js
import { StorageError } from '../../shared/errors/AppError.js';
throw new StorageError('Failed to write note', { key });
```

---

## Testing

Tests live in `tests/unit/` and `tests/integration/`.

```bash
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
```

Name test files `*.test.js` or `*.spec.js` to be picked up by Jest.

---

## Adding a New Feature Module

1. Create a folder under `src/modules/<feature>/`
2. Add a `<Feature>Manager.js` for business logic
3. Add a `<Feature>Repository.js` for persistence if needed
4. Register the manager in `BackgroundManager.js`
5. Add message types to `AppConstants.js`
6. Handle the new message type in `MessageHandler.js`
7. Add UI in `sidepanel/sidepanel.js` and the relevant view in `sidepanel.html`
8. Write unit tests in `tests/unit/<feature>/`

---

## Manifest (MV3)

The extension uses **Manifest V3** with:
- `service_worker` background script
- `side_panel` for the reading UI
- `content_scripts` injected on all URLs
- `chrome.storage.local` and `chrome.identity` permissions

> **Note**: Remember to update `manifest.json` (not yet included — add it to the root with the correct permissions, icons, and content script paths).
