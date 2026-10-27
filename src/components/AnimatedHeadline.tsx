import { motion } from 'framer-motion';

const lines = [
  { text: 'One mall.',            muted: false },
  { text: 'Different stores.',      muted: true  },
  { text: 'One checkout.',        muted: false },
];

const charVariants = {
  hidden: { opacity: 0, y: 24, rotateX: -40 },
  show:   { opacity: 1, y: 0,  rotateX: 0,
    transition: { type: 'spring', stiffness: 260, damping: 24 } },
};

export function AnimatedHeadline() {
  return (
    <h1
      className="editorial"
      style={{
        color: 'var(--ink)',
        fontSize: 'clamp(3rem, 6.5vw, 5.75rem)',
        lineHeight: 0.95,
        marginBottom: '1.5rem',
        maxWidth: '820px',
        perspective: '600px',
      }}
    >
      {lines.map((line, li) => (
        <motion.div
          key={li}
          style={{
            display: 'block',
            color: line.muted ? 'var(--muted)' : 'var(--ink)',
            marginBottom: li < lines.length - 1 ? '0.12em' : 0,
            overflow: 'hidden',
          }}
          initial="hidden"
          animate="show"
          transition={{ staggerChildren: 0.028, delayChildren: li * 0.18 }}
        >
          {line.text.split('').map((char, ci) => (
            <motion.span
              key={ci}
              variants={charVariants}
              style={{ display: 'inline-block', whiteSpace: 'pre' }}
            >
              {char}
            </motion.span>
          ))}
        </motion.div>
      ))}
    </h1>
  );
}
