import React, { useEffect, useRef, useState } from 'react';

// Rich, multi-tonal autumn leaf palettes (Dried & Fresh Autumn Foliage)
const LEAF_PALETTES = [
  {
    name: 'Fiery Crimson',
    tip: '#ff3b30',
    mid: '#c71f25',
    base: '#610c11',
    vein: '#3d0508',
    stem: '#4a1518',
  },
  {
    name: 'Deep Burgundy',
    tip: '#cf2b56',
    mid: '#8c1134',
    base: '#450415',
    vein: '#29010a',
    stem: '#3b101b',
  },
  {
    name: 'Burnt Orange',
    tip: '#ff7a18',
    mid: '#d94b0a',
    base: '#6b2003',
    vein: '#451201',
    stem: '#57280f',
  },
  {
    name: 'Golden Ochre',
    tip: '#ffc107',
    mid: '#e08a00',
    base: '#734302',
    vein: '#4a2b01',
    stem: '#5e3e14',
  },
  {
    name: 'Warm Copper',
    tip: '#e07a5f',
    mid: '#b85433',
    base: '#572010',
    vein: '#3b1206',
    stem: '#4d2618',
  },
  {
    name: 'Amber Bronze',
    tip: '#e59500',
    mid: '#b06500',
    base: '#573000',
    vein: '#381f00',
    stem: '#4f3614',
  },
  {
    name: 'Dried Sienna',
    tip: '#ba6a44',
    mid: '#874220',
    base: '#451e0c',
    vein: '#2e1206',
    stem: '#3d2013',
  },
  {
    name: 'Scarlet Gold',
    tip: '#ff5400',
    mid: '#d00000',
    base: '#590004',
    vein: '#3b0002',
    stem: '#471416',
  }
];

// Draw authentic 5-lobe Canadian / Sugar Maple Leaf geometry
const drawMapleLeafPath = (ctx, s) => {
  ctx.beginPath();
  // Start at insertion point (0, 0)
  ctx.moveTo(0, 0);

  // ── RIGHT HALF ──
  // Base notch & basal right lobe
  ctx.lineTo(s * 0.12, s * 0.08);
  ctx.bezierCurveTo(s * 0.28, s * 0.24, s * 0.44, s * 0.28, s * 0.52, s * 0.22);
  ctx.lineTo(s * 0.42, s * 0.12); // notch
  ctx.lineTo(s * 0.68, s * 0.15); // main basal tip
  ctx.bezierCurveTo(s * 0.54, s * 0.02, s * 0.44, -s * 0.05, s * 0.36, -s * 0.08);

  // Valley between basal and lateral lobe
  ctx.lineTo(s * 0.30, -s * 0.10);

  // Lateral middle-right lobe
  ctx.lineTo(s * 0.58, -s * 0.15); // lower sub-tooth
  ctx.lineTo(s * 0.50, -s * 0.24); // notch
  ctx.lineTo(s * 0.95, -s * 0.36); // main lateral apex
  ctx.lineTo(s * 0.72, -s * 0.44); // notch
  ctx.lineTo(s * 0.78, -s * 0.55); // upper sub-tooth
  ctx.bezierCurveTo(s * 0.58, -s * 0.53, s * 0.42, -s * 0.48, s * 0.32, -s * 0.46);

  // Deep sinus between lateral & central lobe
  ctx.lineTo(s * 0.20, -s * 0.46);

  // Central top lobe (Right side)
  ctx.lineTo(s * 0.38, -s * 0.66); // lower tooth
  ctx.lineTo(s * 0.28, -s * 0.74); // notch
  ctx.lineTo(s * 0.32, -s * 0.88); // upper tooth
  ctx.lineTo(s * 0.16, -s * 0.90); // notch
  ctx.lineTo(0, -s * 1.08);        // MAIN APEX TIP

  // ── LEFT HALF (Symmetrical reflection) ──
  // Central top lobe (Left side)
  ctx.lineTo(-s * 0.16, -s * 0.90); // notch
  ctx.lineTo(-s * 0.32, -s * 0.88); // upper tooth
  ctx.lineTo(-s * 0.28, -s * 0.74); // notch
  ctx.lineTo(-s * 0.38, -s * 0.66); // lower tooth
  ctx.lineTo(-s * 0.20, -s * 0.46); // deep sinus

  // Lateral middle-left lobe
  ctx.bezierCurveTo(-s * 0.42, -s * 0.48, -s * 0.58, -s * 0.53, -s * 0.32, -s * 0.46);
  ctx.lineTo(-s * 0.78, -s * 0.55); // upper sub-tooth
  ctx.lineTo(-s * 0.72, -s * 0.44); // notch
  ctx.lineTo(-s * 0.95, -s * 0.36); // main lateral apex
  ctx.lineTo(-s * 0.50, -s * 0.24); // notch
  ctx.lineTo(-s * 0.58, -s * 0.15); // lower sub-tooth

  // Valley
  ctx.lineTo(-s * 0.30, -s * 0.10);

  // Basal left lobe
  ctx.bezierCurveTo(-s * 0.44, -s * 0.05, -s * 0.54, s * 0.02, -s * 0.36, -s * 0.08);
  ctx.lineTo(-s * 0.68, s * 0.15); // main basal tip
  ctx.lineTo(-s * 0.42, s * 0.12); // notch
  ctx.bezierCurveTo(-s * 0.44, s * 0.28, -s * 0.28, s * 0.24, -s * 0.52, s * 0.22);
  ctx.lineTo(-s * 0.12, s * 0.08);

  ctx.closePath();
};

