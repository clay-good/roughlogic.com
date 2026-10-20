// Calculator feedback client. Loaded only after a user opens a calculator's
// shared "Report a problem" control, so home and ordinary calculator use do
// not pay for reporting or contact Turnstile.

import { collectOutputs } from "./clipboard.js";
import { isPrivateControl } from "./hash-state.js";

const CONFIG_URL = "/api/reports/config";
const REPORT_URL = "/api/reports";
const TURNSTILE_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const NOTE_LIMIT = 160;
const OUTPUT_TEXT_LIMIT = 12000;
const MAX_FIELDS = 100;
let turnstilePromise = null;
let reportDialogOpen = false;

function bounded(value, max) {
  return String(value == null ? "" : value).trim().slice(0, max);
}

function labelFor(region, el) {
  if (el.id) {
    for (const label of region.querySelectorAll("label")) {
      if (label.htmlFor === el.id) return bounded(label.textContent, 120);
    }
  }
  const parent = el.closest ? el.closest(".field, .row-field") : null;
  const label = parent && parent.querySelector ? parent.querySelector("label") : null;
  return bounded((label && label.textContent) || el.getAttribute("aria-label") || el.id || "Input", 120);
}

function controlValue(el) {
  if (el.type === "checkbox" || el.type === "radio") return el.checked ? "Checked" : "Not checked";
  if (el.tagName === "SELECT") {
    const option = el.options && el.selectedIndex >= 0 ? el.options[el.selectedIndex] : null;
    return bounded((option && option.textContent) || el.value, 500);
  }
  return bounded(el.value, 500);
}

export function collectReportInputs(inputRegion) {
  if (!inputRegion) return [];
  const out = [];
  for (const el of inputRegion.querySelectorAll("input, select, textarea")) {
    if (out.length >= MAX_FIELDS) break;
    if (el.disabled || ["button", "submit", "reset", "hidden"].includes(el.type)) continue;
    if (isPrivateControl(el)) continue;
    out.push({ label: labelFor(inputRegion, el), value: controlValue(el) });
  }
  return out;
}

function outputText(outputRegion) {
  if (!outputRegion) return { text: "", truncated: false };
  const clone = outputRegion.cloneNode(true);
  for (const el of clone.querySelectorAll("button, [aria-hidden='true']")) el.remove();
  const normalized = String(clone.textContent || "").replace(/\s+/g, " ").trim();
  return {
    text: normalized.slice(0, OUTPUT_TEXT_LIMIT),
    truncated: normalized.length > OUTPUT_TEXT_LIMIT,
  };
}

export function collectReportOutputs(outputRegion) {
  const values = collectOutputs(outputRegion || { querySelectorAll: () => [] })
    .slice(0, MAX_FIELDS)
    .map((row) => ({ label: bounded(row.label, 120), value: bounded(row.value, 500) }));
  return { values, ...outputText(outputRegion) };
}

function containsPrivateControl(inputRegion) {
  return Boolean(inputRegion && [...inputRegion.querySelectorAll("input, select, textarea")]
    .some((el) => isPrivateControl(el)));
}

