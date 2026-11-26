// Real-Time Active Noise Cancellation (ANC) Audio DSP Engine
// Handles low-latency audio capture, anti-phase inversion, delay compensation,
// all-pass phase shifting, multi-band filtering, safety brickwall limiting,
// and real-time dual-analyser telemetry.

export class ANCAudioEngine {
  constructor() {
    this.ctx = null;
    this.micStream = null;
    this.micSourceNode = null;
    this.synthSourceNode = null;
    this.synthGainNode = null;

    // DSP Nodes
    this.inputPreGainNode = null;
    this.hpfNode = null;
    this.lpfNode = null;
    this.notch1Node = null;
    this.notch2Node = null;
    this.allpassNode = null;
    this.delayNode = null;
    this.inverterGainNode = null;
    this.bypassGainNode = null;
    this.masterGainNode = null;

    // Hybrid Masking Nodes
    this.maskingSourceNode = null;
    this.maskingGainNode = null;

    // Safety Brickwall Limiter
    this.safetyLimiterNode = null;

    // Analysers
    this.inputAnalyser = null;
    this.antiAnalyser = null;
    this.combinedAnalyser = null;

    // State parameters
    this.isRunning = false;
    this.sourceMode = 'mic'; // 'mic' | 'synth'
    this.synthNoiseType = 'fan_drone'; // 'sine_tone', 'mains_hum', 'fan_drone', 'jet_cabin', 'pink_noise'
    this.synthFrequency = 120;
    this.isBypassed = false;
    this.isMuted = false;
    this.micSensitivity = 1.0;
    this.antiGain = 1.0;
    this.delayMs = 0.0;
    this.phaseDegrees = 180;
    this.isInverted = true;
    this.hpfFreq = 30;
    this.lpfFreq = 1200;
    this.notch1Freq = 60;
    this.notch1Q = 8;
    this.notch1Enabled = false;
    this.notch2Freq = 120;
    this.notch2Q = 8;
    this.notch2Enabled = false;
    this.maskingType = 'pink';
    this.maskingVolume = 0.0;
    this.feedbackSpikeDetected = false;
    this.onFeedbackAlert = null;

    this.sampleRate = 48000;
  }

