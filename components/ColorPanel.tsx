"use client";
import { useState } from "react";
import { validHex } from "@/lib/surfaces";
const PALETTE = [
  ["Warm wit", "#EEE9DD"],
  ["Zand", "#CBB998"],
  ["Saliegroen", "#889B7C"],
  ["Terracotta", "#B9684D"],
  ["Rood", "#CE3434"],
  ["Blauw", "#3265C4"],
  ["Diepgroen", "#335F50"],
  ["Leisteen", "#596676"],
];
export default function ColorPanel({
  name,
  surfaceKey,
  color,
  onColor,
  onRestore,
}: {
  name: string;
  surfaceKey: string;
  color?: string;
  onColor: (hex: string) => void;
  onRestore: () => void;
}) {
  return (
    <section className="color-panel" aria-label="Kleurenpaneel">
      <p className="eyebrow">GESELECTEERD OPPERVLAK</p>
      <h2>{name}</h2>
      <p className="surface-key">{surfaceKey}</p>
      <div className="color-palette">
        {PALETTE.map(([label, value]) => (
          <button
            key={value}
            title={label}
            aria-label={label}
            aria-pressed={color?.toUpperCase() === value}
            onClick={() => onColor(value)}
            style={{ backgroundColor: value }}
          />
        ))}
      </div>
      <label className="field-label" htmlFor="custom-color">
        Eigen kleur kiezen
      </label>
      <div className="color-input-row">
        <input
          id="custom-color"
          aria-label="Eigen kleur kiezen"
          type="color"
          value={color || "#CE3434"}
          onChange={(e) => onColor(e.target.value)}
        />
        <span>{color?.toUpperCase() || "Oorspronkelijke foto"}</span>
      </div>
      <HexField key={color || "original"} color={color} onColor={onColor} />
      <button className="text-button" onClick={onRestore} disabled={!color}>
        Kleur herstellen
      </button>
      <p className="help-text pigment-note">
        Licht, schaduw en textuur blijven uit het panorama behouden. Kleuren
        zijn een visuele benadering.
      </p>
    </section>
  );
}

function HexField({
  color,
  onColor,
}: {
  color?: string;
  onColor: (hex: string) => void;
}) {
  const [hex, setHex] = useState(color || "#CE3434");
  const [error, setError] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!validHex(hex)) {
          setError(
            "Gebruik een HEX-kleur met zes tekens, bijvoorbeeld #3265C4.",
          );
          return;
        }
        setError("");
        onColor(hex.toUpperCase());
      }}
    >
      <label className="field-label" htmlFor="hex-color">
        HEX-kleur
      </label>
      <div className="hex-row">
        <input
          id="hex-color"
          value={hex}
          onChange={(e) => setHex(e.target.value)}
          maxLength={7}
          spellCheck={false}
          aria-invalid={!!error}
        />
        <button type="submit" className="button small">
          Toepassen
        </button>
      </div>
      {error && (
        <p className="upload-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
