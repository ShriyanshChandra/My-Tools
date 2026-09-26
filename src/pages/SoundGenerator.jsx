import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  Square as StopIcon,
  Volume2,
  VolumeX,
  Sliders,
  Radio,
  Download,
  Activity,
  Zap,
  Music,
  Sparkles,
  Palette,
  Check,
  ChevronUp,
  ChevronDown,
  CloudRain,
  CloudLightning,
  Flame,
  Wind
} from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import './SoundGenerator.css';

const PRESETS = [
  // --- Study & Focus Presets ---
  {
    name: 'Deep Study',
    tag: '17 Hz Beta',
    mode: 'stereo',
    leftFreq: 250,
    rightFreq: 267,
    type: 'sine',
    desc: 'Beta 17Hz entrainment for intense reading, coding & math.'
  },
  {
    name: 'General Focus',
    tag: '16 Hz Beta',
    mode: 'stereo',
    leftFreq: 250,
    rightFreq: 266,
    type: 'sine',
    desc: 'Beta 16Hz entrainment for active daily study & tasks.'
  },
  {
    name: 'Problem Solving',
    tag: '40 Hz Gamma',
    mode: 'stereo',
    leftFreq: 250,
    rightFreq: 290,
    type: 'sine',
    desc: 'Gamma 40Hz beat for logic, math & analytical processing.'
  },
  {
    name: 'Brainstorming',
    tag: '10 Hz Alpha',
    mode: 'stereo',
    leftFreq: 250,
    rightFreq: 260,
    type: 'sine',
    desc: 'Alpha 10Hz beat for creative ideation & thinking.'
  },
  {
    name: 'Creative Flow',
    tag: '9 Hz Alpha',
    mode: 'stereo',
    leftFreq: 250,
    rightFreq: 259,
    type: 'sine',
    desc: 'Alpha 9Hz beat for flow state writing & design.'
  },
  {
    name: 'Pre-Study Meditate',
    tag: '6.5 Hz Theta',
    mode: 'stereo',
    leftFreq: 200,
    rightFreq: 206.5,
    type: 'sine',
    desc: 'Theta 6.5Hz beat to clear mental chatter before study.'
  },
  {
    name: 'Post-Study Relax',
    tag: '9 Hz Alpha',
    mode: 'stereo',
    leftFreq: 250,
    rightFreq: 259,
    type: 'sine',
    desc: 'Alpha 9Hz beat to unwind after long study sessions.'
  },

  // --- Ambient Study Noise ---
  {
    name: 'Deep Study Noise',
    tag: 'Brown Noise',
    mode: 'mono',
    freq: 350,
    type: 'brown-noise',
    desc: 'Low-frequency brown noise to mask study distractions.'
  },
  {
    name: 'Creative Noise',
    tag: 'Pink Noise',
    mode: 'mono',
    freq: 800,
    type: 'pink-noise',
    desc: 'Balanced natural noise for reading & writing.'
  },

  // --- Meditation & Solfeggio Tones ---
  {
    name: 'DNA Harmony',
    tag: '528 Hz',
    mode: 'mono',
    freq: 528,
    type: 'sine',
    desc: 'Sacred Solfeggio 528Hz tone for transformation & peace.'
  },
  {
    name: 'Verdi Harmony',
    tag: '432 Hz',
    mode: 'mono',
    freq: 432,
    type: 'sine',
    desc: 'Harmonic 432Hz tuning for deep relaxation & meditation.'
  },
  {
    name: 'Mental Clarity',
    tag: '741 Hz',
    mode: 'mono',
    freq: 741,
    type: 'sine',
    desc: 'Solfeggio 741Hz tone to sharpen intuition & clear fog.'
  }
];

// Custom Flowing Water Stream Icon
const StreamIcon = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M2 7c3 0 3 2.5 6 2.5s3-2.5 6-2.5 3 2.5 6 2.5 3-2.5 4-2.5" />
    <path d="M2 12c3 0 3 2.5 6 2.5s3-2.5 6-2.5 3 2.5 6 2.5 3-2.5 4-2.5" />
    <path d="M2 17c3 0 3 2.5 6 2.5s3-2.5 6-2.5 3 2.5 6 2.5 3-2.5 4-2.5" />
  </svg>
);

// Custom Rolling Ocean Waves Icon
const OceanIcon = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M2 6c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2" />
    <path d="M2 12c2.5 0 2.5 2.5 5 2.5s2.5-2.5 5-2.5 2.5 2.5 5 2.5 2.5-2.5 5-2.5" />
    <path d="M2 18c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2" />
  </svg>
);

// Section 1: Background Ambient Sound Definitions (YouTube Audio Tracks)
const AMBIENT_SOUNDS = [
  {
    id: 'rain',
    name: 'Gentle Rain',
    icon: CloudRain,
    color: '#0099ff',
    defaultVol: 0.5,
    desc: 'Soothing rainfall ambience',
    youtubeId: 'umYE_5LYg5I'
  },
  {
    id: 'thunder',
    name: 'Thunderstorm & Rain',
    icon: CloudLightning,
    color: '#ffb703',
    defaultVol: 0.5,
    desc: 'Atmospheric storm & rolling thunder',
    youtubeId: '61WICqN28fI'
  },
  {
    id: 'ocean',
    name: 'Ocean Waves',
    icon: OceanIcon,
    color: '#38bdf8',
    defaultVol: 0.5,
    desc: 'Rhythmic crashing ocean swells',
    youtubeId: 'vPhg6sc1Mk4',
    start: 15
  },
  {
    id: 'fire',
    name: 'Cozy Fireplace',
    icon: Flame,
    color: '#ff3b30',
    defaultVol: 0.5,
    desc: 'Warm crackling hearth & wood fire',
    youtubeId: 'mSX3OyW9Rao'
  },
  {
    id: 'stream',
    name: 'Water Stream',
    icon: StreamIcon,
    color: '#00FA9A',
    defaultVol: 0.5,
    desc: 'Refreshing flowing water stream',
    youtubeId: 'UJZxtO9XNno',
    start: 13
  },
  {
    id: 'wind',
    name: 'Wind Breeze',
    icon: Wind,
    color: '#8a2be2',
    defaultVol: 0.5,
    desc: 'Soft howling & rustling wind breeze',
    youtubeId: 'sGkh1W5cbH4'
  }
];

