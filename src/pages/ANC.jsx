import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Headphones,
  Mic,
  Volume2,
  VolumeX,
  Sliders,
  Play,
  Square,
  RefreshCw,
  Radio,
  Layers,
  Cpu,
  Sparkles,
  AlertTriangle,
  Info,
  Activity,
  Waves,
  ShieldAlert
} from 'lucide-react';
import { ANCAudioEngine } from '../utils/ancAudioEngine';
import CustomSelect from '../components/CustomSelect';
import './ANC.css';
import '../App.css';

const ANC_PRESETS = [
  {
    id: 'fan_drone',
    name: 'Desk Fan / AC Drone',
    tag: '120-400 Hz Low Drone',
    desc: 'Targets low-frequency aerodynamic fan blades, motor hum, and air conditioner turbulence.',
    sourceMode: 'synth',
    synthType: 'fan_drone',
    synthFreq: 180,
    antiGain: 1.0,
    delayMs: 0.0,
    phaseDeg: 180,
    hpf: 30,
    lpf: 600,
    notch1Enabled: true,
    notch1Freq: 120,
    notch1Q: 8,
    notch2Enabled: false,
    notch2Freq: 240,
    notch2Q: 8,
    maskingType: 'pink',
    maskingVol: 0.15
  },
  {
    id: 'mains_hum',
    name: '60 Hz Mains Electrical Hum',
    tag: '50/60 Hz Harmonics',
    desc: 'Targets AC power line ground hum, amplifier buzz, and transformer vibration.',
    sourceMode: 'synth',
    synthType: 'mains_hum',
    synthFreq: 60,
    antiGain: 1.0,
    delayMs: 0.0,
    phaseDeg: 180,
    hpf: 20,
    lpf: 450,
    notch1Enabled: true,
    notch1Freq: 60,
    notch1Q: 12,
    notch2Enabled: true,
    notch2Freq: 120,
    notch2Q: 10,
    maskingType: 'brown',
    maskingVol: 0.05
  },
  {
    id: 'jet_cabin',
    name: 'Airplane Cabin Rumble',
    tag: 'Sub-Bass Turbofan',
    desc: 'Attenuates deep continuous rumble and aircraft fuselage air resistance.',
    sourceMode: 'synth',
    synthType: 'jet_cabin',
    synthFreq: 140,
    antiGain: 1.1,
    delayMs: 0.0,
    phaseDeg: 180,
    hpf: 25,
    lpf: 500,
    notch1Enabled: false,
    notch1Freq: 90,
    notch1Q: 6,
    notch2Enabled: false,
    notch2Freq: 180,
    notch2Q: 6,
    maskingType: 'brown',
    maskingVol: 0.25
  },
  {
    id: 'sine_destructive',
    name: 'Pure Tone Destructive Demo',
    tag: '1000 Hz Interference Lab',
    desc: 'Educational proof-of-concept showing complete acoustic wave nullification.',
    sourceMode: 'synth',
    synthType: 'sine_tone',
    synthFreq: 1000,
    antiGain: 1.0,
    delayMs: 0.0,
    phaseDeg: 180,
    hpf: 50,
    lpf: 2500,
    notch1Enabled: false,
    notch1Freq: 1000,
    notch1Q: 10,
    notch2Enabled: false,
    notch2Freq: 2000,
    notch2Q: 10,
    maskingType: 'pink',
    maskingVol: 0.0
  },
  {
    id: 'live_mic_ambient',
    name: 'Live Microphone Real-Time ANC',
    tag: 'Microphone Input',
    desc: 'Captures your room microphone audio in real-time and produces inverted anti-phase soundwaves.',
    sourceMode: 'mic',
    synthType: 'fan_drone',
    synthFreq: 120,
    antiGain: 1.0,
    delayMs: 1.2,
    phaseDeg: 180,
    hpf: 35,
    lpf: 1200,
    notch1Enabled: true,
    notch1Freq: 60,
    notch1Q: 8,
    notch2Enabled: true,
    notch2Freq: 120,
    notch2Q: 8,
    maskingType: 'pink',
    maskingVol: 0.1
  }
];

