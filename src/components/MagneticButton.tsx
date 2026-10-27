/**
 * MagneticButton — wraps children in a div that magnetically tracks the cursor
 * when hovered, pulling the content toward the mouse. The effect makes CTAs feel
 * alive and premium without being gimmicky.
 */
import { useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface MagneticButtonProps {
  children: React.ReactNode;
  strength?: number; // 0–1, how strongly it pulls
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  as?: 'button' | 'div';
}

export function MagneticButton({
  children,
  strength = 0.32,
  className,
  style,
  onClick,
  disabled,
  as: Tag = 'button',
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current || disabled) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    setPos({
      x: (e.clientX - cx) * strength,
      y: (e.clientY - cy) * strength,
    });
  };

  const handleMouseLeave = () => setPos({ x: 0, y: 0 });

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ display: 'inline-block' }}
    >
      <motion.div
        animate={{ x: pos.x, y: pos.y }}
        transition={{ type: 'spring', stiffness: 300, damping: 22, mass: 0.5 }}
        className={className}
        style={style}
        onClick={disabled ? undefined : onClick}
        role={Tag === 'button' ? 'button' : undefined}
        tabIndex={Tag === 'button' ? 0 : undefined}
      >
        {children}
      </motion.div>
    </div>
  );
}
