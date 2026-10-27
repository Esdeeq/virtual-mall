import { useEffect, useRef } from 'react';

export function CursorGlow() {
  const dotRef  = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const pos     = useRef({ x: -200, y: -200 });
  const ring    = useRef({ x: -200, y: -200 });
  const rafRef  = useRef<number>(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', onMove);

    const loop = () => {
      ring.current.x += (pos.current.x - ring.current.x) * 0.12;
      ring.current.y += (pos.current.y - ring.current.y) * 0.12;

      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${pos.current.x - 4}px, ${pos.current.y - 4}px)`;
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ring.current.x - 18}px, ${ring.current.y - 18}px)`;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <>
      {/* Inner dot */}
      <div
        ref={dotRef}
        className="pointer-events-none fixed z-[9999] top-0 left-0"
        style={{
          width: 8, height: 8,
          borderRadius: '50%',
          background: 'var(--accent)',
          opacity: 0.9,
          mixBlendMode: 'difference',
          willChange: 'transform',
        }}
      />
      {/* Trailing ring */}
      <div
        ref={ringRef}
        className="pointer-events-none fixed z-[9998] top-0 left-0"
        style={{
          width: 36, height: 36,
          borderRadius: '50%',
          border: '1.5px solid var(--accent)',
          opacity: 0.35,
          willChange: 'transform',
          transition: 'opacity 0.2s',
        }}
      />
    </>
  );
}
