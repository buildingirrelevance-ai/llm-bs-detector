// panel.js
// Runs when the extension popup opens.
// Reads stored flags from chrome.storage.local, renders them, wires up controls.

(function () {
  "use strict";

  const flagsList = document.getElementById("flagsList");
  const redCount = document.getElementById("redCount");
  const yellowCount = document.getElementById("yellowCount");
  const hostName = document.getElementById("hostName");
  const clearBtn = document.getElementById("clearBtn");

  // ── Render ───────────────────────────────────────────────────
  function render(results, host) {
    if (host) {
      hostName.textContent = "Watching: " + host;
    }

    if (!results || results.length === 0) {
      flagsList.innerHTML = '<div class="bs-empty">No flags yet. Open Claude.ai or ChatGPT and start chatting — flags will appear here as the AI responds.</div>';
      redCount.textContent = "0";
      yellowCount.textContent = "0";
      return;
    }

    // Aggregate counts across all messages
    let totalRed = 0;
    let totalYellow = 0;
    for (const msg of results) {
      totalRed += msg.redCount || 0;
      totalYellow += msg.yellowCount || 0;
    }
    redCount.textContent = String(totalRed);
    yellowCount.textContent = String(totalYellow);

    // Build the flag list — most recent message first
    const sortedResults = [...results].reverse();
    const html = [];

    for (const msg of sortedResults) {
      // Sort flags within each message: red first, then yellow
      const sortedFlags = [...msg.flags].sort((a, b) => {
        if (a.severity === b.severity) return 0;
        return a.severity === "red" ? -1 : 1;
      });

      for (const flag of sortedFlags) {
        const severityClass = flag.severity === "red" ? "bs-flag-red" : "bs-flag-yellow";
        html.push(
          '<div class="bs-flag ' + severityClass + '">' +
            '<div class="bs-flag-label">' + escapeHtml(flag.label) + '</div>' +
            '<div class="bs-flag-match">' + escapeHtml(flag.matchedText) + '</div>' +
            '<div class="bs-flag-explanation">' + escapeHtml(flag.explanation) + '</div>' +
            '<div class="bs-flag-meta">Message #' + msg.messageIndex + ' · ' + formatTime(msg.timestamp) + '</div>' +
          '</div>'
        );
      }
    }

    flagsList.innerHTML = html.join("");
  }

  // ── Helpers ──────────────────────────────────────────────────
  function escapeHtml(str) {
    if (typeof str !== "string") return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatTime(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return hh + ":" + mm;
  }

  // ── Initial load + live updates ──────────────────────────────
  function loadAndRender() {
    chrome.storage.local.get(
      ["bsDetectorResults", "bsDetectorHost"],
      (data) => {
        render(data.bsDetectorResults, data.bsDetectorHost);
      }
    );
  }

  // Render on open
  loadAndRender();

  // Re-render when storage changes (new message analyzed by content.js)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.bsDetectorResults) {
      loadAndRender();
    }
  });

  // ── Clear button ─────────────────────────────────────────────
  // Signal content.js to snapshot currently-visible message fingerprints
  // into the cleared list, then wipe the flags. This makes "clear" persist
  // across page refreshes — previously-cleared messages won't re-flag.
  clearBtn.addEventListener("click", () => {
    chrome.storage.local.set({ bsDetectorClearRequest: Date.now() }, () => {
      // content.js will write back empty bsDetectorResults, which triggers
      // our storage listener to re-render. Render immediately too in case
      // the active tab isn't a supported chat site.
      chrome.storage.local.set({ bsDetectorResults: [] }, loadAndRender);
    });
  });
})();
