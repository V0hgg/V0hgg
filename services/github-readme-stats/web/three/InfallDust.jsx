import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, Color } from "three";

const DUST_VERTEX = `
precision highp float;

attribute float a0;
attribute float r0;
attribute float speed;
attribute float fall;
attribute float h0;
attribute float seed;
attribute float psize;

uniform float uTime;
uniform float uInner;
uniform float uOuter;
uniform float uOpacity;
uniform float uPixelRatio;

uniform vec3 uColorA;
uniform vec3 uColorB;

varying float vAlpha;
varying vec3 vColor;
varying float vSeed;
varying float vStretch;

void main() {
  float span = max(0.0001, uOuter - uInner);

  // Spiral-in radius (loops cleanly)
  float r = uInner + mod(r0 - uTime * fall + span * 1000.0, span);
  float t = (r - uInner) / span; // 0..1 outward

  // Tighten as it falls inward and add slight turbulence.
  float tighten = (1.0 - t);
  float radialJitter = (sin(seed * 61.7 + uTime * 0.7 + r * 4.0) * 0.02
    + cos(seed * 37.1 + uTime * 0.45) * 0.015) * tighten;
  r = max(uInner * 0.86, r - radialJitter);

  float omega = speed * mix(0.62, 3.2, pow(tighten, 1.9));
  float frameDrag = 0.55 * pow(tighten, 2.2);
  float a = a0 + uTime * omega + frameDrag + seed * 0.35;

  float y = h0 * mix(1.0, 0.02, pow(tighten, 1.4));
  y += sin(uTime * 1.1 + seed * 6.2831 + a * 2.9) * 0.011 * tighten;
  y += cos(uTime * 0.43 + seed * 10.7 + r * 5.3) * 0.006;

  float pinch = mix(1.0, 0.68, pow(tighten, 2.3));
  vec3 pos = vec3(cos(a) * r * pinch, y, sin(a) * r * pinch);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;

  float depth = max(0.8, -mv.z);
  float size = psize * mix(0.7, 1.2, tighten) * (120.0 / depth);
  gl_PointSize = size * uPixelRatio;

  float heat = smoothstep(1.0, 0.0, t);
  vColor = mix(uColorA, uColorB, clamp(heat * 0.7 + seed * 0.25, 0.0, 1.0));
  float swallow = smoothstep(0.05, 0.24, t);
  vAlpha = uOpacity * swallow * (0.08 + heat * 0.92);
  vSeed = seed;
  vStretch = mix(1.1, 2.8, pow(tighten, 1.2));
}
`;

const DUST_FRAGMENT = `
precision highp float;

varying float vAlpha;
varying vec3 vColor;
varying float vSeed;
varying float vStretch;

void main() {
  vec2 uv = gl_PointCoord * 2.0 - 1.0;

  float ang = vSeed * 6.2831853;
  float cs = cos(ang);
  float sn = sin(ang);
  mat2 rot = mat2(cs, -sn, sn, cs);

  vec2 streakUv = rot * uv;
  streakUv.x *= vStretch;

  float core = smoothstep(1.0, 0.0, dot(streakUv, streakUv));
  float halo = smoothstep(1.0, 0.0, dot(uv, uv)) * 0.34;
  float a = pow(core, 1.3) + halo;
  a *= vAlpha;

  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor, a);
}
`;

export default function InfallDust({
  count,
  inner,
  outer,
  height,
  opacity,
  sizeMin,
  sizeMax,
  speedMin,
  speedMax,
  fallMin,
  fallMax,
  colorA,
  colorB,
  reducedMotion,
}) {
  const matRef = useRef(null);
  const animTimeRef = useRef(0);
  const smoothDeltaRef = useRef(1 / 60);
  const pixelRatio = useThree((s) => s.gl.getPixelRatio());

  const attributes = useMemo(() => {
    const a0 = new Float32Array(count);
    const r0 = new Float32Array(count);
    const speed = new Float32Array(count);
    const fall = new Float32Array(count);
    const h0 = new Float32Array(count);
    const seed = new Float32Array(count);
    const psize = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      a0[i] = Math.random() * Math.PI * 2;
      const t = Math.random();
      r0[i] = inner + (outer - inner) * Math.sqrt(t);
      speed[i] = speedMin + Math.random() * (speedMax - speedMin);
      fall[i] = fallMin + Math.random() * (fallMax - fallMin);
      h0[i] = (Math.random() * 2 - 1) * height;
      seed[i] = Math.random();
      psize[i] = sizeMin + Math.random() * (sizeMax - sizeMin);
    }

    return { a0, r0, speed, fall, h0, seed, psize };
  }, [
    count,
    inner,
    outer,
    height,
    speedMin,
    speedMax,
    fallMin,
    fallMax,
    sizeMin,
    sizeMax,
  ]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uInner: { value: inner },
      uOuter: { value: outer },
      uOpacity: { value: opacity },
      uPixelRatio: { value: pixelRatio },
      uColorA: { value: new Color(colorA) },
      uColorB: { value: new Color(colorB) },
    }),
    [inner, outer, opacity, pixelRatio, colorA, colorB],
  );

  useFrame(({ clock }, delta) => {
    if (!matRef.current) return;

    const clampedDelta = Math.min(delta, 1 / 30);
    smoothDeltaRef.current += (clampedDelta - smoothDeltaRef.current) * 0.08;

    const elapsed = clock.getElapsedTime();
    const warmup = Math.min(1, Math.max(0, (elapsed - 0.45) / 6.4));
    const easedWarmup = warmup * warmup * (3 - 2 * warmup);
    const speed = 0.02 + easedWarmup * 0.98;
    animTimeRef.current += smoothDeltaRef.current * speed;

    uniforms.uPixelRatio.value = pixelRatio;
    uniforms.uTime.value = reducedMotion ? 0 : animTimeRef.current;
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-a0" args={[attributes.a0, 1]} />
        <bufferAttribute attach="attributes-r0" args={[attributes.r0, 1]} />
        <bufferAttribute attach="attributes-speed" args={[attributes.speed, 1]} />
        <bufferAttribute attach="attributes-fall" args={[attributes.fall, 1]} />
        <bufferAttribute attach="attributes-h0" args={[attributes.h0, 1]} />
        <bufferAttribute attach="attributes-seed" args={[attributes.seed, 1]} />
        <bufferAttribute attach="attributes-psize" args={[attributes.psize, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        uniforms={uniforms}
        vertexShader={DUST_VERTEX}
        fragmentShader={DUST_FRAGMENT}
      />
    </points>
  );
}

