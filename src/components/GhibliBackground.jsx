import React, { useEffect, useRef, useState } from 'react';

// Firefly color palette (warm gold, magical spirit jade, blossom glow)
const FIREFLY_COLORS = [
  { r: 255, g: 220, b: 100 }, // Warm Gold
  { r: 255, g: 240, b: 150 }, // Sunlight Amber
  { r: 120, g: 240, b: 180 }, // Spirit Jade
  { r: 160, g: 230, b: 255 }, // Dewdrop Cyan
  { r: 255, g: 190, b: 210 }, // Blossom Rose
];

// Factory: Create floating enchanted firefly
const makeFirefly = (W, H) => {
  const depth = Math.random() * 0.75 + 0.35;
  const color = FIREFLY_COLORS[Math.floor(Math.random() * FIREFLY_COLORS.length)];
  const baseRadius = (Math.random() * 2.4 + 1.8) * depth;

  return {
    x: Math.random() * W,
    y: Math.random() * H,
    depth,
    baseRadius,
    color,

    // Smooth organic wandering physics
    vx: (Math.random() - 0.5) * 0.8 * depth,
    vy: (Math.random() - 0.5) * 0.6 * depth,
    wanderAngle: Math.random() * Math.PI * 2,
    wanderSpeed: Math.random() * 0.03 + 0.015,

    // Bioluminescent sine breathing
    pulsePhase: Math.random() * Math.PI * 2,
    pulseSpeed: Math.random() * 0.04 + 0.02,
    minAlpha: Math.random() * 0.15 + 0.05,
    maxAlpha: Math.random() * 0.45 + 0.55,
  };
};

const GhibliBackground = () => {
  const canvasRef = useRef(null);
  const [isGhibliTheme, setIsGhibliTheme] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      const t = document.documentElement.getAttribute('data-theme');
      setIsGhibliTheme(t === 'ghibli');
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
    if (!isGhibliTheme) return;

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

    // Pool of gentle fireflies
    const fireflyCount = Math.min(48, Math.max(22, Math.floor((W * H) / 32000)));
    const fireflies = Array.from({ length: fireflyCount }, () => makeFirefly(W, H));

    const render = () => {
      ctx.clearRect(0, 0, W, H);

      for (let i = 0; i < fireflies.length; i++) {
        const f = fireflies[i];

        // Smooth continuous wandering
        f.wanderAngle += (Math.random() - 0.5) * 0.2;
        f.vx += Math.cos(f.wanderAngle) * 0.04 * f.depth;
        f.vy += Math.sin(f.wanderAngle) * 0.04 * f.depth;

        // Cap speed
        const speed = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
        const maxSpeed = 1.1 * f.depth;
        if (speed > maxSpeed) {
          f.vx = (f.vx / speed) * maxSpeed;
          f.vy = (f.vy / speed) * maxSpeed;
        }

        f.x += f.vx;
        f.y += f.vy;

        // Wrap around screen boundaries with margin
        const margin = 40;
        if (f.x < -margin) f.x = W + margin;
        if (f.x > W + margin) f.x = -margin;
        if (f.y < -margin) f.y = H + margin;
        if (f.y > H + margin) f.y = -margin;

        // Pulsing glow calculation
        f.pulsePhase += f.pulseSpeed;
        const pulse = (Math.sin(f.pulsePhase) + 1) * 0.5; // 0 to 1
        const alpha = f.minAlpha + (f.maxAlpha - f.minAlpha) * (pulse * pulse);
        const c = f.color;
        const r = f.baseRadius * (0.85 + pulse * 0.35);

        // 1. Soft wide bioluminescent aura
        const glowRad = r * 5.5;
        const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, glowRad);
        grad.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha * 0.45})`);
        grad.addColorStop(0.4, `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha * 0.18})`);
        grad.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`);

        ctx.beginPath();
        ctx.arc(f.x, f.y, glowRad, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // 2. Vibrant inner halo
        ctx.beginPath();
        ctx.arc(f.x, f.y, r * 2.0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha * 0.75})`;
        ctx.fill();

        // 3. Bright white luminous core
        ctx.beginPath();
        ctx.arc(f.x, f.y, r * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.95})`;
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
  }, [isGhibliTheme]);

  if (!isGhibliTheme) return null;

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

export default GhibliBackground;
