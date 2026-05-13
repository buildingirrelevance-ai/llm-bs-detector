# LLM BS Detector — Bugs & Backlog

Living document tracking known bugs, limitations, and planned features. Newest entries at the top.

---

## Open Bugs

### Bug #1 — Real-time detection misses messages while popup is closed

**Severity:** Medium — workflow annoyance, not broken
**Reported:** May 6, 2026, during initial Claude.ai testing
**Discovered by:** Robert Bradshaw

**Symptom:**
When chatting with Claude.ai, new responses are not analyzed in real time. The popup shows stale flag counts unless the user refreshes the Claude.ai page or closes/reopens the popup. After a refresh, all messages on the page get analyzed in a single batch (confirmed by identical timestamps on multiple "different" messages in storage).

**Root cause analysis:**
The MutationObserver in `content.js` is set to watch `document.body` for added nodes, with a matcher that checks if the added node IS a `.font-claude-response` element OR contains one as a descendant. Neither condition is firing for streaming messages because:
1. Claude's React framework likely inserts a wrapper `<div>` first (without the `.font-claude-response` class)
2. The class is added LATER as React updates the DOM
3. By the time the class is present, the observer has already processed the initial wrapper insertion and stopped watching that subtree

**Evidence:**
- Storage inspection showed last 2 message previews have different content but identical timestamps (`11:54:06 AM`)
- Content script's batch-analyze line (`document.querySelectorAll(SELECTOR).forEach(analyzeNode)`) explains all flags appearing at once on page load

**Proposed fix (v0.2.0):**
Expand the observer to also watch for `attributes` mutations and re-check the SELECTOR after class changes. Specifically:

```javascript
observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['class']  // re-check when class changes
});
```

Plus add a periodic sweep (every 2 seconds) that re-runs `document.querySelectorAll(SELECTOR)` to catch anything the observer missed. Throttled to avoid CPU thrash.

**Workaround until fixed:**
Refresh the Claude.ai tab after a back-and-forth exchange. All messages on the page will be analyzed.

---

### Bug #2 — ChatGPT support not yet verified

**Severity:** Low — known untested
**Reported:** May 6, 2026

**Symptom:**
Manifest declares ChatGPT support (chatgpt.com and chat.openai.com) and `content.js` includes a selector for `[data-message-author-role="assistant"]`. Has not been tested end-to-end. Console check on chatgpt.com showed `LLM_BS_DETECTOR loaded: false`.

**Likely causes:**
- Selector may be outdated (OpenAI changes their DOM regularly)
- Extension reload may not have propagated to chatgpt.com tab
- ChatGPT's URL structure may use a path or subdomain not covered by the manifest match patterns

**Next step:**
Open chatgpt.com, run `console.log(window.location.href)` and `document.querySelectorAll('[data-message-author-role="assistant"]').length` to diagnose. Update selector if needed, possibly add additional URL patterns to manifest.

---

## Backlog (Planned Features)

### Feature: Add DeepSeek support

Add DeepSeek (chat.deepseek.com or similar) to the watched sites list. Requires:
- Investigating the correct URL pattern
- Identifying DeepSeek's assistant message DOM selector
- Adding to `manifest.json` content_scripts.matches
- Adding host detection branch in `content.js`
- Testing with real DeepSeek conversations

### Feature: Add Grok support

Add Grok (grok.x.ai or similar) to the watched sites list. Same investigation needed as DeepSeek. Possibly more complex if Grok runs inside the X.com (Twitter) UI instead of a dedicated chat page.

### Feature: Click flag to jump to source

When a user clicks a flag in the popup, scroll the chat page to the location of the flagged text and briefly highlight it. Implementation approach:
- Store the message DOM node reference (not just text) in the flag data
- On click, send a message from popup to content.js
- Content.js scrolls the node into view and adds a temporary highlight class
- Highlight class fades after 2 seconds

Estimated effort: 30-45 minutes.

### Feature: Settings page for sensitivity tuning

Currently the score weight (red×2 + yellow×1) and pattern severity assignments are hardcoded. A settings page would allow:
- Tuning score weights
- Disabling specific patterns the user finds noisy
- Whitelisting phrases (e.g., "I believe in" should not trigger "I believe")
- Adjusting the streaming debounce delay

Adds an `options_page` to manifest.json plus a `settings.html` and `settings.js`.

### Feature: Per-pattern statistics

Show in the popup which patterns fire most often. Helps users understand what kind of BS is most common, and helps the maintainer prioritize new patterns.

### Feature: Export flags to clipboard / file

Allow users to copy current session flags as JSON or markdown for sharing or analysis. Useful for reporting LLM behavior to vendors or for academic research on hedge-language patterns.

### Feature: Inline highlights instead of side panel

Currently flags only appear in the popup. v2 could highlight flagged phrases directly in the chat with colored underlines or borders. More immediate but more invasive — should be opt-in.

### Feature: Keyboard shortcut to open popup

Allow user to bind a hotkey (e.g., Ctrl+Shift+B) to open the BS Detector popup. Manifest V3 supports this via `commands` field.

---

## Known Limitations (By Design)

These are not bugs — they are deliberate scope limits for v1. Mentioned here so users understand what the tool does NOT do.

1. **Cannot detect specific factual lies.** A confidently-stated wrong number passes through clean. The detector flags linguistic patterns, not facts.
2. **Cannot detect semantic errors in code.** Code that looks right but is subtly wrong is not caught.
3. **No data leaves the browser.** No vendor analytics, no telemetry, no API calls. By design — but it also means no centralized improvement based on aggregate user data.
4. **Pattern library is regex-based, not LLM-based.** Cheap and fast but misses subtle pattern-matching that uses non-hedge language.
5. **No integration with the LLMs themselves.** This is a passive observer, not an interventional tool. It will not stop a bad response, edit it, or warn before it's sent.

---

## Resolved Issues

(none yet — this is a v0.1.0 launch document)