export function sanitizedReportUrl(inputRegion, source = window.location.href) {
  const url = new URL(source);
  url.search = "";
  const rawHash = url.hash.replace(/^#/, "");
  const split = rawHash.indexOf("?");
  if (split === -1) return url.href;
  const toolId = rawHash.slice(0, split);
  const current = new URLSearchParams(rawHash.slice(split + 1));
  const allowed = new Set(["v"]);
  if (inputRegion) {
    for (const el of inputRegion.querySelectorAll("input, select, textarea")) {
      if (el.id && !isPrivateControl(el)) allowed.add(el.id);
    }
  }
  for (const key of [...current.keys()]) {
    if (!allowed.has(key)) current.delete(key);
  }
  const query = current.toString();
  url.hash = "#" + toolId + (query ? "?" + query : "");
  return url.href;
}

export function buildReportPayload({ tool, inputRegion, outputRegion, note, token }) {
  const privateContext = containsPrivateControl(inputRegion);
  return {
    calculator_id: tool.id,
    calculator_name: tool.name,
    page_url: sanitizedReportUrl(inputRegion),
    note: bounded(note, NOTE_LIMIT),
    inputs: collectReportInputs(inputRegion),
    outputs: privateContext
      ? { values: [], text: "[Output omitted because this calculator contains a private field.]", truncated: false }
      : collectReportOutputs(outputRegion),
    turnstile_token: token,
  };
}

async function getConfig() {
  const response = await fetch(CONFIG_URL, {
    method: "GET",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("reporting unavailable");
  const config = await response.json();
  if (!config || typeof config.sitekey !== "string" || !config.sitekey) {
    throw new Error("reporting unavailable");
  }
  return config;
}

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (turnstilePromise) return turnstilePromise;
  turnstilePromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TURNSTILE_URL;
    script.defer = true;
    script.addEventListener("load", () => {
      if (window.turnstile) resolve(window.turnstile);
      else reject(new Error("Turnstile did not initialize"));
    }, { once: true });
    script.addEventListener("error", () => reject(new Error("Turnstile did not load")), { once: true });
    document.head.appendChild(script);
  }).catch((error) => {
    turnstilePromise = null;
    throw error;
  });
  return turnstilePromise;
}

function makeButton(label, className) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  return button;
}

export async function openReportDialog({ tool, inputRegion, outputRegion, trigger, host }) {
  if (!tool) return;
  return feedbackDialog({
    trigger, host,
    titleText: "Report a problem",
    contextText: tool.name + ": we will attach this calculator's URL, inputs, and results.",
    noteLabel: "What did you expect instead? (optional)",
    placeholder: "Example: I expected about 3% voltage drop.",
    noteRequired: false,
    sendLabel: "Send report",
    sentText: "Report sent",
    noun: "report",
    buildPayload: (note, token) => buildReportPayload({ tool, inputRegion, outputRegion, note, token }),
  });
}

