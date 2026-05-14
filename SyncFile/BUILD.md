# LLM BS Detector — Build & Development Guide

Reference for building, testing, and modifying the extension. Updated as the project evolves.

---

## Project Layout

```
C:\Dev\llm-bs-detector\
├── manifest.json          # Chrome extension manifest (MV3)
├── detector.js            # Pure regex pattern library — no DOM, no async
├── content.js             # DOM observer that runs on supported LLM chat sites
├── background.js          # Service worker — opens side panel on icon click
├── panel.html             # Side panel UI structure
├── panel.css              # Side panel UI styles (dark theme)
├── panel.js               # Side panel UI behavior + Fact Check logic
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── README.md
├── BUGS.md
├── BUILD.md               # This file
├── PRIVACY.md             # Privacy policy (required for Chrome Web Store)
└── LICENSE                # MIT
```

---

## Architecture Overview

Four layers, no build step, no dependencies.

### Layer 1: detector.js (Pure logic)
Pattern library plus `analyze(text)` → `{ flags, score, yellowCount, redCount }`. No DOM, no async, no Chrome APIs. Unit-testable in any browser console.

Exposes globally as `window.LLM_BS_DETECTOR.analyze(text)`.

### Layer 2: content.js (DOM observer)
Runs on supported LLM chat sites. Uses MutationObserver to detect new assistant messages. Debounces 1 second of stable text (to let streaming finish), runs `analyze()`, and writes results to `chrome.storage.local`.

Also handles:
- **Fingerprinting** — djb2 hash of first 500 chars per message
- **Cleared fingerprint list** — messages cleared by the user are stored and skipped on re-analysis after page refresh
- **Jump-to handler** — listens for `highlightMessage` messages from the panel and scrolls + highlights the target node

### Layer 3: background.js (Service worker)
Opens the side panel when the toolbar icon is clicked. Uses `chrome.sidePanel.setPanelBehavior` and `chrome.sidePanel.open`.

### Layer 4: panel.html / panel.js / panel.css (Side panel UI)
Reads from `chrome.storage.local`, renders flags, listens for storage changes to auto-update. Contains:
- Flag rendering with Jump to / Fact Check buttons
- Settings panel (provider, base URL, API key, model)
- Multi-provider Fact Check routing (Anthropic vs OpenAI-compatible)
- Clear flags button (signals content.js to snapshot cleared fingerprints)

---

## Supported Sites & Selectors

| Site | Host match | Selector | Verified |
|------|-----------|----------|---------|
| Claude.ai | `claude.ai` | `.font-claude-response` | ✅ |
| ChatGPT | `chatgpt.com`, `chat.openai.com` | `[data-message-author-role="assistant"]` | ⚠️ |
| Grok | `grok.com` | `[data-testid="assistant-message"]` | ⚠️ May 11 2026 |
| DeepSeek | `deepseek.com` | `.ds-markdown.ds-assistant-message-main-content` | ⚠️ May 11 2026 |
| Gemini | `gemini.google.com` | `model-response` | ⚠️ May 11 2026 |

---

## Build Process

No build step. Chrome loads files as-is.

### Validation

```powershell
# Confirm manifest is valid JSON
(Get-Content "C:\Dev\llm-bs-detector\manifest.json" -Raw | ConvertFrom-Json).manifest_version

# Confirm all referenced files exist
$manifest = Get-Content "C:\Dev\llm-bs-detector\manifest.json" -Raw | ConvertFrom-Json
$contentScripts = $manifest.content_scripts[0]
@($contentScripts.js + $contentScripts.css) | ForEach-Object {
    $path = "C:\Dev\llm-bs-detector\$_"
    if (Test-Path $path) { "OK: $_" } else { "MISSING: $_" }
}
```

---

## Loading the Extension in Chrome

1. `chrome://extensions`
2. Toggle **Developer mode** ON
3. Click **Load unpacked** → select `C:\Dev\llm-bs-detector`
4. Click the icon in the toolbar — side panel opens

After code changes:
1. `chrome://extensions` → reload icon on the extension card
2. Refresh any open supported-site tabs

---

## Common Modifications

### Updating a site selector

When a vendor changes their DOM:

