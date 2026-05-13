# LLM BS Detector — Build & Development Guide

Reference for building, testing, and modifying the extension. Updated as the project evolves.

---

## Project Layout

```
C:\Dev\llm-bs-detector\
├── manifest.json          # Chrome extension manifest (MV3)
├── detector.js            # Pure regex pattern library — no DOM, no async
├── content.js             # DOM observer that runs on supported LLM chat sites
├── panel.html             # Popup UI structure
├── panel.css              # Popup UI styles (dark theme)
├── panel.js               # Popup UI behavior
├── icons/
│   ├── icon16.png         # 16×16 toolbar icon
│   ├── icon48.png         # 48×48 extensions list icon
│   └── icon128.png        # 128×128 Chrome Web Store icon
├── README.md              # User-facing documentation
├── BUGS.md                # Bug tracker and feature backlog
├── BUILD.md               # This file
├── LICENSE                # MIT license
└── sync-to-claude.ps1     # Sync script for pushing to Claude project
```

---

## Architecture Overview

The extension is intentionally simple — three layers, no build step, no dependencies.

### Layer 1: detector.js (Pure logic)
Pattern library plus an `analyze(text)` function that takes a string and returns flagged spans with severity. No DOM access, no async, no Chrome APIs. This means it can be unit-tested in isolation by loading it in any browser console.

Exposes globally as `window.LLM_BS_DETECTOR.analyze(text)`.

### Layer 2: content.js (DOM observer)
Runs on supported LLM chat sites. Uses a MutationObserver to watch for new assistant messages. When a message appears, it debounces (waits 1 second of stable text to ensure streaming is done), runs `analyze()`, and writes results to `chrome.storage.local`.

Site detection is by hostname — different selectors for Claude.ai vs ChatGPT. The selectors live in a single `SELECTOR` variable per site, making them easy to update when LLM vendors change their DOM.

### Layer 3: panel.html / panel.js / panel.css (Popup UI)
The user-visible side panel. Reads from `chrome.storage.local`, renders flags grouped by message, listens for storage changes to auto-update.

---

## Build Process

There is no build step. Files are loaded as-is by Chrome. To "build" you only need to:
1. Make sure files exist at the paths in `manifest.json`
2. Make sure the JSON is valid
3. Make sure no JavaScript syntax errors are present

### Validation commands

```powershell
# Validate manifest.json is valid JSON
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

1. Open Chrome, go to `chrome://extensions`
2. Toggle **Developer mode** ON (top right)
3. Click **Load unpacked**
4. Navigate to `C:\Dev\llm-bs-detector` and click Select Folder

After making code changes:
1. Go to `chrome://extensions`
2. Find LLM BS Detector card
3. Click the circular reload icon (lower-right of card)
4. **Refresh any open Claude.ai or ChatGPT tabs** — content scripts only inject on page load

---

## Common Modifications

### Updating site selectors when LLM vendors change DOM

In `content.js`, find the site detection block:

```javascript
if (HOST.includes("claude.ai")) {
    SELECTOR = '.font-claude-response';
} else if (HOST.includes("chatgpt.com") || HOST.includes("chat.openai.com")) {
    SELECTOR = '[data-message-author-role="assistant"]';
}
```

To find the current correct selector:
1. Open the chat site in Chrome
2. Get an assistant message displayed
3. Open DevTools → Elements
4. Right-click the message → Inspect
5. Look at the element's classes and data attributes
6. Test in Console: `document.querySelectorAll('YOUR_SELECTOR').length` should match the visible message count

### Adding a new site (e.g., DeepSeek, Grok)

Three places to update:

**1. `manifest.json`** — Add to `content_scripts.matches`:
```json
"matches": [
    "https://claude.ai/*",
    "https://chatgpt.com/*",
    "https://chat.openai.com/*",
    "https://chat.deepseek.com/*"
]
```

**2. `content.js`** — Add detection branch:
```javascript
} else if (HOST.includes("deepseek.com")) {
    SELECTOR = '/* INVESTIGATE AND REPLACE */';
}
```

**3. `README.md`** — Add to Supported Sites section.

After changes: reload extension, refresh new site tab, confirm content script loads.

