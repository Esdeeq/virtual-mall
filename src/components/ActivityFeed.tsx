/**
 * ActivityFeed — a live ticker in the bottom-left corner showing simulated
 * "someone just bought X" events, making the store feel busy and social.
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { STORES } from '../data/marketplace';

interface FeedEvent {
  id: number;
  emoji: string;
  name: string;
  item: string;
  store: string;
  color: string;
  location: string;
}

const LOCATIONS = [
  'Lagos', 'London', 'New York', 'Tokyo', 'Dubai', 'Paris', 'Sydney',
  'Toronto', 'Berlin', 'Singapore', 'Cape Town', 'São Paulo',
];

const NAMES = [
  'Alex M.', 'Zara K.', 'James O.', 'Mei L.', 'Carlos R.', 'Aisha B.',
  'Tom W.', 'Priya S.', 'Felix N.', 'Nadia H.', 'Leo D.', 'Yuki T.',
];

function generateEvent(id: number): FeedEvent {
  const store = STORES[Math.floor(Math.random() * STORES.length)];
  const product = store.products[Math.floor(Math.random() * store.products.length)];
  return {
    id,
    emoji: ['🛒','💳','✨','🎉','💸'][Math.floor(Math.random() * 5)],
    name: NAMES[Math.floor(Math.random() * NAMES.length)],
    item: product.name,
    store: store.name,
    color: store.color,
    location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
  };
}

export function ActivityFeed() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    // Seed with one event after a short delay
    const seed = setTimeout(() => {
      setEvents([generateEvent(0)]);
      setCounter(1);
    }, 3000);
    return () => clearTimeout(seed);
  }, []);

  useEffect(() => {
    if (counter === 0) return;
    const interval = setInterval(() => {
      setCounter(c => {
        const id = c + 1;
        setEvents(prev => {
          const next = [generateEvent(id), ...prev].slice(0, 3);
          return next;
        });
        return id;
      });
    }, 5500);
    return () => clearInterval(interval);
  }, [counter]);

  if (events.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 left-4 z-40 flex flex-col gap-2 pointer-events-none"
      style={{ maxWidth: '280px' }}
    >
      <AnimatePresence mode="popLayout">
        {events.map(ev => (
          <motion.div
            key={ev.id}
            layout
            initial={{ opacity: 0, x: -40, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl"
            style={{
              background: 'var(--surface-strong)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--card-shadow)',
              backdropFilter: 'blur(16px)',
            }}
          >
            {/* Store color dot */}
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs"
              style={{ background: ev.color + '22', border: `1.5px solid ${ev.color}55` }}
            >
              <span>{ev.emoji}</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: 'var(--ink)', lineHeight: 1.3 }}>
                <span style={{ color: ev.color }}>{ev.name}</span>{' '}
                bought <span style={{ color: 'var(--ink)' }}>{ev.item}</span>
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--subtle)', lineHeight: 1.3 }}>
                {ev.store} · {ev.location}
              </p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