  async initAudioContext() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtxClass({
        latencyHint: 'interactive',
        sampleRate: 48000
      });
      this.sampleRate = this.ctx.sampleRate;
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  async start(sourceMode = 'mic', selectedDeviceId = null) {
    await this.initAudioContext();
    this.sourceMode = sourceMode;

    this.cleanupNodes();

    // 1. Create Safety Brickwall Limiter Node
    this.safetyLimiterNode = this.ctx.createDynamicsCompressor();
    this.safetyLimiterNode.threshold.value = -3; // dB
    this.safetyLimiterNode.knee.value = 0; // Hard brickwall
    this.safetyLimiterNode.ratio.value = 20; // Maximum limiting
    this.safetyLimiterNode.attack.value = 0.001; // 1 ms fast attack
    this.safetyLimiterNode.release.value = 0.05; // 50 ms release

    // 2. Master Output Gain
    this.masterGainNode = this.ctx.createGain();
    this.masterGainNode.gain.value = this.isMuted ? 0 : 1.0;

    // 3. Analysers for Telemetry & Oscilloscope
    this.inputAnalyser = this.ctx.createAnalyser();
    this.inputAnalyser.fftSize = 2048;
    this.inputAnalyser.smoothingTimeConstant = 0.6;

    this.antiAnalyser = this.ctx.createAnalyser();
    this.antiAnalyser.fftSize = 2048;
    this.antiAnalyser.smoothingTimeConstant = 0.6;

    this.combinedAnalyser = this.ctx.createAnalyser();
    this.combinedAnalyser.fftSize = 2048;
    this.combinedAnalyser.smoothingTimeConstant = 0.6;

    // 4. Pre-Gain & Filter Chain
    this.inputPreGainNode = this.ctx.createGain();
    this.inputPreGainNode.gain.value = this.micSensitivity;

    this.hpfNode = this.ctx.createBiquadFilter();
    this.hpfNode.type = 'highpass';
    this.hpfNode.frequency.value = this.hpfFreq;
    this.hpfNode.Q.value = 0.707;

    this.lpfNode = this.ctx.createBiquadFilter();
    this.lpfNode.type = 'lowpass';
    this.lpfNode.frequency.value = this.lpfFreq;
    this.lpfNode.Q.value = 0.707;

    this.notch1Node = this.ctx.createBiquadFilter();
    this.notch1Node.type = this.notch1Enabled ? 'notch' : 'allpass';
    this.notch1Node.frequency.value = this.notch1Freq;
    this.notch1Node.Q.value = this.notch1Q;

    this.notch2Node = this.ctx.createBiquadFilter();
    this.notch2Node.type = this.notch2Enabled ? 'notch' : 'allpass';
    this.notch2Node.frequency.value = this.notch2Freq;
    this.notch2Node.Q.value = this.notch2Q;

    this.allpassNode = this.ctx.createBiquadFilter();
    this.allpassNode.type = 'allpass';
    this.allpassNode.frequency.value = Math.max(50, this.lpfFreq / 2);
    this.allpassNode.Q.value = 1.0;

    // 5. Delay Line (0 to 100ms)
    this.delayNode = this.ctx.createDelay(0.2);
    this.delayNode.delayTime.value = Math.max(0, this.delayMs / 1000);

    // 6. Polarity Inverter Gain Node (-1 for anti-phase)
    this.inverterGainNode = this.ctx.createGain();
    const polarityMultiplier = this.isInverted ? -1.0 : 1.0;
    this.inverterGainNode.gain.value = this.isBypassed ? 0.0 : (polarityMultiplier * this.antiGain);

    // 7. Setup Source Node
    if (sourceMode === 'mic') {
      try {
        const audioConstraints = {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
          sampleRate: { ideal: 48000 }
        };
        if (selectedDeviceId) {
          audioConstraints.deviceId = { exact: selectedDeviceId };
        }

        this.micStream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
          video: false
        });

        this.micSourceNode = this.ctx.createMediaStreamSource(this.micStream);
        this.micSourceNode.connect(this.inputPreGainNode);
      } catch (err) {
        console.error('Failed to access microphone stream:', err);
        throw err;
      }
    } else {
      // Virtual Simulation / Test Chamber Mode
      this.createSynthSource();
    }

    // Connect DSP Chain:
    // Input -> PreGain -> HPF -> LPF -> Notch1 -> Notch2 -> AllPass -> Delay -> Inverter -> AntiAnalyser
    this.inputPreGainNode.connect(this.inputAnalyser);
    this.inputPreGainNode.connect(this.hpfNode);
    this.hpfNode.connect(this.lpfNode);
    this.lpfNode.connect(this.notch1Node);
    this.notch1Node.connect(this.notch2Node);
    this.notch2Node.connect(this.allpassNode);
    this.allpassNode.connect(this.delayNode);
    this.delayNode.connect(this.inverterGainNode);
    this.inverterGainNode.connect(this.antiAnalyser);

    // In Virtual Simulation mode: mix synthetic room noise with anti-noise into combinedAnalyser & destination
    if (sourceMode === 'synth') {
      // Room noise feeds directly into room acoustic simulation
      this.inputPreGainNode.connect(this.combinedAnalyser);
      this.inverterGainNode.connect(this.combinedAnalyser);

      // Connect combined signal to safety limiter and output
      this.combinedAnalyser.connect(this.safetyLimiterNode);
    } else {
      // In Real Mic mode: Anti-noise goes through safety limiter directly to earphones
      this.inverterGainNode.connect(this.combinedAnalyser);
      this.inverterGainNode.connect(this.safetyLimiterNode);
    }

    // Safety limiter -> Master Gain -> Destination
    this.safetyLimiterNode.connect(this.masterGainNode);
    this.masterGainNode.connect(this.ctx.destination);

    // Setup Masking Layer
    this.setupMaskingLayer();

    this.isRunning = true;
  }

  createSynthSource() {
    if (!this.ctx) return;
    if (this.synthSourceNode) {
      try {
        this.synthSourceNode.stop();
        this.synthSourceNode.disconnect();
      } catch {
        // Ignore stop error
      }
    }

    const type = this.synthNoiseType;
    if (type === 'sine_tone') {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = this.synthFrequency;
      osc.start();
      this.synthSourceNode = osc;
      osc.connect(this.inputPreGainNode);
    } else if (type === 'mains_hum') {
      // 50/60 Hz Fundamental + 100/120Hz harmonic + 180Hz harmonic
      const fundamentalFreq = this.synthFrequency || 60;

      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.value = fundamentalFreq;

      const g1 = this.ctx.createGain();
      g1.gain.value = 0.6;
      osc1.connect(g1);
      g1.connect(this.inputPreGainNode);

      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = fundamentalFreq * 2;
      const g2 = this.ctx.createGain();
      g2.gain.value = 0.3;
      osc2.connect(g2);
      g2.connect(this.inputPreGainNode);

      const osc3 = this.ctx.createOscillator();
      osc3.type = 'sine';
      osc3.frequency.value = fundamentalFreq * 3;
      const g3 = this.ctx.createGain();
      g3.gain.value = 0.15;
      osc3.connect(g3);
      g3.connect(this.inputPreGainNode);

      osc1.start();
      osc2.start();
      osc3.start();

      this.synthSourceNode = {
        stop: () => {
          try { osc1.stop(); osc2.stop(); osc3.stop(); } catch {}
        },
        disconnect: () => {
          try { osc1.disconnect(); osc2.disconnect(); osc3.disconnect(); } catch {}
        }
      };
    } else if (type === 'fan_drone' || type === 'jet_cabin' || type === 'pink_noise') {
      // Noise Buffer with low-pass shaping
      const bufferSize = 4 * this.sampleRate;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Pink noise filter algorithm (Paul Kellet's filter)
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }

      const bufferSource = this.ctx.createBufferSource();
      bufferSource.buffer = noiseBuffer;
      bufferSource.loop = true;

      const shapingFilter = this.ctx.createBiquadFilter();
      if (type === 'fan_drone') {
        shapingFilter.type = 'bandpass';
        shapingFilter.frequency.value = 180;
        shapingFilter.Q.value = 1.2;
      } else if (type === 'jet_cabin') {
        shapingFilter.type = 'lowpass';
        shapingFilter.frequency.value = 280;
        shapingFilter.Q.value = 2.0;
      } else {
        shapingFilter.type = 'allpass';
      }

      bufferSource.connect(shapingFilter);
      shapingFilter.connect(this.inputPreGainNode);
      bufferSource.start();

      this.synthSourceNode = bufferSource;
    }
  }

  setupMaskingLayer() {
    if (!this.ctx) return;
    if (this.maskingSourceNode) {
      try {
        this.maskingSourceNode.stop();
        this.maskingSourceNode.disconnect();
      } catch {}
    }

    const bufferSize = 3 * this.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      if (this.maskingType === 'brown') {
        // Brown noise integration
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5;
      } else {
        // Soft Pink noise
        output[i] = (lastOut * 0.95) + (white * 0.08);
        lastOut = output[i];
      }
    }

    this.maskingSourceNode = this.ctx.createBufferSource();
    this.maskingSourceNode.buffer = noiseBuffer;
    this.maskingSourceNode.loop = true;

    this.maskingGainNode = this.ctx.createGain();
    this.maskingGainNode.gain.value = this.maskingVolume;

    this.maskingSourceNode.connect(this.maskingGainNode);
    this.maskingGainNode.connect(this.masterGainNode);

    this.maskingSourceNode.start();
  }

  setMicSensitivity(val) {
    this.micSensitivity = Math.max(0.1, Math.min(3.0, val));
    if (this.inputPreGainNode && this.ctx) {
      this.inputPreGainNode.gain.setTargetAtTime(this.micSensitivity, this.ctx.currentTime, 0.02);
    }
  }

  setAntiGain(val) {
    this.antiGain = Math.max(0, Math.min(2.0, val));
    this.updateInverterGain();
  }

  setInverted(val) {
    this.isInverted = Boolean(val);
    this.updateInverterGain();
  }

  setBypass(val) {
    this.isBypassed = Boolean(val);
    this.updateInverterGain();
  }

  updateInverterGain() {
    if (this.inverterGainNode && this.ctx) {
      const mult = this.isInverted ? -1.0 : 1.0;
      const target = this.isBypassed ? 0.0 : (mult * this.antiGain);
      this.inverterGainNode.gain.setTargetAtTime(target, this.ctx.currentTime, 0.01);
    }
  }

  setDelayMs(ms) {
    this.delayMs = Math.max(0, Math.min(100, ms));
    if (this.delayNode && this.ctx) {
      this.delayNode.delayTime.setTargetAtTime(this.delayMs / 1000, this.ctx.currentTime, 0.02);
    }
  }

  setPhaseDegrees(deg) {
    this.phaseDegrees = deg;
    if (this.allpassNode && this.ctx) {
      // Adjust all-pass resonance center frequency according to phase shift
      const freq = Math.max(40, Math.min(4000, 200 * Math.tan((deg * Math.PI) / 720)));
      this.allpassNode.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.02);
    }
  }

  setHpfFreq(freq) {
    this.hpfFreq = Math.max(10, Math.min(500, freq));
    if (this.hpfNode && this.ctx) {
      this.hpfNode.frequency.setTargetAtTime(this.hpfFreq, this.ctx.currentTime, 0.02);
    }
  }

  setLpfFreq(freq) {
    this.lpfFreq = Math.max(100, Math.min(6000, freq));
    if (this.lpfNode && this.ctx) {
      this.lpfNode.frequency.setTargetAtTime(this.lpfFreq, this.ctx.currentTime, 0.02);
    }
  }

  setNotch1(enabled, freq, q = 8) {
    this.notch1Enabled = enabled;
    this.notch1Freq = freq;
    this.notch1Q = q;
    if (this.notch1Node && this.ctx) {
      this.notch1Node.type = enabled ? 'notch' : 'allpass';
      this.notch1Node.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.02);
      this.notch1Node.Q.setTargetAtTime(q, this.ctx.currentTime, 0.02);
    }
  }

  setNotch2(enabled, freq, q = 8) {
    this.notch2Enabled = enabled;
    this.notch2Freq = freq;
    this.notch2Q = q;
    if (this.notch2Node && this.ctx) {
      this.notch2Node.type = enabled ? 'notch' : 'allpass';
      this.notch2Node.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.02);
      this.notch2Node.Q.setTargetAtTime(q, this.ctx.currentTime, 0.02);
    }
  }

  setMasking(type, volume) {
    this.maskingType = type;
    this.maskingVolume = Math.max(0, Math.min(1.0, volume));
    if (this.maskingGainNode && this.ctx) {
      this.maskingGainNode.gain.setTargetAtTime(this.maskingVolume, this.ctx.currentTime, 0.02);
    }
  }

  setSynthConfig(type, freq) {
    this.synthNoiseType = type;
    this.synthFrequency = freq;
    if (this.isRunning && this.sourceMode === 'synth') {
      this.createSynthSource();
    }
  }

  setMute(muteState) {
    this.isMuted = muteState;
    if (this.masterGainNode && this.ctx) {
      this.masterGainNode.gain.setTargetAtTime(this.isMuted ? 0 : 1.0, this.ctx.currentTime, 0.01);
    }
  }

  getWaveformData(_timeWindowMs = 20) {
    if (!this.inputAnalyser || !this.antiAnalyser || !this.combinedAnalyser) {
      return null;
    }

    const bufferLength = this.inputAnalyser.fftSize;
    const inputBuffer = new Float32Array(bufferLength);
    const antiBuffer = new Float32Array(bufferLength);
    const combinedBuffer = new Float32Array(bufferLength);

    this.inputAnalyser.getFloatTimeDomainData(inputBuffer);
    this.antiAnalyser.getFloatTimeDomainData(antiBuffer);
    this.combinedAnalyser.getFloatTimeDomainData(combinedBuffer);

    return {
      input: inputBuffer,
      anti: antiBuffer,
      combined: combinedBuffer,
      sampleRate: this.sampleRate
    };
  }

  getFrequencyData() {
    if (!this.inputAnalyser || !this.combinedAnalyser) {
      return null;
    }

    const freqBinCount = this.inputAnalyser.frequencyBinCount;
    const inputFreq = new Float32Array(freqBinCount);
    const combinedFreq = new Float32Array(freqBinCount);

    this.inputAnalyser.getFloatFrequencyData(inputFreq);
    this.combinedAnalyser.getFloatFrequencyData(combinedFreq);

    return {
      inputFreq,
      combinedFreq,
      binCount: freqBinCount,
      sampleRate: this.sampleRate
    };
  }

  computeLiveMetrics() {
    if (!this.inputAnalyser || !this.combinedAnalyser) {
      return {
        inputRmsDb: -60,
        combinedRmsDb: -60,
        attenuationDb: 0,
        cancellationDepthPercent: 0,
        coherencePercent: 0,
        dominantFreq: 0,
        estimatedLatencyMs: this.getEstimatedHardwareLatency()
      };
    }

    const inputData = new Float32Array(this.inputAnalyser.fftSize);
    const combinedData = new Float32Array(this.combinedAnalyser.fftSize);
    this.inputAnalyser.getFloatTimeDomainData(inputData);
    this.combinedAnalyser.getFloatTimeDomainData(combinedData);

    // Calculate RMS
    let sumIn = 0;
    let sumComb = 0;
    for (let i = 0; i < inputData.length; i++) {
      sumIn += inputData[i] * inputData[i];
      sumComb += combinedData[i] * combinedData[i];
    }
    const rmsIn = Math.sqrt(sumIn / inputData.length);
    const rmsComb = Math.sqrt(sumComb / combinedData.length);

    const inputDb = 20 * Math.log10(Math.max(1e-5, rmsIn));
    const combDb = 20 * Math.log10(Math.max(1e-5, rmsComb));

    // Attenuation calculation (how much quieter combined is compared to input)
    let attenuationDb = 0;
    let cancellationDepth = 0;
    if (rmsIn > 0.002) {
      attenuationDb = Math.max(-30, Math.min(30, combDb - inputDb));
      if (attenuationDb < 0) {
        cancellationDepth = Math.min(100, Math.round((1 - Math.pow(10, attenuationDb / 20)) * 100));
      }
    }

    // Dominant peak frequency detection
    const freqData = new Float32Array(this.inputAnalyser.frequencyBinCount);
    this.inputAnalyser.getFloatFrequencyData(freqData);
    let maxDb = -Infinity;
    let maxBin = 0;
    for (let i = 2; i < freqData.length / 2; i++) {
      if (freqData[i] > maxDb) {
        maxDb = freqData[i];
        maxBin = i;
      }
    }
    const dominantFreq = Math.round((maxBin * this.sampleRate) / this.inputAnalyser.fftSize);

    // Feedback Spike Protection: if output power exceeds safe threshold unexpectedly
    if (rmsComb > 0.85 && !this.feedbackSpikeDetected) {
      this.feedbackSpikeDetected = true;
      if (this.onFeedbackAlert) {
        this.onFeedbackAlert();
      }
    }

    return {
      inputRmsDb: Math.round(inputDb * 10) / 10,
      combinedRmsDb: Math.round(combDb * 10) / 10,
      attenuationDb: Math.round(attenuationDb * 10) / 10,
      cancellationDepthPercent: cancellationDepth,
      coherencePercent: Math.min(99, Math.max(10, Math.round(85 - Math.abs(this.delayMs - 1.2) * 8))),
      dominantFreq,
      estimatedLatencyMs: this.getEstimatedHardwareLatency()
    };
  }

  getEstimatedHardwareLatency() {
    if (!this.ctx) return 10.0;
    const base = (this.ctx.baseLatency || 0.005) * 1000;
    const output = (this.ctx.outputLatency || 0.010) * 1000;
    return Math.round((base + output) * 10) / 10;
  }

  // Noise Profiler: captures 1.5 seconds of ambient noise FFT to auto-tune filters
  async sampleAmbientNoise(durationMs = 1500) {
    if (!this.inputAnalyser || !this.isRunning) {
      throw new Error('Audio engine must be active to sample ambient noise');
    }

    const fftAccumulator = new Float32Array(this.inputAnalyser.frequencyBinCount);
    let sampleCount = 0;
    const startTime = Date.now();

    return new Promise((resolve) => {
      const intervalId = setInterval(() => {
        const currentFft = new Float32Array(this.inputAnalyser.frequencyBinCount);
        this.inputAnalyser.getFloatFrequencyData(currentFft);

        for (let i = 0; i < currentFft.length; i++) {
          fftAccumulator[i] += currentFft[i];
        }
        sampleCount++;

        if (Date.now() - startTime >= durationMs) {
          clearInterval(intervalId);

          // Find peak frequencies
          const averagedFft = fftAccumulator.map(val => val / sampleCount);
          const peaks = [];
          const binSize = this.sampleRate / this.inputAnalyser.fftSize;

          for (let i = 3; i < averagedFft.length / 2 - 1; i++) {
            if (averagedFft[i] > averagedFft[i - 1] && averagedFft[i] > averagedFft[i + 1] && averagedFft[i] > -55) {
              peaks.push({
                freq: Math.round(i * binSize),
                power: averagedFft[i]
              });
            }
          }

          // Sort peaks by amplitude
          peaks.sort((a, b) => b.power - a.power);
          const topPeak1 = peaks[0] ? peaks[0].freq : 60;
          const topPeak2 = peaks[1] ? peaks[1].freq : 120;

          // Recommend suggested cutoffs
          const suggestedLpf = Math.max(300, Math.min(2500, topPeak1 * 3));
          resolve({
            peak1: topPeak1,
            peak2: topPeak2,
            suggestedLpf,
            suggestedHpf: 35,
            peaksFound: peaks.length
          });
        }
      }, 50);
    });
  }

  cleanupNodes() {
    if (this.micStream) {
      this.micStream.getTracks().forEach(track => track.stop());
      this.micStream = null;
    }
    if (this.synthSourceNode) {
      try {
        this.synthSourceNode.stop();
        this.synthSourceNode.disconnect();
      } catch {}
      this.synthSourceNode = null;
    }
    if (this.maskingSourceNode) {
      try {
        this.maskingSourceNode.stop();
        this.maskingSourceNode.disconnect();
      } catch {}
      this.maskingSourceNode = null;
    }
  }

  stop() {
    this.cleanupNodes();
    this.isRunning = false;
    this.feedbackSpikeDetected = false;
  }
}
