import React, { useEffect, useRef, useState } from 'react';

// Ice crystal palettes with cold crystalline tones & frost glints
const CRYSTAL_PALETTES = [
  { main: '#ffffff', glow: '#a5f3fc', core: '#e0f7ff' }, // Diamond White
  { main: '#dbeafe', glow: '#60a5fa', core: '#eff6ff' }, // Polar Blue
  { main: '#cffafe', glow: '#22d3ee', core: '#ecfeff' }, // Glacial Cyan
  { main: '#e0e7ff', glow: '#818cf8', core: '#f5f3ff' }, // Frost Violet
  { main: '#f0fdf4', glow: '#4ade80', core: '#f0fdfa' }, // Aurora Frost
];

// Draw 6-arm Stellar Dendrite Ice Crystal (intricate, hardware-friendly vector paths)
const drawStellarDendrite = (ctx, r) => {
  const arms = 6;
  const angleStep = (Math.PI * 2) / arms;

  ctx.beginPath();
  for (let i = 0; i < arms; i++) {
    const angle = i * angleStep;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // Main radial spine
    ctx.moveTo(0, 0);
    ctx.lineTo(cos * r, sin * r);

    // Primary outer chevrons (barbs)
    const barb1Dist = r * 0.65;
    const barb1Len = r * 0.32;
    const bx1 = cos * barb1Dist;
    const by1 = sin * barb1Dist;
    const barbAngleL = angle + Math.PI / 3;
    const barbAngleR = angle - Math.PI / 3;
    ctx.moveTo(bx1, by1);
    ctx.lineTo(bx1 + Math.cos(barbAngleL) * barb1Len, by1 + Math.sin(barbAngleL) * barb1Len);
    ctx.moveTo(bx1, by1);
    ctx.lineTo(bx1 + Math.cos(barbAngleR) * barb1Len, by1 + Math.sin(barbAngleR) * barb1Len);

    // Secondary inner chevrons
    const barb2Dist = r * 0.40;
    const barb2Len = r * 0.22;
    const bx2 = cos * barb2Dist;
    const by2 = sin * barb2Dist;
    ctx.moveTo(bx2, by2);
    ctx.lineTo(bx2 + Math.cos(barbAngleL) * barb2Len, by2 + Math.sin(barbAngleL) * barb2Len);
    ctx.moveTo(bx2, by2);
    ctx.lineTo(bx2 + Math.cos(barbAngleR) * barb2Len, by2 + Math.sin(barbAngleR) * barb2Len);

    // Arrowhead tip
    const tipDist = r * 0.88;
    const tipLen = r * 0.15;
    const tx = cos * tipDist;
    const ty = sin * tipDist;
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx + Math.cos(barbAngleL) * tipLen, ty + Math.sin(barbAngleL) * tipLen);
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx + Math.cos(barbAngleR) * tipLen, ty + Math.sin(barbAngleR) * tipLen);
  }
  ctx.stroke();

  // Central hex core facet
  ctx.beginPath();
  for (let i = 0; i < arms; i++) {
    const angle = i * angleStep;
    const hx = Math.cos(angle) * (r * 0.22);
    const hy = Math.sin(angle) * (r * 0.22);
    if (i === 0) ctx.moveTo(hx, hy);
    else ctx.lineTo(hx, hy);
  }
  ctx.closePath();
  ctx.stroke();
};

// Factory: Create falling snowflake / ice crystal
const makeSnowflake = (W, H, fromTop = false) => {
  const depth = Math.random() * 0.85 + 0.25; // 0.25 (distant) to 1.1 (foreground)
  const isDetailed = depth > 0.45;
  const type = isDetailed ? 0 : 2; // 0: Dendrite Crystal, 2: Soft Snow Orb
  const baseSize = type === 2 ? Math.random() * 3.0 + 1.5 : Math.random() * 9 + 9;
  const size = Math.round(baseSize * depth);

  const palette = CRYSTAL_PALETTES[Math.floor(Math.random() * CRYSTAL_PALETTES.length)];

  return {
    x: Math.random() * (W + 100) - 50,
    y: fromTop ? -size * 3 - Math.random() * H * 0.4 : Math.random() * H,
    depth,
    size,
    type,
    palette,

    // Vertical fall speed
    vy: (Math.random() * 0.7 + 0.5) * depth,

    // Smooth continuous rotation
    rot: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.015,

    // Wind drift & sway
    swayAmp: (Math.random() * 1.5 + 0.8) * depth,
    swayFreq: Math.random() * 0.015 + 0.008,
    swayPhase: Math.random() * Math.PI * 2,

    // Crystalline shimmer / twinkle
    twinklePhase: Math.random() * Math.PI * 2,
    twinkleSpeed: Math.random() * 0.04 + 0.02,

    // Alpha scaled by depth for realistic atmospheric perspective
    alpha: Math.min(0.92, 0.4 + depth * 0.5),
  };
};