// Draw realistic palmate venation network
const drawMapleVeins = (ctx, s, veinColor) => {
  ctx.save();
  ctx.strokeStyle = veinColor;
  ctx.globalAlpha = 0.65;
  ctx.lineCap = 'round';

  const mainWidth = Math.max(0.7, s * 0.038);
  const subWidth = Math.max(0.4, s * 0.02);

  // 1. Central main vein
  ctx.lineWidth = mainWidth;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -s * 1.02);
  ctx.stroke();

  // Central side ribs
  ctx.lineWidth = subWidth;
  ctx.beginPath();
  // Lower pair
  ctx.moveTo(0, -s * 0.35); ctx.lineTo(s * 0.28, -s * 0.60);
  ctx.moveTo(0, -s * 0.35); ctx.lineTo(-s * 0.28, -s * 0.60);
  // Mid pair
  ctx.moveTo(0, -s * 0.55); ctx.lineTo(s * 0.26, -s * 0.82);
  ctx.moveTo(0, -s * 0.55); ctx.lineTo(-s * 0.26, -s * 0.82);
  // Upper pair
  ctx.moveTo(0, -s * 0.75); ctx.lineTo(s * 0.12, -s * 0.94);
  ctx.moveTo(0, -s * 0.75); ctx.lineTo(-s * 0.12, -s * 0.94);
  ctx.stroke();

  // 2. Lateral Right Vein
  ctx.lineWidth = mainWidth * 0.9;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(s * 0.90, -s * 0.34);
  ctx.stroke();

  ctx.lineWidth = subWidth;
  ctx.beginPath();
  ctx.moveTo(s * 0.35, -s * 0.13); ctx.lineTo(s * 0.54, -s * 0.15);
  ctx.moveTo(s * 0.52, -s * 0.20); ctx.lineTo(s * 0.72, -s * 0.50);
  ctx.stroke();

  // 3. Lateral Left Vein
  ctx.lineWidth = mainWidth * 0.9;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-s * 0.90, -s * 0.34);
  ctx.stroke();

  ctx.lineWidth = subWidth;
  ctx.beginPath();
  ctx.moveTo(-s * 0.35, -s * 0.13); ctx.lineTo(-s * 0.54, -s * 0.15);
  ctx.moveTo(-s * 0.52, -s * 0.20); ctx.lineTo(-s * 0.72, -s * 0.50);
  ctx.stroke();

  // 4. Basal Right Vein
  ctx.lineWidth = mainWidth * 0.75;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(s * 0.64, s * 0.14);
  ctx.stroke();

  // 5. Basal Left Vein
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-s * 0.64, s * 0.14);
  ctx.stroke();

  ctx.restore();
};

