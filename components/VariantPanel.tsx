"use client";
import { useState } from "react";
import { createVariant, type ColorVariant } from "@/lib/variants";
import type { Document } from "@/lib/surfaces";
export default function VariantPanel({
  doc,
  onSave,
  onApply,
  onRemove,
  onExport,
  busy,
}: {
  doc: Document;
  onSave: (variant: ColorVariant) => void;
  onApply: (variant: ColorVariant) => void;
  onRemove: (id: string) => void;
  onExport: () => void;
  busy: boolean;
}) {
  const [name, setName] = useState("Ontwerp 1"),
    [error, setError] = useState("");
  const variants = doc.variants || [];
  return (
    <section className="variant-panel" aria-label="Kleurvarianten en export">
      <p className="eyebrow">FASE 3 · BEWAREN EN VERGELIJKEN</p>
      <h3>Jouw kleurvarianten</h3>
      <p className="help-text">
        Bewaar maximaal acht ontwerpen. Met Toon wissel je de kleuren op
        hetzelfde camerastandpunt. Muurgrenzen worden gedeeld.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            if (variants.length >= 8)
              throw new Error("Je kunt maximaal acht varianten bewaren.");
            if (
              variants.some(
                (v) =>
                  v.name.toLocaleLowerCase("nl") ===
                  name.trim().toLocaleLowerCase("nl"),
              )
            )
              throw new Error(
                "Deze variantnaam bestaat al. Kies een andere naam.",
              );
            onSave(createVariant(name, doc));
            let next = variants.length + 2;
            while (
              variants.some((v) => v.name === `Ontwerp ${next}`) ||
              name.trim() === `Ontwerp ${next}`
            )
              next++;
            setName(`Ontwerp ${next}`);
            setError("");
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Variant bewaren mislukt.",
            );
          }
        }}
      >
        <label className="field-label" htmlFor="variant-name">
          Naam van je ontwerp
        </label>
        <input
          id="variant-name"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          className="button small"
          disabled={busy || variants.length >= 8}
        >
          Variant bewaren
        </button>
      </form>
      {error && (
        <p className="upload-error" role="alert">
          {error}
        </p>
      )}
      <div className="variant-list">
        {variants.map((v) => (
          <article key={v.id}>
            <strong>{v.name}</strong>
            <div
              className="variant-swatches"
              aria-label={`Kleuren van ${v.name}`}
            >
              {Object.entries(v.colors).map(([id, color]) => (
                <i
                  key={id}
                  style={{ backgroundColor: color }}
                  title={`Oppervlak ${id}: ${color}`}
                />
              ))}
            </div>
            <div>
              <button
                className="text-button"
                disabled={busy}
                onClick={() => onApply(v)}
              >
                Toon {v.name}
              </button>
              <button
                className="text-button"
                disabled={busy}
                onClick={() => onRemove(v.id)}
                aria-label={`Verwijder ${v.name}`}
              >
                Verwijderen
              </button>
            </div>
          </article>
        ))}
      </div>
      <button
        className="button upload-button"
        disabled={busy}
        onClick={onExport}
      >
        Weergave downloaden (PNG)
      </button>
      <p className="help-text">
        Downloadt het zichtbare fotobeeld of de huidige 360°-kijkrichting,
        zonder knoppen of selectieomtrek. Gebruik Project opslaan om ook
        maskers, RAL-gegevens en varianten te bewaren.
      </p>
    </section>
  );
}
