import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Wifi,
  Radio,
  Activity,
  Trash2,
  Download,
  Upload,
  Square,
  Sparkles,
  Zap,
  Layers,
  Eye,
  MapPin,
  RefreshCw,
  CheckCircle2,
  FileImage,
  Navigation
} from 'lucide-react';
import {
  WALL_MATERIALS,
  WIFI_BANDS,
  PRESET_ROOMS,
  calculateTheoreticalSignal,
  interpolateSampledGrid,
  getHeatmapColor,
  evaluateCapabilities,
  runSpeedBenchmark,
  optimizeRouterPosition
} from '../utils/networkPhysics';
import CustomSelect from '../components/CustomSelect';
import './NetworkMap.css';
import '../App.css';

export default function NetworkMap() {
  // Room Layout State
  const [activePreset, setActivePreset] = useState('studio');
  const [roomDimensions, setRoomDimensions] = useState({ width: 800, height: 520 });
  const [routers, setRouters] = useState(PRESET_ROOMS[0].routers);
  const [walls, setWalls] = useState(PRESET_ROOMS[0].walls);
  const [markers, setMarkers] = useState(PRESET_ROOMS[0].markers);
  const [sampledPoints, setSampledPoints] = useState([
    { id: 's-1', name: 'Bed Corner', x: 140, y: 120, downloadMbps: 185, uploadMbps: 80, pingMs: 12, jitterMs: 2 },
    { id: 's-2', name: 'Work Desk', x: 420, y: 120, downloadMbps: 450, uploadMbps: 190, pingMs: 8, jitterMs: 1 },
    { id: 's-3', name: 'Bathroom', x: 640, y: 140, downloadMbps: 35, uploadMbps: 15, pingMs: 42, jitterMs: 8 },
    { id: 's-4', name: 'Smart TV', x: 420, y: 400, downloadMbps: 290, uploadMbps: 110, pingMs: 14, jitterMs: 3 }
  ]);

  // Active Tool & Selection State
  const [activeTool, setActiveTool] = useState('sample'); // 'sample', 'wall', 'router', 'marker', 'erase'
  const [selectedMaterial, setSelectedMaterial] = useState('drywall');
  const [selectedBand, setSelectedBand] = useState('5GHz');
  const [wallDraftStart, setWallDraftStart] = useState(null);
  const [currentReticle, setCurrentReticle] = useState({ x: 420, y: 120, name: 'Work Desk' });
  const [draggingItem, setDraggingItem] = useState(null); // { type: 'router'|'marker'|'sample', id, offsetX, offsetY }
  const [hoveredPointInfo, setHoveredPointInfo] = useState(null);

  // Heatmap View Configuration
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [heatmapMode, setHeatmapMode] = useState('bandwidth'); // 'bandwidth', 'latency', 'signal', 'deadzones'
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.65);
  const heatmapResolution = 16; // step in px for rendering
  const [showGrid, setShowGrid] = useState(true);
  const [showRadarAnimation, setShowRadarAnimation] = useState(true);

  // Live Benchmark & Gauge State
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [activeBenchType, setActiveBenchType] = useState(null); // 'download' | 'upload' | null
  const [gaugeView, setGaugeView] = useState('download'); // 'download' | 'upload'
  const [benchProgress, setBenchProgress] = useState(0);
  const [liveGaugeMbps, setLiveGaugeMbps] = useState(450);
  const [liveMetrics, setLiveMetrics] = useState({
    downloadMbps: 450,
    uploadMbps: 190,
    pingMs: 8,
    jitterMs: 1,
    serverMode: 'local-server'
  });
  const [sampleSpotName, setSampleSpotName] = useState('My Spot');
  const abortControllerRef = useRef(null);

  // Blueprint background image
  const [blueprintImg, setBlueprintImg] = useState(null);
  const [blueprintOpacity, setBlueprintOpacity] = useState(0.35);

  // Optimizer state
  const [optimizerResult, setOptimizerResult] = useState(null);

  // Canvas Refs
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const radarAngleRef = useRef(0);

  // Load Preset
  const handleSelectPreset = (presetId) => {
    const found = PRESET_ROOMS.find(p => p.id === presetId);
    if (!found) return;
    setActivePreset(presetId);
    setRoomDimensions({ width: found.width, height: found.height });
    setRouters(JSON.parse(JSON.stringify(found.routers)));
    setWalls(JSON.parse(JSON.stringify(found.walls)));
    setMarkers(JSON.parse(JSON.stringify(found.markers || [])));
    setOptimizerResult(null);
    if (presetId === 'studio') {
      setCurrentReticle({ x: 420, y: 120, name: 'Work Desk' });
    } else {
      setCurrentReticle({ x: found.width / 2, y: found.height / 2, name: 'Room Center' });
    }
  };

  // Upload blueprint background
  const handleBlueprintUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => setBlueprintImg(img);
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Run Specific Benchmark Test ('download' or 'upload') on Current Reticle Position
  const handleRunSpeedTest = async (testType = 'download') => {
    if (isBenchmarking) {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      setIsBenchmarking(false);
      setActiveBenchType(null);
      setBenchStage('idle');
      return;
    }

    setIsBenchmarking(true);
    setActiveBenchType(testType);
    setGaugeView(testType);
    setBenchProgress(10);
    setBenchStage('ping');
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const results = await runSpeedBenchmark({
        type: testType,
        signal: controller.signal,
        onProgress: (prog) => {
          setBenchStage(prog.stage);
          setBenchProgress(prog.progress);
          if (prog.currentMbps > 0) setLiveGaugeMbps(prog.currentMbps);
          if (prog.currentPing > 0) {
            setLiveMetrics(prev => ({ ...prev, pingMs: prog.currentPing }));
          }
        }
      });

      setLiveMetrics(prev => ({
        ...prev,
        pingMs: results.pingMs,
        jitterMs: results.jitterMs,
        serverMode: results.serverMode,
        downloadMbps: testType === 'download' ? results.downloadMbps : prev.downloadMbps,
        uploadMbps: testType === 'upload' ? results.uploadMbps : prev.uploadMbps
      }));

      const finalMbps = testType === 'download' ? results.downloadMbps : results.uploadMbps;
      setLiveGaugeMbps(finalMbps);

      // Auto record/update sample point at current reticle
      const spotX = Math.round(currentReticle.x);
      const spotY = Math.round(currentReticle.y);

      setSampledPoints(prev => {
        const existingIdx = prev.findIndex(p => {
          const dx = p.x - spotX;
          const dy = p.y - spotY;
          return (dx * dx + dy * dy) <= 400;
        });

        if (existingIdx !== -1) {
          const existing = prev[existingIdx];
          const updated = {
            ...existing,
            downloadMbps: testType === 'download' ? results.downloadMbps : existing.downloadMbps,
            uploadMbps: testType === 'upload' ? results.uploadMbps : existing.uploadMbps,
            pingMs: results.pingMs,
            jitterMs: results.jitterMs,
            timestamp: new Date().toLocaleTimeString()
          };
          const nextList = [...prev];
          nextList[existingIdx] = updated;
          return nextList;
        }

        const newPoint = {
          id: `s-${Date.now()}`,
          name: sampleSpotName || `Spot (${spotX}, ${spotY})`,
          x: spotX,
          y: spotY,
          downloadMbps: testType === 'download' ? results.downloadMbps : Math.round(results.uploadMbps * 2.2),
          uploadMbps: testType === 'upload' ? results.uploadMbps : Math.round(results.downloadMbps * 0.45),
          pingMs: results.pingMs,
          jitterMs: results.jitterMs,
          timestamp: new Date().toLocaleTimeString()
        };
        return [...prev, newPoint];
      });

      setBenchStage('complete');
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Speedtest benchmark error:', err);
      }
    } finally {
      setIsBenchmarking(false);
      setActiveBenchType(null);
    }
  };

  // Run Router Optimizer
  const handleOptimizeRouter = () => {
    const result = optimizeRouterPosition(walls, roomDimensions.width, roomDimensions.height);
    setOptimizerResult(result);
  };

  const handleApplyOptimizedRouter = () => {
    if (!optimizerResult) return;
    setRouters(prev => {
      if (prev.length === 0) {
        return [{ id: 'r-opt', name: 'Optimized AP', x: optimizerResult.optimalPosition.x, y: optimizerResult.optimalPosition.y, band: '5GHz', txPowerDbm: 20, enabled: true }];
      }
      return prev.map((r, i) => i === 0 ? { ...r, x: optimizerResult.optimalPosition.x, y: optimizerResult.optimalPosition.y } : r);
    });
    setOptimizerResult(null);
  };

  // Export Canvas as PNG
  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `network_map_${activePreset}_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Save / Export Project JSON
  const handleExportJSON = () => {
    const projectData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      roomDimensions,
      routers,
      walls,
      markers,
      sampledPoints
    };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `wifi_map_project_${Date.now()}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Canvas Mouse Interactions
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = roomDimensions.width / rect.width;
    const scaleY = roomDimensions.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleCanvasMouseDown = (e) => {
    const { x, y } = getCanvasCoords(e);

    if (activeTool === 'sample') {
      setCurrentReticle({ x, y, name: `Location (${Math.round(x)}, ${Math.round(y)})` });
      setSampleSpotName(`Spot (${Math.round(x)}, ${Math.round(y)})`);

      // Check if clicking near existing sampled point to inspect
      const clickedSample = sampledPoints.find(p => Math.hypot(p.x - x, p.y - y) < 18);
      if (clickedSample) {
        setLiveGaugeMbps(clickedSample.downloadMbps);
        setLiveMetrics({
          downloadMbps: clickedSample.downloadMbps,
          uploadMbps: clickedSample.uploadMbps,
          pingMs: clickedSample.pingMs,
          jitterMs: clickedSample.jitterMs,
          serverMode: 'cached'
        });
        setSampleSpotName(clickedSample.name);
      }
      return;
    }

    if (activeTool === 'wall') {
      if (!wallDraftStart) {
        setWallDraftStart({ x, y });
      } else {
        // Complete wall
        const newWall = {
          id: `w-${Date.now()}`,
          x1: Math.round(wallDraftStart.x),
          y1: Math.round(wallDraftStart.y),
          x2: Math.round(x),
          y2: Math.round(y),
          material: selectedMaterial
        };
        setWalls(prev => [...prev, newWall]);
        setWallDraftStart(null);
      }
      return;
    }

    if (activeTool === 'router') {
      // Check if clicking existing router to drag
      const existing = routers.find(r => Math.hypot(r.x - x, r.y - y) < 22);
      if (existing) {
        setDraggingItem({ type: 'router', id: existing.id, offsetX: x - existing.x, offsetY: y - existing.y });
      } else {
        // Place new router
        const newRouter = {
          id: `r-${Date.now()}`,
          name: `Router ${routers.length + 1}`,
          x: Math.round(x),
          y: Math.round(y),
          band: selectedBand,
          txPowerDbm: 20,
          enabled: true
        };
        setRouters(prev => [...prev, newRouter]);
      }
      return;
    }

    if (activeTool === 'marker') {
      const label = prompt('Enter location label:', 'Work Desk') || 'Label';
      const newMarker = {
        id: `m-${Date.now()}`,
        name: label,
        x: Math.round(x),
        y: Math.round(y),
        icon: 'map-pin'
      };
      setMarkers(prev => [...prev, newMarker]);
      return;
    }

    if (activeTool === 'erase') {
      // Erase closest wall, router, sample, or marker
      setRouters(prev => prev.filter(r => Math.hypot(r.x - x, r.y - y) >= 22));
      setMarkers(prev => prev.filter(m => Math.hypot(m.x - x, m.y - y) >= 22));
      setSampledPoints(prev => prev.filter(s => Math.hypot(s.x - x, s.y - y) >= 20));
      setWalls(prev => prev.filter(w => {
        // Point-line distance
        const A = x - w.x1;
        const B = y - w.y1;
        const C = w.x2 - w.x1;
        const D = w.y2 - w.y1;
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        if (lenSq !== 0) param = dot / lenSq;
        let xx, yy;
        if (param < 0) { xx = w.x1; yy = w.y1; }
        else if (param > 1) { xx = w.x2; yy = w.y2; }
        else { xx = w.x1 + param * C; yy = w.y1 + param * D; }
        return Math.hypot(x - xx, y - yy) >= 12;
      }));
    }
  };

  const handleCanvasMouseMove = (e) => {
    const { x, y } = getCanvasCoords(e);

    // Hover telemetry calculation
    const theoretical = calculateTheoreticalSignal({ x, y }, routers, walls);
    const interpolated = interpolateSampledGrid({ x, y }, sampledPoints);
    
    // Blended bandwidth
    const currentMbps = interpolated ? interpolated.downloadMbps : theoretical.bandwidthMbps;
    const currentPing = interpolated ? interpolated.pingMs : theoretical.pingMs;

    setHoveredPointInfo({
      x: Math.round(x),
      y: Math.round(y),
      bandwidthMbps: currentMbps,
      pingMs: currentPing,
      rssiDbm: theoretical.rssi
    });

    if (draggingItem) {
      if (draggingItem.type === 'router') {
        setRouters(prev => prev.map(r => r.id === draggingItem.id ? { ...r, x: Math.round(x - draggingItem.offsetX), y: Math.round(y - draggingItem.offsetY) } : r));
      }
    }
  };

  const handleCanvasMouseUp = () => {
    setDraggingItem(null);
  };

  // Main Canvas Rendering Engine
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = roomDimensions.width;
    const height = roomDimensions.height;

    ctx.clearRect(0, 0, width, height);

    // 1. Draw Background Blueprint image if uploaded
    if (blueprintImg) {
      ctx.save();
      ctx.globalAlpha = blueprintOpacity;
      ctx.drawImage(blueprintImg, 0, 0, width, height);
      ctx.restore();
    }

    // 2. Draw Blueprint Grid Lines
    if (showGrid) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 3. Render Real-Time Heatmap Layer
    if (showHeatmap && (routers.length > 0 || sampledPoints.length > 0)) {
      const step = heatmapResolution;
      for (let x = 0; x < width; x += step) {
        for (let y = 0; y < height; y += step) {
          const pt = { x: x + step / 2, y: y + step / 2 };
          const theoretical = calculateTheoreticalSignal(pt, routers, walls);
          const interpolated = interpolateSampledGrid(pt, sampledPoints);

          let metricVal = 0;
          let maxVal = 600; // max Mbps normalizer

          if (heatmapMode === 'bandwidth') {
            metricVal = interpolated ? interpolated.downloadMbps : theoretical.bandwidthMbps;
            maxVal = 600;
          } else if (heatmapMode === 'latency') {
            // Invert latency (lower ping = higher ratio)
            const ping = interpolated ? interpolated.pingMs : theoretical.pingMs;
            metricVal = Math.max(0, 100 - ping);
            maxVal = 100;
          } else if (heatmapMode === 'signal') {
            // RSSI from -90 dBm (0) to -30 dBm (1.0)
            metricVal = Math.max(0, theoretical.rssi + 90);
            maxVal = 60;
          } else if (heatmapMode === 'deadzones') {
            const mbps = interpolated ? interpolated.downloadMbps : theoretical.bandwidthMbps;
            metricVal = mbps < 25 ? 0.05 : 0.95;
            maxVal = 1;
          }

          const ratio = Math.max(0, Math.min(1, metricVal / maxVal));
          ctx.fillStyle = getHeatmapColor(ratio, heatmapOpacity);
          ctx.fillRect(x, y, step, step);
        }
      }
    }

    // 4. Render Walls & Obstacles
    walls.forEach(w => {
      const mat = WALL_MATERIALS[w.material] || WALL_MATERIALS.drywall;
      ctx.save();
      ctx.strokeStyle = mat.color;
      ctx.lineWidth = mat.strokeWidth || 6;
      ctx.lineCap = 'round';
      ctx.shadowColor = mat.color;
      ctx.shadowBlur = 8;

      ctx.beginPath();
      ctx.moveTo(w.x1, w.y1);
      ctx.lineTo(w.x2, w.y2);
      ctx.stroke();

      // Material loss tag in middle of wall
      const midX = (w.x1 + w.x2) / 2;
      const midY = (w.y1 + w.y2) / 2;
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(10, 10, 25, 0.85)';
      ctx.fillRect(midX - 18, midY - 9, 36, 18);
      ctx.fillStyle = mat.color;
      ctx.font = '9px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`-${mat.attenuationDb}dB`, midX, midY);
      ctx.restore();
    });

    // Draw active wall draft if in wall creation mode
    if (wallDraftStart && activeTool === 'wall' && hoveredPointInfo) {
      ctx.save();
      ctx.strokeStyle = '#00fa9a';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(wallDraftStart.x, wallDraftStart.y);
      ctx.lineTo(hoveredPointInfo.x, hoveredPointInfo.y);
      ctx.stroke();
      ctx.restore();
    }

    // 5. Render WiFi Access Points / Routers
    routers.forEach((r, idx) => {
      ctx.save();
      // Outer glowing pulse ring
      if (showRadarAnimation) {
        const pulseRadius = 30 + ((Date.now() / 25 + idx * 30) % 50);
        ctx.strokeStyle = `rgba(0, 210, 255, ${Math.max(0, 1 - pulseRadius / 80)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(r.x, r.y, pulseRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Router core body
      ctx.fillStyle = '#00d2ff';
      ctx.shadowColor = '#00d2ff';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 14, 0, Math.PI * 2);
      ctx.fill();

      // Center antenna dot
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 5, 0, Math.PI * 2);
      ctx.fill();

      // Router Label Pill
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.strokeStyle = 'rgba(0, 210, 255, 0.5)';
      ctx.lineWidth = 1;
      const labelText = `${r.name} (${r.band})`;
      const textWidth = ctx.measureText(labelText).width + 16;
      ctx.beginPath();
      ctx.roundRect(r.x - textWidth / 2, r.y + 18, textWidth, 20, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#00d2ff';
      ctx.font = '11px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, r.x, r.y + 28);
      ctx.restore();
    });

    // 6. Render Sampled Points
    sampledPoints.forEach((s) => {
      ctx.save();
      const isSelected = Math.hypot(s.x - currentReticle.x, s.y - currentReticle.y) < 15;
      
      // Pin Glow
      ctx.shadowColor = s.downloadMbps >= 50 ? '#00fa9a' : '#ff4757';
      ctx.shadowBlur = isSelected ? 18 : 8;

      ctx.fillStyle = s.downloadMbps >= 50 ? '#00fa9a' : '#ff4757';
      ctx.beginPath();
      ctx.arc(s.x, s.y, isSelected ? 9 : 7, 0, Math.PI * 2);
      ctx.fill();

      // Data Badge above Pin
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(6, 8, 20, 0.9)';
      ctx.strokeStyle = s.downloadMbps >= 50 ? 'rgba(0, 250, 154, 0.6)' : 'rgba(255, 71, 87, 0.6)';
      ctx.lineWidth = 1;
      const badgeText = `${s.downloadMbps} Mbps`;
      const badgeW = ctx.measureText(badgeText).width + 14;
      ctx.beginPath();
      ctx.roundRect(s.x - badgeW / 2, s.y - 28, badgeW, 18, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, s.x, s.y - 19);
      ctx.restore();
    });

    // 7. Render Room Markers (Bed, Desk, TV)
    markers.forEach(m => {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      const mw = 70;
      ctx.beginPath();
      ctx.roundRect(m.x - mw / 2, m.y - 12, mw, 24, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'var(--text-secondary)';
      ctx.font = '11px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(m.name, m.x, m.y);
      ctx.restore();
    });

    // 8. Render Current Testing Reticle (Walk Mode)
    if (activeTool === 'sample' && currentReticle) {
      ctx.save();
      ctx.strokeStyle = '#00fa9a';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);

      // Crosshair rings
      ctx.beginPath();
      ctx.arc(currentReticle.x, currentReticle.y, 16, 0, Math.PI * 2);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(currentReticle.x - 22, currentReticle.y);
      ctx.lineTo(currentReticle.x + 22, currentReticle.y);
      ctx.moveTo(currentReticle.x, currentReticle.y - 22);
      ctx.lineTo(currentReticle.x, currentReticle.y + 22);
      ctx.stroke();
      ctx.restore();
    }

    // 9. Render Optimizer Recommendation Ghost if calculated
    if (optimizerResult) {
      const opt = optimizerResult.optimalPosition;
      ctx.save();
      ctx.strokeStyle = '#ffb142';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(opt.x, opt.y, 22, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 177, 66, 0.9)';
      ctx.font = 'bold 11px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Best Router Spot', opt.x, opt.y - 28);
      ctx.restore();
    }
  }, [
    roomDimensions,
    routers,
    walls,
    markers,
    sampledPoints,
    activeTool,
    wallDraftStart,
    currentReticle,
    hoveredPointInfo,
    showHeatmap,
    heatmapMode,
    heatmapOpacity,
    heatmapResolution,
    showGrid,
    showRadarAnimation,
    blueprintImg,
    blueprintOpacity,
    optimizerResult
  ]);

  // Continuous animation loop for radar sweep & smooth canvas updates
  useEffect(() => {
    const loop = () => {
      radarAngleRef.current = (radarAngleRef.current + 0.03) % (Math.PI * 2);
      renderCanvas();
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [renderCanvas]);

  // Evaluate Capabilities for Current Reticle Location
  const capabilities = evaluateCapabilities(liveMetrics.downloadMbps, liveMetrics.pingMs);

  const displayedSpeed = gaugeView === 'download'
    ? (isBenchmarking && activeBenchType === 'download' ? liveGaugeMbps : liveMetrics.downloadMbps)
    : (isBenchmarking && activeBenchType === 'upload' ? liveGaugeMbps : liveMetrics.uploadMbps);

  return (
    <div className="network-map-page">
      {/* Dynamic Background Blobs */}
      <div className="blob-container">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      {/* Header */}
      <header className="net-header glass">
        <div className="net-header-left">
          <Link to="/" className="icon-btn" title="Back to Home">
            <ArrowLeft size={20} />
          </Link>
          <div className="net-title-group">
            <h1>
              <Radio className="text-gradient" size={26} />
              <span>Network <span className="text-gradient">Map</span></span>
              <span className="live-badge">
                <span className="live-badge-dot"></span>
                Live RF Heatmap
              </span>
            </h1>
            <p>Visualize WiFi bandwidth, latency, and dead zones across your room layout</p>
          </div>
        </div>

        <div className="net-header-actions">
          {/* Preset Selector */}
          <CustomSelect
            value={activePreset}
            onChange={handleSelectPreset}
            options={[
              { value: 'studio', label: 'Studio Apartment' },
              { value: 'two_bed', label: '2-Bedroom Home' },
              { value: 'modern_office', label: 'Modern Tech Office' },
              { value: 'blank', label: 'Blank Canvas' }
            ]}
            style={{ minWidth: '12rem' }}
          />

          <label className="net-btn" title="Upload Blueprint or Room Photo">
            <FileImage size={16} />
            <span>Blueprint</span>
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleBlueprintUpload}
            />
          </label>

          <button className="net-btn" onClick={handleExportPNG} title="Export High-Res PNG Heatmap">
            <Download size={16} />
            <span>Export Map</span>
          </button>

          <button className="net-btn" onClick={handleExportJSON} title="Save Project JSON">
            <Layers size={16} />
            <span>Save JSON</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="net-layout-grid">
        {/* Left / Center Viewport (2D Canvas + Controls) */}
        <section className="net-viewport-card glass">
          {/* Canvas Toolbar */}
          <div className="net-canvas-toolbar">
            <div className="net-tools-group">
              <button
                className={`net-tool-tab ${activeTool === 'sample' ? 'active' : ''}`}
                onClick={() => { setActiveTool('sample'); setWallDraftStart(null); }}
              >
                <Navigation size={15} />
                <span>Walk & Sample</span>
              </button>

              <button
                className={`net-tool-tab ${activeTool === 'wall' ? 'active' : ''}`}
                onClick={() => { setActiveTool('wall'); setWallDraftStart(null); }}
              >
                <Square size={15} />
                <span>Draw Walls</span>
              </button>

              <button
                className={`net-tool-tab ${activeTool === 'router' ? 'active' : ''}`}
                onClick={() => { setActiveTool('router'); setWallDraftStart(null); }}
              >
                <Wifi size={15} />
                <span>Place Router</span>
              </button>

              <button
                className={`net-tool-tab ${activeTool === 'marker' ? 'active' : ''}`}
                onClick={() => { setActiveTool('marker'); setWallDraftStart(null); }}
              >
                <MapPin size={15} />
                <span>Add Marker</span>
              </button>

              <button
                className={`net-tool-tab ${activeTool === 'erase' ? 'active' : ''}`}
                onClick={() => { setActiveTool('erase'); setWallDraftStart(null); }}
              >
                <Trash2 size={15} />
                <span>Erase</span>
              </button>
            </div>

            {/* Heatmap Layer Selector */}
            <div className="net-tools-group">
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', padding: '0 0.3rem' }}>Layer:</span>
              <CustomSelect
                value={heatmapMode}
                onChange={setHeatmapMode}
                options={[
                  { value: 'bandwidth', label: 'Bandwidth (Mbps)' },
                  { value: 'latency', label: 'Latency / Ping (ms)' },
                  { value: 'signal', label: 'Signal (dBm)' },
                  { value: 'deadzones', label: 'Dead Zones Only' }
                ]}
                style={{ minWidth: '11.5rem' }}
              />
            </div>
          </div>

          {/* Sub-config bar based on active tool */}
          {activeTool === 'wall' && (
            <div className="net-tool-config-bar">
              <span>Select Material:</span>
              <div className="material-chip-group">
                {Object.values(WALL_MATERIALS).map((mat) => (
                  <button
                    key={mat.id}
                    className={`material-chip ${selectedMaterial === mat.id ? 'active' : ''}`}
                    onClick={() => setSelectedMaterial(mat.id)}
                  >
                    <span className="material-color-dot" style={{ background: mat.color }} />
                    <span>{mat.name}</span>
                    <span style={{ opacity: 0.6, fontSize: '0.72rem' }}>(-{mat.attenuationDb}dB)</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTool === 'router' && (
            <div className="net-tool-config-bar">
              <span>Router WiFi Frequency Band:</span>
              <div className="material-chip-group">
                {['2.4GHz', '5GHz', '6GHz'].map((band) => (
                  <button
                    key={band}
                    className={`material-chip ${selectedBand === band ? 'active' : ''}`}
                    onClick={() => setSelectedBand(band)}
                  >
                    <span>{band}</span>
                    <span style={{ opacity: 0.6, fontSize: '0.72rem' }}>
                      (Max {WIFI_BANDS[band].maxBandwidthMbps} Mbps)
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Interactive Canvas Container */}
          <div className="net-canvas-container">
            <canvas
              ref={canvasRef}
              width={roomDimensions.width}
              height={roomDimensions.height}
              className="net-canvas"
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={() => setHoveredPointInfo(null)}
            />

            {/* Live Hover HUD / Telemetry Tooltip */}
            {hoveredPointInfo && (
              <div className="net-canvas-hud">
                <span>Pos: <strong>{hoveredPointInfo.x}px, {hoveredPointInfo.y}px</strong></span>
                <span>Speed: <strong style={{ color: '#00fa9a' }}>{hoveredPointInfo.bandwidthMbps} Mbps</strong></span>
                <span>Ping: <strong style={{ color: '#00d2ff' }}>{hoveredPointInfo.pingMs} ms</strong></span>
                <span>Signal: <strong>{hoveredPointInfo.rssiDbm} dBm</strong></span>
              </div>
            )}

            {/* Quick Canvas Viewport Toggles */}
            <div className="net-canvas-controls">
              <button
                className="canvas-icon-btn"
                title={showHeatmap ? 'Hide Heatmap' : 'Show Heatmap'}
                onClick={() => setShowHeatmap(!showHeatmap)}
              >
                <Eye size={16} color={showHeatmap ? '#00fa9a' : 'var(--text-secondary)'} />
              </button>
              <button
                className="canvas-icon-btn"
                title={showGrid ? 'Hide Grid' : 'Show Grid'}
                onClick={() => setShowGrid(!showGrid)}
              >
                <Layers size={16} color={showGrid ? '#00d2ff' : 'var(--text-secondary)'} />
              </button>
              <button
                className="canvas-icon-btn"
                title="Toggle Radar Pulse"
                onClick={() => setShowRadarAnimation(!showRadarAnimation)}
              >
                <Activity size={16} color={showRadarAnimation ? '#ff2a85' : 'var(--text-secondary)'} />
              </button>
            </div>
          </div>

          {/* Legend & Heatmap Controls */}
          <div className="net-legend-bar">
            <div className="legend-spectrum">
              <span className="legend-label">Dead Zone (0 Mbps)</span>
              <div className="spectrum-gradient-bar"></div>
              <span className="legend-label" style={{ color: '#00fa9a' }}>Optimal (500+ Mbps)</span>
            </div>

            <div className="legend-toggles">
              <div className="legend-slider-group">
                <span>Opacity:</span>
                <input
                  type="range"
                  className="net-slider"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={heatmapOpacity}
                  onChange={(e) => setHeatmapOpacity(parseFloat(e.target.value))}
                />
              </div>

              {blueprintImg && (
                <div className="legend-slider-group">
                  <span>Blueprint:</span>
                  <input
                    type="range"
                    className="net-slider"
                    min="0.05"
                    max="1.0"
                    step="0.05"
                    value={blueprintOpacity}
                    onChange={(e) => setBlueprintOpacity(parseFloat(e.target.value))}
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Right Sidebar: Benchmark Station & Diagnostics */}
        <aside className="net-sidebar">
          {/* Live Speedometer & Sample Recorder */}
          <div className="telemetry-card glass">
            <h2>
              <Zap size={18} color="#00fa9a" />
              <span>Speed & Benchmark Station</span>
            </h2>

            {/* Circular Speed Dial Gauge */}
            <div className="gauge-container">
              <svg className="speed-dial-svg" viewBox="0 0 200 130">
                <defs>
                  <linearGradient id="speedGaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ff4757" />
                    <stop offset="35%" stopColor="#ffb142" />
                    <stop offset="70%" stopColor="#00d2ff" />
                    <stop offset="100%" stopColor="#00fa9a" />
                  </linearGradient>
                </defs>
                {/* Background Arc */}
                <path
                  d="M 25 115 A 75 75 0 0 1 175 115"
                  className="dial-bg-track"
                />
                {/* Value Arc */}
                <path
                  d="M 25 115 A 75 75 0 0 1 175 115"
                  className="dial-value-arc"
                  strokeDasharray="235.6"
                  strokeDashoffset={235.6 * (1 - Math.min(1, displayedSpeed / 600))}
                />
              </svg>

              <div className="gauge-center-readout">
                <div className="gauge-big-number">{Math.round(displayedSpeed)}</div>
                <div className="gauge-unit">
                  {gaugeView === 'download' ? 'Mbps Download' : 'Mbps Upload'}
                </div>
              </div>
            </div>

            {/* Metrics Breakdown Grid with View Switching */}
            <div className="metrics-stat-grid">
              <div
                className={`stat-box clickable ${gaugeView === 'download' ? 'active-tab' : ''}`}
                title="Click to view Download Speed on gauge"
                onClick={() => setGaugeView('download')}
              >
                <div className="stat-label">Download</div>
                <div className="stat-value" style={{ color: '#00fa9a' }}>
                  {liveMetrics.downloadMbps} <span style={{ fontSize: '0.7rem' }}>M</span>
                </div>
              </div>

              <div
                className={`stat-box clickable ${gaugeView === 'upload' ? 'active-tab' : ''}`}
                title="Click to view Upload Speed on gauge"
                onClick={() => setGaugeView('upload')}
              >
                <div className="stat-label">Upload</div>
                <div className="stat-value" style={{ color: '#00d2ff' }}>
                  {liveMetrics.uploadMbps} <span style={{ fontSize: '0.7rem' }}>M</span>
                </div>
              </div>

              <div className="stat-box">
                <div className="stat-label">Ping / RTT</div>
                <div className="stat-value" style={{ color: '#ffb142' }}>
                  {liveMetrics.pingMs} <span style={{ fontSize: '0.7rem' }}>ms</span>
                </div>
              </div>
            </div>

            {/* Benchmark Trigger & Location Input */}
            <div className="benchmark-actions">
              <div className="location-input-row">
                <input
                  type="text"
                  className="net-input"
                  placeholder="Spot Name (e.g. Work Desk)"
                  value={sampleSpotName}
                  onChange={(e) => setSampleSpotName(e.target.value)}
                />
              </div>

              {/* Two Separate Buttons: Start Download & Start Upload */}
              <div className="bench-split-buttons">
                <button
                  type="button"
                  className={`net-btn-bench net-btn-download ${isBenchmarking && activeBenchType === 'download' ? 'running' : ''}`}
                  disabled={isBenchmarking && activeBenchType !== 'download'}
                  onClick={() => handleRunSpeedTest('download')}
                  title="Benchmark Download Throughput on Current Spot"
                >
                  {isBenchmarking && activeBenchType === 'download' ? (
                    <>
                      <RefreshCw size={15} className="spin-anim" />
                      <span>Testing ({benchProgress}%)</span>
                    </>
                  ) : (
                    <>
                      <Download size={15} />
                      <span>Start Download</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className={`net-btn-bench net-btn-upload ${isBenchmarking && activeBenchType === 'upload' ? 'running' : ''}`}
                  disabled={isBenchmarking && activeBenchType !== 'upload'}
                  onClick={() => handleRunSpeedTest('upload')}
                  title="Benchmark Upload Throughput on Current Spot"
                >
                  {isBenchmarking && activeBenchType === 'upload' ? (
                    <>
                      <RefreshCw size={15} className="spin-anim" />
                      <span>Testing ({benchProgress}%)</span>
                    </>
                  ) : (
                    <>
                      <Upload size={15} />
                      <span>Start Upload</span>
                    </>
                  )}
                </button>
              </div>

              {isBenchmarking && (
                <div className="bench-progress-bar">
                  <div className="bench-progress-fill" style={{ width: `${benchProgress}%` }} />
                </div>
              )}
            </div>
          </div>

          {/* Smart Router Optimizer */}
          <div className="telemetry-card glass">
            <h2>
              <Sparkles size={18} color="#ffb142" />
              <span>Router Placement Optimizer</span>
            </h2>

            <div className="optimizer-box">
              {optimizerResult ? (
                <>
                  <p><strong>Calculated Position:</strong> ({Math.round(optimizerResult.optimalPosition.x)}px, {Math.round(optimizerResult.optimalPosition.y)}px)</p>
                  <p style={{ marginTop: '0.3rem' }}>{optimizerResult.suggestion}</p>
                  <button
                    className="net-btn net-btn-primary"
                    style={{ marginTop: '0.65rem', width: '100%', padding: '0.45rem' }}
                    onClick={handleApplyOptimizedRouter}
                  >
                    Apply Optimal Position
                  </button>
                </>
              ) : (
                <p>Simulate wall RF reflections to find the optimal router placement that eliminates room dead zones.</p>
              )}
            </div>

            {!optimizerResult && (
              <button
                className="net-btn"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={handleOptimizeRouter}
              >
                <Sparkles size={16} />
                <span>Calculate Best Position</span>
              </button>
            )}
          </div>

          {/* Capability Readiness Matrix */}
          <div className="telemetry-card glass">
            <h2>
              <CheckCircle2 size={18} color="#00d2ff" />
              <span>Location Readiness</span>
            </h2>

            <div className="capability-list">
              {capabilities.map((cap) => (
                <div key={cap.name} className="cap-item">
                  <span className="cap-name">{cap.name}</span>
                  <span className={`cap-badge ${cap.supported ? 'pass' : 'warn'}`}>
                    {cap.badge}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Sampled Points List */}
          <div className="telemetry-card glass">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <h2>
                <MapPin size={18} color="#ff2a85" />
                <span>Sampled Points ({sampledPoints.length})</span>
              </h2>
              {sampledPoints.length > 0 && (
                <button
                  className="net-btn net-btn-danger"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                  onClick={() => setSampledPoints([])}
                >
                  Clear
                </button>
              )}
            </div>

            <div className="samples-table-wrapper">
              {sampledPoints.length === 0 ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                  No spots sampled yet. Walk to a spot and click "Sample Current Spot".
                </div>
              ) : (
                sampledPoints.map((s) => (
                  <div key={s.id} className="sample-row">
                    <div className="sample-row-name">
                      <span
                        className="sample-row-dot"
                        style={{ background: s.downloadMbps >= 50 ? '#00fa9a' : '#ff4757' }}
                      />
                      <span>{s.name}</span>
                    </div>

                    <div className="sample-row-stats">
                      <span className="sample-mbps-pill">{s.downloadMbps} M</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{s.pingMs}ms</span>
                      <button
                        className="btn-icon-del"
                        title="Delete Spot"
                        onClick={() => setSampledPoints(prev => prev.filter(p => p.id !== s.id))}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
