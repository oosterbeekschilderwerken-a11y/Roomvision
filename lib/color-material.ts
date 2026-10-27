import * as THREE from "three";
// Pigment replaces chroma; the panorama's linear luminance retains illumination,
// cast shadows and texture. This is an approximation, not calibrated paint colorimetry.
export function createColorMaterial() {
  const uniforms = {
    idMap: {
      value: new THREE.DataTexture(new Uint8Array([0]), 1, 1, THREE.RedFormat),
    },
    maskSize: { value: new THREE.Vector2(1, 1) },
    surfacePalette: {
      value: Array.from({ length: 16 }, () => new THREE.Color()),
    },
    surfaceEnabled: { value: Array(16).fill(0) as number[] },
    selectedSurface: { value: 0 },
    showMask: { value: 0 },
  };
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader =
      `
      uniform sampler2D idMap;
      uniform vec2 maskSize;
      uniform vec3 surfacePalette[16];
      uniform float surfaceEnabled[16];
      uniform float selectedSurface;
      uniform float showMask;
      float labelAt(vec2 uv) { return floor(texture2D(idMap, vec2(fract(uv.x), clamp(uv.y, 0.0, 1.0))).r * 255.0 + 0.5); }
    ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `
      #include <map_fragment>
      float surfaceId = labelAt(vMapUv);
      int index = int(surfaceId);
      if (index > 0 && index < 16) {
        if (surfaceEnabled[index] > 0.5) {
          float light = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
          diffuseColor.rgb = surfacePalette[index] * clamp(light / 0.55, 0.04, 1.65);
        }
        if (showMask > 0.5) {
          vec3 debugColor = 0.35 + 0.3 * cos(vec3(0.0, 2.1, 4.2) + surfaceId * 2.4);
          diffuseColor.rgb = mix(diffuseColor.rgb, debugColor, 0.6);
        }
        if (abs(surfaceId - selectedSurface) < 0.1) {
          vec2 stepUv = 2.0 / maskSize;
          bool edge = labelAt(vMapUv + vec2(stepUv.x,0.0)) != surfaceId || labelAt(vMapUv - vec2(stepUv.x,0.0)) != surfaceId || labelAt(vMapUv + vec2(0.0,stepUv.y)) != surfaceId || labelAt(vMapUv - vec2(0.0,stepUv.y)) != surfaceId;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.95,0.63,0.18), edge ? 0.9 : 0.035);
        }
      }
    `,
    );
  };
  material.customProgramCacheKey = () => "roomvision-surface-pigment-v1";
  return { material, uniforms };
}
