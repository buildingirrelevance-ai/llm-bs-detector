# Privacy Policy — LLM BS Detector

*Last updated: May 14, 2026*

---

## Overview

LLM BS Detector is a Chrome extension that analyzes AI assistant responses for linguistic patterns associated with unverified or ungrounded claims. This policy explains what data the extension accesses, what it does with that data, and what it does not do.

---

## Data the Extension Accesses

### Assistant message text
The extension reads the text content of AI assistant responses on supported websites (Claude.ai, ChatGPT, Grok, DeepSeek, Gemini). This text is analyzed locally on your device using pattern matching (regex). It is not transmitted anywhere by default.

### Your API key (optional)
If you choose to use the Fact Check feature, you may enter an API key for a third-party AI provider (such as Anthropic, OpenAI, xAI, DeepSeek, or Google). This key is:
- Stored locally in `chrome.storage.local` on your device only
- Never transmitted to the developers of this extension or any server controlled by this project
- Sent only to the API provider you explicitly selected, only when you click the Fact Check button

---

## Data the Extension Does NOT Collect

- No usage analytics or telemetry
- No crash reporting
- No user identifiers or account information
- No browsing history
- No data from pages other than the supported AI chat sites
- No personal information of any kind

---

## Local Storage

The extension stores the following data in `chrome.storage.local` on your device:

| Key | Contents | Purpose |
|-----|----------|---------|
| `bsDetectorResults` | Flagged message data (text preview, flag type, timestamp) | Displaying flags in the side panel |
| `bsDetectorCleared` | List of message fingerprints (hashed, not raw text) | Preventing re-flagging cleared messages after page refresh |
| `bsDetectorHost` | Hostname of the active chat site | Displaying the watched site in the panel header |
| `cfgProvider` | Your selected Fact Check provider name | Settings panel |
| `cfgBaseUrl` | Your configured API base URL | Settings panel |
| `cfgApiKey` | Your API key (stored locally only) | Fact Check requests |
| `cfgModel` | Your configured model name | Fact Check requests |

All data remains on your device. It is not synced via `chrome.storage.sync` and does not leave your browser.

---

## Third-Party API Calls

The Fact Check feature is **entirely opt-in**. It requires you to:
1. Enter your own API key in the Settings panel
2. Manually click the Fact Check button on a specific flag

When you do this, the extension sends the flagged message text to the API provider you selected. This transmission is subject to that provider's own privacy policy:

- Anthropic: https://www.anthropic.com/privacy
- OpenAI: https://openai.com/policies/privacy-policy
- xAI (Grok): https://x.ai/privacy
- DeepSeek: https://www.deepseek.com/privacy
- Google (Gemini): https://policies.google.com/privacy

The extension developers have no visibility into these requests.

---

## Permissions Justification

| Permission | Why it's needed |
|-----------|----------------|
| `storage` | Store flags, cleared message fingerprints, and settings locally |
| `sidePanel` | Display the BS Detector as a persistent Chrome side panel |
| `host_permissions` (API domains) | Allow the Fact Check feature to make API calls to the provider you choose |
| Content script on AI chat sites | Read assistant message text to run pattern analysis |

---

## No Affiliation

This extension is not affiliated with, endorsed by, or connected to Anthropic, OpenAI, Google, xAI, DeepSeek, or any other AI provider. It is an independent open-source tool.

---

## Contact

For questions about this privacy policy or the extension's data practices, open an issue at:
https://github.com/buildingirrelevance-ai/llm-bs-detector

---

## Changes to This Policy

If this policy changes materially, the updated version will be committed to the repository with an updated date at the top of this file. Continued use of the extension after changes constitutes acceptance of the updated policy.
