import { test } from "node:test";
import assert from "node:assert/strict";
import { selectConnected, outlineMask } from "../lib/selection.ts";
import { createVariant } from "../lib/variants.ts";
import { encodeProject, decodeProject } from "../lib/project.ts";
import {
  editDocument,
  undoDocument,
  redoDocument,
  type Document,
} from "../lib/surfaces.ts";
function fixture(wrapX = false) {
  const width = 40,
    height = 20,
    pixels = new Uint8Array(width * height),
    data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x,
        p = i * 4,
        c = x < 18 ? 195 : x > 21 ? 100 : 30;
      data.set([c, c, c, 255], p);
    }
  return {
    mask: { width, height, pixels, wrapX },
    image: { width, height, data },
  };
}
test("click selection creates real connected IDs independently without crossing different colors or existing surfaces", () => {
  const { mask, image } = fixture();
  const left = selectConnected(image, mask, { u: 0.2, v: 0.5 }, 1, 15);
  assert.equal(left.count, 18 * 20);
  assert.equal(mask.pixels[0], 0);
  assert.equal(left.mask.pixels[0], 1);
  assert.equal(left.mask.pixels[39], 0);
  const right = selectConnected(image, left.mask, { u: 0.8, v: 0.5 }, 2, 15);
  assert.equal(right.mask.pixels[0], 1);
  assert.equal(right.mask.pixels[39], 2);
  assert.equal(right.mask.pixels[20], 0);
  assert.throws(() =>
    selectConnected(image, left.mask, { u: 0.2, v: 0.5 }, 2, 15),
  );
});
test("ambiguous full-frame selections fail without changing the image mask", () => {
  const { mask, image } = fixture();
  image.data.fill(200);
  for (let p = 3; p < image.data.length; p += 4) image.data[p] = 255;
  assert.throws(
    () => selectConnected(image, mask, { u: 0.5, v: 0.5 }, 1),
    /te groot/,
  );
  assert.ok(mask.pixels.every((id) => id === 0));
});
test("connected color selection wraps only at a panorama seam", () => {
  const { mask, image } = fixture();
  for (let y = 0; y < 20; y++)
    for (let x = 0; x < 40; x++) {
      const p = (y * 40 + x) * 4,
        c = x < 4 || x > 35 ? 200 : 20;
      image.data.set([c, c, c, 255], p);
    }
  assert.equal(
    selectConnected(image, mask, { u: 0.01, v: 0.5 }, 1, 8).count,
    80,
  );
  assert.equal(
    selectConnected(image, { ...mask, wrapX: true }, { u: 0.01, v: 0.5 }, 1, 8)
      .count,
    160,
  );
});
test("outline rasterizes concave pixel shapes, protects existing IDs and crosses panorama seam correctly", () => {
  const { mask } = fixture();
  mask.pixels[10 * 40 + 10] = 2;
  const outline = outlineMask(
    mask,
    [
      { u: 0.1, v: 0.9 },
      { u: 0.5, v: 0.9 },
      { u: 0.5, v: 0.5 },
      { u: 0.3, v: 0.5 },
      { u: 0.3, v: 0.1 },
      { u: 0.1, v: 0.1 },
    ],
    1,
  );
  assert.equal(outline.pixels[2 * 40 + 5], 1);
  assert.equal(outline.pixels[15 * 40 + 18], 0);
  assert.equal(outline.pixels[10 * 40 + 10], 2);
  const seam = outlineMask(
    { ...mask, wrapX: true },
    [
      { u: 0.9, v: 0.8 },
      { u: 0.1, v: 0.8 },
      { u: 0.1, v: 0.2 },
      { u: 0.9, v: 0.2 },
    ],
    1,
  );
  assert.equal(seam.pixels[10 * 40], 1);
  assert.equal(seam.pixels[10 * 40 + 39], 1);
  assert.equal(seam.pixels[10 * 40 + 20], 0);
  assert.throws(() =>
    outlineMask(
      mask,
      [
        { u: 0.1, v: 0.1 },
        { u: 0.2, v: 0.2 },
      ],
      1,
    ),
  );
});
test("phase 3 variants are independent snapshots and survive undo/redo and v4 project files", () => {
  const { mask } = fixture();
  let doc: Document = { mask, colors: { 1: "#ce3434" }, history: [] };
  const variant = createVariant("Rood", doc);
  doc = editDocument(doc, { variants: [variant], colors: { 1: "#3265c4" } });
  assert.equal(variant.colors[1], "#ce3434");
  assert.equal(redoDocument(undoDocument(doc)).variants?.[0].name, "Rood");
  const saved = encodeProject(
    "Test",
    "data:image/png;base64,AQID",
    doc,
    "photo",
  );
  assert.equal(saved.version, 4);
  assert.equal(
    decodeProject(saved).snapshot.variants?.[0].colors[1],
    "#ce3434",
  );
  assert.throws(() =>
    decodeProject({
      ...saved,
      variants: [{ ...variant, colors: { 1: "invalid" } }],
    }),
  );
  assert.throws(() =>
    decodeProject({ ...saved, variants: Array(9).fill(variant) }),
  );
  assert.throws(() => createVariant(" ", doc));
  for (const version of [1, 2, 3])
    assert.deepEqual(
      decodeProject({ ...saved, version }).snapshot.variants,
      [],
    );
});