// Draw organic woody petiole (stem)
const drawStem = (ctx, s, stemColor, curvature) => {
  ctx.save();
  ctx.strokeStyle = stemColor;
  ctx.lineWidth = Math.max(1.0, s * 0.05);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(s * curvature * 0.3, s * 0.35, s * curvature * 0.6, s * 0.65);
  ctx.stroke();
  ctx.restore();
};

// Leaf Particle Factory (Fixed size per leaf — no pulsing or resizing)
const makeLeaf = (W, H, fromTop = false) => {
  const depth = Math.random() * 0.8 + 0.3; // 0.3 (far) to 1.1 (foreground)
  const baseSize = Math.random() * 14 + 18; // 18-32px
  const size = Math.round(baseSize * depth);

  const palette = LEAF_PALETTES[Math.floor(Math.random() * LEAF_PALETTES.length)];
  const stemCurvature = (Math.random() - 0.5) * 0.5;

  return {
    x: Math.random() * (W + 120) - 60,
    y: fromTop ? -size * 3 - Math.random() * H * 0.5 : Math.random() * H,
    depth,
    size,
    palette,
    stemCurvature,

    // Constant fall speed
    vy: (Math.random() * 0.7 + 0.6) * depth,

    // Smooth continuous 2D planar rotation (no scale/3D flip distortion)
    rot: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.018,

    // Gentle horizontal sway
    swayAmp: (Math.random() * 1.8 + 1.0) * depth,
    swayFreq: Math.random() * 0.016 + 0.008,
    swayPhase: Math.random() * Math.PI * 2,

    // Constant opacity per leaf
    alpha: Math.min(0.95, (0.55 + depth * 0.4)),
  };
};

// Ambient floating ember spore factory
const makeEmber = (W, H) => ({
  x: Math.random() * W,
  y: Math.random() * H,
  size: Math.random() * 2.2 + 0.8,
  vx: (Math.random() - 0.5) * 0.3,
  vy: Math.random() * 0.3 + 0.15,
  alpha: Math.random() * 0.5 + 0.25,
  pulse: Math.random() * Math.PI * 2,
  pulseSpeed: Math.random() * 0.03 + 0.015,
  color: Math.random() < 0.5 ? '#ff9e00' : '#ff5400',
});

