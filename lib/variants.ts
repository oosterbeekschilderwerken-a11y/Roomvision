import type { Colors, Strengths, Snapshot } from "./surfaces.ts";
import type { PaintReferences } from "./paint-catalog.ts";
export type ColorVariant = {
  id: string;
  name: string;
  colors: Colors;
  strengths: Strengths;
  paintRefs: PaintReferences;
};
export function createVariant(name: string, doc: Snapshot): ColorVariant {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 60)
    throw new Error("Geef de variant een naam van 1 tot 60 tekens.");
  return {
    id: crypto.randomUUID(),
    name: trimmed,
    colors: { ...doc.colors },
    strengths: { ...doc.strengths },
    paintRefs: structuredClone(doc.paintRefs || {}),
  };
}
export function downloadPNG(blob: Blob) {
  const url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = "roomvision-kleurontwerp.png";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
