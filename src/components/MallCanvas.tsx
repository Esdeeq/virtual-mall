import { useEffect, useRef, useCallback } from 'react';

/* ─── types ─── */
interface Vec2 { x: number; y: number }

interface Shopper {
  x: number; y: number;
  speed: number; dir: 1 | -1;
  lane: number;
  size: number;
  color: string;
  bob: number; bobSpeed: number;
  bagSwing: number;
  pauseTimer: number; paused: boolean;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  color: string; size: number;
}

interface FloatingTag {
  x: number; y: number;
  label: string; price: string;
  alpha: number; vy: number;
  life: number;
}

/* ─── constants ─── */
const STORE_FRONTS = [
  { name: 'Tech Haven',        color: '#6366f1', accent: '#818cf8', icon: '⌨' },
  { name: 'Studio Style',      color: '#ec4899', accent: '#f472b6', icon: '👗' },
  { name: 'Verde Market',      color: '#10b981', accent: '#34d399', icon: '🌿' },
  { name: 'Page One',          color: '#f59e0b', accent: '#fbbf24', icon: '📚' },
  { name: 'Peak Performance',  color: '#ef4444', accent: '#f87171', icon: '🏃' },
  { name: 'Casa Luxe',         color: '#8b5cf6', accent: '#a78bfa', icon: '🏡' },
];

const SHOPPER_COLORS = ['#fbbf24','#60a5fa','#f472b6','#34d399','#fb923c','#a78bfa','#94a3b8'];

const PRODUCT_TAGS = [
  { label: 'UltraBook Pro', price: '$899' },
  { label: 'Silk Blouse', price: '$78' },
  { label: 'Matcha Latte', price: '$6' },
  { label: 'Design Book', price: '$42' },
  { label: 'Running Shoes', price: '$145' },
  { label: 'Ceramic Lamp', price: '$210' },
  { label: 'PixelBuds Pro', price: '$199' },
  { label: 'Linen Duvet', price: '$189' },
];

