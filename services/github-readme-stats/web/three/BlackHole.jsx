import { Environment, Float, Lightformer } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, Color, DoubleSide } from "three";
import InfallDust from "./InfallDust.jsx";

const DISK_VERTEX = `
varying vec3 vPos;
void main() {
  vPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const DISK_FRAGMENT = `
precision highp float;

uniform float uTime;
uniform float uSeed;
uniform float uInner;
uniform float uOuter;
uniform vec3 uGold;
uniform vec3 uPale;
uniform float uAlpha;
uniform float uBoost;

varying vec3 vPos;

#define PI 3.1415926535897932384626433832795

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    v += amp * noise(p);
    p *= 2.03;
    amp *= 0.5;
  }
  return v;
}

void main() {
  float r = length(vPos.xy);
  float a = atan(vPos.y, vPos.x);
  float rr = (r - uInner) / max(0.0001, (uOuter - uInner));
  rr = clamp(rr, 0.0, 1.0);

  float shear = mix(0.32, 2.7, pow(1.0 - rr, 1.8));
  float phase = a + uTime * shear;

  float streamA = fbm(vec2(phase * 3.1 + uSeed, rr * 10.0 - uTime * 0.32));
  float streamB = fbm(vec2(phase * 9.2 - streamA * 2.1, rr * 25.0 + uSeed * 4.0));
  float filaments = smoothstep(0.38, 0.9, streamB + streamA * 0.42);
  float turbulence = mix(streamA, filaments, 0.64);

  float beaming = pow(max(0.0, cos(a - 0.56)), 6.0);
  float innerHeat = exp(-rr * 10.8);
  float shoulderHeat = exp(-pow((rr - 0.18) * 4.2, 2.0));

  float innerFade = smoothstep(0.0, 0.1, rr);
  float outerFade = 1.0 - smoothstep(0.72, 1.0, rr);

  float intensity = turbulence * 0.8 + innerHeat * 1.36 + shoulderHeat * 0.5 + beaming * 1.16;
  intensity *= outerFade;

  vec3 warm = mix(uGold, uPale, clamp(intensity * 0.42 + beaming * 0.38, 0.0, 1.0));
  vec3 col = warm * (0.18 + intensity * 0.95) * uBoost;

  float alpha = innerFade * outerFade * (0.12 + intensity * 0.5) * uAlpha;
  if (alpha < 0.01) discard;

  gl_FragColor = vec4(col, alpha);
}
`;

const LENS_VERTEX = `
varying vec3 vPos;
void main() {
  vPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const LENS_FRAGMENT = `
precision highp float;

uniform float uTime;
uniform vec3 uColor;
uniform float uInner;
uniform float uOuter;
uniform float uAlpha;

varying vec3 vPos;

#define PI 3.1415926535897932384626433832795

void main() {
  float r = length(vPos.xy);
  float a = atan(vPos.y, vPos.x);
  float rr = (r - uInner) / max(0.0001, (uOuter - uInner));
  rr = clamp(rr, 0.0, 1.0);

  float shell = exp(-pow((rr - 0.48) * 2.55, 2.0));
  float poles = pow(abs(sin(a)), 4.6);
  float beaming = 0.72 + 0.28 * pow(max(0.0, cos(a - 0.58)), 5.0);

  float caustic = exp(-pow(vPos.y / 0.055, 2.0));
  float causticReach = smoothstep(uInner * 1.02, uOuter * 1.45, abs(vPos.x));

  float pulse = 0.96 + 0.04 * sin(uTime * 0.34 + a * 1.8);
  float alpha = uAlpha * pulse * (shell * poles * beaming * 1.24 + caustic * causticReach * 0.62);

  if (alpha < 0.01) discard;
  gl_FragColor = vec4(uColor, alpha);
}
`;

const SHADOW_VERTEX = `
varying vec2 vUv;
void main() {
  vUv = uv * 2.0 - 1.0;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const SHADOW_FRAGMENT = `
precision highp float;
varying vec2 vUv;

void main() {
  float r = length(vUv);
  float inner = smoothstep(0.82, 1.04, r);
  float outer = 1.0 - smoothstep(1.0, 1.44, r);
  float alpha = inner * outer * 0.56;
  if (alpha < 0.005) discard;
  gl_FragColor = vec4(0.0, 0.0, 0.0, alpha);
}
`;

const HORIZON_VERTEX = `
varying vec2 vUv;
void main() {
  vUv = uv * 2.0 - 1.0;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const HORIZON_FRAGMENT = `
precision highp float;
uniform float uTime;
varying vec2 vUv;

#define PI 3.1415926535897932384626433832795

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    v += noise(p) * amp;
    p *= 2.07;
    amp *= 0.5;
  }
  return v;
}

float ridged(vec2 p) {
  float v = 0.0;
  float amp = 0.55;
  for (int i = 0; i < 4; i++) {
    float n = noise(p);
    v += (1.0 - abs(n * 2.0 - 1.0)) * amp;
    p *= 2.16;
    amp *= 0.55;
  }
  return v;
}

void main() {
  float precess = uTime * 0.24 + sin(uTime * 0.38) * 0.18;
  float c = cos(precess);
  float s = sin(precess);
  mat2 rot = mat2(c, -s, s, c);

  vec2 p = rot * vUv;

  float r = length(p);
  if (r > 1.0) discard;

  float a = atan(p.y, p.x);
  float inward = pow(max(0.0, 1.0 - r), 1.22);
  float radialFlow = log(1.0 + (1.0 - r) * 18.0);

  float shear = mix(1.35, 9.4, pow(inward, 2.05));
  float suction = radialFlow * (4.8 + inward * 9.5);
  float theta = a + uTime * shear + suction;
  theta += sin(a * 3.0 + uTime * 1.2) * 0.26 * inward;

  vec2 flowA = vec2(theta * 3.65 + radialFlow * 6.2, r * 21.0 - uTime * 1.95);
  float base = fbm(flowA);
  float folds = ridged(flowA * 1.92 + vec2(base * 2.7, -uTime * 0.95));

  float arms = sin(theta * 33.0 + folds * 14.0 - r * 68.0 - uTime * 2.5) * 0.5 + 0.5;
  float curl = sin(theta * 14.0 - radialFlow * 8.2 + uTime * 1.45 + base * 4.2) * 0.5 + 0.5;
  float vortex = mix(base, folds, 0.62);
  vortex = mix(vortex, arms, 0.44);
  vortex = mix(vortex, curl, 0.31);

  float eye = 1.0 - smoothstep(0.0, 0.14, r);
  float innerBand = smoothstep(0.08, 0.56, r) * (1.0 - smoothstep(0.56, 0.84, r));
  float outerBand = smoothstep(0.62, 0.96, r) * (1.0 - smoothstep(0.96, 1.0, r));
  float sink = smoothstep(0.05, 0.94, r);

  float darkWaves = max(0.0, vortex - 0.34) * innerBand * sink * 0.11;
  float shearRidges = max(0.0, arms - 0.45) * innerBand * 0.055;
  float rimLift = (0.015 + outerBand * 0.034) * (0.55 + folds * 0.45);
  float brightness = darkWaves + shearRidges + rimLift;

  vec3 col = vec3(brightness);
  col *= (1.0 - eye * 0.999);

  gl_FragColor = vec4(col, 1.0);
}
`;

export default function BlackHole({ reducedMotion }) {
  const diskGroupRef = useRef(null);
  const diskMatRef = useRef(null);
  const glowMatRef = useRef(null);
  const lensMatRef = useRef(null);
  const horizonMatRef = useRef(null);
  const animTimeRef = useRef(0);
  const smoothDeltaRef = useRef(1 / 60);

  const diskUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSeed: { value: Math.random() * 10 },
      uInner: { value: 1.28 },
      uOuter: { value: 3.2 },
      uGold: { value: new Color("#C99B50") },
      uPale: { value: new Color("#F5EAD3") },
      uAlpha: { value: 0.98 },
      uBoost: { value: 1.02 },
    }),
    [],
  );

  const underDiskUniforms = useMemo(
    () => ({
      ...diskUniforms,
      uAlpha: { value: 0.52 },
      uBoost: { value: 0.84 },
    }),
    [diskUniforms],
  );

  const glowUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSeed: { value: Math.random() * 10 },
      uInner: { value: 1.14 },
      uOuter: { value: 3.8 },
      uGold: { value: new Color("#B78337") },
      uPale: { value: new Color("#F2D29A") },
      uAlpha: { value: 0.22 },
      uBoost: { value: 0.82 },
    }),
    [],
  );

  const lensUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new Color("#F3D8A4") },
      uInner: { value: 1.16 },
      uOuter: { value: 1.72 },
      uAlpha: { value: 0.72 },
    }),
    [],
  );

  const horizonUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
    }),
    [],
  );

  useFrame((state, delta) => {
    const clampedDelta = Math.min(delta, 1 / 30);
    smoothDeltaRef.current += (clampedDelta - smoothDeltaRef.current) * 0.08;

    const elapsed = state.clock.getElapsedTime();
    const warmup = Math.min(1, Math.max(0, (elapsed - 0.35) / 5.8));
    const easedWarmup = warmup * warmup * (3 - 2 * warmup);
    const speed = 0.12 + easedWarmup * 0.56;

    animTimeRef.current += smoothDeltaRef.current * speed;
    const t = animTimeRef.current;

    if (diskMatRef.current) diskMatRef.current.uniforms.uTime.value = t;
    if (glowMatRef.current) glowMatRef.current.uniforms.uTime.value = t;
    if (lensMatRef.current) lensMatRef.current.uniforms.uTime.value = t;
    if (horizonMatRef.current) horizonMatRef.current.uniforms.uTime.value = t;

    if (reducedMotion || !diskGroupRef.current) return;
    const spin = 0.03 + easedWarmup * 0.09;
    diskGroupRef.current.rotation.y += smoothDeltaRef.current * spin;
    diskGroupRef.current.rotation.x = 1.12 + Math.sin(t * 0.11) * 0.01;
    diskGroupRef.current.rotation.z = 0.06 + Math.cos(t * 0.14) * 0.01;
  });

  return (
    <>
      <Environment resolution={256}>
        <group rotation={[-Math.PI / 3, 0.88, 0]}>
          <Lightformer form="circle" intensity={2.9} position={[0, 4, 6]} scale={10} />
          <Lightformer form="circle" intensity={1.45} position={[-6, 2, -2]} scale={8} />
          <Lightformer form="circle" intensity={1.1} position={[6, 1, -4]} scale={7} />
          <Lightformer form="circle" intensity={0.52} position={[0, -4, -2]} scale={6} />
        </group>
      </Environment>

      <Float speed={reducedMotion ? 0 : 0.32} floatIntensity={reducedMotion ? 0 : 0.06}>
        <group position={[1.62, 0.1, 0]} scale={1.9}>
          <mesh position={[0, 0, -0.01]}>
            <circleGeometry args={[2.6, 240]} />
            <shaderMaterial
              transparent
              depthWrite={false}
              side={DoubleSide}
              vertexShader={SHADOW_VERTEX}
              fragmentShader={SHADOW_FRAGMENT}
            />
          </mesh>

          <mesh>
            <circleGeometry args={[1.16, 240]} />
            <shaderMaterial
              ref={horizonMatRef}
              uniforms={horizonUniforms}
              vertexShader={HORIZON_VERTEX}
              fragmentShader={HORIZON_FRAGMENT}
              toneMapped={false}
            />
          </mesh>

          <mesh>
            <ringGeometry args={[1.16, 1.72, 320, 1]} />
            <shaderMaterial
              ref={lensMatRef}
              transparent
              depthWrite={false}
              side={DoubleSide}
              blending={AdditiveBlending}
              uniforms={lensUniforms}
              vertexShader={LENS_VERTEX}
              fragmentShader={LENS_FRAGMENT}
            />
          </mesh>

          <group ref={diskGroupRef} rotation={[1.15, 0, 0.06]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.018, 0]}>
              <ringGeometry args={[1.28, 3.2, 720, 2]} />
              <shaderMaterial
                ref={diskMatRef}
                transparent
                depthWrite={false}
                side={DoubleSide}
                uniforms={diskUniforms}
                vertexShader={DISK_VERTEX}
                fragmentShader={DISK_FRAGMENT}
              />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.018, 0]}>
              <ringGeometry args={[1.28, 3.2, 720, 2]} />
              <shaderMaterial
                transparent
                depthWrite={false}
                side={DoubleSide}
                uniforms={underDiskUniforms}
                vertexShader={DISK_VERTEX}
                fragmentShader={DISK_FRAGMENT}
              />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]} scale={1.02}>
              <ringGeometry args={[1.14, 3.8, 720, 2]} />
              <shaderMaterial
                ref={glowMatRef}
                transparent
                depthWrite={false}
                side={DoubleSide}
                blending={AdditiveBlending}
                uniforms={glowUniforms}
                vertexShader={DISK_VERTEX}
                fragmentShader={DISK_FRAGMENT}
              />
            </mesh>

            <InfallDust
              count={7200}
              inner={1.6}
              outer={4.8}
              height={0.34}
              opacity={0.11}
              sizeMin={0.2}
              sizeMax={0.66}
              speedMin={0.38}
              speedMax={1.2}
              fallMin={0.06}
              fallMax={0.24}
              colorA="#9E7233"
              colorB="#E8CEA0"
              reducedMotion={reducedMotion}
            />
            <InfallDust
              count={3800}
              inner={1.25}
              outer={3.4}
              height={0.08}
              opacity={0.23}
              sizeMin={0.28}
              sizeMax={0.95}
              speedMin={1.0}
              speedMax={2.55}
              fallMin={0.28}
              fallMax={0.92}
              colorA="#C99B50"
              colorB="#F5EAD3"
              reducedMotion={reducedMotion}
            />
            <InfallDust
              count={2200}
              inner={1.18}
              outer={2.02}
              height={0.04}
              opacity={0.34}
              sizeMin={0.22}
              sizeMax={0.66}
              speedMin={2.3}
              speedMax={4.4}
              fallMin={0.95}
              fallMax={2.1}
              colorA="#F5EAD3"
              colorB="#D7A75D"
              reducedMotion={reducedMotion}
            />
          </group>
        </group>
      </Float>
    </>
  );
}

