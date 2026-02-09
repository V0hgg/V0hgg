import { useEffect, useRef } from "react";

export default function Tilt({ children, className = "" }) {
  const ref = useRef(/** @type {HTMLDivElement | null} */ (null));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let target = { rx: 0, ry: 0, s: 1 };
    let cur = { rx: 0, ry: 0, s: 1 };

    const frame = () => {
      // damped approach; avoids re-render loops
      cur.rx += (target.rx - cur.rx) * 0.12;
      cur.ry += (target.ry - cur.ry) * 0.12;
      cur.s += (target.s - cur.s) * 0.08;

      el.style.setProperty("--rx", `${cur.rx.toFixed(3)}deg`);
      el.style.setProperty("--ry", `${cur.ry.toFixed(3)}deg`);
      el.style.setProperty("--scale", `${cur.s.toFixed(4)}`);

      raf = requestAnimationFrame(frame);
    };

    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / Math.max(1, r.width);
      const py = (e.clientY - r.top) / Math.max(1, r.height);
      const dx = px - 0.5;
      const dy = py - 0.5;

      target = {
        rx: dy * -6.5,
        ry: dx * 9.0,
        s: 1.01,
      };
    };

    const onLeave = () => {
      target = { rx: 0, ry: 0, s: 1 };
    };

    raf = requestAnimationFrame(frame);
    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div ref={ref} className={`tilt ${className}`.trim()}>
      {children}
    </div>
  );
}