### Adding a new detection pattern

In `detector.js`, find the `PATTERNS` array. Add an entry:

```javascript
{
    regex: /\bsome pattern\b/gi,
    severity: "yellow",  // or "red"
    label: "Short label",
    explanation: "What this pattern indicates and why it's suspicious."
}
```

Severity guidelines:
- **Yellow** — hedge language or generalization (signal of pattern-matching, not necessarily wrong)
- **Red** — confident-but-ungrounded technical claim or absolute statement (higher chance of being unverified)

Reload extension, test on real LLM responses to make sure the pattern catches what you intend without false positives.

---

## Testing Workflow

### Quick smoke test (5 minutes)
1. Open Claude.ai
2. Send: `"Without using web search, just from your training, tell me how Python's sorted() handles a list with mixed types. Be confident."`
3. Wait for full response (let streaming finish)
4. Click extension icon
5. Expected: at least 2-3 yellow flags (typically `should`, `usually`, `I think` patterns)

### Debugging from the popup's own context
The popup runs in its own JavaScript context, separate from the page. To inspect storage:

1. Click extension icon to open popup
2. Right-click anywhere inside the popup
3. Click **Inspect**
4. In the new DevTools window, Console tab:
```javascript
chrome.storage.local.get('bsDetectorResults', (data) => {
    console.log('Total messages analyzed:', data.bsDetectorResults?.length || 0);
    console.log('Last preview:', data.bsDetectorResults?.[data.bsDetectorResults.length - 1]?.textPreview);
});
```

### Debugging from the chat page context
The content script runs in the page's context. To check if it's loaded:
1. Open Claude.ai or ChatGPT
2. F12 → Console
3. Run:
```javascript
console.log('Loaded:', !!window.LLM_BS_DETECTOR);
console.log('Pattern count:', window.LLM_BS_DETECTOR?.PATTERNS?.length);
```

If `Loaded: false`, the content script isn't injecting. Check chrome://extensions for errors on the extension card.

---

## Publishing to GitHub

(Not yet done — first task after v0.1.0 is feature-complete.)

Steps:

1. Create a new GitHub repository at `https://github.com/[your-username]/llm-bs-detector`
2. Decide visibility — public for open source, recommended for this project
3. From `C:\Dev\llm-bs-detector`:
```powershell
cd C:\Dev\llm-bs-detector
git init
git add .
git commit -m "Initial commit: v0.1.0"
git branch -M main
git remote add origin https://github.com/[your-username]/llm-bs-detector.git
git push -u origin main
```
4. On GitHub, add topics: `chrome-extension`, `llm`, `ai-safety`, `claude`, `chatgpt`
5. Update README's "Coming soon" section with a link to the repo
6. Update LICENSE if attribution should change

---

## Publishing to Chrome Web Store

(Not yet done — placeholder for when this is ready.)

Steps will involve:
1. Creating a Chrome Web Store developer account ($5 one-time fee)
2. Zipping the extension folder (excluding `.git`, `node_modules` if any, and dev-only files like sync scripts)
3. Filling out store listing (description, screenshots, privacy policy)
4. Submitting for review (typically a few days)

The extension already meets MV3 requirements and uses minimal permissions, so review should be quick.

---

## Privacy / Trust Considerations

When users install this extension, they're giving it permission to read every assistant message on Claude.ai and ChatGPT. Trust is earned by:

1. **Being open source** — anyone can read content.js to verify what's analyzed
2. **No network requests** — no API calls, no telemetry, no analytics
3. **Storage local only** — no `chrome.storage.sync` (which would mirror across devices via Google account)
4. **No bundled libraries** — every line of code is in this repo, no minified blobs

If we ever add features that require sending data anywhere (e.g., LLM-based analysis), it must be opt-in with clear disclosure in the README and popup.

---

## Versioning

Currently using semantic versioning. v0.x = pre-release. v1.0.0 will be the first stable Chrome Web Store release.

To bump version:
1. Update `version` field in `manifest.json`
2. Update version reference in README if mentioned
3. Reload extension in chrome://extensions
4. Tag the git commit (`git tag v0.1.0`)
