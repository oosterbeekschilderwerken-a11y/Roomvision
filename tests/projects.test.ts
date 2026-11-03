import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeProject, decodeProject } from "../lib/project.ts";
import {
  editDocument,
  undoDocument,
  redoDocument,
  paintMask,
  type Document,
} from "../lib/surfaces.ts";
import { estimateLighting } from "../lib/lighting.ts";
const mask = {
  width: 4,
  height: 2,
  pixels: new Uint8Array([1, 1, 2, 0, 1, 2, 2, 0]),
};
const photo = "data:image/png;base64,AQID";
test("project roundtrip retains exact IDs, all colors and per-surface strengths without history or external URLs", () => {
  const saved = encodeProject("Mijn woonkamer", photo, {
    mask,
    colors: { 1: "#CE3434", 2: "#3265C4" },
    strengths: { 1: 0.4, 2: 0.8 },
  });
  const restored = decodeProject(JSON.parse(JSON.stringify(saved)));
  assert.deepEqual(restored.snapshot.mask, mask);
  assert.deepEqual(restored.snapshot.colors, { 1: "#CE3434", 2: "#3265C4" });
  assert.deepEqual(restored.snapshot.strengths, { 1: 0.4, 2: 0.8 });
  assert.equal(restored.name, "Mijn woonkamer");
  assert.equal(restored.photo, photo);
  for (const change of [
    { version: 99 },
    { photo: "https://evil.example/photo.jpg" },
    { photo: "data:image/svg+xml;base64,AQID" },
    { colors: { __proto__: "red", 9: "#ffffff" } },
    { strengths: { 1: 2 } },
    { mask: { ...saved.mask, width: 9000 } },
    { mask: { ...saved.mask, data: "AAAA" } },
  ])
    assert.throws(() => decodeProject({ ...saved, ...change }));
  assert.throws(() =>
    decodeProject({
      ...saved,
      mask: {
        ...saved.mask,
        data: btoa(String.fromCharCode(9, 1, 2, 0, 1, 2, 2, 0)),
      },
    }),
  );
});
test("redo restores complete state; editing after undo discards old future", () => {
  let doc: Document = { mask, colors: {}, history: [] };
  doc = editDocument(doc, { colors: { 1: "#CE3434" }, strengths: { 1: 0.5 } });
  doc = editDocument(doc, { colors: { ...doc.colors, 2: "#3265C4" } });
  const latest = doc;
  doc = undoDocument(doc);
  assert.equal(doc.colors[2], undefined);
  doc = redoDocument(doc);
  assert.deepEqual(doc.colors, latest.colors);
  assert.deepEqual(doc.strengths, { 1: 0.5 });
  doc = undoDocument(doc);
  doc = editDocument(doc, { colors: { 1: "#000000" } });
  assert.equal(doc.future?.length, 0);
  assert.equal(redoDocument(doc), doc);
});
test("protected brush preserves different surface IDs while allowing blank pixels and same surface edits", () => {
  const painted = paintMask(mask, [{ u: 0.5, v: 0.5 }], 1, 6, true);
  for (let i = 0; i < mask.pixels.length; i++)
    assert.equal(painted.pixels[i], mask.pixels[i] === 2 ? 2 : 1);
  const unprotected = paintMask(mask, [{ u: 0.5, v: 0.5 }], 1, 6, false);
  assert.ok(unprotected.pixels.every((id) => id === 1));
});
test("lighting reference follows each wall independently and keeps low-light values bounded", () => {
  const rgba = new Uint8ClampedArray([
    100, 100, 100, 255, 100, 100, 100, 255, 200, 200, 200, 255, 0, 0, 0, 255,
    100, 100, 100, 255, 200, 200, 200, 255, 200, 200, 200, 255, 0, 0, 0, 255,
  ]);
  const base = estimateLighting(mask, { width: 4, height: 2, data: rgba });
  assert.ok(base[1] > 0.1 && base[1] < 0.15);
  assert.ok(base[2] > 0.55 && base[2] < 0.6);
  assert.equal(base[3], 0.55);
  assert.ok(base.every((value) => value >= 0.04 && Number.isFinite(value)));
});
