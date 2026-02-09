# OpenWhispr Workspace Rules

## Project Identity

- **Name**: OpenWhispr (fork of `OpenWhispr/openwhispr`)
- **Type**: Electron desktop dictation app — speech-to-text via whisper.cpp, Parakeet, and cloud APIs
- **Version**: 1.4.4
- **Origin repo**: `https://github.com/Kookylo/openwhispr.git` (origin)
- **Upstream repo**: `https://github.com/OpenWhispr/openwhispr.git` (upstream)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop framework | Electron 36, context isolation, dual-window architecture |
| Frontend | React 19, TypeScript, Tailwind CSS v4, Vite |
| UI components | shadcn/ui + Radix primitives + Lucide icons |
| Database | better-sqlite3 (local transcription history + custom dictionary) |
| Speech engines | whisper.cpp (local), NVIDIA Parakeet via sherpa-onnx (local), OpenAI Whisper API (cloud) |
| AI reasoning | OpenAI, Anthropic, Gemini, Groq, local llama.cpp, OpenRouter (BYOK) |
| Audio | FFmpeg (bundled via ffmpeg-static), MediaRecorder API |
| Package manager | npm (package-lock.json) |

---

## Architecture Overview

### Process Model
- **Main process** (`main.js`): Electron entry, initializes manager singletons, global error handling
- **Preload** (`preload.js`): IPC bridge via `contextBridge.exposeInMainWorld("electronAPI", ...)`
- **Renderer** (`src/main.jsx` → `src/App.jsx`): React app, URL-based routing for two windows

### Dual Window Pattern
- **Main window**: Minimal always-on-top overlay for dictation (draggable)
- **Control panel**: Full settings/history interface (normal window)
- Both share the same React codebase, distinguished by URL path

### Audio Pipeline
```
Hotkey press → MediaRecorder → Blob chunks → ArrayBuffer → IPC →
Main process writes temp .webm → FFmpeg converts to .wav → whisper.cpp → Result via IPC →
Reasoning/cleanup (optional) → Clipboard paste via CGEvent/AppleScript/SendKeys
```

### Streaming Pipeline (local)
```
MediaRecorder (1200ms intervals) → ondataavailable → handleLocalStreamingChunk →
Combined blob (all accumulated chunks for valid WebM header) → whisper.cpp →
Partial transcript → finalizeLocalStreaming → Full re-transcription → Reasoning → Paste
```

---

## Directory Structure

```
main.js                    # Electron main process entry
preload.js                 # IPC bridge (contextBridge)
src/
  main.jsx                 # React entry + AppRouter + startup sync logic
  App.jsx                  # Dictation UI + recording states
  components/
    SettingsPage.tsx        # Settings UI (79KB, largest component)
    ControlPanel.tsx        # Settings/history window
    OnboardingFlow.tsx      # 8-step first-run wizard
    ReasoningModelSelector.tsx  # AI model picker
    TranscriptionModelPicker.tsx
    ui/                     # shadcn/ui components (40 files)
  helpers/                  # Main-process manager modules
    audioManager.js         # Core audio + transcription + reasoning (88KB, largest file)
    ipcHandlers.js          # Centralized IPC registration (59KB)
    clipboard.js            # Cross-platform paste (macOS/Win/Linux)
    whisper.js              # whisper.cpp binary wrapper
    whisperServer.js        # whisper-server HTTP interface
    environment.js          # .env persistence + key management
    database.js             # SQLite operations
    hotkeyManager.js        # Global hotkey + platform fallbacks
    windowManager.js        # Window lifecycle
    tray.js                 # System tray
    parakeet.js             # NVIDIA Parakeet model management
    ffmpegUtils.js          # Audio conversion
    globeKeyManager.js      # macOS Globe/Fn key
    gnomeShortcut.js        # GNOME Wayland D-Bus shortcuts
  hooks/
    useSettings.ts          # All app settings + dictionary sync
    useAudioRecording.js    # MediaRecorder wrapper
    usePermissions.ts       # OS permission checks
    useLocalStorage.ts      # Type-safe localStorage
    useModelDownload.ts     # Model download progress
  services/
    ReasoningService.ts     # AI provider routing (OpenAI/Anthropic/Gemini/Groq/local/OpenWhispr)
    LocalReasoningService.ts
    BaseReasoningService.ts
  config/
    constants.ts            # API endpoints, URLs
    prompts.ts              # System prompt loader
    promptData.json         # Agent system prompts
    languageRegistry.json   # 58 supported languages
  models/
    modelRegistryData.json  # Single source of truth for all AI models
    ModelRegistry.ts        # TypeScript model helpers
  utils/
    agentName.ts            # Agent name get/set/useAgentName hook
    logger.ts               # Structured logging
    languageSupport.ts      # Language code utilities
    hotkeyValidator.ts      # Hotkey validation
  types/
    electron.ts             # window.electronAPI type declarations
scripts/
  load-dictionary.js        # Bulk dictionary loader (fork-specific)
  download-whisper-cpp.js   # Binary downloader
  download-llama-server.js  # llama.cpp server downloader
  download-sherpa-onnx.js   # sherpa-onnx downloader
  run-electron.js           # Dev launcher
```

