# AuraHUD - Chrome Extension (Manifest V3)

AuraHUD is a glassmorphic top navigation HUD that runs a live canvas visualizer (ambient procedural waveforms, equalizer spectrum bars, cyber aurora, particle fields, and real-time microphone Web Audio reactivity) directly behind navigation buttons and address bar.

---

## Architecture & How It Works

Because Chrome isolates its native C++ toolbar from direct DOM/Canvas injection for security reasons, AuraHUD implements **Approach 1: Injected Top Navigation HUD**:
1. **Isolated Shadow DOM**: Injects a fixed top host element with a shadow root so the visualizer and HUD styling never interfere with webpage styles.
2. **Canvas Visualizer Engine**: Runs a 60 FPS HTML5 Canvas engine right behind the glassmorphism navigation buttons, omnibar, and control clusters.
3. **Omnibox & History Navigation**: Includes back/forward navigation (`history.back()`, `history.forward()`), reload, copy URL, and a smart search/address input.
4. **Web Audio Reactive & Ambient Modes**: Supports live microphone input via `AudioContext` and `AnalyserNode`, as well as mathematical procedural waves when audio input is idle.

---

## Installation Guide (Load Unpacked in Chrome)

1. Open Google Chrome.
2. Navigate to `chrome://extensions`.
3. Toggle on **Developer mode** in the top right corner.
4. Click **Load unpacked** in the top left corner.
5. Select the `chrome-extension` folder inside this project directory (`/Users/shriyanshchandra/Coding/Projects/My Tools/chrome-extension`).
6. Open any website (e.g. `https://github.com`, `https://wikipedia.org`, or `http://localhost:5173`) and you will see AuraHUD active at the top of the screen.

---

## Keyboard Shortcuts & Controls

- **Toggle HUD Visibility**: `Alt + Shift + V`
- **Minimize / Restore**: Click the chevron minimize button on the right, or hover near the top 6px trigger strip to restore.
- **Switch Modes**: Choose between Pulse Waves, Equalizer Bars, Cyber Aurora, Starlight Drift, or Mic Reactive from the dropdown.
- **Change Theme**: Select any of the 5 neon color palettes (Cyan, Purple, Emerald, Amber, Rose).
- **Address Bar**: Type any URL or search term and press Enter.
