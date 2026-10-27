"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import PanoramaViewer from "./PanoramaViewer";
import ColorPanel from "./ColorPanel";
import { validateFile, validateDimensions } from "@/lib/panorama";
import {
  SURFACES,
  editDocument,
  undoDocument,
  paintMask,
  type Document,
  type Point,
} from "@/lib/surfaces";
import { readMask, downloadMask } from "@/lib/mask-io";
const ROOM = "/room/panorama.png",
  OUTDOOR = "/demo-panorama.jpg";
export default function Studio() {
  const [source, setSource] = useState(ROOM);
  const [name, setName] = useState("Testkamer · pixelmaskers");
  const [zoom, setZoom] = useState(75),
    [resetKey, setResetKey] = useState(0);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [viewerError, setViewerError] = useState("");
  const [validating, setValidating] = useState(false);
  const [doc, setDoc] = useState<Document | null>(null);
  const [selected, setSelected] = useState(0);
  const [mode, setMode] = useState<"look" | "paint" | "erase">("look");
  const [showMask, setShowMask] = useState(false),
    [radius, setRadius] = useState(12);
  const [notice, setNotice] = useState(
    "Klik of tik op een muur om die te kleuren. Sleep om rond te kijken.",
  );
  const input = useRef<HTMLInputElement>(null),
    maskInput = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);
  const ready = useCallback(() => {
    setLoading(false);
    setViewerError("");
  }, []);
  const failed = useCallback((message: string) => {
    setLoading(false);
    setViewerError(message);
  }, []);
  useEffect(() => {
    if (source !== ROOM) return;
    let cancelled = false;
    readMask("/room/surface-ids.png")
      .then((mask) => {
        if (!cancelled) setDoc({ mask, colors: {}, history: [] });
      })
      .catch(() => {
        if (!cancelled)
          setError(
            "Het testkamermasker kon niet worden geladen. Herlaad de pagina.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [source]);
  useEffect(
    () => () => {
      if (source.startsWith("blob:")) URL.revokeObjectURL(source);
    },
    [source],
  );
  useEffect(
    () => () => {
      requestId.current += 1;
    },
    [],
  );
  const select = useCallback((id: number) => {
    setSelected(id);
    setNotice(
      id
        ? `${SURFACES.find((s) => s.id === id)?.name} geselecteerd. Kies een kleur in het kleurenpaneel.`
        : "Geen bewerkbaar oppervlak: raam, meubel, vloer of nog niet gemaskeerd gebied.",
    );
  }, []);
  const paint = useCallback(
    (points: Point[], remember: boolean) => {
      const id = mode === "erase" ? 0 : selected;
      if (mode === "look" || (mode === "paint" && !id)) return;
      setDoc((previous) =>
        previous
          ? editDocument(
              previous,
              { mask: paintMask(previous.mask, points, id, radius) },
              remember,
            )
          : previous,
      );
    },
    [mode, selected, radius],
  );
  function reset() {
    setZoom(75);
    setResetKey((n) => n + 1);
  }
  function clean() {
    setSelected(0);
    setMode("look");
    setShowMask(false);
    setError("");
    setDoc(null);
    reset();
  }
  async function openFile(file: File) {
    const id = ++requestId.current;
    setError("");
    const invalid = validateFile(file.type, file.size);
    if (invalid) {
      setError(invalid);
      return;
    }
    setValidating(true);
    const url = URL.createObjectURL(file),
      image = new Image();
    image.src = url;
    try {
      await image.decode();
      if (id !== requestId.current) {
        URL.revokeObjectURL(url);
        return;
      }
      const invalid = validateDimensions(
        image.naturalWidth,
        image.naturalHeight,
      );
      if (invalid) {
        URL.revokeObjectURL(url);
        setError(invalid);
        return;
      }
      clean();
      const scale = Math.min(
        1,
        2048 / image.naturalWidth,
        1024 / image.naturalHeight,
      );
      const width = Math.round(image.naturalWidth * scale);
      const height = Math.round(image.naturalHeight * scale);
      setDoc({
        mask: { width, height, pixels: new Uint8Array(width * height) },
        colors: {},
        history: [],
      });
      setLoading(true);
      setViewerError("");
      setSource(url);
      setName(file.name);
      setNotice(
        "Eigen panorama geopend zonder maskers. Teken oppervlakken onder Maskers corrigeren of importeer een passend ID-masker.",
      );
    } catch {
      URL.revokeObjectURL(url);
      if (id === requestId.current)
        setError(
          "Dit bestand is geen leesbare foto. Kies een geldige JPG-, PNG- of WebP-foto.",
        );
    } finally {
      if (id === requestId.current) setValidating(false);
    }
  }
  function demo(room: boolean) {
    ++requestId.current;
    setValidating(false);
    const next = room ? ROOM : OUTDOOR;
    if (source !== next) {
      clean();
      setSource(next);
      setName(room ? "Testkamer · pixelmaskers" : "Voorbeeld · buitenpanorama");
      setLoading(true);
      setViewerError("");
    }
    reset();
    setNotice(
      room
        ? "Klik of tik op een muur om die te kleuren."
        : "Buitenpanorama: rondkijken zonder oppervlakmaskers. Open de testkamer om te kleuren.",
    );
  }
  async function importMask(file: File) {
    if (!doc) return;
    if (file.type !== "image/png" || file.size > 10 * 1024 * 1024) {
      setError("Kies een PNG-ID-masker van maximaal 10 MB.");
      return;
    }
    const id = ++requestId.current,
      url = URL.createObjectURL(file);
    setValidating(true);
    try {
      const mask = await readMask(url, doc.mask.width, doc.mask.height);
      if (id === requestId.current) {
        setDoc((previous) =>
          previous ? editDocument(previous, { mask }) : previous,
        );
        setError("");
        setNotice(
          "ID-masker geïmporteerd. Controleer de uitlijning met Toon maskers.",
        );
      }
    } catch (e) {
      if (id === requestId.current)
        setError(
          e instanceof Error ? e.message : "Masker kon niet worden gelezen.",
        );
    } finally {
      URL.revokeObjectURL(url);
      if (id === requestId.current) setValidating(false);
    }
  }
  function color(hex: string) {
    if (!selected) return;
    setDoc((previous) =>
      previous
        ? editDocument(previous, {
            colors: { ...previous.colors, [selected]: hex },
          })
        : previous,
    );
  }
  function restore() {
    setDoc((previous) => {
      if (!previous) return previous;
      const colors = { ...previous.colors };
      delete colors[selected];
      return editDocument(previous, { colors });
    });
  }
  const surface = SURFACES.find((s) => s.id === selected);
  return (
    <>
      <div className="studio-grid">
        <section
          className={`viewer-shell ${mode !== "look" ? "editing-mask" : ""}`}
          aria-label="Panorama"
        >
          <PanoramaViewer
            source={source}
            zoom={zoom}
            resetKey={resetKey}
            onReady={ready}
            onError={failed}
            onZoom={setZoom}
            mask={doc?.mask || null}
            colors={doc?.colors || {}}
            selected={selected}
            mode={mode}
            showMask={showMask}
            onSelect={select}
            onPaint={paint}
          />
          <div className="viewer-top">
            <span className="viewer-pill">
              <span className="status-dot" />
              360° KLEURSTUDIO
            </span>
            <span className="viewer-pill file-name" title={name}>
              {name}
            </span>
          </div>
          {loading && (
            <div className="viewer-message" role="status">
              <span className="spinner" />
              Panorama laden…
            </div>
          )}
          {viewerError && (
            <div className="viewer-message error" role="alert">
              {viewerError}
            </div>
          )}
          <div className="viewer-bottom">
            <span className="drag-hint">
              {mode === "look"
                ? "Klik om te kiezen · sleep om te kijken"
                : mode === "paint"
                  ? `Penseel: ${surface?.name || "kies een oppervlak"}`
                  : "Gum: pixels beschermen"}
            </span>
            <div className="viewer-tools">
              <button
                aria-label="Uitzoomen"
                onClick={() => setZoom((z) => Math.min(95, z + 10))}
                disabled={zoom >= 95}
              >
                −
              </button>
              <span>{Math.round((75 / zoom) * 100)}%</span>
              <button
                aria-label="Inzoomen"
                onClick={() => setZoom((z) => Math.max(35, z - 10))}
                disabled={zoom <= 35}
              >
                +
              </button>
              <span className="tool-divider" />
              <button onClick={reset} aria-label="Weergave herstellen">
                ↺
              </button>
            </div>
          </div>
        </section>
        <aside className="control-panel">
          <p className="eyebrow">GEEF JE RUIMTE KLEUR</p>
          <h2>Jouw kleur. Jouw muur.</h2>
          <p className="selection-status" role="status">
            {notice}
          </p>
          {doc && (
            <>
              <label className="field-label" htmlFor="surface-select">
                Oppervlak kiezen
              </label>
              <select
                id="surface-select"
                value={selected}
                onChange={(e) => select(Number(e.target.value))}
              >
                <option value={0}>Klik in de ruimte of kies hier</option>
                {SURFACES.map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.name} · {s.key}
                  </option>
                ))}
              </select>
              <div className="surface-chips">
                {SURFACES.filter((s) => doc.colors[s.id]).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => select(s.id)}
                    style={{ borderColor: doc.colors[s.id] }}
                  >
                    <i style={{ background: doc.colors[s.id] }} />
                    {s.name}
                  </button>
                ))}
              </div>
            </>
          )}
          {surface && doc ? (
            <ColorPanel
              key={selected}
              name={surface.name}
              surfaceKey={surface.key}
              color={doc.colors[selected]}
              onColor={color}
              onRestore={restore}
            />
          ) : (
            <div className="select-invitation">
              ◈ Selecteer één oppervlak.
              <br />
              <span>Elke muur krijgt een eigen kleur.</span>
            </div>
          )}
          <button
            className="button undo-button"
            disabled={!doc?.history.length}
            onClick={() =>
              setDoc((previous) =>
                previous ? undoDocument(previous) : previous,
              )
            }
          >
            ↶ Ongedaan maken
          </button>
          {doc && (
            <details className="mask-editor">
              <summary>Maskers corrigeren</summary>
              <p className="help-text">
                Kies hierboven het doeloppervlak. Schilder om pixels toe te
                voegen; gum om ramen of meubels te beschermen. Schakel terug
                naar Rondkijken om de camera te bewegen. Elke penseelstreek kan
                ongedaan worden gemaakt.
              </p>
              <div
                className="mode-buttons"
                role="group"
                aria-label="Maskerbediening"
              >
                {(
                  [
                    ["look", "Rondkijken"],
                    ["paint", "Penseel"],
                    ["erase", "Gum"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    aria-pressed={mode === value}
                    disabled={value === "paint" && !selected}
                    onClick={() => setMode(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="field-label" htmlFor="brush-size">
                Penseelradius: {radius} maskerpixels
              </label>
              <input
                id="brush-size"
                type="range"
                min={2}
                max={60}
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
              />
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={showMask}
                  onChange={(e) => setShowMask(e.target.checked)}
                />{" "}
                Toon maskers
              </label>
              <p className="help-text">
                Masker: {doc.mask.width} × {doc.mask.height}. Gum = ID 0 (niet
                kleuren). De borstel loopt door over de 360°-naad.
              </p>
              <div className="mask-actions">
                <button
                  className="text-button"
                  onClick={() => downloadMask(doc.mask)}
                >
                  Exporteer masker
                </button>
                <button
                  className="text-button"
                  disabled={validating}
                  onClick={() => maskInput.current?.click()}
                >
                  Importeer masker
                </button>
              </div>
              <input
                ref={maskInput}
                className="sr-only"
                aria-label="ID-masker importeren"
                type="file"
                accept="image/png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void importMask(file);
                }}
              />
            </details>
          )}
          <div className="panel-divider" />
          <button className="text-button" onClick={() => demo(true)}>
            Open de testkamer
          </button>
          <p className="help-text fixture-note">
            Reproduceerbare gerenderde kamer met exact uitgelijnde pixelmaskers.
            Geen foto en geen AI-herkenning. Ramen, meubels en vloer zijn
            beschermd (ID 0).
          </p>
          <input
            ref={input}
            id="panorama-upload"
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void openFile(file);
            }}
          />
          <button
            className="button upload-button"
            disabled={validating}
            onClick={() => input.current?.click()}
          >
            {validating ? "Bestand controleren…" : "Open panoramafoto"}
          </button>
          <p className="file-spec">JPG, PNG of WebP · 2:1 · maximaal 25 MB</p>
          <p className="help-text">
            Eigen foto’s krijgen een leeg masker. Corrigeer dit handmatig of
            importeer een uitgelijnd PNG-ID-masker. Je foto en wijzigingen
            blijven in deze browsersessie; exporteer het masker voor hergebruik.
          </p>
          {error && (
            <div className="upload-error" role="alert">
              {error}
            </div>
          )}
          <button
            className="text-button outdoor-button"
            onClick={() => demo(false)}
          >
            ↺ Open het voorbeeldpanorama
          </button>
        </aside>
      </div>
      <div className="studio-help">
        <span>✧ Klik of tik op een muur · sleep om rond te kijken</span>
        <p>
          Scroll/knijp: zoom · Pijltjes: kijken · Enter: selecteer midden · +/−:
          zoom
        </p>
      </div>
      <p className="photo-credit">
        Testkamer en maskers: RoomVision, gegenereerd met
        scripts/generate-room.mjs. Buitenfoto: Matthew Petroff ·{" "}
        <a href="https://creativecommons.org/licenses/by-sa/3.0/">
          CC BY-SA 3.0
        </a>
        .
      </p>
    </>
  );
}
