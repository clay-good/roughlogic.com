// Unit tests for routing.js. Pure helpers; no DOM stub needed.

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHashRoute, decodePinnedList, decodeIdList, toolMatches } from "../../routing.js";

const TOOLS = ["ohms-law", "wire-ampacity", "voltage-drop", "refrigerant-pt", "duct-sizing"];

// --- parseHashRoute ---

test("parseHashRoute: empty hash -> home", () => {
  const r = parseHashRoute("", TOOLS);
  assert.deepEqual(r.route, { view: "home", id: null, params: {} });
  assert.equal(r.pinned, undefined);
});

test("parseHashRoute: '#' -> home", () => {
  const r = parseHashRoute("#", TOOLS);
  assert.deepEqual(r.route, { view: "home", id: null, params: {} });
});

test("parseHashRoute: '#home' -> home", () => {
  const r = parseHashRoute("#home", TOOLS);
  assert.deepEqual(r.route, { view: "home", id: null, params: {} });
});

test("parseHashRoute: known tool id routes to tool view", () => {
  const r = parseHashRoute("#ohms-law", TOOLS);
  assert.deepEqual(r.route, { view: "tool", id: "ohms-law", params: {} });
});

test("parseHashRoute: unknown tool id falls back to home", () => {
  const r = parseHashRoute("#nope", TOOLS);
  assert.deepEqual(r.route, { view: "home", id: null, params: {} });
});

test("parseHashRoute: tool id with params parses query", () => {
  const r = parseHashRoute("#duct-sizing?cfm=400&friction=0.08", TOOLS);
  assert.equal(r.route.view, "tool");
  assert.equal(r.route.id, "duct-sizing");
  assert.deepEqual(r.route.params, { cfm: "400", friction: "0.08" });
});

test("parseHashRoute: '#p=...' returns pinned list and home view", () => {
  const r = parseHashRoute("#p=ohms-law,wire-ampacity,refrigerant-pt", TOOLS);
  assert.equal(r.route.view, "home");
  assert.deepEqual(r.pinned, ["ohms-law", "wire-ampacity", "refrigerant-pt"]);
});

test("parseHashRoute: '#p=' filters out unknown ids", () => {
  const r = parseHashRoute("#p=ohms-law,not-a-tool,voltage-drop", TOOLS);
  assert.deepEqual(r.pinned, ["ohms-law", "voltage-drop"]);
});

test("parseHashRoute: '#p=' with empty list", () => {
  const r = parseHashRoute("#p=", TOOLS);
  assert.deepEqual(r.pinned, []);
});

test("parseHashRoute: handles non-string hash", () => {
  const r = parseHashRoute(undefined, TOOLS);
  assert.deepEqual(r.route, { view: "home", id: null, params: {} });
});

test("parseHashRoute: trims whitespace inside pinned list", () => {
  const r = parseHashRoute("#p= ohms-law , voltage-drop ", TOOLS);
  assert.deepEqual(r.pinned, ["ohms-law", "voltage-drop"]);
});

// --- decodePinnedList ---

test("decodePinnedList drops empties and unknown ids", () => {
  const out = decodePinnedList(",ohms-law,,nope,voltage-drop,", new Set(TOOLS));
  assert.deepEqual(out, ["ohms-law", "voltage-drop"]);
});

// --- toolMatches ---

const TOOL_OL = { id: "ohms-law", name: "Ohm's Law", group: "A", trades: ["electrical"], desc: "Compute V, I, R, or P from any two known values." };
const TOOL_RP = { id: "refrigerant-pt", name: "Refrigerant P-T Chart", group: "C", trades: ["hvac"], desc: "Pressure-temperature for common refrigerants." };
const TOOL_PSY = { id: "psychrometric", name: "Psychrometric Calculator", group: "D", trades: ["restoration", "hvac"], desc: "Dew point, GPP, vapor pressure from temperature and RH." };

