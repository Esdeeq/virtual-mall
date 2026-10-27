/**
 * ParallaxTilt — applies a 3D perspective tilt to children based on mouse
 * position within the element. Gives cards a premium tactile feel.
 */
import { useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface ParallaxTiltProps {
  children: React.ReactNode;
  maxTilt?: number; // degrees, default 8
  scale?: number;   // hover scale, default 1.02
  glare?: boolean;  // show a glare highlight
  glareColor?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export function ParallaxTilt({
  children,
  maxTilt = 8,
  scale = 1.02,
  glare = true,
  glareColor = 'rgba(255,255,255,0.18)',
  className,
  style,
  onClick,
}: ParallaxTiltProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  const [hovered, setHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;  // 0–1
    const py = (e.clientY - rect.top) / rect.height;  // 0–1
    setTilt({
      rotateX: (0.5 - py) * maxTilt * 2,
      rotateY: (px - 0.5) * maxTilt * 2,
      glareX: px * 100,
      glareY: py * 100,
    });
  };

  const handleMouseLeave = () => {
    setHovered(false);
    setTilt({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      animate={{
        rotateX: tilt.rotateX,
        rotateY: tilt.rotateY,
        scale: hovered ? scale : 1,
      }}
      transition={{ type: 'spring', stiffness: 260, damping: 24, mass: 0.6 }}
      style={{
        ...style,
        transformStyle: 'preserve-3d',
        perspective: '800px',
        position: 'relative',
        cursor: onClick ? 'pointer' : undefined,
      }}
      className={className}
    >
      {children}
      {glare && hovered && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, ${glareColor} 0%, transparent 65%)`,
            pointerEvents: 'none',
            mixBlendMode: 'overlay',
          }}
        />
      )}
    </motion.div>
  );
}
