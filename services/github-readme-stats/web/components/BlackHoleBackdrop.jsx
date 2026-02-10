import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import * as THREE from "three";
import BlackHole from "../three/BlackHole.jsx";

export default function BlackHoleBackdrop({ reducedMotion }) {
  return (
    <div className="heroBg" aria-hidden="true">
      <Canvas
        className="heroBg__canvas"
        dpr={[1, 1.75]}
        gl={{ alpha: true, antialias: true }}
        camera={{ position: [0, 0, 5.8], fov: 35, near: 0.1, far: 50 }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.15;
        }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.16} />
          <directionalLight position={[8, 5, 7]} intensity={0.95} color="#F2D7A0" />
          <BlackHole reducedMotion={reducedMotion} />
        </Suspense>
      </Canvas>

      {/* Portfolio-style veil to add depth and readability over the WebGL */}
      <div className="heroBg__veil" />
    </div>
  );
}