const SnowBackground = () => {
  const canvasRef = useRef(null);
  const [isSnowTheme, setIsSnowTheme] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      const t = document.documentElement.getAttribute('data-theme') || 'neon';
      setIsSnowTheme(t === 'snow');
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
    if (!isSnowTheme) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = null;
    let W = window.innerWidth;
    let H = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let frame = 0;

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

    // Optimized particle pool for silky 60fps
    const FLAKE_COUNT = Math.min(65, Math.max(35, Math.floor((W * H) / 24000)));
    const flakes = Array.from({ length: FLAKE_COUNT }, () => makeSnowflake(W, H, false));

    let windTime = 0;

    // ── Main Render Loop ──────────────────────────────────────────────────
    const render = () => {
      frame++;
      windTime += 0.005;

      // Alpine breeze drift
      const windGust = Math.sin(windTime) * 0.6 + Math.cos(windTime * 0.35) * 0.3;

      // Clear transparently so mountain wallpaper shines through
      ctx.clearRect(0, 0, W, H);

      // Subtle atmospheric cold vignette for UI contrast
      const frostVignette = ctx.createRadialGradient(W * 0.5, H * 0.4, W * 0.15, W * 0.5, H * 0.4, W * 0.85);
      frostVignette.addColorStop(0, 'rgba(6, 16, 30, 0.12)');
      frostVignette.addColorStop(0.65, 'rgba(4, 12, 22, 0.28)');
      frostVignette.addColorStop(1, 'rgba(2, 6, 12, 0.55)');
      ctx.fillStyle = frostVignette;
      ctx.fillRect(0, 0, W, H);

      // Sort by depth for correct occlusion
      flakes.sort((a, b) => a.depth - b.depth);

      for (let i = 0; i < flakes.length; i++) {
        const fl = flakes[i];

        // Motion physics
        fl.rot += fl.rotSpeed;
        fl.twinklePhase += fl.twinkleSpeed;

        const sway = Math.sin(frame * fl.swayFreq + fl.swayPhase) * fl.swayAmp;
        fl.x += sway + windGust * (fl.depth * 1.0);
        fl.y += fl.vy;

        // Wrap boundaries
        if (fl.y > H + fl.size * 3) {
          flakes[i] = makeSnowflake(W, H, true);
          continue;
        }
        if (fl.x < -fl.size * 3) fl.x = W + fl.size * 2;
        if (fl.x > W + fl.size * 3) fl.x = -fl.size * 2;

        const shimmer = 0.85 + Math.sin(fl.twinklePhase) * 0.15;
        const currentAlpha = fl.alpha * shimmer;

        ctx.save();
        ctx.translate(fl.x, fl.y);
        ctx.rotate(fl.rot);
        ctx.globalAlpha = currentAlpha;

        const r = fl.size;
        const pal = fl.palette;

        if (fl.type === 2) {
          // Soft out-of-focus background snow orb (Hardware-accelerated radial blur)
          const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.6);
          grad.addColorStop(0, pal.main);
          grad.addColorStop(0.5, pal.glow);
          grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.beginPath();
          ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        } else {
          // Detailed Crystal (sharp, crisp in-focus)
          ctx.strokeStyle = pal.main;
          ctx.lineWidth = Math.max(0.7, r * 0.075);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          if (fl.depth > 0.7) {
            ctx.shadowColor = pal.glow;
            ctx.shadowBlur = 6 * fl.depth;
          }

          drawStellarDendrite(ctx, r);

          // Center glint core
          ctx.beginPath();
          ctx.arc(0, 0, Math.max(0.7, r * 0.11), 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        }

        ctx.restore();
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
  }, [isSnowTheme]);

  if (!isSnowTheme) return null;

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

export default SnowBackground;
