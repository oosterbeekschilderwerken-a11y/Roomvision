"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PanoramaViewer, { type ViewerCapture } from "./PanoramaViewer";
import VariantPanel from "./VariantPanel";
import {
  selectConnected,
  outlineMask,
  readSelectionImage,
  type SelectionImage,
} from "@/lib/selection";
import { downloadPNG, type ColorVariant } from "@/lib/variants";
import ColorPanel from "./ColorPanel";
import { maskDimensions, type ImageKind } from "@/lib/image-kind";
import type { PaintReference } from "@/lib/paint-catalog";
import { validateFile, validateDimensions } from "@/lib/panorama";
import {
  SURFACES,
  editDocument,
  undoDocument,
  redoDocument,
  paintMask,
  type Document,
  type Point,
} from "@/lib/surfaces";
import {
  encodeProject,
  decodeProject,
  downloadProject,
  photoDataURL,
  MAX_PROJECT_BYTES,
} from "@/lib/project";
import { readMask, downloadMask } from "@/lib/mask-io";
const ROOM = "/room/panorama.png",
  OUTDOOR = "/demo-panorama.jpg";
export default function Studio() {
  const [source, setSource] = useState(ROOM);
  const [projection, setProjection] = useState<ImageKind>("panorama");
  const photoInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("Testkamer · pixelmaskers");
  const [zoom, setZoom] = useState(75),
    [resetKey, setResetKey] = useState(0);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [viewerError, setViewerError] = useState("");
  const [validating, setValidating] = useState(false);
  const [doc, setDoc] = useState<Document | null>(null);
  const [selected, setSelected] = useState(0);
  const [original, setOriginal] = useState(false);
  const [protectOthers, setProtectOthers] = useState(true);
  const [selectionTool, setSelectionTool] = useState<
    "magic" | "outline" | "navigate"
  >("navigate");
  const [tolerance, setTolerance] = useState(28),
    [selecting, setSelecting] = useState(false);
  const [addToSelected, setAddToSelected] = useState(false);
  const [draftPoints, setDraftPoints] = useState<Point[]>([]),
    [draftTarget, setDraftTarget] = useState(1);
  const captureRef = useRef<ViewerCapture | null>(null);
  const selectionRequest = useRef(0);
  const selectionImage = useRef<{
    source: string;
    image: SelectionImage;
  } | null>(null);
  const ownImage = source !== ROOM && source !== OUTDOOR;

  const projectInput = useRef<HTMLInputElement>(null);
  const editor = useRef<HTMLDetailsElement>(null);
  const currentMask = doc?.mask;
  const counts = useMemo(() => {
    const result = new Uint32Array(9);
    if (currentMask) for (const id of currentMask.pixels) result[id]++;
    return result;
  }, [currentMask]);
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
    setOriginal(false);
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
              {
                mask: paintMask(
                  previous.mask,
                  points,
                  id,
                  radius,
                  protectOthers,
                ),
              },
              remember,
            )
          : previous,
      );
    },
    [mode, selected, radius, protectOthers],
  );
  function reset() {
    setZoom(75);
    setResetKey((n) => n + 1);
  }
  function clean() {
    selectionRequest.current++;
    selectionImage.current = null;
    setSelecting(false);
    setDraftPoints([]);
    setSelectionTool("navigate");
    setOriginal(false);
    setSelected(0);
    setMode("look");
    setShowMask(false);
    setError("");
    setDoc(null);
    reset();
  }
  async function openFile(file: File, kind: ImageKind = "panorama") {
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
        kind,
      );
      if (invalid) {
        URL.revokeObjectURL(url);
        setError(invalid);
        return;
      }
      clean();
      const { width, height } = maskDimensions(
        image.naturalWidth,
        image.naturalHeight,
        kind,
      );
      setProjection(kind);
      setSelectionTool("magic");
      setDoc({
        mask: {
          width,
          height,
          pixels: new Uint8Array(width * height),
          ...(kind === "photo" ? { wrapX: false } : {}),
        },
        colors: {},
        history: [],
      });
      setLoading(true);
      setViewerError("");
      setSource(url);
      setName(file.name);
      setNotice(
        kind === "photo"
          ? "Je foto is klaar. Klik op een muur en kies daarna een kleur. Gebruik Muur tekenen voor een precieze omtrek."
          : "Je panorama is klaar. Klik op een muur en kies een kleur, of geef de omtrek aan met Muur tekenen.",
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
    setProjection("panorama");
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
          previous
            ? editDocument(previous, {
                mask: {
                  ...mask,
                  ...(projection === "photo" ? { wrapX: false } : {}),
                },
              })
            : previous,
        );
        setError("");
        setSelectionTool("navigate");
        setDraftPoints([]);
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
  async function saveProject() {
    if (!doc) return;
    const id = ++requestId.current;
    setValidating(true);
    setError("");
    try {
      const response = await fetch(source);
      if (!response.ok)
        throw new Error("Panoramafoto kon niet worden gelezen.");
      const photo = await photoDataURL(await response.blob());
      if (id !== requestId.current) return;
      downloadProject(encodeProject(name, photo, doc, projection));
      setNotice(
        "Project gedownload: foto, maskers en kleuren. Bewaar dit bestand om later verder te werken.",
      );
    } catch (e) {
      if (id === requestId.current)
        setError(e instanceof Error ? e.message : "Project opslaan mislukt.");
    } finally {
      if (id === requestId.current) setValidating(false);
    }
  }
  async function openProject(file: File) {
    if (file.size > MAX_PROJECT_BYTES) {
      setError("Het project is te groot. Maximaal 45 MB.");
      return;
    }
    const id = ++requestId.current;
    setValidating(true);
    setError("");
    let url: string | null = null;
    try {
      let data: unknown;
      try {
        data = JSON.parse(await file.text());
      } catch {
        throw new Error(
          "Dit projectbestand bevat ongeldige JSON. Kies een geldig .roomvision-bestand.",
        );
      }
      const project = decodeProject(data);
      const response = await fetch(project.photo),
        blob = await response.blob();
      const invalidFile = validateFile(blob.type, blob.size);
      if (invalidFile) throw new Error(invalidFile);
      url = URL.createObjectURL(blob);
      const image = new Image();
      image.src = url;
      try {
        await image.decode();
      } catch {
        throw new Error(
          "De foto in dit project is beschadigd of niet leesbaar.",
        );
      }
      const invalid = validateDimensions(
        image.width,
        image.height,
        project.projection,
      );
      if (invalid) throw new Error(invalid);
      const expected = maskDimensions(
        image.width,
        image.height,
        project.projection,
      );
      if (
        project.snapshot.mask.width !== expected.width ||
        project.snapshot.mask.height !== expected.height
      )
        throw new Error("De maskermaten passen niet bij de projectfoto.");
      if (id !== requestId.current) {
        URL.revokeObjectURL(url);
        return;
      }
      clean();
      setSource(url);
      setProjection(project.projection);
      setName(project.name);
      setDoc({ ...project.snapshot, history: [], future: [] });
      setSelectionTool(
        project.snapshot.mask.pixels.some((id) => id > 0)
          ? "navigate"
          : "magic",
      );
      setLoading(true);
      setViewerError("");
      setNotice(
        "Project geopend. Foto, maskers, kleuren en kleursterktes zijn hersteld.",
      );
    } catch (e) {
      if (url) URL.revokeObjectURL(url);
      if (id === requestId.current)
        setError(
          e instanceof Error ? e.message : "Project kon niet worden geopend.",
        );
    } finally {
      if (id === requestId.current) setValidating(false);
    }
  }
  function nextTarget() {
    if (selected && (addToSelected || counts[selected] === 0)) return selected;
    return [1, 2, 3, 4].find((id) => counts[id] === 0) || 0;
  }
  function chooseTool(tool: "magic" | "outline" | "navigate") {
    setError("");
    setMode("look");
    setOriginal(false);
    setShowMask(false);
    setDraftPoints([]);
    if (tool === "outline") {
      const target = nextTarget();
      if (!target) {
        setNotice(
          "Alle vier muurvlakken zijn in gebruik. Kies een muur en schakel Toevoegen aan gekozen muur in.",
        );
        return;
      }
      setDraftTarget(target);
      setSelected(target);
      setNotice(
        "Klik of tik de hoeken rondom de muur aan. Je kunt tussendoor slepen om rond te kijken. Kies daarna Muur vastleggen.",
      );
    }
    setSelectionTool(tool);
  }
  function finishOutline() {
    if (!doc) return;
    try {
      const mask = outlineMask(
        doc.mask,
        draftPoints,
        draftTarget,
        protectOthers,
      );
      setDoc((previous) =>
        previous ? editDocument(previous, { mask }) : previous,
      );
      setSelected(draftTarget);
      setDraftPoints([]);
      setSelectionTool("magic");
      setNotice(
        `${SURFACES.find((s) => s.id === draftTarget)?.name} is vastgelegd. Kies nu een kleur. Gebruik de gum voor ramen en meubels.`,
      );
      setError("");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "De muuromtrek kon niet worden vastgelegd.",
      );
    }
  }
  async function pick(point: Point, id: number) {
    if (selectionTool === "outline") {
      if (draftPoints.length >= 64) {
        setNotice(
          "Maximaal 64 hoekpunten. Leg deze muur vast of begin opnieuw.",
        );
        return;
      }
      setDraftPoints((points) => [...points, point]);
      return;
    }
    if (id) {
      select(id);
      return;
    }
    if (selectionTool !== "magic" || !ownImage || !doc) {
      select(0);
      return;
    }
    if (selecting) return;
    const target = nextTarget();
    if (!target) {
      setNotice(
        "Kies een bestaande muur en schakel Toevoegen aan gekozen muur in, of maak ruimte met Ongedaan maken.",
      );
      return;
    }
    const request = ++selectionRequest.current;
    setSelecting(true);
    setError("");
    setOriginal(false);
    try {
      let image =
        selectionImage.current?.source === source
          ? selectionImage.current.image
          : null;
      if (
        !image ||
        image.width !== doc.mask.width ||
        image.height !== doc.mask.height
      )
        image = await readSelectionImage(source, doc.mask);
      if (request !== selectionRequest.current) return;
      selectionImage.current = { source, image };
      const result = selectConnected(image, doc.mask, point, target, tolerance);
      setDoc((previous) =>
        previous && previous.mask === doc.mask
          ? editDocument(previous, { mask: result.mask })
          : previous,
      );
      setSelected(target);
      setNotice(
        `${SURFACES.find((s) => s.id === target)?.name} geselecteerd. Kies een kleur. Controleer de randen; corrigeer met Muur tekenen of de gum.`,
      );
    } catch (e) {
      if (request === selectionRequest.current) {
        setError(
          e instanceof Error
            ? e.message
            : "Selectie mislukt. Gebruik Muur tekenen.",
        );
        setNotice(
          "Klikselectie kon deze muur niet betrouwbaar begrenzen. Kies Muur tekenen.",
        );
      }
    } finally {
      if (request === selectionRequest.current) setSelecting(false);
    }
  }
  async function exportView() {
    if (!captureRef.current) {
      setError("Wacht tot de viewer beschikbaar is.");
      return;
    }
    setValidating(true);
    setError("");
    try {
      downloadPNG(await captureRef.current());
      setNotice("Je gekleurde weergave is als PNG gedownload.");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "De weergave kon niet worden gedownload.",
      );
    } finally {
      setValidating(false);
    }
  }
  function applyVariant(variant: ColorVariant) {
    setDoc((previous) =>
      previous
        ? editDocument(previous, {
            colors: { ...variant.colors },
            strengths: { ...variant.strengths },
            paintRefs: structuredClone(variant.paintRefs),
          })
        : previous,
    );
    setSelected(0);
    setOriginal(false);
    setShowMask(false);
    setMode("look");
    setSelectionTool("navigate");
    setDraftPoints([]);
    setNotice(
      `Je bekijkt ${variant.name}. Kies een andere variant om te vergelijken.`,
    );
  }
  function color(hex: string, reference?: PaintReference) {
    setOriginal(false);
    if (!selected) return;
    setDoc((previous) => {
      if (!previous) return previous;
      const paintRefs = { ...previous.paintRefs };
      if (reference) paintRefs[selected] = reference;
      else delete paintRefs[selected];
      if (
        previous.colors[selected] === hex &&
        JSON.stringify(previous.paintRefs?.[selected]) ===
          JSON.stringify(reference)
      )
        return previous;
      return editDocument(previous, {
        colors: { ...previous.colors, [selected]: hex },
        paintRefs,
      });
    });
  }
  function restore() {
    setDoc((previous) => {
      if (!previous) return previous;
      const colors = { ...previous.colors };
      delete colors[selected];
      const paintRefs = { ...previous.paintRefs };
      delete paintRefs[selected];
      return editDocument(previous, { colors, paintRefs });
    });
  }
  const surface = SURFACES.find((s) => s.id === selected);
  return (
    <>
      <div className="studio-grid">
        <section
          className={`viewer-shell ${mode !== "look" ? "editing-mask" : ""}`}
          aria-label={projection === "photo" ? "Gewone foto" : "Panorama"}
        >
          <PanoramaViewer
            source={source}
            projection={projection}
            zoom={zoom}
            resetKey={resetKey}
            onReady={ready}
            onError={failed}
            onZoom={setZoom}
            mask={doc?.mask || null}
            colors={doc?.colors || {}}
            selected={selected}
            strengths={doc?.strengths || {}}
            original={original}
            mode={mode}
            showMask={showMask}
            onSelect={select}
            onPaint={paint}
            onPick={pick}
            draftPoints={draftPoints}
            captureRef={captureRef}
          />
          <button
            className="compare-button"
            aria-pressed={original}
            onClick={() => {
              setOriginal((value) => !value);
              setMode("look");
            }}
          >
            {original ? "Toon kleuren" : "Toon origineel"}
          </button>
          {ownImage &&
            selected > 0 &&
            mode === "look" &&
            selectionTool !== "outline" &&
            !selecting && (
              <button
                className="selected-surface-action"
                onClick={() =>
                  document
                    .querySelector(".color-panel")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                Kleur kiezen voor {surface?.name} →
              </button>
            )}
          {selectionTool === "outline" && (
            <div className="outline-actions">
              <span>
                {draftPoints.length} hoekpunten ·{" "}
                {SURFACES.find((s) => s.id === draftTarget)?.name}
              </span>
              <button onClick={finishOutline} disabled={draftPoints.length < 3}>
                Muur vastleggen
              </button>
              <button
                aria-label="Laatste hoekpunt terug"
                disabled={!draftPoints.length}
                onClick={() => setDraftPoints((points) => points.slice(0, -1))}
              >
                Punt terug
              </button>
              <button onClick={() => chooseTool("navigate")}>Annuleren</button>
            </div>
          )}
          {selecting && (
            <div className="selection-progress" role="status">
              Muurvlak selecteren…
            </div>
          )}
          <div className="viewer-top">
            <span className="viewer-pill">
              <span className="status-dot" />
              {projection === "photo" ? "FOTO KLEURSTUDIO" : "360° KLEURSTUDIO"}
            </span>
            <span className="viewer-pill file-name" title={name}>
              {name}
            </span>
          </div>
          {loading && (
            <div className="viewer-message" role="status">
              <span className="spinner" />
              {projection === "photo" ? "Foto laden…" : "Panorama laden…"}
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
                ? projection === "photo"
                  ? "Klik om te kiezen · zoom en verschuif"
                  : "Klik om te kiezen · sleep om te kijken"
                : mode === "paint"
                  ? `Penseel: ${surface?.name || "kies een oppervlak"}`
                  : "Gum: pixels beschermen"}
            </span>
            <div className="viewer-tools">
              <button
                aria-label="Uitzoomen"
                onClick={() =>
                  setZoom((z) =>
                    Math.min(projection === "photo" ? 75 : 95, z + 10),
                  )
                }
                disabled={zoom >= (projection === "photo" ? 75 : 95)}
              >
                −
              </button>
              <span>{Math.round((75 / zoom) * 100)}%</span>
              <button
                aria-label="Inzoomen"
                onClick={() =>
                  setZoom((z) =>
                    Math.max(projection === "photo" ? 15 : 35, z - 10),
                  )
                }
                disabled={zoom <= (projection === "photo" ? 15 : 35)}
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
          <div className="image-upload-options">
            <h3>Kies je afbeelding</h3>
            <p className="help-text">
              Gewone telefoon- of camerafoto, óf een volledig 360°-panorama.
              Beide ondersteunen dezelfde maskers, kleuren en projectbestanden.
            </p>
            <input
              ref={photoInput}
              id="photo-upload"
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void openFile(file, "photo");
              }}
            />
            <button
              className="button upload-button"
              disabled={validating}
              onClick={() => photoInput.current?.click()}
            >
              Gewone foto openen
            </button>
            <p className="file-spec">
              Liggend, staand of vierkant · geen 2:1-eis · maximaal 25 MB
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
            <p className="file-spec">360° · 2:1-verhouding · maximaal 25 MB</p>
          </div>
          <p className="help-text">
            Na openen kun je direct een muur aanklikken of de omtrek aangeven
            met Muur tekenen. Controleer de selectie en gum ramen of meubels
            weg. Je foto blijft op je apparaat; sla je project op om verder te
            werken.
          </p>
          {error && (
            <div className="upload-error" role="alert">
              {error}
            </div>
          )}
          {doc && ownImage && (
            <section
              className="wall-selection"
              aria-label="Muren in je eigen foto selecteren"
            >
              <h3>1. Kies een muur · 2. Kies een kleur</h3>
              <div
                className="mode-buttons"
                role="group"
                aria-label="Selectiegereedschap"
              >
                {(
                  [
                    ["magic", "Klikselectie"],
                    ["outline", "Muur tekenen"],
                    ["navigate", "Rondkijken / selecteren"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    disabled={selecting}
                    aria-pressed={selectionTool === value && mode === "look"}
                    onClick={() => chooseTool(value)}
                  >
                    {label}
                  </button>
                ))}
                <button
                  disabled={selecting}
                  onClick={() => {
                    setMode("erase");
                    setSelectionTool("navigate");
                    setDraftPoints([]);
                    setShowMask(true);
                    setOriginal(false);
                    if (editor.current) editor.current.open = true;
                  }}
                >
                  Gum / corrigeren
                </button>
              </div>
              {selectionTool === "magic" && (
                <>
                  <label className="field-label" htmlFor="selection-tolerance">
                    Kleurverschil toestaan: {tolerance}
                  </label>
                  <input
                    id="selection-tolerance"
                    type="range"
                    min={8}
                    max={70}
                    value={tolerance}
                    onChange={(e) => setTolerance(Number(e.target.value))}
                  />
                  <p className="help-text">
                    Klik in het midden van een muur. Dit kiest aaneengesloten
                    vergelijkbare kleuren, geen AI-herkenning. Gebruik een
                    lagere waarde bij lekkage, of teken de omtrek zelf.
                  </p>
                </>
              )}
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={addToSelected}
                  onChange={(e) => setAddToSelected(e.target.checked)}
                />{" "}
                Toevoegen aan gekozen muur
              </label>
              {selectionTool === "outline" && (
                <p className="help-text">
                  Klik de hoeken van de muur aan en druk in het beeld op Muur
                  vastleggen. Rond ramen en meubels kun je daarna gummen. Op
                  360°-beelden kun je tussendoor rondkijken.
                </p>
              )}
            </section>
          )}
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
                onChange={(e) => {
                  select(Number(e.target.value));
                  setSelectionTool("navigate");
                  setDraftPoints([]);
                }}
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
              paintReference={doc.paintRefs?.[selected]}
              onColor={color}
              onRestore={restore}
              strength={doc.strengths?.[selected] ?? 1}
              onStrength={(value) => {
                setOriginal(false);
                setDoc((previous) =>
                  previous
                    ? editDocument(previous, {
                        strengths: { ...previous.strengths, [selected]: value },
                      })
                    : previous,
                );
              }}
            />
          ) : (
            <div className="select-invitation">
              ◈ Selecteer één oppervlak.
              <br />
              <span>Elke muur krijgt een eigen kleur.</span>
            </div>
          )}
          {doc && surface && (
            <p className="mask-coverage">
              {counts[selected]
                ? `${counts[selected].toLocaleString("nl-NL")} maskerpixels · klaar om te kleuren`
                : "Dit oppervlak heeft nog geen masker. Teken het eerst in je eigen foto."}
              {!counts[selected] && (
                <button
                  className="text-button"
                  onClick={() => {
                    if (editor.current) editor.current.open = true;
                    setMode("paint");
                    setShowMask(true);
                    setOriginal(false);
                  }}
                >
                  Begin masker tekenen
                </button>
              )}
            </p>
          )}
          <button
            className="button undo-button"
            disabled={!doc?.history.length || selecting}
            onClick={() =>
              setDoc((previous) =>
                previous ? undoDocument(previous) : previous,
              )
            }
          >
            ↶ Ongedaan maken
          </button>
          <button
            className="text-button redo-button"
            disabled={!doc?.future?.length}
            onClick={() =>
              setDoc((previous) =>
                previous ? redoDocument(previous) : previous,
              )
            }
          >
            Opnieuw uitvoeren
          </button>
          {doc && (
            <details className="mask-editor" ref={editor}>
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
                    onClick={() => {
                      setMode(value);
                      setSelectionTool("navigate");
                      setDraftPoints([]);
                      setOriginal(false);
                    }}
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
                  onChange={(e) => {
                    setShowMask(e.target.checked);
                    setOriginal(false);
                  }}
                />{" "}
                Toon maskers
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={protectOthers}
                  onChange={(e) => setProtectOthers(e.target.checked)}
                />{" "}
                Andere oppervlakmaskers beschermen
              </label>
              <p className="help-text">
                Masker: {doc.mask.width} × {doc.mask.height}. Gum = ID 0 (niet
                kleuren).{" "}
                {projection === "photo"
                  ? "De borstel stopt bij de fotorand."
                  : "De borstel loopt door over de 360°-naad."}
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
          {doc && (
            <VariantPanel
              doc={doc}
              busy={validating || loading || selecting || !!viewerError}
              onExport={() => void exportView()}
              onSave={(variant) => {
                setDoc((previous) =>
                  previous
                    ? editDocument(previous, {
                        variants: [...(previous.variants || []), variant],
                      })
                    : previous,
                );
                setNotice(
                  `Variant ${variant.name} bewaard. Gebruik Project opslaan om hem op je apparaat te bewaren.`,
                );
              }}
              onApply={applyVariant}
              onRemove={(id) =>
                setDoc((previous) =>
                  previous
                    ? editDocument(previous, {
                        variants: previous.variants?.filter((v) => v.id !== id),
                      })
                    : previous,
                )
              }
            />
          )}
          <div className="project-actions">
            <h3>Bewaar je ontwerp</h3>
            <p className="help-text">
              Download één projectbestand met je foto, maskers, kleuren en
              kleurvarianten. Geen account of serveropslag. Open het bestand
              later om verder te werken.
            </p>
            <button
              className="button small"
              disabled={!doc || validating}
              onClick={() => void saveProject()}
            >
              Project opslaan
            </button>
            <button
              className="text-button"
              disabled={validating}
              onClick={() => projectInput.current?.click()}
            >
              Project openen
            </button>
            <input
              ref={projectInput}
              className="sr-only"
              aria-label="RoomVision-project openen"
              type="file"
              accept=".roomvision,application/json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void openProject(file);
              }}
            />
          </div>
          <div className="panel-divider" />
          <button className="text-button" onClick={() => demo(true)}>
            Open de testkamer
          </button>
          <p className="help-text fixture-note">
            Reproduceerbare gerenderde kamer met exact uitgelijnde pixelmaskers.
            Geen foto en geen AI-herkenning. Ramen, meubels en vloer zijn
            beschermd (ID 0).
          </p>
          <button
            className="text-button outdoor-button"
            onClick={() => demo(false)}
          >
            ↺ Open het voorbeeldpanorama
          </button>
        </aside>
      </div>
      <div className="studio-help">
        <span>
          ✧ Klik of tik op een muur · sleep om te kijken of een ingezoomde foto
          te verschuiven
        </span>
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
