// detector.js
// Pure detection logic — no DOM, no UI, no async.
// Exposes window.LLM_BS_DETECTOR.analyze(text) → { flags: [...], score }

(function () {
  "use strict";

  // ── Pattern definitions ──────────────────────────────────────
  // Each pattern: { regex, severity, label, explanation }
  // severity: "yellow" = hedge / pattern-matching signal
  //           "red" = stronger signal of confident-but-ungrounded claim

  const PATTERNS = [
    // ── YELLOW: classic hedge words ──
    {
      regex: /\b(should|would|could)\s+(work|be|do|handle|support|return|fail|succeed)\b/gi,
      severity: "yellow",
      label: "Hedge: should/would/could",
      explanation: "Conditional verb suggests the model is reasoning from priors, not verified behavior."
    },
    {
      regex: /\b(usually|typically|generally|in most cases|most of the time|often)\b/gi,
      severity: "yellow",
      label: "Generalization",
      explanation: "Generalizations from training data — may not hold for your specific case."
    },
    {
      regex: /\b(probably|likely|perhaps|maybe|might|may)\s+\w+/gi,
      severity: "yellow",
      label: "Probability hedge",
      explanation: "Uncertainty marker — the model is guessing, not confirming."
    },
    {
      regex: /\bI (think|believe|suspect|imagine|assume|guess)\b/gi,
      severity: "yellow",
      label: "Belief statement",
      explanation: "First-person belief, not first-person verification."
    },
    {
      regex: /\bin (theory|principle|practice)\b/gi,
      severity: "yellow",
      label: "Theory hedge",
      explanation: "Distinguishes ideal from actual behavior — flag for verification."
    },

    // ── RED: confident technical claims without verification ──
    {
      regex: /\b(this|that|it)\s+(works|behaves|handles|supports|returns|throws|implements)\b/gi,
      severity: "red",
      label: "Confident technical assertion",
      explanation: "Definitive claim about how something works. Verify against docs or tests."
    },
    {
      regex: /\b(always|never|guaranteed|definitely|certainly|absolutely)\b/gi,
      severity: "red",
      label: "Absolute claim",
      explanation: "Absolutes are rarely true. Especially suspicious for external systems and APIs."
    },
    {
      regex: /\b(?:the\s+)?(API|library|function|method|tool|compiler|interpreter|framework)\s+(does|will|can|cannot|won't|doesn't)\s+\w+/gi,
      severity: "red",
      label: "Tool behavior claim",
      explanation: "Specific behavior claim about a named system. High value to verify."
    },
    {
      regex: /\b(per|according to|based on)\s+(the\s+)?(docs|documentation|spec|specification|manual)\b/gi,
      severity: "red",
      label: "Cited docs without link",
      explanation: "Claims a documentation source — verify a link or quote was actually provided."
    },
    {
      regex: /\b(trust me|believe me|I assure you|rest assured)\b/gi,
      severity: "red",
      label: "Reassurance language",
      explanation: "Reassurance is a substitute for evidence. Demand the evidence."
    },

    // ── YELLOW: meta-language about its own process ──
    {
      regex: /\b(let me check|I'll verify|I'll search|I'll look up|let me search)\b/gi,
      severity: "yellow",
      label: "Promised verification",
      explanation: "Watch for whether an actual tool call or citation follows this promise."
    },
    {
      regex: /\b(from memory|off the top of my head|if I recall|if memory serves)\b/gi,
      severity: "yellow",
      label: "Self-described memory recall",
      explanation: "Model is explicitly drawing from training, not external sources."
    }
  ];

  // ── Analyzer ─────────────────────────────────────────────────
  function analyze(text) {
    if (!text || typeof text !== "string") {
      return { flags: [], score: 0, yellowCount: 0, redCount: 0 };
    }

    const flags = [];
    for (const pattern of PATTERNS) {
      const matches = [...text.matchAll(pattern.regex)];
      for (const match of matches) {
        flags.push({
          severity: pattern.severity,
          label: pattern.label,
          explanation: pattern.explanation,
          matchedText: match[0],
          index: match.index
        });
      }
    }

    // Sort by position in text so the panel reads top-to-bottom
    flags.sort((a, b) => a.index - b.index);

    const yellowCount = flags.filter(f => f.severity === "yellow").length;
    const redCount = flags.filter(f => f.severity === "red").length;
    // Score weights red 2x yellow
    const score = (redCount * 2) + yellowCount;

    return { flags, score, yellowCount, redCount };
  }

  // Expose globally for content.js
  window.LLM_BS_DETECTOR = { analyze, PATTERNS };
})();