import { test } from "node:test";
import assert from "node:assert/strict";
import { validateDimensions } from "../lib/panorama.ts";
import { maskDimensions, MAX_MASK_PIXELS } from "../lib/image-kind.ts";
import { paintMask, surfaceAt } from "../lib/surfaces.ts";
import { encodeProject, decodeProject } from "../lib/project.ts";
test("ordinary photos accept portrait, landscape and square without relaxing panorama requirements", () => {
  for (const [w, h] of [
    [1200, 800],
    [800, 1200],
    [1600, 1600],
    [4032, 3024],
  ]) {
    assert.equal(validateDimensions(w, h, "photo"), null);
    assert.ok(validateDimensions(w, h, "panorama"));
  }
  assert.ok(validateDimensions(100, 400, "photo"));
  assert.ok(validateDimensions(8192, 8192, "photo"));
  assert.equal(validateDimensions(4096, 2048, "panorama"), null);
});
test("mask sizing preserves aspect with bounded memory in both modes and keeps legacy panorama rounding", () => {
  for (const [w, h] of [
    [4032, 3024],
    [3024, 4032],
    [8192, 4096],
    [3000, 3000],
  ]) {
    const m = maskDimensions(w, h, "photo");
    assert.ok(
      m.width <= 2048 &&
        m.height <= 2048 &&
        m.width * m.height <= MAX_MASK_PIXELS,
    );
    assert.ok(Math.abs(m.width / m.height - w / h) < 0.01);
  }
  assert.deepEqual(maskDimensions(4096, 2047, "panorama"), {
    width: 2048,
    height: 1024,
  });
});
test("flat masks clamp at image edges; brushes and strokes never wrap to the opposite edge", () => {
  const mask = {
    width: 100,
    height: 50,
    pixels: new Uint8Array(5000),
    wrapX: false,
  };
  mask.pixels[25 * 100 + 99] = 2;
  assert.equal(surfaceAt(mask, { u: 1, v: 0.5 }), 2);
  assert.equal(surfaceAt(mask, { u: 0, v: 0.5 }), 0);
  const painted = paintMask(mask, [{ u: 0.01, v: 0.5 }], 1, 4);
  assert.equal(painted.pixels[2500], 1);
  assert.equal(painted.pixels[2599], 2);
  const stroke = paintMask(
    mask,
    [
      { u: 0.02, v: 0.5 },
      { u: 0.98, v: 0.5 },
    ],
    1,
    2,
  );
  assert.equal(stroke.pixels[2550], 1);
});
test("v4 photo projects retain projection and non-wrapping masks; v1/v2 projects remain panoramas", () => {
  const mask = {
    width: 2,
    height: 3,
    pixels: new Uint8Array([1, 1, 2, 2, 0, 0]),
    wrapX: false,
  };
  const project = encodeProject(
    "Staande foto",
    "data:image/png;base64,AQID",
    { mask, colors: { 1: "#ce3434" } },
    "photo",
  );
  const restored = decodeProject(project);
  assert.equal(restored.projection, "photo");
  assert.equal(restored.snapshot.mask.wrapX, false);
  assert.equal(project.version, 4);
  for (const version of [1, 2])
    assert.equal(decodeProject({ ...project, version }).projection, "panorama");
  assert.throws(() => decodeProject({ ...project, projection: "fisheye" }));
  assert.throws(() =>
    decodeProject({
      ...project,
      mask: { width: 2048, height: 2048, data: "" },
    }),
  );
});
