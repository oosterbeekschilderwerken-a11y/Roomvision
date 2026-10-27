export const SURFACES = [
  { id: 1, key: "wall_001", name: "Muur 1" },
  { id: 2, key: "wall_002", name: "Muur 2" },
  { id: 3, key: "wall_003", name: "Muur 3" },
  { id: 4, key: "wall_004", name: "Muur 4" },
  { id: 5, key: "ceiling_001", name: "Plafond" },
  { id: 6, key: "door_001", name: "Deur" },
  { id: 7, key: "doorframe_001", name: "Deurkozijn" },
  { id: 8, key: "skirting_001", name: "Plinten" },
] as const;
export type Mask = { width: number; height: number; pixels: Uint8Array };
export type Point = { u: number; v: number };
export type Colors = Record<number, string>;
export type Snapshot = { mask: Mask; colors: Colors };
export type Document = Snapshot & { history: Snapshot[] };
export const wrap = (u: number) => ((u % 1) + 1) % 1;
// Three.js UVs have their origin at bottom-left; raster masks at top-left.
export function pixelAt(mask: Mask, { u, v }: Point) {
  const x = Math.floor(wrap(u) * mask.width);
  const y = Math.max(
    0,
    Math.min(mask.height - 1, Math.floor((1 - v) * mask.height)),
  );
  return y * mask.width + x;
}
export function surfaceAt(mask: Mask, uv: Point) {
  return mask.pixels[pixelAt(mask, uv)] || 0;
}
export function validHex(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value);
}
export function editDocument(
  doc: Document,
  change: Partial<Snapshot>,
  remember = true,
): Document {
  return {
    ...doc,
    ...change,
    history: remember
      ? [...doc.history.slice(-19), { mask: doc.mask, colors: doc.colors }]
      : doc.history,
  };
}
export function undoDocument(doc: Document): Document {
  const previous = doc.history.at(-1);
  return previous ? { ...previous, history: doc.history.slice(0, -1) } : doc;
}
export function paintMask(
  mask: Mask,
  points: Point[],
  id: number,
  radius: number,
): Mask {
  if (!Number.isInteger(id) || id < 0 || id > SURFACES.length)
    throw new Error("Onbekend oppervlak-ID");
  const pixels = new Uint8Array(mask.pixels);
  function dab(u: number, v: number) {
    const cx = wrap(u) * mask.width,
      cy = (1 - v) * mask.height;
    for (
      let y = Math.max(0, Math.floor(cy - radius));
      y <= Math.min(mask.height - 1, Math.ceil(cy + radius));
      y++
    ) {
      for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2)
          pixels[
            y * mask.width + (((x % mask.width) + mask.width) % mask.width)
          ] = id;
      }
    }
  }
  for (let i = 0; i < points.length; i++) {
    const p = points[i],
      previous = points[i - 1];
    if (!previous) {
      dab(p.u, p.v);
      continue;
    }
    let du = p.u - previous.u;
    if (du > 0.5) du -= 1;
    if (du < -0.5) du += 1;
    const dv = p.v - previous.v;
    const steps = Math.max(
      1,
      Math.ceil(
        Math.hypot(du * mask.width, dv * mask.height) / Math.max(1, radius / 2),
      ),
    );
    for (let s = 1; s <= steps; s++)
      dab(previous.u + (du * s) / steps, previous.v + (dv * s) / steps);
  }
  return { ...mask, pixels };
}
export function maskFromRGBA(
  width: number,
  height: number,
  rgba: Uint8ClampedArray,
): Mask {
  const pixels = new Uint8Array(width * height);
  for (let i = 0; i < pixels.length; i++) {
    if (
      rgba[i * 4] > SURFACES.length ||
      rgba[i * 4 + 1] !== 0 ||
      rgba[i * 4 + 2] !== 0 ||
      rgba[i * 4 + 3] !== 255
    )
      throw new Error(
        "Gebruik een ondoorzichtig ID-masker: rood 0 t/m 8, groen en blauw 0.",
      );
    pixels[i] = rgba[i * 4];
  }
  return { width, height, pixels };
}
