(function () {
  if (window.__aurawave_injected) return;
  window.__aurawave_injected = true;

  // Settings State
  const state = {
    mode: 'pulse', // 'pulse' | 'spectrum' | 'aurora' | 'particles' | 'reactive'
    theme: 'cyan', // 'cyan' | 'purple' | 'emerald' | 'amber' | 'rose'
    height: 48,
    sensitivity: 3.2,
    micActive: false,
    visible: true
  };

  const themeColors = {
    cyan: { primary: '#06b6d4', secondary: '#38bdf8', glow: 'rgba(6, 182, 212, 0.6)', peak: '#a5f3fc' },
    purple: { primary: '#a855f7', secondary: '#ec4899', glow: 'rgba(168, 85, 247, 0.6)', peak: '#fbcfe8' },
    emerald: { primary: '#10b981', secondary: '#34d399', glow: 'rgba(16, 185, 129, 0.6)', peak: '#a7f3d0' },
    amber: { primary: '#f59e0b', secondary: '#fbbf24', glow: 'rgba(245, 158, 11, 0.6)', peak: '#fef3c7' },
    rose: { primary: '#f43f5e', secondary: '#fda4af', glow: 'rgba(244, 63, 94, 0.6)', peak: '#ffe4e6' }
  };

  // Audio Engine State
  let liveFreqData = new Uint8Array(64);
  let lastAudioTimestamp = 0;
  let hasActiveSignal = false;
  const peakBars = new Array(64).fill(0);

  // Web Audio Context for Microphone
  let micAudioCtx = null;
  let micAnalyser = null;
  let micGain = null;
  let micStream = null;
  let micDataArray = null;
  let micTimeArray = null;

  // Host & Shadow DOM Container (Zero HUD, purely canvas overlay)
  const host = document.createElement('div');
  host.id = 'aurawave-extension-root';
  host.style.position = 'fixed';
  host.style.top = '0';
  host.style.left = '0';
  host.style.width = '100vw';
  host.style.height = `${state.height}px`;
  host.style.pointerEvents = 'none';
  host.style.zIndex = '2147483647';
  host.style.display = 'block';

  const shadow = host.attachShadow({ mode: 'open' });

  // Styles
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    :host {
      all: initial;
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      pointer-events: none;
      z-index: 2147483647;
    }
    .aurawave-canvas {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 65%, rgba(0,0,0,0) 100%);
      mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 65%, rgba(0,0,0,0) 100%);
    }
  `;
  shadow.appendChild(styleEl);

  const canvas = document.createElement('canvas');
  canvas.className = 'aurawave-canvas';
  shadow.appendChild(canvas);

  function attachToPage() {
    if (document.body) {
      document.body.appendChild(host);
    } else if (document.documentElement) {
      document.documentElement.appendChild(host);
    } else {
      window.addEventListener('DOMContentLoaded', () => {
        document.body.appendChild(host);
      });
    }
  }
  attachToPage();

  // Load saved preferences
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['mode', 'theme', 'height', 'sensitivity', 'micActive'], (items) => {
      if (items.mode) state.mode = items.mode;
      if (items.theme) state.theme = items.theme;
      if (items.height) {
        state.height = items.height;
        host.style.height = `${state.height}px`;
        resizeCanvas();
      }
      if (items.sensitivity) state.sensitivity = items.sensitivity;
      if (items.micActive) startMicAudio();
    });
  }

  // Listen to Audio Frames from Injected Main-World Hook
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'AURAWAVE_AUDIO_FRAME' && event.data.data) {
      const incoming = event.data.data;
      const len = Math.min(incoming.length, liveFreqData.length);
      for (let i = 0; i < len; i++) {
        liveFreqData[i] = incoming[i];
      }
      lastAudioTimestamp = performance.now();
      hasActiveSignal = (event.data.volume || 0) > 1.5;
    }
  });

  // Microphone Audio Stream (Optional)
  async function startMicAudio() {
    try {
      if (!micAudioCtx) {
        micAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (micAudioCtx.state === 'suspended') {
        await micAudioCtx.resume();
      }
      if (!micAnalyser) {
        micAnalyser = micAudioCtx.createAnalyser();
        micAnalyser.fftSize = 128;
        micAnalyser.smoothingTimeConstant = 0.75;
        micGain = micAudioCtx.createGain();
        micGain.gain.value = state.sensitivity;
        micGain.connect(micAnalyser);

        const bufferLen = micAnalyser.frequencyBinCount;
        micDataArray = new Uint8Array(bufferLen);
        micTimeArray = new Uint8Array(bufferLen);
      }

      if (!micStream) {
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true }
        });
        const source = micAudioCtx.createMediaStreamSource(micStream);
        source.connect(micGain);
      }
      state.micActive = true;
    } catch (err) {
      console.warn('AuraWave: Microphone input unavailable.', err);
      state.micActive = false;
    }
  }

  function stopMicAudio() {
    if (micStream) {
      micStream.getTracks().forEach(t => t.stop());
      micStream = null;
    }
    state.micActive = false;
  }

  // Runtime Message Listener from Popup
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'SET_MODE') {
        state.mode = request.mode;
      } else if (request.action === 'SET_THEME') {
        state.theme = request.theme;
      } else if (request.action === 'SET_HEIGHT') {
        state.height = request.height;
        host.style.height = `${state.height}px`;
        resizeCanvas();
      } else if (request.action === 'SET_SENSITIVITY') {
        state.sensitivity = request.sensitivity;
        if (micGain) micGain.gain.value = state.sensitivity;
      } else if (request.action === 'TOGGLE_MIC') {
        if (state.micActive) stopMicAudio();
        else startMicAudio();
      } else if (request.action === 'TOGGLE_VISIBILITY') {
        state.visible = !state.visible;
        host.style.display = state.visible ? 'block' : 'none';
      }
      sendResponse({ status: 'OK', state });
      return true;
    });
  }

  // ==========================================
  // Canvas Visualizer Engine (High-Performance 60FPS)
  // ==========================================
  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let time = 0;

  const particles = [];
  const PARTICLE_COUNT = 40;

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = state.height;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    if (particles.length === 0) {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 0.8,
          radius: Math.random() * 2 + 1,
          alpha: Math.random() * 0.7 + 0.3
        });
      }
    }
  }

  window.addEventListener('resize', resizeCanvas);
  setTimeout(resizeCanvas, 50);

  // Render Loop
  function render() {
    requestAnimationFrame(render);
    if (!width || !height) {
      resizeCanvas();
      return;
    }

    time += 0.025;
    ctx.clearRect(0, 0, width, height);

    const colors = themeColors[state.theme] || themeColors.cyan;

    // Collect Audio from either Microphone or Page Hook
    let currentFreq = null;
    let currentTime = null;
    let isPlaying = false;

    if (state.micActive && micAnalyser && micDataArray) {
      micAnalyser.getByteFrequencyData(micDataArray);
      micAnalyser.getByteTimeDomainData(micTimeArray);
      currentFreq = micDataArray;
      currentTime = micTimeArray;

      let sum = 0;
      for (let i = 0; i < micDataArray.length; i++) {
        sum += micDataArray[i];
      }
      if (sum / micDataArray.length > 2) isPlaying = true;
    } else if (performance.now() - lastAudioTimestamp < 350 && hasActiveSignal) {
      currentFreq = liveFreqData;
      isPlaying = true;
    }

    // Metrics
    let bassEnergy = 0;
    let totalEnergy = 0;
    if (currentFreq && isPlaying) {
      const bassCount = Math.min(10, currentFreq.length);
      let bSum = 0;
      let tSum = 0;
      for (let i = 0; i < currentFreq.length; i++) {
        tSum += currentFreq[i];
        if (i < bassCount) bSum += currentFreq[i];
      }
      bassEnergy = (bSum / bassCount) / 255;
      totalEnergy = (tSum / currentFreq.length) / 255;
    }

    switch (state.mode) {
      case 'spectrum':
        renderSpectrum(ctx, width, height, colors, currentFreq, isPlaying, time);
        break;
      case 'aurora':
        renderAurora(ctx, width, height, colors, time, totalEnergy, isPlaying);
        break;
      case 'particles':
        renderParticles(ctx, width, height, colors, bassEnergy, isPlaying);
        break;
      case 'reactive':
        renderOscilloscope(ctx, width, height, colors, currentTime, isPlaying, time);
        break;
      case 'pulse':
      default:
        renderPulse(ctx, width, height, colors, time, bassEnergy, totalEnergy, isPlaying);
        break;
    }
  }

  // 1. Neon Flowing Waves (Default)
  function renderPulse(c, w, h, col, t, bass, energy, isPlaying) {
    const waveCount = 3;
    const dynamicAmp = isPlaying ? (1 + bass * 3.5) : 0.4;
    const dynamicGlow = isPlaying ? (12 + energy * 25) : 6;

    for (let j = 0; j < waveCount; j++) {
      c.beginPath();
      const speed = t * (0.9 + j * 0.4);
      const amp = (6 + j * 4) * dynamicAmp;
      const midY = h * 0.45;

      const grad = c.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.2, col.primary);
      grad.addColorStop(0.5, col.secondary);
      grad.addColorStop(0.8, col.primary);
      grad.addColorStop(1, 'rgba(0,0,0,0)');

      c.strokeStyle = grad;
      c.lineWidth = 2.4 - j * 0.4;
      c.shadowColor = col.glow;
      c.shadowBlur = dynamicGlow;

      for (let x = 0; x <= w; x += 14) {
        const y = midY + Math.sin(x * 0.008 + speed) * amp + Math.cos(x * 0.016 - speed * 0.8) * (amp * 0.5);
        if (x === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
    }
    c.shadowBlur = 0;
  }

  // 2. Equalizer Spectrum Bars with Live Frequency Reaction
  function renderSpectrum(c, w, h, col, freq, isPlaying, t) {
    const numBars = 56;
    const barWidth = Math.max(3, (w - (numBars * 4)) / numBars);
    const gap = 4;
    const startX = (w - (numBars * (barWidth + gap))) / 2;

    for (let i = 0; i < numBars; i++) {
      let normalizedHeight;
      if (isPlaying && freq) {
        const freqIndex = Math.floor(Math.pow(i / numBars, 1.3) * (freq.length * 0.9));
        const rawVal = freq[Math.min(freqIndex, freq.length - 1)];
        normalizedHeight = Math.min(1.0, (rawVal / 255) * 1.4);
      } else {
        // Idle baseline breathing wave
        const idleWave = Math.sin(t * 1.5 + i * 0.15);
        normalizedHeight = Math.max(0.06, Math.abs(idleWave * 0.12));
      }

      const barHeight = Math.max(3, normalizedHeight * (h * 0.85));
      const x = startX + i * (barWidth + gap);
      const y = h - barHeight - 2;

      // Peak Drop
      if (barHeight > peakBars[i]) {
        peakBars[i] = barHeight;
      } else {
        peakBars[i] = Math.max(3, peakBars[i] - 0.8);
      }

      const grad = c.createLinearGradient(x, y, x, h);
      grad.addColorStop(0, col.secondary);
      grad.addColorStop(1, col.primary);

      c.fillStyle = grad;
      c.shadowColor = col.glow;
      c.shadowBlur = isPlaying ? 8 : 2;
      c.beginPath();
      c.roundRect(x, y, barWidth, barHeight, 2);
      c.fill();

      // Peak Cap Dot
      if (isPlaying) {
        const peakY = h - peakBars[i] - 5;
        c.fillStyle = col.peak;
        c.beginPath();
        c.roundRect(x, Math.max(1, peakY), barWidth, 2, 1);
        c.fill();
      }
    }
    c.shadowBlur = 0;
  }

  // 3. Cyber Aurora Waves
  function renderAurora(c, w, h, col, t, energy, isPlaying) {
    const layers = 3;
    const dynamicAmp = isPlaying ? (1 + energy * 2.2) : 0.5;

    for (let l = 0; l < layers; l++) {
      c.beginPath();
      c.moveTo(0, h);
      const offset = l * 1.4;
      for (let x = 0; x <= w; x += 16) {
        const y = (h * 0.35) + (Math.sin(x * 0.005 + t * 0.8 + offset) * 12 + Math.sin(x * 0.012 - t * 0.5) * 7) * dynamicAmp;
        c.lineTo(x, y);
      }
      c.lineTo(w, h);
      c.closePath();

      const grad = c.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, l === 0 ? col.primary : col.secondary);
      grad.addColorStop(1, 'rgba(10, 15, 30, 0)');

      c.fillStyle = grad;
      c.globalAlpha = Math.min(0.85, (0.2 + l * 0.12) * (isPlaying ? (1 + energy) : 0.6));
      c.fill();
    }
    c.globalAlpha = 1.0;
  }

  // 4. Starlight Particle Field
  function renderParticles(c, w, h, col, bass, isPlaying) {
    c.fillStyle = col.secondary;
    const speedBoost = isPlaying ? (1 + bass * 3.5) : 0.6;
    c.shadowColor = col.glow;
    c.shadowBlur = isPlaying ? (8 + bass * 14) : 4;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx * speedBoost;
      p.y += p.vy * speedBoost;

      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;

      const dynamicRadius = p.radius * (isPlaying ? (1 + bass * 1.2) : 1);
      c.beginPath();
      c.arc(p.x, p.y, dynamicRadius, 0, Math.PI * 2);
      c.globalAlpha = p.alpha;
      c.fill();
    }
    c.globalAlpha = 1.0;
    c.shadowBlur = 0;
  }

  // 5. Oscilloscope Waveform Line
  function renderOscilloscope(c, w, h, col, timeData, isPlaying, t) {
    c.beginPath();
    const grad = c.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.2, col.primary);
    grad.addColorStop(0.5, col.secondary);
    grad.addColorStop(0.8, col.primary);
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    c.strokeStyle = grad;
    c.lineWidth = 2.6;
    c.shadowColor = col.glow;
    c.shadowBlur = isPlaying ? 14 : 4;

    if (isPlaying && timeData) {
      const sliceWidth = w / (timeData.length - 1);
      for (let i = 0; i < timeData.length; i++) {
        const v = (timeData[i] / 128.0) - 1.0;
        const y = (h * 0.45) + v * (h * 0.4);
        const x = i * sliceWidth;
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
    } else {
      for (let x = 0; x <= w; x += 12) {
        const y = (h * 0.45) + Math.sin(x * 0.015 + t * 2) * 3;
        if (x === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
    }
    c.stroke();
    c.shadowBlur = 0;
  }

  // Start Animation
  requestAnimationFrame(render);
})();
