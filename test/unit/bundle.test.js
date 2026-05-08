// Unit tests for bundle.js (utility 121).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  encodeBundle,
  encodeBundleHash,
  decodeBundle,
  sanitizeBundle,
  BUNDLE_VERSION,
  BUNDLE_MAX_BYTES,
} from "../../bundle.js";

test("encode/decode roundtrip preserves pinned/recents/inputs", () => {
  const state = {
    pinned: ["ohms-law", "duct-sizing"],
    recents: ["voltage-drop"],
    inputs: { "ohms-law": { "ol-v": "12", "ol-i": "2" } },
  };
  const hash = encodeBundleHash(state);
  assert.ok(hash.startsWith("b="));
  const decoded = decodeBundle(hash);
  assert.equal(decoded.version, BUNDLE_VERSION);
  assert.deepEqual(decoded.pinned, state.pinned);
  assert.deepEqual(decoded.recents, state.recents);
  assert.deepEqual(decoded.inputs, state.inputs);
});

test("decodeBundle accepts raw JSON", () => {
  const json = encodeBundle({ pinned: ["ohms-law"], recents: [], inputs: {} });
  const r = decodeBundle(json);
  assert.deepEqual(r.pinned, ["ohms-law"]);
});

test("decodeBundle accepts a #b= form", () => {
  const hash = "#" + encodeBundleHash({ pinned: [], recents: [], inputs: {} });
  const r = decodeBundle(hash);
  assert.equal(r.version, BUNDLE_VERSION);
});

test("decodeBundle malformed JSON returns error", () => {
  const r = decodeBundle("{not json");
  assert.ok(r.error);
});

test("decodeBundle malformed base64url returns error", () => {
  const r = decodeBundle("b=!!!notbase64!!!");
  assert.ok(r.error);
});

test("decodeBundle wrong version returns error", () => {
  const text = JSON.stringify({ version: 99, pinned: [], recents: [], inputs: {} });
  const r = decodeBundle(text);
  assert.ok(r.error);
});

test("decodeBundle non-string input returns error", () => {
  const r = decodeBundle(null);
  assert.ok(r.error);
});

test("decodeBundle non-object input returns error", () => {
  const r = decodeBundle("[1,2,3]");
  assert.ok(r.error);
});

test("decodeBundle exceeding 32 KB returns error", () => {
  const big = "x".repeat(BUNDLE_MAX_BYTES + 100);
  const text = JSON.stringify({ version: 1, pinned: [], recents: [], inputs: { tool: { v: big } } });
  const r = decodeBundle(text);
  assert.ok(r.error);
});

test("encodeBundle defaults missing fields", () => {
  const json = encodeBundle({});
  const obj = JSON.parse(json);
  assert.deepEqual(obj.pinned, []);
  assert.deepEqual(obj.recents, []);
  assert.deepEqual(obj.inputs, {});
});

test("decodeBundle filters non-string ids", () => {
  const text = JSON.stringify({ version: 1, pinned: ["ohms-law", 7, null], recents: ["voltage-drop"], inputs: {} });
  const r = decodeBundle(text);
  assert.deepEqual(r.pinned, ["ohms-law"]);
});

test("sanitizeBundle drops unknown ids in pinned and recents", () => {
  const valid = new Set(["ohms-law", "voltage-drop"]);
  const s = sanitizeBundle({ version: 1, pinned: ["ohms-law", "fake-tool"], recents: ["voltage-drop", "another-fake"], inputs: { "ohms-law": { v: "1" }, "fake-tool": { v: "9" } } }, valid);
  assert.deepEqual(s.pinned, ["ohms-law"]);
  assert.deepEqual(s.recents, ["voltage-drop"]);
  assert.deepEqual(Object.keys(s.inputs), ["ohms-law"]);
});

test("sanitizeBundle drops non-object input values", () => {
  const valid = new Set(["ohms-law"]);
  const s = sanitizeBundle({ version: 1, pinned: [], recents: [], inputs: { "ohms-law": "not an object" } }, valid);
  assert.deepEqual(s.inputs, {});
});

test("encodeBundleHash payload is base64url (no '+', '/', or padding '=')", () => {
  const hash = encodeBundleHash({ pinned: ["ohms-law"], recents: [], inputs: {} });
  assert.ok(hash.startsWith("b="));
  const payload = hash.slice(2);
  assert.ok(!payload.includes("+"));
  assert.ok(!payload.includes("/"));
  assert.ok(!payload.includes("="));
});

test("decodeBundle handles strings with leading/trailing whitespace", () => {
  const json = encodeBundle({ pinned: ["ohms-law"], recents: [], inputs: {} });
  const r = decodeBundle("   " + json + "   ");
  assert.deepEqual(r.pinned, ["ohms-law"]);
});

test("BUNDLE_VERSION exported as 1", () => {
  assert.equal(BUNDLE_VERSION, 1);
});

test("BUNDLE_MAX_BYTES is 32 KB", () => {
  assert.equal(BUNDLE_MAX_BYTES, 32 * 1024);
});

test("parseHashRoute exposes bundle string for #b=...", async () => {
  const { parseHashRoute } = await import("../../routing.js");
  const r = parseHashRoute("#b=abc123", new Set(["ohms-law"]));
  assert.equal(r.bundle, "abc123");
  assert.deepEqual(r.route, { view: "home", id: null, params: {} });
});

test("encodeBundle preserves inputs for multiple calculators", () => {
  const state = {
    pinned: ["ohms-law", "wire-ampacity"],
    recents: ["voltage-drop"],
    inputs: {
      "ohms-law": { "ol-v": "12", "ol-i": "2" },
      "wire-ampacity": { "wa-awg": "12", "wa-mat": "copper" },
      "voltage-drop": { "vd-len": "100", "vd-cur": "20" },
    },
  };
  const r = decodeBundle(encodeBundle(state));
  assert.equal(Object.keys(r.inputs).length, 3);
  assert.equal(r.inputs["wire-ampacity"]["wa-mat"], "copper");
});

test("sanitizeBundle keeps inputs for known tools and drops the rest", () => {
  const valid = new Set(["ohms-law", "voltage-drop"]);
  const s = sanitizeBundle({
    version: 1,
    pinned: ["ohms-law"],
    recents: ["voltage-drop"],
    inputs: {
      "ohms-law": { "ol-v": "12" },
      "voltage-drop": { "vd-len": "100" },
      "fake-tool": { "x": "y" },
    },
  }, valid);
  assert.deepEqual(Object.keys(s.inputs).sort(), ["ohms-law", "voltage-drop"]);
});
