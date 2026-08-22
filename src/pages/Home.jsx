import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import {
  Terminal,
  QrCode,
  ArrowRight,
  Palette,
  Music,
  Lock,
  Unlock,
  Shield,
  Sparkles,
  Radio
} from 'lucide-react';
import LockModal from '../components/LockModal';
import '../App.css';

function Home() {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem('app-theme') || 'neon');
  const [isUnlocked, setIsUnlocked] = useState(
    sessionStorage.getItem('tools-unlocked') === 'true'
  );
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [hiddenOverrides, setHiddenOverrides] = useState(() => {
    try {
      const saved = localStorage.getItem('tools-hidden-overrides');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleTheme = () => {
    const newTheme = theme === 'neon' ? 'tlou' : 'neon';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('app-theme', newTheme);
  };

  const handleUnlockSuccess = (token) => {
    setIsUnlocked(true);
    sessionStorage.setItem('tools-unlocked', 'true');
    if (token) sessionStorage.setItem('tools-token', token);
  };

  const handleLock = () => {
    setIsUnlocked(false);
    sessionStorage.removeItem('tools-unlocked');
    sessionStorage.removeItem('tools-token');
  };

  // Fetch remote visibility overrides on load
  React.useEffect(() => {
    const fetchRemoteVisibility = async () => {
      try {
        const remoteBackend = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/+$/, '');
        const endpoints = [];
        if (remoteBackend) endpoints.push(`${remoteBackend}/api/settings/visibility`);
        endpoints.push('/api/settings/visibility');

        for (const ep of endpoints) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);
            const res = await fetch(ep, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (res.ok) {
              const data = await res.json();
              if (data.success && data.overrides) {
                setHiddenOverrides(prev => {
                  const merged = { ...prev, ...data.overrides };
                  try {
                    localStorage.setItem('tools-hidden-overrides', JSON.stringify(merged));
                  } catch {
                    // Local storage fallback
                  }
                  return merged;
                });
                break;
              }
            }
          } catch {
            // Try next endpoint
          }
        }
      } catch {
        // Use local fallback
      }
    };

    fetchRemoteVisibility();
  }, []);

  // Helper to sync visibility updates to the cloud backend
  const syncVisibilityToCloud = async (updatedOverrides) => {
    try {
      const remoteBackend = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/+$/, '');
      const endpoints = [];
      if (remoteBackend) endpoints.push(`${remoteBackend}/api/settings/visibility`);
      endpoints.push('/api/settings/visibility');

      for (const ep of endpoints) {
        try {
          fetch(ep, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ overrides: updatedOverrides })
          }).catch(() => {});
        } catch {
          // Ignore
        }
      }
    } catch {
      // Ignore
    }
  };

  const handleResetVisibility = () => {
    localStorage.removeItem('tools-hidden-overrides');
    const resetMap = {
      qr: false,
      sound: true,
      'network-map': true,
      encrypt: false
    };
    setHiddenOverrides(resetMap);
    syncVisibilityToCloud(resetMap);
  };

  const toolsPlaceholder = [
    {
      id: 'qr',
      title: 'QR Code Generator',
      desc: 'Instantly generate high-quality QR codes for URLs with custom domain labels.',
      icon: <QrCode size={28} color="var(--tool-accent)" />,
      delay: '0.1s',
      color: 'var(--tool-accent)',
      path: '/qr',
      hidden: false
    },
    {
      id: 'sound',
      title: 'Background Sound',
      desc: 'Mix ambient background sounds (Rain, Ocean, Noise) with custom frequency tones & binaural beats for focus, study & sleep.',
      icon: <Music size={28} color="#ff2a85" />,
      delay: '0.2s',
      color: '#ff2a85',
      path: '/sound',
      hidden: true
    },
    {
      id: 'network-map',
      title: 'Network Map',
      desc: 'Interactive 2D room WiFi & bandwidth heatmap. Map coverage, measure live Mbps/ping, spot dead zones, and optimize router placement.',
      icon: <Radio size={28} color="#00fa9a" />,
      delay: '0.25s',
      color: '#00fa9a',
      path: '/network-map',
      hidden: true
    },
    {
      id: 'encrypt',
      title: 'Secret Crypt Suite',
      desc: 'Military-grade AES-256 text encryption, Base64 encoder, Hex converter, and cryptographic hash generator.',
      icon: <Shield size={28} color="#00d2ff" />,
      delay: '0.3s',
      color: '#00d2ff',
      path: '/encrypt',
      hidden: false
    }
  ];

  const isToolHidden = (tool) => {
    return hiddenOverrides[tool.id] !== undefined
      ? hiddenOverrides[tool.id]
      : Boolean(tool.hidden);
  };

  const toggleToolHidden = (toolId, e) => {
    e.preventDefault();
    e.stopPropagation();
    setHiddenOverrides(prev => {
      const defaultHidden = Boolean(toolsPlaceholder.find(t => t.id === toolId)?.hidden);
      const currentVal = prev[toolId] !== undefined ? prev[toolId] : defaultHidden;
      const updated = { ...prev, [toolId]: !currentVal };
      try {
        localStorage.setItem('tools-hidden-overrides', JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save visibility preference:', err);
      }
      syncVisibilityToCloud(updated);
      return updated;
    });
  };

  const visibleTools = toolsPlaceholder.filter(tool => isUnlocked || !isToolHidden(tool));

  return (
    <>
      {/* Animated Background */}
      <div className="blob-container">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <div className="app-container">
        {/* Header */}
        <nav className="navbar glass">
          <div className="navbar-left">
            <button
              id="lock-btn"
              className={`icon-btn lock-btn ${isUnlocked ? 'unlocked' : 'locked'}`}
              title={isUnlocked ? 'Secret Tools Unlocked (Click to lock)' : 'Unlock Secret Tools'}
              onClick={() => setIsLockModalOpen(true)}
            >
              {isUnlocked ? (
                <Unlock size={19} className="lock-icon unlocked-icon" />
              ) : (
                <Lock size={19} className="lock-icon locked-icon" />
              )}
              <span className={`lock-status-dot ${isUnlocked ? 'dot-unlocked' : ''}`} />
            </button>
            <div className="logo">
              <Terminal className="logo-icon" size={32} />
              <span>My <span className="text-gradient">Tools</span></span>
            </div>
          </div>
          <div className="navbar-right">
            <button className="icon-btn" title="Change Theme" onClick={toggleTheme}>
              <Palette size={20} />
            </button>
          </div>
        </nav>

        {/* Hero Section */}
        <header className="hero">
          {isUnlocked && (
            <div className="hero-tag unlocked-badge-hero">
              <Sparkles size={14} />
              <span>Admin Mode Active • Toggle tool visibility below</span>
            </div>
          )}
          <h1>
            Your Personal <br />
            <span className="text-gradient">Superpower Suite</span>
          </h1>
          <p>
            A collection of fast, beautiful, and secure utilities crafted
            to boost your daily productivity. No ads, no tracking.
          </p>
        </header>

        {/* Tools Grid */}
        <main className="tools-grid">
          {visibleTools.map((tool, index) => {
            const hiddenStatus = isToolHidden(tool);
            return (
              <Link
                to={tool.path}
                key={tool.id}
                className={`tool-card ${hiddenStatus ? 'secret-tool-card' : ''}`}
                style={{ animationDelay: tool.delay, textDecoration: 'none' }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className="card-content">
                  {/* Visibility Switch Toggle - Visible ONLY when unlocked */}
                  {isUnlocked && (
                    <div
                      className="toggle-switch-wrapper"
                      onClick={(e) => toggleToolHidden(tool.id, e)}
                      title={hiddenStatus ? 'Tool is Hidden when locked (Click to make visible)' : 'Tool is Visible (Click to hide when locked)'}
                    >
                      <button
                        type="button"
                        className={`ios-toggle-switch ${hiddenStatus ? 'is-hidden-red' : 'is-visible-green'}`}
                        aria-label="Toggle tool hidden state"
                      >
                        <span className="toggle-switch-thumb">
                          {hiddenStatus ? (
                            <Lock size={13} className="switch-icon-lock" />
                          ) : (
                            <Unlock size={13} className="switch-icon-unlock" />
                          )}
                        </span>
                      </button>
                    </div>
                  )}

                  <div
                    className="card-icon-wrapper"
                    style={{
                      boxShadow: hoveredIndex === index ? `0 0 1.25rem ${tool.color}40` : 'none',
                      borderColor: hoveredIndex === index ? `${tool.color}50` : 'rgba(255,255,255,0.05)'
                    }}
                  >
                    {tool.icon}
                  </div>
                  <h3>{tool.title}</h3>
                  <p>{tool.desc}</p>
                  <div className="card-action">
                    <span>Open Tool</span>
                    <ArrowRight size={18} />
                  </div>
                </div>
              </Link>
            );
          })}
        </main>
      </div>

      {/* Secret Tools Unlock Modal */}
      <LockModal
        isOpen={isLockModalOpen}
        onClose={() => setIsLockModalOpen(false)}
        isUnlocked={isUnlocked}
        onUnlockSuccess={handleUnlockSuccess}
        onLock={handleLock}
        onResetVisibility={handleResetVisibility}
      />
    </>
  );
}

export default Home;


