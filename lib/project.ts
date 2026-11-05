import type { ImageKind } from "./image-kind.ts";
import {
  isPaintReference,
  getRalColor,
  type PaintReferences,
} from "./paint-catalog.ts";
import {
  validHex,
  type Snapshot,
  type Colors,
  type Strengths,
} from "./surfaces.ts";
export type Project = {
  format: "roomvision-project";
  version: 3;
  projection: ImageKind;
  name: string;
  photo: string;
  mask: { width: number; height: number; data: string };
  colors: Colors;
  strengths: Strengths;
  paintRefs: PaintReferences;
};
export const MAX_PROJECT_BYTES = 45 * 1024 * 1024;
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
export function encodeProject(
  name: string,
  photo: string,
  doc: Snapshot,
  projection: ImageKind = "panorama",
): Project {
  return {
    format: "roomvision-project",
    version: 3,
    projection,
    name,
    photo,
    mask: {
      width: doc.mask.width,
      height: doc.mask.height,
      data: bytesToBase64(doc.mask.pixels),
    },
    colors: { ...doc.colors },
    strengths: { ...doc.strengths },
    paintRefs: { ...doc.paintRefs },
  };
}
export function decodeProject(value: unknown): {
  name: string;
  photo: string;
  snapshot: Snapshot;
  projection: ImageKind;
} {
  if (
    !record(value) ||
    value.format !== "roomvision-project" ||
    (value.version !== 1 && value.version !== 2 && value.version !== 3)
  )
    throw new Error(
      "Dit is geen ondersteund RoomVision-project (versie 1, 2 of 3).",
    );
  if (
    typeof value.name !== "string" ||
    value.name.length > 255 ||
    typeof value.photo !== "string" ||
    value.photo.length > 36 * 1024 * 1024 ||
    !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(
      value.photo,
    )
  )
    throw new Error("Het project bevat geen geldige lokale foto.");
  const projection: ImageKind =
    value.version === 3 ? (value.projection as ImageKind) : "panorama";
  if (projection !== "photo" && projection !== "panorama")
    throw new Error("Onbekend afbeeldingstype in dit project.");
  const m = value.mask;
  if (
    !record(m) ||
    !Number.isInteger(m.width) ||
    !Number.isInteger(m.height) ||
    Number(m.width) < 1 ||
    Number(m.width) > 2048 ||
    Number(m.height) < 1 ||
    Number(m.height) > (projection === "photo" ? 2048 : 1024) ||
    Number(m.width) * Number(m.height) > 2048 * 1024 ||
    typeof m.data !== "string" ||
    m.data.length !== Math.ceil((Number(m.width) * Number(m.height)) / 3) * 4 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(m.data)
  )
    throw new Error(
      "Het projectmasker heeft een ongeldige grootte of encoding.",
    );
  const binary = atob(m.data);
  if (binary.length !== Number(m.width) * Number(m.height))
    throw new Error("Het projectmasker is onvolledig.");
  const pixels = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  if (pixels.some((id) => id > 8))
    throw new Error("Het projectmasker bevat onbekende oppervlak-ID’s.");
  if (!record(value.colors) || !record(value.strengths))
    throw new Error("Ongeldige projectkleuren.");
  const colors: Colors = {},
    strengths: Strengths = {};
  for (const [id, color] of Object.entries(value.colors)) {
    if (!/^[1-8]$/.test(id) || typeof color !== "string" || !validHex(color))
      throw new Error("Ongeldige projectkleuren.");
    colors[Number(id)] = color;
  }
  for (const [id, strength] of Object.entries(value.strengths)) {
    if (
      !/^[1-8]$/.test(id) ||
      typeof strength !== "number" ||
      !Number.isFinite(strength) ||
      strength < 0 ||
      strength > 1
    )
      throw new Error("Ongeldige kleursterkte.");
    strengths[Number(id)] = strength;
  }
  const paintRefs: PaintReferences = {};
  if (value.version === 2 || value.version === 3) {
    if (!record(value.paintRefs))
      throw new Error("Ongeldige RAL- en merkgegevens.");
    for (const [id, ref] of Object.entries(value.paintRefs)) {
      if (
        !/^[1-8]$/.test(id) ||
        !isPaintReference(ref) ||
        colors[Number(id)]?.toUpperCase() !== getRalColor(ref.code)?.hex
      )
        throw new Error(
          "De RAL-code, schermkleur of merkvoorkeur in dit project klopt niet.",
        );
      paintRefs[Number(id)] = {
        system: ref.system,
        code: ref.code,
        brand: ref.brand,
      };
    }
  }
  return {
    projection,
    name: value.name,
    photo: value.photo,
    snapshot: {
      mask: {
        width: Number(m.width),
        height: Number(m.height),
        pixels,
        ...(projection === "photo" ? { wrapX: false } : {}),
      },
      colors,
      strengths,
      paintRefs,
    },
  };
}
export function photoDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(new Error("Foto kon niet worden opgeslagen."));
    reader.readAsDataURL(blob);
  });
}
export function downloadProject(project: Project) {
  const blob = new Blob([JSON.stringify(project)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "roomvision.roomvision";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
