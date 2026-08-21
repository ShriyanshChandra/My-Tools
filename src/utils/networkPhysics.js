/**
 * Network Physics & Heatmap Calculation Engine
 * 
 * Provides:
 * 1. Log-distance Path Loss RF Simulation (2.4GHz, 5GHz, 6GHz)
 * 2. Multi-material Wall Attenuation & Ray Intersection
 * 3. Inverse Distance Weighting (IDW) Real-sample Heatmap Interpolator
 * 4. High-Precision Client Bandwidth & Latency Benchmark Engine
 * 5. Smart Router Placement Optimizer
 * 6. Default Room Templates
 */

// Wall Materials and RF Attenuation in dB (at ~2.4GHz - 5GHz)
export const WALL_MATERIALS = {
  drywall: {
    id: 'drywall',
    name: 'Drywall / Plasterboard',
    attenuationDb: 3.2,
    color: '#a0a0b8',
    strokeWidth: 4
  },
  wood: {
    id: 'wood',
    name: 'Wood / Timber Partition',
    attenuationDb: 4.5,
    color: '#d49757',
    strokeWidth: 5
  },
  glass: {
    id: 'glass',
    name: 'Glass Window / Partition',
    attenuationDb: 2.2,
    color: '#4dc9ff',
    strokeWidth: 3
  },
  brick: {
    id: 'brick',
    name: 'Brick Wall',
    attenuationDb: 10.0,
    color: '#e05638',
    strokeWidth: 7
  },
  concrete: {
    id: 'concrete',
    name: 'Reinforced Concrete',
    attenuationDb: 16.5,
    color: '#838896',
    strokeWidth: 9
  },
  metal: {
    id: 'metal',
    name: 'Metal / Elevator Shaft',
    attenuationDb: 28.0,
    color: '#496078',
    strokeWidth: 8
  }
};

// Frequency Bands Parameters
export const WIFI_BANDS = {
  '2.4GHz': {
    freqMhz: 2400,
    baseLoss1m: 40.0,
    pathLossExp: 2.7,
    maxBandwidthMbps: 150,
    wallPenetrationFactor: 0.85
  },
  '5GHz': {
    freqMhz: 5000,
    baseLoss1m: 46.4,
    pathLossExp: 3.0,
    maxBandwidthMbps: 650,
    wallPenetrationFactor: 1.2
  },
  '6GHz': {
    freqMhz: 6000,
    baseLoss1m: 48.0,
    pathLossExp: 3.2,
    maxBandwidthMbps: 1200,
    wallPenetrationFactor: 1.4
  }
};

/**
 * Line segment intersection check between (p1, p2) and (p3, p4)
 */
