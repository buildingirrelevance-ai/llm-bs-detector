# LLM BS Detector

Chrome extension that flags ungrounded confidence and hedge-word patterns in LLM responses. Helps you spot when an AI is pattern-matching from training data instead of actually verifying what it's claiming.

**Status:** v0.1.0 — pre-release, working on Claude.ai. ChatGPT support declared but not yet verified. See BUGS.md for known issues.

## Why

If you've ever spent an hour debugging a problem because an LLM confidently told you "that should work" when it didn't, this is for you. AI assistants slip into pattern-matching mode where they generate plausible-sounding answers without grounding them in real verification — and there are linguistic tells when this is happening.

This extension watches the AI's response and highlights specific phrases that signal:
- **Hedge words** (`usually`, `should be`, `I think`) — generalizations from training, not verified facts
- **Confident technical claims** (`the API does X`) — definitive statements about external systems that may or may not be accurate
- **Absolute language** (`always`, `never`, `guaranteed`) — rarely true, especially for complex systems
- **Promised verification** (`let me check...`) — watch for whether an actual tool call follows

It's not a hallucination detector — it can't tell you if a specific fact is wrong. It's a meta-detector: it flags statements that have a higher-than-average chance of being unverified, so you know where to slow down and double-check.

## Supported sites

- **Claude.ai** — verified working
- **ChatGPT** (chatgpt.com / chat.openai.com) — declared in manifest, not yet verified

Planned next:
- **DeepSeek** (chat.deepseek.com)
- **Grok** (grok.x.ai)
- **Gemini** (gemini.google.com)

PRs welcome for additional sites. Add the appropriate selector to `content.js` and an entry to `manifest.json`. See `BUILD.md` for guidance.

## Privacy

- **No data leaves your browser.** Everything runs locally.
- **No telemetry, no analytics, no API calls.**
- **No bundled libraries.** Every line of code is in this repo.
- Stored data (current session's flags) is in `chrome.storage.local` and clears when you open a new chat or refresh.
- Source is open and audit-able — read `content.js`, `detector.js`, `panel.js` for everything the extension does.

## Installation (from source)

Until published to Chrome Web Store, install manually:

1. Clone this repo or download as ZIP and extract
2. Open Chrome and go to `chrome://extensions`
3. Toggle **Developer mode** ON (top right)
4. Click **Load unpacked**
5. Select the folder containing `manifest.json`
6. The eye icon appears in your toolbar
7. Open Claude.ai and start chatting — flags appear when you click the icon

## Known limitation in v0.1.0

**Real-time detection is partially broken.** Flags don't always appear in the popup until you refresh the chat page. This is a known bug (see `BUGS.md` Bug #1) — the MutationObserver isn't catching all message insertions because of how React reconciles the DOM. Workaround: refresh the chat page after a back-and-forth exchange.

Will be fixed in v0.2.0.

## How it works

Three components, no build step, no dependencies:

- **`detector.js`** — pure regex pattern library. No DOM, no async. Takes a string, returns flagged spans with severity.
- **`content.js`** — runs on supported sites. Uses MutationObserver to watch for new assistant messages, debounces while text streams, calls detector on stable text.
- **`panel.html` + `panel.js` + `panel.css`** — the popup UI. Reads stored flags from `chrome.storage.local` and renders them in a side panel.

See `BUILD.md` for full architecture and modification guide.

## Patterns flagged

Currently 12 patterns across two severity levels:

**Yellow (hedge / pattern-matching signals):**
- should/would/could verbs
- usually/typically/generally generalizations
- probably/likely/maybe probability hedges
- I think/believe/suspect belief statements
- in theory/principle/practice theory hedges
- let me check/verify promised verifications
- from memory/off the top of my head self-described recall

**Red (confident-but-ungrounded claims):**
- "this/that/it works/handles/supports..." technical assertions
- always/never/guaranteed absolutes
- "the API/library/function does X" tool behavior claims
- "per the docs" without a link or quote
- trust me/believe me reassurance language

## What it doesn't catch

This catches the 80% case of low-quality LLM output. It does NOT catch:

- **Confident specific lies.** A wrong number stated cleanly will pass.
- **Code that looks right but isn't.** Semantic correctness is beyond regex.
- **Subtle pattern-matching.** A model that's been trained to avoid hedge words will still pattern-match — it just won't get caught here.

Treat this as a yellow-flag system, not a truth oracle. When you see a flag, slow down and verify. When you don't see a flag, you're not safe — you're just less obviously at risk.

## Contributing

Pull requests welcome. See `BUGS.md` for the current backlog. Useful additions:

- New site support (DeepSeek, Grok, Gemini, Copilot, Perplexity)
- Additional patterns (especially domain-specific: legal, medical, financial)
- Whitelist mechanism (some hedges are appropriate context — e.g., "I believe in" your project)
- Severity scoring tuneable per user
- Settings page for sensitivity adjustment
- Click-to-jump (clicking a flag scrolls the chat to the source location)

## License

MIT. See LICENSE.

## Origins

Built in roughly two hours after watching one too many AI debugging sessions where the assistant said "that should work" and then it didn't. The trigger was a specific incident where Claude confidently stated that Java compilers tolerate UTF-8 BOMs in source files — leading to a build failure that took an hour to diagnose. The whole class of problem is "AI confidently asserts a fact about an external system without verifying."

This tool can't read the future or audit truth. It just flags the linguistic patterns that show up when an AI is pattern-matching from training instead of actually grounding its answer. Use it as one signal among many.

---

This tool is not affiliated with Anthropic, OpenAI, Google, or any other AI vendor. It's an independent tool built for developers who use LLMs and want better signal-to-noise on their output.
