import { pixelAt, wrap, type Mask, type Point } from "./surfaces.ts";
export type SelectionImage = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};
function checkId(id: number) {
  if (!Number.isInteger(id) || id < 1 || id > 8)
    throw new Error("Kies eerst een geldig oppervlak.");
}
// Connected, seed-relative color selection. This is local image processing,
// not semantic recognition of walls, furniture or materials.
export function selectConnected(
  image: SelectionImage,
  mask: Mask,
  point: Point,
  id: number,
  tolerance = 28,
) {
  checkId(id);
  if (
    image.width !== mask.width ||
    image.height !== mask.height ||
    image.data.length !== mask.width * mask.height * 4
  )
    throw new Error("Selectiebeeld en masker passen niet bij elkaar.");
  if (!Number.isFinite(tolerance) || tolerance < 4 || tolerance > 80)
    throw new Error("Ongeldige selectieruimte.");
  const start = pixelAt(mask, point),
    seed = start * 4;
  if (mask.pixels[start] && mask.pixels[start] !== id)
    throw new Error("Dit gebied hoort bij een ander oppervlak.");
  const pixels = new Uint8Array(mask.pixels),
    seen = new Uint8Array(pixels.length),
    queue = new Int32Array(pixels.length);
  let head = 0,
    tail = 1,
    count = 0;
  queue[0] = start;
  seen[start] = 1;
  const add = (index: number) => {
    if (!seen[index]) {
      seen[index] = 1;
      queue[tail++] = index;
    }
  };
  while (head < tail) {
    const index = queue[head++],
      p = index * 4;
    if (
      (mask.pixels[index] && mask.pixels[index] !== id) ||
      image.data[p + 3] < 200
    )
      continue;
    const dr = image.data[p] - image.data[seed],
      dg = image.data[p + 1] - image.data[seed + 1],
      db = image.data[p + 2] - image.data[seed + 2];
    if (
      0.299 * dr * dr + 0.587 * dg * dg + 0.114 * db * db >
      tolerance * tolerance
    )
      continue;
    pixels[index] = id;
    count++;
    if (count > pixels.length * 0.72)
      throw new Error(
        "Dit kleurgebied is te groot om als muur te kiezen. Gebruik Muur tekenen om de omtrek zelf aan te geven.",
      );
    const x = index % mask.width,
      y = Math.floor(index / mask.width);
    if (x > 0) add(index - 1);
    else if (mask.wrapX !== false) add(index + mask.width - 1);
    if (x < mask.width - 1) add(index + 1);
    else if (mask.wrapX !== false) add(index - mask.width + 1);
    if (y > 0) add(index - mask.width);
    if (y < mask.height - 1) add(index + mask.width);
  }
  if (count < 4)
    throw new Error(
      "Geen bruikbaar muurgebied gevonden. Klik iets verder van de rand of gebruik Muur tekenen.",
    );
  return { mask: { ...mask, pixels }, count };
}
export function outlineMask(
  mask: Mask,
  points: Point[],
  id: number,
  protectOthers = true,
): Mask {
  checkId(id);
  if (
    points.length < 3 ||
    points.length > 64 ||
    points.some(
      (p) =>
        !Number.isFinite(p.u) || !Number.isFinite(p.v) || p.v < 0 || p.v > 1,
    )
  )
    throw new Error("Kies 3 tot 64 hoekpunten voor de muuromtrek.");
  const vertices: Point[] = [];
  for (const point of points) {
    let u =
      mask.wrapX === false ? Math.max(0, Math.min(1, point.u)) : wrap(point.u);
    const previous = vertices.at(-1);
    if (previous && mask.wrapX !== false) {
      while (u - previous.u > 0.5) u--;
      while (u - previous.u < -0.5) u++;
    }
    vertices.push({ u, v: point.v });
  }
  const minU = Math.min(...vertices.map((p) => p.u)),
    maxU = Math.max(...vertices.map((p) => p.u));
  if (maxU - minU > 1)
    throw new Error(
      "De omtrek draait meer dan één keer om de foto. Begin opnieuw.",
    );
  const minY = Math.max(
      0,
      Math.floor((1 - Math.max(...vertices.map((p) => p.v))) * mask.height),
    ),
    maxY = Math.min(
      mask.height - 1,
      Math.ceil((1 - Math.min(...vertices.map((p) => p.v))) * mask.height),
    );
  const pixels = new Uint8Array(mask.pixels);
  let count = 0;
  for (let y = minY; y <= maxY; y++)
    for (
      let x = Math.floor(minU * mask.width);
      x < Math.ceil(maxU * mask.width);
      x++
    ) {
      if (mask.wrapX === false && (x < 0 || x >= mask.width)) continue;
      const u = (x + 0.5) / mask.width,
        v = 1 - (y + 0.5) / mask.height;
      let inside = false;
      for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        const a = vertices[i],
          b = vertices[j];
        if (
          a.v > v !== b.v > v &&
          u < ((b.u - a.u) * (v - a.v)) / (b.v - a.v) + a.u
        )
          inside = !inside;
      }
      if (inside) {
        const index =
          y * mask.width + (((x % mask.width) + mask.width) % mask.width);
        if (!protectOthers || pixels[index] === 0 || pixels[index] === id) {
          pixels[index] = id;
          count++;
        }
      }
    }
  if (count < 4)
    throw new Error(
      "De omtrek is te klein of ligt op één lijn. Kies de hoeken rondom de muur.",
    );
  return { ...mask, pixels };
}
export async function readSelectionImage(
  source: string,
  mask: Mask,
): Promise<SelectionImage> {
  const image = new Image();
  image.src = source;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = mask.width;
  canvas.height = mask.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("De foto kon niet voor selectie worden gelezen.");
  ctx.drawImage(image, 0, 0, mask.width, mask.height);
  return ctx.getImageData(0, 0, mask.width, mask.height);
}