---

## Fork-Specific Customizations (PROTECT DURING UPSTREAM MERGES)

These are the 13 files that diverge from upstream. Any upstream merge MUST preserve these changes:

### 1. `src/helpers/audioManager.js` (+517 lines)
- **LOCAL_STREAMING_MIN_CHUNK_SIZE** = 4KB guard for invalid WebM blobs
- **Streaming chunk combining**: `handleLocalStreamingChunk` combines ALL accumulated chunks into one blob so FFmpeg always gets a valid WebM EBML header
- **`agentName` scoping**: Declared after `reasoningModel`/`reasoningProvider` in `processTranscription`
- Local transcriptions go through reasoning (agent trigger detection + cleanup)

### 2. `src/helpers/ipcHandlers.js` (+6/-1)
- `get-reasoning-config` IPC handler
- `sync-startup-preferences`: Only clears `LOCAL_REASONING_MODEL` (not `REASONING_PROVIDER`) for non-local providers

### 3. `src/helpers/environment.js` (+10)
- `CLOUD_REASONING_BASE_URL` and `REASONING_MODEL` added to `PERSISTED_KEYS`
- `getReasoningConfig()` method for IPC access

### 4. `preload.js` (+1)
- `getReasoningConfig` IPC bridge exposed to renderer

### 5. `src/types/electron.ts` (+5)
- `getReasoningConfig` type declaration

### 6. `src/main.jsx` (+31)
- Startup sync: reads `.env` reasoning config into localStorage before dictation fires
- Auto-enables BYOK mode when custom provider configured via `.env`

### 7. `src/hooks/useSettings.ts` (+43/-34)
- `areDictionariesEqual` helper for smarter SQLite↔localStorage sync
- `normalizeCustomDictionary`: splits comma/newline entries, deduplicates
- Enhanced `setCustomDictionary` with normalization
- `assemblyAiStreaming` state relocated to fix undefined reference

### 8. `src/components/SettingsPage.tsx` (+41/-7)
- Dictionary `onPaste` handler: intercepts multi-line paste, splits by newlines/commas
- `handleAddDictionaryWord` accepts optional raw input string
- Button `onClick` wrapped to avoid type mismatch

### 9. `src/components/ReasoningModelSelector.tsx` (+76)
- OpenRouter custom endpoint support in model selector UI

### 10. `src/helpers/whisper.js` (+25)
- Local STT robustness improvements

### 11. `src/models/ModelRegistry.ts` (+9/-1)
- Model registry adjustments

### 12. `src/services/ReasoningService.ts` (+4/-1)
- Reasoning service provider adjustments

### 13. `scripts/load-dictionary.js` (new, 198 lines)
- Bulk dictionary loader: 521 terms (517 unique) across web dev, AI, marketing, etc.
- Uses sqlite3 CLI, supports `--append` flag