export function MallCanvas() {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const mouseRef    = useRef<Vec2>({ x: 0.5, y: 0.5 });
  const frameRef    = useRef<number>(0);
  const drawRef     = useRef<(() => void) | null>(null);
  const shopperRef  = useRef<Shopper[]>([]);
  const particleRef = useRef<Particle[]>([]);
  const tagRef      = useRef<FloatingTag[]>([]);
  const tagTimerRef = useRef<number>(0);
  const timeRef     = useRef<number>(0);

  /* ── init shoppers ── */
  const initShoppers = useCallback((w: number, h: number) => {
    const lanes = [0.62, 0.72, 0.80, 0.88]; // y-fractions for depth lanes
    shopperRef.current = Array.from({ length: 14 }, (_, i) => {
      const lane = i % lanes.length;
      const depthScale = 0.45 + lanes[lane] * 0.7;
      return {
        x: Math.random() * w,
        y: h * lanes[lane],
        speed: (0.4 + Math.random() * 0.7) * depthScale,
        dir: (Math.random() > 0.5 ? 1 : -1),
        lane,
        size: 6 * depthScale,
        color: SHOPPER_COLORS[i % SHOPPER_COLORS.length],
        bob: Math.random() * Math.PI * 2,
        bobSpeed: 0.08 + Math.random() * 0.04,
        bagSwing: 0,
        pauseTimer: 0,
        paused: false,
      };
    });
  }, []);

  /* ── main draw ── */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    timeRef.current += 0.016;
    const t = timeRef.current;

    /* ── parallax offset from mouse ── */
    const mx = (mouseRef.current.x - 0.5) * 2; // -1..1
    const my = (mouseRef.current.y - 0.5) * 2;

    /* ── clear ── */
    ctx.clearRect(0, 0, W, H);

    /* ── sky / ceiling gradient ── */
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.55);
    sky.addColorStop(0, 'rgba(10,14,26,0.96)');
    sky.addColorStop(0.5, 'rgba(18,22,42,0.88)');
    sky.addColorStop(1, 'rgba(28,32,58,0.72)');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    /* ── floor gradient ── */
    const floor = ctx.createLinearGradient(0, H * 0.55, 0, H);
    floor.addColorStop(0, 'rgba(22,26,48,0.92)');
    floor.addColorStop(1, 'rgba(8,10,20,0.98)');
    ctx.fillStyle = floor;
    ctx.fillRect(0, H * 0.55, W, H * 0.45);

    /* ── vanishing point (follows mouse gently) ── */
    const VP: Vec2 = {
      x: W * 0.5 + mx * W * 0.06,
      y: H * 0.40 + my * H * 0.04,
    };

    /* ── floor tiles (receding perspective grid) ── */
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = '#7c8db0';
    ctx.lineWidth = 0.5;
    const tileLines = 14;
    for (let i = 0; i <= tileLines; i++) {
      const fx = (i / tileLines) * W;
      ctx.beginPath();
      ctx.moveTo(VP.x, VP.y);
      ctx.lineTo(fx, H);
      ctx.stroke();
    }
    const hLines = 8;
    for (let j = 1; j <= hLines; j++) {
      const fy = VP.y + (H - VP.y) * (j / hLines);
      const leftX  = VP.x - (VP.x)       * (j / hLines);
      const rightX = VP.x + (W - VP.x)   * (j / hLines);
      ctx.beginPath();
      ctx.moveTo(leftX, fy);
      ctx.lineTo(rightX, fy);
      ctx.stroke();
    }
    ctx.restore();

    /* ── store fronts ── */
    const nStores = STORE_FRONTS.length;
    const storeW = W / nStores;

    STORE_FRONTS.forEach((store, i) => {
      const cx = storeW * i + storeW * 0.5 + mx * (i - nStores / 2) * 4;
      const pxOff = mx * (i - nStores / 2) * 2;

      /* perspective: stores recede toward VP */
      const storeTop = VP.y - 20 + my * 8;
      const storeBotLeft  = H * 0.56;
      const faceW = storeW * 0.82;
      const faceLeft = cx - faceW / 2 + pxOff;

      /* store facade fill */
      const facadeGrad = ctx.createLinearGradient(faceLeft, storeTop, faceLeft, storeBotLeft);
      facadeGrad.addColorStop(0, store.color + 'aa');
      facadeGrad.addColorStop(0.5, store.color + '44');
      facadeGrad.addColorStop(1, store.color + '22');
      ctx.save();
      ctx.globalAlpha = 0.82;
      ctx.fillStyle = facadeGrad;
      ctx.beginPath();
      // trapezoid — wider at bottom, narrower near VP
      const narrowFactor = 0.55;
      const narrowW = faceW * narrowFactor;
      const topL = VP.x + (faceLeft - VP.x) * 0.35 + pxOff * 0.1;
      const topR = topL + narrowW;
      ctx.moveTo(topL, storeTop);
      ctx.lineTo(topR, storeTop);
      ctx.lineTo(faceLeft + faceW, storeBotLeft);
      ctx.lineTo(faceLeft, storeBotLeft);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      /* store name sign */
      const signY = storeTop + (storeBotLeft - storeTop) * 0.22;
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = store.accent;
      ctx.font = `bold ${Math.max(9, faceW * 0.09)}px "Syne", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(store.name, cx + pxOff, signY);
      ctx.restore();

      /* store icon */
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.font = `${Math.max(14, faceW * 0.14)}px serif`;
      ctx.textAlign = 'center';
      ctx.fillText(store.icon, cx + pxOff, signY + faceW * 0.15);
      ctx.restore();

      /* display windows — two lit rectangles */
      const winY = storeTop + (storeBotLeft - storeTop) * 0.42;
      const winH = (storeBotLeft - storeTop) * 0.28;
      const winW = faceW * 0.22;
      [-0.28, 0.28].forEach(offset => {
        const wx = cx + pxOff + faceW * offset - winW / 2;
        /* window glow */
        const winGlow = ctx.createRadialGradient(wx + winW / 2, winY + winH / 2, 0, wx + winW / 2, winY + winH / 2, winW * 1.2);
        winGlow.addColorStop(0, store.accent + 'cc');
        winGlow.addColorStop(0.5, store.color + '55');
        winGlow.addColorStop(1, 'transparent');
        ctx.save();
        ctx.globalAlpha = 0.55 + 0.15 * Math.sin(t * 1.2 + i);
        ctx.fillStyle = winGlow;
        ctx.fillRect(wx - winW * 0.5, winY - winH * 0.3, winW * 2, winH * 1.6);
        ctx.restore();

        /* window frame */
        ctx.save();
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = store.accent + '66';
        ctx.strokeStyle = store.accent + 'cc';
        ctx.lineWidth = 1;
        ctx.fillRect(wx, winY, winW, winH);
        ctx.strokeRect(wx, winY, winW, winH);
        ctx.restore();
      });

      /* door */
      const doorW = faceW * 0.18;
      const doorH = (storeBotLeft - storeTop) * 0.32;
      const doorX = cx + pxOff - doorW / 2;
      const doorY = storeBotLeft - doorH;
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = store.color + '33';
      ctx.strokeStyle = store.accent + '99';
      ctx.lineWidth = 1;
      ctx.fillRect(doorX, doorY, doorW, doorH);
      ctx.strokeRect(doorX, doorY, doorW, doorH);
      /* door handle */
      ctx.beginPath();
      ctx.arc(doorX + doorW * 0.72, doorY + doorH * 0.5, 2, 0, Math.PI * 2);
      ctx.fillStyle = store.accent;
      ctx.globalAlpha = 0.9;
      ctx.fill();
      ctx.restore();
    });

    /* ── corridor ceiling lights ── */
    const lightCount = 5;
    for (let l = 0; l < lightCount; l++) {
      const lx = W * ((l + 0.5) / lightCount) + mx * (l - lightCount / 2) * 5;
      const ly = H * 0.10 + my * 6;
      /* beam cone */
      const beam = ctx.createRadialGradient(lx, ly, 0, lx, H * 0.62, W * 0.12);
      beam.addColorStop(0, 'rgba(255,245,220,0.22)');
      beam.addColorStop(0.4, 'rgba(255,235,180,0.07)');
      beam.addColorStop(1, 'transparent');
      ctx.save();
      ctx.globalAlpha = 0.7 + 0.12 * Math.sin(t * 0.9 + l);
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx - W * 0.09, H * 0.62);
      ctx.lineTo(lx + W * 0.09, H * 0.62);
      ctx.closePath();
      ctx.fill();
      /* bulb */
      ctx.beginPath();
      ctx.arc(lx, ly, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,250,230,0.95)';
      ctx.globalAlpha = 1;
      ctx.fill();
      ctx.restore();
    }

    /* ── shoppers ── */
    shopperRef.current.sort((a, b) => a.y - b.y); // depth sort
    shopperRef.current.forEach(s => {
      /* update */
      if (s.paused) {
        s.pauseTimer--;
        if (s.pauseTimer <= 0) s.paused = false;
      } else {
        s.x += s.speed * s.dir;
        s.bob += s.bobSpeed;
        s.bagSwing = Math.sin(s.bob * 0.7) * 6;
        if (Math.random() < 0.003) {
          s.paused = true;
          s.pauseTimer = 40 + Math.floor(Math.random() * 80);
          /* spawn floating tag */
          if (tagRef.current.length < 6) {
            const tag = PRODUCT_TAGS[Math.floor(Math.random() * PRODUCT_TAGS.length)];
            tagRef.current.push({ x: s.x, y: s.y - s.size * 3, label: tag.label, price: tag.price, alpha: 0, vy: -0.4, life: 120 });
          }
        }
        if (s.x < -40) { s.x = canvasRef.current!.width + 40; }
        if (s.x > (canvasRef.current?.width ?? W) + 40) { s.x = -40; }
      }

      /* depth-based parallax offset */
      const depthParallax = mx * (s.y - H * 0.5) * 0.04;

      /* draw shopper body */
      const bx = s.x + depthParallax;
      const by = s.y + Math.sin(s.bob) * (s.paused ? 0 : s.size * 0.25);
      const sz = s.size;

      ctx.save();
      /* shadow */
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.ellipse(bx, by + sz * 2.1, sz * 1.1, sz * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      /* body */
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.roundRect(bx - sz * 0.55, by - sz * 0.3, sz * 1.1, sz * 2, sz * 0.3);
      ctx.fill();

      /* head */
      ctx.beginPath();
      ctx.arc(bx, by - sz * 0.55, sz * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = '#f5cba7';
      ctx.fill();

      /* bag */
      if (!s.paused) {
        ctx.save();
        ctx.translate(bx + sz * 0.7, by + sz * 0.6);
        ctx.rotate((s.bagSwing * Math.PI) / 180);
        ctx.fillStyle = s.color + 'cc';
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 0.8;
        ctx.fillRect(-sz * 0.35, 0, sz * 0.7, sz * 0.75);
        ctx.strokeRect(-sz * 0.35, 0, sz * 0.7, sz * 0.75);
        /* handle */
        ctx.beginPath();
        ctx.arc(0, 0, sz * 0.28, Math.PI, 0);
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      } else {
        /* stopped — inspection bubble */
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        ctx.ellipse(bx, by - sz * 1.9, sz * 1.4, sz * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#fff';
        ctx.font = `${sz * 1.1}px serif`;
        ctx.textAlign = 'center';
        ctx.fillText('👀', bx, by - sz * 1.55);
      }
      ctx.restore();
    });

    /* ── floating product tags ── */
    tagRef.current = tagRef.current.filter(tag => tag.life > 0);
    tagRef.current.forEach(tag => {
      tag.y += tag.vy;
      tag.life--;
      tag.alpha = tag.life > 90 ? (120 - tag.life) / 30 : tag.life / 90;

      ctx.save();
      ctx.globalAlpha = tag.alpha * 0.92;
      /* pill bg */
      const tw = 120, th = 32, tr = 8;
      const tx = tag.x - tw / 2, ty = tag.y - th / 2;
      ctx.fillStyle = 'rgba(15,20,40,0.88)';
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(tx, ty, tw, th, tr);
      ctx.fill();
      ctx.stroke();
      /* text */
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(tag.label, tx + 8, ty + 13);
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 11px "Syne", sans-serif';
      ctx.fillText(tag.price, tx + 8, ty + 26);
      ctx.restore();
    });

    /* ── particle sparkles ── */
    if (Math.random() < 0.12) {
      const store = STORE_FRONTS[Math.floor(Math.random() * STORE_FRONTS.length)];
      particleRef.current.push({
        x: Math.random() * W,
        y: H * (0.3 + Math.random() * 0.3),
        vx: (Math.random() - 0.5) * 0.8,
        vy: -0.6 - Math.random() * 0.8,
        life: 60 + Math.floor(Math.random() * 40),
        maxLife: 100,
        color: store.accent,
        size: 1.5 + Math.random() * 2,
      });
    }
    particleRef.current = particleRef.current.filter(p => p.life > 0);
    particleRef.current.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.life--;
      ctx.save();
      ctx.globalAlpha = (p.life / p.maxLife) * 0.8;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    /* ── tag timer ── */
    tagTimerRef.current++;
  }, []);

  useEffect(() => {
    drawRef.current = draw;
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width  = rect.width;
      canvas.height = rect.height;
      initShoppers(canvas.width, canvas.height);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);

    const onMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top)  / rect.height,
      };
    };
    const onTouch = (e: TouchEvent) => {
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: (touch.clientX - rect.left) / rect.width,
        y: (touch.clientY - rect.top)  / rect.height,
      };
    };

    window.addEventListener('mousemove', onMouse);
    window.addEventListener('touchmove', onTouch, { passive: true });

    /* RAF loop via ref — avoids capturing draw during its own init */
    const loop = () => {
      drawRef.current?.();
      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frameRef.current);
      ro.disconnect();
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('touchmove', onTouch);
    };
  }, [initShoppers]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
      }}
    />
  );
}
