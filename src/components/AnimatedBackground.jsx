import React, { useEffect, useRef, useState } from 'react';
import './AnimatedBackground.css';

// Neon theme color palette
const PALETTE = [
  { r: 0,   g: 210, b: 255 },   // Cyan     #00d2ff
  { r: 255, g: 42,  b: 133 },   // Magenta  #ff2a85
  { r: 138, g: 43,  b: 226 },   // Violet   #8a2be2
  { r: 0,   g: 250, b: 154 },   // Mint     #00FA9A
  { r: 67,  g: 97,  b: 238 }    // Indigo   #4361ee
];

// Safe arc helper — never passes negative radius to ctx.arc
const safeArc = (ctx, x, y, r, s, e) => {
  const sr = Math.max(0, r);
  if (sr < 0.001) return;
  ctx.arc(x, y, sr, s, e);
};

// Rotate a 3D point around Y then X axes
const rotate3D = (x, y, z, ry, rx) => {
  const cosY = Math.cos(ry), sinY = Math.sin(ry);
  const x1 = x * cosY - z * sinY;
  const z1 = x * sinY + z * cosY;
  const cosX = Math.cos(rx), sinX = Math.sin(rx);
  const y2 = y * cosX - z1 * sinX;
  const z2 = y * sinX + z1 * cosX;
  return { x: x1, y: y2, z: z2 };
};

// Project 3D → 2D with perspective. Depth clamped to [0.05, 2].
const project = (x, y, z, fov, cx, cy) => {
  const rawDepth = fov / (fov + z);
  const depth = Math.max(0.05, Math.min(2, rawDepth));
  return { sx: cx + x * depth, sy: cy + y * depth, depth, visible: rawDepth > 0 };
};

// Factory: create a new node
const makeNode = (spread, state = 'spawning') => {
  const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
  return {
    id: Math.random(),
    ox: (Math.random() - 0.5) * spread * 2,
    oy: (Math.random() - 0.5) * spread * 2,
    oz: (Math.random() - 0.5) * spread * 2,
    dvx: (Math.random() - 0.5) * 0.18,
    dvy: (Math.random() - 0.5) * 0.18,
    dvz: (Math.random() - 0.5) * 0.18,
    dx: 0, dy: 0, dz: 0,
    color,
    targetColor: color,
    colorBlend: 1,
    radius: Math.random() * 2.8 + 2.0,
    pulsePhase: Math.random() * Math.PI * 2,
    pulseSpeed: Math.random() * 0.025 + 0.018,
    state,
    lifeAlpha: state === 'spawning' ? 0 : 1,
    aliveStart: null
  };
};

// Build all edges from scratch
const buildEdges = (nodes, maxDist, maxEdges) => {
  const edges = [];
  const edgeSet = new Set();
  for (let i = 0; i < nodes.length; i++) {
    const ni = nodes[i];
    const dists = [];
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      const nj = nodes[j];
      const dx = ni.ox - nj.ox, dy = ni.oy - nj.oy, dz = ni.oz - nj.oz;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d < maxDist) dists.push({ j, d });
    }
    dists.sort((a, b) => a.d - b.d);
    for (const { j } of dists.slice(0, maxEdges)) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push({ a: i, b: j, pulses: [] });
      }
    }
  }
  return { edges, edgeSet };
};

// Add edges for a newly appended node
const addEdgesForNode = (idx, nodes, edges, edgeSet, maxDist, maxEdges) => {
  const ni = nodes[idx];
  const dists = [];
  for (let j = 0; j < nodes.length; j++) {
    if (j === idx) continue;
    const nj = nodes[j];
    const dx = ni.ox - nj.ox, dy = ni.oy - nj.oy, dz = ni.oz - nj.oz;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d < maxDist) dists.push({ j, d });
  }
  dists.sort((a, b) => a.d - b.d);
  for (const { j } of dists.slice(0, maxEdges)) {
    const a = Math.min(idx, j), b = Math.max(idx, j);
    const key = `${a}-${b}`;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      edges.push({ a, b, pulses: [] });
    }
  }
};

const lerpColor = (c1, c2, t) => ({
  r: Math.round(c1.r + (c2.r - c1.r) * t),
  g: Math.round(c1.g + (c2.g - c1.g) * t),
  b: Math.round(c1.b + (c2.b - c1.b) * t)
});

// ─── RANDOMIZER EVENTS ────────────────────────────────────────────────────────

