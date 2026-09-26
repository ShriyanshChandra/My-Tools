import React, { useEffect, useRef, useState } from 'react';

// Neon rain color palette
const RAIN_COLORS = [
  { r: 0,   g: 245, b: 212 }, // Neon Cyan #00f5d4
  { r: 255, g: 0,   b: 127 }, // Electric Pink #ff007f
  { r: 155, g: 93,  b: 229 }, // Cyber Purple #9b5de5
  { r: 215, g: 245, b: 255 }, // Rain Silver-White #d7f5ff
];

// Factory: Create cyber rain drop falling strictly vertically
const makeRainDrop = (W, H, fromTop = false) => {
  const depth = Math.random() * 0.75 + 0.35;
  const color = RAIN_COLORS[Math.floor(Math.random() * RAIN_COLORS.length)];
  const len = (Math.random() * 28 + 20) * depth;

  return {
    x: Math.random() * W,
    y: fromTop ? -len - Math.random() * 100 : Math.random() * H,
    depth,
    len,
    color,
    vx: 0, // Falls perfectly straight
    vy: (Math.random() * 10 + 22) * depth,
    alpha: (Math.random() * 0.4 + 0.4) * depth,
  };
};

// Factory: Create subtle ground splash ripple
const makeSplash = (x, y, color, depth) => ({
  x,
  y,
  color,
  depth,
  radius: 1,
  maxRadius: Math.random() * 8 + 6,
  growth: Math.random() * 0.6 + 0.4,
  alpha: 0.5 * depth,
  decay: 0.04,
});

const TokyoBackground = () => {
  const canvasRef = useRef(null);
  const [isTokyoTheme, setIsTokyoTheme] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      const t = document.documentElement.getAttribute('data-theme');
      setIsTokyoTheme(t === 'tokyo');
    };
    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    window.addEventListener('storage', checkTheme);

    return () => {
      observer.disconnect();
      window.removeEventListener('storage', checkTheme);
    };
  }, []);

  useEffect(() => {
    if (!isTokyoTheme) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = null;
    let W = window.innerWidth;
    let H = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    // Pool of straight vertical rain drops
    const rainCount = Math.min(130, Math.max(65, Math.floor((W * H) / 14000)));
    const rainDrops = Array.from({ length: rainCount }, () => makeRainDrop(W, H, false));
    const splashes = [];

    const render = () => {
      ctx.clearRect(0, 0, W, H);

      // 1. Draw Straight Cyber Rain Streaks
      for (let i = 0; i < rainDrops.length; i++) {
        const r = rainDrops[i];
        r.y += r.vy;

        if (r.y > H + r.len) {
          // Trigger occasional ground splash when hitting bottom
          if (Math.random() < 0.35 && splashes.length < 30) {
            splashes.push(makeSplash(r.x, H - Math.random() * 20, r.color, r.depth));
          }
          rainDrops[i] = makeRainDrop(W, H, true);
          continue;
        }

        const c = r.color;
        const grad = ctx.createLinearGradient(r.x, r.y, r.x, r.y - r.len);
        grad.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, ${r.alpha})`);
        grad.addColorStop(0.3, `rgba(${c.r}, ${c.g}, ${c.b}, ${r.alpha * 0.65})`);
        grad.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`);

        ctx.beginPath();
        ctx.moveTo(r.x, r.y);
        ctx.lineTo(r.x, r.y - r.len);
        ctx.strokeStyle = grad;
        ctx.lineWidth = Math.max(0.7, r.depth * 1.5);
        ctx.stroke();

        // Bright droplet head
        if (r.depth > 0.6) {
          ctx.beginPath();
          ctx.arc(r.x, r.y, Math.max(0.6, r.depth * 0.9), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${r.alpha * 0.9})`;
          ctx.fill();
        }
      }

      // 2. Draw ground splashes
      for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i];
        s.radius += s.growth;
        s.alpha -= s.decay;

        if (s.alpha <= 0 || s.radius >= s.maxRadius) {
          splashes.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.ellipse(s.x, s.y, s.radius * 1.6, s.radius * 0.6, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${s.alpha})`;
        ctx.lineWidth = Math.max(0.6, s.depth * 1.1);
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        if (animId) cancelAnimationFrame(animId);
      } else {
        animId = requestAnimationFrame(render);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    animId = requestAnimationFrame(render);

    return () => {
      if (animId) cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isTokyoTheme]);

  if (!isTokyoTheme) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
        display: 'block',
      }}
    />
  );
};

export default TokyoBackground;

