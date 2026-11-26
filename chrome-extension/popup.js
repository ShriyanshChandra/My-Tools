document.addEventListener('DOMContentLoaded', () => {
  const presetBtns = document.querySelectorAll('.preset-btn');
  const themeBtns = document.querySelectorAll('.theme-option');
  const btnToggleVisibility = document.getElementById('btnToggleVisibility');
  const btnToggleMic = document.getElementById('btnToggleMic');
  const micBtnText = document.getElementById('micBtnText');
  const heightSlider = document.getElementById('heightSlider');
  const heightVal = document.getElementById('heightVal');
  const sensSlider = document.getElementById('sensSlider');
  const sensVal = document.getElementById('sensVal');

  // Load saved preferences
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['mode', 'theme', 'height', 'sensitivity', 'micActive'], (items) => {
      if (items.mode) {
        presetBtns.forEach(b => {
          if (b.dataset.mode === items.mode) b.classList.add('active');
          else b.classList.remove('active');
        });
      }
      if (items.theme) {
        themeBtns.forEach(b => {
          if (b.dataset.theme === items.theme) b.classList.add('active');
          else b.classList.remove('active');
        });
      }
      if (items.height) {
        heightSlider.value = items.height;
        heightVal.textContent = `${items.height}px`;
      }
      if (items.sensitivity) {
        sensSlider.value = items.sensitivity;
        sensVal.textContent = `${items.sensitivity}x`;
      }
      if (items.micActive) {
        btnToggleMic.classList.add('active');
        micBtnText.textContent = 'Microphone Live (Active)';
      }
    });
  }

  // Preset Mode Buttons
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      presetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.dataset.mode;
      notifyTabs({ action: 'SET_MODE', mode });
      if (chrome.storage) chrome.storage.local.set({ mode });
    });
  });

  // Theme Buttons
  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      themeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const theme = btn.dataset.theme;
      notifyTabs({ action: 'SET_THEME', theme });
      if (chrome.storage) chrome.storage.local.set({ theme });
    });
  });

  // Height Slider
  heightSlider.addEventListener('input', (e) => {
    const height = parseInt(e.target.value, 10);
    heightVal.textContent = `${height}px`;
    notifyTabs({ action: 'SET_HEIGHT', height });
    if (chrome.storage) chrome.storage.local.set({ height });
  });

  // Sensitivity Slider
  sensSlider.addEventListener('input', (e) => {
    const sensitivity = parseFloat(e.target.value);
    sensVal.textContent = `${sensitivity.toFixed(1)}x`;
    notifyTabs({ action: 'SET_SENSITIVITY', sensitivity });
    if (chrome.storage) chrome.storage.local.set({ sensitivity });
  });

  // Toggle Microphone
  btnToggleMic.addEventListener('click', () => {
    btnToggleMic.classList.toggle('active');
    const isMic = btnToggleMic.classList.contains('active');
    micBtnText.textContent = isMic ? 'Microphone Live (Active)' : 'Enable Room / Mic Audio';
    notifyTabs({ action: 'TOGGLE_MIC' });
    if (chrome.storage) chrome.storage.local.set({ micActive: isMic });
  });

  // Toggle Visibility
  btnToggleVisibility.addEventListener('click', () => {
    notifyTabs({ action: 'TOGGLE_VISIBILITY' });
  });

  function notifyTabs(message) {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, message).catch(() => {});
        }
      });
    }
  }
});
