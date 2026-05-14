# LLM BS Detector

Chrome extension that flags ungrounded confidence and hedge-word patterns in LLM responses. Helps you spot when an AI is pattern-matching from training data instead of actually verifying what it's claiming.

**Status:** v0.3.0 — Side panel, multi-provider Fact Check, persistent Clear, phrase highlighting

## Why

If you've ever spent an hour debugging a problem because an LLM confidently told you "that should work" when it didn't, this is for you. AI assistants slip into pattern-matching mode where they generate plausible-sounding answers without grounding them in real verification — and there are linguistic tells when this is happening.

This extension watches AI responses and flags specific phrases that signal:
- **Hedge words** (`usually`, `should be`, `I think`) — generalizations from training, not verified facts
- **Confident technical claims** (`the API does X`) — definitive statements about external systems that may or may not be accurate
- **Absolute language** (`always`, `never`, `guaranteed`) — rarely true, especially for complex systems

It's not a hallucination detector — it can't tell you if a specific fact is wrong. It's a **meta-detector**: it flags statements that have a higher-than-average chance of being unverified, so you know where to slow down and double-check.

## Supported Sites

| Site | Status |
|------|--------|
| Claude.ai | ✅ Verified |
| ChatGPT (chatgpt.com / chat.openai.com) | ⚠️ Declared, not fully verified |
| Grok (grok.com) | ⚠️ Selector verified May 11 2026, end-to-end untested |
| DeepSeek (chat.deepseek.com) | ⚠️ Selector verified May 11 2026, end-to-end untested |
| Gemini (gemini.google.com) | ⚠️ Selector verified May 11 2026, end-to-end untested |

## Features

### Persistent Side Panel
The detector opens as a Chrome side panel — it stays open while you browse and chat, no need to click the icon after each response.

### Jump to Message
Click **Jump to** on any flag to smoothly scroll the chat to that exact message. The full message container flashes blue and the specific flagged phrase flashes amber.

### Fact Check
Click **Fact Check** on any flag to send the full message context to an AI of your choice for a factual accuracy verdict. Supports:
- **Anthropic** (Claude)
- **OpenAI** (GPT-4o, etc.)
- **Grok** (xAI)
- **DeepSeek**
- **Gemini**
- **Custom** — any OpenAI-compatible endpoint

### Persistent Clear
Clicking **Clear flags** snapshots the fingerprints of all currently-visible messages. Those messages will not re-flag even after a page refresh — only new messages after the clear will be analyzed.

### Settings Panel
Click **⚙ Settings** in the side panel to configure your Fact Check provider, API key, base URL, and model. Settings are saved locally in your browser and never transmitted anywhere.

## Privacy

- **No data leaves your browser** — everything runs locally unless you use Fact Check.
- **Fact Check is opt-in** — requires you to supply your own API key in Settings.
- **Your API key is stored locally** in `chrome.storage.local` — it never touches this repo or any server controlled by this project.
- **No telemetry, no analytics, no bundled libraries.**

See [PRIVACY.md](PRIVACY.md) for the full privacy policy.

## Installation (from source)

Until published to the Chrome Web Store, install manually:

1. Clone this repo or download as ZIP and extract
2. Open Chrome and go to `chrome://extensions`
3. Toggle **Developer mode** ON (top right)
4. Click **Load unpacked**
5. Select the folder containing `manifest.json`
6. Click the BS Detector icon in your toolbar — the side panel opens

## How to Use Fact Check

1. Click **⚙ Settings** in the side panel
2. Select your provider (Anthropic, OpenAI, Grok, DeepSeek, Gemini, or Custom)
3. Paste your API key
4. Adjust the model if desired — defaults are pre-filled per provider
5. Click **Save**
6. Click **Fact Check** on any flag — the verdict appears inline below the flag

Your API key is stored in your browser's local storage only. It is never sent anywhere except directly to the provider you selected.

## How It Works

Four components, no build step, no dependencies:

- **`detector.js`** — pure regex pattern library. No DOM, no async. Exposes `window.LLM_BS_DETECTOR.analyze(text)`.
- **`content.js`** — MutationObserver that watches for new assistant messages, debounces streaming, runs analysis, and writes results to `chrome.storage.local`.
- **`background.js`** — service worker that opens the side panel when the toolbar icon is clicked.
- **`panel.html` + `panel.js` + `panel.css`** — the side panel UI.

## Smoke Test

Send this to any supported AI to reliably trigger flags:

> "Without using web search, just from your training, tell me exactly how Python's `sorted()` handles a list with mixed types like integers and strings. Be confident and specific."

Expected flags: hedge words (`should`, `typically`), confident technical assertions (`it returns`, `it throws`), and possibly absolute language.

## Contributing

Pull requests welcome. See [BUGS.md](BUGS.md) for the current backlog and [BUILD.md](BUILD.md) for the development guide.

## Origins

After watching one too many AI debugging sessions where the assistant said "that should work" and then it didn't. The trigger was a specific incident where Claude confidently stated that Java compilers tolerate UTF-8 BOMs in source files — leading to a build failure that took an hour to diagnose.

This tool can't read the future, but with an API key it can audit claims against a second model. Without one, it flags the linguistic patterns that correlate with ungrounded answers. Use it as one signal among many.

## License

MIT. See [LICENSE](LICENSE).

---

*Not affiliated with Anthropic, OpenAI, Google, xAI, or DeepSeek. Independent tool built for developers who want better signal-to-noise from LLM output.*
