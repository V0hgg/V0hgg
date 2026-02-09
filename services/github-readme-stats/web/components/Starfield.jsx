import { useEffect, useRef } from "react";

export default function Starfield() {
  const canvasRef = useRef(/** @type {HTMLCanvasElement | null} */ (null));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    /** @type {CanvasRenderingContext2D | null} */
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    /** @type {{x:number,y:number,z:number,r:number,tw:number}[]} */
    let stars = [];
    let raf = 0;
    let last = performance.now();
    let mouse = { x: 0, y: 0, active: false };

    const resize = () => {
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.floor((window.innerWidth * window.innerHeight) / 16000);
      stars = Array.from({ length: Math.max(100, Math.min(260, count)) }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        z: 0.2 + Math.random() * 0.8,
        r: 0.6 + Math.random() * 1.6,
        tw: Math.random() * Math.PI * 2,
      }));
    };

    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // subtle drift toward pointer
      const mx = mouse.active ? (mouse.x - window.innerWidth / 2) * 0.00055 : 0;
      const my = mouse.active ? (mouse.y - window.innerHeight / 2) * 0.00055 : 0;

      for (const s of stars) {
        s.tw += dt * (1.0 + s.z * 2.2);
        s.x += (8.5 * s.z + 4.5) * dt + mx * 120;
        s.y += (2.0 * s.z + 0.7) * dt + my * 120;

        if (s.x > window.innerWidth + 10) s.x = -10;
        if (s.y > window.innerHeight + 10) s.y = -10;

        const a = 0.10 + (Math.sin(s.tw) * 0.5 + 0.5) * 0.30;
        ctx.fillStyle = `rgba(231, 251, 255, ${a})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // comet streak (slow, sparse)
      const t = now / 1000;
      const cx = (window.innerWidth * 0.15 + (t * 58) % (window.innerWidth + 320)) - 160;
      const cy = window.innerHeight * 0.18 + Math.sin(t * 0.65) * 24;
      const grad = ctx.createLinearGradient(cx, cy, cx + 210, cy + 8);
      grad.addColorStop(0, "rgba(125,249,255,0)");
      grad.addColorStop(0.55, "rgba(125,249,255,0.12)");
      grad.addColorStop(1, "rgba(255,79,216,0.18)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + 210, cy + 8);
      ctx.stroke();

      raf = requestAnimationFrame(tick);
    };

    const onMove = (e) => {
      mouse = { x: e.clientX, y: e.clientY, active: true };
    };
    const onLeave = () => {
      mouse.active = false;
    };

    resize();
    raf = requestAnimationFrame(tick);

    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="starfield" aria-hidden="true" />;
}

