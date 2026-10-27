import { useRef, useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyFieldProps {
  value: string;
  label?: string;
  masked?: boolean;
  className?: string;
  onCopy?: () => void;
}

/**
 * A read-only input that the user can click to select, with a copy button.
 * Works inside sandboxed iframes where navigator.clipboard is blocked.
 */
export default function CopyField({ value, label, masked, className = '', onCopy }: CopyFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const el = inputRef.current;
    if (!el) return;
    el.type = 'text'; // ensure selectable even if masked
    el.select();
    el.setSelectionRange(0, el.value.length);
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    if (masked) el.type = 'password';
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onCopy?.();
    }
  };

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--ink-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.18)', borderRadius: 8, padding: '6px 8px', border: '1px solid rgba(255,255,255,0.08)' }}>
        <input
          ref={inputRef}
          readOnly
          type={masked ? 'password' : 'text'}
          value={value}
          onClick={handleCopy}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--ink-primary)',
            fontFamily: 'monospace',
            fontSize: '0.72rem',
            cursor: 'pointer',
            minWidth: 0,
          }}
        />
        <button
          onClick={handleCopy}
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            padding: '3px 8px',
            borderRadius: 6,
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.68rem',
            fontWeight: 600,
            background: copied ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.1)',
            color: copied ? '#22c55e' : 'var(--ink-secondary)',
            transition: 'all 0.15s',
          }}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
