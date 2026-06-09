// Shared form-field helpers used by every calculator module.
//
// Centralizes the input/select/checkbox/output line builders so each
// calc-*.js does not redeclare them. Copy buttons emit "Copied"
// announcements through clipboard.js for consistent screen-reader
// behavior. textContent / createElement only - never innerHTML.

import { copyText } from "./clipboard.js";

export const DEBOUNCE_MS = 50;

export function debounce(fn, ms = DEBOUNCE_MS) {
  let t = 0;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function fmt(n, digits = 2) {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return "-";
  return Number(n).toFixed(digits);
}

export function makeNumber(label, id, attrs = {}) {
  const wrap = document.createElement("div");
  wrap.className = "field";
  const lab = document.createElement("label");
  lab.htmlFor = id;
  lab.textContent = label;
  const input = document.createElement("input");
  input.type = "number";
  input.id = id;
  input.inputMode = "decimal";
  input.autocomplete = "off";
  for (const [k, v] of Object.entries(attrs)) input.setAttribute(k, String(v));
  wrap.appendChild(lab);
  wrap.appendChild(input);
  return { wrap, input };
}

export function makeText(label, id, attrs = {}) {
  const wrap = document.createElement("div");
  wrap.className = "field";
  const lab = document.createElement("label");
  lab.htmlFor = id;
  lab.textContent = label;
  const input = document.createElement("input");
  input.type = "text";
  input.id = id;
  input.autocomplete = "off";
  for (const [k, v] of Object.entries(attrs)) input.setAttribute(k, String(v));
  wrap.appendChild(lab);
  wrap.appendChild(input);
  return { wrap, input };
}

export function makeTextarea(label, id, attrs = {}) {
  const wrap = document.createElement("div");
  wrap.className = "field";
  const lab = document.createElement("label");
  lab.htmlFor = id;
  lab.textContent = label;
  const input = document.createElement("textarea");
  input.id = id;
  input.autocomplete = "off";
  for (const [k, v] of Object.entries(attrs)) input.setAttribute(k, String(v));
  wrap.appendChild(lab);
  wrap.appendChild(input);
  return { wrap, input };
}

export function makeSelect(label, id, options) {
  const wrap = document.createElement("div");
  wrap.className = "field";
  const lab = document.createElement("label");
  lab.htmlFor = id;
  lab.textContent = label;
  const sel = document.createElement("select");
  sel.id = id;
  for (const o of options) {
    const opt = document.createElement("option");
    opt.value = o.value;
    opt.textContent = o.label;
    if (o.selected) opt.selected = true;
    sel.appendChild(opt);
  }
  wrap.appendChild(lab);
  wrap.appendChild(sel);
  return { wrap, select: sel };
}

export function makeCheckbox(label, id, checked = false) {
  const wrap = document.createElement("div");
  wrap.className = "field field-check";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.id = id;
  input.checked = checked;
  const lab = document.createElement("label");
  lab.htmlFor = id;
  lab.textContent = " " + label;
  wrap.appendChild(input);
  wrap.appendChild(lab);
  return { wrap, input };
}

export function makeOutputLine(parent, label, valueId) {
  const row = document.createElement("p");
  const lab = document.createElement("strong");
  lab.textContent = label + ": ";
  row.appendChild(lab);
  const span = document.createElement("span");
  span.id = valueId;
  span.className = "out-value";
  row.appendChild(span);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "copy-btn";
  btn.style.marginLeft = "8px";
  btn.textContent = "Copy";
  btn.addEventListener("click", () => copyText(span.textContent || "", btn));
  row.appendChild(btn);
  parent.appendChild(row);
  return span;
}

export function attachExampleButton(host, fillFn) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "example-btn";
  btn.textContent = "Test with example";
  btn.addEventListener("click", fillFn);
  host.insertBefore(btn, host.firstChild);
  return btn;
}