const MapleBackground = () => {
  const canvasRef = useRef(null);
  const [isMapleTheme, setIsMapleTheme] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      const t = document.documentElement.getAttribute('data-theme') || 'neon';
      setIsMapleTheme(t === 'maple');
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
    if (!isMapleTheme) return;

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

    // Dynamic pool size
    const LEAF_COUNT = Math.min(55, Math.max(28, Math.floor((W * H) / 28000)));
    const leaves = Array.from({ length: LEAF_COUNT }, () => makeLeaf(W, H, false));

    const EMBER_COUNT = Math.min(30, Math.max(15, Math.floor((W * H) / 45000)));
    const embers = Array.from({ length: EMBER_COUNT }, () => makeEmber(W, H));

    let windTime = 0;

    // ── Main Render Loop ──────────────────────────────────────────────────
    const render = () => {
      frame++;
      windTime += 0.005;

      // Gentle breeze drift
      const windGust = Math.sin(windTime) * 0.6 + Math.cos(windTime * 0.4) * 0.3;

      // Transparent clear so background image shows with falling leaves overlay
      ctx.clearRect(0, 0, W, H);

      // Subtle atmospheric dark vignette for contrast
      const radialGlow = ctx.createRadialGradient(W * 0.5, H * 0.35, W * 0.1, W * 0.5, H * 0.35, W * 0.85);
      radialGlow.addColorStop(0, 'rgba(30, 10, 4, 0.15)');
      radialGlow.addColorStop(0.6, 'rgba(15, 5, 2, 0.28)');
      radialGlow.addColorStop(1, 'rgba(10, 3, 1, 0.45)');
      ctx.fillStyle = radialGlow;
      ctx.fillRect(0, 0, W, H);

      // ── 1. Ambient Golden Embers ─────────────────────────────────────────
      for (let e = 0; e < embers.length; e++) {
        const emb = embers[e];
        emb.y += emb.vy;
        emb.x += emb.vx + windGust * 0.25;
        emb.pulse += emb.pulseSpeed;

        if (emb.y > H + 10) {
          emb.y = -10;
          emb.x = Math.random() * W;
        }

        const glowAlpha = Math.max(0.1, emb.alpha * (0.6 + Math.sin(emb.pulse) * 0.4));
        ctx.save();
        ctx.beginPath();
        ctx.arc(emb.x, emb.y, emb.size, 0, Math.PI * 2);
        ctx.fillStyle = emb.color;
        ctx.globalAlpha = glowAlpha;
        ctx.shadowColor = emb.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.restore();
      }

      // ── 2. Sort leaves by depth for proper occlusion ────────────────────
      leaves.sort((a, b) => a.depth - b.depth);

      // ── 3. Render Falling Leaves (Constant Size, Smooth Rotation) ────────
      for (let i = 0; i < leaves.length; i++) {
        const lf = leaves[i];

        // Smooth rotation without any size or scale alteration
        lf.rot += lf.rotSpeed;

        // Translation & sway
        const sway = Math.sin(frame * lf.swayFreq + lf.swayPhase) * lf.swayAmp;
        lf.x += sway + windGust * (lf.depth * 0.9);
        lf.y += lf.vy;

        // Wrap around boundaries
        if (lf.y > H + lf.size * 3) {
          leaves[i] = makeLeaf(W, H, true);
          continue;
        }
        if (lf.x < -lf.size * 3) lf.x = W + lf.size * 2;
        if (lf.x > W + lf.size * 3) lf.x = -lf.size * 2;

        // Render leaf with 100% constant scale
        ctx.save();
        ctx.translate(lf.x, lf.y);
        ctx.rotate(lf.rot + (sway * 0.05));
        ctx.globalAlpha = lf.alpha;

        const s = lf.size;
        const pal = lf.palette;

        // Subtle drop shadow for foreground leaves
        if (lf.depth > 0.75) {
          ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
          ctx.shadowBlur = 8 * lf.depth;
          ctx.shadowOffsetX = 2 * lf.depth;
          ctx.shadowOffsetY = 4 * lf.depth;
        }

        // Draw Petiole (Stem)
        drawStem(ctx, s, pal.stem, lf.stemCurvature);

        // Radiant Autumn Gradient Fill
        const leafGrad = ctx.createRadialGradient(0, 0, s * 0.05, 0, -s * 0.5, s * 1.15);
        leafGrad.addColorStop(0, pal.base);
        leafGrad.addColorStop(0.45, pal.mid);
        leafGrad.addColorStop(1, pal.tip);

        // Fill Maple Blade
        drawMapleLeafPath(ctx, s);
        ctx.fillStyle = leafGrad;
        ctx.fill();

        ctx.shadowColor = 'transparent';

        // Soft perimeter stroke
        ctx.strokeStyle = pal.base;
        ctx.lineWidth = Math.max(0.4, s * 0.02);
        ctx.globalAlpha = lf.alpha * 0.55;
        ctx.stroke();

        // Palmate Veins Network
        drawMapleVeins(ctx, s, pal.vein);

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
  }, [isMapleTheme]);

  if (!isMapleTheme) return null;

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

export default MapleBackground;
