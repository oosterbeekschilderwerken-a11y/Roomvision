import records from "../data/ral-classic.json" with { type: "json" };
export const PAINT_BRANDS = ["Sikkens", "Sigma", "Flexa"] as const;
export type PaintBrand = (typeof PAINT_BRANDS)[number];
export type PaintReference = {
  system: "RAL Classic";
  code: string;
  brand: PaintBrand | null;
};
export type PaintReferences = Record<number, PaintReference>;
export const RAL_COLORS = records;
export const RAL_FAMILIES: Record<string, string> = {
  "1": "Geel en beige",
  "2": "Oranje",
  "3": "Rood",
  "4": "Violet",
  "5": "Blauw",
  "6": "Groen",
  "7": "Grijs",
  "8": "Bruin",
  "9": "Wit en zwart",
};
const index = new Map(records.map((c) => [c.code, c]));
export function getRalColor(code: string) {
  return index.get(code);
}
const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
export function searchRal(query: string, family = "") {
  const key = normalize(query)
    .replace(/^ralclassic/, "")
    .replace(/^ral/, "");
  return records.filter(
    (c) =>
      (!family || c.code.startsWith(family)) &&
      (!key ||
        [c.code, c.name, c.sourceName].some((value) =>
          normalize(value).includes(key),
        )),
  );
}
export function isPaintReference(value: unknown): value is PaintReference {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return false;
  const ref = value as Record<string, unknown>;
  return (
    ref.system === "RAL Classic" &&
    typeof ref.code === "string" &&
    index.has(ref.code) &&
    (ref.brand === null || PAINT_BRANDS.some((b) => b === ref.brand))
  );
}
