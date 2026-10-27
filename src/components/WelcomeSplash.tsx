/**
 * WelcomeSplash — cinematic intro, plays ONCE per browser session.
 * sessionStorage flag prevents re-show on HMR reloads or navigation.
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function WelcomeSplash() {
  const [show, setShow] = useState(true);
  const [phase, setPhase] = useState<'logo' | 'exit'>('logo');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!show) return;

    // Animate progress bar from 0→100 over 4.2s
    const start = performance.now();
    const duration = 4200;
    let raf: number;
    const tick = (now: number) => {
      const elapsed = now - start;
      setProgress(Math.min(100, (elapsed / duration) * 100));
      if (elapsed < duration) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // Phase out after 4.2s, unmount at 5.0s
    const t1 = setTimeout(() => setPhase('exit'), 4200);
    const t2 = setTimeout(() => setShow(false), 5000);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          animate={phase === 'exit' ? { opacity: 0, scale: 1.06 } : { opacity: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[99999] flex items-center justify-center"
          style={{ background: '#050a14' }}
        >
          {/* Ambient rings */}
          {[1, 2, 3].map(i => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: phase === 'exit' ? 0 : 0.13 / i, scale: 0.9 + i * 0.28 }}
              transition={{ duration: 0.9, delay: i * 0.14, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                width: 200 + i * 130,
                height: 200 + i * 130,
                borderRadius: '50%',
                border: '1px solid rgba(99,102,241,0.45)',
                pointerEvents: 'none',
              }}
            />
          ))}

          {/* Center content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-6"
          >
            {/* VM tile */}
            <motion.div
              animate={{ boxShadow: [
                '0 0 40px rgba(37,99,235,0.5), 0 0 80px rgba(14,165,233,0.18)',
                '0 0 60px rgba(37,99,235,0.72), 0 0 120px rgba(14,165,233,0.32)',
                '0 0 40px rgba(37,99,235,0.5), 0 0 80px rgba(14,165,233,0.18)',
              ]}}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: 80,
                height: 80,
                borderRadius: 20,
                background: 'linear-gradient(135deg, #1d4ed8, #2563eb, #0ea5e9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="44" height="44" viewBox="0 0 36 36" fill="none">
                <path
                  d="M6 28 Q6 16 18 14 Q30 16 30 28"
                  stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round"
                />
                <rect x="14" y="20" width="8" height="8" rx="4" fill="white" opacity="0.9" />
                <path d="M11 10 L18 17 L25 10" stroke="white" strokeWidth="2.2" fill="none"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>

            {/* Wordmark — no subtitle */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.45, ease: 'easeOut' }}
              style={{ textAlign: 'center' }}
            >
              <div style={{
                fontFamily: 'Syne, sans-serif',
                fontWeight: 800,
                fontSize: '2rem',
                letterSpacing: '-0.045em',
                color: '#fff',
                lineHeight: 1,
              }}>
                Virtual<span style={{ color: '#2563eb' }}>Mall</span>
              </div>
            </motion.div>

            {/* Loading bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.3 }}
              style={{ width: 200 }}
            >
              {/* Track */}
              <div style={{
                width: '100%',
                height: 3,
                borderRadius: 99,
                background: 'rgba(255,255,255,0.08)',
                overflow: 'hidden',
              }}>
                {/* Fill */}
                <motion.div
                  style={{
                    height: '100%',
                    borderRadius: 99,
                    background: 'linear-gradient(90deg, #1d4ed8, #0ea5e9)',
                    width: `${progress}%`,
                    boxShadow: '0 0 8px rgba(14,165,233,0.7)',
                  }}
                />
              </div>
              {/* Percent label */}
              <div style={{
                marginTop: '0.6rem',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontSize: '0.68rem',
                letterSpacing: '0.12em',
                color: 'rgba(255,255,255,0.28)',
                textAlign: 'center',
                textTransform: 'uppercase',
              }}>
                Loading{progress < 100 ? '…' : ' ✓'}
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
