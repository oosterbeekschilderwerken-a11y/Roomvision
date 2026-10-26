'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

type Props = { source: string; zoom: number; resetKey: number; onReady: () => void; onError: (message: string) => void; onZoom: (zoom: number) => void };
export default function PanoramaViewer({ source, zoom, resetKey, onReady, onError, onZoom }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef({ longitude: 0, latitude: 0, fov: 75 });
  useEffect(() => { view.current.fov = zoom; }, [zoom]);
  useEffect(() => { view.current.longitude = 0; view.current.latitude = 0; }, [resetKey]);
  useEffect(() => {
    const container = host.current!;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' }); }
    catch { onError('De 360°-viewer kan niet starten. Schakel WebGL/hardwareversnelling in of probeer een andere browser.'); return; }
    let disposed = false;
    let frame = 0;
    let loaded = false;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(view.current.fov, 1, 0.1, 100);
    const geometry = new THREE.SphereGeometry(50, 64, 40);
    geometry.scale(-1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    scene.add(new THREE.Mesh(geometry, material));
    const texture = new THREE.TextureLoader().load(source, (map) => {
      if (disposed) { map.dispose(); return; }
      if (map.image.width > renderer.capabilities.maxTextureSize || map.image.height > renderer.capabilities.maxTextureSize) {
        onError('Deze foto is te groot voor de grafische mogelijkheden van dit apparaat. Probeer een kleiner 2:1-panorama.');
        return;
      }
      map.colorSpace = THREE.SRGBColorSpace;
      material.map = map;
      material.needsUpdate = true;
      loaded = true;
      onReady();
    }, undefined, () => { if (!disposed) onError('De panoramafoto kon niet worden geladen. Probeer een ander bestand of open het voorbeeld opnieuw.'); });
    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      renderer.setSize(width, height);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    const pointers = new Map<number, { x: number; y: number }>();
    let lastDistance = 0;
    const distance = () => { const [a, b] = [...pointers.values()]; return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0; };
    const setFov = (value: number) => { view.current.fov = THREE.MathUtils.clamp(value, 35, 95); onZoom(view.current.fov); };
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      container.focus();
      container.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      lastDistance = distance();
    };
    const move = (e: PointerEvent) => {
      const previous = pointers.get(e.pointerId);
      if (!previous) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size > 1) {
        const nextDistance = distance();
        if (lastDistance > 0) setFov(view.current.fov * lastDistance / Math.max(1, nextDistance));
        lastDistance = nextDistance;
      } else {
        view.current.longitude -= (e.clientX - previous.x) * 0.15;
        view.current.latitude += (e.clientY - previous.y) * 0.15;
      }
    };
    const up = (e: PointerEvent) => { pointers.delete(e.pointerId); lastDistance = distance(); };
    const wheel = (e: WheelEvent) => { e.preventDefault(); setFov(view.current.fov + e.deltaY * 0.04); };
    const key = (e: KeyboardEvent) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home'].includes(e.key)) return;
      e.preventDefault();
      if (e.key === 'ArrowLeft') view.current.longitude -= 5;
      if (e.key === 'ArrowRight') view.current.longitude += 5;
      if (e.key === 'ArrowUp') view.current.latitude += 5;
      if (e.key === 'ArrowDown') view.current.latitude -= 5;
      if (e.key === '+' || e.key === '=') setFov(view.current.fov - 5);
      if (e.key === '-') setFov(view.current.fov + 5);
      if (e.key === 'Home') { view.current.longitude = 0; view.current.latitude = 0; setFov(75); }
    };
    const contextLost = (e: Event) => { e.preventDefault(); onError('De grafische verbinding is onderbroken. Herlaad de pagina om de viewer opnieuw te starten.'); };
    container.addEventListener('pointerdown', down);
    container.addEventListener('pointermove', move);
    container.addEventListener('pointerup', up);
    container.addEventListener('pointercancel', up);
    container.addEventListener('lostpointercapture', up);
    container.addEventListener('wheel', wheel, { passive: false });
    container.addEventListener('keydown', key);
    renderer.domElement.addEventListener('webglcontextlost', contextLost);
    const animate = () => {
      frame = requestAnimationFrame(animate);
      view.current.latitude = THREE.MathUtils.clamp(view.current.latitude, -85, 85);
      const phi = THREE.MathUtils.degToRad(90 - view.current.latitude);
      const theta = THREE.MathUtils.degToRad(view.current.longitude);
      camera.fov = view.current.fov;
      camera.updateProjectionMatrix();
      camera.lookAt(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
      if (loaded) renderer.render(scene, camera);
    };
    animate();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      container.removeEventListener('pointerdown', down);
      container.removeEventListener('pointermove', move);
      container.removeEventListener('pointerup', up);
      container.removeEventListener('pointercancel', up);
      container.removeEventListener('lostpointercapture', up);
      container.removeEventListener('wheel', wheel);
      container.removeEventListener('keydown', key);
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      texture.dispose(); material.dispose(); geometry.dispose(); renderer.dispose();
      renderer.domElement.remove();
    };
  }, [source, onReady, onError, onZoom]);
  return <div ref={host} className="panorama-canvas" tabIndex={0} role="region" aria-label="Interactieve 360 graden panoramaviewer. Sleep of gebruik de pijltjestoetsen om rond te kijken. Gebruik plus en min om te zoomen." />;
}
