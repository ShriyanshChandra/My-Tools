import React, { useEffect, useRef, useState } from 'react';

// Factory: Create industrial welding spark / forge ember
const makeSpark = (W, H, fromBottom = false) => {
  const depth = Math.random() * 0.75 + 0.35; // Depth factor
  const size = (Math.random() * 2.2 + 1.2) * depth;
  const isIncandescent = Math.random() < 0.25;

  return {
    x: Math.random() * W,
    y: fromBottom ? H + Math.random() * 60 : Math.random() * H,
    depth,
    size,
    isIncandescent,

    // Velocity: rises upward with natural heat draft
    vx: (Math.random() - 0.5) * 1.6 * depth,
    vy: -(Math.random() * 2.5 + 1.2) * depth,

    // Flicker phase
    flickerPhase: Math.random() * Math.PI * 2,
    flickerSpeed: Math.random() * 0.15 + 0.08,

    // Heat trail length
    trailLen: Math.random() * 8 + 6,

    // Alpha & life
    alpha: Math.random() * 0.5 + 0.5,
    decay: Math.random() * 0.006 + 0.003,
  };
};

// Factory: Create rising steam/smoke puff
const makeSmokePuff = (W, H, fromBottom = false) => {
  const radius = Math.random() * 35 + 20;
  return {
    x: Math.random() * W,
    y: fromBottom ? H + radius : Math.random() * H,
    radius,
    maxRadius: radius * (Math.random() * 0.8 + 1.6),
    growthRate: Math.random() * 0.08 + 0.04,
    vx: (Math.random() - 0.5) * 0.4,
    vy: -(Math.random() * 0.8 + 0.4),
    alpha: Math.random() * 0.08 + 0.04,
    decay: Math.random() * 0.0006 + 0.0003,
  };
};

const HeisenbergBackground = () => {
  const canvasRef = useRef(null);
  const [isHeisenbergTheme, setIsHeisenbergTheme] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      const t = document.documentElement.getAttribute('data-theme');
      setIsHeisenbergTheme(t === 'heisenberg');
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
    if (!isHeisenbergTheme) return;

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

    // Particles pool
    const sparkCount = Math.min(65, Math.max(30, Math.floor((W * H) / 28000)));
    const sparks = Array.from({ length: sparkCount }, () => makeSpark(W, H, false));

    const smokeCount = Math.min(16, Math.max(8, Math.floor((W * H) / 95000)));
    const smokePuffs = Array.from({ length: smokeCount }, () => makeSmokePuff(W, H, false));

    const render = () => {
      ctx.clearRect(0, 0, W, H);

      // 1. Draw rising smoke puffs
      for (let i = 0; i < smokePuffs.length; i++) {
        const puff = smokePuffs[i];
        puff.x += puff.vx;
        puff.y += puff.vy;
        puff.radius = Math.min(puff.maxRadius, puff.radius + puff.growthRate);
        puff.alpha -= puff.decay;

        if (puff.alpha <= 0 || puff.y < -puff.radius * 2) {
          smokePuffs[i] = makeSmokePuff(W, H, true);
          continue;
        }

        const grad = ctx.createRadialGradient(puff.x, puff.y, 0, puff.x, puff.y, puff.radius);
        grad.addColorStop(0, `rgba(255, 140, 40, ${puff.alpha * 0.4})`);
        grad.addColorStop(0.4, `rgba(80, 50, 30, ${puff.alpha * 0.25})`);
        grad.addColorStop(1, 'rgba(20, 15, 10, 0)');

        ctx.beginPath();
        ctx.arc(puff.x, puff.y, puff.radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // 2. Draw rising welding sparks
      for (let i = 0; i < sparks.length; i++) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.flickerPhase += s.flickerSpeed;

        const flicker = 0.75 + Math.sin(s.flickerPhase) * 0.25;
        const currentAlpha = Math.max(0, s.alpha * flicker);

        if (s.y < -30 || s.x < -30 || s.x > W + 30) {
          sparks[i] = makeSpark(W, H, true);
          continue;
        }

        // Draw spark streak/trail
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * (s.trailLen * 0.4), s.y - s.vy * (s.trailLen * 0.4));
        ctx.strokeStyle = s.isIncandescent
          ? `rgba(255, 240, 200, ${currentAlpha * 0.7})`
          : `rgba(255, 120, 20, ${currentAlpha * 0.6})`;
        ctx.lineWidth = Math.max(0.6, s.size * 0.6);
        ctx.stroke();

        // Outer glow
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * 2.4, 0, Math.PI * 2);
        ctx.fillStyle = s.isIncandescent
          ? `rgba(255, 180, 50, ${currentAlpha * 0.35})`
          : `rgba(255, 90, 0, ${currentAlpha * 0.3})`;
        ctx.fill();

        // Hot incandescent core
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = s.isIncandescent
          ? `rgba(255, 255, 255, ${currentAlpha * 0.95})`
          : `rgba(255, 220, 140, ${currentAlpha * 0.9})`;
        ctx.fill();
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
  }, [isHeisenbergTheme]);

  if (!isHeisenbergTheme) return null;

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

export default HeisenbergBackground;
