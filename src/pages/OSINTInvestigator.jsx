import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Globe,
  Fingerprint,
  ExternalLink,
  Copy,
  Check,
  Cpu,
  Layers,
  FileText,
  Download,
  Key,
  ShieldAlert,
  Eye,
  Target,
  AtSign,
  Phone,
  MapPin,
  Building,
  Sparkles,
  RefreshCw,
  Trash2,
  Network,
  Compass,
  UserCheck,
  Clock,
  EyeOff,
  X
} from 'lucide-react';
import {
  openUrlIncognito,
  openMultipleUrlsIncognito,
  generateDorkMatrix,
  generateUsernamePermutations,
  generateEmailPermutations,
  checkGravatar,
  OSINT_PLATFORMS,
  analyzeWithGemini,
  exportDossierMarkdown,
  exportDossierJSON
} from '../utils/osintEngine';
import './OSINTInvestigator.css';

const DEMO_TARGETS = [
  {
    name: 'Linus Torvalds',
    username: 'torvalds',
    email: 'torvalds@linux-foundation.org',
    phone: '',
    location: 'Portland, OR, USA',
    company: 'Linux Foundation',
    domain: 'kernel.org',
    tags: 'linux, git, open source, kernel creator'
  },
  {
    name: 'Satya Nadella',
    username: 'satyanadella',
    email: '',
    phone: '',
    location: 'Bellevue, WA, USA',
    company: 'Microsoft',
    domain: 'microsoft.com',
    tags: 'cloud, enterprise, ceo, technology leadership'
  },
  {
    name: 'Alex Rivera',
    username: 'arivera_sec',
    email: 'alex.rivera@cyberguard-labs.io',
    phone: '+1 555 319 8241',
    location: 'Austin, Texas',
    company: 'CyberGuard Labs',
    domain: 'cyberguard-labs.io',
    tags: 'appsec, red team, incident response, reverse engineering'
  }
];

