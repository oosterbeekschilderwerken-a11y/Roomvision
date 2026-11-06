"use client";
import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import type { ImageKind } from "@/lib/image-kind";
import { estimateLighting } from "@/lib/lighting";
import { createColorMaterial } from "@/lib/color-material";
import {
  surfaceAt,
  type Mask,
  type Colors,
  type Point,
  type Strengths,
} from "@/lib/surfaces";

export type ViewerCapture = () => Promise<Blob>;
const EMPTY_POINTS: Point[] = [];
type Props = {
  onPick?: (point: Point, id: number) => void;
  draftPoints?: Point[];
  captureRef?: RefObject<ViewerCapture | null>;
  projection?: ImageKind;
  mask: Mask | null;
  colors: Colors;
  strengths: Strengths;
  original: boolean;
  selected: number;
  mode: "look" | "paint" | "erase";
  showMask: boolean;
  onSelect: (id: number) => void;
  onPaint: (points: Point[], remember: boolean) => void;
  source: string;
  zoom: number;
  resetKey: number;
  onReady: () => void;
  onError: (message: string) => void;
  onZoom: (zoom: number) => void;
};
export default function PanoramaViewer({
  source,
  projection = "panorama",
  zoom,
  resetKey,
  onReady,
  onError,
  onZoom,
  mask,
  colors,
  strengths,
  original,
  selected,
  mode,
  showMask,
  onSelect,
  onPaint,
  onPick,
  draftPoints = EMPTY_POINTS,
  captureRef,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const settings = useRef({
    mask,
    colors,
    strengths,
    original,
    selected,
    mode,
    showMask,
    onSelect,
    onPaint,
    onPick,
    draftPoints,
  });
  const synchronize = useRef<(() => void) | null>(null);
  useEffect(() => {
    settings.current = {
      mask,
      colors,
      strengths,
      original,
      selected,
      mode,
      showMask,
      onSelect,
      onPaint,
      onPick,
      draftPoints,
    };
    synchronize.current?.();
  }, [
    mask,
    colors,
    strengths,
    original,
    selected,
    mode,
    showMask,
    onSelect,
    onPaint,
    onPick,
    draftPoints,
  ]);
  const view = useRef({ longitude: 0, latitude: 0, fov: 75, panX: 0, panY: 0 });
  useEffect(() => {
    view.current.fov = zoom;
  }, [zoom]);
  useEffect(() => {
    view.current.longitude = 0;
    view.current.latitude = 0;
    view.current.panX = 0;
    view.current.panY = 0;
  }, [resetKey]);
  useEffect(() => {
    const container = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      onError(
        "De beeldviewer kan niet starten. Schakel WebGL/hardwareversnelling in of probeer een andere browser.",
      );
      return;
    }
    let disposed = false;
    let frame = 0;
    let loaded = false;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute("aria-hidden", "true");
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    if (projection === "photo")
      scene.background = new THREE.Color(
        getComputedStyle(container).getPropertyValue("--viewer-bg").trim() ||
          "#142235",
      );
    const flat = projection === "photo";
    const camera: THREE.PerspectiveCamera | THREE.OrthographicCamera = flat
      ? new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100)
      : new THREE.PerspectiveCamera(view.current.fov, 1, 0.1, 100);
    const geometry = flat
      ? new THREE.PlaneGeometry(2, 2)
      : new THREE.SphereGeometry(50, 64, 40);
    if (!flat) geometry.scale(-1, 1, 1);
    let imageAspect = 1,
      viewportAspect = 1,
      halfHeight = 1;
    function updateCamera() {
      if (camera instanceof THREE.OrthographicCamera) {
        halfHeight = Math.max(1, imageAspect / viewportAspect);
        camera.left = -halfHeight * viewportAspect;
        camera.right = halfHeight * viewportAspect;
        camera.top = halfHeight;
        camera.bottom = -halfHeight;
        camera.zoom = 75 / view.current.fov;
        const boundX = Math.max(
            0,
            imageAspect - (halfHeight * viewportAspect) / camera.zoom,
          ),
          boundY = Math.max(0, 1 - halfHeight / camera.zoom);
        view.current.panX = THREE.MathUtils.clamp(
          view.current.panX,
          -boundX,
          boundX,
        );
        view.current.panY = THREE.MathUtils.clamp(
          view.current.panY,
          -boundY,
          boundY,
        );
        camera.position.set(view.current.panX, view.current.panY, 5);
        camera.lookAt(view.current.panX, view.current.panY, 0);
      } else {
        camera.fov = view.current.fov;
        camera.aspect = viewportAspect;
        view.current.latitude = THREE.MathUtils.clamp(
          view.current.latitude,
          -85,
          85,
        );
        const phi = THREE.MathUtils.degToRad(90 - view.current.latitude),
          theta = THREE.MathUtils.degToRad(view.current.longitude);
        camera.lookAt(
          Math.sin(phi) * Math.cos(theta),
          Math.cos(phi),
          Math.sin(phi) * Math.sin(theta),
        );
      }
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
    }
    const { material, uniforms } = createColorMaterial();
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);
    const preview = new THREE.Group();
    preview.renderOrder = 10;
    scene.add(preview);
    const lineGeometry = new THREE.BufferGeometry(),
      pointGeometry = new THREE.BufferGeometry();
    const theme = getComputedStyle(container);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: theme.getPropertyValue("--accent").trim() || "#dce7f8",
      depthTest: false,
    });
    const pointMaterial = new THREE.PointsMaterial({
      color: theme.getPropertyValue("--brand").trim() || "#103f86",
      size: 9,
      sizeAttenuation: false,
      depthTest: false,
    });
    const line = new THREE.Line(lineGeometry, lineMaterial),
      corners = new THREE.Points(pointGeometry, pointMaterial);
    line.renderOrder = 10;
    corners.renderOrder = 11;
    preview.add(line, corners);
    preview.visible = false;
    let previewKey = "";
    const updatePreview = () => {
      const points = settings.current.draftPoints;
      preview.visible = points.length > 0;
      line.visible = points.length > 1;
      const key = JSON.stringify(points) + imageAspect;
      if (key === previewKey) return;
      previewKey = key;
      const position = (p: Point) =>
        flat
          ? new THREE.Vector3(
              (p.u - 0.5) * 2 * imageAspect,
              (p.v - 0.5) * 2,
              0.02,
            )
          : new THREE.Vector3(
              Math.cos(p.u * Math.PI * 2) *
                Math.sin((1 - p.v) * Math.PI) *
                49.5,
              Math.cos((1 - p.v) * Math.PI) * 49.5,
              Math.sin(p.u * Math.PI * 2) *
                Math.sin((1 - p.v) * Math.PI) *
                49.5,
            );
      pointGeometry.setFromPoints(points.map(position));
      const path: THREE.Vector3[] = [];
      for (
        let i = 0;
        i < (points.length > 2 ? points.length : points.length - 1);
        i++
      ) {
        const a = points[i],
          b = points[(i + 1) % points.length];
        let du = b.u - a.u;
        if (!flat) {
          if (du > 0.5) du--;
          if (du < -0.5) du++;
        }
        for (let j = 0; j <= 16; j++)
          path.push(
            position({
              u: a.u + (du * j) / 16,
              v: a.v + ((b.v - a.v) * j) / 16,
            }),
          );
      }
      lineGeometry.setFromPoints(path);
    };
    uniforms.horizontalWrap.value = flat ? 0 : 1;
    let lastMask: Mask | null = null;
    let lightingMask: Mask | null = null;
    let lightingImage: ImageData | null = null;
    const sync = () => {
      const current = settings.current;
      updatePreview();
      if (current.mask && lastMask !== current.mask) {
        uniforms.idMap.value.dispose();
        const m = current.mask;
        const data = new THREE.DataTexture(
          m.pixels,
          m.width,
          m.height,
          THREE.RedFormat,
        );
        data.flipY = true;
        data.unpackAlignment = 1;
        data.magFilter = data.minFilter = THREE.NearestFilter;
        data.wrapS = flat ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
        data.generateMipmaps = false;
        data.needsUpdate = true;
        uniforms.idMap.value = data;
        uniforms.maskSize.value.set(m.width, m.height);
        lastMask = m;
      } else if (!current.mask && lastMask) {
        uniforms.idMap.value.dispose();
        const empty = new THREE.DataTexture(
          new Uint8Array([0]),
          1,
          1,
          THREE.RedFormat,
        );
        empty.needsUpdate = true;
        uniforms.idMap.value = empty;
        lastMask = null;
      }
      if (current.mask && lightingImage && current.mask !== lightingMask) {
        uniforms.baseLuma.value = estimateLighting(current.mask, lightingImage);
        lightingMask = current.mask;
      }
      uniforms.original.value = current.original ? 1 : 0;
      for (let id = 0; id < 16; id++) {
        const color = current.colors[id];
        uniforms.surfaceStrength.value[id] = current.strengths[id] ?? 1;
        uniforms.surfaceEnabled.value[id] = color ? 1 : 0;
        if (color) uniforms.surfacePalette.value[id].set(color);
      }
      uniforms.selectedSurface.value = current.selected;
      uniforms.showMask.value = current.showMask ? 1 : 0;
    };
    uniforms.idMap.value.needsUpdate = true;
    synchronize.current = sync;
    sync();
    const raycaster = new THREE.Raycaster();
    function hit(clientX: number, clientY: number): Point | null {
      const rect = container.getBoundingClientRect();
      updateCamera();
      sphere.updateMatrixWorld();
      raycaster.setFromCamera(
        new THREE.Vector2(
          ((clientX - rect.left) / rect.width) * 2 - 1,
          (-(clientY - rect.top) / rect.height) * 2 + 1,
        ),
        camera,
      );
      if (flat) {
        const uv = raycaster.intersectObject(sphere)[0]?.uv;
        return uv ? { u: uv.x, v: uv.y } : null;
      }
      // Mesh triangles can leave a floating-point gap at the UV seam.
      // Use the same ray's analytic sphere hit there, then derive UVs from position.
      const point =
        raycaster.intersectObject(sphere)[0]?.point ||
        raycaster.ray.intersectSphere(
          new THREE.Sphere(new THREE.Vector3(), 50),
          new THREE.Vector3(),
        );
      if (!point) return null;
      const direction = point.clone().normalize();
      return {
        u:
          (((Math.atan2(direction.z, direction.x) / (2 * Math.PI)) % 1) + 1) %
          1,
        v: 1 - Math.acos(THREE.MathUtils.clamp(direction.y, -1, 1)) / Math.PI,
      };
    }
    let gesture: {
      x: number;
      y: number;
      moved: boolean;
      multi: boolean;
      painted: boolean;
      last: Point | null;
    } | null = null;
    const texture = new THREE.TextureLoader().load(
      source,
      (map) => {
        if (disposed) {
          map.dispose();
          return;
        }
        if (
          map.image.width > renderer.capabilities.maxTextureSize ||
          map.image.height > renderer.capabilities.maxTextureSize
        ) {
          onError(
            "Deze foto is te groot voor de grafische mogelijkheden van dit apparaat. Probeer een kleinere afbeelding.",
          );
          return;
        }
        imageAspect = map.image.width / map.image.height;
        if (flat) {
          sphere.scale.set(imageAspect, 1, 1);
          updateCamera();
        }
        const lightCanvas = document.createElement("canvas");
        const lightScale = Math.min(
          1,
          512 / map.image.width,
          512 / map.image.height,
        );
        lightCanvas.width = Math.max(
          1,
          Math.round(map.image.width * lightScale),
        );
        lightCanvas.height = Math.max(
          1,
          Math.round(map.image.height * lightScale),
        );
        const context = lightCanvas.getContext("2d", {
          willReadFrequently: true,
        });
        if (context) {
          context.drawImage(
            map.image,
            0,
            0,
            lightCanvas.width,
            lightCanvas.height,
          );
          lightingImage = context.getImageData(
            0,
            0,
            lightCanvas.width,
            lightCanvas.height,
          );
          lightingMask = null;
          sync();
        }
        map.colorSpace = THREE.SRGBColorSpace;
        material.map = map;
        material.needsUpdate = true;
        loaded = true;
        onReady();
      },
      undefined,
      () => {
        if (!disposed)
          onError(
            "De afbeelding kon niet worden geladen. Probeer een ander bestand of open het voorbeeld opnieuw.",
          );
      },
    );
    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      renderer.setSize(width, height);
      viewportAspect = width / Math.max(1, height);
      updateCamera();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    const pointers = new Map<number, { x: number; y: number }>();
    let lastDistance = 0;
    const distance = () => {
      const [a, b] = [...pointers.values()];
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    };
    const setFov = (value: number) => {
      view.current.fov = THREE.MathUtils.clamp(
        value,
        flat ? 15 : 35,
        flat ? 75 : 95,
      );
      onZoom(view.current.fov);
    };
    const down = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      container.focus();
      container.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      lastDistance = distance();
      if (pointers.size === 1) {
        gesture = {
          x: e.clientX,
          y: e.clientY,
          moved: false,
          multi: false,
          painted: false,
          last: hit(e.clientX, e.clientY),
        };
      } else if (gesture) {
        gesture.multi = true;
      }
    };
    const move = (e: PointerEvent) => {
      const previous = pointers.get(e.pointerId);
      if (!previous) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (
        gesture &&
        Math.hypot(e.clientX - gesture.x, e.clientY - gesture.y) > 6
      )
        gesture.moved = true;
      if (
        settings.current.mode !== "look" &&
        pointers.size === 1 &&
        !gesture?.multi
      ) {
        const uv = hit(e.clientX, e.clientY);
        if (!uv && gesture) gesture.last = null;
        if (uv) {
          settings.current.onPaint(
            gesture?.last ? [gesture.last, uv] : [uv],
            !gesture?.painted,
          );
          if (gesture) {
            gesture.last = uv;
            gesture.painted = true;
          }
        }
        return;
      }
      if (pointers.size > 1) {
        const nextDistance = distance();
        if (lastDistance > 0)
          setFov((view.current.fov * lastDistance) / Math.max(1, nextDistance));
        lastDistance = nextDistance;
      } else {
        if (flat) {
          const rect = container.getBoundingClientRect(),
            scale = (2 * halfHeight) / (75 / view.current.fov) / rect.height;
          view.current.panX -= (e.clientX - previous.x) * scale;
          view.current.panY += (e.clientY - previous.y) * scale;
        } else {
          view.current.longitude -= (e.clientX - previous.x) * 0.15;
          view.current.latitude += (e.clientY - previous.y) * 0.15;
        }
      }
    };
    const up = (e: PointerEvent) => {
      if (
        e.type === "pointerup" &&
        pointers.size === 1 &&
        gesture &&
        !gesture.multi &&
        !gesture.painted &&
        settings.current.mode !== "look" &&
        gesture.last
      )
        settings.current.onPaint([gesture.last], true);
      if (
        e.type === "pointerup" &&
        pointers.size === 1 &&
        gesture &&
        !gesture.moved &&
        !gesture.multi &&
        settings.current.mode === "look" &&
        loaded
      ) {
        const uv = hit(e.clientX, e.clientY),
          current = settings.current;
        if (uv && current.mask) {
          const id = surfaceAt(current.mask, uv);
          if (current.onPick) current.onPick(uv, id);
          else current.onSelect(id);
        }
      }
      pointers.delete(e.pointerId);
      lastDistance = distance();
      if (!pointers.size) gesture = null;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      setFov(view.current.fov + e.deltaY * 0.04);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Enter" && settings.current.mask) {
        const rect = container.getBoundingClientRect();
        const uv = hit(rect.left + rect.width / 2, rect.top + rect.height / 2);
        if (uv) {
          const id = surfaceAt(settings.current.mask, uv);
          if (settings.current.onPick) settings.current.onPick(uv, id);
          else settings.current.onSelect(id);
        }
        return;
      }
      if (
        ![
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "+",
          "=",
          "-",
          "Home",
        ].includes(e.key)
      )
        return;
      e.preventDefault();
      if (flat) {
        const step = 0.15 / (75 / view.current.fov);
        if (e.key === "ArrowLeft") view.current.panX -= step;
        if (e.key === "ArrowRight") view.current.panX += step;
        if (e.key === "ArrowUp") view.current.panY += step;
        if (e.key === "ArrowDown") view.current.panY -= step;
      } else {
        if (e.key === "ArrowLeft") view.current.longitude -= 5;
        if (e.key === "ArrowRight") view.current.longitude += 5;
        if (e.key === "ArrowUp") view.current.latitude += 5;
        if (e.key === "ArrowDown") view.current.latitude -= 5;
      }
      if (e.key === "+" || e.key === "=") setFov(view.current.fov - 5);
      if (e.key === "-") setFov(view.current.fov + 5);
      if (e.key === "Home") {
        view.current.longitude = 0;
        view.current.latitude = 0;
        view.current.panX = 0;
        view.current.panY = 0;
        setFov(75);
      }
    };
    const contextLost = (e: Event) => {
      e.preventDefault();
      onError(
        "De grafische verbinding is onderbroken. Herlaad de pagina om de viewer opnieuw te starten.",
      );
    };
    container.addEventListener("pointerdown", down);
    container.addEventListener("pointermove", move);
    container.addEventListener("pointerup", up);
    container.addEventListener("pointercancel", up);
    container.addEventListener("lostpointercapture", up);
    container.addEventListener("wheel", wheel, { passive: false });
    container.addEventListener("keydown", key);
    renderer.domElement.addEventListener("webglcontextlost", contextLost);
    const animate = () => {
      frame = requestAnimationFrame(animate);
      updateCamera();
      if (loaded) renderer.render(scene, camera);
    };
    animate();
    if (captureRef)
      captureRef.current = () =>
        new Promise<Blob>((resolve, reject) => {
          if (!loaded || disposed) {
            reject(new Error("Wacht tot de afbeelding geladen is."));
            return;
          }
          uniforms.selectedSurface.value = 0;
          uniforms.showMask.value = 0;
          preview.visible = false;
          updateCamera();
          renderer.render(scene, camera);
          const restore = () => {
            if (!disposed) {
              sync();
              renderer.render(scene, camera);
            }
          };
          try {
            renderer.domElement.toBlob((blob) => {
              restore();
              if (blob) resolve(blob);
              else reject(new Error("De PNG kon niet worden gemaakt."));
            }, "image/png");
          } catch {
            restore();
            reject(new Error("De weergave kon niet worden geëxporteerd."));
          }
        });
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      container.removeEventListener("pointerdown", down);
      container.removeEventListener("pointermove", move);
      container.removeEventListener("pointerup", up);
      container.removeEventListener("pointercancel", up);
      container.removeEventListener("lostpointercapture", up);
      container.removeEventListener("wheel", wheel);
      container.removeEventListener("keydown", key);
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      synchronize.current = null;
      if (captureRef) captureRef.current = null;
      lineGeometry.dispose();
      pointGeometry.dispose();
      lineMaterial.dispose();
      pointMaterial.dispose();
      uniforms.idMap.value.dispose();
      texture.dispose();
      material.dispose();
      geometry.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [source, projection, onReady, onError, onZoom, captureRef]);
  return (
    <div
      ref={host}
      className="panorama-canvas"
      tabIndex={0}
      role="region"
      aria-label={
        projection === "photo"
          ? "Interactieve fotoviewer. Sleep om de ingezoomde foto te verschuiven, gebruik plus en min om te zoomen. Klik op een oppervlak of druk Enter om het midden te selecteren."
          : "Interactieve 360 graden panoramaviewer. Sleep of gebruik de pijltjestoetsen om rond te kijken. Gebruik plus en min om te zoomen. Klik op een oppervlak of druk Enter om het midden te selecteren."
      }
    />
  );
}