const SoundGenerator = () => {
  // Page body class & console link suppressor
  useEffect(() => {
    document.body.classList.add('sound-page-active');

    const originalLog = console.log;
    const originalInfo = console.info;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalDebug = console.debug;

    const containsLink = (args) => {
      return args.some((arg) => {
        if (typeof arg === 'string') {
          return /https?:\/\/|www\.|youtube|yt|googlevideo|\.mp3|\.ogg/i.test(arg);
        }
        if (typeof arg === 'object' && arg !== null) {
          try {
            return /https?:\/\/|www\.|youtube|yt|googlevideo/i.test(JSON.stringify(arg));
          } catch {
            return false;
          }
        }
        return false;
      });
    };

    console.log = (...args) => { if (!containsLink(args)) originalLog.apply(console, args); };
    console.info = (...args) => { if (!containsLink(args)) originalInfo.apply(console, args); };
    console.warn = (...args) => { if (!containsLink(args)) originalWarn.apply(console, args); };
    console.error = (...args) => { if (!containsLink(args)) originalError.apply(console, args); };
    console.debug = (...args) => { if (!containsLink(args)) originalDebug.apply(console, args); };

    return () => {
      document.body.classList.remove('sound-page-active');
      console.log = originalLog;
      console.info = originalInfo;
      console.warn = originalWarn;
      console.error = originalError;
      console.debug = originalDebug;
    };
  }, []);

  // Section Master Enable Checkmark States
  const [section1Enabled, setSection1Enabled] = useState(true);
  const [section2Enabled, setSection2Enabled] = useState(true);

  // Section 1: Ambient Sounds States
  const [activeAmbiences, setActiveAmbiences] = useState({
    rain: false,
    thunder: false,
    ocean: false,
    fire: false,
    stream: false,
    wind: false
  });

  const [ambientVolumes, setAmbientVolumes] = useState({
    rain: 0.5,
    thunder: 0.5,
    ocean: 0.5,
    fire: 0.5,
    stream: 0.5,
    wind: 0.5
  });

  // Section 2: Frequency Generator Controls State
  const [isPlayingFreq, setIsPlayingFreq] = useState(false);
  const [channelMode, setChannelMode] = useState('mono'); // 'mono' | 'stereo'
  const [waveform, setWaveform] = useState('sine'); // 'sine' | 'square' | 'sawtooth' | 'triangle' | 'white-noise' | 'pink-noise' | 'brown-noise'

  // Frequency States (min 5 Hz, Integer only)
  const [monoFreq, setMonoFreq] = useState(440);
  const [monoFreqStr, setMonoFreqStr] = useState('440');

  const [leftFreq, setLeftFreq] = useState(440);
  const [leftFreqStr, setLeftFreqStr] = useState('440');

  const [rightFreq, setRightFreq] = useState(440);
  const [rightFreqStr, setRightFreqStr] = useState('440');

  const [syncStereoFreq, setSyncStereoFreq] = useState(true);

  // Volume & Balance States
  const [masterVolume, setMasterVolume] = useState(0.6);
  const [leftVolume, setLeftVolume] = useState(1.0);
  const [rightVolume, setRightVolume] = useState(1.0);
  const [pan, setPan] = useState(0);
  const [leftMuted, setLeftMuted] = useState(false);
  const [rightMuted, setRightMuted] = useState(false);

  // Visualizer Mode
  const [visualizerMode, setVisualizerMode] = useState('waveform');

  // Export State
  const [exportDuration, setExportDuration] = useState(5);
  const [isExporting, setIsExporting] = useState(false);

  // Web Audio Context & Nodes Refs
  const audioCtxRef = useRef(null);
  const masterGainRef = useRef(null);
  const analyserRef = useRef(null);

  // Frequency Generator Refs
  const monoOscRef = useRef(null);
  const monoNoiseBufferSourceRef = useRef(null);
  const monoFilterRef = useRef(null);
  const panNodeRef = useRef(null);

  const leftOscRef = useRef(null);
  const rightOscRef = useRef(null);
  const leftNoiseSourceRef = useRef(null);
  const rightNoiseSourceRef = useRef(null);
  const leftFilterRef = useRef(null);
  const rightFilterRef = useRef(null);
  const leftGainRef = useRef(null);
  const rightGainRef = useRef(null);
  const mergerRef = useRef(null);

  // Ambient Sound Nodes & Audio Element Refs
  const ambientNodesRef = useRef({});
  const ambientAudioRefs = useRef({});

  // Canvas visualizer Ref
  const canvasRef = useRef(null);
  const animFrameIdRef = useRef(null);

  // Theme toggle helper
  const [theme, setTheme] = useState(localStorage.getItem('app-theme') || 'neon');

  const toggleTheme = () => {
    const themeCycle = ['neon', 'tlou', 'wood', 'maple', 'snow', 'heisenberg', 'ghibli', 'tokyo'];
    const nextIndex = (themeCycle.indexOf(theme) + 1) % themeCycle.length;
    const newTheme = themeCycle[nextIndex];
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('app-theme', newTheme);
  };

  // Handlers for frequency input updates
  const updateMonoFreq = (val) => {
    const intVal = Math.max(5, Math.round(val));
    setMonoFreq(intVal);
    setMonoFreqStr(intVal.toString());
  };

  const updateLeftFreq = (val) => {
    const intVal = Math.max(5, Math.round(val));
    setLeftFreq(intVal);
    setLeftFreqStr(intVal.toString());
    if (syncStereoFreq) {
      setRightFreq(intVal);
      setRightFreqStr(intVal.toString());
    }
  };

  const updateRightFreq = (val) => {
    const intVal = Math.max(5, Math.round(val));
    setRightFreq(intVal);
    setRightFreqStr(intVal.toString());
    if (syncStereoFreq) {
      setLeftFreq(intVal);
      setLeftFreqStr(intVal.toString());
    }
  };

  const handleMonoInputChange = (e) => {
    const str = e.target.value;
    setMonoFreqStr(str);
    if (str.trim() !== '') {
      const parsed = parseInt(str, 10);
      if (!isNaN(parsed) && parsed >= 5) {
        setMonoFreq(parsed);
      }
    }
  };

  const handleMonoInputBlur = () => {
    const parsed = parseInt(monoFreqStr, 10);
    const finalVal = isNaN(parsed) || parsed < 5 ? 5 : parsed;
    setMonoFreq(finalVal);
    setMonoFreqStr(finalVal.toString());
  };

  const handleLeftInputChange = (e) => {
    const str = e.target.value;
    setLeftFreqStr(str);
    if (str.trim() !== '') {
      const parsed = parseInt(str, 10);
      if (!isNaN(parsed) && parsed >= 5) {
        setLeftFreq(parsed);
        if (syncStereoFreq) {
          setRightFreq(parsed);
          setRightFreqStr(parsed.toString());
        }
      }
    }
  };

  const handleLeftInputBlur = () => {
    const parsed = parseInt(leftFreqStr, 10);
    const finalVal = isNaN(parsed) || parsed < 5 ? 5 : parsed;
    setLeftFreq(finalVal);
    setLeftFreqStr(finalVal.toString());
    if (syncStereoFreq) {
      setRightFreq(finalVal);
      setRightFreqStr(finalVal.toString());
    }
  };

  const handleRightInputChange = (e) => {
    const str = e.target.value;
    setRightFreqStr(str);
    if (str.trim() !== '') {
      const parsed = parseInt(str, 10);
      if (!isNaN(parsed) && parsed >= 5) {
        setRightFreq(parsed);
        if (syncStereoFreq) {
          setLeftFreq(parsed);
          setLeftFreqStr(parsed.toString());
        }
      }
    }
  };

  const handleRightInputBlur = () => {
    const parsed = parseInt(rightFreqStr, 10);
    const finalVal = isNaN(parsed) || parsed < 5 ? 5 : parsed;
    setRightFreq(finalVal);
    setRightFreqStr(finalVal.toString());
    if (syncStereoFreq) {
      setLeftFreq(finalVal);
      setLeftFreqStr(finalVal.toString());
    }
  };

  // Helper to create noise audio buffers with peak normalization & seamless crossfade
  const createNoiseBuffer = (ctx, type) => {
    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);

    if (type === 'white-noise') {
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
    } else if (type === 'pink-noise') {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        let white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        b6 = white * 0.115926;
      }
    } else if (type === 'brown-noise') {
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        let white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.08 * white) / 1.02;
        output[i] = lastOut;
      }
    }

    let maxAmp = 0;
    for (let i = 0; i < bufferSize; i++) {
      const abs = Math.abs(output[i]);
      if (abs > maxAmp) maxAmp = abs;
    }
    if (maxAmp > 0) {
      const normFactor = 0.5 / maxAmp;
      for (let i = 0; i < bufferSize; i++) {
        output[i] *= normFactor;
      }
    }

    const fadeSamples = Math.floor(ctx.sampleRate * 0.1);
    for (let i = 0; i < fadeSamples; i++) {
      const alpha = i / fadeSamples;
      output[i] = output[i] * alpha + output[bufferSize - fadeSamples + i] * (1 - alpha);
    }

    return buffer;
  };

  // Get or initialize Audio Context
  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // Ensure Master Gain & Analyser are ready
  const getMasterChain = () => {
    const ctx = getAudioContext();
    if (!masterGainRef.current) {
      masterGainRef.current = ctx.createGain();
      analyserRef.current = ctx.createAnalyser();
      analyserRef.current.fftSize = 2048;
      masterGainRef.current.connect(analyserRef.current);
      analyserRef.current.connect(ctx.destination);
    }
    masterGainRef.current.gain.setValueAtTime(masterVolume, ctx.currentTime);
    return masterGainRef.current;
  };

  // Stop Frequency Generator Nodes
  const stopFreqNodes = () => {
    if (monoOscRef.current) {
      try { monoOscRef.current.stop(); } catch {}
      try { monoOscRef.current.disconnect(); } catch {}
      monoOscRef.current = null;
    }
    if (monoNoiseBufferSourceRef.current) {
      try { monoNoiseBufferSourceRef.current.stop(); } catch {}
      try { monoNoiseBufferSourceRef.current.disconnect(); } catch {}
      monoNoiseBufferSourceRef.current = null;
    }
    if (monoFilterRef.current) {
      try { monoFilterRef.current.disconnect(); } catch {}
      monoFilterRef.current = null;
    }
    if (leftOscRef.current) {
      try { leftOscRef.current.stop(); } catch {}
      try { leftOscRef.current.disconnect(); } catch {}
      leftOscRef.current = null;
    }
    if (rightOscRef.current) {
      try { rightOscRef.current.stop(); } catch {}
      try { rightOscRef.current.disconnect(); } catch {}
      rightOscRef.current = null;
    }
    if (leftNoiseSourceRef.current) {
      try { leftNoiseSourceRef.current.stop(); } catch {}
      try { leftNoiseSourceRef.current.disconnect(); } catch {}
      leftNoiseSourceRef.current = null;
    }
    if (rightNoiseSourceRef.current) {
      try { rightNoiseSourceRef.current.stop(); } catch {}
      try { rightNoiseSourceRef.current.disconnect(); } catch {}
      rightNoiseSourceRef.current = null;
    }
    if (leftFilterRef.current) {
      try { leftFilterRef.current.disconnect(); } catch {}
      leftFilterRef.current = null;
    }
    if (rightFilterRef.current) {
      try { rightFilterRef.current.disconnect(); } catch {}
      rightFilterRef.current = null;
    }
  };

  // Stop single ambient sound (YouTube iframe, audio element, or Web Audio synth node)
  const stopAmbientNode = (id) => {
    const ambDef = AMBIENT_SOUNDS.find((a) => a.id === id);
    if (ambDef && ambDef.youtubeId) {
      const iframe = document.getElementById(`yt-player-${id}`);
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }), '*');
      }
    }
    if (ambientAudioRefs.current[id]) {
      try {
        ambientAudioRefs.current[id].pause();
        ambientAudioRefs.current[id].currentTime = 0;
      } catch {}
      delete ambientAudioRefs.current[id];
    }
    if (ambientNodesRef.current[id]) {
      const n = ambientNodesRef.current[id];
      try { if (n.source) n.source.stop(); } catch {}
      try { if (n.source) n.source.disconnect(); } catch {}
      try { if (n.filter) n.filter.disconnect(); } catch {}
      try { if (n.gain) n.gain.disconnect(); } catch {}
      try { if (n.lfo) n.lfo.stop(); } catch {}
      try { if (n.lfo) n.lfo.disconnect(); } catch {}
      delete ambientNodesRef.current[id];
    }
  };

  // Stop all ambient nodes
  const stopAllAmbientNodes = () => {
    Object.keys(ambientAudioRefs.current).forEach((id) => stopAmbientNode(id));
    Object.keys(ambientNodesRef.current).forEach((id) => stopAmbientNode(id));
    AMBIENT_SOUNDS.filter((a) => a.youtubeId).forEach((a) => stopAmbientNode(a.id));
  };

  // Stop ALL sound nodes (Frequency + Ambient)
  const stopAllAudioNodes = () => {
    stopFreqNodes();
    stopAllAmbientNodes();
  };

  // Clean navigation back home handler
  const handleGoHome = () => {
    stopAllAudioNodes();
    setIsPlayingFreq(false);
    setActiveAmbiences({
      rain: false,
      thunder: false,
      ocean: false,
      fire: false,
      stream: false,
      wind: false
    });
  };

  // Web Audio Synthesizer Fallback Engine
  const startSynthAmbientSound = (id, vol) => {
    const ctx = getAudioContext();
    const masterGain = getMasterChain();

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(vol, ctx.currentTime);
    gainNode.connect(masterGain);

    if (id === 'rain') {
      const buffer = createNoiseBuffer(ctx, 'pink-noise');
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1600, ctx.currentTime);

      source.connect(filter);
      filter.connect(gainNode);
      source.start();

      ambientNodesRef.current[id] = { source, filter, gain: gainNode };
    } else if (id === 'ocean') {
      const buffer = createNoiseBuffer(ctx, 'brown-noise');
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(380, ctx.currentTime);

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.1, ctx.currentTime);

      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(250, ctx.currentTime);

      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();

      source.connect(filter);
      filter.connect(gainNode);
      source.start();

      ambientNodesRef.current[id] = { source, filter, gain: gainNode, lfo };
    } else if (id === 'fire') {
      const buffer = createNoiseBuffer(ctx, 'brown-noise');
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, ctx.currentTime);

      source.connect(filter);
      filter.connect(gainNode);
      source.start();

      ambientNodesRef.current[id] = { source, filter, gain: gainNode };
    } else {
      const buffer = createNoiseBuffer(ctx, 'brown-noise');
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, ctx.currentTime);

      source.connect(filter);
      filter.connect(gainNode);
      source.start();

      ambientNodesRef.current[id] = { source, filter, gain: gainNode };
    }
  };

  // Section 1: YouTube, Pixabay & Recorded Music Engine (with Synth Fallback)
  const startAmbientSound = (id, vol) => {
    if (!section1Enabled) return;
    const ambDef = AMBIENT_SOUNDS.find((a) => a.id === id);
    if (!ambDef) return;

    stopAmbientNode(id);

    if (ambDef.youtubeId) {
      const iframe = document.getElementById(`yt-player-${id}`);
      if (iframe && iframe.contentWindow) {
        if (ambDef.start) {
          iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [ambDef.start, true] }), '*');
        }
        iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [vol * 100] }), '*');
        iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: '' }), '*');
      }
      return;
    }

    if (ambDef.url) {
      try {
        const audio = new Audio(ambDef.url);
        audio.loop = true;
        audio.volume = vol;
        ambientAudioRefs.current[id] = audio;

        const ctx = getAudioContext();
        const masterGain = getMasterChain();

        try {
          const source = ctx.createMediaElementSource(audio);
          source.connect(masterGain);
        } catch {
          // Ignored if media element source already connected
        }

        audio.play().catch(() => {
          // Fallback to synth if audio element playback is blocked
          startSynthAmbientSound(id, vol);
        });
        return;
      } catch {
        // Ignored
      }
    }

    startSynthAmbientSound(id, vol);
  };

  // Toggle ambient sound on/off
  const toggleAmbientSound = (id) => {
    if (!section1Enabled) return;
    const isCurrentlyActive = activeAmbiences[id];
    const newActiveState = !isCurrentlyActive;

    setActiveAmbiences((prev) => ({ ...prev, [id]: newActiveState }));

    if (newActiveState) {
      startAmbientSound(id, ambientVolumes[id]);
    } else {
      stopAmbientNode(id);
    }
  };

  // Change individual ambient sound volume
  const handleAmbientVolumeChange = (id, newVol) => {
    setAmbientVolumes((prev) => ({ ...prev, [id]: newVol }));
    const ambDef = AMBIENT_SOUNDS.find((a) => a.id === id);
    if (ambDef && ambDef.youtubeId) {
      const iframe = document.getElementById(`yt-player-${id}`);
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [newVol * 100] }), '*');
      }
    }
    if (ambientAudioRefs.current[id]) {
      ambientAudioRefs.current[id].volume = newVol;
    }
    if (ambientNodesRef.current[id] && ambientNodesRef.current[id].gain) {
      ambientNodesRef.current[id].gain.gain.setTargetAtTime(newVol, audioCtxRef.current.currentTime, 0.01);
    }
  };

  // Section 2: Build frequency audio pipeline and start playing frequency sound
  const startSound = () => {
    const masterGain = getMasterChain();
    stopFreqNodes();

    const isNoise = waveform.includes('noise');

    if (channelMode === 'mono') {
      const ctx = audioCtxRef.current;
      if (ctx.createStereoPanner) {
        panNodeRef.current = ctx.createStereoPanner();
        panNodeRef.current.pan.setValueAtTime(pan, ctx.currentTime);
        panNodeRef.current.connect(masterGain);
      } else {
        panNodeRef.current = masterGain;
      }

      if (isNoise) {
        const noiseBuf = createNoiseBuffer(ctx, waveform);
        monoNoiseBufferSourceRef.current = ctx.createBufferSource();
        monoNoiseBufferSourceRef.current.buffer = noiseBuf;
        monoNoiseBufferSourceRef.current.loop = true;

        monoFilterRef.current = ctx.createBiquadFilter();
        monoFilterRef.current.type = 'lowpass';
        monoFilterRef.current.frequency.setValueAtTime(monoFreq, ctx.currentTime);

        monoNoiseBufferSourceRef.current.connect(monoFilterRef.current);
        monoFilterRef.current.connect(panNodeRef.current);
        monoNoiseBufferSourceRef.current.start();
      } else {
        monoOscRef.current = ctx.createOscillator();
        monoOscRef.current.type = waveform;
        monoOscRef.current.frequency.setValueAtTime(monoFreq, ctx.currentTime);
        monoOscRef.current.connect(panNodeRef.current);
        monoOscRef.current.start();
      }
    } else {
      // Stereo Mode
      const ctx = audioCtxRef.current;
      mergerRef.current = ctx.createChannelMerger(2);
      leftGainRef.current = ctx.createGain();
      rightGainRef.current = ctx.createGain();

      const lVol = leftMuted ? 0 : leftVolume;
      const rVol = rightMuted ? 0 : rightVolume;

      leftGainRef.current.gain.setValueAtTime(lVol, ctx.currentTime);
      rightGainRef.current.gain.setValueAtTime(rVol, ctx.currentTime);

      leftGainRef.current.connect(mergerRef.current, 0, 0);
      rightGainRef.current.connect(mergerRef.current, 0, 1);
      mergerRef.current.connect(masterGain);

      if (isNoise) {
        const lBuffer = createNoiseBuffer(ctx, waveform);
        const rBuffer = createNoiseBuffer(ctx, waveform);

        leftNoiseSourceRef.current = ctx.createBufferSource();
        leftNoiseSourceRef.current.buffer = lBuffer;
        leftNoiseSourceRef.current.loop = true;

        leftFilterRef.current = ctx.createBiquadFilter();
        leftFilterRef.current.type = 'lowpass';
        leftFilterRef.current.frequency.setValueAtTime(leftFreq, ctx.currentTime);

        leftNoiseSourceRef.current.connect(leftFilterRef.current);
        leftFilterRef.current.connect(leftGainRef.current);
        leftNoiseSourceRef.current.start();

        rightNoiseSourceRef.current = ctx.createBufferSource();
        rightNoiseSourceRef.current.buffer = rBuffer;
        rightNoiseSourceRef.current.loop = true;

        rightFilterRef.current = ctx.createBiquadFilter();
        rightFilterRef.current.type = 'lowpass';
        rightFilterRef.current.frequency.setValueAtTime(rightFreq, ctx.currentTime);

        rightNoiseSourceRef.current.connect(rightFilterRef.current);
        rightFilterRef.current.connect(rightGainRef.current);
        rightNoiseSourceRef.current.start();
      } else {
        leftOscRef.current = ctx.createOscillator();
        leftOscRef.current.type = waveform;
        leftOscRef.current.frequency.setValueAtTime(leftFreq, ctx.currentTime);
        leftOscRef.current.connect(leftGainRef.current);
        leftOscRef.current.start();

        rightOscRef.current = ctx.createOscillator();
        rightOscRef.current.type = waveform;
        rightOscRef.current.frequency.setValueAtTime(rightFreq, ctx.currentTime);
        rightOscRef.current.connect(rightGainRef.current);
        rightOscRef.current.start();
      }
    }

    setIsPlayingFreq(true);
  };

  // Toggle Frequency Generator Play / Stop
  const togglePlayFreq = () => {
    if (!section2Enabled) return;
    if (isPlayingFreq) {
      stopFreqNodes();
      setIsPlayingFreq(false);
    } else {
      startSound();
    }
  };

  // Live frequency updates while playing
  useEffect(() => {
    if (!isPlayingFreq || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;

    if (channelMode === 'mono') {
      if (monoOscRef.current) {
        monoOscRef.current.frequency.setTargetAtTime(monoFreq, ctx.currentTime, 0.01);
      }
      if (monoFilterRef.current) {
        monoFilterRef.current.frequency.setTargetAtTime(monoFreq, ctx.currentTime, 0.01);
      }
    }
    if (channelMode === 'stereo') {
      if (leftOscRef.current) {
        leftOscRef.current.frequency.setTargetAtTime(leftFreq, ctx.currentTime, 0.01);
      }
      if (leftFilterRef.current) {
        leftFilterRef.current.frequency.setTargetAtTime(leftFreq, ctx.currentTime, 0.01);
      }
      if (rightOscRef.current) {
        rightOscRef.current.frequency.setTargetAtTime(rightFreq, ctx.currentTime, 0.01);
      }
      if (rightFilterRef.current) {
        rightFilterRef.current.frequency.setTargetAtTime(rightFreq, ctx.currentTime, 0.01);
      }
    }
  }, [monoFreq, leftFreq, rightFreq, isPlayingFreq, channelMode]);

  // Live Waveform update
  useEffect(() => {
    if (!isPlayingFreq) return;
    startSound();
  }, [waveform, channelMode]);

  // Master Volume update
  useEffect(() => {
    if (masterGainRef.current && audioCtxRef.current) {
      masterGainRef.current.gain.setTargetAtTime(masterVolume, audioCtxRef.current.currentTime, 0.01);
    }
  }, [masterVolume]);

  // Pan update (Mono)
  useEffect(() => {
    if (panNodeRef.current && panNodeRef.current.pan && audioCtxRef.current) {
      panNodeRef.current.pan.setTargetAtTime(pan, audioCtxRef.current.currentTime, 0.01);
    }
  }, [pan]);

  // Channel volumes update (Stereo)
  useEffect(() => {
    if (!isPlayingFreq || channelMode !== 'stereo' || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (leftGainRef.current) {
      leftGainRef.current.gain.setTargetAtTime(leftMuted ? 0 : leftVolume, ctx.currentTime, 0.01);
    }
    if (rightGainRef.current) {
      rightGainRef.current.gain.setTargetAtTime(rightMuted ? 0 : rightVolume, ctx.currentTime, 0.01);
    }
  }, [leftVolume, rightVolume, leftMuted, rightMuted, isPlayingFreq, channelMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllAudioNodes();
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch {}
      }
    };
  }, []);

  // Visualizer Animation Canvas (Visualizes BOTH background sounds & frequency generator together!)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const draw = () => {
      animFrameIdRef.current = requestAnimationFrame(draw);
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
      bgGradient.addColorStop(0, 'rgba(10, 10, 30, 0.8)');
      bgGradient.addColorStop(1, 'rgba(5, 5, 15, 0.95)');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < width; x += 40) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += 40) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      const hasActiveSound = isPlayingFreq || Object.values(activeAmbiences).some((v) => v);

      if (!analyserRef.current || !hasActiveSound) {
        ctx.strokeStyle = 'rgba(0, 210, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '14px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Activate Background Sound or Frequency Generator to View Waveform', width / 2, height / 2 - 15);
        return;
      }

      if (visualizerMode === 'waveform') {
        const bufferLength = analyserRef.current.fftSize;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteTimeDomainData(dataArray);

        ctx.lineWidth = 3;
        const lineGrad = ctx.createLinearGradient(0, 0, width, 0);
        lineGrad.addColorStop(0, '#00d2ff');
        lineGrad.addColorStop(0.5, '#00FA9A');
        lineGrad.addColorStop(1, '#ff2a85');
        ctx.strokeStyle = lineGrad;
        ctx.shadowColor = '#00d2ff';
        ctx.shadowBlur = 10;

        ctx.beginPath();
        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        const barWidth = (width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          barHeight = (dataArray[i] / 255) * height;

          const barGrad = ctx.createLinearGradient(0, height, 0, height - barHeight);
          barGrad.addColorStop(0, 'rgba(0, 210, 255, 0.8)');
          barGrad.addColorStop(0.6, 'rgba(138, 43, 226, 0.8)');
          barGrad.addColorStop(1, 'rgba(255, 42, 133, 0.9)');

          ctx.fillStyle = barGrad;
          ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);

          x += barWidth + 1;
          if (x > width) break;
        }
      }
    };

    draw();

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isPlayingFreq, activeAmbiences, visualizerMode]);

  // Apply a preset to Frequency Generator
  const applyPreset = (preset) => {
    if (!section2Enabled) {
      setSection2Enabled(true);
    }
    setChannelMode(preset.mode);
    setWaveform(preset.type || 'sine');
    if (preset.mode === 'mono') {
      updateMonoFreq(preset.freq);
    } else {
      const isSynced = preset.leftFreq === preset.rightFreq;
      setSyncStereoFreq(isSynced);
      updateLeftFreq(preset.leftFreq);
      if (!isSynced) {
        updateRightFreq(preset.rightFreq);
      }
    }
    if (!isPlayingFreq) {
      setTimeout(() => startSound(), 50);
    }
  };

  // Convert AudioBuffer to WAV File for Download
  const audioBufferToWavBlob = (abuffer, duration) => {
    const numOfChan = abuffer.numberOfChannels;
    const sampleRate = abuffer.sampleRate;
    const format = 1;
    const bitDepth = 16;
    const numSamples = Math.floor(duration * sampleRate);
    const blockAlign = (numOfChan * bitDepth) / 8;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numSamples * blockAlign;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numOfChan, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    let offset = 44;
    const channels = [];
    for (let i = 0; i < numOfChan; i++) {
      channels.push(abuffer.getChannelData(i));
    }

    for (let i = 0; i < numSamples; i++) {
      for (let ch = 0; ch < numOfChan; ch++) {
        let sample = channels[ch][i] || 0;
        sample = Math.max(-1, Math.min(1, sample));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(offset, sample, true);
        offset += 2;
      }
    }

    return new Blob([buffer], { type: 'audio/wav' });
  };

  // Export Audio as WAV
  const exportWavFile = async () => {
    setIsExporting(true);
    try {
      const sampleRate = 44100;
      const offlineCtx = new OfflineAudioContext(
        channelMode === 'mono' ? 1 : 2,
        sampleRate * exportDuration,
        sampleRate
      );

      const isNoise = waveform.includes('noise');

      if (channelMode === 'mono') {
        const gain = offlineCtx.createGain();
        gain.gain.setValueAtTime(masterVolume, 0);

        let panner = gain;
        if (offlineCtx.createStereoPanner) {
          panner = offlineCtx.createStereoPanner();
          panner.pan.setValueAtTime(pan, 0);
          panner.connect(gain);
        }
        gain.connect(offlineCtx.destination);

        if (isNoise) {
          const noiseBuf = createNoiseBuffer(offlineCtx, waveform);
          const source = offlineCtx.createBufferSource();
          source.buffer = noiseBuf;
          source.loop = true;

          const filter = offlineCtx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(monoFreq, 0);

          source.connect(filter);
          filter.connect(panner);
          source.start(0);
        } else {
          const osc = offlineCtx.createOscillator();
          osc.type = waveform;
          osc.frequency.setValueAtTime(monoFreq, 0);
          osc.connect(panner);
          osc.start(0);
        }
      } else {
        const masterGain = offlineCtx.createGain();
        masterGain.gain.setValueAtTime(masterVolume, 0);
        masterGain.connect(offlineCtx.destination);

        const merger = offlineCtx.createChannelMerger(2);
        const lGain = offlineCtx.createGain();
        const rGain = offlineCtx.createGain();

        lGain.gain.setValueAtTime(leftMuted ? 0 : leftVolume, 0);
        rGain.gain.setValueAtTime(rightMuted ? 0 : rightVolume, 0);

        lGain.connect(merger, 0, 0);
        rGain.connect(merger, 0, 1);
        merger.connect(masterGain);

        if (isNoise) {
          const lBuf = createNoiseBuffer(offlineCtx, waveform);
          const rBuf = createNoiseBuffer(offlineCtx, waveform);

          const lSource = offlineCtx.createBufferSource();
          lSource.buffer = lBuf;
          lSource.loop = true;

          const lFilter = offlineCtx.createBiquadFilter();
          lFilter.type = 'lowpass';
          lFilter.frequency.setValueAtTime(leftFreq, 0);

          lSource.connect(lFilter);
          lFilter.connect(lGain);
          lSource.start(0);

          const rSource = offlineCtx.createBufferSource();
          rSource.buffer = rBuf;
          rSource.loop = true;

          const rFilter = offlineCtx.createBiquadFilter();
          rFilter.type = 'lowpass';
          rFilter.frequency.setValueAtTime(rightFreq, 0);

          rSource.connect(rFilter);
          rFilter.connect(rGain);
          rSource.start(0);
        } else {
          const lOsc = offlineCtx.createOscillator();
          lOsc.type = waveform;
          lOsc.frequency.setValueAtTime(leftFreq, 0);
          lOsc.connect(lGain);
          lOsc.start(0);

          const rOsc = offlineCtx.createOscillator();
          rOsc.type = waveform;
          rOsc.frequency.setValueAtTime(rightFreq, 0);
          rOsc.connect(rGain);
          rOsc.start(0);
        }
      }

      const renderedBuffer = await offlineCtx.startRendering();
      const wavBlob = audioBufferToWavBlob(renderedBuffer, exportDuration);

      const filename = `background-sound-${channelMode}-${
        channelMode === 'mono' ? monoFreq + 'Hz' : leftFreq + 'Hz-' + rightFreq + 'Hz'
      }.wav`;

      const downloadUrl = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Failed to export audio WAV:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Calculated binaural beat difference if stereo
  const binauralBeat = Math.round(Math.abs(leftFreq - rightFreq));

  return (
    <div className="sound-container">
      {/* Top Navbar */}
      <nav className="sound-nav glass">
        <Link to="/" className="back-link" onClick={handleGoHome}>
          <ArrowLeft size={20} />
          <span>Back to Home</span>
        </Link>
        <div className="sound-nav-title">
          <Radio className="title-icon" size={24} />
          <span>Background <span className="text-gradient">Sound Studio</span></span>
        </div>
        <button className="icon-btn" title="Change Theme" onClick={toggleTheme}>
          <Palette size={20} />
        </button>
      </nav>

      {/* Main Layout */}
      <main className="sound-main-layout">
        {/* Left Side: Section 1 & Section 2 Controls */}
        <div className="left-sections-column">
          {/* SECTION 1: Background Ambient Sounds */}
          <section className={`sound-section-card glass-panel ${!section1Enabled ? 'disabled-section' : ''}`}>
            <header className="section-card-header">
              <div className="section-title-wrap">
                <span className="section-badge">Section 1</span>
                <h2>Background Ambient Sounds</h2>
                <label className="section-enable-toggle" title="Enable / Disable Section 1">
                  <input
                    type="checkbox"
                    checked={section1Enabled}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSection1Enabled(checked);
                      if (!checked) {
                        stopAllAmbientNodes();
                        setActiveAmbiences({
                          rain: false,
                          thunder: false,
                          ocean: false,
                          fire: false,
                          stream: false,
                          wind: false
                        });
                      }
                    }}
                    className="sync-checkbox-input"
                  />
                  <span className={`sync-checkbox-custom ${section1Enabled ? 'checked' : ''}`}>
                    {section1Enabled && <Check size={14} className="check-icon" />}
                  </span>
                  <span className="section-enable-text">{section1Enabled ? 'Enabled' : 'Disabled'}</span>
                </label>
              </div>
              <p>Mix ambient nature & background sounds with your focus audio.</p>
            </header>

            <div className="ambient-grid">
              {AMBIENT_SOUNDS.map((amb) => {
                const IconComponent = amb.icon;
                const isActive = activeAmbiences[amb.id];
                const volume = ambientVolumes[amb.id];

                return (
                  <div key={amb.id} className={`ambient-card ${isActive ? 'active' : ''}`}>
                    <div className="amb-header">
                      <div className="amb-icon-wrap" style={{ color: amb.color }}>
                        <IconComponent size={20} />
                      </div>
                      <div className="amb-info">
                        <div className="amb-name">{amb.name}</div>
                        <div className="amb-desc">{amb.desc}</div>
                      </div>
                      <button
                        className={`amb-toggle-btn ${isActive ? 'playing' : ''}`}
                        onClick={() => toggleAmbientSound(amb.id)}
                        disabled={!section1Enabled}
                      >
                        {isActive ? <StopIcon size={16} /> : <Play size={16} />}
                      </button>
                    </div>

                    {isActive && (
                      <div className="amb-vol-wrap">
                        <Volume2 size={14} className="vol-icon" />
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={volume}
                          onChange={(e) => handleAmbientVolumeChange(amb.id, parseFloat(e.target.value))}
                          className="sound-slider amb-slider"
                          disabled={!section1Enabled}
                        />
                        <span className="vol-text">{Math.round(volume * 100)}%</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* SECTION 2: Custom Frequency & Binaural Sound Generator */}
          <section className={`sound-section-card glass-panel ${!section2Enabled ? 'disabled-section' : ''}`}>
            <header className="section-card-header">
              <div className="section-title-wrap">
                <span className="section-badge alt">Section 2</span>
                <h2>Custom Frequency & Binaural Generator</h2>
                <label className="section-enable-toggle" title="Enable / Disable Section 2">
                  <input
                    type="checkbox"
                    checked={section2Enabled}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSection2Enabled(checked);
                      if (!checked) {
                        stopFreqNodes();
                        setIsPlayingFreq(false);
                      }
                    }}
                    className="sync-checkbox-input"
                  />
                  <span className={`sync-checkbox-custom ${section2Enabled ? 'checked' : ''}`}>
                    {section2Enabled && <Check size={14} className="check-icon" />}
                  </span>
                  <span className="section-enable-text">{section2Enabled ? 'Enabled' : 'Disabled'}</span>
                </label>
              </div>
              <p>Configure pure tone frequencies, channel modes & binaural entrainment beats.</p>
            </header>

            {/* Mode Selector (Mono vs Stereo) */}
            <div className="control-group">
              <label className="group-title">
                <Sliders size={18} /> Channel Mode
              </label>
              <div className="mode-toggle-buttons">
                <button
                  className={`mode-btn ${channelMode === 'mono' ? 'active' : ''}`}
                  onClick={() => setChannelMode('mono')}
                >
                  <Radio size={16} />
                  <span>Mono Mode</span>
                </button>
                <button
                  className={`mode-btn ${channelMode === 'stereo' ? 'active' : ''}`}
                  onClick={() => setChannelMode('stereo')}
                >
                  <Zap size={16} />
                  <span>Stereo (Dual Freq / Binaural)</span>
                </button>
              </div>
            </div>

            {/* Waveform Selector */}
            <div className="control-group">
              <label className="group-title">
                <Activity size={18} /> Waveform Type
              </label>
              <div className="waveform-grid">
                {[
                  { id: 'sine', label: 'Sine Tone' },
                  { id: 'square', label: 'Square Wave' },
                  { id: 'sawtooth', label: 'Sawtooth Wave' },
                  { id: 'triangle', label: 'Triangle Wave' },
                  { id: 'white-noise', label: 'White Noise' },
                  { id: 'pink-noise', label: 'Pink Noise' },
                  { id: 'brown-noise', label: 'Brown Noise' }
                ].map((w) => (
                  <button
                    key={w.id}
                    className={`wave-btn ${waveform === w.id ? 'active' : ''}`}
                    onClick={() => setWaveform(w.id)}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Frequency Sliders & Inputs */}
            {channelMode === 'mono' ? (
              <div className="control-group frequency-section">
                <div className="freq-header">
                  <label className="group-title">
                    <Music size={18} /> Frequency (Hz)
                  </label>
                  <div className="freq-input-wrap">
                    <input
                      type="number"
                      min="5"
                      max="20000"
                      step="1"
                      value={monoFreqStr}
                      onChange={handleMonoInputChange}
                      onBlur={handleMonoInputBlur}
                      className="freq-number-input"
                    />
                    <div className="custom-spin-btns">
                      <button
                        type="button"
                        className="spin-btn"
                        onClick={() => updateMonoFreq(monoFreq + 1)}
                        title="Increase Frequency"
                      >
                        <ChevronUp size={11} />
                      </button>
                      <button
                        type="button"
                        className="spin-btn"
                        onClick={() => updateMonoFreq(monoFreq - 1)}
                        title="Decrease Frequency"
                      >
                        <ChevronDown size={11} />
                      </button>
                    </div>
                    <span className="unit">Hz</span>
                  </div>
                </div>

                <input
                  type="range"
                  min="5"
                  max="20000"
                  step="1"
                  value={monoFreq}
                  onChange={(e) => updateMonoFreq(parseInt(e.target.value, 10))}
                  className="sound-slider"
                />

                <div className="quick-freq-btns">
                  {[5, 10, 60, 262, 432, 440, 528, 1000, 4400, 10000, 20000].map((f) => (
                    <button
                      key={f}
                      className={`chip-btn ${monoFreq === f ? 'active' : ''}`}
                      onClick={() => updateMonoFreq(f)}
                    >
                      {f >= 1000 ? `${f / 1000}kHz` : `${f}Hz`}
                    </button>
                  ))}
                </div>

                {/* Mono Pan Slider */}
                <div className="sub-control">
                  <div className="sub-header">
                    <span>Pan Balance</span>
                    <span>{pan === 0 ? 'Center' : pan < 0 ? `L ${Math.abs(Math.round(pan * 100))}%` : `R ${Math.round(pan * 100)}%`}</span>
                  </div>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.05"
                    value={pan}
                    onChange={(e) => setPan(parseFloat(e.target.value))}
                    className="sound-slider"
                  />
                </div>
              </div>
            ) : (
              <div className="control-group frequency-section stereo-section">
                {/* Stereo Sync Checkbox Bar */}
                <div className="sync-freq-bar">
                  <label className="sync-checkbox-label">
                    <input
                      type="checkbox"
                      checked={syncStereoFreq}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSyncStereoFreq(checked);
                        if (checked) {
                          updateRightFreq(leftFreq);
                        }
                      }}
                      className="sync-checkbox-input"
                    />
                    <span className={`sync-checkbox-custom ${syncStereoFreq ? 'checked' : ''}`}>
                      {syncStereoFreq && <Check size={14} className="check-icon" />}
                    </span>
                    <span className="sync-label-text">
                      Same frequency for both channels {syncStereoFreq ? `(${leftFreq} Hz)` : '(Independent)'}
                    </span>
                  </label>
                </div>

                {/* Binaural Beat Banner */}
                {!syncStereoFreq && (
                  <div className="binaural-badge">
                    <Sparkles size={16} />
                    <span>
                      Binaural Beat Difference: <strong>{binauralBeat} Hz</strong>
                    </span>
                  </div>
                )}

                {/* Left Channel Controls */}
                <div className="channel-box left-channel">
                  <div className="channel-title">
                    <span className="ch-tag left">Left Channel</span>
                    <button
                      className={`mute-btn ${leftMuted ? 'muted' : ''}`}
                      onClick={() => setLeftMuted(!leftMuted)}
                    >
                      {leftMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                  </div>
                  <div className="freq-header">
                    <div className="freq-input-wrap">
                      <input
                        type="number"
                        min="5"
                        max="20000"
                        step="1"
                        value={leftFreqStr}
                        onChange={handleLeftInputChange}
                        onBlur={handleLeftInputBlur}
                        className="freq-number-input"
                      />
                      <div className="custom-spin-btns">
                        <button
                          type="button"
                          className="spin-btn"
                          onClick={() => updateLeftFreq(leftFreq + 1)}
                          title="Increase Frequency"
                        >
                          <ChevronUp size={11} />
                        </button>
                        <button
                          type="button"
                          className="spin-btn"
                          onClick={() => updateLeftFreq(leftFreq - 1)}
                          title="Decrease Frequency"
                        >
                          <ChevronDown size={11} />
                        </button>
                      </div>
                      <span className="unit">Hz</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="20000"
                    step="1"
                    value={leftFreq}
                    onChange={(e) => updateLeftFreq(parseInt(e.target.value, 10))}
                    className="sound-slider left-slider"
                  />
                  <div className="sub-header">
                    <span>Left Volume</span>
                    <span>{Math.round(leftVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={leftVolume}
                    onChange={(e) => setLeftVolume(parseFloat(e.target.value))}
                    className="sound-slider"
                  />
                </div>

                {/* Right Channel Controls */}
                <div className="channel-box right-channel">
                  <div className="channel-title">
                    <span className="ch-tag right">Right Channel</span>
                    <button
                      className={`mute-btn ${rightMuted ? 'muted' : ''}`}
                      onClick={() => setRightMuted(!rightMuted)}
                    >
                      {rightMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                  </div>
                  <div className="freq-header">
                    <div className="freq-input-wrap">
                      <input
                        type="number"
                        min="5"
                        max="20000"
                        step="1"
                        value={rightFreqStr}
                        onChange={handleRightInputChange}
                        onBlur={handleRightInputBlur}
                        className="freq-number-input"
                      />
                      <div className="custom-spin-btns">
                        <button
                          type="button"
                          className="spin-btn"
                          onClick={() => updateRightFreq(rightFreq + 1)}
                          title="Increase Frequency"
                        >
                          <ChevronUp size={11} />
                        </button>
                        <button
                          type="button"
                          className="spin-btn"
                          onClick={() => updateRightFreq(rightFreq - 1)}
                          title="Decrease Frequency"
                        >
                          <ChevronDown size={11} />
                        </button>
                      </div>
                      <span className="unit">Hz</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="20000"
                    step="1"
                    value={rightFreq}
                    onChange={(e) => updateRightFreq(parseInt(e.target.value, 10))}
                    className="sound-slider right-slider"
                  />
                  <div className="sub-header">
                    <span>Right Volume</span>
                    <span>{Math.round(rightVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={rightVolume}
                    onChange={(e) => setRightVolume(parseFloat(e.target.value))}
                    className="sound-slider"
                  />
                </div>
              </div>
            )}

            {/* Frequency Generator Playback Button */}
            <div className="playback-actions">
              <button
                className={`btn play-btn ${isPlayingFreq ? 'playing' : ''}`}
                onClick={togglePlayFreq}
              >
                {isPlayingFreq ? (
                  <>
                    <StopIcon size={22} /> Stop Frequency Tone
                  </>
                ) : (
                  <>
                    <Play size={22} /> Play Frequency Tone
                  </>
                )}
              </button>
            </div>
          </section>
        </div>

        {/* Right Side: Visualizer, Presets & Export */}
        <div className="right-visuals-column">
          {/* Audio Visualizer Card */}
          <div className="visualizer-card glass-panel">
            <div className="vis-header">
              <div className="vis-title">
                <Activity size={20} />
                <span>Live Mix Audio Oscilloscope</span>
              </div>
              <div className="vis-tabs">
                <button
                  className={`vis-tab ${visualizerMode === 'waveform' ? 'active' : ''}`}
                  onClick={() => setVisualizerMode('waveform')}
                >
                  Waveform
                </button>
                <button
                  className={`vis-tab ${visualizerMode === 'spectrum' ? 'active' : ''}`}
                  onClick={() => setVisualizerMode('spectrum')}
                >
                  Spectrum
                </button>
              </div>
            </div>

            <div className="canvas-wrapper">
              <canvas ref={canvasRef} width={640} height={220} className="visualizer-canvas" />
            </div>
          </div>

          {/* Master Output Volume */}
          <div className="master-vol-card glass-panel">
            <div className="sub-header">
              <label className="group-title">
                {masterVolume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />} Master Studio Output Volume
              </label>
              <span>{Math.round(masterVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={masterVolume}
              onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
              className="sound-slider master-slider"
            />
          </div>

          {/* Frequency & Tone Presets */}
          <div className="presets-card glass-panel">
            <div className="vis-header">
              <div className="vis-title">
                <Sparkles size={20} />
                <span>Study & Focus Presets</span>
              </div>
            </div>
            <div className="presets-grid-minimal">
              {PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  className="preset-chip"
                  onClick={() => applyPreset(preset)}
                  title={preset.desc}
                >
                  <div className="preset-chip-header">
                    <span className="preset-chip-name">{preset.name}</span>
                    <span className="preset-chip-tag">{preset.tag}</span>
                  </div>
                  <div className="preset-chip-detail">
                    {preset.mode === 'mono' ? `${preset.freq} Hz (Mono)` : `L:${preset.leftFreq}Hz / R:${preset.rightFreq}Hz`}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Export Audio File (WAV Download) */}
          <div className="export-card glass-panel">
            <div className="vis-header">
              <div className="vis-title">
                <Download size={20} />
                <span>Export Sound File</span>
              </div>
            </div>
            <p className="export-desc">
              Render and download your configured sound setting as an uncompressed high-quality <strong>WAV audio file</strong>.
            </p>
            <div className="export-controls">
              <div className="duration-select">
                <label>Duration:</label>
                <CustomSelect
                  value={exportDuration}
                  onChange={(val) => setExportDuration(parseInt(val, 10))}
                  options={[
                    { value: 1, label: '1 Second' },
                    { value: 5, label: '5 Seconds' },
                    { value: 10, label: '10 Seconds' },
                    { value: 30, label: '30 Seconds' },
                    { value: 60, label: '60 Seconds (1 Minute)' }
                  ]}
                  style={{ minWidth: '11rem' }}
                />
              </div>
              <button
                className="btn btn-primary export-btn"
                onClick={exportWavFile}
                disabled={isExporting}
              >
                <Download size={18} />
                {isExporting ? 'Generating WAV...' : 'Download WAV File'}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Hidden YouTube Players for YouTube Audio Tracks */}
      <div style={{ display: 'none' }}>
        {AMBIENT_SOUNDS.filter((a) => a.youtubeId).map((amb) => (
          <iframe
            key={amb.id}
            id={`yt-player-${amb.id}`}
            src={`https://www.youtube.com/embed/${amb.youtubeId}?enablejsapi=1&version=3&playerapiid=ytplayer&loop=1&playlist=${amb.youtubeId}${amb.start ? `&start=${amb.start}` : ''}`}
            allow="autoplay"
            title={amb.name}
          />
        ))}
      </div>
    </div>
  );
};

export default SoundGenerator;