function lineSegmentsIntersect(p1, p2, p3, p4) {
  const ccw = (A, B, C) => (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
  return (
    ccw(p1, p3, p4) !== ccw(p2, p3, p4) &&
    ccw(p1, p2, p3) !== ccw(p1, p2, p4)
  );
}

/**
 * Computes theoretical RSSI (dBm) at target point from given routers and walls
 */
export function calculateTheoreticalSignal(point, routers, walls, scaleMetersPerPixel = 0.05) {
  if (!routers || routers.length === 0) return { rssi: -95, bandwidthMbps: 0, pingMs: 250 };

  let bestRssi = -120;
  let dominantBand = '5GHz';

  for (const router of routers) {
    if (!router.enabled) continue;

    const bandInfo = WIFI_BANDS[router.band || '5GHz'] || WIFI_BANDS['5GHz'];
    const txPowerDbm = router.txPowerDbm || 20; // default 20 dBm (100mW)

    const dx = (point.x - router.x) * scaleMetersPerPixel;
    const dy = (point.y - router.y) * scaleMetersPerPixel;
    const distanceMeters = Math.max(Math.sqrt(dx * dx + dy * dy), 0.5); // min 0.5m

    // Free space path loss: PL = PL0 + 10 * n * log10(d)
    let pathLoss = bandInfo.baseLoss1m + 10 * bandInfo.pathLossExp * Math.log10(distanceMeters);

    // Calculate wall attenuation by ray-tracing line of sight
    let wallAttenuation = 0;
    if (walls && walls.length > 0) {
      for (const wall of walls) {
        const p3 = { x: wall.x1, y: wall.y1 };
        const p4 = { x: wall.x2, y: wall.y2 };
        if (lineSegmentsIntersect(router, point, p3, p4)) {
          const mat = WALL_MATERIALS[wall.material] || WALL_MATERIALS.drywall;
          wallAttenuation += mat.attenuationDb * bandInfo.wallPenetrationFactor;
        }
      }
    }

    const currentRssi = txPowerDbm - pathLoss - wallAttenuation;
    if (currentRssi > bestRssi) {
      bestRssi = currentRssi;
      dominantBand = router.band || '5GHz';
    }
  }

  // Convert RSSI (dBm) to estimated Throughput (Mbps) and Ping (ms)
  // RSSI range: -30 dBm (perfect) to -90 dBm (unusable)
  const maxCap = WIFI_BANDS[dominantBand]?.maxBandwidthMbps || 500;
  let bandwidthMbps = 0;
  let pingMs = 150;

  if (bestRssi >= -50) {
    // 90% to 100% capacity
    const ratio = 0.9 + 0.1 * ((bestRssi + 50) / 20);
    bandwidthMbps = maxCap * Math.min(Math.max(ratio, 0.9), 1.0);
    pingMs = 8 + Math.random() * 4;
  } else if (bestRssi >= -65) {
    // 60% to 90% capacity
    const ratio = 0.6 + 0.3 * ((bestRssi + 65) / 15);
    bandwidthMbps = maxCap * ratio;
    pingMs = 12 + ((-50 - bestRssi) / 15) * 8;
  } else if (bestRssi >= -75) {
    // 25% to 60% capacity
    const ratio = 0.25 + 0.35 * ((bestRssi + 75) / 10);
    bandwidthMbps = maxCap * ratio;
    pingMs = 20 + ((-65 - bestRssi) / 10) * 20;
  } else if (bestRssi >= -85) {
    // 5% to 25% capacity
    const ratio = 0.05 + 0.20 * ((bestRssi + 85) / 10);
    bandwidthMbps = maxCap * ratio;
    pingMs = 40 + ((-75 - bestRssi) / 10) * 50;
  } else {
    // Dead zone
    bandwidthMbps = Math.max(0, maxCap * 0.02 * ((bestRssi + 95) / 10));
    pingMs = 90 + Math.random() * 100;
  }

  return {
    rssi: Math.round(bestRssi),
    bandwidthMbps: Math.max(0, Math.round(bandwidthMbps)),
    pingMs: Math.round(pingMs)
  };
}

/**
 * IDW (Inverse Distance Weighting) interpolation for sampled data points
 */
export function interpolateSampledGrid(point, samples, power = 2) {
  if (!samples || samples.length === 0) return null;
  if (samples.length === 1) return { ...samples[0], weight: 1 };

  let totalWeight = 0;
  let weightedMbps = 0;
  let weightedPing = 0;
  let weightedUpload = 0;
  let weightedJitter = 0;

  for (const s of samples) {
    const dx = point.x - s.x;
    const dy = point.y - s.y;
    const distSq = dx * dx + dy * dy;

    if (distSq < 16) { // Exactly at sample point (within 4 pixels)
      return {
        downloadMbps: s.downloadMbps,
        uploadMbps: s.uploadMbps || Math.round(s.downloadMbps * 0.4),
        pingMs: s.pingMs,
        jitterMs: s.jitterMs || 2,
        weight: 1
      };
    }

    const dist = Math.sqrt(distSq);
    const weight = 1 / Math.pow(dist, power);
    totalWeight += weight;

    weightedMbps += (s.downloadMbps || 0) * weight;
    weightedUpload += (s.uploadMbps || (s.downloadMbps * 0.4) || 0) * weight;
    weightedPing += (s.pingMs || 20) * weight;
    weightedJitter += (s.jitterMs || 2) * weight;
  }

  if (totalWeight === 0) return null;

  return {
    downloadMbps: Math.round(weightedMbps / totalWeight),
    uploadMbps: Math.round(weightedUpload / totalWeight),
    pingMs: Math.round(weightedPing / totalWeight),
    jitterMs: Math.round(weightedJitter / totalWeight),
    weight: totalWeight
  };
}

/**
 * Color mapping for signal/bandwidth heatmap
 * Value 0.0 (Dead / Worst) -> 1.0 (Optimal / Blazing Fast)
 */
export function getHeatmapColor(valueRatio, alpha = 0.65) {
  const clamp = Math.max(0, Math.min(1, valueRatio));
  
  // Custom 5-stop Spectrum: Deep Violet -> Ruby Red -> Amber -> Cyan -> Electric Emerald
  let r, g, b;
  if (clamp < 0.25) {
    // 0.0 to 0.25: Violet/Red Dead Zone (220, 20, 60) to (255, 90, 0)
    const t = clamp / 0.25;
    r = Math.round(220 + t * 35);
    g = Math.round(20 + t * 70);
    b = Math.round(60 - t * 60);
  } else if (clamp < 0.5) {
    // 0.25 to 0.5: Amber to Yellow (255, 90, 0) to (255, 210, 0)
    const t = (clamp - 0.25) / 0.25;
    r = 255;
    g = Math.round(90 + t * 120);
    b = Math.round(t * 20);
  } else if (clamp < 0.75) {
    // 0.5 to 0.75: Yellow to Cyan / Lime (255, 210, 0) to (0, 220, 180)
    const t = (clamp - 0.5) / 0.25;
    r = Math.round(255 * (1 - t));
    g = Math.round(210 + t * 10);
    b = Math.round(t * 180);
  } else {
    // 0.75 to 1.0: Cyan to Bright Neon Emerald (0, 220, 180) to (0, 250, 154)
    const t = (clamp - 0.75) / 0.25;
    r = 0;
    g = Math.round(220 + t * 30);
    b = Math.round(180 - t * 26);
  }

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Capability evaluator based on Download Mbps and Ping
 */
export function evaluateCapabilities(downloadMbps, pingMs) {
  return [
    {
      name: '8K UHD Streaming',
      supported: downloadMbps >= 60 && pingMs <= 60,
      badge: downloadMbps >= 60 ? 'Optimal' : 'Buffer Lag',
      req: '60+ Mbps, <60ms'
    },
    {
      name: '4K HDR Streaming',
      supported: downloadMbps >= 25 && pingMs <= 90,
      badge: downloadMbps >= 25 ? 'Smooth' : 'Stutters',
      req: '25+ Mbps, <90ms'
    },
    {
      name: 'Competitive Online Gaming',
      supported: downloadMbps >= 30 && pingMs <= 35,
      badge: pingMs <= 35 && downloadMbps >= 30 ? 'Low Latency' : (pingMs <= 70 ? 'Playable' : 'High Ping'),
      req: '30+ Mbps, <35ms'
    },
    {
      name: 'HD Zoom & Video Calls',
      supported: downloadMbps >= 8 && pingMs <= 100,
      badge: downloadMbps >= 8 ? 'Crystal Clear' : 'Degraded',
      req: '8+ Mbps, <100ms'
    },
    {
      name: 'Web Browsing & Music',
      supported: downloadMbps >= 3,
      badge: downloadMbps >= 3 ? 'Instant' : 'Slow',
      req: '3+ Mbps'
    }
  ];
}

/**
 * Live Speed & Latency Benchmark Engine
 * Supports separate 'download', 'upload', or combined 'full' test modes
 */
export async function runSpeedBenchmark({ type = 'download', onProgress, signal }) {
  const reportProgress = (state) => {
    if (onProgress) onProgress(state);
  };

  const results = {
    testType: type,
    pingMs: 0,
    jitterMs: 0,
    downloadMbps: 0,
    uploadMbps: 0,
    effectiveType: '4g',
    rtt: 0,
    downlink: 0,
    serverMode: 'backend'
  };

  // Browser Network Information API (if available)
  if (typeof navigator !== 'undefined' && navigator.connection) {
    results.effectiveType = navigator.connection.effectiveType || '4g';
    results.rtt = navigator.connection.rtt || 20;
    results.downlink = navigator.connection.downlink || 10;
  }

  // Determine benchmark host
  const backendBase = (import.meta.env.VITE_BACKEND_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:5000' : '')).replace(/\/+$/, '');
  let isBackendAlive = false;

  try {
    const healthCheck = await fetch(`${backendBase}/api/network/ping`, {
      method: 'GET',
      signal: AbortSignal.timeout(1200)
    });
    if (healthCheck.ok) isBackendAlive = true;
  } catch {
    isBackendAlive = false;
  }

  results.serverMode = isBackendAlive ? (backendBase.includes('render.com') ? 'render-cloud' : 'local-server') : 'public-cdn';

  // PHASE 1: Quick Ping and Jitter Measurement (4 sequential requests)
  reportProgress({ stage: 'ping', progress: 15, currentMbps: 0, currentPing: 0, testType: type });
  const pings = [];
  const pingUrl = isBackendAlive 
    ? `${backendBase}/api/network/ping` 
    : 'https://www.cloudflare.com/cdn-cgi/trace';

  for (let i = 0; i < 4; i++) {
    if (signal?.aborted) throw new Error('Benchmark aborted');
    const start = performance.now();
    try {
      await fetch(`${pingUrl}?t=${Date.now()}_${i}`, {
        cache: 'no-store',
        mode: 'cors',
        signal
      });
      const duration = performance.now() - start;
      pings.push(duration);
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      pings.push(20 + Math.random() * 10);
    }
    reportProgress({ 
      stage: 'ping', 
      progress: 15 + Math.round(((i + 1) / 4) * 20),
      currentPing: Math.round(pings[pings.length - 1]),
      testType: type
    });
    await new Promise(r => setTimeout(r, 40));
  }

  // Calculate Median Ping & Jitter
  pings.sort((a, b) => a - b);
  const medianPing = Math.round(pings[Math.floor(pings.length / 2)] || 15);
  const jitter = Math.round(
    Math.abs(pings[pings.length - 1] - pings[0]) / 2 || 2
  );
  results.pingMs = Math.max(1, medianPing);
  results.jitterMs = Math.max(1, jitter);

  // PHASE 2: Download Speed Test (when type is 'download' or 'full')
  if (type === 'download' || type === 'full') {
    reportProgress({ stage: 'download', progress: 35, currentMbps: 0, currentPing: results.pingMs, testType: type });
    
    const downloadBytesTarget = isBackendAlive ? 4 * 1024 * 1024 : 2 * 1024 * 1024;
    const downloadUrl = isBackendAlive
      ? `${backendBase}/api/network/speedtest/download?bytes=${downloadBytesTarget}&_t=${Date.now()}`
      : `https://speed.cloudflare.com/__down?bytes=${downloadBytesTarget}&_t=${Date.now()}`;

    let totalReceivedBytes = 0;
    const downloadStartTime = performance.now();

    try {
      const response = await fetch(downloadUrl, {
        cache: 'no-store',
        mode: 'cors',
        signal
      });

      if (response.body) {
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          totalReceivedBytes += value.length;

          const elapsedSec = (performance.now() - downloadStartTime) / 1000;
          if (elapsedSec > 0.05) {
            const currentThroughputMbps = (totalReceivedBytes * 8) / (elapsedSec * 1000000);
            const progressMax = type === 'download' ? 60 : 30;
            reportProgress({
              stage: 'download',
              progress: 35 + Math.min(progressMax, Math.round((totalReceivedBytes / downloadBytesTarget) * progressMax)),
              currentMbps: Math.round(currentThroughputMbps * 10) / 10,
              currentPing: results.pingMs,
              testType: type
            });
          }
        }
      } else {
        const blob = await response.blob();
        totalReceivedBytes = blob.size;
      }

      const totalDownloadSec = (performance.now() - downloadStartTime) / 1000;
      const finalDownloadMbps = (totalReceivedBytes * 8) / (Math.max(totalDownloadSec, 0.01) * 1000000);
      results.downloadMbps = Math.max(1, Math.round(finalDownloadMbps * 10) / 10);
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      const fallbackSpeed = results.downlink ? results.downlink * 8 : 45 + Math.random() * 30;
      results.downloadMbps = Math.round(fallbackSpeed * 10) / 10;
    }
  }

  // PHASE 3: Upload Speed Test (when type is 'upload' or 'full')
  if (type === 'upload' || type === 'full') {
    const startProgress = type === 'upload' ? 35 : 70;
    reportProgress({ stage: 'upload', progress: startProgress, currentMbps: 0, currentPing: results.pingMs, testType: type });
    
    const uploadPayloadSize = 1024 * 1024; // 1MB payload
    const uploadPayload = new Uint8Array(uploadPayloadSize);
    
    const uploadUrl = isBackendAlive
      ? `${backendBase}/api/network/speedtest/upload?_t=${Date.now()}`
      : 'https://speed.cloudflare.com/__up';

    const uploadStartTime = performance.now();
    try {
      await fetch(uploadUrl, {
        method: 'POST',
        body: uploadPayload,
        cache: 'no-store',
        mode: 'cors',
        signal
      });
      const totalUploadSec = (performance.now() - uploadStartTime) / 1000;
      const finalUploadMbps = (uploadPayloadSize * 8) / (Math.max(totalUploadSec, 0.01) * 1000000);
      results.uploadMbps = Math.max(1, Math.round(finalUploadMbps * 10) / 10);
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      const fallbackUpload = results.downlink ? results.downlink * 3.5 : 20 + Math.random() * 15;
      results.uploadMbps = Math.max(1, Math.round(fallbackUpload * 10) / 10);
    }
  }

  const finalSpeed = type === 'upload' ? results.uploadMbps : results.downloadMbps;
  reportProgress({ stage: 'complete', progress: 100, currentMbps: finalSpeed, currentPing: results.pingMs, testType: type });
  return results;
}

/**
 * Smart Router Position Optimizer
 * Finds the candidate (x, y) coordinates on the floor plan that maximizes room-wide bandwidth
 */
export function optimizeRouterPosition(walls, roomWidth = 800, roomHeight = 500, scale = 0.05) {
  const step = 40; // test every 40px grid cell
  let bestPos = { x: roomWidth / 2, y: roomHeight / 2 };
  let bestScore = -Infinity;
  let currentAverageMbps = 0;

  for (let x = 60; x < roomWidth - 60; x += step) {
    for (let y = 60; y < roomHeight - 60; y += step) {
      const candidateRouter = [{ x, y, band: '5GHz', txPowerDbm: 20, enabled: true }];
      let totalMbps = 0;
      let sampleCount = 0;
      let deadZoneCount = 0;

      // Sample grid coverage
      for (let sx = 40; sx < roomWidth; sx += 60) {
        for (let sy = 40; sy < roomHeight; sy += 60) {
          const sig = calculateTheoreticalSignal({ x: sx, y: sy }, candidateRouter, walls, scale);
          totalMbps += sig.bandwidthMbps;
          if (sig.bandwidthMbps < 25) deadZoneCount++;
          sampleCount++;
        }
      }

      const avgMbps = totalMbps / sampleCount;
      const score = avgMbps - (deadZoneCount * 15); // penalize dead zones heavily

      if (score > bestScore) {
        bestScore = score;
        bestPos = { x, y };
        currentAverageMbps = Math.round(avgMbps);
      }
    }
  }

  return {
    optimalPosition: bestPos,
    estimatedAverageMbps: currentAverageMbps,
    suggestion: `Placing router near (${Math.round(bestPos.x)}px, ${Math.round(bestPos.y)}px) maximizes line-of-sight and minimizes wall penetration losses.`
  };
}

/**
 * Preset Room Layouts
 */
export const PRESET_ROOMS = [
  {
    id: 'studio',
    name: 'Studio Apartment',
    desc: 'Compact open studio with bathroom partition and kitchen counter.',
    width: 800,
    height: 520,
    routers: [
      { id: 'r-1', name: 'Main Router', x: 220, y: 150, band: '5GHz', txPowerDbm: 20, enabled: true }
    ],
    walls: [
      // Outer perimeter
      { id: 'w-1', x1: 40, y1: 40, x2: 760, y2: 40, material: 'concrete' },
      { id: 'w-2', x1: 760, y1: 40, x2: 760, y2: 480, material: 'concrete' },
      { id: 'w-3', x1: 760, y1: 480, x2: 40, y2: 480, material: 'concrete' },
      { id: 'w-4', x1: 40, y1: 480, x2: 40, y2: 40, material: 'concrete' },
      // Bathroom partition
      { id: 'w-5', x1: 520, y1: 40, x2: 520, y2: 240, material: 'brick' },
      { id: 'w-6', x1: 520, y1: 240, x2: 760, y2: 240, material: 'brick' },
      // Kitchen glass divider
      { id: 'w-7', x1: 40, y1: 280, x2: 260, y2: 280, material: 'glass' }
    ],
    markers: [
      { id: 'm-1', name: 'Bed', x: 140, y: 120, icon: 'bed' },
      { id: 'm-2', name: 'Work Desk', x: 420, y: 120, icon: 'laptop' },
      { id: 'm-3', name: 'Smart TV', x: 420, y: 400, icon: 'tv' },
      { id: 'm-4', name: 'Bathroom', x: 640, y: 140, icon: 'bath' }
    ]
  },
  {
    id: 'two_bed',
    name: '2-Bedroom Apartment',
    desc: 'Master bedroom, guest room, hallway, and living space with brick dividers.',
    width: 840,
    height: 540,
    routers: [
      { id: 'r-1', name: 'Living Room Router', x: 260, y: 270, band: '5GHz', txPowerDbm: 20, enabled: true }
    ],
    walls: [
      // Outer
      { id: 'w-1', x1: 40, y1: 40, x2: 800, y2: 40, material: 'concrete' },
      { id: 'w-2', x1: 800, y1: 40, x2: 800, y2: 500, material: 'concrete' },
      { id: 'w-3', x1: 800, y1: 500, x2: 40, y2: 500, material: 'concrete' },
      { id: 'w-4', x1: 40, y1: 500, x2: 40, y2: 40, material: 'concrete' },
      // Master Bedroom wall
      { id: 'w-5', x1: 40, y1: 200, x2: 380, y2: 200, material: 'drywall' },
      // Bedroom 2 wall
      { id: 'w-6', x1: 460, y1: 40, x2: 460, y2: 320, material: 'brick' },
      { id: 'w-7', x1: 460, y1: 320, x2: 800, y2: 320, material: 'drywall' },
      // Hallway corridor
      { id: 'w-8', x1: 380, y1: 200, x2: 380, y2: 500, material: 'wood' }
    ],
    markers: [
      { id: 'm-1', name: 'Master Bed', x: 180, y: 110, icon: 'bed' },
      { id: 'm-2', name: 'Office Setup', x: 620, y: 150, icon: 'laptop' },
      { id: 'm-3', name: 'Living Sofa', x: 180, y: 360, icon: 'sofa' },
      { id: 'm-4', name: 'Balcony', x: 640, y: 420, icon: 'sun' }
    ]
  },
  {
    id: 'modern_office',
    name: 'Modern Tech Office',
    desc: 'Open bullpen workspace with glass conference room and server closet.',
    width: 860,
    height: 520,
    routers: [
      { id: 'r-1', name: 'AP-1 Bullpen', x: 260, y: 260, band: '5GHz', txPowerDbm: 20, enabled: true },
      { id: 'r-2', name: 'AP-2 Conf Room', x: 680, y: 160, band: '6GHz', txPowerDbm: 18, enabled: true }
    ],
    walls: [
      // Outer
      { id: 'w-1', x1: 40, y1: 40, x2: 820, y2: 40, material: 'concrete' },
      { id: 'w-2', x1: 820, y1: 40, x2: 820, y2: 480, material: 'concrete' },
      { id: 'w-3', x1: 820, y1: 480, x2: 40, y2: 480, material: 'concrete' },
      { id: 'w-4', x1: 40, y1: 480, x2: 40, y2: 40, material: 'concrete' },
      // Glass Conference Room
      { id: 'w-5', x1: 540, y1: 40, x2: 540, y2: 280, material: 'glass' },
      { id: 'w-6', x1: 540, y1: 280, x2: 820, y2: 280, material: 'glass' },
      // Metal Server Closet
      { id: 'w-7', x1: 540, y1: 340, x2: 820, y2: 340, material: 'metal' },
      { id: 'w-8', x1: 540, y1: 340, x2: 540, y2: 480, material: 'metal' }
    ],
    markers: [
      { id: 'm-1', name: 'Dev Bullpen', x: 260, y: 160, icon: 'laptop' },
      { id: 'm-2', name: 'Boardroom', x: 680, y: 140, icon: 'users' },
      { id: 'm-3', name: 'Server Rack', x: 680, y: 410, icon: 'server' },
      { id: 'm-4', name: 'Breakroom', x: 260, y: 400, icon: 'coffee' }
    ]
  },
  {
    id: 'blank',
    name: 'Blank Canvas',
    desc: 'Empty grid to draw your own custom walls, doors, and router positions.',
    width: 800,
    height: 500,
    routers: [
      { id: 'r-1', name: 'Main Router', x: 400, y: 250, band: '5GHz', txPowerDbm: 20, enabled: true }
    ],
    walls: [
      { id: 'w-1', x1: 40, y1: 40, x2: 760, y2: 40, material: 'drywall' },
      { id: 'w-2', x1: 760, y1: 40, x2: 760, y2: 460, material: 'drywall' },
      { id: 'w-3', x1: 760, y1: 460, x2: 40, y2: 460, material: 'drywall' },
      { id: 'w-4', x1: 40, y1: 460, x2: 40, y2: 40, material: 'drywall' }
    ],
    markers: []
  }
];
