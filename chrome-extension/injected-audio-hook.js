// AuraWave Main World Audio Interceptor
// Intercepts Web Audio API and HTMLMediaElement audio streams directly from web pages
(function () {
  if (window.__aurawave_hooked) return;
  window.__aurawave_hooked = true;

  let sharedAnalyser = null;
  let sharedAudioCtx = null;
  let freqArray = null;
  let isBroadcasting = false;

  function ensureAnalyser(ctx) {
    if (!sharedAnalyser || sharedAudioCtx !== ctx) {
      sharedAudioCtx = ctx;
      sharedAnalyser = ctx.createAnalyser();
      sharedAnalyser.fftSize = 128;
      sharedAnalyser.smoothingTimeConstant = 0.8;
      freqArray = new Uint8Array(sharedAnalyser.frequencyBinCount);
      startBroadcasting();
    }
  }

  function startBroadcasting() {
    if (isBroadcasting) return;
    isBroadcasting = true;

    function broadcast() {
      if (sharedAnalyser && sharedAudioCtx && sharedAudioCtx.state === 'running') {
        sharedAnalyser.getByteFrequencyData(freqArray);
        
        // Calculate average volume to avoid posting silent frames
        let sum = 0;
        for (let i = 0; i < freqArray.length; i++) {
          sum += freqArray[i];
        }
        
        window.postMessage({
          type: 'AURAWAVE_AUDIO_FRAME',
          data: Array.from(freqArray),
          volume: sum / freqArray.length
        }, '*');
      }
      requestAnimationFrame(broadcast);
    }
    requestAnimationFrame(broadcast);
  }

  // Hook AudioNode.prototype.connect
  if (window.AudioNode && AudioNode.prototype.connect) {
    const originalConnect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (destination, outputIndex, _inputIndex) {
      try {
        if (this.context && destination === this.context.destination) {
          ensureAnalyser(this.context);
          if (sharedAnalyser) {
            originalConnect.call(this, sharedAnalyser, outputIndex, 0);
          }
        }
      } catch {
        // Fallback silently if connect fails
      }
      return originalConnect.apply(this, arguments);
    };
  }

  // Hook HTMLMediaElement for <audio> and <video> tags
  function hookMediaElement(media) {
    if (media.__aurawave_attached) return;
    media.__aurawave_attached = true;

    const setupSource = () => {
      try {
        if (!sharedAudioCtx) {
          sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (sharedAudioCtx.state === 'suspended') {
          sharedAudioCtx.resume();
        }
        ensureAnalyser(sharedAudioCtx);

        if (!media.__aurawave_source) {
          const source = sharedAudioCtx.createMediaElementSource(media);
          source.connect(sharedAnalyser);
          source.connect(sharedAudioCtx.destination);
          media.__aurawave_source = source;
        }
      } catch {
        // Cross-origin audio or already connected source
      }
    };

    media.addEventListener('play', setupSource);
    if (!media.paused) setupSource();
  }

  // Scan existing media elements and observe future ones
  document.querySelectorAll('audio, video').forEach(hookMediaElement);
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(m => {
      m.addedNodes.forEach(node => {
        if (node.tagName === 'AUDIO' || node.tagName === 'VIDEO') {
          hookMediaElement(node);
        } else if (node.querySelectorAll) {
          node.querySelectorAll('audio, video').forEach(hookMediaElement);
        }
      });
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
