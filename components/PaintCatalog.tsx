"use client";
import { useState } from "react";
import {
  PAINT_BRANDS,
  RAL_COLORS,
  RAL_FAMILIES,
  searchRal,
  getRalColor,
  type PaintReference,
  type PaintBrand,
} from "@/lib/paint-catalog";
export default function PaintCatalog({
  reference,
  onChoose,
}: {
  reference?: PaintReference;
  onChoose: (hex: string, reference: PaintReference) => void;
}) {
  const [query, setQuery] = useState(""),
    [family, setFamily] = useState("");
  const [preferredBrand, setPreferredBrand] = useState<PaintBrand | null>(
    reference?.brand ?? null,
  );
  const brand = reference ? reference.brand : preferredBrand;
  const matches = searchRal(query, family),
    selected = reference && getRalColor(reference.code);
  return (
    <details className="paint-catalog" open>
      <summary>RAL-kleuren &amp; verfmerk</summary>
      <label className="field-label" htmlFor="paint-brand">
        Gewenst verfmerk
      </label>
      <select
        id="paint-brand"
        value={brand ?? ""}
        onChange={(e) => {
          const next = (e.target.value || null) as PaintBrand | null;
          setPreferredBrand(next);
          if (reference) {
            const c = getRalColor(reference.code)!;
            onChoose(c.hex, { ...reference, brand: next });
          }
        }}
      >
        <option value="">Geen voorkeur</option>
        {PAINT_BRANDS.map((b) => (
          <option key={b}>{b}</option>
        ))}
      </select>
      <p className="catalog-note">
        RAL is merkonafhankelijk. Het merk is je voorkeur; mengbaarheid en
        beschikbaarheid hangen af van product en leverancier. Eigen
        merkcollecties zijn nog niet opgenomen.
      </p>
      <label className="field-label" htmlFor="ral-search">
        Zoek RAL-code of kleurnaam
      </label>
      <input
        id="ral-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Bijv. RAL 9010, crèmewit of 7016"
      />
      <label className="field-label" htmlFor="ral-family">
        Kleurgroep
      </label>
      <select
        id="ral-family"
        value={family}
        onChange={(e) => setFamily(e.target.value)}
      >
        <option value="">Alle kleurgroepen</option>
        {Object.entries(RAL_FAMILIES).map(([id, name]) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </select>
      <p className="catalog-count" role="status">
        {matches.length} van {RAL_COLORS.length} kleuren
      </p>
      <div className="ral-results" aria-label="RAL Classic kleuren">
        {matches.map((c) => (
          <button
            key={c.code}
            aria-label={`RAL ${c.code} ${c.name}`}
            aria-pressed={reference?.code === c.code}
            onClick={() =>
              onChoose(c.hex, { system: "RAL Classic", code: c.code, brand })
            }
          >
            <i style={{ backgroundColor: c.hex }} />
            <span>
              <strong>RAL {c.code}</strong>
              <span>{c.name}</span>
            </span>
          </button>
        ))}
      </div>
      {!matches.length && (
        <p className="catalog-note">
          Geen kleur gevonden. Probeer de viercijferige RAL-code of kies een
          andere kleurgroep.
        </p>
      )}
      {selected && (
        <p className="selected-paint">
          <strong>
            RAL {selected.code} · {selected.name}
          </strong>
          <span>
            {reference?.brand
              ? `Merkvoorkeur: ${reference.brand}`
              : "Geen merkvoorkeur"}
          </span>
          {/pearl|luminous|aluminium/i.test(selected.sourceName) && (
            <span>
              Een parel-, metallic- of fluorescerend effect wordt niet door deze
              vlakke schermkleur nagebootst.
            </span>
          )}
        </p>
      )}
      <p className="catalog-note">
        Schermkleuren zijn benaderingen uit een openbare dataset, geen officiële
        RAL-metingen. Beoordeel de uiteindelijke verf met een fysieke
        kleurstaal.{" "}
        <a href="/color-sources" target="_blank" rel="noreferrer">
          Kleurbronnen en beperkingen
        </a>
      </p>
    </details>
  );
}
