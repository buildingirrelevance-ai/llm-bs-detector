# LLM BS Detector — Bugs & Backlog

Living document tracking known bugs, limitations, and planned features. Newest entries at the top.

---

## Open Bugs

### Bug #3 — ChatGPT, Grok, DeepSeek, Gemini not end-to-end verified

**Severity:** Medium — may silently do nothing on these sites
**Reported:** May 14, 2026

**Symptom:**
DOM selectors for ChatGPT, Grok, DeepSeek, and Gemini have been added to `content.js` and verified against live DOM inspections (May 11 2026), but full end-to-end detection has not been confirmed. The extension may load on these sites without actually flagging responses.

**Selectors in use:**
- ChatGPT: `[data-message-author-role="assistant"]`
- Grok: `[data-testid="assistant-message"]`
- DeepSeek: `.ds-markdown.ds-assistant-message-main-content`
- Gemini: `model-response`

**Next step:**
Open each site, send a message containing hedge language, and confirm flags appear in the side panel. If not, open DevTools console and run:
```javascript
document.querySelectorAll('SELECTOR_HERE').length
```
Should return a count matching visible assistant messages. If 0, the selector has drifted.

**Workaround:** Claude.ai is fully verified. Use that for reliable detection until others are confirmed.

---

### Bug #2 — Grok stop-button selector unverified

**Severity:** Low — streaming behavior only
**Reported:** May 14, 2026

**Symptom:**
The stop-response detection for Grok was not verified against a live streaming response. The 1-second debounce in `content.js` should handle mid-stream analysis correctly in most cases, but partial responses could theoretically be flagged before streaming completes.

**Workaround:** The debounce logic waits for text to stabilize before analyzing. In practice this should catch most cases.

---

### Bug #1 — Real-time detection can miss messages on some sites

**Severity:** Medium — workflow annoyance
**Reported:** May 6, 2026

**Symptom:**
On some sites, new assistant responses are not flagged in real time. Instead, all messages are analyzed in a batch when the page loads or refreshes. This is because some frameworks (notably Claude.ai's React renderer) insert a wrapper element first and add the selector class later — by which point the MutationObserver has already processed the insertion.

**Root cause:**
The MutationObserver watches for `childList` mutations. If the selector class is added after the initial DOM insertion, the observer doesn't re-check the node.

**Proposed fix:**
Add `attributes: true` and `attributeFilter: ['class']` to the observer options so class additions trigger a re-check.

**Workaround:**
Refresh the page after a conversation. All messages will be batch-analyzed on load.

---

## Resolved Issues

### ✅ Clear flags does not persist across page refresh
**Resolved:** May 14, 2026

Cleared messages are now fingerprinted (djb2 hash of first 500 chars) and stored in `chrome.storage.local`. On page reload, the content script loads the cleared fingerprint list and skips any matching messages during batch analysis.

### ✅ Settings panel not visible when opened
**Resolved:** May 14, 2026

Duplicate `id="flagsList"` in `panel.html` was causing the settings panel to be sandwiched between two flag list containers and pushed off screen. Fixed by cleaning up the HTML structure.

### ✅ Fact Check button outside action container
**Resolved:** May 14, 2026

Misplaced closing `</div>` tag caused the Fact Check button to render outside `.bs-flag-actions`, breaking the side-by-side layout.

### ✅ Fact Check only evaluated the flagged phrase, not the full message
**Resolved:** May 14, 2026

The API prompt now includes the full message text (`textPreview`) alongside the flagged phrase, giving the fact-checker enough context to evaluate actual factual accuracy.

### ✅ chrome.sidePanel undefined despite permission declared
**Resolved:** May 14, 2026

Permission was declared as `"side_panel"` (snake_case) in the permissions array. Chrome requires `"sidePanel"` (camelCase). The `"side_panel"` manifest key for the config block remains snake_case — only the permissions array entry changes.

### ✅ Jump to button not working / CORS error on fact check
**Resolved:** May 14, 2026

`content.js` was missing a `chrome.runtime.onMessage` listener, so jump messages from the popup had no receiver. Added listener wired to `window.highlightMessage`. Anthropic fact check also required `"anthropic-dangerous-direct-browser-access": "true"` header for direct browser API calls.

---

## Backlog (Planned Features)

### Feature: Per-pattern statistics
Show in the panel which patterns fire most often across a session. Helps users understand what kind of language their AI uses most, and helps maintainers prioritize pattern improvements.

### Feature: Export flags to clipboard / file
Allow users to copy current session flags as JSON or markdown. Useful for sharing, reporting AI behavior to vendors, or research.

### Feature: Inline highlights in chat
Highlight flagged phrases directly in the chat UI with colored underlines, rather than (or in addition to) the side panel. More immediate but more invasive — should be opt-in.

### Feature: Sensitivity tuning
Let users disable specific patterns they find noisy, adjust score weights, or whitelist phrases. Requires an options page (`chrome.runtime.openOptionsPage`).

### Feature: Keyboard shortcut
Bind a hotkey (e.g., Ctrl+Shift+B) to open/focus the side panel. Uses the `commands` manifest key.

### Feature: Firefox support
Firefox uses `browser.*` APIs and partial MV3 support. Estimated 2-4 hours to port. Requires a separate MV2 manifest and submission to addons.mozilla.org.

---

## Known Limitations (By Design)

1. **Cannot detect specific factual lies.** A confidently-stated wrong number passes through clean. The detector flags linguistic patterns, not facts.
2. **Cannot detect semantic errors in code.** Code that looks right but is subtly wrong is not caught.
3. **Fact Check requires your own API key.** The extension itself makes no API calls — Fact Check is opt-in and uses credentials you supply.
4. **Pattern library is regex-based.** Fast and transparent but misses subtle ungrounded language that doesn't use hedge words.
5. **Passive observer only.** Will not stop, edit, or warn before a response is sent.
