// content.js - Updated with Click-to-Jump functionality
(function () {
  "use strict";

  if (!window.LLM_BS_DETECTOR) {
    console.error("[BS Detector] detector.js failed to load");
    return;
  }

  const HOST = window.location.hostname;
  let SELECTOR = null;

  if (HOST.includes("claude.ai")) {
    SELECTOR = '.font-claude-response';
  } else if (HOST.includes("chatgpt.com") || HOST.includes("chat.openai.com")) {
    SELECTOR = '[data-message-author-role="assistant"]';
  } else if (HOST.includes("grok.com")) {
    SELECTOR = '[data-testid="assistant-message"]'; // verified May 11 2026
  } else if (HOST.includes("deepseek.com")) {
    SELECTOR = '.ds-markdown.ds-assistant-message-main-content'; // verified May 11 2026
  } else if (HOST.includes("gemini.google.com")) {
    SELECTOR = 'model-response'; // verified May 11 2026
  } else {
    console.warn("[BS Detector] Unsupported host:", HOST);
    return;
  }

  const analyzedNodes = new WeakSet();
  let allFlags = [];
  let messageCount = 0;
  let clearedFingerprints = new Set();

  // ── Fingerprinting ───────────────────────────────────────────
  function fingerprint(text) {
    const normalized = (text || "").trim().slice(0, 500);
    let hash = 5381;
    for (let i = 0; i < normalized.length; i++) {
      hash = ((hash << 5) + hash) + normalized.charCodeAt(i);
      hash = hash | 0;
    }
    return "fp_" + hash;
  }

  // ── Highlight and scroll to message ──────────────────────────
window.highlightMessage = function (fp) {
    const nodes = document.querySelectorAll(SELECTOR);
    for (const node of nodes) {
      const text = node.innerText || "";
      if (fingerprint(text) === fp) {
        node.scrollIntoView({ behavior: "smooth", block: "center" });
        
        // Temporary highlight
        const originalBg = node.style.background;
        node.style.transition = "background 0.4s ease";
        node.style.background = "#3b82f680";
        
        setTimeout(() => {
          node.style.background = originalBg || "";
        }, 2500);
        
        return;
      }
    }
  };

  // ── Message listener (from popup) ────────────────────────────
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "highlightMessage") {
      window.highlightMessage(message.fingerprint);
    }
  });

  // ── Analysis ─────────────────────────────────────────────────
  function analyzeNode(node) {
    if (analyzedNodes.has(node)) return;
    analyzedNodes.add(node);

    let lastText = node.innerText || "";
    let stableTimer = null;

    const checkStable = () => {
      const currentText = node.innerText || "";
      if (currentText === lastText && currentText.length > 50) {
        const fp = fingerprint(currentText);
        if (clearedFingerprints.has(fp)) return;

const result = window.LLM_BS_DETECTOR.analyze(currentText);
        messageCount++;
        allFlags.push({
          messageIndex: messageCount,
          host: HOST,
          timestamp: Date.now(),
          textPreview: currentText.slice(0, 2000),
          fingerprint: fp,
          flags: result.flags,
          score: result.score,
          yellowCount: result.yellowCount,
          redCount: result.redCount
        });
        persistResults();
      } else {
        lastText = currentText;
        stableTimer = setTimeout(checkStable, 1000);
      }
    };

    stableTimer = setTimeout(checkStable, 1000);
  }

  // ── Observer ─────────────────────────────────────────────────
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const addedNode of mutation.addedNodes) {
        if (addedNode.nodeType !== 1) continue;
        if (addedNode.matches && addedNode.matches(SELECTOR)) {
          analyzeNode(addedNode);
        }
        if (addedNode.querySelectorAll) {
          addedNode.querySelectorAll(SELECTOR).forEach(analyzeNode);
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Initial scan
  document.querySelectorAll(SELECTOR).forEach(analyzeNode);

  // ── Persistence ──────────────────────────────────────────────
  function persistResults() {
    chrome.storage.local.set({
      bsDetectorResults: allFlags,
      bsDetectorHost: HOST,
      bsDetectorUpdated: Date.now()
    });
  }

  persistResults();

  // Clear handler
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.bsDetectorClearRequest) {
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
    }
  });

  console.log("[BS Detector] Active on", HOST);
})();