// Event 1 — SUPERNOVA: one node blasts outward ripples and recolors neighbours
const triggerSupernova = (nodes, edges, PALETTE, shockwaves) => {
  const aliveNodes = nodes.filter(n => n.state === 'alive');
  if (!aliveNodes.length) return;
  const target = aliveNodes[Math.floor(Math.random() * aliveNodes.length)];
  const boom = PALETTE[Math.floor(Math.random() * PALETTE.length)];
  target.color = boom;
  target.targetColor = boom;
  target.colorBlend = 1;
  // Enlarge temporarily
  target.radiusBurst = 1;
  // Infect neighbour colors
  for (const e of edges) {
    let neighbour = null;
    if (nodes[e.a] === target) neighbour = nodes[e.b];
    if (nodes[e.b] === target) neighbour = nodes[e.a];
    if (neighbour && neighbour.state === 'alive') {
      neighbour.targetColor = boom;
      neighbour.colorBlend = 0;
    }
  }
  // Push a shockwave record for canvas rendering
  shockwaves.push({
    nodeRef: target,
    radius: 0,
    maxRadius: 500,
    alpha: 1,
    color: boom
  });
};

// Event 2 — VORTEX: pull all nodes inward then launch outward
const triggerVortex = (nodes) => {
  for (const n of nodes) {
    if (n.state !== 'alive') continue;
    // Aim velocity toward or away from origin
    const dist = Math.sqrt(n.ox * n.ox + n.oy * n.oy + n.oz * n.oz);
    if (dist < 1) continue;
    const implode = Math.random() < 0.5;
    const factor = (implode ? -1 : 1) * (Math.random() * 1.2 + 0.6);
    n.dvx = (-n.ox / dist) * factor;
    n.dvy = (-n.oy / dist) * factor;
    n.dvz = (-n.oz / dist) * factor;
  }
};

// Event 3 — SPECTRUM SHIFT: transition entire network to a single new palette color
const triggerSpectrumShift = (nodes, PALETTE) => {
  const newColor = PALETTE[Math.floor(Math.random() * PALETTE.length)];
  for (const n of nodes) {
    if (n.state === 'alive') {
      n.targetColor = newColor;
      n.colorBlend = 0;
    }
  }
};

// Event 4 — REWIRE: rebuild edge connections to new neighbours
const triggerRewire = (nodes, MAX_EDGE_DIST, MAX_EDGES_PER_NODE) => {
  return buildEdges(nodes, MAX_EDGE_DIST, MAX_EDGES_PER_NODE);
};

// Event 5 — SPEED STORM: spike all drift velocities for chaotic scatter
const triggerSpeedStorm = (nodes) => {
  for (const n of nodes) {
    if (n.state !== 'alive') continue;
    n.dvx = (Math.random() - 0.5) * 1.8;
    n.dvy = (Math.random() - 0.5) * 1.8;
    n.dvz = (Math.random() - 0.5) * 1.8;
  }
};

// ─── COMPONENT ───────────────────────────────────────────────────────────────

const EVENTS = ['supernova', 'vortex', 'spectrum', 'rewire', 'storm'];

