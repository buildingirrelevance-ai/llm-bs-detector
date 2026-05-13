// content.js
// Runs on Claude.ai, ChatGPT, and chat.openai.com.
// Watches for new assistant messages, analyzes them, stores results.
// Communicates with panel.html via chrome.storage.local.

(function () {
  "use strict";

  if (!window.LLM_BS_DETECTOR) {
    console.error("[BS Detector] detector.js failed to load");
    return;
  }

  // ── Site detection and selectors ─────────────────────────────
  // Each site uses different DOM markers for assistant messages.
  // These are the most stable selectors as of late 2025/early 2026.
  // If a site updates its DOM, only this section needs maintenance.
  const HOST = window.location.hostname;
  let SELECTOR = null;

  if (HOST.includes("claude.ai")) {
    // Claude.ai marks assistant turns with this data attribute.
    SELECTOR = '.font-claude-response';
  } else if (HOST.includes("chatgpt.com") || HOST.includes("chat.openai.com")) {
    SELECTOR = '[data-message-author-role="assistant"]';
  } else {
    console.warn("[BS Detector] Unsupported host:", HOST);
    return;
  }

// ── State ────────────────────────────────────────────────────
  // Track which DOM nodes we've already analyzed so we don't double-flag.
  const analyzedNodes = new WeakSet();
  let allFlags = []; // flat list across all analyzed messages this session
  let messageCount = 0;
  let clearedFingerprints = new Set(); // persisted across refreshes

  // ── Fingerprinting ───────────────────────────────────────────
  // Stable hash of message text so we can recognize the same message
  // after a page refresh and skip it if the user has cleared it.
  // djb2 — fast, no crypto dependency, collisions don't matter at this scale.
  function fingerprint(text) {
    const normalized = (text || "").trim().slice(0, 500);
    let hash = 5381;
    for (let i = 0; i < normalized.length; i++) {
      hash = ((hash << 5) + hash) + normalized.charCodeAt(i);
      hash = hash | 0; // force 32-bit int
    }
    return "fp_" + hash;
  }

  // Load cleared fingerprints from storage on startup
  chrome.storage.local.get(["bsDetectorCleared"], (data) => {
    if (Array.isArray(data.bsDetectorCleared)) {
      clearedFingerprints = new Set(data.bsDetectorCleared);
    }
  });

  // ── Analysis trigger ─────────────────────────────────────────
  function analyzeNode(node) {
    if (analyzedNodes.has(node)) return;
    analyzedNodes.add(node);

    // Wait briefly for streaming to finish — re-analyze on stable text.
    // We use a debounce: if the node text hasn't changed for 1s, analyze.
    let lastText = node.innerText || "";
    let stableTimer = null;

const checkStable = () => {
      const currentText = node.innerText || "";
      if (currentText === lastText && currentText.length > 50) {
        // Skip if this message was cleared in a previous session
        const fp = fingerprint(currentText);
        if (clearedFingerprints.has(fp)) {
          return;
        }
        // Text stable, run analysis
        const result = window.LLM_BS_DETECTOR.analyze(currentText);
        if (result.flags.length > 0) {
          messageCount++;
          allFlags.push({
            messageIndex: messageCount,
            host: HOST,
            timestamp: Date.now(),
            textPreview: currentText.slice(0, 200),
            fingerprint: fp,
            flags: result.flags,
            score: result.score,
            yellowCount: result.yellowCount,
            redCount: result.redCount
          });
          persistResults();
        }
      } else {
        lastText = currentText;
        stableTimer = setTimeout(checkStable, 1000);
      }
    };

    stableTimer = setTimeout(checkStable, 1000);
  }

  // ── DOM observer ─────────────────────────────────────────────
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const addedNode of mutation.addedNodes) {
        if (addedNode.nodeType !== 1) continue; // skip text nodes
        // Check if added node IS an assistant message
        if (addedNode.matches && addedNode.matches(SELECTOR)) {
          analyzeNode(addedNode);
        }
        // Or contains one
        if (addedNode.querySelectorAll) {
          const matches = addedNode.querySelectorAll(SELECTOR);
          matches.forEach(analyzeNode);
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Also catch any messages already on page at script load
  document.querySelectorAll(SELECTOR).forEach(analyzeNode);

  // ── Persistence ──────────────────────────────────────────────
  // Store results so panel.html (popup) can read them.
  // Cleared when user opens a new chat or refreshes.
  function persistResults() {
    chrome.storage.local.set({
      bsDetectorResults: allFlags,
      bsDetectorHost: HOST,
      bsDetectorUpdated: Date.now()
    });
  }

// Initial empty state
  persistResults();

  // ── Clear request handler ────────────────────────────────────
  // Popup signals clear by setting bsDetectorClearRequest to a timestamp.
  // We snapshot all currently-visible assistant message fingerprints,
  // add them to the cleared list, persist, and wipe the live flags.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes.bsDetectorClearRequest) return;
    const visibleNodes = document.querySelectorAll(SELECTOR);
    visibleNodes.forEach((node) => {
      const text = node.innerText || "";
      if (text.length > 50) {
        clearedFingerprints.add(fingerprint(text));
      }
    });
    allFlags = [];
    messageCount = 0;
    chrome.storage.local.set({
      bsDetectorCleared: Array.from(clearedFingerprints),
      bsDetectorResults: [],
      bsDetectorUpdated: Date.now()
    });
  });

  console.log("[BS Detector] Active on", HOST);
})();