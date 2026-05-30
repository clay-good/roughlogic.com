// Clipboard helpers (spec section 11.3).
//
// `copyText(text)` writes to the clipboard and announces "Copied" via the
// global live region. `addCopyAllButton(outputRegion)` walks the output
// region and appends a "Copy all" button when there are at least two
// labeled output rows; the button produces a labeled multi-line plaintext
// summary of every (label, value) pair.

let liveRegion = null;
function ensureLiveRegion() {
  if (liveRegion) return liveRegion;
  liveRegion = document.createElement("div");
  liveRegion.id = "live-announcer";
  liveRegion.setAttribute("role", "status");
  liveRegion.setAttribute("aria-live", "polite");
  // visually hidden but announced by screen readers
  liveRegion.style.cssText = "position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden;";
  document.body.appendChild(liveRegion);
  return liveRegion;
}

export function announce(text) {
  const r = ensureLiveRegion();
  r.textContent = "";
  setTimeout(() => { r.textContent = text; }, 10);
}

// Brief, visible "Copied!" confirmation on the button the user pressed.
// Purely decorative delight: screen readers still get the announce("Copied")
// from copyText, so this never double-announces. Feature-detects classList /
// dataset so it is a safe no-op under the minimal DOM stub used by the unit
// tests. The accent pulse honors prefers-reduced-motion via the global CSS
// transition-killer. Idempotent across rapid clicks: the restore timer is
// reset, and the original label is captured only once.
export function flashCopied(btn, label = "Copied!") {
  if (!btn || !btn.classList || typeof btn.classList.add !== "function") return;
  if (btn.dataset && btn.dataset.copyLabel === undefined) {
    btn.dataset.copyLabel = btn.textContent || "";
  }
  btn.classList.add("is-copied");
  btn.textContent = label;
  if (btn._copyTimer) clearTimeout(btn._copyTimer);
  btn._copyTimer = setTimeout(() => {
    btn.classList.remove("is-copied");
    if (btn.dataset && btn.dataset.copyLabel !== undefined) {
      btn.textContent = btn.dataset.copyLabel;
    }
  }, 1300);
}

export function copyText(text, btn) {
  if (!text) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => { announce("Copied"); flashCopied(btn); })
      .catch(() => announce("Copy failed"));
  } else {
    announce("Copy not supported in this browser");
  }
}

// Walk the output region and pull (label, value) pairs from `<p>` rows
// shaped as `<strong>Label:</strong> <span class="out-value">value</span> <button>...`.
// Falls back to the first `<strong>` text and the first `<span>` text on
// each `<p>` row, ignoring buttons.
export function collectOutputs(outputRegion) {
  const rows = outputRegion.querySelectorAll("p");
  const out = [];
  for (const row of rows) {
    const strong = row.querySelector("strong");
    if (!strong) continue;
    let label = (strong.textContent || "").replace(/:\s*$/, "").trim();
    if (!label) continue;
    const spans = row.querySelectorAll("span");
    let value = "";
    for (const s of spans) {
      const t = (s.textContent || "").trim();
      if (t) { value = t; break; }
    }
    if (!value) continue;
    out.push({ label, value });
  }
  return out;
}

export function addCopyAllButton(outputRegion, opts = {}) {
  if (!outputRegion) return null;
  // Avoid double-injection on re-render.
  const existing = outputRegion.querySelector(".copy-all-btn");
  if (existing) return existing;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "copy-all-btn";
  btn.textContent = "Copy all";
  btn.style.marginTop = "12px";
  btn.addEventListener("click", () => {
    const rows = collectOutputs(outputRegion);
    if (rows.length === 0) { announce("Nothing to copy"); return; }
    const summary = (opts.title ? opts.title + "\n" : "") +
      rows.map((r) => r.label + ": " + r.value).join("\n");
    copyText(summary, btn);
  });
  // Hidden by default; show only when there are 2+ output rows.
  refreshCopyAllVisibility(outputRegion, btn);
  outputRegion.appendChild(btn);
  // Re-evaluate visibility whenever the output region updates.
  const obs = new MutationObserver(() => refreshCopyAllVisibility(outputRegion, btn));
  obs.observe(outputRegion, { childList: true, subtree: true, characterData: true });
  return btn;
}

function refreshCopyAllVisibility(outputRegion, btn) {
  const rows = collectOutputs(outputRegion);
  btn.hidden = rows.length < 2;
}
