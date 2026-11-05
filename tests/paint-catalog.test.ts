import { test } from "node:test";
import assert from "node:assert/strict";
import {
  RAL_COLORS,
  searchRal,
  getRalColor,
  isPaintReference,
  type PaintReference,
} from "../lib/paint-catalog.ts";
import {
  editDocument,
  undoDocument,
  redoDocument,
  type Document,
} from "../lib/surfaces.ts";
import { encodeProject, decodeProject } from "../lib/project.ts";
test("pinned catalog has unique RAL codes, valid display colors and searchable Dutch/source names", () => {
  assert.equal(RAL_COLORS.length, 215);
  assert.equal(new Set(RAL_COLORS.map((c) => c.code)).size, 215);
  for (const c of RAL_COLORS) {
    assert.match(c.code, /^[1-9]\d{3}$/);
    assert.match(c.hex, /^#[0-9A-F]{6}$/);
    assert.ok(c.name && c.sourceName);
  }
  for (const q of [
    "RAL 9010",
    "9010",
    "RAL Classic 9010",
    "zuiver wit",
    "pure white",
  ])
    assert.ok(searchRal(q).some((c) => c.code === "9010"));
  assert.equal(searchRal("crème wit")[0].code, "9001");
  assert.equal(searchRal("9010", "7").length, 0);
  assert.equal(searchRal("bestaatniet").length, 0);
  assert.equal(
    isPaintReference({ system: "RAL Classic", code: "9999", brand: "Sikkens" }),
    false,
  );
  assert.equal(
    isPaintReference({
      system: "RAL Classic",
      code: "9010",
      brand: "verzonnen",
    }),
    false,
  );
});
test("RAL code and manufacturer preference survive unrelated edits, undo, redo and project roundtrip; v1 files still open", () => {
  const mask = { width: 2, height: 1, pixels: new Uint8Array([1, 2]) };
  const ref: PaintReference = {
    system: "RAL Classic",
    code: "9010",
    brand: "Sikkens",
  };
  let doc: Document = { mask, colors: {}, history: [] };
  doc = editDocument(doc, {
    colors: { 1: getRalColor("9010")!.hex },
    paintRefs: { 1: ref },
  });
  doc = editDocument(doc, { strengths: { 1: 0.6 } });
  doc = undoDocument(doc);
  assert.deepEqual(doc.paintRefs?.[1], ref);
  doc = redoDocument(doc);
  assert.deepEqual(doc.paintRefs?.[1], ref);
  const saved = encodeProject("RAL-kamer", "data:image/png;base64,AQID", doc);
  assert.equal(saved.version, 3);
  assert.deepEqual(decodeProject(saved).snapshot.paintRefs?.[1], ref);
  assert.deepEqual(
    decodeProject({ ...saved, version: 1, paintRefs: undefined }).snapshot
      .paintRefs,
    {},
  );
  assert.throws(() => decodeProject({ ...saved, colors: { 1: "#000000" } }));
  assert.throws(() =>
    decodeProject({
      ...saved,
      paintRefs: { 1: { ...ref, brand: "onbekend" } },
    }),
  );
  assert.throws(() =>
    decodeProject({ ...saved, paintRefs: { 1: { ...ref, code: "9999" } } }),
  );
});