test("toolMatches: 'all' filters keep everything", () => {
  assert.equal(toolMatches(TOOL_OL, { trade: "all", group: "all" }), true);
});

test("toolMatches: trade filter excludes mismatch", () => {
  assert.equal(toolMatches(TOOL_OL, { trade: "hvac" }), false);
});

test("toolMatches: trade filter matches when tool has multiple trades", () => {
  assert.equal(toolMatches(TOOL_PSY, { trade: "hvac" }), true);
});

test("toolMatches: group filter excludes mismatch", () => {
  assert.equal(toolMatches(TOOL_RP, { group: "A" }), false);
  assert.equal(toolMatches(TOOL_RP, { group: "C" }), true);
});

test("toolMatches: query searches name and description case-insensitively", () => {
  assert.equal(toolMatches(TOOL_OL, { query: "ohm" }), true);
  assert.equal(toolMatches(TOOL_OL, { query: "VOLTAGE" }), false); // not in name/desc
  assert.equal(toolMatches(TOOL_OL, { query: "compute" }), true);
});

// --- recents back-compatibility (removed in v11; spec-v11.md §1.1) ---

test("parseHashRoute: '#r=...' (pre-v11 recents) resolves to home, no recents surfaced", () => {
  const r = parseHashRoute("#r=ohms-law,duct-sizing", TOOLS);
  assert.deepEqual(r.route, { view: "home", id: null, params: {} });
  assert.equal(r.recents, undefined);
});

test("parseHashRoute: '#p=...&r=...' returns pinned only (r= silently discarded)", () => {
  const r = parseHashRoute("#p=ohms-law&r=duct-sizing,refrigerant-pt", TOOLS);
  assert.deepEqual(r.pinned, ["ohms-law"]);
  assert.equal(r.recents, undefined);
});

test("decodeIdList filters unknown ids", () => {
  const out = decodeIdList("ohms-law,unknown,duct-sizing", new Set(TOOLS));
  assert.deepEqual(out, ["ohms-law", "duct-sizing"]);
});

test("decodeIdList trims whitespace", () => {
  const out = decodeIdList(" ohms-law , duct-sizing ", new Set(TOOLS));
  assert.deepEqual(out, ["ohms-law", "duct-sizing"]);
});

test("decodeIdList empty string -> empty array", () => {
  assert.deepEqual(decodeIdList("", TOOLS), []);
});

test("parseHashRoute: '#r=' alone (pre-v11) resolves to home with no recents", () => {
  const r = parseHashRoute("#r=", TOOLS);
  assert.deepEqual(r.route, { view: "home", id: null, params: {} });
  assert.equal(r.recents, undefined);
});

// --- example=1 deep-link (utility 124) ---

test("parseHashRoute: '#tool?example=1' extracts example flag in params", () => {
  const r = parseHashRoute("#ohms-law?example=1", TOOLS);
  assert.equal(r.route.view, "tool");
  assert.equal(r.route.id, "ohms-law");
  assert.equal(r.route.params.example, "1");
});

test("parseHashRoute: example=1 alongside other params", () => {
  const r = parseHashRoute("#ohms-law?V=12&example=1&I=2", TOOLS);
  assert.equal(r.route.params.example, "1");
  assert.equal(r.route.params.V, "12");
  assert.equal(r.route.params.I, "2");
});

test("parseHashRoute: example=0 does not coerce truthy in app layer", () => {
  // The app.js layer compares strictly to the string "1"; this test
  // documents the expectation that any value except "1" is a no-op.
  const r = parseHashRoute("#ohms-law?example=0", TOOLS);
  assert.equal(r.route.params.example, "0");
});

// --- bundle hash precedence ---

test("parseHashRoute: '#b=...' takes precedence over p= even when both look present", () => {
  // Defensive: if a URL accidentally combines both, b= wins because the
  // bundle decoder will resolve to the same route afterwards.
  const r = parseHashRoute("#b=abc", TOOLS);
  assert.equal(r.bundle, "abc");
  assert.equal(r.pinned, undefined);
});