// spec-v1971: when a search finds nothing, a reader can ask for the calculator.
// It travels the same bounded, Turnstile-checked, no-account path as a problem
// report: the search text, the top result ids the ranker showed (a ranker miss
// and a catalog gap look identical from outside), and one sentence.
export const QUERY_LIMIT = 200;
export function buildRequestPayload({ query, topIds, note, token, origin }) {
  return {
    kind: "request",
    calculator_id: "-",
    calculator_name: "request",
    page_url: new URL("/", origin || window.location.origin).href,
    note: bounded(note, NOTE_LIMIT),
    // Bidi and control characters pasted with a query would be refused by the
    // Worker; drop them so the request is not lost to an invisible mark.
    inputs: [{ label: "query", value: bounded(String(query == null ? "" : query).replace(/[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, ""), QUERY_LIMIT) }],
    outputs: { values: (topIds || []).slice(0, 3).map((id) => ({ label: "result", value: String(id) })), text: "", truncated: false },
    turnstile_token: token,
  };
}

export async function openRequestDialog({ query, topIds, trigger, host }) {
  return feedbackDialog({
    trigger, host,
    titleText: "Request a calculator",
    contextText: "We will send what you searched for" + (query ? " (\u201c" + bounded(query, QUERY_LIMIT) + "\u201d)" : "") + " with your sentence. Nothing else about you is sent.",
    noteLabel: "What were you trying to work out?",
    placeholder: "Example: how many sheets of drywall for a stairwell.",
    noteRequired: true,
    sendLabel: "Send request",
    sentText: "Request sent",
    noun: "request",
    buildPayload: (note, token) => buildRequestPayload({ query, topIds, note, token }),
  });
}

async function feedbackDialog({ trigger, host, titleText, contextText, noteLabel, placeholder, noteRequired, sendLabel, sentText, noun, buildPayload }) {
  const Noun = noun[0].toUpperCase() + noun.slice(1);
  if (!trigger || trigger.dataset.reportSent === "true" || reportDialogOpen) return;
  reportDialogOpen = true;
  trigger.disabled = true;

  const dialog = document.createElement("dialog");
  dialog.className = "report-dialog";
  dialog.setAttribute("aria-labelledby", "report-dialog-title");

  const title = document.createElement("h2");
  title.id = "report-dialog-title";
  title.textContent = titleText;
  dialog.appendChild(title);

  const context = document.createElement("p");
  context.className = "report-context";
  context.textContent = contextText;
  dialog.appendChild(context);

  const privacy = document.createElement("p");
  privacy.className = "report-privacy";
  privacy.textContent = "Do not include names, addresses, or other personal information.";
  dialog.appendChild(privacy);

  const label = document.createElement("label");
  label.htmlFor = "report-note";
  label.textContent = noteLabel;
  dialog.appendChild(label);

  const note = document.createElement("textarea");
  note.id = "report-note";
  note.maxLength = NOTE_LIMIT;
  note.rows = 3;
  note.autocomplete = "off";
  note.placeholder = placeholder;
  if (noteRequired) note.required = true;
  dialog.appendChild(note);

  const count = document.createElement("div");
  count.className = "report-count";
  count.textContent = NOTE_LIMIT + " characters remaining";
  dialog.appendChild(count);

  const turnstileHost = document.createElement("div");
  turnstileHost.className = "report-turnstile";
  dialog.appendChild(turnstileHost);

  const status = document.createElement("p");
  status.className = "report-status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  status.textContent = navigator.onLine ? "Preparing secure submission..." : "Reporting needs an internet connection.";
  dialog.appendChild(status);

  const actions = document.createElement("div");
  actions.className = "report-actions";
  const cancel = makeButton("Cancel", "report-cancel");
  const submit = makeButton(sendLabel, "report-submit");
  submit.disabled = true;
  actions.appendChild(cancel);
  actions.appendChild(submit);
  dialog.appendChild(actions);

  (host || document.body).appendChild(dialog);
  dialog.showModal();
  let token = "";
  let widgetId = null;
  let api = null;
  // A request needs its sentence; a problem report may go without one.
  const ready = () => Boolean(token) && (!noteRequired || note.value.trim().length > 0);
  note.addEventListener("input", () => {
    count.textContent = (NOTE_LIMIT - note.value.length) + " characters remaining";
    if (token) submit.disabled = !ready();
  });

  const close = () => {
    if (api && widgetId !== null) {
      try { api.remove(widgetId); } catch { /* dialog removal is sufficient */ }
    }
    if (dialog.open) dialog.close();
    dialog.remove();
    reportDialogOpen = false;
    trigger.disabled = trigger.dataset.reportSent === "true";
    if (trigger.isConnected) trigger.focus();
  };
  cancel.addEventListener("click", close);
  dialog.addEventListener("cancel", (event) => { event.preventDefault(); close(); });

  try {
    if (!navigator.onLine) return;
    const config = await getConfig();
    const turnstile = await loadTurnstile();
    if (!dialog.isConnected) return;
    api = turnstile;
    widgetId = api.render(turnstileHost, {
      sitekey: config.sitekey,
      action: "calculator-report",
      appearance: "interaction-only",
      size: "flexible",
      theme: "auto",
      callback: (value) => {
        token = value;
        submit.disabled = !ready();
        status.textContent = ready() ? "Ready to send." : "Write one sentence, then send.";
      },
      "expired-callback": () => {
        token = "";
        submit.disabled = true;
        status.textContent = "Security check expired. Please try it again.";
      },
      "error-callback": () => {
        token = "";
        submit.disabled = true;
        status.textContent = "Security check unavailable. Please try again later.";
      },
    });
    status.textContent = "Checking this submission...";
  } catch {
    status.textContent = "Reporting is temporarily unavailable. The calculator still works normally.";
    return;
  }

  submit.addEventListener("click", async () => {
    if (!ready() || submit.disabled) return;
    submit.disabled = true;
    cancel.disabled = true;
    status.textContent = "Sending " + noun + "...";
    try {
      const payload = buildPayload(note.value, token);
      const response = await fetch(REPORT_URL, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("report rejected");
      status.textContent = "Thanks. " + Noun + " saved.";
      trigger.dataset.reportSent = "true";
      trigger.textContent = sentText;
      setTimeout(close, 900);
    } catch {
      token = "";
      cancel.disabled = false;
      status.textContent = Noun + " not sent. Please try again later.";
      if (api && widgetId !== null) {
        try { api.reset(widgetId); } catch { /* leave submit disabled */ }
      }
    }
  });
}