const AnimatedBackground = () => {
  const canvasRef = useRef(null);
  const [isDefaultTheme, setIsDefaultTheme] = useState(true);

  useEffect(() => {
    const checkTheme = () => {
      const t = document.documentElement.getAttribute('data-theme') || 'neon';
      setIsDefaultTheme(t === 'neon');
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
    if (!isDefaultTheme) return;

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

    const TARGET_NODES = Math.min(62, Math.max(38, Math.floor((W * H) / 22000)));
    const SPREAD = Math.min(W, H) * 0.52;
    const FOV = 500;
    const MAX_EDGE_DIST = SPREAD * 0.55;
    const MAX_EDGES_PER_NODE = 4;
    const SPAWN_RATE = 0.012;
    const DEATH_RATE = 0.010;

    // ── Node & Edge Pool ──────────────────────────────────────────────────
    const nodes = Array.from({ length: TARGET_NODES }, () => {
      const n = makeNode(SPREAD, 'alive');
      n.lifeAlpha = 1;
      n.aliveStart = performance.now();
      return n;
    });

    let { edges, edgeSet } = buildEdges(nodes, MAX_EDGE_DIST, MAX_EDGES_PER_NODE);

    // ── Pulse System ──────────────────────────────────────────────────────
    let nextPulseAt = performance.now() + 200;
    let pulseSpeedMult = 1;
    let pulseSizeMult = 1;

    const spawnPulse = () => {
      if (!edges.length) return;
      const edge = edges[Math.floor(Math.random() * edges.length)];
      const na = nodes[edge.a], nb = nodes[edge.b];
      if (!na || !nb || na.state === 'dying' || nb.state === 'dying') return;
      const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      edge.pulses.push({
        t: Math.random(),
        speed: (Math.random() * 0.009 + 0.007) * pulseSpeedMult,
        dir: Math.random() < 0.5 ? 1 : -1,
        color,
        size: (Math.random() * 2.2 + 1.8) * pulseSizeMult
      });
    };

    for (let s = 0; s < 18; s++) spawnPulse();

    // ── Shockwaves (visual-only rings from supernova) ─────────────────────
    const shockwaves = [];

    // ── Rotation ──────────────────────────────────────────────────────────
    let rotY = 0, rotX = 0.22;
    // Storm: temporarily spike rotation speed
    let rotSpeedMult = 1;
    let rotStormEndsAt = 0;

    // ── Lifecycle ──────────────────────────────────────────────────────────
    let nextLifecycleAt = performance.now() + 3500;

    // ── Randomizer Scheduler ──────────────────────────────────────────────
    let nextEventAt = performance.now() + Math.random() * 4000 + 3000;
    let activeEvent = null;
    let eventEndsAt = 0;

    const scheduleNextEvent = (time) => {
      nextEventAt = time + Math.random() * 5000 + 3500;
    };

    const fireEvent = (time) => {
      const ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
      activeEvent = ev;
      eventEndsAt = time + 2000;

      if (ev === 'supernova') {
        triggerSupernova(nodes, edges, PALETTE, shockwaves);
        pulseSpeedMult = 2.2;
        pulseSizeMult = 1.8;
        // Burst of pulses
        for (let b = 0; b < 20; b++) spawnPulse();
      } else if (ev === 'vortex') {
        triggerVortex(nodes);
        eventEndsAt = time + 3500;
      } else if (ev === 'spectrum') {
        triggerSpectrumShift(nodes, PALETTE);
        eventEndsAt = time + 2500;
      } else if (ev === 'rewire') {
        const rebuilt = triggerRewire(nodes, MAX_EDGE_DIST, MAX_EDGES_PER_NODE);
        edges = rebuilt.edges;
        edgeSet = rebuilt.edgeSet;
        // Spawn a wave of fresh pulses on the new topology
        for (let b = 0; b < 25; b++) spawnPulse();
        eventEndsAt = time + 1500;
      } else if (ev === 'storm') {
        triggerSpeedStorm(nodes);
        rotSpeedMult = 4;
        rotStormEndsAt = time + 3000;
        pulseSpeedMult = 1.8;
        eventEndsAt = time + 3000;
      }
    };

    // ── Render Loop ────────────────────────────────────────────────────────
    const render = (time) => {
      ctx.fillStyle = '#030014';
      ctx.fillRect(0, 0, W, H);

      const cx = W / 2, cy = H / 2;

      // ── Rotation speed (storm multiplier) ─────────────────────────────
      if (time > rotStormEndsAt) rotSpeedMult = 1 + (rotSpeedMult - 1) * 0.97;
      rotY = time * 0.000095 * rotSpeedMult;
      rotX = 0.22 + Math.sin(time * 0.000045) * 0.14;

      // ── Event cleanup ─────────────────────────────────────────────────
      if (activeEvent && time > eventEndsAt) {
        pulseSpeedMult = 1;
        pulseSizeMult = 1;
        activeEvent = null;
        scheduleNextEvent(time);
      }

      // ── Fire next randomizer event ────────────────────────────────────
      if (!activeEvent && time > nextEventAt) {
        fireEvent(time);
      }

      // ── Lifecycle: kill oldest, spawn new ─────────────────────────────
      if (time > nextLifecycleAt) {
        let oldestIdx = -1, minStart = Infinity;
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          if (n.state === 'alive' && n.aliveStart !== null && n.aliveStart < minStart) {
            minStart = n.aliveStart;
            oldestIdx = i;
          }
        }
        if (oldestIdx !== -1) nodes[oldestIdx].state = 'dying';
        const newNode = makeNode(SPREAD, 'spawning');
        nodes.push(newNode);
        addEdgesForNode(nodes.length - 1, nodes, edges, edgeSet, MAX_EDGE_DIST, MAX_EDGES_PER_NODE);
        nextLifecycleAt = time + Math.random() * 2500 + 2000;
      }

      // ── Update Nodes ──────────────────────────────────────────────────
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];

        n.dx += n.dvx * 0.012;
        n.dy += n.dvy * 0.012;
        n.dz += n.dvz * 0.012;
        // Dampen back toward origin (slower during storm)
        const damp = activeEvent === 'storm' ? 0.001 : 0.004;
        n.dx -= n.dx * damp;
        n.dy -= n.dy * damp;
        n.dz -= n.dz * damp;
        n.pulsePhase += n.pulseSpeed;

        // Smooth color lerp toward target
        if (n.colorBlend < 1) {
          n.colorBlend = Math.min(1, n.colorBlend + 0.008);
          n.color = lerpColor(n.color, n.targetColor, 0.012);
        }

        // Radius burst (supernova glow) — decays back to normal
        if (n.radiusBurst && n.radiusBurst > 1) {
          n.radiusBurst = Math.max(1, n.radiusBurst - 0.04);
        }

        // Lifecycle transitions
        if (n.state === 'spawning') {
          n.lifeAlpha = Math.min(1, n.lifeAlpha + SPAWN_RATE);
          if (n.lifeAlpha >= 1) { n.state = 'alive'; n.aliveStart = time; }
        } else if (n.state === 'dying') {
          n.lifeAlpha = Math.max(0, n.lifeAlpha - DEATH_RATE);
          if (n.lifeAlpha <= 0) {
            nodes.splice(i, 1);
            const rebuilt = buildEdges(nodes, MAX_EDGE_DIST, MAX_EDGES_PER_NODE);
            edges = rebuilt.edges;
            edgeSet = rebuilt.edgeSet;
            continue;
          }
        }
      }

      // ── Pulse spawning ────────────────────────────────────────────────
      if (time > nextPulseAt) {
        const batch = activeEvent === 'supernova' ? 8 : activeEvent === 'storm' ? 6 : 3;
        for (let p = 0; p < batch; p++) spawnPulse();
        nextPulseAt = time + (activeEvent ? 55 : Math.random() * 120 + 80);
      }

      // ── Project Nodes ─────────────────────────────────────────────────
      const projected = nodes.map((n) => {
        const wx = n.ox + n.dx, wy = n.oy + n.dy, wz = n.oz + n.dz;
        const r3 = rotate3D(wx, wy, wz, rotY, rotX);
        return project(r3.x, r3.y, r3.z, FOV, cx, cy);
      });

      // ── Shockwave Rings (from supernova) ──────────────────────────────
      for (let s = shockwaves.length - 1; s >= 0; s--) {
        const sw = shockwaves[s];
        sw.radius += 7;
        sw.alpha = Math.max(0, 1 - sw.radius / sw.maxRadius);
        if (sw.alpha <= 0) { shockwaves.splice(s, 1); continue; }

        // Find the projected position of the originating node
        const nIdx = nodes.indexOf(sw.nodeRef);
        if (nIdx === -1) { shockwaves.splice(s, 1); continue; }
        const pp = projected[nIdx];
        if (!pp || !pp.visible) continue;

        const sc = sw.color;
        // Outer ring
        ctx.beginPath();
        safeArc(ctx, pp.sx, pp.sy, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${sc.r}, ${sc.g}, ${sc.b}, ${sw.alpha * 0.55})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        // Inner ring (slightly smaller)
        ctx.beginPath();
        safeArc(ctx, pp.sx, pp.sy, sw.radius * 0.6, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${sc.r}, ${sc.g}, ${sc.b}, ${sw.alpha * 0.28})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // ── Draw Edges ────────────────────────────────────────────────────
      for (let e = edges.length - 1; e >= 0; e--) {
        const edge = edges[e];
        const na = nodes[edge.a], nb = nodes[edge.b];
        if (!na || !nb || edge.a >= nodes.length || edge.b >= nodes.length) {
          edges.splice(e, 1);
          continue;
        }
        const pa = projected[edge.a], pb = projected[edge.b];
        if (!pa || !pb || !pa.visible || !pb.visible) continue;

        const avgDepth = (pa.depth + pb.depth) * 0.5;
        const lifeBlend = Math.min(na.lifeAlpha, nb.lifeAlpha);
        const eventBoost = activeEvent === 'supernova' ? 2.0 : activeEvent === 'storm' ? 1.5 : 1;
        const alpha = Math.min(1, avgDepth * avgDepth * 0.28 * lifeBlend * eventBoost);

        const ca = na.color, cb = nb.color;
        const lineGrad = ctx.createLinearGradient(pa.sx, pa.sy, pb.sx, pb.sy);
        lineGrad.addColorStop(0, `rgba(${ca.r}, ${ca.g}, ${ca.b}, ${alpha})`);
        lineGrad.addColorStop(1, `rgba(${cb.r}, ${cb.g}, ${cb.b}, ${alpha})`);

        ctx.beginPath();
        ctx.moveTo(pa.sx, pa.sy);
        ctx.lineTo(pb.sx, pb.sy);
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = Math.max(0.3, avgDepth * 0.9);
        ctx.stroke();

        // Traveling Pulses
        for (let p = edge.pulses.length - 1; p >= 0; p--) {
          const pulse = edge.pulses[p];
          pulse.t += pulse.speed;

          if (pulse.t > 1 || pulse.t < 0) {
            if (Math.random() < 0.4) {
              pulse.t = pulse.dir === 1 ? 1 : 0;
              pulse.dir *= -1;
            } else {
              edge.pulses.splice(p, 1);
              continue;
            }
          }

          const tVal = pulse.dir === 1 ? pulse.t : 1 - pulse.t;
          const px = pa.sx + (pb.sx - pa.sx) * tVal;
          const py = pa.sy + (pb.sy - pa.sy) * tVal;
          const pDepth = Math.max(0.05, pa.depth + (pb.depth - pa.depth) * tVal);
          const pulseAlpha = Math.min(1, pDepth * lifeBlend * eventBoost);
          const pr = pulse.color;
          const baseR = Math.max(0, pulse.size * pDepth);

          ctx.beginPath();
          safeArc(ctx, px, py, baseR * 0.7, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${pulseAlpha * 0.95})`;
          ctx.fill();

          ctx.beginPath();
          safeArc(ctx, px, py, baseR * 2.2, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${pr.r}, ${pr.g}, ${pr.b}, ${pulseAlpha * 0.55})`;
          ctx.lineWidth = Math.max(0.1, baseR * 0.6);
          ctx.stroke();
        }
      }

      // ── Draw Nodes ────────────────────────────────────────────────────
      const order = projected
        .map((p, i) => ({ i, depth: p ? p.depth : 0 }))
        .sort((a, b) => a.depth - b.depth);

      for (const { i, depth } of order) {
        const n = nodes[i];
        const p = projected[i];
        if (!n || !p || !p.visible) continue;

        const c = n.color;
        const la = n.lifeAlpha;
        const breathe = 1 + Math.sin(n.pulsePhase) * 0.18;
        const burstScale = n.radiusBurst || 1;
        const eventScale = activeEvent === 'supernova' ? 1.4 : activeEvent === 'storm' ? 1.25 : 1;
        const r = Math.max(0, n.radius * depth * breathe * burstScale * eventScale);

        if (r < 0.1 || la < 0.01) continue;

        // Birth ring
        if (n.state === 'spawning') {
          const flash = 1 - la;
          ctx.beginPath();
          safeArc(ctx, p.sx, p.sy, r * (3.5 + flash * 6), 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${flash * 0.55})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        } else if (n.state === 'dying') {
          ctx.beginPath();
          safeArc(ctx, p.sx, p.sy, r * (3.5 + (1 - la) * 4), 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${la * 0.45})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Outer ring
        ctx.beginPath();
        safeArc(ctx, p.sx, p.sy, r * 2.5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${depth * 0.30 * la})`;
        ctx.lineWidth = Math.max(0.1, r * 0.45);
        ctx.stroke();

        // Mid ring
        ctx.beginPath();
        safeArc(ctx, p.sx, p.sy, r * 1.5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${depth * 0.55 * la})`;
        ctx.lineWidth = Math.max(0.1, r * 0.5);
        ctx.stroke();

        // Core
        ctx.beginPath();
        safeArc(ctx, p.sx, p.sy, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${depth * 0.95 * la})`;
        ctx.fill();

        // Hot center
        ctx.beginPath();
        safeArc(ctx, p.sx, p.sy, r * 0.38, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${depth * 0.90 * la})`;
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
  }, [isDefaultTheme]);

  if (!isDefaultTheme) return null;

  return (
    <div className="animated-bg-container" aria-hidden="true">
      <canvas ref={canvasRef} className="animated-bg-canvas" />
      <div className="animated-bg-vignette" />
    </div>
  );
};

export default AnimatedBackground;