const OSINTInvestigator = () => {
  // Target Input States
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [company, setCompany] = useState('');
  const [domain, setDomain] = useState('');
  const [tags, setTags] = useState('');

  // Active Target state (submitted investigation)
  const [activeTarget, setActiveTarget] = useState(null);
  const [validationError, setValidationError] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // overview, ai, dorks, usernames, email, graph

  // Dork filters
  const [selectedDorkCategory, setSelectedDorkCategory] = useState('all');
  const [dorkSearchFilter, setDorkSearchFilter] = useState('');

  // Copied item feedback
  const [copiedId, setCopiedId] = useState(null);

  // Gravatar status
  const [gravatarData, setGravatarData] = useState({ exists: false, avatarUrl: null });

  // Incognito Mode State (Defaults to ON for OSINT operations)
  const [isIncognitoMode, setIsIncognitoMode] = useState(() => {
    return localStorage.getItem('osint_incognito_mode') !== 'false';
  });

  const toggleIncognitoMode = () => {
    setIsIncognitoMode(prev => {
      const next = !prev;
      localStorage.setItem('osint_incognito_mode', String(next));
      return next;
    });
  };

  // Gemini AI Reconnaissance State
  const [geminiApiKey, setGeminiApiKey] = useState(() => {
    return localStorage.getItem('osint_gemini_api_key') || import.meta.env.VITE_GOOGLE_API_KEY || '';
  });
  const [geminiModel, setGeminiModel] = useState(() => {
    return localStorage.getItem('osint_gemini_model') || import.meta.env.VITE_GEMINI_MODEL || 'gemini-3.7-flash';
  });
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiResult, setAiResult] = useState(null);

  // Settings & History Modal States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [investigationHistory, setInvestigationHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('osint_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Custom Notes
  const [customNotes, setCustomNotes] = useState('');

  // Interactive Canvas Ref
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const graphStateRef = useRef({
    nodes: [],
    links: [],
    draggedNode: null,
    hoveredNode: null,
    zoom: 1,
    pan: { x: 0, y: 0 },
    isPanning: false,
    startPan: { x: 0, y: 0 }
  });

  // Copy helper
  const handleCopy = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Quick Load Demo Target
  const loadDemoTarget = (demo) => {
    setFullName(demo.name);
    setUsername(demo.username);
    setEmail(demo.email);
    setPhone(demo.phone);
    setLocation(demo.location);
    setCompany(demo.company);
    setDomain(demo.domain);
    setTags(demo.tags);
    setValidationError('');
  };

  // Clear Form
  const handleClearAll = () => {
    setFullName('');
    setUsername('');
    setEmail('');
    setPhone('');
    setLocation('');
    setCompany('');
    setDomain('');
    setTags('');
    setActiveTarget(null);
    setAiResult(null);
    setAiError(null);
    setValidationError('');
    setGravatarData({ exists: false, avatarUrl: null });
  };

  // Launch Investigation
  const handleLaunchInvestigation = (e) => {
    if (e) e.preventDefault();
    if (!fullName || !fullName.trim()) {
      setValidationError('Full Name is mandatory to initiate an OSINT investigation.');
      return;
    }
    setValidationError('');

    const targetObj = {
      fullName: fullName.trim(),
      username: username.trim(),
      email: email.trim(),
      phone: phone.trim(),
      location: location.trim(),
      company: company.trim(),
      domain: domain.trim(),
      tags: tags.trim(),
      timestamp: new Date().toISOString()
    };

    setActiveTarget(targetObj);

    // Check Gravatar if email provided
    if (targetObj.email) {
      checkGravatar(targetObj.email).then(data => {
        setGravatarData(data);
      });
    } else {
      setGravatarData({ exists: false, avatarUrl: null });
    }

    // Save to history
    setInvestigationHistory(prev => {
      const filtered = prev.filter(item => item.fullName.toLowerCase() !== targetObj.fullName.toLowerCase());
      const updated = [targetObj, ...filtered].slice(0, 15);
      try {
        localStorage.setItem('osint_history', JSON.stringify(updated));
      } catch {
        // Fallback
      }
      return updated;
    });
  };

  // Load from History
  const loadHistoryItem = (item) => {
    setFullName(item.fullName || '');
    setUsername(item.username || '');
    setEmail(item.email || '');
    setPhone(item.phone || '');
    setLocation(item.location || '');
    setCompany(item.company || '');
    setDomain(item.domain || '');
    setTags(item.tags || '');
    setActiveTarget(item);
    setIsHistoryOpen(false);
    if (item.email) {
      checkGravatar(item.email).then(data => setGravatarData(data));
    }
  };

  // Save Settings
  const handleSaveSettings = () => {
    localStorage.setItem('osint_gemini_api_key', geminiApiKey.trim());
    localStorage.setItem('osint_gemini_model', geminiModel);
    setIsSettingsOpen(false);
  };

  // Run Gemini AI Analysis
  const handleRunAiAnalysis = async () => {
    if (!activeTarget) return;
    setIsAiLoading(true);
    setAiError(null);

    try {
      const result = await analyzeWithGemini(activeTarget, geminiApiKey, geminiModel);
      setAiResult(result);
    } catch (err) {
      setAiError(err.message || 'Failed to complete AI Reconnaissance. Please check your API key.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Generated dorks matrix
  const dorksMatrix = useMemo(() => {
    if (!activeTarget) return [];
    return generateDorkMatrix(activeTarget);
  }, [activeTarget]);

  // Filtered dorks
  const filteredDorks = useMemo(() => {
    return dorksMatrix.filter(d => {
      const matchesCategory = selectedDorkCategory === 'all' || d.category === selectedDorkCategory;
      const matchesSearch = !dorkSearchFilter ||
        d.title.toLowerCase().includes(dorkSearchFilter.toLowerCase()) ||
        d.query.toLowerCase().includes(dorkSearchFilter.toLowerCase()) ||
        d.description.toLowerCase().includes(dorkSearchFilter.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [dorksMatrix, selectedDorkCategory, dorkSearchFilter]);

  // Username & Email Permutations
  const usernamePermutations = useMemo(() => {
    if (!activeTarget) return [];
    return generateUsernamePermutations(activeTarget.fullName, activeTarget.company);
  }, [activeTarget]);

  const emailPermutations = useMemo(() => {
    if (!activeTarget || (!activeTarget.domain && !activeTarget.company)) return [];
    const dom = activeTarget.domain || `${activeTarget.company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
    return generateEmailPermutations(activeTarget.fullName, dom);
  }, [activeTarget]);

  // Export handlers
  const handleExportMarkdown = () => {
    if (!activeTarget) return;
    const md = exportDossierMarkdown(activeTarget, dorksMatrix, aiResult);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dossier_${activeTarget.fullName.toLowerCase().replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    if (!activeTarget) return;
    const jsonStr = exportDossierJSON(activeTarget, dorksMatrix, aiResult, customNotes);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dossier_${activeTarget.fullName.toLowerCase().replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Initialize and run Canvas Graph
  useEffect(() => {
    if (activeTab !== 'graph' || !activeTarget) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Build Graph Nodes & Links
    const nodes = [];
    const links = [];

    // Central Root Node
    const rootNode = {
      id: 'root',
      label: activeTarget.fullName,
      type: 'person',
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: 0,
      vy: 0,
      radius: 28,
      color: '#00d2ff'
    };
    nodes.push(rootNode);

    // Username node
    if (activeTarget.username) {
      const uNode = {
        id: 'user',
        label: `@${activeTarget.username}`,
        type: 'username',
        x: canvas.width / 2 + (Math.random() - 0.5) * 140,
        y: canvas.height / 2 - 100,
        vx: 0,
        vy: 0,
        radius: 20,
        color: '#00fa9a'
      };
      nodes.push(uNode);
      links.push({ source: rootNode, target: uNode, label: 'handle' });
    }

    // Email node
    if (activeTarget.email) {
      const eNode = {
        id: 'email',
        label: activeTarget.email,
        type: 'email',
        x: canvas.width / 2 - 120,
        y: canvas.height / 2 - 60,
        vx: 0,
        vy: 0,
        radius: 18,
        color: '#38bdf8'
      };
      nodes.push(eNode);
      links.push({ source: rootNode, target: eNode, label: 'email' });
    }

    // Company node
    if (activeTarget.company) {
      const cNode = {
        id: 'comp',
        label: activeTarget.company,
        type: 'company',
        x: canvas.width / 2 + 130,
        y: canvas.height / 2 + 70,
        vx: 0,
        vy: 0,
        radius: 22,
        color: '#ffaa00'
      };
      nodes.push(cNode);
      links.push({ source: rootNode, target: cNode, label: 'works at' });
    }

    // Location node
    if (activeTarget.location) {
      const lNode = {
        id: 'loc',
        label: activeTarget.location,
        type: 'location',
        x: canvas.width / 2 - 110,
        y: canvas.height / 2 + 90,
        vx: 0,
        vy: 0,
        radius: 18,
        color: '#ff5577'
      };
      nodes.push(lNode);
      links.push({ source: rootNode, target: lNode, label: 'based in' });
    }

    // Domain node
    if (activeTarget.domain) {
      const dNode = {
        id: 'domain',
        label: activeTarget.domain,
        type: 'domain',
        x: canvas.width / 2 + 90,
        y: canvas.height / 2 - 110,
        vx: 0,
        vy: 0,
        radius: 18,
        color: '#8a2be2'
      };
      nodes.push(dNode);
      links.push({ source: rootNode, target: dNode, label: 'domain' });
    }

    // Platform sample nodes
    const topPlatforms = ['GitHub', 'LinkedIn', 'Twitter/X', 'Reddit'];
    topPlatforms.forEach((p, idx) => {
      const angle = (idx / topPlatforms.length) * Math.PI * 2;
      const pNode = {
        id: `plat_${p}`,
        label: p,
        type: 'platform',
        x: canvas.width / 2 + Math.cos(angle) * 190,
        y: canvas.height / 2 + Math.sin(angle) * 190,
        vx: 0,
        vy: 0,
        radius: 15,
        color: '#f72585'
      };
      nodes.push(pNode);
      links.push({ source: rootNode, target: pNode, label: 'pivot' });
    });

    graphStateRef.current.nodes = nodes;
    graphStateRef.current.links = links;

    // Simulation loop
    let isRunning = true;

    const render = () => {
      if (!isRunning) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const state = graphStateRef.current;
      const currentNodes = state.nodes;
      const currentLinks = state.links;

      // Spring physics
      for (let i = 0; i < currentNodes.length; i++) {
        for (let j = i + 1; j < currentNodes.length; j++) {
          const n1 = currentNodes[i];
          const n2 = currentNodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < 180) {
            const force = (180 - dist) / dist * 0.04;
            n1.vx -= dx * force;
            n1.vy -= dy * force;
            n2.vx += dx * force;
            n2.vy += dy * force;
          }
        }
      }

      currentLinks.forEach(link => {
        const dx = link.target.x - link.source.x;
        const dy = link.target.y - link.source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 130) * 0.02;
        link.source.vx += (dx / dist) * force;
        link.source.vy += (dy / dist) * force;
        link.target.vx -= (dx / dist) * force;
        link.target.vy -= (dy / dist) * force;
      });

      // Update positions
      currentNodes.forEach(node => {
        if (node !== state.draggedNode) {
          node.x += node.vx;
          node.y += node.vy;
          node.vx *= 0.85;
          node.vy *= 0.85;

          // Boundary constraints
          node.x = Math.max(node.radius + 10, Math.min(canvas.width - node.radius - 10, node.x));
          node.y = Math.max(node.radius + 10, Math.min(canvas.height - node.radius - 10, node.y));
        }
      });

      // Draw Links
      currentLinks.forEach(link => {
        ctx.beginPath();
        ctx.moveTo(link.source.x, link.source.y);
        ctx.lineTo(link.target.x, link.target.y);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Draw label
        if (link.label) {
          const midX = (link.source.x + link.target.x) / 2;
          const midY = (link.source.y + link.target.y) / 2;
          ctx.font = '10px sans-serif';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.textAlign = 'center';
          ctx.fillText(link.label, midX, midY - 4);
        }
      });

      // Draw Nodes
      currentNodes.forEach(node => {
        ctx.save();
        ctx.shadowColor = node.color;
        ctx.shadowBlur = 12;

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
        ctx.restore();

        // Node Text
        ctx.font = node.type === 'person' ? 'bold 12px sans-serif' : '11px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.x, node.y + node.radius + 14);
      });

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    // Mouse interactions
    const handleMouseDown = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const clicked = graphStateRef.current.nodes.find(n => {
        const dx = n.x - mouseX;
        const dy = n.y - mouseY;
        return Math.sqrt(dx * dx + dy * dy) <= n.radius;
      });

      if (clicked) {
        graphStateRef.current.draggedNode = clicked;
      }
    };

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (graphStateRef.current.draggedNode) {
        graphStateRef.current.draggedNode.x = mouseX;
        graphStateRef.current.draggedNode.y = mouseY;
        graphStateRef.current.draggedNode.vx = 0;
        graphStateRef.current.draggedNode.vy = 0;
      }
    };

    const handleMouseUp = () => {
      graphStateRef.current.draggedNode = null;
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      isRunning = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeTab, activeTarget]);

  return (
    <div className="osint-container">
      {/* Header */}
      <header className="osint-header glass">
        <div className="osint-title-group">
          <Link to="/" className="osint-btn osint-btn-secondary" title="Return to Dashboard">
            <ArrowLeft size={18} />
            <span>Back</span>
          </Link>
          <div className="osint-badge-icon">
            <Fingerprint size={24} />
          </div>
          <div>
            <h1>OSINT <span className="text-gradient">Investigator</span></h1>
            <p className="osint-subtitle">Automated Persona Reconnaissance, Search Pivot Matrix & AI Dossier Synthesis</p>
          </div>
        </div>

        <div className="osint-header-actions">
          <button
            type="button"
            className={`osint-btn ${isIncognitoMode ? 'osint-btn-incognito' : 'osint-btn-secondary'}`}
            onClick={toggleIncognitoMode}
            title={isIncognitoMode ? 'Incognito Mode: ON (Search links spawn private browser windows)' : 'Incognito Mode: OFF (Click to enable incognito mode)'}
          >
            <EyeOff size={16} />
            <span>Incognito: {isIncognitoMode ? 'ON' : 'OFF'}</span>
          </button>

          <button
            type="button"
            className="osint-btn osint-btn-secondary"
            onClick={() => setIsHistoryOpen(true)}
            title="View recent target investigations"
          >
            <Clock size={16} />
            <span>History</span>
          </button>

          <button
            type="button"
            className="osint-btn osint-btn-secondary"
            onClick={() => setIsSettingsOpen(true)}
            title="Configure Gemini AI API Key and Models"
          >
            <Key size={16} />
            <span>API Settings</span>
          </button>

          {activeTarget && (
            <>
              <button
                type="button"
                className="osint-btn osint-btn-secondary"
                onClick={handleExportMarkdown}
                title="Download formatted investigation dossier as Markdown"
              >
                <Download size={16} />
                <span>Export (.md)</span>
              </button>

              <button
                type="button"
                className="osint-btn osint-btn-secondary"
                onClick={handleExportJSON}
                title="Download investigation data as structured JSON"
              >
                <Download size={16} />
                <span>Export (.json)</span>
              </button>

              <button
                type="button"
                className="osint-btn osint-btn-danger"
                onClick={handleClearAll}
                title="Clear current target"
              >
                <Trash2 size={16} />
                <span>Clear</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Grid Layout */}
      <div className="osint-grid">
        {/* Left Panel: Target Input Form */}
        <aside className="osint-card">
          <div className="osint-card-header">
            <h2>
              <Target size={18} color="var(--tool-osint-color)" />
              <span>Target Indicators</span>
            </h2>
            <span className="osint-badge">Persona Form</span>
          </div>

          <form onSubmit={handleLaunchInvestigation} className="osint-form">
            {/* Mandatory: Full Name */}
            <div className="osint-field-group">
              <label className="osint-label">
                <span>Full Name <span className="osint-req-star">* Mandatory</span></span>
                <span className="osint-badge">Required</span>
              </label>
              <div className="osint-input-wrap">
                <UserCheck size={16} className="osint-input-icon" />
                <input
                  type="text"
                  className={`osint-input ${validationError ? 'osint-input-error' : ''}`}
                  placeholder="e.g. Johnathan Doe"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (validationError) setValidationError('');
                  }}
                  autoFocus
                />
              </div>
              {validationError && (
                <div className="osint-error-text">{validationError}</div>
              )}
            </div>

            {/* Optional: Username */}
            <div className="osint-field-group">
              <label className="osint-label">
                <span>Username / Online Alias</span>
                <span className="osint-badge-optional">Optional</span>
              </label>
              <div className="osint-input-wrap">
                <AtSign size={16} className="osint-input-icon" />
                <input
                  type="text"
                  className="osint-input"
                  placeholder="e.g. jdoe_dev"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            {/* Optional: Email */}
            <div className="osint-field-group">
              <label className="osint-label">
                <span>Known Email Address</span>
                <span className="osint-badge-optional">Optional</span>
              </label>
              <div className="osint-input-wrap">
                <AtSign size={16} className="osint-input-icon" />
                <input
                  type="email"
                  className="osint-input"
                  placeholder="e.g. john.doe@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Optional: Phone */}
            <div className="osint-field-group">
              <label className="osint-label">
                <span>Known Phone Number</span>
                <span className="osint-badge-optional">Optional</span>
              </label>
              <div className="osint-input-wrap">
                <Phone size={16} className="osint-input-icon" />
                <input
                  type="text"
                  className="osint-input"
                  placeholder="e.g. +1 555 234 5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            {/* Optional: Location */}
            <div className="osint-field-group">
              <label className="osint-label">
                <span>Location / City / Country</span>
                <span className="osint-badge-optional">Optional</span>
              </label>
              <div className="osint-input-wrap">
                <MapPin size={16} className="osint-input-icon" />
                <input
                  type="text"
                  className="osint-input"
                  placeholder="e.g. San Francisco, CA"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>

            {/* Optional: Company */}
            <div className="osint-field-group">
              <label className="osint-label">
                <span>Organization / Company / Affiliation</span>
                <span className="osint-badge-optional">Optional</span>
              </label>
              <div className="osint-input-wrap">
                <Building size={16} className="osint-input-icon" />
                <input
                  type="text"
                  className="osint-input"
                  placeholder="e.g. Acme Technologies"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
            </div>

            {/* Optional: Domain */}
            <div className="osint-field-group">
              <label className="osint-label">
                <span>Domain / Portfolio / Website</span>
                <span className="osint-badge-optional">Optional</span>
              </label>
              <div className="osint-input-wrap">
                <Globe size={16} className="osint-input-icon" />
                <input
                  type="text"
                  className="osint-input"
                  placeholder="e.g. acme.com or johndoe.me"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                />
              </div>
            </div>

            {/* Optional: Keywords / Tags */}
            <div className="osint-field-group">
              <label className="osint-label">
                <span>Context Tags & Keywords</span>
                <span className="osint-badge-optional">Optional</span>
              </label>
              <div className="osint-input-wrap">
                <Layers size={16} className="osint-input-icon" />
                <input
                  type="text"
                  className="osint-input"
                  placeholder="e.g. security, blockchain, researcher"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="osint-form-actions">
              <button type="submit" className="osint-btn osint-btn-primary">
                <Search size={18} />
                <span>Launch OSINT Analysis</span>
              </button>
            </div>
          </form>

          {/* Quick Demo Presets */}
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Quick Demo Targets:</span>
            <div className="osint-demo-targets">
              {DEMO_TARGETS.map((demo, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="osint-demo-btn"
                  onClick={() => loadDemoTarget(demo)}
                >
                  {demo.name}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Right Panel: Investigation Dashboard Workspace */}
        <main className="osint-workspace">
          {!activeTarget ? (
            <div className="osint-card osint-empty-state">
              <div className="osint-empty-icon">
                <Fingerprint size={32} />
              </div>
              <h2 style={{ fontFamily: 'var(--font-heading)', margin: 0 }}>No Target Profile Loaded</h2>
              <p style={{ maxWidth: '420px', lineHeight: 1.5 }}>
                Enter the target individual's name in the left panel and click <strong>Launch OSINT Analysis</strong> to generate precision Google dorks, alias permutations, and AI intelligence synthesis.
              </p>
              <div className="osint-demo-targets" style={{ justifyContent: 'center' }}>
                {DEMO_TARGETS.map((demo, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="osint-btn osint-btn-secondary"
                    onClick={() => {
                      loadDemoTarget(demo);
                      const targetObj = { ...demo, fullName: demo.name, timestamp: new Date().toISOString() };
                      setActiveTarget(targetObj);
                    }}
                  >
                    <span>Load {demo.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Tabs Bar */}
              <nav className="osint-tabs-nav">
                <button
                  type="button"
                  className={`osint-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('overview')}
                >
                  <FileText size={16} />
                  <span>Dossier Overview</span>
                </button>

                <button
                  type="button"
                  className={`osint-tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
                  onClick={() => setActiveTab('ai')}
                >
                  <Sparkles size={16} />
                  <span>AI Reconnaissance</span>
                  {aiResult && <span className="osint-tab-count">Ready</span>}
                </button>

                <button
                  type="button"
                  className={`osint-tab-btn ${activeTab === 'dorks' ? 'active' : ''}`}
                  onClick={() => setActiveTab('dorks')}
                >
                  <Search size={16} />
                  <span>Dork Matrix</span>
                  <span className="osint-tab-count">{dorksMatrix.length}</span>
                </button>

                <button
                  type="button"
                  className={`osint-tab-btn ${activeTab === 'usernames' ? 'active' : ''}`}
                  onClick={() => setActiveTab('usernames')}
                >
                  <AtSign size={16} />
                  <span>Platform Scanner</span>
                  <span className="osint-tab-count">{OSINT_PLATFORMS.length}</span>
                </button>

                <button
                  type="button"
                  className={`osint-tab-btn ${activeTab === 'email' ? 'active' : ''}`}
                  onClick={() => setActiveTab('email')}
                >
                  <Globe size={16} />
                  <span>Email & Domain</span>
                </button>

                <button
                  type="button"
                  className={`osint-tab-btn ${activeTab === 'graph' ? 'active' : ''}`}
                  onClick={() => setActiveTab('graph')}
                >
                  <Network size={16} />
                  <span>Relationship Graph</span>
                </button>
              </nav>

              {/* Tab 1: Dossier Overview */}
              {activeTab === 'overview' && (
                <div className="osint-overview-grid">
                  {/* Persona Hero Card */}
                  <div className="osint-target-hero-card">
                    <div className="osint-target-hero-left">
                      <div className="osint-avatar-wrap">
                        {gravatarData.exists && gravatarData.avatarUrl ? (
                          <img
                            src={gravatarData.avatarUrl}
                            alt="Gravatar avatar"
                            className="osint-avatar-img"
                          />
                        ) : (
                          <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--tool-osint-color)' }}>
                            {activeTarget.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div>
                        <h2 className="osint-target-hero-name">{activeTarget.fullName}</h2>
                        <div className="osint-target-meta-chips">
                          {activeTarget.username && (
                            <span className="osint-chip">
                              <AtSign size={13} />
                              <span>{activeTarget.username}</span>
                            </span>
                          )}
                          {activeTarget.email && (
                            <span className="osint-chip">
                              <AtSign size={13} />
                              <span>{activeTarget.email}</span>
                            </span>
                          )}
                          {activeTarget.company && (
                            <span className="osint-chip">
                              <Building size={13} />
                              <span>{activeTarget.company}</span>
                            </span>
                          )}
                          {activeTarget.location && (
                            <span className="osint-chip">
                              <MapPin size={13} />
                              <span>{activeTarget.location}</span>
                            </span>
                          )}
                          {activeTarget.domain && (
                            <span className="osint-chip">
                              <Globe size={13} />
                              <span>{activeTarget.domain}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <button
                        type="button"
                        className="osint-btn osint-btn-primary"
                        onClick={() => {
                          setActiveTab('ai');
                          if (!aiResult && !isAiLoading) {
                            handleRunAiAnalysis();
                          }
                        }}
                      >
                        <Sparkles size={16} />
                        <span>{aiResult ? 'View AI Intel' : 'Run AI Synthesis'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Quick Stats Grid */}
                  <div className="osint-quick-stats">
                    <div className="osint-stat-box">
                      <div className="osint-stat-value">{dorksMatrix.length}</div>
                      <div className="osint-stat-label">Precision Dorks</div>
                    </div>
                    <div className="osint-stat-box">
                      <div className="osint-stat-value">{OSINT_PLATFORMS.length}</div>
                      <div className="osint-stat-label">Platform Pivots</div>
                    </div>
                    <div className="osint-stat-box">
                      <div className="osint-stat-value">{usernamePermutations.length}</div>
                      <div className="osint-stat-label">Alias Permutations</div>
                    </div>
                    <div className="osint-stat-box">
                      <div className="osint-stat-value">{gravatarData.exists ? 'Found' : 'Unchecked'}</div>
                      <div className="osint-stat-label">Gravatar Avatar</div>
                    </div>
                  </div>

                  {/* Username Permutations Card */}
                  <div className="osint-card">
                    <div className="osint-card-header">
                      <h3>Alias & Username Permutations</h3>
                      <span className="osint-badge">{usernamePermutations.length} Variations</span>
                    </div>
                    <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
                      Click any handle to copy or pivot across search matrices:
                    </p>
                    <div className="osint-permutations-wrap">
                      {usernamePermutations.map((perm, idx) => (
                        <span
                          key={idx}
                          className="osint-perm-pill"
                          onClick={() => handleCopy(perm, `perm_${idx}`)}
                          title="Click to copy handle"
                        >
                          <span>{perm}</span>
                          {copiedId === `perm_${idx}` ? (
                            <Check size={13} color="#00FA9A" />
                          ) : (
                            <Copy size={13} />
                          )}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Corporate Email Permutations */}
                  <div className="osint-card">
                    <div className="osint-card-header">
                      <h3>Calculated Email Permutations</h3>
                      <span className="osint-badge">{emailPermutations.length} Formats</span>
                    </div>
                    <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
                      Standard corporate email syntax permutations based on domain indicators:
                    </p>
                    <div className="osint-permutations-wrap">
                      {emailPermutations.map((em, idx) => (
                        <span
                          key={idx}
                          className="osint-perm-pill"
                          onClick={() => handleCopy(em, `em_${idx}`)}
                          title="Click to copy email"
                        >
                          <span>{em}</span>
                          {copiedId === `em_${idx}` ? (
                            <Check size={13} color="#00FA9A" />
                          ) : (
                            <Copy size={13} />
                          )}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Investigation Notes Scratchpad */}
                  <div className="osint-card" style={{ gridColumn: '1 / -1' }}>
                    <div className="osint-card-header">
                      <h3>Investigator Field Notes & Case Log</h3>
                      <button
                        type="button"
                        className="osint-btn osint-btn-secondary"
                        onClick={() => handleCopy(customNotes, 'notes')}
                      >
                        {copiedId === 'notes' ? <Check size={14} color="#00FA9A" /> : <Copy size={14} />}
                        <span>Copy Notes</span>
                      </button>
                    </div>
                    <textarea
                      style={{
                        width: '100%',
                        minHeight: '120px',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '0.75rem',
                        padding: '0.85rem',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-primary)',
                        fontSize: '0.9rem',
                        resize: 'vertical',
                        outline: 'none'
                      }}
                      placeholder="Record investigative discoveries, cross-referenced profile URLs, verified handles, and timestamps here..."
                      value={customNotes}
                      onChange={(e) => setCustomNotes(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Tab 2: AI Reconnaissance (Gemini) */}
              {activeTab === 'ai' && (
                <div className="osint-card">
                  {/* AI Banner & Action */}
                  <div className="osint-ai-banner">
                    <div className="osint-ai-banner-content">
                      <div className="osint-ai-icon">
                        <Sparkles size={24} />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600 }}>
                          Gemini AI Reconnaissance Engine
                        </h3>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          Model: <span style={{ color: 'var(--tool-osint-color)' }}>{geminiModel}</span> • Synthesizes public footprint hypotheses and verification matrices
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="osint-btn osint-btn-primary"
                      onClick={handleRunAiAnalysis}
                      disabled={isAiLoading}
                    >
                      {isAiLoading ? (
                        <>
                          <RefreshCw size={16} className="osint-spinner" />
                          <span>Synthesizing Intel...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          <span>{aiResult ? 'Regenerate Analysis' : 'Run Reconnaissance'}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* AI Error Alert */}
                  {aiError && (
                    <div style={{
                      padding: '1rem',
                      borderRadius: '0.75rem',
                      background: 'rgba(255, 42, 133, 0.12)',
                      border: '1px solid rgba(255, 42, 133, 0.3)',
                      color: '#ff5577',
                      fontSize: '0.9rem',
                      marginBottom: '1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <ShieldAlert size={20} />
                        <span>{aiError}</span>
                      </div>
                      <button
                        type="button"
                        className="osint-btn osint-btn-secondary"
                        style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem' }}
                        onClick={() => setIsSettingsOpen(true)}
                      >
                        Enter API Key
                      </button>
                    </div>
                  )}

                  {/* AI Results Output */}
                  {aiResult ? (
                    <div>
                      {/* Executive Assessment */}
                      <div className="osint-ai-section">
                        <div className="osint-ai-section-title">
                          <Eye size={18} />
                          <span>Executive Assessment</span>
                        </div>
                        <div className="osint-ai-summary-text">
                          {aiResult.summary}
                        </div>
                      </div>

                      {/* High-Probability Footprint Matrix */}
                      {aiResult.highProbabilityFootprints && aiResult.highProbabilityFootprints.length > 0 && (
                        <div className="osint-ai-section">
                          <div className="osint-ai-section-title">
                            <Target size={18} />
                            <span>High-Probability Exposure Points</span>
                          </div>
                          <div className="osint-ai-footprints-grid">
                            {aiResult.highProbabilityFootprints.map((item, idx) => (
                              <div key={idx} className="osint-footprint-card">
                                <div className="osint-footprint-header">
                                  <span className="osint-footprint-title">{item.platform}</span>
                                  <span className="osint-badge">{item.category}</span>
                                </div>
                                <div className="osint-footprint-rationale">{item.rationale}</div>
                                {item.targetedDork && (
                                  <div className="osint-footprint-dork">
                                    <span>{item.targetedDork}</span>
                                    <button
                                      type="button"
                                      className="osint-btn osint-btn-secondary"
                                      style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}
                                      onClick={() => handleCopy(item.targetedDork, `fp_dork_${idx}`)}
                                    >
                                      {copiedId === `fp_dork_${idx}` ? <Check size={12} color="#00FA9A" /> : <Copy size={12} />}
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Investigative Pivots */}
                      {aiResult.investigativePivots && aiResult.investigativePivots.length > 0 && (
                        <div className="osint-ai-section">
                          <div className="osint-ai-section-title">
                            <Compass size={18} />
                            <span>Recommended Tactical Pivots</span>
                          </div>
                          <div className="osint-checklist">
                            {aiResult.investigativePivots.map((pivot, idx) => (
                              <div key={idx} className="osint-checklist-item">
                                <span style={{ color: 'var(--tool-osint-color)', fontWeight: 700 }}>{idx + 1}.</span>
                                <span>{pivot}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Corroboration & Attribution Checklist */}
                      {aiResult.corroborationChecklist && aiResult.corroborationChecklist.length > 0 && (
                        <div className="osint-ai-section">
                          <div className="osint-ai-section-title">
                            <UserCheck size={18} />
                            <span>Attribution & Verification Checklist</span>
                          </div>
                          <div className="osint-checklist">
                            {aiResult.corroborationChecklist.map((item, idx) => (
                              <label key={idx} className="osint-checklist-item" style={{ cursor: 'pointer' }}>
                                <input type="checkbox" style={{ marginRight: '0.5rem', accentColor: 'var(--tool-osint-color)' }} />
                                <span>{item}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : !isAiLoading && (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                      <Cpu size={36} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.5 }} />
                      <p>Click <strong>Run Reconnaissance</strong> above to prompt Gemini AI to generate customized investigative hypotheses, exposure points, and corroboration checklists.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Google Dorks Matrix */}
              {activeTab === 'dorks' && (
                <div className="osint-card">
                  {/* Filter & Search Bar */}
                  <div className="osint-dork-filter-bar">
                    <div className="osint-category-chips">
                      {[
                        { id: 'all', label: 'All Queries' },
                        { id: 'social', label: 'Social & Personas' },
                        { id: 'developer', label: 'Developer & Code' },
                        { id: 'documents', label: 'Public Documents' },
                        { id: 'breach_pastes', label: 'Pastes & Breaches' },
                        { id: 'business', label: 'Corporate & Legal' },
                        { id: 'infrastructure', label: 'Domain & Infrastructure' },
                        { id: 'search_engines', label: 'Multi-Engine' }
                      ].map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          className={`osint-cat-chip ${selectedDorkCategory === cat.id ? 'active' : ''}`}
                          onClick={() => setSelectedDorkCategory(cat.id)}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    <div className="osint-input-wrap osint-dork-search">
                      <Search size={14} className="osint-input-icon" />
                      <input
                        type="text"
                        className="osint-input"
                        style={{ padding: '0.45rem 0.65rem 0.45rem 2.2rem', fontSize: '0.82rem' }}
                        placeholder="Search queries..."
                        value={dorkSearchFilter}
                        onChange={(e) => setDorkSearchFilter(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Dorks Grid */}
                  <div className="osint-dorks-grid">
                    {filteredDorks.map((dork, idx) => (
                      <div key={idx} className="osint-dork-card">
                        <div className="osint-dork-top">
                          <div>
                            <h4 className="osint-dork-title">{dork.title}</h4>
                            <p className="osint-dork-desc">{dork.description}</p>
                          </div>
                          <span className="osint-badge" style={{ fontSize: '0.7rem' }}>
                            {dork.category}
                          </span>
                        </div>

                        <div className="osint-dork-query-box">
                          {dork.query}
                        </div>

                        <div className="osint-dork-actions">
                          <button
                            type="button"
                            className="osint-btn osint-btn-secondary"
                            style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                            onClick={() => handleCopy(dork.query, `dork_${idx}`)}
                          >
                            {copiedId === `dork_${idx}` ? (
                              <>
                                <Check size={14} color="#00FA9A" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy size={14} />
                                <span>Copy Query</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            className="osint-btn osint-btn-primary"
                            style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                            onClick={() => openUrlIncognito(dork.url, isIncognitoMode)}
                            title={isIncognitoMode ? 'Open search in Incognito browser window' : 'Open search in new tab'}
                          >
                            <span>Open Search</span>
                            <ExternalLink size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 4: Platform Scanner */}
              {activeTab === 'usernames' && (
                <div className="osint-card">
                  <div className="osint-card-header">
                    <div>
                      <h3>Cross-Platform Handle Availability & Footprint Scanner</h3>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                        Direct investigation URLs for target username: <strong style={{ color: 'var(--tool-osint-color)' }}>@{activeTarget.username || activeTarget.fullName.toLowerCase().replace(/\s+/g, '')}</strong>
                      </p>
                    </div>

                    <button
                      type="button"
                      className="osint-btn osint-btn-primary"
                      onClick={() => {
                        const u = activeTarget.username || activeTarget.fullName.toLowerCase().replace(/\s+/g, '');
                        const topUrls = OSINT_PLATFORMS.slice(0, 10).map(p => p.url.replace('{u}', encodeURIComponent(u)));
                        openMultipleUrlsIncognito(topUrls, isIncognitoMode);
                      }}
                      title={isIncognitoMode ? 'Open top 10 profiles in Incognito windows' : 'Open top 10 profiles in new tabs'}
                    >
                      <ExternalLink size={15} />
                      <span>Open Top 10 Platforms</span>
                    </button>
                  </div>

                  <div className="osint-platform-grid">
                    {OSINT_PLATFORMS.map((platform, idx) => {
                      const u = activeTarget.username || activeTarget.fullName.toLowerCase().replace(/\s+/g, '');
                      const platformUrl = platform.url.replace('{u}', encodeURIComponent(u));

                      return (
                        <div key={idx} className="osint-platform-card">
                          <div className="osint-platform-info">
                            <Globe size={18} color="var(--tool-osint-color)" />
                            <div>
                              <div className="osint-platform-name">{platform.name}</div>
                              <div className="osint-platform-cat">{platform.category}</div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            <button
                              type="button"
                              className="osint-btn osint-btn-secondary"
                              style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}
                              onClick={() => handleCopy(platformUrl, `plat_${idx}`)}
                              title="Copy profile link"
                            >
                              {copiedId === `plat_${idx}` ? <Check size={13} color="#00FA9A" /> : <Copy size={13} />}
                            </button>

                            <button
                              type="button"
                              className="osint-btn osint-btn-secondary"
                              style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}
                              onClick={() => openUrlIncognito(platformUrl, isIncognitoMode)}
                              title={isIncognitoMode ? `Open ${platform.name} in Incognito window` : `Open ${platform.name} profile`}
                            >
                              <ExternalLink size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab 5: Email & Domain Intelligence */}
              {activeTab === 'email' && (
                <div className="osint-overview-grid">
                  {/* Email Recon Card */}
                  <div className="osint-card">
                    <div className="osint-card-header">
                      <h3>Email Infrastructure & Breach Lookup</h3>
                      <span className="osint-badge">Identity & Gravatar</span>
                    </div>

                    {activeTarget.email ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: '0.75rem' }}>
                          <div className="osint-avatar-wrap" style={{ width: '3.5rem', height: '3.5rem' }}>
                            {gravatarData.exists && gravatarData.avatarUrl ? (
                              <img src={gravatarData.avatarUrl} alt="Gravatar" className="osint-avatar-img" />
                            ) : (
                              <AtSign size={24} color="var(--tool-osint-color)" />
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '1rem' }}>{activeTarget.email}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              Gravatar Profile: {gravatarData.exists ? <span style={{ color: '#00FA9A' }}>Active Avatar Found</span> : 'No Public Avatar'}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="osint-btn osint-btn-secondary"
                            onClick={() => openUrlIncognito(`https://haveibeenpwned.com/account/${encodeURIComponent(activeTarget.email)}`, isIncognitoMode)}
                            title={isIncognitoMode ? 'Open HaveIBeenPwned in Incognito window' : 'Open HaveIBeenPwned'}
                          >
                            <ExternalLink size={14} />
                            <span>HaveIBeenPwned Breach Check</span>
                          </button>

                          <button
                            type="button"
                            className="osint-btn osint-btn-secondary"
                            onClick={() => openUrlIncognito(`https://emailrep.io/query/${encodeURIComponent(activeTarget.email)}`, isIncognitoMode)}
                            title={isIncognitoMode ? 'Open EmailRep in Incognito window' : 'Open EmailRep'}
                          >
                            <ExternalLink size={14} />
                            <span>EmailRep Deliverability</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                        No email address provided in target indicators. Add an email in the left panel to trigger live Gravatar avatar lookup and breach cross-referencing.
                      </p>
                    )}
                  </div>

                  {/* Domain & DNS Recon Card */}
                  <div className="osint-card">
                    <div className="osint-card-header">
                      <h3>Domain & Infrastructure Footprint</h3>
                      <span className="osint-badge">WHOIS & DNS</span>
                    </div>

                    {activeTarget.domain ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ background: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: '0.75rem' }}>
                          <div style={{ fontWeight: 600, fontSize: '1rem' }}>{activeTarget.domain}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                            Associated Domain Target
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="osint-btn osint-btn-secondary"
                            onClick={() => openUrlIncognito(`https://www.whois.com/whois/${encodeURIComponent(activeTarget.domain)}`, isIncognitoMode)}
                            title={isIncognitoMode ? 'Open WHOIS in Incognito window' : 'Open WHOIS'}
                          >
                            <ExternalLink size={14} />
                            <span>WHOIS Registrar Data</span>
                          </button>

                          <button
                            type="button"
                            className="osint-btn osint-btn-secondary"
                            onClick={() => openUrlIncognito(`https://web.archive.org/web/*/${encodeURIComponent(activeTarget.domain)}`, isIncognitoMode)}
                            title={isIncognitoMode ? 'Open Wayback Machine in Incognito window' : 'Open Wayback Machine'}
                          >
                            <ExternalLink size={14} />
                            <span>Wayback Machine Archive</span>
                          </button>

                          <button
                            type="button"
                            className="osint-btn osint-btn-secondary"
                            onClick={() => openUrlIncognito(`https://securitytrails.com/domain/${encodeURIComponent(activeTarget.domain)}/dns`, isIncognitoMode)}
                            title={isIncognitoMode ? 'Open SecurityTrails in Incognito window' : 'Open SecurityTrails'}
                          >
                            <ExternalLink size={14} />
                            <span>SecurityTrails DNS History</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                        No domain provided in target indicators. Add a domain or employer website in the left panel to enable infrastructure DNS lookup and historical Wayback Machine pivots.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 6: Interactive Relationship Graph */}
              {activeTab === 'graph' && (
                <div className="osint-card">
                  <div className="osint-card-header">
                    <div>
                      <h3>Interactive Entity Relationship Graph</h3>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                        Visual node topology connecting target identity parameters and discovered footprints. Drag nodes to interact.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="osint-btn osint-btn-secondary"
                      onClick={() => {
                        const state = graphStateRef.current;
                        const canvas = canvasRef.current;
                        if (canvas && state.nodes[0]) {
                          state.nodes[0].x = canvas.width / 2;
                          state.nodes[0].y = canvas.height / 2;
                        }
                      }}
                    >
                      <RefreshCw size={14} />
                      <span>Reset Layout</span>
                    </button>
                  </div>

                  <div className="osint-canvas-container">
                    <canvas ref={canvasRef} className="osint-canvas" />

                    <div className="osint-canvas-legend">
                      <div className="osint-legend-item">
                        <span className="osint-legend-dot" style={{ background: '#00d2ff' }} />
                        <span>Target Person</span>
                      </div>
                      <div className="osint-legend-item">
                        <span className="osint-legend-dot" style={{ background: '#00fa9a' }} />
                        <span>Username / Handle</span>
                      </div>
                      <div className="osint-legend-item">
                        <span className="osint-legend-dot" style={{ background: '#38bdf8' }} />
                        <span>Email Address</span>
                      </div>
                      <div className="osint-legend-item">
                        <span className="osint-legend-dot" style={{ background: '#ffaa00' }} />
                        <span>Organization / Company</span>
                      </div>
                      <div className="osint-legend-item">
                        <span className="osint-legend-dot" style={{ background: '#ff5577' }} />
                        <span>Location / Region</span>
                      </div>
                      <div className="osint-legend-item">
                        <span className="osint-legend-dot" style={{ background: '#f72585' }} />
                        <span>Platform Pivots</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Settings Modal (Gemini API Key & Model Configuration) */}
      {isSettingsOpen && (
        <div className="osint-modal-backdrop" onClick={() => setIsSettingsOpen(false)}>
          <div className="osint-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="osint-modal-header">
              <h3>
                <Key size={20} color="var(--tool-osint-color)" />
                <span>Gemini AI Configuration</span>
              </h3>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setIsSettingsOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="osint-modal-body">
              <p>
                Configure your Google Gemini API Key to enable automated AI Reconnaissance and Footprint Synthesis. Your key is securely stored in your browser's local storage and never logged.
              </p>

              <div className="osint-field-group">
                <label className="osint-label">
                  <span>Google Gemini API Key</span>
                  {geminiApiKey && <span className="osint-badge" style={{ color: '#00FA9A' }}>Active</span>}
                </label>
                <div className="osint-input-wrap">
                  <Key size={16} className="osint-input-icon" />
                  <input
                    type="password"
                    className="osint-input"
                    placeholder="AIzaSy..."
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                  />
                </div>
              </div>

              <div className="osint-field-group">
                <label className="osint-label">
                  <span>Gemini Model Choice</span>
                </label>
                <select
                  className="osint-input"
                  style={{ paddingLeft: '0.85rem' }}
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value)}
                >
                  <option value="gemini-3.7-flash">Gemini 3.7 Flash (Recommended - High Speed & Deep Precision)</option>
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fast High-Capacity Fallback)</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash (Standard Flash)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Reasoning)</option>
                </select>
              </div>
            </div>

            <div className="osint-modal-footer">
              <button
                type="button"
                className="osint-btn osint-btn-secondary"
                onClick={() => {
                  setGeminiApiKey('');
                  localStorage.removeItem('osint_gemini_api_key');
                }}
              >
                Clear Key
              </button>

              <button
                type="button"
                className="osint-btn osint-btn-primary"
                onClick={handleSaveSettings}
              >
                <span>Save Configuration</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryOpen && (
        <div className="osint-modal-backdrop" onClick={() => setIsHistoryOpen(false)}>
          <div className="osint-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="osint-modal-header">
              <h3>
                <Clock size={20} color="var(--tool-osint-color)" />
                <span>Investigation History</span>
              </h3>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setIsHistoryOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="osint-modal-body">
              <p>Quickly reload past target investigations stored in your local session cache:</p>

              {investigationHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-secondary)' }}>
                  No saved investigation history yet.
                </div>
              ) : (
                <div className="osint-history-list">
                  {investigationHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className="osint-history-item"
                      onClick={() => loadHistoryItem(item)}
                    >
                      <div>
                        <div className="osint-history-name">{item.fullName}</div>
                        <div className="osint-history-date">
                          {item.company ? `${item.company} • ` : ''}
                          {new Date(item.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                      <span className="osint-badge" style={{ fontSize: '0.7rem' }}>Load Target</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="osint-modal-footer">
              <button
                type="button"
                className="osint-btn osint-btn-danger"
                onClick={() => {
                  setInvestigationHistory([]);
                  localStorage.removeItem('osint_history');
                }}
              >
                <span>Clear History</span>
              </button>

              <button
                type="button"
                className="osint-btn osint-btn-secondary"
                onClick={() => setIsHistoryOpen(false)}
              >
                <span>Close</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OSINTInvestigator;
