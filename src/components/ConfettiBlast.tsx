/**
 * ConfettiBlast — fires a burst of animated confetti particles from a given
 * screen position. Used on "Add to cart" and "Order complete" events.
 */
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  angle: number;
  speed: number;
  size: number;
  shape: 'circle' | 'rect' | 'star';
}

interface ConfettiBlastProps {
  trigger: boolean;
  originX?: number; // viewport px, default center
  originY?: number; // viewport px, default 40%
  count?: number;
  colors?: string[];
}

const DEFAULTS = ['#6366f1','#ec4899','#f59e0b','#22c55e','#0ea5e9','#a78bfa','#fb923c'];

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

export function ConfettiBlast({
  trigger,
  originX,
  originY,
  count = 48,
  colors = DEFAULTS,
}: ConfettiBlastProps) {
  const ox = originX ?? window.innerWidth / 2;
  const oy = originY ?? window.innerHeight * 0.4;

  // Generate stable particles once — values captured in useMemo avoid impure-render lint
  const particles: Particle[] = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: ox,
      y: oy,
      color: colors[i % colors.length],
      angle: randomBetween(0, 360),
      speed: randomBetween(120, 360),
      size: randomBetween(5, 11),
      shape: (['circle','rect','star'] as const)[Math.floor(randomBetween(0, 2.99))],
    })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []);

  if (!trigger) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden">

      {particles.map(p => {
        const rad = (p.angle * Math.PI) / 180;
        const tx = Math.cos(rad) * p.speed;
        const ty = Math.sin(rad) * p.speed - 80; // slight upward bias
        return (
          <motion.div
            key={p.id}
            initial={{ x: p.x, y: p.y, opacity: 1, scale: 1, rotate: 0 }}
            animate={{
              x: p.x + tx,
              y: p.y + ty + 180, // gravity
              opacity: 0,
              scale: 0.2,
              rotate: randomBetween(-360, 360),
            }}
            transition={{ duration: randomBetween(0.7, 1.4), ease: 'easeOut' }}
            style={{
              position: 'absolute',
              width: p.size,
              height: p.shape === 'rect' ? p.size * 0.5 : p.size,
              background: p.color,
              borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'rect' ? '2px' : '0',
              clipPath: p.shape === 'star'
                ? 'polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)'
                : undefined,
            }}
          />
        );
      })}
    </div>
  );
}

/** Hook: fires confetti on cart add. Returns [triggerFn]. */
export function useCartConfetti() {
  const [burst, setBurst] = React.useState<{ x: number; y: number; key: number } | null>(null);

  const fire = (e?: MouseEvent | React.MouseEvent) => {
    const x = e ? (e as MouseEvent).clientX : window.innerWidth / 2;
    const y = e ? (e as MouseEvent).clientY : window.innerHeight * 0.4;
    setBurst({ x, y, key: Date.now() });
    setTimeout(() => setBurst(null), 1500);
  };

  const node = burst ? (
    <ConfettiBlast key={burst.key} trigger originX={burst.x} originY={burst.y} count={36} />
  ) : null;

  return { fire, node };
}
