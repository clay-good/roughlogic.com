import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReportPayload, collectReportInputs, sanitizedReportUrl } from "../../report-feedback.js";

function control({ id, type = "text", value = "", autocomplete = "", sensitive = false }) {
  return {
    id, type, value, disabled: false, tagName: "INPUT", dataset: sensitive ? { reportSensitive: "true" } : {},
    getAttribute(name) { return name === "autocomplete" ? autocomplete : name === "aria-label" ? id : ""; },
    closest() { return null; },
  };
}

function region(controls) {
  return {
    querySelectorAll(selector) { return selector.includes("input") ? controls : []; },
  };
}

test("private identity controls are absent from inputs and stored URL state", () => {
  const normal = control({ id: "hours", value: "8" });
  const name = control({ id: "crew-name", value: "Jane Doe", autocomplete: "given-name" });
  const card = control({ id: "card", value: "4111111111111111", autocomplete: "cc-number" });
  const inputRegion = region([normal, name, card]);
  assert.deepEqual(collectReportInputs(inputRegion), [{ label: "hours", value: "8" }]);
  const url = sanitizedReportUrl(
    inputRegion,
    "https://roughlogic.com/?customer=Jane#tip-out?v=1&hours=8&crew-name=Jane+Doe&card=4111111111111111&unknown=secret",
  );
  assert.equal(url, "https://roughlogic.com/#tip-out?v=1&hours=8");
});

test("a calculator with an explicitly private field omits its output snapshot", () => {
  const privateName = control({ id: "to-n-0", value: "Jane Doe", sensitive: true });
  const originalWindow = globalThis.window;
  globalThis.window = { location: { href: "https://roughlogic.com/#tip-out?to-n-0=Jane+Doe" } };
  try {
    const payload = buildReportPayload({
      tool: { id: "tip-out", name: "Tip Out" },
      inputRegion: region([privateName]),
      outputRegion: { querySelectorAll: () => [] },
      note: "", token: "token",
    });
    assert.doesNotMatch(JSON.stringify(payload), /Jane Doe/);
    assert.equal(payload.outputs.values.length, 0);
    assert.match(payload.outputs.text, /Output omitted/);
  } finally {
    globalThis.window = originalWindow;
  }
});
