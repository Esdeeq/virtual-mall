import { useState, useEffect } from 'react';

export function LiveClock() {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hh = String(time.getHours()).padStart(2, '0');
  const mm = String(time.getMinutes()).padStart(2, '0');
  const ss = String(time.getSeconds()).padStart(2, '0');
  const day = time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="flex flex-col items-end select-none">
      <span
        className="mono tabular-nums font-bold"
        style={{ fontSize: '2.6rem', letterSpacing: '-0.04em', lineHeight: 1, color: 'var(--ink)' }}
      >
        {hh}<span style={{ opacity: 0.4, animation: 'pulse-glow 1s step-start infinite' }}>:</span>{mm}
        <span style={{ fontSize: '1.2rem', opacity: 0.5 }}>:{ss}</span>
      </span>
      <span className="text-xs font-semibold mt-0.5" style={{ color: 'var(--subtle)', letterSpacing: '0.06em' }}>
        {day} · Mall is open
      </span>
    </div>
  );
}