1. Open the site in Chrome
2. Get an assistant message on screen
3. DevTools → Elements → click the message text
4. Test in Console: `document.querySelectorAll('YOUR_SELECTOR').length`
5. Update the selector in `content.js` in the host detection block
6. Add a `// verified [date]` comment

### Adding a new site

Three places:

**1. `manifest.json`** — add to `content_scripts.matches`
**2. `content.js`** — add host detection branch with selector
**3. `README.md`** — add to Supported Sites table

### Adding a detection pattern

In `detector.js`, add to the `PATTERNS` array:

```javascript
{
  regex: /\bsome pattern\b/gi,
  severity: "yellow",  // or "red"
  label: "Short label",
  explanation: "What this pattern signals and why it's worth checking."
}
```

Severity guidelines:
- **Yellow** — hedge language (signal of pattern-matching, not necessarily wrong)
- **Red** — confident-but-ungrounded claim or absolute statement

### Adding a new Fact Check provider

In `panel.js`, add to `PROVIDER_DEFAULTS`:

```javascript
myprovider: { baseUrl: "https://api.myprovider.com/v1", model: "their-model-name" }
```

Add an `<option>` to the select in `panel.html`. If the provider uses a non-OpenAI response shape, add a routing branch in `factCheck()` similar to the Anthropic path.

---

## Testing Workflow

### Quick smoke test (5 minutes)

1. Open Claude.ai
2. Send: *"Without using web search, just from your training, tell me exactly how Python's sorted() handles a list with mixed types. Be confident."*
3. Wait for full response
4. Check side panel — expect 2-3+ yellow flags

### Verify clear persistence

1. Generate flags
2. Click Clear flags
3. Refresh the page
4. Confirm cleared messages do not re-appear

### Debug storage from panel

Right-click inside the side panel → Inspect → Console:

```javascript
chrome.storage.local.get('bsDetectorResults', (data) => {
  console.log('Messages analyzed:', data.bsDetectorResults?.length || 0);
  console.log('Last preview:', data.bsDetectorResults?.at(-1)?.textPreview);
});

chrome.storage.local.get('bsDetectorCleared', (data) => {
  console.log('Cleared fingerprints:', data.bsDetectorCleared?.length || 0);
});
```

### Debug from chat page

F12 → Console on the chat site:

```javascript
console.log('Loaded:', !!window.LLM_BS_DETECTOR);
console.log('Pattern count:', window.LLM_BS_DETECTOR?.PATTERNS?.length);
```

---

## Publishing to GitHub

```powershell
cd C:\Dev\llm-bs-detector
git init
git add .
git commit -m "Initial commit: v0.3.0"
git branch -M main
git remote add origin https://github.com/buildingirrelevance-ai/llm-bs-detector.git
git push -u origin main
```

Add topics on GitHub: `chrome-extension`, `llm`, `ai-tools`, `claude`, `chatgpt`, `hallucination-detection`

---

## Publishing to Chrome Web Store

1. Create a developer account at https://chrome.google.com/webstore/devconsole ($5 one-time fee)
2. Zip the extension — exclude `.git`, dev scripts, and any local-only files:
```powershell
Compress-Archive -Path "C:\Dev\llm-bs-detector\*" -DestinationPath "C:\Dev\llm-bs-detector-v0.3.0.zip" -Force
```
3. Upload zip at the Chrome Web Store dashboard
4. Fill in store listing — use README for description, PRIVACY.md for privacy policy URL
5. Upload screenshots (1280×800 or 640×400)
6. Submit for review

---

## Versioning

Semantic versioning. v0.x = pre-release. v1.0.0 = first stable Web Store release.

To bump:
1. Update `version` in `manifest.json`
2. Update status line in `README.md`
3. Tag the commit: `git tag v0.3.0`

## Current Version: 0.3.0

Changes from v0.2.0:
- Side panel replaces popup
- Multi-provider Fact Check (Anthropic, OpenAI, Grok, DeepSeek, Gemini, Custom)
- Clear flags persists across page refresh via fingerprinting
- Phrase-level highlight on Jump to
- Grok, DeepSeek, Gemini selectors added
- Fixed: `sidePanel` permission camelCase bug
- Fixed: settings panel HTML structure
- Fixed: Fact Check button layout
- Fixed: Fact Check now sends full message context
