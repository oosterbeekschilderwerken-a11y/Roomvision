'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import PanoramaViewer from './PanoramaViewer';
import { validateFile, validateDimensions } from '@/lib/panorama';
const DEMO = '/demo-panorama.jpg';
export default function Studio() {
  const [source, setSource] = useState(DEMO);
  const [name, setName] = useState('Voorbeeld · buitenpanorama');
  const [zoom, setZoom] = useState(75);
  const [resetKey, setResetKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewerError, setViewerError] = useState('');
  const [validating, setValidating] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);
  const ready = useCallback(() => { setLoading(false); setViewerError(''); }, []);
  const failed = useCallback((message: string) => { setLoading(false); setViewerError(message); }, []);
  useEffect(() => () => { if (source.startsWith('blob:')) URL.revokeObjectURL(source); }, [source]);
  useEffect(() => () => { requestId.current += 1; }, []);
  function reset() { setZoom(75); setResetKey((n) => n + 1); }
  async function openFile(file: File) {
    const id = ++requestId.current;
    setError('');
    const fileError = validateFile(file.type, file.size);
    if (fileError) { setError(fileError); return; }
    setValidating(true);
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.src = url;
    try {
      await image.decode();
      if (id !== requestId.current) { URL.revokeObjectURL(url); return; }
      const dimensionError = validateDimensions(image.naturalWidth, image.naturalHeight);
      if (dimensionError) { URL.revokeObjectURL(url); setError(dimensionError); return; }
      setLoading(true); setViewerError(''); setSource(url); setName(file.name); reset();
    } catch {
      URL.revokeObjectURL(url);
      if (id === requestId.current) setError('Dit bestand is geen leesbare foto. Kies een geldige JPG-, PNG- of WebP-foto.');
    } finally { if (id === requestId.current) setValidating(false); }
  }
  function demo() {
    requestId.current += 1; setValidating(false); setError(''); reset();
    if (source !== DEMO) { setLoading(true); setViewerError(''); setSource(DEMO); setName('Voorbeeld · buitenpanorama'); }
  }
  return <><div className="studio-grid"><section className="viewer-shell" aria-label="Panorama"><PanoramaViewer source={source} zoom={zoom} resetKey={resetKey} onReady={ready} onError={failed} onZoom={setZoom} /><div className="viewer-top"><span className="viewer-pill"><span className="status-dot" /> 360° WEERGAVE</span><span className="viewer-pill file-name" title={name}>{name}</span></div>{loading && <div className="viewer-message" role="status"><span className="spinner" /> Panorama laden…</div>}{viewerError && <div className="viewer-message error" role="alert">{viewerError}</div>}<div className="viewer-bottom"><span className="drag-hint">↔ Sleep om rond te kijken</span><div className="viewer-tools"><button aria-label="Uitzoomen" onClick={() => setZoom((z) => Math.min(95, z + 10))} disabled={zoom >= 95}>−</button><span>{Math.round(75 / zoom * 100)}%</span><button aria-label="Inzoomen" onClick={() => setZoom((z) => Math.max(35, z - 10))} disabled={zoom <= 35}>+</button><span className="tool-divider" /><button onClick={reset} aria-label="Weergave herstellen" title="Weergave herstellen">↺</button></div></div></section><aside className="control-panel"><p className="eyebrow">MAAK HET PERSOONLIJK</p><h2>Jouw ruimte in beeld.</h2><p>Open je eigen panorama en bekijk je kamer vanuit elke hoek.</p><input ref={input} id="panorama-upload" className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void openFile(file); }} /><button className="button upload-button" onClick={() => input.current?.click()} disabled={validating}><span aria-hidden="true">↑</span> {validating ? 'Foto controleren…' : 'Open panoramafoto'}</button><p className="file-spec">JPG, PNG of WebP · maximaal 25 MB</p>{error && <div className="upload-error" role="alert">{error}</div>}<div className="privacy-note"><span aria-hidden="true">◇</span><p>Je foto blijft op je apparaat.<br />We uploaden of bewaren niets.</p></div><div className="panel-divider" /><h3>Wat is een geschikte foto?</h3><p className="help-text">Gebruik een volledig 360°-panorama in equirectangulaire projectie met een verhouding van <strong>2:1</strong>. Bijvoorbeeld 4096 × 2048 pixels, minimaal 1024 × 512 en maximaal 8192 × 4096.</p><p className="help-text">Een gewone foto of een smalle telefoonpanorama werkt niet. De verhouding wordt automatisch gecontroleerd; de projectie kun je zelf beoordelen.</p><button className="text-button" onClick={demo}>↺ Open het voorbeeldpanorama</button><div className="coming-soon"><span className="eyebrow">IN EEN VOLGENDE FASE</span><h3>Een wereld aan kleur</h3><p>Muren, plafonds, deuren en details afzonderlijk kleuren.</p><div className="swatches" aria-hidden="true"><i /><i /><i /><i /><i /></div></div></aside></div><div className="studio-help"><span>✧ <strong>Neem even de tijd om rond te kijken.</strong></span><p>Muis: slepen en scrollen · Mobiel: vegen en knijpen · Toetsenbord: pijltjes en +/−</p></div><p className="photo-credit">Voorbeeldfoto: <a href="https://github.com/mpetroff/pannellum/blob/master/examples/examplepano.jpg" target="_blank" rel="noreferrer">Jordan Pond — Matthew Petroff</a> · <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer">CC BY-SA 3.0</a> · ongewijzigd</p></>;
}