export default function ANC() {
  const [engine] = useState(() => new ANCAudioEngine());
  const [isActive, setIsActive] = useState(false);
  const [activePreset, setActivePreset] = useState('fan_drone');
  const [sourceMode, setSourceMode] = useState('synth'); // 'mic' | 'synth'
  const [synthNoiseType, setSynthNoiseType] = useState('fan_drone');
  const [synthFrequency, setSynthFrequency] = useState(180);

  // Audio Device Selection
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  // DSP Controls
  const [antiGain, setAntiGain] = useState(1.0);
  const [micSensitivity, setMicSensitivity] = useState(1.0);
  const [delayMs, setDelayMs] = useState(0.0);
  const [phaseDegrees, setPhaseDegrees] = useState(180);
  const [isInverted, setIsInverted] = useState(true);
  const [isBypassed, setIsBypassed] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Filters
  const [hpfFreq, setHpfFreq] = useState(30);
  const [lpfFreq, setLpfFreq] = useState(600);
  const [notch1Enabled, setNotch1Enabled] = useState(true);
  const [notch1Freq, setNotch1Freq] = useState(120);
  const [notch1Q, setNotch1Q] = useState(8);
  const [notch2Enabled, setNotch2Enabled] = useState(false);
  const [notch2Freq, setNotch2Freq] = useState(240);
  const [notch2Q, setNotch2Q] = useState(8);

  // Hybrid Masking
  const [maskingType, setMaskingType] = useState('pink');
  const [maskingVolume, setMaskingVolume] = useState(0.15);

  // Visualizer & Telemetry
  const [visualizerTab, setVisualizerTab] = useState('oscilloscope'); // 'oscilloscope' | 'spectrum'
  const [timeWindowMs, setTimeWindowMs] = useState(20);
  const [isWaveformFrozen, setIsWaveformFrozen] = useState(false);
  const [waveformZoom, setWaveformZoom] = useState(1.5);
  const [showInputTrace, setShowInputTrace] = useState(true);
  const [showAntiTrace, setShowAntiTrace] = useState(true);
  const [showResidualTrace, setShowResidualTrace] = useState(true);

  // Telemetry state
  const [metrics, setMetrics] = useState({
    inputRmsDb: -60,
    combinedRmsDb: -60,
    attenuationDb: 0,
    cancellationDepthPercent: 0,
    coherencePercent: 85,
    dominantFreq: 0,
    estimatedLatencyMs: 10.0
  });

  // State flags & Helpers
  const [isSamplingNoise, setIsSamplingNoise] = useState(false);
  const [isDelaySweeping, setIsDelaySweeping] = useState(false);
  const [feedbackWarningVisible, setFeedbackWarningVisible] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [activeControlTab, setActiveControlTab] = useState('dsp'); // 'dsp' | 'filters' | 'masking' | 'generator'
  const [permissionError, setPermissionError] = useState(null);

  // Engine Backend Selector ('webaudio' | 'python')
  const [engineType, setEngineType] = useState('webaudio');
  const [pythonWsStatus, setPythonWsStatus] = useState('disconnected'); // 'disconnected' | 'connecting' | 'connected'
  const [pythonMetrics, setPythonMetrics] = useState(null);
  const pythonWsRef = useRef(null);

  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const sweepIntervalRef = useRef(null);

  // Connect to Native Python CoreAudio WebSocket Engine
  const connectPythonWebSocket = useCallback(() => {
    if (pythonWsRef.current && (pythonWsRef.current.readyState === WebSocket.OPEN || pythonWsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    setPythonWsStatus('connecting');
    try {
      const ws = new WebSocket('ws://localhost:8765');
      pythonWsRef.current = ws;

      ws.onopen = () => {
        setPythonWsStatus('connected');
        ws.send(JSON.stringify({ cmd: 'get_status' }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'telemetry' && data.metrics) {
            setPythonMetrics(data);
            setMetrics(prev => ({
              ...prev,
              attenuationDb: data.metrics.attenuation_db,
              cancellationDepthPercent: data.metrics.cancellation_depth_percent,
              estimatedLatencyMs: data.metrics.latency_ms,
              inputRmsDb: data.metrics.input_rms_db,
              combinedRmsDb: data.metrics.residual_rms_db
            }));
          }
        } catch {
          // Ignore parse errors
        }
      };

      ws.onclose = () => {
        setPythonWsStatus('disconnected');
        pythonWsRef.current = null;
      };

      ws.onerror = () => {
        setPythonWsStatus('disconnected');
      };
    } catch {
      setPythonWsStatus('disconnected');
    }
  }, []);

  // Send control parameter updates to Python Engine
  const sendPythonCommand = useCallback((payload) => {
    if (pythonWsRef.current && pythonWsRef.current.readyState === WebSocket.OPEN) {
      pythonWsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  useEffect(() => {
    if (engineType === 'python') {
      connectPythonWebSocket();
    } else {
      if (pythonWsRef.current) {
        pythonWsRef.current.close();
        pythonWsRef.current = null;
      }
      setPythonWsStatus('disconnected');
    }
  }, [engineType, connectPythonWebSocket]);

  // Populate Audio Input Devices
  const refreshAudioDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices
        .filter(d => d.kind === 'audioinput')
        .map(d => ({
          value: d.deviceId,
          label: d.label || `Microphone ${d.deviceId.slice(0, 5)}...`
        }));
      setAudioDevices(audioInputs);
      if (audioInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(audioInputs[0].value);
      }
    } catch {
      // Ignore device enumeration issues
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    refreshAudioDevices();
    engine.onFeedbackAlert = () => {
      setFeedbackWarningVisible(true);
      setIsMuted(true);
      engine.setMute(true);
    };

    const animRef = animationFrameRef;
    const sweepRef = sweepIntervalRef;

    return () => {
      engine.stop();
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (sweepRef.current) clearInterval(sweepRef.current);
    };
  }, [engine, refreshAudioDevices]);

  // Master Start / Stop Handler
  const toggleEngine = async () => {
    setPermissionError(null);

    if (engineType === 'python') {
      if (pythonWsStatus !== 'connected') {
        connectPythonWebSocket();
        return;
      }
      if (isActive) {
        sendPythonCommand({ cmd: 'stop' });
        setIsActive(false);
      } else {
        sendPythonCommand({
          cmd: 'start',
          delay_ms: delayMs,
          anti_gain: antiGain,
          is_inverted: isInverted,
          is_bypassed: isBypassed,
          is_muted: isMuted,
          lpf: lpfFreq,
          hpf: hpfFreq,
          notch1_f: notch1Freq,
          notch1_on: notch1Enabled
        });
        setIsActive(true);
      }
      return;
    }

    if (isActive) {
      engine.stop();
      setIsActive(false);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    } else {
      try {
        await engine.start(sourceMode, selectedDeviceId);
        // Apply current states
        engine.setAntiGain(antiGain);
        engine.setMicSensitivity(micSensitivity);
        engine.setDelayMs(delayMs);
        engine.setPhaseDegrees(phaseDegrees);
        engine.setInverted(isInverted);
        engine.setBypass(isBypassed);
        engine.setMute(isMuted);
        engine.setHpfFreq(hpfFreq);
        engine.setLpfFreq(lpfFreq);
        engine.setNotch1(notch1Enabled, notch1Freq, notch1Q);
        engine.setNotch2(notch2Enabled, notch2Freq, notch2Q);
        engine.setMasking(maskingType, maskingVolume);
        engine.setSynthConfig(synthNoiseType, synthFrequency);

        setIsActive(true);
        refreshAudioDevices();
      } catch (err) {
        console.error('Error starting audio engine:', err);
        setPermissionError(
          sourceMode === 'mic'
            ? 'Microphone access denied or unavailable. Please grant microphone permissions in browser settings or switch to Virtual Chamber mode.'
            : 'Failed to initialize Web Audio system.'
        );
      }
    }
  };

  // Preset Applicator
  const applyPreset = (presetId) => {
    const preset = ANC_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    setActivePreset(presetId);
    setSourceMode(preset.sourceMode);
    setSynthNoiseType(preset.synthType);
    setSynthFrequency(preset.synthFreq);
    setAntiGain(preset.antiGain);
    setDelayMs(preset.delayMs);
    setPhaseDegrees(preset.phaseDeg);
    setHpfFreq(preset.hpf);
    setLpfFreq(preset.lpf);
    setNotch1Enabled(preset.notch1Enabled);
    setNotch1Freq(preset.notch1Freq);
    setNotch1Q(preset.notch1Q);
    setNotch2Enabled(preset.notch2Enabled);
    setNotch2Freq(preset.notch2Freq);
    setNotch2Q(preset.notch2Q);
    setMaskingType(preset.maskingType);
    setMaskingVolume(preset.maskingVol);

    if (isActive) {
      if (preset.sourceMode !== sourceMode) {
        // Restart with new source mode
        engine.stop();
        engine.start(preset.sourceMode, selectedDeviceId).then(() => {
          engine.setAntiGain(preset.antiGain);
          engine.setDelayMs(preset.delayMs);
          engine.setPhaseDegrees(preset.phaseDeg);
          engine.setHpfFreq(preset.hpf);
          engine.setLpfFreq(preset.lpf);
          engine.setNotch1(preset.notch1Enabled, preset.notch1Freq, preset.notch1Q);
          engine.setNotch2(preset.notch2Enabled, preset.notch2Freq, preset.notch2Q);
          engine.setMasking(preset.maskingType, preset.maskingVol);
          engine.setSynthConfig(preset.synthType, preset.synthFreq);
        });
      } else {
        engine.setAntiGain(preset.antiGain);
        engine.setDelayMs(preset.delayMs);
        engine.setPhaseDegrees(preset.phaseDeg);
        engine.setHpfFreq(preset.hpf);
        engine.setLpfFreq(preset.lpf);
        engine.setNotch1(preset.notch1Enabled, preset.notch1Freq, preset.notch1Q);
        engine.setNotch2(preset.notch2Enabled, preset.notch2Freq, preset.notch2Q);
        engine.setMasking(preset.maskingType, preset.maskingVol);
        engine.setSynthConfig(preset.synthType, preset.synthFreq);
      }
    }
  };

  // Change Source Mode
  const handleSourceModeChange = async (mode) => {
    setSourceMode(mode);
    if (isActive) {
      engine.stop();
      await engine.start(mode, selectedDeviceId);
      engine.setAntiGain(antiGain);
      engine.setDelayMs(delayMs);
      engine.setPhaseDegrees(phaseDegrees);
      engine.setHpfFreq(hpfFreq);
      engine.setLpfFreq(lpfFreq);
      engine.setNotch1(notch1Enabled, notch1Freq, notch1Q);
      engine.setNotch2(notch2Enabled, notch2Freq, notch2Q);
      engine.setMasking(maskingType, maskingVolume);
      engine.setSynthConfig(synthNoiseType, synthFrequency);
    }
  };

  // Sample Ambient Noise Handler
  const handleSampleNoise = async () => {
    if (!isActive) {
      await toggleEngine();
    }
    setIsSamplingNoise(true);
    try {
      const result = await engine.sampleAmbientNoise(1600);
      if (result.peaksFound > 0) {
        setNotch1Enabled(true);
        setNotch1Freq(result.peak1);
        engine.setNotch1(true, result.peak1, 10);

        if (result.peaksFound > 1) {
          setNotch2Enabled(true);
          setNotch2Freq(result.peak2);
          engine.setNotch2(true, result.peak2, 8);
        }

        setLpfFreq(result.suggestedLpf);
        engine.setLpfFreq(result.suggestedLpf);
      }
    } catch (err) {
      console.error('Failed to sample noise:', err);
    } finally {
      setIsSamplingNoise(false);
    }
  };

  // Auto Delay Sweep Assistant
  const handleToggleDelaySweep = () => {
    if (isDelaySweeping) {
      clearInterval(sweepIntervalRef.current);
      setIsDelaySweeping(false);
    } else {
      setIsDelaySweeping(true);
      let cur = 0.0;
      sweepIntervalRef.current = setInterval(() => {
        cur = Math.round((cur + 0.2) * 10) / 10;
        if (cur > 12.0) cur = 0.0;
        setDelayMs(cur);
        engine.setDelayMs(cur);
      }, 100);
    }
  };

  // Real-Time Canvas Rendering Loop (60 FPS)
  useEffect(() => {
    let animationId;

    const render = () => {
      if (isActive && !isWaveformFrozen) {
        // 1. Update Telemetry Metrics every ~4 frames
        const liveStats = engine.computeLiveMetrics();
        setMetrics(liveStats);

        // 2. Render Visualizer Canvas
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          const width = canvas.width;
          const height = canvas.height;

          // Clear background
          ctx.fillStyle = '#070a14';
          ctx.fillRect(0, 0, width, height);

          // Grid Lines
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
          ctx.lineWidth = 1;
          const gridCols = 8;
          const gridRows = 6;
          for (let i = 1; i < gridCols; i++) {
            const x = (width / gridCols) * i;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
          }
          for (let i = 1; i < gridRows; i++) {
            const y = (height / gridRows) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
          }

          // Center Zero Line
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.beginPath();
          ctx.moveTo(0, height / 2);
          ctx.lineTo(width, height / 2);
          ctx.stroke();

          if (visualizerTab === 'oscilloscope') {
            // Draw Time-Domain Waveforms
            let input = null;
            let anti = null;
            let combined = null;
            let bufferLen = 128;

            if (engineType === 'python' && pythonMetrics && pythonMetrics.input_wave && pythonMetrics.input_wave.length > 0) {
              input = pythonMetrics.input_wave;
              anti = pythonMetrics.anti_wave;
              combined = pythonMetrics.residual_wave;
              bufferLen = input.length;
            } else {
              const waveData = engine.getWaveformData(timeWindowMs);
              if (waveData) {
                input = waveData.input;
                anti = waveData.anti;
                combined = waveData.combined;
                bufferLen = Math.floor((timeWindowMs / 1000) * waveData.sampleRate);
              }
            }

            if (input && anti && combined) {
              const step = width / Math.max(1, bufferLen);

              // Find zero crossing for waveform trigger stabilization
              let startOffset = 0;
              for (let i = 0; i < input.length - 1; i++) {
                if (input[i] < 0 && input[i + 1] >= 0) {
                  startOffset = i;
                  break;
                }
              }

              // Trace 1: Original Noise N(t) - Neon Emerald / Cyan
              if (showInputTrace) {
                ctx.strokeStyle = '#00f5d4';
                ctx.lineWidth = 2;
                ctx.shadowColor = 'rgba(0, 245, 212, 0.4)';
                ctx.shadowBlur = 6;
                ctx.beginPath();
                for (let i = 0; i < bufferLen; i++) {
                  const idx = (startOffset + i) % input.length;
                  const val = (input[idx] || 0) * waveformZoom;
                  const x = i * step;
                  const y = height / 2 - val * (height / 2.2);
                  if (i === 0) ctx.moveTo(x, y);
                  else ctx.lineTo(x, y);
                }
                ctx.stroke();
                ctx.shadowBlur = 0;
              }

              // Trace 2: Anti-Noise -N(t) - Crimson / Magenta (Inverted Mirror)
              if (showAntiTrace && !isBypassed) {
                ctx.strokeStyle = '#ff007f';
                ctx.lineWidth = 2;
                ctx.shadowColor = 'rgba(255, 0, 127, 0.4)';
                ctx.shadowBlur = 6;
                ctx.beginPath();
                for (let i = 0; i < bufferLen; i++) {
                  const idx = (startOffset + i) % anti.length;
                  const val = (anti[idx] || 0) * waveformZoom;
                  const x = i * step;
                  const y = height / 2 - val * (height / 2.2);
                  if (i === 0) ctx.moveTo(x, y);
                  else ctx.lineTo(x, y);
                }
                ctx.stroke();
                ctx.shadowBlur = 0;
              }

              // Trace 3: Combined Residual Waveform - Bright Gold / White
              if (showResidualTrace) {
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2.5;
                ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                for (let i = 0; i < bufferLen; i++) {
                  const idx = (startOffset + i) % combined.length;
                  const val = (combined[idx] || 0) * waveformZoom;
                  const x = i * step;
                  const y = height / 2 - val * (height / 2.2);
                  if (i === 0) ctx.moveTo(x, y);
                  else ctx.lineTo(x, y);
                }
                ctx.stroke();
                ctx.shadowBlur = 0;
              }
            }
          } else {
            // Draw FFT Frequency Spectrum (Logarithmic)
            const freqData = engine.getFrequencyData();
            if (freqData) {
              const { inputFreq, combinedFreq, binCount, sampleRate } = freqData;

              // Shaded Attenuation Area between Input & Combined Spectrum
              ctx.beginPath();
              ctx.moveTo(0, height);

              for (let i = 1; i < binCount; i++) {
                const freq = (i * sampleRate) / (binCount * 2);
                if (freq > 12000) break;

                // Logarithmic X coordinate
                const logMin = Math.log10(20);
                const logMax = Math.log10(12000);
                const logFreq = Math.log10(Math.max(20, freq));
                const x = ((logFreq - logMin) / (logMax - logMin)) * width;

                // Normalize dB from -100dB (bottom) to 0dB (top)
                const inDb = Math.max(-100, Math.min(0, inputFreq[i]));
                const yIn = height - ((inDb + 100) / 100) * height;

                if (i === 1) ctx.moveTo(x, yIn);
                else ctx.lineTo(x, yIn);
              }

              // Trace back along combined residual spectrum to fill shaded difference
              for (let i = binCount - 1; i >= 1; i--) {
                const freq = (i * sampleRate) / (binCount * 2);
                if (freq > 12000) continue;

                const logMin = Math.log10(20);
                const logMax = Math.log10(12000);
                const logFreq = Math.log10(Math.max(20, freq));
                const x = ((logFreq - logMin) / (logMax - logMin)) * width;

                const combDb = Math.max(-100, Math.min(0, combinedFreq[i]));
                const yComb = height - ((combDb + 100) / 100) * height;

                ctx.lineTo(x, yComb);
              }
              ctx.closePath();
              ctx.fillStyle = 'rgba(0, 245, 212, 0.15)';
              ctx.fill();

              // Curve 1: Input Spectrum Curve (Cyan)
              ctx.strokeStyle = '#00f5d4';
              ctx.lineWidth = 2;
              ctx.beginPath();
              for (let i = 1; i < binCount; i++) {
                const freq = (i * sampleRate) / (binCount * 2);
                if (freq > 12000) break;
                const logMin = Math.log10(20);
                const logMax = Math.log10(12000);
                const logFreq = Math.log10(Math.max(20, freq));
                const x = ((logFreq - logMin) / (logMax - logMin)) * width;

                const inDb = Math.max(-100, Math.min(0, inputFreq[i]));
                const yIn = height - ((inDb + 100) / 100) * height;
                if (i === 1) ctx.moveTo(x, yIn);
                else ctx.lineTo(x, yIn);
              }
              ctx.stroke();

              // Curve 2: Cancelled Residual Spectrum (Gold/White)
              ctx.strokeStyle = '#ffd166';
              ctx.lineWidth = 2;
              ctx.beginPath();
              for (let i = 1; i < binCount; i++) {
                const freq = (i * sampleRate) / (binCount * 2);
                if (freq > 12000) break;
                const logMin = Math.log10(20);
                const logMax = Math.log10(12000);
                const logFreq = Math.log10(Math.max(20, freq));
                const x = ((logFreq - logMin) / (logMax - logMin)) * width;

                const combDb = Math.max(-100, Math.min(0, combinedFreq[i]));
                const yComb = height - ((combDb + 100) / 100) * height;
                if (i === 1) ctx.moveTo(x, yComb);
                else ctx.lineTo(x, yComb);
              }
              ctx.stroke();

              // Frequency Markers Text
              ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
              ctx.font = '10px monospace';
              const freqMarkers = [50, 100, 200, 500, 1000, 2000, 5000, 10000];
              freqMarkers.forEach(f => {
                const logMin = Math.log10(20);
                const logMax = Math.log10(12000);
                const x = ((Math.log10(f) - logMin) / (logMax - logMin)) * width;
                ctx.fillText(`${f >= 1000 ? f / 1000 + 'k' : f}Hz`, x - 12, height - 8);
              });
            }
          }
        }
      } else if (!isActive) {
        // Idle screen on canvas
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#070a14';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, canvas.height / 2);
          ctx.lineTo(canvas.width, canvas.height / 2);
          ctx.stroke();

          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.font = '14px Outfit, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('ANC Engine Standby. Click "Engage Active Noise Cancellation" to begin.', canvas.width / 2, canvas.height / 2 - 10);
          ctx.fillStyle = 'rgba(0, 245, 212, 0.7)';
          ctx.font = '12px Outfit, sans-serif';
          ctx.fillText('Wear sealed earphones/headphones for acoustic isolation.', canvas.width / 2, canvas.height / 2 + 15);
        }
      }

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, [
    isActive,
    isWaveformFrozen,
    visualizerTab,
    timeWindowMs,
    waveformZoom,
    showInputTrace,
    showAntiTrace,
    showResidualTrace,
    isBypassed,
    engine,
    engineType,
    pythonMetrics
  ]);

  return (
    <div className="anc-app-container">
      {/* Background Glow */}
      <div className="blob-container">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      {/* Top Navigation */}
      <header className="anc-navbar glass">
        <div className="anc-nav-left">
          <Link to="/" className="anc-back-link" title="Return to Dashboard">
            <ArrowLeft size={20} />
            <span>Home</span>
          </Link>
          <div className="anc-title-block">
            <div className="anc-icon-badge">
              <Headphones size={22} className="anc-headphone-icon" />
            </div>
            <div>
              <div className="anc-title-row">
                <h1>ANC (exp)</h1>
                <span className="anc-tag-pill">Acoustic Anti-Phase Lab</span>
              </div>
              <p className="anc-subtitle">Real-time soundwave inversion, delay compensation & acoustic cancellation</p>
            </div>
          </div>
        </div>

        <div className="anc-nav-right">
          <div className="anc-engine-selector-pill glass">
            <button
              className={`anc-engine-pill-btn ${engineType === 'webaudio' ? 'active' : ''}`}
              onClick={() => {
                if (isActive) toggleEngine();
                setEngineType('webaudio');
              }}
            >
              <span>Web Audio API</span>
            </button>
            <button
              className={`anc-engine-pill-btn ${engineType === 'python' ? 'active' : ''}`}
              onClick={() => {
                if (isActive) toggleEngine();
                setEngineType('python');
              }}
            >
              <span>Python CoreAudio</span>
            </button>
          </div>

          <button
            className="anc-info-btn glass"
            title="How ANC Physics & Latency Work"
            onClick={() => setShowInfoModal(true)}
          >
            <Info size={18} />
            <span>ANC Theory & Guide</span>
          </button>
        </div>
      </header>

      {/* Python Engine Status Banner */}
      {engineType === 'python' && (
        <div className={`anc-alert-banner ${pythonWsStatus === 'connected' ? 'anc-alert-success' : 'anc-alert-warning'}`}>
          <Radio size={20} className={pythonWsStatus === 'connected' ? 'text-green' : ''} />
          <div className="anc-alert-text">
            {pythonWsStatus === 'connected' ? (
              <span>
                <strong>Native Python Engine Connected:</strong> Direct macOS CoreAudio HAL stream active with sub-3ms roundtrip buffer latency (ws://localhost:8765).
              </span>
            ) : (
              <span>
                <strong>Python Engine Offline:</strong> Start the native DSP backend by running <code className="anc-code-tag">npm run anc:engine</code> in your terminal.
              </span>
            )}
          </div>
          {pythonWsStatus !== 'connected' && (
            <button className="anc-alert-action-btn" onClick={connectPythonWebSocket}>
              <RefreshCw size={13} />
              <span>Retry Connect</span>
            </button>
          )}
        </div>
      )}

      {/* Permission Warning if Microphone Fails */}
      {permissionError && (
        <div className="anc-alert-banner anc-alert-danger">
          <AlertTriangle size={20} />
          <div className="anc-alert-text">
            <strong>Microphone Warning:</strong> {permissionError}
          </div>
          <button className="anc-alert-action-btn" onClick={() => handleSourceModeChange('synth')}>
            Switch to Virtual Chamber
          </button>
        </div>
      )}

      {/* Feedback Spike Auto-Protection Alert */}
      {feedbackWarningVisible && (
        <div className="anc-alert-banner anc-alert-warning">
          <ShieldAlert size={20} />
          <div className="anc-alert-text">
            <strong>Safety Limiter Triggered:</strong> High-power acoustic feedback spike detected. Audio output has been auto-muted to protect your hearing. Please wear earphones and click unmute.
          </div>
          <button
            className="anc-alert-action-btn"
            onClick={() => {
              setFeedbackWarningVisible(false);
              setIsMuted(false);
              engine.setMute(false);
            }}
          >
            Acknowledge & Unmute
          </button>
        </div>
      )}

      {/* Master Control & Safety Deck */}
      <div className="anc-master-deck glass">
        <div className="anc-master-deck-left">
          <button
            className={`anc-power-btn ${isActive ? 'active' : ''}`}
            onClick={toggleEngine}
          >
            {isActive ? <Square size={20} /> : <Play size={20} />}
            <span>{isActive ? 'Disengage ANC Engine' : 'Engage Active Noise Cancellation'}</span>
          </button>

          <div className="anc-preset-dropdown-wrap">
            <label className="anc-control-label">Acoustic Preset</label>
            <CustomSelect
              value={activePreset}
              onChange={applyPreset}
              options={ANC_PRESETS.map(p => ({
                value: p.id,
                label: `${p.name} (${p.tag})`
              }))}
              className="anc-preset-select"
            />
          </div>
        </div>

        <div className="anc-master-deck-right">
          <button
            className={`anc-toggle-btn ${isBypassed ? 'bypass-active' : ''}`}
            onClick={() => {
              const next = !isBypassed;
              setIsBypassed(next);
              engine.setBypass(next);
            }}
            title="Instantly bypass anti-phase output to hear the before/after acoustic difference"
          >
            <Activity size={16} />
            <span>{isBypassed ? 'Bypass Active (Raw Audio)' : 'Bypass ANC (A/B Test)'}</span>
          </button>

          <button
            className={`anc-panic-mute-btn ${isMuted ? 'muted' : ''}`}
            onClick={() => {
              const next = !isMuted;
              setIsMuted(next);
              engine.setMute(next);
            }}
            title="Instant emergency mute"
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            <span>{isMuted ? 'Muted' : 'Panic Mute'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Visualizer Deck + Telemetry + Control Racks */}
      <div className="anc-grid">
        {/* Left Column: Visualizer & Real-Time Canvas */}
        <div className="anc-visualizer-card glass">
          <div className="anc-card-header">
            <div className="anc-tab-group">
              <button
                className={`anc-tab-btn ${visualizerTab === 'oscilloscope' ? 'active' : ''}`}
                onClick={() => setVisualizerTab('oscilloscope')}
              >
                <Waves size={16} />
                <span>Live Oscilloscope</span>
              </button>
              <button
                className={`anc-tab-btn ${visualizerTab === 'spectrum' ? 'active' : ''}`}
                onClick={() => setVisualizerTab('spectrum')}
              >
                <Activity size={16} />
                <span>FFT Frequency Spectrum</span>
              </button>
            </div>

            <div className="anc-vis-controls">
              {visualizerTab === 'oscilloscope' && (
                <>
                  <div className="anc-mini-select-wrap">
                    <span>Window:</span>
                    <select
                      value={timeWindowMs}
                      onChange={(e) => setTimeWindowMs(Number(e.target.value))}
                      className="anc-mini-select"
                    >
                      <option value={5}>5 ms</option>
                      <option value={10}>10 ms</option>
                      <option value={20}>20 ms</option>
                      <option value={50}>50 ms</option>
                    </select>
                  </div>
                  <div className="anc-mini-select-wrap">
                    <span>Zoom:</span>
                    <select
                      value={waveformZoom}
                      onChange={(e) => setWaveformZoom(Number(e.target.value))}
                      className="anc-mini-select"
                    >
                      <option value={1.0}>1x</option>
                      <option value={1.5}>1.5x</option>
                      <option value={2.5}>2.5x</option>
                      <option value={5.0}>5x</option>
                    </select>
                  </div>
                </>
              )}
              <button
                className={`anc-vis-btn ${isWaveformFrozen ? 'active' : ''}`}
                onClick={() => setIsWaveformFrozen(prev => !prev)}
                title="Freeze live waveform display"
              >
                {isWaveformFrozen ? 'Unfreeze' : 'Freeze'}
              </button>
            </div>
          </div>

          {/* Canvas Viewport */}
          <div className="anc-canvas-container">
            <canvas
              ref={canvasRef}
              width={900}
              height={380}
              className="anc-visualizer-canvas"
            />
          </div>

          {/* Oscilloscope Waveform Legend & Toggles */}
          {visualizerTab === 'oscilloscope' && (
            <div className="anc-canvas-legend">
              <label className="anc-legend-item input-trace">
                <input
                  type="checkbox"
                  checked={showInputTrace}
                  onChange={(e) => setShowInputTrace(e.target.checked)}
                />
                <span className="anc-legend-dot dot-cyan"></span>
                <span>Incoming Noise Waveform N(t)</span>
              </label>

              <label className="anc-legend-item anti-trace">
                <input
                  type="checkbox"
                  checked={showAntiTrace}
                  onChange={(e) => setShowAntiTrace(e.target.checked)}
                />
                <span className="anc-legend-dot dot-magenta"></span>
                <span>Generated Anti-Noise -N(t) [180° Inverted]</span>
              </label>

              <label className="anc-legend-item residual-trace">
                <input
                  type="checkbox"
                  checked={showResidualTrace}
                  onChange={(e) => setShowResidualTrace(e.target.checked)}
                />
                <span className="anc-legend-dot dot-white"></span>
                <span>Residual Output [Destructive Null]</span>
              </label>
            </div>
          )}

          {visualizerTab === 'spectrum' && (
            <div className="anc-canvas-legend">
              <div className="anc-legend-item">
                <span className="anc-legend-dot dot-cyan"></span>
                <span>Original Noise Spectrum (dB)</span>
              </div>
              <div className="anc-legend-item">
                <span className="anc-legend-dot dot-yellow"></span>
                <span>Attenuated Residual Spectrum (dB)</span>
              </div>
              <div className="anc-legend-item">
                <span className="anc-legend-box box-shaded"></span>
                <span>Acoustic Null Attenuation Depth</span>
              </div>
            </div>
          )}

          {/* Telemetry Metrics Strip */}
          <div className="anc-telemetry-strip">
            <div className="anc-telemetry-stat">
              <span className="stat-label">Estimated Attenuation</span>
              <span className={`stat-value ${metrics.attenuationDb < -3 ? 'text-green' : 'text-neutral'}`}>
                {metrics.attenuationDb <= 0 ? `${metrics.attenuationDb} dB` : `+${metrics.attenuationDb} dB`}
              </span>
            </div>

            <div className="anc-telemetry-stat">
              <span className="stat-label">Cancellation Depth</span>
              <span className="stat-value text-cyan">
                {metrics.cancellationDepthPercent}%
              </span>
            </div>

            <div className="anc-telemetry-stat">
              <span className="stat-label">Dominant Resonant Peak</span>
              <span className="stat-value text-yellow">
                {metrics.dominantFreq > 0 ? `${metrics.dominantFreq} Hz` : 'Scanning...'}
              </span>
            </div>

            <div className="anc-telemetry-stat">
              <span className="stat-label">Hardware Buffer Latency</span>
              <span className="stat-value text-muted">
                ~{metrics.estimatedLatencyMs} ms
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Control Racks */}
        <div className="anc-controls-card glass">
          <div className="anc-control-tabs">
            <button
              className={`anc-control-tab-btn ${activeControlTab === 'dsp' ? 'active' : ''}`}
              onClick={() => setActiveControlTab('dsp')}
            >
              <Sliders size={16} />
              <span>Anti-Phase & Delay</span>
            </button>
            <button
              className={`anc-control-tab-btn ${activeControlTab === 'filters' ? 'active' : ''}`}
              onClick={() => setActiveControlTab('filters')}
            >
              <Layers size={16} />
              <span>DSP Filter Bank</span>
            </button>
            <button
              className={`anc-control-tab-btn ${activeControlTab === 'masking' ? 'active' : ''}`}
              onClick={() => setActiveControlTab('masking')}
            >
              <Sparkles size={16} />
              <span>Hybrid Masking</span>
            </button>
            <button
              className={`anc-control-tab-btn ${activeControlTab === 'generator' ? 'active' : ''}`}
              onClick={() => setActiveControlTab('generator')}
            >
              <Cpu size={16} />
              <span>Audio Source</span>
            </button>
          </div>

          <div className="anc-control-panel-body">
            {/* TAB 1: Anti-Phase & Acoustic Delay */}
            {activeControlTab === 'dsp' && (
              <div className="anc-tab-pane">
                <div className="anc-section-header">
                  <h3>Anti-Phase Calibration & Delay Matching</h3>
                  <p>Fine-tune inverted amplitude and microsecond propagation delay to match physical acoustic transfer.</p>
                </div>

                {/* Anti-Noise Amplitude Gain */}
                <div className="anc-slider-control">
                  <div className="anc-slider-header">
                    <span>Anti-Noise Amplitude (Gain)</span>
                    <span className="anc-slider-value">{Math.round(antiGain * 100)}% ({Math.round(20 * Math.log10(Math.max(0.01, antiGain)) * 10) / 10} dB)</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2.0"
                    step="0.01"
                    value={antiGain}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setAntiGain(val);
                      engine.setAntiGain(val);
                    }}
                    className="anc-range-slider"
                  />
                </div>

                {/* Acoustic Delay Compensation Slider */}
                <div className="anc-slider-control">
                  <div className="anc-slider-header">
                    <span>Acoustic Delay Compensation</span>
                    <span className="anc-slider-value">{delayMs.toFixed(2)} ms (~{Math.round(delayMs * 34.3)} cm acoustic distance)</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="0.05"
                    value={delayMs}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setDelayMs(val);
                      engine.setDelayMs(val);
                    }}
                    className="anc-range-slider"
                  />
                  <div className="anc-slider-footer">
                    <button
                      className={`anc-action-mini-btn ${isDelaySweeping ? 'active' : ''}`}
                      onClick={handleToggleDelaySweep}
                    >
                      <RefreshCw size={13} className={isDelaySweeping ? 'spin' : ''} />
                      <span>{isDelaySweeping ? 'Stop Sweep' : 'Auto Delay Sweep'}</span>
                    </button>
                    <span className="anc-hint">Adjusts time buffer to match mic-to-ear distance</span>
                  </div>
                </div>

                {/* Phase Angle Rotator */}
                <div className="anc-slider-control">
                  <div className="anc-slider-header">
                    <span>All-Pass Phase Angle Alignment</span>
                    <span className="anc-slider-value">{phaseDegrees}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="5"
                    value={phaseDegrees}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setPhaseDegrees(val);
                      engine.setPhaseDegrees(val);
                    }}
                    className="anc-range-slider"
                  />
                </div>

                {/* Invert Polarity Toggle Button */}
                <div className="anc-toggle-row">
                  <div className="anc-toggle-label">
                    <span>Polarity Inversion Mode</span>
                    <span className="anc-subtext">Switches between 180° Anti-Phase (Cancellation) and 0° In-Phase (Boost)</span>
                  </div>
                  <button
                    className={`anc-polarity-pill ${isInverted ? 'inverted' : 'normal'}`}
                    onClick={() => {
                      const next = !isInverted;
                      setIsInverted(next);
                      engine.setInverted(next);
                    }}
                  >
                    {isInverted ? '180° Anti-Phase Inverted' : '0° In-Phase Boost'}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: Multi-Band DSP Filter Bank */}
            {activeControlTab === 'filters' && (
              <div className="anc-tab-pane">
                <div className="anc-section-header">
                  <div className="anc-header-with-action">
                    <div>
                      <h3>Parametric Filter Bank</h3>
                      <p>Isolate problem frequency hums and prevent unwanted high-frequency oscillation.</p>
                    </div>
                    <button
                      className="anc-sample-btn"
                      onClick={handleSampleNoise}
                      disabled={isSamplingNoise}
                    >
                      <Sparkles size={14} />
                      <span>{isSamplingNoise ? 'Sampling Room...' : 'Auto-Sample Noise'}</span>
                    </button>
                  </div>
                </div>

                {/* Low-Pass Cutoff Filter */}
                <div className="anc-slider-control">
                  <div className="anc-slider-header">
                    <span>Low-Pass Filter Cutoff (ANC Upper Band)</span>
                    <span className="anc-slider-value">{lpfFreq} Hz</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="3000"
                    step="10"
                    value={lpfFreq}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setLpfFreq(val);
                      engine.setLpfFreq(val);
                    }}
                    className="anc-range-slider"
                  />
                  <span className="anc-hint">ANC performs reliably below 1500 Hz where acoustic phase coherence is highest</span>
                </div>

                {/* High-Pass Cutoff Filter */}
                <div className="anc-slider-control">
                  <div className="anc-slider-header">
                    <span>High-Pass Filter Cutoff (Sub-Bass Rumble Protect)</span>
                    <span className="anc-slider-value">{hpfFreq} Hz</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="150"
                    step="5"
                    value={hpfFreq}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setHpfFreq(val);
                      engine.setHpfFreq(val);
                    }}
                    className="anc-range-slider"
                  />
                </div>

                {/* Parametric Notch 1 (e.g. 50/60Hz Hum) */}
                <div className="anc-notch-box">
                  <div className="anc-notch-header">
                    <label className="anc-notch-toggle">
                      <input
                        type="checkbox"
                        checked={notch1Enabled}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setNotch1Enabled(val);
                          engine.setNotch1(val, notch1Freq, notch1Q);
                        }}
                      />
                      <span>Notch Filter 1 (Resonant Hum Killer)</span>
                    </label>
                    <span className="anc-slider-value">{notch1Freq} Hz (Q: {notch1Q})</span>
                  </div>
                  {notch1Enabled && (
                    <input
                      type="range"
                      min="40"
                      max="1000"
                      step="5"
                      value={notch1Freq}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setNotch1Freq(val);
                        engine.setNotch1(true, val, notch1Q);
                      }}
                      className="anc-range-slider"
                    />
                  )}
                </div>

                {/* Parametric Notch 2 (Harmonics) */}
                <div className="anc-notch-box">
                  <div className="anc-notch-header">
                    <label className="anc-notch-toggle">
                      <input
                        type="checkbox"
                        checked={notch2Enabled}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setNotch2Enabled(val);
                          engine.setNotch2(val, notch2Freq, notch2Q);
                        }}
                      />
                      <span>Notch Filter 2 (Harmonic Overtone)</span>
                    </label>
                    <span className="anc-slider-value">{notch2Freq} Hz (Q: {notch2Q})</span>
                  </div>
                  {notch2Enabled && (
                    <input
                      type="range"
                      min="80"
                      max="2000"
                      step="10"
                      value={notch2Freq}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setNotch2Freq(val);
                        engine.setNotch2(true, val, notch2Q);
                      }}
                      className="anc-range-slider"
                    />
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: Hybrid Acoustic Sound Masking */}
            {activeControlTab === 'masking' && (
              <div className="anc-tab-pane">
                <div className="anc-section-header">
                  <h3>Hybrid Sound Masking</h3>
                  <p>In physical environments, blending anti-phase cancellation with smooth psychoacoustic noise masking bridges physical latency gaps.</p>
                </div>

                <div className="anc-masking-options">
                  <button
                    className={`anc-masking-card ${maskingType === 'pink' ? 'active' : ''}`}
                    onClick={() => {
                      setMaskingType('pink');
                      engine.setMasking('pink', maskingVolume);
                    }}
                  >
                    <h4>Pink Noise</h4>
                    <p>Equal energy per octave. Ideal for fan and office hum masking.</p>
                  </button>

                  <button
                    className={`anc-masking-card ${maskingType === 'brown' ? 'active' : ''}`}
                    onClick={() => {
                      setMaskingType('brown');
                      engine.setMasking('brown', maskingVolume);
                    }}
                  >
                    <h4>Deep Brown Noise</h4>
                    <p>Deeper 6dB/octave slope. Warm, sub-bass rumble masking.</p>
                  </button>
                </div>

                <div className="anc-slider-control" style={{ marginTop: '1.5rem' }}>
                  <div className="anc-slider-header">
                    <span>Masking Layer Volume</span>
                    <span className="anc-slider-value">{Math.round(maskingVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.0"
                    step="0.02"
                    value={maskingVolume}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setMaskingVolume(val);
                      engine.setMasking(maskingType, val);
                    }}
                    className="anc-range-slider"
                  />
                </div>
              </div>
            )}

            {/* TAB 4: Audio Source & Virtual Chamber */}
            {activeControlTab === 'generator' && (
              <div className="anc-tab-pane">
                <div className="anc-section-header">
                  <h3>Audio Source Selection</h3>
                  <p>Choose between real-time microphone capture and synthetic acoustic room simulation.</p>
                </div>

                <div className="anc-source-selector-cards">
                  <div
                    className={`anc-source-card ${sourceMode === 'mic' ? 'active' : ''}`}
                    onClick={() => handleSourceModeChange('mic')}
                  >
                    <div className="anc-source-icon">
                      <Mic size={24} />
                    </div>
                    <div>
                      <h4>Live Microphone (Real-Time ANC)</h4>
                      <p>Captures ambient room sound from your physical microphone.</p>
                    </div>
                  </div>

                  <div
                    className={`anc-source-card ${sourceMode === 'synth' ? 'active' : ''}`}
                    onClick={() => handleSourceModeChange('synth')}
                  >
                    <div className="anc-source-icon">
                      <Radio size={24} />
                    </div>
                    <div>
                      <h4>Virtual Acoustic Chamber (Offline Demo)</h4>
                      <p>Simulates ambient room noise to demonstrate destructive cancellation without microphone setup.</p>
                    </div>
                  </div>
                </div>

                {sourceMode === 'mic' ? (
                  <div className="anc-mic-config-block">
                    <label className="anc-control-label">Select Microphone Device</label>
                    <CustomSelect
                      value={selectedDeviceId}
                      onChange={(id) => {
                        setSelectedDeviceId(id);
                        if (isActive) {
                          engine.stop();
                          engine.start('mic', id);
                        }
                      }}
                      options={audioDevices}
                      className="anc-device-select"
                    />

                    <div className="anc-slider-control" style={{ marginTop: '1.25rem' }}>
                      <div className="anc-slider-header">
                        <span>Microphone Pre-amp Sensitivity</span>
                        <span className="anc-slider-value">{Math.round(micSensitivity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="2.5"
                        step="0.05"
                        value={micSensitivity}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setMicSensitivity(val);
                          engine.setMicSensitivity(val);
                        }}
                        className="anc-range-slider"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="anc-synth-config-block">
                    <label className="anc-control-label">Synthetic Room Noise Profile</label>
                    <div className="anc-synth-type-grid">
                      {[
                        { id: 'fan_drone', label: '120Hz Fan Drone' },
                        { id: 'mains_hum', label: '60Hz Mains Hum' },
                        { id: 'jet_cabin', label: 'Jet Cabin Rumble' },
                        { id: 'sine_tone', label: '1000Hz Pure Sine' }
                      ].map(item => (
                        <button
                          key={item.id}
                          className={`anc-synth-btn ${synthNoiseType === item.id ? 'active' : ''}`}
                          onClick={() => {
                            setSynthNoiseType(item.id);
                            engine.setSynthConfig(item.id, synthFrequency);
                          }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    {synthNoiseType === 'sine_tone' && (
                      <div className="anc-slider-control" style={{ marginTop: '1.25rem' }}>
                        <div className="anc-slider-header">
                          <span>Tone Frequency</span>
                          <span className="anc-slider-value">{synthFrequency} Hz</span>
                        </div>
                        <input
                          type="range"
                          min="100"
                          max="2000"
                          step="10"
                          value={synthFrequency}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setSynthFrequency(val);
                            engine.setSynthConfig(synthNoiseType, val);
                          }}
                          className="anc-range-slider"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ANC Theory & Educational Info Modal */}
      {showInfoModal && (
        <div className="anc-modal-overlay" onClick={() => setShowInfoModal(false)}>
          <div className="anc-modal-card glass" onClick={(e) => e.stopPropagation()}>
            <div className="anc-modal-header">
              <div className="anc-modal-title">
                <Headphones size={22} className="text-cyan" />
                <h3>How Active Noise Cancellation (ANC) Works</h3>
              </div>
              <button className="anc-modal-close" onClick={() => setShowInfoModal(false)}>
                &times;
              </button>
            </div>

            <div className="anc-modal-content">
              <section className="anc-info-section">
                <h4>1. The Physics of Destructive Interference</h4>
                <p>
                  Sound propagates through air as pressure oscillations $P(t)$. When an ambient soundwave $N(t)$ enters your ear canal,
                  playing an identical waveform with inverted phase $-N(t)$ ($180^\circ$ phase shift) produces mathematical wave cancellation:
                </p>
                <div className="anc-formula-box">
                  <code>N(t) + (-N(t)) = 0 (Acoustic Silence)</code>
                </div>
              </section>

              <section className="anc-info-section">
                <h4>2. The Propagation Latency Challenge</h4>
                <p>
                  Sound travels in air at approximately <strong>343 meters per second</strong> (~0.343 mm per microsecond).
                  Commercial ANC headphones (e.g. Sony, Bose, Apple) use dedicated hardware DSP chips with under <strong>10 to 30 microseconds</strong> of processing delay.
                </p>
                <p>
                  Standard computer audio interfaces have a buffer roundtrip latency of <strong>5 to 25 milliseconds</strong>.
                  This experimental tool models physical ANC by introducing adjustable microsecond delay compensation, parametric notch filtering, and hybrid sound masking.
                </p>
              </section>

              <section className="anc-info-section">
                <h4>3. Safety & Feedback Prevention</h4>
                <p>
                  Always use earphones or headphones with silicone/foam tips. If microphone audio is played directly through laptop speakers, an acoustic feedback howl will occur.
                  The built-in brickwall limiter automatically clamps output levels above -3 dB to protect your ears.
                </p>
              </section>
            </div>

            <div className="anc-modal-footer">
              <button className="anc-modal-primary-btn" onClick={() => setShowInfoModal(false)}>
                Understood, Return to Lab
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
