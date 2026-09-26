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

// Project 3D to 2D with perspective. Depth clamped to [0.05, 2].
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
    dvx: (Math.random() - 0.5) * 0.15,
    dvy: (Math.random() - 0.5) * 0.15,
    dvz: (Math.random() - 0.5) * 0.15,
    dx: 0, dy: 0, dz: 0,
    color,
    radius: Math.random() * 2.2 + 3.2,
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

// Add edges for a newly spawned node
const addEdgesForNode = (idx, nodes, edges, edgeSet, maxDist, maxEdges) => {
  const ni = nodes[idx];
  if (!ni) return;
  const dists = [];
  for (let j = 0; j < nodes.length; j++) {
    if (j === idx) continue;
    const nj = nodes[j];
    if (!nj) continue;
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

    const TARGET_NODES = Math.min(56, Math.max(36, Math.floor((W * H) / 24000)));
    const SPREAD = Math.min(W, H) * 0.52;
    const FOV = 500;
    const MAX_EDGE_DIST = SPREAD * 0.55;
    const MAX_EDGES_PER_NODE = 4;
    const SPAWN_RATE = 0.007;
    const DEATH_RATE = 0.007;

    // ── Node Pool ─────────────────────────────────────────────────────────
    const nodes = Array.from({ length: TARGET_NODES }, () => {
      const n = makeNode(SPREAD, 'alive');
      n.lifeAlpha = 1;
      n.aliveStart = performance.now();
      return n;
    });

    let { edges, edgeSet } = buildEdges(nodes, MAX_EDGE_DIST, MAX_EDGES_PER_NODE);

    // ── Continuous Pulse System ───────────────────────────────────────────
    const spawnPulse = () => {
      if (!edges.length) return;
      const edge = edges[Math.floor(Math.random() * edges.length)];
      if (!edge) return;
      const na = nodes[edge.a], nb = nodes[edge.b];
      if (!na || !nb || na.state === 'dying' || nb.state === 'dying') return;

      const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      // Always start strictly from node A (t = 0, moving +1 towards B) or node B (t = 1, moving -1 towards A)
      const fromA = Math.random() < 0.5;
      edge.pulses.push({
        t: fromA ? 0 : 1,
        speed: Math.random() * 0.007 + 0.005,
        dir: fromA ? 1 : -1,
        color,
        size: Math.random() * 0.6 + 1.65
      });
    };

    // Pre-populate initial pulses starting at node endpoints
    for (let s = 0; s < 20; s++) spawnPulse();

    let nextPulseAt = performance.now() + 50;

    // ── Rotation ──────────────────────────────────────────────────────────
    let rotY = 0, rotX = 0.22;

    // ── Lifecycle Timer ───────────────────────────────────────────────────
    let nextLifecycleAt = performance.now() + 3500;

    // ── Render Loop ───────────────────────────────────────────────────────
    const render = (time) => {
      ctx.fillStyle = '#030014';
      ctx.fillRect(0, 0, W, H);

      const cx = W / 2, cy = H / 2;

      // Steady, majestic constant rotation without speed spikes
      rotY = time * 0.000085;
      rotX = 0.22 + Math.sin(time * 0.000045) * 0.12;

      // ── Lifecycle: Smoothly cycle oldest node and spawn new ─────────────
      if (time > nextLifecycleAt) {
        let oldestIdx = -1, minStart = Infinity;
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          if (n.state === 'alive' && n.aliveStart !== null && n.aliveStart < minStart) {
            minStart = n.aliveStart;
            oldestIdx = i;
          }
        }
        if (oldestIdx !== -1) {
          nodes[oldestIdx].state = 'dying';
        }

        // Spawn a new node
        const newNode = makeNode(SPREAD, 'spawning');
        nodes.push(newNode);
        addEdgesForNode(nodes.length - 1, nodes, edges, edgeSet, MAX_EDGE_DIST, MAX_EDGES_PER_NODE);

        nextLifecycleAt = time + Math.random() * 2000 + 3000;
      }

      // ── Update Nodes ──────────────────────────────────────────────────
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];

        n.dx += n.dvx * 0.012;
        n.dy += n.dvy * 0.012;
        n.dz += n.dvz * 0.012;

        // Gentle dampening to keep nodes within bound
        n.dx -= n.dx * 0.003;
        n.dy -= n.dy * 0.003;
        n.dz -= n.dz * 0.003;
        n.pulsePhase += n.pulseSpeed;

        // Lifecycle alpha transitions
        if (n.state === 'spawning') {
          n.lifeAlpha = Math.min(1, n.lifeAlpha + SPAWN_RATE);
          if (n.lifeAlpha >= 1) {
            n.state = 'alive';
            n.aliveStart = time;
          }
        } else if (n.state === 'dying') {
          n.lifeAlpha = Math.max(0, n.lifeAlpha - DEATH_RATE);
          if (n.lifeAlpha <= 0) {
            // Remove edges connected to dead node i and remap indices
            edges = edges.filter(e => e.a !== i && e.b !== i);
            for (const e of edges) {
              if (e.a > i) e.a--;
              if (e.b > i) e.b--;
            }
            edgeSet.clear();
            for (const e of edges) {
              edgeSet.add(e.a < e.b ? `${e.a}-${e.b}` : `${e.b}-${e.a}`);
            }
            nodes.splice(i, 1);
            continue;
          }
        }
      }

      // ── Steady Pulse Spawning ─────────────────────────────────────────
      // Maintain vibrant traveling pulses across all edges
      let totalPulses = 0;
      for (let i = 0; i < edges.length; i++) {
        totalPulses += edges[i].pulses.length;
      }
      if (totalPulses < 36 && time > nextPulseAt) {
        const count = Math.min(36 - totalPulses, Math.random() < 0.6 ? 2 : 1);
        for (let k = 0; k < count; k++) {
          spawnPulse();
        }
        nextPulseAt = time + Math.random() * 60 + 30;
      }

      // ── Project Nodes ─────────────────────────────────────────────────
      const projected = nodes.map((n) => {
        const wx = n.ox + n.dx, wy = n.oy + n.dy, wz = n.oz + n.dz;
        const r3 = rotate3D(wx, wy, wz, rotY, rotX);
        return project(r3.x, r3.y, r3.z, FOV, cx, cy);
      });

      // ── Draw Edges & Traveling Pulses ─────────────────────────────────
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
        const alpha = Math.min(1, avgDepth * avgDepth * 0.28 * lifeBlend);

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

        // Traveling Pulses: single trip from starting node to destination node
        for (let p = edge.pulses.length - 1; p >= 0; p--) {
          const pulse = edge.pulses[p];
          pulse.t += pulse.speed * pulse.dir;

          // Disappear upon completing one single travel to the target node
          if (pulse.dir === 1 && pulse.t >= 1) {
            edge.pulses.splice(p, 1);
            continue;
          }
          if (pulse.dir === -1 && pulse.t <= 0) {
            edge.pulses.splice(p, 1);
            continue;
          }

          const tVal = Math.max(0, Math.min(1, pulse.t));
          const px = pa.sx + (pb.sx - pa.sx) * tVal;
          const py = pa.sy + (pb.sy - pa.sy) * tVal;
          const pDepth = Math.max(0.12, pa.depth + (pb.depth - pa.depth) * tVal);
          const pulseAlpha = Math.min(1, pDepth * lifeBlend);
          const pr = pulse.color;
          const baseR = Math.max(1.5, pulse.size * pDepth);

          // Hot inner core
          ctx.beginPath();
          safeArc(ctx, px, py, baseR * 0.9, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${pulseAlpha * 0.98})`;
          ctx.fill();

          // Compact radiant halo
          ctx.beginPath();
          safeArc(ctx, px, py, baseR * 2.0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${pr.r}, ${pr.g}, ${pr.b}, ${pulseAlpha * 0.85})`;
          ctx.lineWidth = Math.max(0.4, baseR * 0.5);
          ctx.stroke();

          // Subtle background glow
          ctx.beginPath();
          safeArc(ctx, px, py, baseR * 3.0, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${pr.r}, ${pr.g}, ${pr.b}, ${pulseAlpha * 0.18})`;
          ctx.fill();
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
        const r = Math.max(0, n.radius * depth * breathe);

        if (r < 0.1 || la < 0.01) continue;

        // Birth glow ring
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

        // Outer glow ring
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
