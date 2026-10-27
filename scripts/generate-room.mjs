// Reproducible equirectangular ray-traced fixture, not a photograph.
// Every visible sample receives the ID of its actual first-hit surface.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
const W = 2048,
  H = 1024;
function crc32(data) {
  let c = 0xffffffff;
  for (const b of data) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type),
    n = Buffer.alloc(4),
    c = Buffer.alloc(4);
  n.writeUInt32BE(data.length);
  c.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([n, t, data, c]);
}
function png(rgb) {
  const head = Buffer.alloc(13);
  head.writeUInt32BE(W);
  head.writeUInt32BE(H, 4);
  head[8] = 8;
  head[9] = 2;
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++)
    rgb.copy(raw, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", head),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
const origin = [0, 1.55, 0];
const boxes = [
  { min: [-2.7, 0, 2.25], max: [0.2, 0.72, 2.85], color: [102, 121, 112] },
  { min: [-2.7, 0.65, 2.65], max: [0.2, 1.12, 2.9], color: [110, 129, 118] },
  { min: [-2.8, 0.45, 2.2], max: [-2.5, 0.92, 2.87], color: [92, 110, 100] },
  { min: [0, 0.45, 2.2], max: [0.3, 0.92, 2.87], color: [92, 110, 100] },
  { min: [-1, 0.4, 0.55], max: [1, 0.54, 1.55], color: [143, 100, 65] },
  { min: [-0.88, 0, 0.65], max: [-0.76, 0.4, 0.77], color: [67, 54, 41] },
  { min: [0.76, 0, 1.3], max: [0.88, 0.4, 1.42], color: [67, 54, 41] },
  { min: [3.1, 0, -0.35], max: [3.75, 1, 0.35], color: [168, 118, 72] },
  { min: [3.24, 1, -0.22], max: [3.6, 1.15, 0.22], color: [198, 177, 148] },
];
function boxHit(d, b) {
  let lo = -Infinity,
    hi = Infinity,
    axis = 0;
  for (let a = 0; a < 3; a++) {
    let t1 = (b.min[a] - origin[a]) / d[a],
      t2 = (b.max[a] - origin[a]) / d[a];
    if (t1 > t2) [t1, t2] = [t2, t1];
    if (t1 > lo) {
      lo = t1;
      axis = a;
    }
    hi = Math.min(hi, t2);
  }
  return hi >= lo && lo > 0 ? { t: lo, axis } : null;
}
const image = Buffer.alloc(W * H * 3),
  mask = Buffer.alloc(W * H * 3);
const samples = {};
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const u = (x + 0.5) / W,
      v = (y + 0.5) / H,
      phi = u * Math.PI * 2,
      theta = v * Math.PI;
    const d = [
      Math.cos(phi) * Math.sin(theta),
      Math.cos(theta),
      Math.sin(phi) * Math.sin(theta),
    ];
    const tx = ((d[0] > 0 ? 4 : -4) - origin[0]) / d[0],
      ty = ((d[1] > 0 ? 3 : 0) - origin[1]) / d[1],
      tz = ((d[2] > 0 ? 3 : -3) - origin[2]) / d[2];
    let t = Math.min(tx, ty, tz),
      axis = t === tx ? 0 : t === ty ? 1 : 2;
    let id =
      axis === 0
        ? d[0] > 0
          ? 1
          : 3
        : axis === 2
          ? d[2] > 0
            ? 2
            : 4
          : d[1] > 0
            ? 5
            : 0;
    let p = d.map((a, i) => origin[i] + a * t),
      color =
        id === 5 ? [232, 231, 220] : id ? [203, 195, 178] : [136, 103, 73];
    // Baseboards follow the actual room perimeter. Door and window cut holes in wall masks.
    if (id > 0 && id < 5 && p[1] < 0.13) {
      id = 8;
      color = [224, 220, 208];
    }
    if (
      axis === 0 &&
      d[0] > 0 &&
      p[2] > -2.2 &&
      p[2] < -0.7 &&
      p[1] > 0.95 &&
      p[1] < 2.5
    ) {
      const frame =
        p[2] < -2.12 ||
        p[2] > -0.78 ||
        p[1] < 1.03 ||
        p[1] > 2.42 ||
        Math.abs(p[2] + 1.45) < 0.035;
      id = 0;
      color = frame
        ? [231, 228, 218]
        : [154 + 30 * (p[1] - 1), 190 + 10 * (p[1] - 1), 205];
    }
    if (axis === 0 && d[0] < 0 && p[2] > -0.65 && p[2] < 0.65 && p[1] < 2.3) {
      id = Math.abs(p[2]) > 0.55 || p[1] > 2.18 ? 7 : 6;
      color = id === 7 ? [224, 218, 202] : [168, 135, 98];
    }
    if (
      axis === 0 &&
      d[0] > 0 &&
      p[2] > 0.5 &&
      p[2] < 1.2 &&
      p[1] > 1.55 &&
      p[1] < 2.25
    ) {
      id = 0;
      color = [78, 94, 82];
      if (p[2] > 0.56 && p[2] < 1.14 && p[1] > 1.61 && p[1] < 2.19)
        color = [190, 165, 120];
    }
    for (const b of boxes) {
      const hit = boxHit(d, b);
      if (hit && hit.t < t) {
        t = hit.t;
        axis = hit.axis;
        p = d.map((a, i) => origin[i] + a * t);
        id = 0;
        color = b.color;
      }
    }
    // Deterministic fine texture, wood grain and broad window illumination.
    const grain =
      Math.sin(p[0] * 77 + p[2] * 91 + p[1] * 113) * 0.012 +
      Math.sin(p[0] * 211 + p[1] * 197) * 0.006;
    let shade =
      0.76 +
      0.17 * Math.max(0, 1 - Math.hypot(p[0] - 3.8, p[2] + 1.4) / 8) +
      grain;
    if (p[1] < 0.01) {
      shade *= 0.88 + 0.07 * Math.sin(p[0] * 24);
      if (Math.abs((p[0] + 4) % 0.55) < 0.012) shade *= 0.7;
    }
    // Broad soft occlusion behind furniture remains visible after recoloring.
    shade *=
      1 -
      0.16 *
        Math.exp(-((p[0] + 1.1) ** 2 + (p[2] - 2.7) ** 2) / 2) *
        Math.exp(-p[1]);
    const i = (y * W + x) * 3;
    for (let c = 0; c < 3; c++)
      image[i + c] = Math.max(0, Math.min(255, Math.round(color[c] * shade)));
    mask[i] = id;
    if (!samples[id] && y > H * 0.35 && y < H * 0.65) samples[id] = { x, y };
  }
mkdirSync("public/room", { recursive: true });
writeFileSync("public/room/panorama.png", png(image));
writeFileSync("public/room/surface-ids.png", png(mask));
writeFileSync(
  "public/room/fixture.json",
  JSON.stringify(
    {
      width: W,
      height: H,
      projection: "equirectangular",
      encoding: "red channel = integer surface ID, green/blue = 0",
      generated: true,
      samples,
    },
    null,
    2,
  ) + "\n",
);
console.log(`Generated ${W}×${H} room panorama and first-hit pixel mask.`);