---

## Key Patterns & Conventions

### IPC Pattern (adding a new channel)
1. Add handler in `src/helpers/ipcHandlers.js` via `ipcMain.handle("channel-name", ...)`
2. Expose in `preload.js` via `contextBridge`
3. Add TypeScript type in `src/types/electron.ts`
4. Use in renderer via `window.electronAPI.channelName()`

### Settings Pattern
1. State in `src/hooks/useSettings.ts` via `useLocalStorage` hook
2. UI in `src/components/SettingsPage.tsx`
3. Persistence: localStorage (renderer) ↔ SQLite (main) ↔ `.env` (disk)

### Manager Pattern (main process singletons)
- Defined as classes in `src/helpers/`
- Instantiated in `main.js` → `initializeManagers()`
- Injected into `IPCHandlers` constructor

### Agent System
- Agent name stored in localStorage (`agentName` key), default: "OpenWhispr"
- Trigger: user says "Hey [AgentName]" → reasoning LLM detects → switches to instruction mode
- System prompt in `src/config/promptData.json` uses `{{agentName}}` placeholder
- Without trigger phrase: LLM does cleanup only (filler words, grammar)

---

## Database

- **Location**: `~/Library/Application Support/OpenWhispr-development/transcriptions-dev.db`
- **Engine**: better-sqlite3
- **Tables**: `transcriptions`, `custom_dictionary`
- Dictionary sync: localStorage ↔ SQLite on startup (useSettings.ts)

---

## Dev Commands

```bash
npm run dev              # Start dev (Vite + Electron concurrently)
npm run build            # Production build
npm run typecheck        # TypeScript check (cd src && tsc --noEmit)
npm run lint             # ESLint
npm run format           # ESLint fix + Prettier
node scripts/load-dictionary.js          # Reload dictionary (replace)
node scripts/load-dictionary.js --append # Add to existing dictionary
```

---

## Upstream Sync Protocol

**Remotes**:
- `origin` → `https://github.com/Kookylo/openwhispr.git` (our fork)
- `upstream` → `https://github.com/OpenWhispr/openwhispr.git` (source)

**Current status**: 6 commits ahead of upstream/main, 0 behind.

**Active upstream branches to watch**:
- `upstream/correction-monitoring`
- `upstream/gpu-detection`
- `upstream/neon-auth-refactor`
- `upstream/streaming-text`
- `upstream/windows-fast-paste`
- `upstream/feature/fix-ai-prompt-test`
- `upstream/referral-program`

**High-risk merge files** (our customizations overlap with upstream's most-edited files):
- `src/helpers/audioManager.js` — heaviest customization (517 lines added)
- `src/helpers/ipcHandlers.js` — custom IPC handlers
- `src/hooks/useSettings.ts` — dictionary normalization
- `src/components/SettingsPage.tsx` — paste handler

**Safe merge files** (additive-only, low conflict risk):
- `preload.js`, `src/types/electron.ts`, `src/main.jsx`, `src/helpers/environment.js`

---

## Rules for Cascade

1. **Never remove fork customizations** listed above without explicit user approval
2. **Always run `npm run typecheck`** after modifying `.ts`/`.tsx` files
3. **IPC changes require 3-file edits**: handler + preload + types
4. **audioManager.js is 88KB** — use targeted line-range reads, never read the whole file
5. **SettingsPage.tsx is 79KB** — same approach, read specific sections
6. **Dev server**: `npm run dev` from `/Users/the_pad/CascadeProjects/open_wisper/openwhispr`
7. **SQLite DB path**: `~/Library/Application Support/OpenWhispr-development/transcriptions-dev.db`
8. **Dictionary reloads** require app restart for SQLite→localStorage sync
9. **Streaming chunks** must always combine accumulated blobs (WebM EBML header requirement)
10. **Agent detection** happens in reasoning LLM — do NOT bypass reasoning for local sources
