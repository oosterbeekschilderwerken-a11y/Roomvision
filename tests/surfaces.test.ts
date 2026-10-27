import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import {
  surfaceAt,
  paintMask,
  editDocument,
  undoDocument,
  maskFromRGBA,
  validHex,
  type Mask,
  type Document,
} from "../lib/surfaces.ts";
function fixture(): Mask {
  const png = readFileSync(
    new URL("../public/room/surface-ids.png", import.meta.url),
  );
  const width = png.readUInt32BE(16),
    height = png.readUInt32BE(20),
    parts: Buffer[] = [];
  for (let p = 8; p < png.length; ) {
    const len = png.readUInt32BE(p),
      type = png.toString("ascii", p + 4, p + 8);
    if (type === "IDAT") parts.push(png.subarray(p + 8, p + 8 + len));
    p += 12 + len;
  }
  const data = inflateSync(Buffer.concat(parts)),
    pixels = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    assert.equal(data[y * (width * 3 + 1)], 0);
    for (let x = 0; x < width; x++)
      pixels[y * width + x] = data[y * (width * 3 + 1) + 1 + x * 3];
  }
  return { width, height, pixels };
}
test("fixture has eight real surface IDs, protected furniture and a continuous seam", () => {
  const mask = fixture();
  assert.deepEqual(
    [...new Set(mask.pixels)].sort(),
    [0, 1, 2, 3, 4, 5, 6, 7, 8],
  );
  assert.equal(surfaceAt(mask, { u: 0, v: 0.53 }), 1);
  assert.equal(surfaceAt(mask, { u: 1, v: 0.53 }), 1);
  assert.equal(surfaceAt(mask, { u: -0.001, v: 0.53 }), 1);
  // Camera facing cabinet: this ray hits furniture before wall_001.
  assert.equal(surfaceAt(mask, { u: 0, v: 0.44 }), 0);
  // Window on the east wall is protected; opposite door is a separate ID.
  assert.equal(surfaceAt(mask, { u: 0.945, v: 0.53 }), 0);
  assert.equal(surfaceAt(mask, { u: 0.5, v: 0.52 }), 6);
});
test("UV lookup wraps horizontally and clamps at both poles", () => {
  const mask = {
    width: 4,
    height: 2,
    pixels: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
  };
  assert.equal(surfaceAt(mask, { u: 1.01, v: 1 }), 1);
  assert.equal(surfaceAt(mask, { u: -0.1, v: 0 }), 8);
  assert.equal(surfaceAt(mask, { u: 0.3, v: 5 }), 2);
  assert.equal(surfaceAt(mask, { u: 0.3, v: -2 }), 6);
});
test("brush paints circular pixels across seam, interpolates strokes and erases without mutating original", () => {
  const mask = { width: 100, height: 50, pixels: new Uint8Array(5000) };
  const painted = paintMask(
    mask,
    [
      { u: 0.98, v: 0.5 },
      { u: 0.02, v: 0.5 },
    ],
    2,
    3,
  );
  assert.equal(painted.pixels[25 * 100], 2);
  assert.equal(painted.pixels[25 * 100 + 99], 2);
  assert.equal(painted.pixels[25 * 100 + 50], 0);
  assert.equal(painted.pixels[22 * 100 + 95], 0);
  assert.equal(mask.pixels[25 * 100], 0);
  const erased = paintMask(painted, [{ u: 0, v: 0.5 }], 0, 2);
  assert.equal(erased.pixels[25 * 100], 0);
});
test("independent colors, restore and mask strokes share undo history", () => {
  const mask = { width: 10, height: 5, pixels: new Uint8Array(50) };
  let doc: Document = { mask, colors: {}, history: [] };
  doc = editDocument(doc, { colors: { 1: "#CE3434" } });
  doc = editDocument(doc, { colors: { ...doc.colors, 2: "#3265C4" } });
  assert.deepEqual(doc.colors, { 1: "#CE3434", 2: "#3265C4" });
  doc = undoDocument(doc);
  assert.deepEqual(doc.colors, { 1: "#CE3434" });
  doc = editDocument(doc, {
    mask: paintMask(mask, [{ u: 0.5, v: 0.5 }], 1, 2),
  });
  doc = editDocument(
    doc,
    { mask: paintMask(doc.mask, [{ u: 0.6, v: 0.5 }], 1, 2) },
    false,
  );
  doc = undoDocument(doc);
  assert.equal(doc.mask, mask);
  assert.deepEqual(doc.colors, { 1: "#CE3434" });
});
test("mask import rejects unknown IDs, anti-aliased RGB and transparent pixels", () => {
  assert.equal(
    maskFromRGBA(1, 1, new Uint8ClampedArray([2, 0, 0, 255])).pixels[0],
    2,
  );
  for (const rgba of [
    [9, 0, 0, 255],
    [1, 1, 0, 255],
    [1, 0, 0, 0],
  ])
    assert.throws(() => maskFromRGBA(1, 1, new Uint8ClampedArray(rgba)));
  assert.ok(validHex("#3265C4"));
  assert.ok(!validHex("#abc"));
  assert.ok(!validHex("red"));
});
