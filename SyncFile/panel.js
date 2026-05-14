// panel.js - Updated with Jump Button + Fact Check Button
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

    let totalRed = 0;
    let totalYellow = 0;
    for (const msg of results) {
      totalRed += msg.redCount || 0;
      totalYellow += msg.yellowCount || 0;
    }
    redCount.textContent = String(totalRed);
    yellowCount.textContent = String(totalYellow);

    const sortedResults = [...results].reverse();
    const html = [];

    for (const msg of sortedResults) {
      const sortedFlags = [...msg.flags].sort((a, b) => {
        if (a.severity === b.severity) return 0;
        return a.severity === "red" ? -1 : 1;
      });

      for (const flag of sortedFlags) {
        const severityClass = flag.severity === "red" ? "bs-flag-red" : "bs-flag-yellow";
        html.push(
          `<div class="bs-flag ${severityClass}" data-fingerprint="${msg.fingerprint}">` +
            `<div class="bs-flag-label">${escapeHtml(flag.label)}</div>` +
            `<div class="bs-flag-match">${escapeHtml(flag.matchedText)}</div>` +
            `<div class="bs-flag-explanation">${escapeHtml(flag.explanation)}</div>` +
            `<div class="bs-flag-meta">Message #${msg.messageIndex} · ${formatTime(msg.timestamp)}</div>` +
            
            `<div class="bs-flag-actions">` +
              `<button class="jump-btn" data-text="${encodeURIComponent(flag.matchedText)}" title="Jump to this message">Jump to</button>` +
              `<button class="fact-check-btn" data-text="${encodeURIComponent(flag.matchedText)}" data-context="${encodeURIComponent(msg.textPreview)}" title="Fact check this claim">Fact Check</button>` +
            `</div>` +
            `</div>`
        );
      }
    }

    flagsList.innerHTML = html.join("");
  }
  // ── Fact Check ───────────────────────────
  // Works with Anthropic, OpenAI, Grok, DeepSeek or any provider using the custom option. Provider and API details are configured in the ⚙ Settings panel. Results are returned directly in the panel for quick review. Note: Fact check button is included in the UI but can be disabled for specific sites (like GitHub) in the content script.
  // Configure via the ⚙ Settings panel — key is saved to chrome.storage.local.// ── Provider defaults ─────────────────────────────────────────
  const PROVIDER_DEFAULTS = {
    openai:    { baseUrl: "https://api.openai.com/v1",                              model: "gpt-4o-mini" },
    anthropic: { baseUrl: "https://api.anthropic.com",                              model: "claude-sonnet-4-20250514" },
    grok:      { baseUrl: "https://api.x.ai/v1",                                    model: "grok-3-mini" },
    deepseek:  { baseUrl: "https://api.deepseek.com/v1",                            model: "deepseek-chat" },
    gemini:    { baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-2.0-flash" },
    custom:    { baseUrl: "",                                                         model: "" }
  };

  async function loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["cfgProvider", "cfgBaseUrl", "cfgApiKey", "cfgModel"], (data) => {
        const provider = data.cfgProvider || "openai";
        const defaults = PROVIDER_DEFAULTS[provider] || PROVIDER_DEFAULTS.openai;
        resolve({
          provider,
          baseUrl: (data.cfgBaseUrl || defaults.baseUrl).replace(/\/$/, ""),
          apiKey:  data.cfgApiKey || "",
          model:   data.cfgModel  || defaults.model
        });
      });
    });
  }

  async function factCheck(claimedText, contextText) {
    const { provider, baseUrl, apiKey, model } = await loadSettings();

    if (!apiKey) {
      throw new Error("No API key set. Click ⚙ Settings to add one.");
    }

    const prompt = `An AI response was flagged for containing a potentially unverified claim. Here is the full AI response:\n\n"${contextText}"\n\nThe specific flagged phrase was: "${claimedText}"\n\nIn 2-4 sentences: Is the information in this response factually accurate? Focus on verifiable facts, not the phrasing. Be direct and cite your reasoning.`;

    // ── Anthropic path ──
    if (provider === "anthropic") {
      const response = await fetch(`${baseUrl}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model,
          max_tokens: 300,
          messages: [{ role: "user", content: prompt }]
        })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${response.status}`);
      }
      const data = await response.json();
      return data.content?.[0]?.text || "No response returned.";
    }

    // ── OpenAI-compatible path (OpenAI, Grok, DeepSeek, Gemini, Custom) ──
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        max_tokens: 300,
        messages: [
          { role: "system", content: "You are a fact-checker reviewing flagged claims from AI responses. Be direct and concise." },
          { role: "user",   content: prompt }
        ]
      })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${response.status}`);
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "No response returned.";
  }// End of fact-check function

  // ── Settings panel ────────────────────────────────────────────
  const settingsPanel = document.getElementById("settingsPanel");
  const settingsBtn   = document.getElementById("settingsBtn");
  const saveBtn       = document.getElementById("saveSettingsBtn");
  const cfgProvider   = document.getElementById("cfgProvider");
  const cfgBaseUrl    = document.getElementById("cfgBaseUrl");
  const cfgApiKey     = document.getElementById("cfgApiKey");
  const cfgModel      = document.getElementById("cfgModel");

  // Toggle settings panel visibility
  settingsBtn.addEventListener("click", () => {
    const visible = settingsPanel.style.display !== "none";
    settingsPanel.style.display = visible ? "none" : "block";
  });

  // Auto-fill base URL and model when provider changes
  cfgProvider.addEventListener("change", () => {
    const defaults = PROVIDER_DEFAULTS[cfgProvider.value];
    if (defaults) {
      cfgBaseUrl.value = defaults.baseUrl;
      cfgModel.value   = defaults.model;
    }
  });

  // Load saved settings into form on popup open
  loadSettings().then(({ provider, baseUrl, apiKey, model }) => {
    cfgProvider.value = provider;
    cfgBaseUrl.value  = baseUrl;
    cfgApiKey.value   = apiKey;
    cfgModel.value    = model;
  });

  // Save settings
  saveBtn.addEventListener("click", () => {
    chrome.storage.local.set({
      cfgProvider: cfgProvider.value,
      cfgBaseUrl:  cfgBaseUrl.value.trim(),
      cfgApiKey:   cfgApiKey.value.trim(),
      cfgModel:    cfgModel.value.trim()
    }, () => {
      saveBtn.textContent = "Saved ✓";
      setTimeout(() => { saveBtn.textContent = "Save"; }, 1500);
    });
  });
  // ── Click Handlers ───────────────────────────────────────────
  function setupClickHandlers() {
    flagsList.addEventListener("click", (e) => {
      const flagElement = e.target.closest(".bs-flag");
      if (!flagElement) return;

      const fingerprint = flagElement.dataset.fingerprint;

      if (e.target.classList.contains("jump-btn")) {
        // Jump to message in chat
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
              chrome.tabs.sendMessage(tabs[0].id, {
              action: "highlightMessage",
              fingerprint: fingerprint,
              matchedText: decodeURIComponent(e.target.dataset.text || "")
            });
          }
        });
      } 
      // Fact Check button is ready but commented out for GitHub (see next file)
      if (e.target.classList.contains("fact-check-btn")) {
        const claimedText = decodeURIComponent(e.target.dataset.text || "");
        const contextText = decodeURIComponent(e.target.dataset.context || "");
        if (!claimedText) return;

        // Find or create result container inside this flag card
        let resultEl = flagElement.querySelector(".bs-fact-result");
        if (!resultEl) {
          resultEl = document.createElement("div");
          resultEl.className = "bs-fact-result loading";
          flagElement.appendChild(resultEl);
        }

        resultEl.className = "bs-fact-result loading";
        resultEl.textContent = "Checking…";
        e.target.disabled = true;

        factCheck(claimedText, contextText)
          .then((verdict) => {
            resultEl.className = "bs-fact-result";
            resultEl.textContent = verdict;
          })
          .catch((err) => {
            resultEl.className = "bs-fact-result error";
            resultEl.textContent = "Error: " + err.message;
          })
          .finally(() => {
            e.target.disabled = false;
          });
      }// End of fact-check button handler
    });
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

  // ── Load & Render ────────────────────────────────────────────
  function loadAndRender() {
    chrome.storage.local.get(
      ["bsDetectorResults", "bsDetectorHost"],
      (data) => {
        render(data.bsDetectorResults, data.bsDetectorHost);
      }
    );
  }

  loadAndRender();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.bsDetectorResults) {
      loadAndRender();
    }
  });

  // Clear button
  clearBtn.addEventListener("click", () => {
    chrome.storage.local.set({ bsDetectorClearRequest: Date.now() }, () => {
      chrome.storage.local.set({ bsDetectorResults: [] }, loadAndRender);
    });
  });

  // Setup click handlers
  setupClickHandlers();

})();