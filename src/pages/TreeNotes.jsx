import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  GitBranch,
  FolderTree,
  Network,
  Plus,
  Trash2,
  Download,
  Upload,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Search,
  Check,
  Tag,
  FileText,
  Copy,
  Layers,
  ListTree,
  ChevronRight,
  ChevronDown,
  LayoutGrid,
  Eye,
  Edit3,
  CornerDownRight,
  ArrowUp,
  ArrowDown,
  FileCode,
  Compass,
  HelpCircle,
  X,
  Share2
} from 'lucide-react';
import {
  NODE_COLORS,
  PRESET_TREES,
  generateId,
  findNodeById,
  findParentNode,
  getNodePath,
  addChildNode,
  addSiblingNode,
  updateNode,
  deleteNode,
  duplicateNode,
  moveNode,
  toggleNodeCollapse,
  setAllNodesExpanded,
  getTreeStats,
  findNodeInTreeOrFloating,
  findParentInTreeOrFloating,
  updateNodeInTreeOrFloating,
  deleteNodeInTreeOrFloating,
  computeHorizontalTreeLayout,
  computeRadialMindMapLayout,
  computeVerticalTreeLayout,
  exportToJson,
  exportToMarkdown,
  exportToPlainText,
  exportToOpml,
  parseMarkdownToTree,
  parseOpmlToTree,
  downloadFile
} from '../utils/treeNotesData';
import './TreeNotes.css';
import '../App.css';

const STORAGE_KEY = 'tools_tree_notes_workspaces_v1';
const ACTIVE_TREE_KEY = 'tools_active_tree_id_v1';

const VIEW_MODE_OPTIONS = [
  { id: 'split', label: 'Split View', icon: Layers },
  { id: 'map-full', label: 'Map View', icon: Network },
  { id: 'outline-full', label: 'Outline', icon: ListTree }
];

const MAP_LAYOUT_OPTIONS = [
  { id: 'vertical', label: 'Vertical Tree', icon: FolderTree },
  { id: 'horizontal', label: 'Horizontal', icon: GitBranch },
  { id: 'radial', label: 'Radial', icon: Compass }
];

export default function TreeNotes() {
  // Workspaces / Maps State
  const [treeList, setTreeList] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return PRESET_TREES;
  });

  const [activeTreeId, setActiveTreeId] = useState(() => {
    const savedId = localStorage.getItem(ACTIVE_TREE_KEY);
    return savedId || PRESET_TREES[0].id;
  });

  // Active Tree Data
  const currentTree = useMemo(() => {
    const found = treeList.find(t => t.id === activeTreeId);
    return found || treeList[0] || PRESET_TREES[0];
  }, [treeList, activeTreeId]);

  const rootData = currentTree.root;

  // History State for Undo/Redo
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);

  // Selected Node State
  const [selectedNodeId, setSelectedNodeId] = useState(() => rootData ? rootData.id : null);
  const [focusedBranchId, setFocusedBranchId] = useState(null);

  // View Mode: 'split' | 'map-full' | 'outline-full'
  const [viewMode, setViewMode] = useState('split');
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);
  const viewDropdownRef = useRef(null);

  // Map Layout: 'vertical' | 'horizontal' | 'radial'
  const [mapLayout, setMapLayout] = useState('vertical');
  const [isLayoutDropdownOpen, setIsLayoutDropdownOpen] = useState(false);
  const layoutDropdownRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (viewDropdownRef.current && !viewDropdownRef.current.contains(e.target)) {
        setIsViewDropdownOpen(false);
      }
      if (layoutDropdownRef.current && !layoutDropdownRef.current.contains(e.target)) {
        setIsLayoutDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Markdown Editor vs Preview toggle
  const [editorPreviewMode, setEditorPreviewMode] = useState(false);

  // Search Query
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isNewMapModalOpen, setIsNewMapModalOpen] = useState(false);

  // Import modal tabs & state
  const [importTab, setImportTab] = useState('file'); // 'file' | 'paste' | 'preset'
  const [importPasteText, setImportPasteText] = useState('');
  const [importPasteFormat, setImportPasteFormat] = useState('markdown'); // 'markdown' | 'json' | 'opml'
  const [importError, setImportError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  // Export modal state
  const [exportFormat, setExportFormat] = useState('markdown'); // 'markdown' | 'json' | 'png' | 'svg' | 'opml' | 'text'
  const [exportCopied, setExportCopied] = useState(false);

  // Canvas Pan & Zoom State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 80, y: 40 });
  const [isPanning, setIsPanning] = useState(false);
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const startPanRef = useRef({ x: 0, y: 0 });
  const canvasRef = useRef(null);
  const cleanupWheelRef = useRef(null);
  const svgRef = useRef(null);

  // Keep refs synchronized with state
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  // Draw.io Style Connection Ports State
  const [connectingSource, setConnectingSource] = useState(null); // { nodeId, port: 'top'|'right'|'bottom'|'left', startX, startY }
  const connectingSourceRef = useRef(null);
  const [connectingCurrentPos, setConnectingCurrentPos] = useState({ x: 0, y: 0 });
  const [selectedConnId, setSelectedConnId] = useState(null);

  // Free-form Drag and Drop Movement State
  const [draggedNodeId, setDraggedNodeId] = useState(null);
  const [liveDragPositions, setLiveDragPositions] = useState({});
  const dragInfoRef = useRef(null);

  // Keep connectingSourceRef synchronized
  useEffect(() => {
    connectingSourceRef.current = connectingSource;
  }, [connectingSource]);

  // Save changes to workspace in localStorage
  const saveWorkspace = useCallback((updates, commitToHistory = true) => {
    if (commitToHistory) {
      setHistory(prev => [currentTree, ...prev.slice(0, 30)]);
      setFuture([]);
    }

    setTreeList(prev => {
      const updated = prev.map(t => {
        if (t.id === activeTreeId) {
          return {
            ...t,
            ...updates,
            updatedAt: new Date().toISOString()
          };
        }
        return t;
      });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save tree notes workspace to localStorage:', err);
      }
      return updated;
    });
  }, [activeTreeId, currentTree]);

  // Backward compatible saveTreeData
  const saveTreeData = useCallback((newRoot, commitToHistory = true) => {
    saveWorkspace({ root: newRoot }, commitToHistory);
  }, [saveWorkspace]);

  // Save custom connections between arbitrary ports
  const saveCustomConnections = (newConns) => {
    saveWorkspace({ customConnections: newConns });
  };

  // Set active tree ID and sync
  const handleSelectTree = (treeId) => {
    setActiveTreeId(treeId);
    localStorage.setItem(ACTIVE_TREE_KEY, treeId);
    const target = treeList.find(t => t.id === treeId);
    if (target && target.root) {
      setSelectedNodeId(target.root.id);
      setFocusedBranchId(null);
      setConnectingSource(null);
      setSelectedConnId(null);
      setLiveDragPositions({});
    }
  };

  // Undo / Redo
  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[0];
    setHistory(prev => prev.slice(1));
    setFuture(prev => [currentTree, ...prev]);
    saveWorkspace(previous, false);
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture(prev => prev.slice(1));
    setHistory(prev => [currentTree, ...prev]);
    saveWorkspace(next, false);
  };

  // Currently focused root
  const effectiveRoot = useMemo(() => {
    if (focusedBranchId) {
      const found = findNodeInTreeOrFloating(rootData, currentTree.floatingNodes || [], focusedBranchId);
      if (found) return found;
    }
    return rootData;
  }, [rootData, currentTree.floatingNodes, focusedBranchId]);

  // Screen coordinate to SVG coordinate translator
  const getSvgCoords = useCallback((e) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;
    const curPan = panRef.current || pan;
    const curZoom = zoomRef.current || zoom;
    return {
      x: (rawX - curPan.x) / curZoom,
      y: (rawY - curPan.y) / curZoom
    };
  }, [pan, zoom]);

  // Get Anchor Port (Top, Right, Bottom, Left) Position for a Node
  const getPortPosition = (node, port) => {
    if (!node) return { x: 0, y: 0 };
    const w = node.width || 220;
    const h = node.height || 80;
    if (port === 'top') return { x: node.x + w / 2, y: node.y };
    if (port === 'right') return { x: node.x + w, y: node.y + h / 2 };
    if (port === 'bottom') return { x: node.x + w / 2, y: node.y + h };
    if (port === 'left') return { x: node.x, y: node.y + h / 2 };
    return { x: node.x + w / 2, y: node.y + h / 2 };
  };

  // Compute smooth curved cubic bezier connector path between 2 ports and exact curve midpoint
  const computeConnectionPath = (p1, p2, port1, port2) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const offset = Math.min(Math.max(dist * 0.4, 25), 140);

    let cp1x = p1.x, cp1y = p1.y;
    if (port1 === 'top') cp1y -= offset;
    else if (port1 === 'bottom') cp1y += offset;
    else if (port1 === 'left') cp1x -= offset;
    else if (port1 === 'right') cp1x += offset;

    let cp2x = p2.x, cp2y = p2.y;
    if (port2 === 'top') cp2y -= offset;
    else if (port2 === 'bottom') cp2y += offset;
    else if (port2 === 'left') cp2x -= offset;
    else if (port2 === 'right') cp2x += offset;

    const midX = 0.125 * p1.x + 0.375 * cp1x + 0.375 * cp2x + 0.125 * p2.x;
    const midY = 0.125 * p1.y + 0.375 * cp1y + 0.375 * cp2y + 0.125 * p2.y;

    return {
      path: `M ${p1.x} ${p1.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`,
      midX,
      midY
    };
  };

  // Smart directional connector routing between parent and child in freeform/tree modes
  const getOptimalConnection = useCallback((pNode, cNode) => {
    const pMidX = pNode.x + pNode.width / 2;
    const pMidY = pNode.y + pNode.height / 2;
    const cMidX = cNode.x + cNode.width / 2;
    const cMidY = cNode.y + cNode.height / 2;

    const dx = cMidX - pMidX;
    const dy = cMidY - pMidY;

    let pPort = 'bottom';
    let cPort = 'top';

    if (mapLayout === 'horizontal') {
      pPort = dx >= 0 ? 'right' : 'left';
      cPort = dx >= 0 ? 'left' : 'right';
    } else if (mapLayout === 'vertical') {
      pPort = dy >= 0 ? 'bottom' : 'top';
      cPort = dy >= 0 ? 'top' : 'bottom';
    } else {
      if (Math.abs(dx) > Math.abs(dy)) {
        pPort = dx >= 0 ? 'right' : 'left';
        cPort = dx >= 0 ? 'left' : 'right';
      } else {
        pPort = dy >= 0 ? 'bottom' : 'top';
        cPort = dy >= 0 ? 'top' : 'bottom';
      }
    }

    const p1 = getPortPosition(pNode, pPort);
    const p2 = getPortPosition(cNode, cPort);
    const connData = computeConnectionPath(p1, p2, pPort, cPort);

    return {
      p1,
      p2,
      path: connData.path,
      midX: connData.midX,
      midY: connData.midY
    };
  }, [mapLayout]);

  // Compute Layout for Interactive Map (combining Auto-Layout, Freeform Drag Positions, and Floating Nodes)
  const computedLayout = useMemo(() => {
    if (!effectiveRoot) return { nodes: [], connections: [], bounds: { minX: 0, minY: 0, maxX: 800, maxY: 600, width: 800, height: 600 } };

    // 1. Base auto-layout for root hierarchy
    let baseLayout;
    if (mapLayout === 'radial') {
      baseLayout = computeRadialMindMapLayout(effectiveRoot);
    } else if (mapLayout === 'vertical') {
      baseLayout = computeVerticalTreeLayout(effectiveRoot);
    } else {
      baseLayout = computeHorizontalTreeLayout(effectiveRoot);
    }

    const customPositions = currentTree.nodePositions || {};
    const nodesList = [];
    const connectionsList = [];
    const nodeMap = new Map();

    // 2. Add nodes from root tree (applying custom drag positions)
    baseLayout.nodes.forEach(n => {
      let posX = n.x;
      let posY = n.y;
      if (liveDragPositions[n.id]) {
        posX = liveDragPositions[n.id].x;
        posY = liveDragPositions[n.id].y;
      } else if (customPositions[n.id]) {
        posX = customPositions[n.id].x;
        posY = customPositions[n.id].y;
      }

      const layoutNode = {
        ...n,
        x: posX,
        y: posY
      };
      nodesList.push(layoutNode);
      nodeMap.set(n.id, layoutNode);
    });

    // 3. Add floating / independent nodes (and their subtrees) formatted in level order
    const floatingList = currentTree.floatingNodes || [];
    let currentFloatingOffsetY = (baseLayout.bounds ? baseLayout.bounds.maxY + 120 : 450);
    let currentFloatingOffsetX = (baseLayout.bounds ? baseLayout.bounds.minX : 40);

    floatingList.forEach((fRoot, idx) => {
      // Compute full level-order layout for each floating subtree
      let fLayout;
      if (mapLayout === 'horizontal') {
        fLayout = computeHorizontalTreeLayout(fRoot);
      } else {
        fLayout = computeVerticalTreeLayout(fRoot);
      }

      const originX = currentFloatingOffsetX;
      const originY = currentFloatingOffsetY;

      // Map each node in floating subtree
      fLayout.nodes.forEach(fNode => {
        let posX = originX + (fNode.x - (fLayout.bounds ? fLayout.bounds.minX : 0));
        let posY = originY + (fNode.y - (fLayout.bounds ? fLayout.bounds.minY : 0));

        if (liveDragPositions[fNode.id]) {
          posX = liveDragPositions[fNode.id].x;
          posY = liveDragPositions[fNode.id].y;
        } else if (customPositions[fNode.id]) {
          posX = customPositions[fNode.id].x;
          posY = customPositions[fNode.id].y;
        }

        const layoutFNode = {
          ...fNode,
          x: posX,
          y: posY,
          isFloating: true
        };
        nodesList.push(layoutFNode);
        nodeMap.set(fNode.id, layoutFNode);
      });

      // Map connections in floating subtree
      fLayout.connections.forEach(fConn => {
        const pNode = nodeMap.get(fConn.parentId);
        const cNode = nodeMap.get(fConn.childId);
        if (pNode && cNode) {
          const connData = getOptimalConnection(pNode, cNode);
          connectionsList.push({
            ...fConn,
            x1: connData.p1.x,
            y1: connData.p1.y,
            x2: connData.p2.x,
            y2: connData.p2.y,
            midX: connData.midX,
            midY: connData.midY,
            path: connData.path
          });
        }
      });

      // Advance offset for the next floating subtree
      if (mapLayout === 'horizontal') {
        currentFloatingOffsetY += (fLayout.bounds ? fLayout.bounds.height : 120) + 60;
      } else {
        currentFloatingOffsetX += (fLayout.bounds ? fLayout.bounds.width : 280) + 60;
        if ((idx + 1) % 3 === 0) {
          currentFloatingOffsetX = (baseLayout.bounds ? baseLayout.bounds.minX : 40);
          currentFloatingOffsetY += 260;
        }
      }
    });

    // 4. Re-calculate hierarchy connections based on actual node positions
    baseLayout.connections.forEach(conn => {
      const pNode = nodeMap.get(conn.parentId);
      const cNode = nodeMap.get(conn.childId);
      if (pNode && cNode) {
        const connData = getOptimalConnection(pNode, cNode);
        connectionsList.push({
          ...conn,
          x1: connData.p1.x,
          y1: connData.p1.y,
          x2: connData.p2.x,
          y2: connData.p2.y,
          midX: connData.midX,
          midY: connData.midY,
          path: connData.path
        });
      }
    });

    // 5. Compute total bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodesList.forEach(n => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    });

    if (minX === Infinity) {
      minX = 0; minY = 0; maxX = 800; maxY = 600;
    }

    return {
      nodes: nodesList,
      connections: connectionsList,
      bounds: {
        minX: minX - 60,
        minY: minY - 60,
        maxX: maxX + 60,
        maxY: maxY + 60,
        width: Math.max(800, (maxX - minX) + 120),
        height: Math.max(600, (maxY - minY) + 120)
      }
    };
  }, [effectiveRoot, mapLayout, currentTree.nodePositions, currentTree.floatingNodes, liveDragPositions, getOptimalConnection]);

  // Active selected node object
  const activeNode = useMemo(() => {
    if (!selectedNodeId) return rootData;
    return findNodeInTreeOrFloating(rootData, currentTree.floatingNodes || [], selectedNodeId) || rootData;
  }, [rootData, currentTree.floatingNodes, selectedNodeId]);

  // Path Breadcrumbs
  const breadcrumbPath = useMemo(() => {
    if (!activeNode) return [];
    const path = getNodePath(rootData, activeNode.id);
    if (path) return path;
    for (const fn of (currentTree.floatingNodes || [])) {
      const fPath = getNodePath(fn, activeNode.id);
      if (fPath) return fPath;
    }
    return [{ id: activeNode.id, title: activeNode.title, color: activeNode.color }];
  }, [rootData, currentTree.floatingNodes, activeNode]);

  // Statistics across all nodes
  const treeStats = useMemo(() => {
    let totalNodes = 0;
    let maxDepth = 0;
    let completedCount = 0;
    let wordCount = 0;

    const traverse = (node, depth) => {
      totalNodes += 1;
      if (depth > maxDepth) maxDepth = depth;
      if (node.completed) completedCount += 1;
      const wordsInTitle = (node.title || '').trim().split(/\s+/).filter(Boolean).length;
      const wordsInContent = (node.content || '').trim().split(/\s+/).filter(Boolean).length;
      wordCount += wordsInTitle + wordsInContent;
      if (node.children) {
        node.children.forEach(c => traverse(c, depth + 1));
      }
    };

    if (rootData) traverse(rootData, 1);
    (currentTree.floatingNodes || []).forEach(fn => traverse(fn, 1));

    const percentComplete = totalNodes > 0 ? Math.round((completedCount / totalNodes) * 100) : 0;
    return { totalNodes, maxDepth, completedCount, percentComplete, wordCount };
  }, [rootData, currentTree.floatingNodes]);

  // Search matching node IDs
  const matchedNodeIds = useMemo(() => {
    if (!searchQuery.trim()) return new Set();
    const query = searchQuery.toLowerCase().trim();
    const matched = new Set();

    const searchTraverse = (node) => {
      const titleMatch = (node.title || '').toLowerCase().includes(query);
      const contentMatch = (node.content || '').toLowerCase().includes(query);
      const tagMatch = (node.tags || []).some(t => t.toLowerCase().includes(query));

      if (titleMatch || contentMatch || tagMatch) {
        matched.add(node.id);
      }
      if (node.children) {
        node.children.forEach(searchTraverse);
      }
    };

    if (rootData) searchTraverse(rootData);
    (currentTree.floatingNodes || []).forEach(searchTraverse);
    return matched;
  }, [rootData, currentTree.floatingNodes, searchQuery]);

  // Draft rubberband curve while dragging
  const computeDraftPath = (start, end, port) => {
    const offset = 40;
    let cp1x = start.x, cp1y = start.y;
    if (port === 'top') cp1y -= offset;
    else if (port === 'bottom') cp1y += offset;
    else if (port === 'left') cp1x -= offset;
    else if (port === 'right') cp1x += offset;

    return `M ${start.x} ${start.y} Q ${cp1x} ${cp1y}, ${end.x} ${end.y}`;
  };

  // Auto-fit or Center on nodes
  const handleFitToView = useCallback(() => {
    if (!canvasRef.current || !computedLayout) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    if (canvasRect.width === 0 || canvasRect.height === 0) return;
    const bounds = computedLayout.bounds;

    if (mapLayout === 'radial') {
      const scaleX = (canvasRect.width - 100) / bounds.width;
      const scaleY = (canvasRect.height - 100) / bounds.height;
      const newScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.35), 1.2);
      const newPan = { x: canvasRect.width / 2, y: canvasRect.height / 2 };
      zoomRef.current = newScale;
      panRef.current = newPan;
      setZoom(newScale);
      setPan(newPan);
    } else if (mapLayout === 'vertical') {
      const scaleX = (canvasRect.width - 80) / bounds.width;
      const scaleY = (canvasRect.height - 80) / bounds.height;
      const newScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.35), 1.0);
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const newPan = {
        x: canvasRect.width / 2 - centerX * newScale,
        y: 40
      };
      zoomRef.current = newScale;
      panRef.current = newPan;
      setZoom(newScale);
      setPan(newPan);
    } else {
      const scaleX = (canvasRect.width - 120) / bounds.width;
      const scaleY = (canvasRect.height - 120) / bounds.height;
      const newScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.35), 1.1);
      const newPan = { x: 60, y: 80 };
      zoomRef.current = newScale;
      panRef.current = newPan;
      setZoom(newScale);
      setPan(newPan);
    }
  }, [computedLayout, mapLayout]);

  // Reset Canvas View
  const handleResetView = () => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    let newPan = { x: 80, y: 100 };
    if (mapLayout === 'radial') {
      newPan = { x: rect.width / 2, y: rect.height / 2 };
    } else if (mapLayout === 'vertical' && computedLayout) {
      const bounds = computedLayout.bounds;
      const centerX = (bounds.minX + bounds.maxX) / 2;
      newPan = { x: rect.width / 2 - centerX, y: 40 };
    }
    zoomRef.current = 1;
    panRef.current = newPan;
    setZoom(1);
    setPan(newPan);
  };

  // Zoom centered on canvas viewport
  const handleZoomButton = (multiplier) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const currentZoom = zoomRef.current;
    const currentPan = panRef.current;
    const nextZoom = Math.min(Math.max(currentZoom * multiplier, 0.2), 3.5);
    if (nextZoom === currentZoom) return;
    const ratio = nextZoom / currentZoom;
    const nextPan = {
      x: centerX - (centerX - currentPan.x) * ratio,
      y: centerY - (centerY - currentPan.y) * ratio
    };
    zoomRef.current = nextZoom;
    panRef.current = nextPan;
    setZoom(nextZoom);
    setPan(nextPan);
  };

  // Node Mutations
  const handleAddNode = () => {
    handleAddIndividualNode();
  };

  const handleAddIndividualNode = () => {
    let posX = 240;
    let posY = 200;
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const curPan = panRef.current || pan;
      const curZoom = zoomRef.current || zoom;
      posX = (rect.width / 2 - curPan.x) / curZoom - 110;
      posY = (rect.height / 2 - curPan.y) / curZoom - 40;
    }

    const newNodeId = generateId();
    const newNode = {
      id: newNodeId,
      title: 'Individual Node',
      content: 'Standalone free-form node. Drag anywhere on canvas or connect using the 4 anchor ports.',
      color: 'cyan',
      completed: false,
      tags: ['standalone'],
      isExpanded: true,
      children: []
    };

    const updatedFloating = [...(currentTree.floatingNodes || []), newNode];
    const updatedPositions = {
      ...(currentTree.nodePositions || {}),
      [newNodeId]: { x: Math.round(posX), y: Math.round(posY) }
    };

    saveWorkspace({
      floatingNodes: updatedFloating,
      nodePositions: updatedPositions
    });

    setSelectedNodeId(newNodeId);
  };

  const handleResetPositions = () => {
    saveWorkspace({
      nodePositions: {}
    });
    setLiveDragPositions({});
    handleFitToView();
  };

  const handleSelectLayout = (newLayout) => {
    setMapLayout(newLayout);
    // Reset custom dragged positions so the tree neatly auto-formats according to the selected layout
    saveWorkspace({
      nodePositions: {}
    });
    setLiveDragPositions({});
  };

  const handleAddChild = (parentId) => {
    const targetId = parentId || (activeNode ? activeNode.id : rootData.id);
    let newRoot = rootData;
    let newFloating = currentTree.floatingNodes || [];
    let newNodeId = null;

    if (findNodeById(rootData, targetId)) {
      const res = addChildNode(rootData, targetId);
      newRoot = res.updatedRoot;
      newNodeId = res.newNodeId;
    } else {
      newFloating = (currentTree.floatingNodes || []).map(fn => {
        if (findNodeById(fn, targetId)) {
          const res = addChildNode(fn, targetId);
          newNodeId = res.newNodeId;
          return res.updatedRoot;
        }
        return fn;
      });
    }

    saveWorkspace({
      root: newRoot,
      floatingNodes: newFloating
    });

    if (newNodeId) setSelectedNodeId(newNodeId);
  };

  const handleAddSibling = (targetId) => {
    const id = targetId || (activeNode ? activeNode.id : rootData.id);
    let newRoot = rootData;
    let newFloating = currentTree.floatingNodes || [];
    let newNodeId = null;

    if (findNodeById(rootData, id)) {
      const res = addSiblingNode(rootData, id);
      newRoot = res.updatedRoot;
      newNodeId = res.newNodeId;
    } else {
      newFloating = (currentTree.floatingNodes || []).map(fn => {
        if (findNodeById(fn, id)) {
          const res = addSiblingNode(fn, id);
          newNodeId = res.newNodeId;
          return res.updatedRoot;
        }
        return fn;
      });
    }

    saveWorkspace({
      root: newRoot,
      floatingNodes: newFloating
    });

    if (newNodeId) setSelectedNodeId(newNodeId);
  };

  const handleUpdateActiveNode = (updates) => {
    if (!activeNode) return;
    const { updatedRoot, updatedFloating } = updateNodeInTreeOrFloating(
      rootData,
      currentTree.floatingNodes || [],
      activeNode.id,
      updates
    );
    saveWorkspace({
      root: updatedRoot,
      floatingNodes: updatedFloating
    });
  };

  const handleDeleteNode = (nodeId) => {
    const targetId = nodeId || (activeNode ? activeNode.id : null);
    if (!targetId || targetId === rootData.id) return;

    const parent = findParentInTreeOrFloating(rootData, currentTree.floatingNodes || [], targetId);
    const { updatedRoot, updatedFloating } = deleteNodeInTreeOrFloating(
      rootData,
      currentTree.floatingNodes || [],
      targetId
    );

    const remainingConns = (currentTree.customConnections || []).filter(
      c => c.fromId !== targetId && c.toId !== targetId
    );

    const updatedPositions = { ...(currentTree.nodePositions || {}) };
    delete updatedPositions[targetId];

    saveWorkspace({
      root: updatedRoot,
      floatingNodes: updatedFloating,
      customConnections: remainingConns,
      nodePositions: updatedPositions
    });

    setSelectedNodeId(parent ? parent.id : rootData.id);
  };

  // Disconnect hierarchy chain between parent and child without deleting child node
  const handleDisconnectHierarchy = (parentId, childId) => {
    const positionsToSave = { ...(currentTree.nodePositions || {}) };
    const snapshotPositions = (node) => {
      const rendered = computedLayout.nodes.find(n => n.id === node.id);
      if (rendered) {
        positionsToSave[node.id] = { x: Math.round(rendered.x), y: Math.round(rendered.y) };
      }
      if (node.children) {
        node.children.forEach(snapshotPositions);
      }
    };

    const childObj = findNodeInTreeOrFloating(rootData, currentTree.floatingNodes || [], childId);
    if (childObj) {
      snapshotPositions(childObj);
    }

    let newRoot = JSON.parse(JSON.stringify(rootData));
    let newFloating = JSON.parse(JSON.stringify(currentTree.floatingNodes || []));

    const parentInRoot = findNodeById(newRoot, parentId);
    let detachedNode = null;

    if (parentInRoot && parentInRoot.children) {
      const idx = parentInRoot.children.findIndex(c => c.id === childId);
      if (idx !== -1) {
        detachedNode = parentInRoot.children[idx];
        parentInRoot.children.splice(idx, 1);
      }
    }

    if (!detachedNode) {
      for (const fn of newFloating) {
        const parentInFn = findNodeById(fn, parentId);
        if (parentInFn && parentInFn.children) {
          const idx = parentInFn.children.findIndex(c => c.id === childId);
          if (idx !== -1) {
            detachedNode = parentInFn.children[idx];
            parentInFn.children.splice(idx, 1);
            break;
          }
        }
      }
    }

    if (detachedNode) {
      newFloating.push(detachedNode);
    }

    saveWorkspace({
      root: newRoot,
      floatingNodes: newFloating,
      nodePositions: positionsToSave
    });
  };

  const handleDuplicateNode = (nodeId) => {
    const targetId = nodeId || (activeNode ? activeNode.id : null);
    if (!targetId || targetId === rootData.id) return;

    if (findNodeById(rootData, targetId)) {
      const { updatedRoot, newNodeId } = duplicateNode(rootData, targetId);
      saveWorkspace({ root: updatedRoot });
      if (newNodeId) setSelectedNodeId(newNodeId);
    } else {
      let newNodeId = null;
      const newFloating = (currentTree.floatingNodes || []).map(fn => {
        if (findNodeById(fn, targetId)) {
          const res = duplicateNode(fn, targetId);
          newNodeId = res.newNodeId;
          return res.updatedRoot;
        }
        return fn;
      });
      saveWorkspace({ floatingNodes: newFloating });
      if (newNodeId) setSelectedNodeId(newNodeId);
    }
  };

  const handleMoveNode = (nodeId, direction) => {
    const targetId = nodeId || (activeNode ? activeNode.id : null);
    if (!targetId || targetId === rootData.id) return;

    if (findParentNode(rootData, targetId)) {
      const updated = moveNode(rootData, targetId, direction);
      saveWorkspace({ root: updated });
    } else {
      const newFloating = (currentTree.floatingNodes || []).map(fn => {
        if (findParentNode(fn, targetId)) {
          return moveNode(fn, targetId, direction);
        }
        return fn;
      });
      saveWorkspace({ floatingNodes: newFloating });
    }
  };

  const handleToggleCollapse = (nodeId, e) => {
    if (e) e.stopPropagation();
    if (findNodeById(rootData, nodeId)) {
      const updated = toggleNodeCollapse(rootData, nodeId);
      saveWorkspace({ root: updated });
    } else {
      const newFloating = (currentTree.floatingNodes || []).map(fn => {
        if (findNodeById(fn, nodeId)) {
          return toggleNodeCollapse(fn, nodeId);
        }
        return fn;
      });
      saveWorkspace({ floatingNodes: newFloating });
    }
  };

  const handleToggleCompleted = (nodeId, e) => {
    if (e) e.stopPropagation();
    const node = findNodeInTreeOrFloating(rootData, currentTree.floatingNodes || [], nodeId);
    if (!node) return;
    handleUpdateActiveNode({ completed: !node.completed });
  };

  // Node Drag and Drop Movement Handler
  const handleNodeDragStart = (nodeId, e) => {
    if (e.button !== 0) return;
    if (
      e.target.closest('.tree-node-port') ||
      e.target.closest('button') ||
      e.target.closest('.tree-node-checkbox') ||
      e.target.closest('input')
    ) {
      return;
    }

    e.stopPropagation();
    const node = computedLayout.nodes.find(n => n.id === nodeId);
    if (!node) return;

    const svgCoords = getSvgCoords(e);
    dragInfoRef.current = {
      nodeId,
      startSvgX: svgCoords.x,
      startSvgY: svgCoords.y,
      startNodeX: node.x,
      startNodeY: node.y,
      hasMoved: false
    };
    setDraggedNodeId(nodeId);
  };

  // Connection Port Interaction Handlers (Draw.io style)
  const handlePortStart = (nodeId, port = 'right', e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const currentActive = connectingSourceRef.current || connectingSource;
    if (currentActive) {
      if (currentActive.nodeId !== nodeId) {
        handlePortEnd(nodeId, port, e);
        return;
      } else {
        setConnectingSource(null);
        connectingSourceRef.current = null;
        return;
      }
    }

    const node = computedLayout.nodes.find(n => n.id === nodeId);
    if (!node) return;
    const pCoords = getPortPosition(node, port);
    const srcObj = { nodeId, port, startX: pCoords.x, startY: pCoords.y };
    setConnectingSource(srcObj);
    connectingSourceRef.current = srcObj;
    setConnectingCurrentPos(pCoords);
  };

  const handlePortEnd = (targetNodeId, targetPort = 'left', e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const source = connectingSourceRef.current || connectingSource;
    if (!source) return;

    const fromId = source.nodeId;
    const fromPort = source.port || 'right';
    const toId = targetNodeId;
    const toPort = targetPort || 'left';

    if (fromId === toId) {
      setConnectingSource(null);
      connectingSourceRef.current = null;
      return;
    }

    const existingCustomConns = currentTree.customConnections || [];
    const isAlreadyConnected = existingCustomConns.some(
      c => (c.fromId === fromId && c.toId === toId) || (c.fromId === toId && c.toId === fromId)
    );

    if (isAlreadyConnected) {
      setConnectingSource(null);
      connectingSourceRef.current = null;
      return;
    }

    const newConn = {
      id: 'conn_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
      fromId,
      fromPort,
      toId,
      toPort,
      color: 'cyan'
    };

    saveCustomConnections([...existingCustomConns, newConn]);
    setConnectingSource(null);
    connectingSourceRef.current = null;
  };

  const handleDeleteCustomConnection = (connId) => {
    const remaining = (currentTree.customConnections || []).filter(c => c.id !== connId);
    saveCustomConnections(remaining);
    setSelectedConnId(null);
  };

  // Window mouse move and mouse up listeners for connection rubberband and node dragging
  useEffect(() => {
    const onGlobalMouseMove = (e) => {
      if (connectingSourceRef.current) {
        const coords = getSvgCoords(e);
        setConnectingCurrentPos(coords);
      }
      if (dragInfoRef.current) {
        const { nodeId, startSvgX, startSvgY, startNodeX, startNodeY } = dragInfoRef.current;
        const coords = getSvgCoords(e);
        const dx = coords.x - startSvgX;
        const dy = coords.y - startSvgY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          dragInfoRef.current.hasMoved = true;
        }
        setLiveDragPositions(prev => ({
          ...prev,
          [nodeId]: { x: Math.round(startNodeX + dx), y: Math.round(startNodeY + dy) }
        }));
      }
    };

    const onGlobalMouseUp = () => {
      if (dragInfoRef.current) {
        const { nodeId, hasMoved } = dragInfoRef.current;
        if (hasMoved) {
          setLiveDragPositions(currentLive => {
            const finalPos = currentLive[nodeId];
            if (finalPos) {
              setTreeList(prev => {
                const updated = prev.map(t => {
                  if (t.id === activeTreeId) {
                    return {
                      ...t,
                      nodePositions: {
                        ...(t.nodePositions || {}),
                        [nodeId]: finalPos
                      },
                      updatedAt: new Date().toISOString()
                    };
                  }
                  return t;
                });
                try {
                  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                } catch (err) {
                  console.error('Failed to save node positions:', err);
                }
                return updated;
              });
            }
            return currentLive;
          });
        }
        dragInfoRef.current = null;
        setDraggedNodeId(null);
      }
    };

    const onGlobalKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (connectingSourceRef.current) {
          setConnectingSource(null);
          connectingSourceRef.current = null;
        }
        if (dragInfoRef.current) {
          dragInfoRef.current = null;
          setDraggedNodeId(null);
          setLiveDragPositions({});
        }
      }
    };

    window.addEventListener('mousemove', onGlobalMouseMove);
    window.addEventListener('mouseup', onGlobalMouseUp);
    window.addEventListener('keydown', onGlobalKeyDown);

    return () => {
      window.removeEventListener('mousemove', onGlobalMouseMove);
      window.removeEventListener('mouseup', onGlobalMouseUp);
      window.removeEventListener('keydown', onGlobalKeyDown);
    };
  }, [activeTreeId, getSvgCoords]);

  // Keyboard Navigation & Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore when user is typing in input or textarea
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        handleAddChild(activeNode ? activeNode.id : null);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleAddSibling(activeNode ? activeNode.id : null);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedConnId) {
          e.preventDefault();
          handleDeleteCustomConnection(selectedConnId);
        } else if (activeNode && activeNode.id !== rootData.id) {
          e.preventDefault();
          handleDeleteNode(activeNode.id);
        }
      } else if (e.key === 'Escape') {
        if (connectingSource) setConnectingSource(null);
        if (selectedConnId) setSelectedConnId(null);
        if (focusedBranchId) setFocusedBranchId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeNode, rootData, focusedBranchId, history, future, selectedConnId, connectingSource]);

  // Pan and Drag Handlers for SVG Canvas
  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only left click
    if (selectedConnId) setSelectedConnId(null);
    if (connectingSource) setConnectingSource(null);

    // Check if clicked directly on canvas background (not on a node card or control)
    if (e.target.closest('.tree-node-card') || e.target.closest('.tree-canvas-controls') || e.target.closest('.tree-custom-connector')) return;
    setIsPanning(true);
    startPanRef.current = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y };
  };

  const handleMouseMove = (e) => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      mousePosRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
    if (isPanning) {
      const nextPan = {
        x: e.clientX - startPanRef.current.x,
        y: e.clientY - startPanRef.current.y
      };
      panRef.current = nextPan;
      setPan(nextPan);
    }
    if (connectingSource) {
      const coords = getSvgCoords(e);
      setConnectingCurrentPos(coords);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Callback ref to reliably attach non-passive wheel & gesture listeners as soon as DOM node mounts
  const canvasCallbackRef = useCallback((node) => {
    if (cleanupWheelRef.current) {
      cleanupWheelRef.current();
      cleanupWheelRef.current = null;
    }
    if (!node) {
      canvasRef.current = null;
      return;
    }
    canvasRef.current = node;

    const onWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();

      const rect = node.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;
      mousePosRef.current = { x: cursorX, y: cursorY };

      if (e.ctrlKey || e.metaKey) {
        // Trackpad Pinch-to-Zoom motion (or Ctrl/Cmd + Wheel)
        // Delta is negative when pinching out (zooming in), positive when pinching in (zooming out)
        const zoomDelta = -e.deltaY * 0.01;
        const zoomMultiplier = Math.exp(zoomDelta);

        const currentZoom = zoomRef.current;
        const currentPan = panRef.current;

        const nextZoom = Math.min(Math.max(currentZoom * zoomMultiplier, 0.2), 3.5);
        if (nextZoom === currentZoom) return;

        const ratio = nextZoom / currentZoom;
        // Fix the exact point under cursor during zoom
        const nextPan = {
          x: cursorX - (cursorX - currentPan.x) * ratio,
          y: cursorY - (cursorY - currentPan.y) * ratio
        };

        zoomRef.current = nextZoom;
        panRef.current = nextPan;
        setZoom(nextZoom);
        setPan(nextPan);
      } else {
        // Normal 2-finger scroll / mouse wheel: Scroll (pan) the map canvas
        const currentPan = panRef.current;
        const nextPan = {
          x: currentPan.x - e.deltaX,
          y: currentPan.y - e.deltaY
        };
        panRef.current = nextPan;
        setPan(nextPan);
      }
    };

    // Native Safari trackpad pinch gesture listeners
    let gestureStartZoom = 1;
    let gestureStartPan = { x: 0, y: 0 };
    let gestureOrigin = { x: 0, y: 0 };

    const onGestureStart = (e) => {
      e.preventDefault();
      e.stopPropagation();
      gestureStartZoom = zoomRef.current;
      gestureStartPan = { ...panRef.current };
      const rect = node.getBoundingClientRect();
      gestureOrigin = {
        x: (e.clientX || (mousePosRef.current.x + rect.left)) - rect.left,
        y: (e.clientY || (mousePosRef.current.y + rect.top)) - rect.top
      };
    };

    const onGestureChange = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const nextZoom = Math.min(Math.max(gestureStartZoom * e.scale, 0.2), 3.5);
      const ratio = nextZoom / (gestureStartZoom || 1);

      const nextPan = {
        x: gestureOrigin.x - (gestureOrigin.x - gestureStartPan.x) * ratio,
        y: gestureOrigin.y - (gestureOrigin.y - gestureStartPan.y) * ratio
      };

      zoomRef.current = nextZoom;
      panRef.current = nextPan;
      setZoom(nextZoom);
      setPan(nextPan);
    };

    const onGestureEnd = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    node.addEventListener('wheel', onWheel, { passive: false });
    node.addEventListener('gesturestart', onGestureStart, { passive: false });
    node.addEventListener('gesturechange', onGestureChange, { passive: false });
    node.addEventListener('gestureend', onGestureEnd, { passive: false });

    cleanupWheelRef.current = () => {
      node.removeEventListener('wheel', onWheel);
      node.removeEventListener('gesturestart', onGestureStart);
      node.removeEventListener('gesturechange', onGestureChange);
      node.removeEventListener('gestureend', onGestureEnd);
    };
  }, []);

  // Initial Auto-center on layout or map switch
  useEffect(() => {
    const timer = setTimeout(() => {
      handleFitToView();
    }, 100);
    return () => clearTimeout(timer);
  }, [activeTreeId, mapLayout, handleFitToView]);

  // Import Action Handlers
  const handleProcessImportContent = (content, format) => {
    try {
      setImportError('');
      let parsedRoot = null;

      if (format === 'json') {
        const data = JSON.parse(content);
        parsedRoot = data.root || data;
      } else if (format === 'opml') {
        parsedRoot = parseOpmlToTree(content);
      } else {
        // Markdown or plain text outline
        parsedRoot = parseMarkdownToTree(content);
      }

      if (!parsedRoot || !parsedRoot.title) {
        throw new Error('Could not parse valid tree structure from provided content');
      }

      const newTreeWorkspace = {
        id: 'tree_' + Date.now().toString(36),
        title: parsedRoot.title || 'Imported Tree Notes',
        updatedAt: new Date().toISOString(),
        root: parsedRoot
      };

      setTreeList(prev => [newTreeWorkspace, ...prev]);
      setActiveTreeId(newTreeWorkspace.id);
      localStorage.setItem(ACTIVE_TREE_KEY, newTreeWorkspace.id);
      setSelectedNodeId(parsedRoot.id);
      setIsImportModalOpen(false);
      setImportPasteText('');
    } catch (err) {
      setImportError('Import failed: ' + (err.message || 'Invalid format'));
    }
  };

  const handleFileUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    const extension = file.name.split('.').pop().toLowerCase();

    reader.onload = (e) => {
      const text = e.target.result;
      let format = 'markdown';
      if (extension === 'json') format = 'json';
      else if (extension === 'opml') format = 'opml';
      handleProcessImportContent(text, format);
    };
    reader.readAsText(file);
  };

  // Export Action Handlers
  const getExportTextContent = () => {
    if (exportFormat === 'json') return exportToJson(currentTree);
    if (exportFormat === 'opml') return exportToOpml(rootData, currentTree.title);
    if (exportFormat === 'text') return exportToPlainText(rootData);
    return exportToMarkdown(rootData);
  };

  const handleDownloadExport = () => {
    const safeTitle = currentTree.title.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    if (exportFormat === 'json') {
      downloadFile(exportToJson(currentTree), `${safeTitle}.json`, 'application/json');
    } else if (exportFormat === 'markdown') {
      downloadFile(exportToMarkdown(rootData), `${safeTitle}.md`, 'text/markdown');
    } else if (exportFormat === 'opml') {
      downloadFile(exportToOpml(rootData, currentTree.title), `${safeTitle}.opml`, 'text/xml');
    } else if (exportFormat === 'text') {
      downloadFile(exportToPlainText(rootData), `${safeTitle}.txt`, 'text/plain');
    } else if (exportFormat === 'svg') {
      if (!svgRef.current) return;
      const svgData = new XMLSerializer().serializeToString(svgRef.current);
      downloadFile(svgData, `${safeTitle}_mindmap.svg`, 'image/svg+xml');
    } else if (exportFormat === 'png') {
      // Export SVG as high resolution PNG
      if (!svgRef.current) return;
      const svgData = new XMLSerializer().serializeToString(svgRef.current);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const URLObj = window.URL || window.webkitURL || window;
      const blobURL = URLObj.createObjectURL(svgBlob);
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = (computedLayout.bounds.width + 200) * 2;
        canvas.height = (computedLayout.bounds.height + 200) * 2;
        const ctx = canvas.getContext('2d');
        ctx.scale(2, 2);
        ctx.fillStyle = '#060812';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 50, 50);
        const pngUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `${safeTitle}_tree_diagram.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URLObj.revokeObjectURL(blobURL);
      };
      image.src = blobURL;
    }
  };

  const handleCopyExportText = () => {
    const text = getExportTextContent();
    navigator.clipboard.writeText(text);
    setExportCopied(true);
    setTimeout(() => setExportCopied(false), 2000);
  };

  // Add tag to active node
  const handleAddTag = (tagText) => {
    if (!tagText.trim() || !activeNode) return;
    const cleanTag = tagText.trim().toLowerCase().replace(/^#/, '');
    const currentTags = activeNode.tags || [];
    if (!currentTags.includes(cleanTag)) {
      handleUpdateActiveNode({ tags: [...currentTags, cleanTag] });
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    if (!activeNode || !activeNode.tags) return;
    handleUpdateActiveNode({ tags: activeNode.tags.filter(t => t !== tagToRemove) });
  };

  // Create new blank tree
  const handleCreateNewTree = (title = 'New Tree Notes') => {
    const newRoot = {
      id: generateId(),
      title: title || 'Central Topic',
      content: 'Start organizing your thoughts into branches and sub-branches.',
      color: 'cyan',
      completed: false,
      tags: ['main'],
      isExpanded: true,
      children: [
        {
          id: generateId(),
          title: 'First Branch',
          content: 'Add details, notes, or more sub-branches here.',
          color: 'emerald',
          completed: false,
          tags: [],
          isExpanded: true,
          children: []
        }
      ]
    };

    const newWorkspace = {
      id: 'tree_' + Date.now().toString(36),
      title: title || 'New Tree Notes',
      updatedAt: new Date().toISOString(),
      root: newRoot
    };

    setTreeList(prev => [newWorkspace, ...prev]);
    setActiveTreeId(newWorkspace.id);
    localStorage.setItem(ACTIVE_TREE_KEY, newWorkspace.id);
    setSelectedNodeId(newRoot.id);
    setIsNewMapModalOpen(false);
  };

  // Delete current tree map
  const handleDeleteCurrentTree = () => {
    if (treeList.length <= 1) {
      alert('You must keep at least one tree map in your workspace.');
      return;
    }
    const remaining = treeList.filter(t => t.id !== activeTreeId);
    setTreeList(remaining);
    setActiveTreeId(remaining[0].id);
    localStorage.setItem(ACTIVE_TREE_KEY, remaining[0].id);
  };

  // Render Tree Outline Row recursively for full outline mode
  const renderOutlineNode = (node, depth = 0) => {
    const isSelected = activeNode && activeNode.id === node.id;
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = node.isExpanded !== false;

    return (
      <div key={node.id} style={{ marginLeft: `${depth * 1.5}rem` }}>
        <div
          className={`tree-outline-node-row ${isSelected ? 'is-active' : ''}`}
          onClick={() => setSelectedNodeId(node.id)}
        >
          {hasChildren ? (
            <button
              className="tree-node-expand-btn"
              onClick={(e) => handleToggleCollapse(node.id, e)}
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <span style={{ width: 20, display: 'inline-block' }} />
          )}

          <div
            className={`tree-node-checkbox ${node.completed ? 'checked' : ''}`}
            onClick={(e) => handleToggleCompleted(node.id, e)}
          >
            {node.completed && <Check size={11} strokeWidth={3} />}
          </div>

          <span className={`tree-outline-node-title ${node.completed ? 'completed' : ''}`}>
            {node.title}
          </span>

          {node.tags && node.tags.length > 0 && (
            <div className="tree-node-meta-left">
              {node.tags.slice(0, 2).map(tag => (
                <span key={tag} className="tree-branch-badge">#{tag}</span>
              ))}
            </div>
          )}

          <div className="tree-subbranch-actions">
            <button
              className="tree-subbranch-btn"
              title="Add Child Branch"
              onClick={(e) => { e.stopPropagation(); handleAddChild(node.id); }}
            >
              <Plus size={13} />
            </button>
            {node.id !== rootData.id && (
              <button
                className="tree-subbranch-btn"
                title="Delete Branch"
                onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.id); }}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="tree-outline-children">
            {node.children.map(child => renderOutlineNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="tree-notes-page">
      {/* Top Navbar */}
      <nav className="tree-header glass">
        <div className="tree-header-left">
          <Link to="/" className="icon-btn back-btn" title="Back to Dashboard">
            <ArrowLeft size={18} />
          </Link>
          <div className="tree-title-group">
            <h1>
              <GitBranch size={26} className="logo-icon" />
              <span>Tree Notes & Mind Map</span>
              <span className="tree-badge">
                <span className="tree-badge-dot"></span>
                Visual Outliner
              </span>
            </h1>
            <p>Branching hierarchical notes, interactive mind map canvas & instant import/export</p>
          </div>
        </div>

        <div className="tree-header-actions">
          {/* Workspace Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <select
              className="tree-select-box"
              value={activeTreeId}
              onChange={(e) => handleSelectTree(e.target.value)}
              title="Switch Tree Notes Workspace"
            >
              {treeList.map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
            {treeList.length > 1 && (
              <button
                className="icon-btn"
                style={{ width: '2.1rem', height: '2.1rem' }}
                title="Delete Current Workspace"
                onClick={handleDeleteCurrentTree}
              >
                <Trash2 size={14} style={{ color: '#ff5252' }} />
              </button>
            )}
          </div>

          <button
            className="tree-btn"
            title="New Map / Tree"
            onClick={() => setIsNewMapModalOpen(true)}
          >
            <Plus size={15} />
            <span>New Tree</span>
          </button>

          <button
            className="tree-btn"
            title="Import Notes (JSON, Markdown, OPML)"
            onClick={() => setIsImportModalOpen(true)}
          >
            <Upload size={15} />
            <span>Import</span>
          </button>

          <button
            className="tree-btn tree-btn-primary"
            title="Export Tree (JSON, Markdown, PNG, SVG, OPML)"
            onClick={() => setIsExportModalOpen(true)}
          >
            <Download size={15} />
            <span>Export</span>
          </button>

          <button
            className="icon-btn"
            title="Keyboard Shortcuts & Guide"
            onClick={() => setIsShortcutsModalOpen(true)}
          >
            <HelpCircle size={18} />
          </button>
        </div>
      </nav>

      {/* Secondary Toolbar */}
      <div className="tree-toolbar glass">
        <div className="tree-toolbar-group">
          {/* View Mode Dropdown */}
          <div className="tree-dropdown-wrapper" ref={viewDropdownRef}>
            <button
              type="button"
              className={`tree-dropdown-trigger ${isViewDropdownOpen ? 'active' : ''}`}
              onClick={() => {
                setIsViewDropdownOpen(prev => !prev);
                setIsLayoutDropdownOpen(false);
              }}
              title="Change View Mode"
            >
              {viewMode === 'split' && <Layers size={14} className="tree-dropdown-icon" />}
              {viewMode === 'map-full' && <Network size={14} className="tree-dropdown-icon" />}
              {viewMode === 'outline-full' && <ListTree size={14} className="tree-dropdown-icon" />}
              <span>{VIEW_MODE_OPTIONS.find(o => o.id === viewMode)?.label || 'View Mode'}</span>
              <ChevronDown size={14} className={`tree-dropdown-chevron ${isViewDropdownOpen ? 'rotated' : ''}`} />
            </button>

            {isViewDropdownOpen && (
              <div className="tree-dropdown-menu glass">
                {VIEW_MODE_OPTIONS.map(opt => {
                  const IconComp = opt.icon;
                  const isActive = viewMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      className={`tree-dropdown-item ${isActive ? 'is-active' : ''}`}
                      onClick={() => {
                        setViewMode(opt.id);
                        setIsViewDropdownOpen(false);
                      }}
                    >
                      <IconComp size={14} className="tree-dropdown-item-icon" />
                      <span className="tree-dropdown-item-label">{opt.label}</span>
                      {isActive && <Check size={13} className="tree-dropdown-item-check" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Map Layout Style Dropdown */}
          {viewMode !== 'outline-full' && (
            <div className="tree-dropdown-wrapper" ref={layoutDropdownRef}>
              <button
                type="button"
                className={`tree-dropdown-trigger ${isLayoutDropdownOpen ? 'active' : ''}`}
                onClick={() => {
                  setIsLayoutDropdownOpen(prev => !prev);
                  setIsViewDropdownOpen(false);
                }}
                title="Change Layout & Format Diagram"
              >
                {mapLayout === 'vertical' && <FolderTree size={14} className="tree-dropdown-icon" />}
                {mapLayout === 'horizontal' && <GitBranch size={14} className="tree-dropdown-icon" />}
                {mapLayout === 'radial' && <Compass size={14} className="tree-dropdown-icon" />}
                <span>{MAP_LAYOUT_OPTIONS.find(o => o.id === mapLayout)?.label || 'Layout'}</span>
                <ChevronDown size={14} className={`tree-dropdown-chevron ${isLayoutDropdownOpen ? 'rotated' : ''}`} />
              </button>

              {isLayoutDropdownOpen && (
                <div className="tree-dropdown-menu glass">
                  {MAP_LAYOUT_OPTIONS.map(opt => {
                    const IconComp = opt.icon;
                    const isActive = mapLayout === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        className={`tree-dropdown-item ${isActive ? 'is-active' : ''}`}
                        onClick={() => {
                          handleSelectLayout(opt.id);
                          setIsLayoutDropdownOpen(false);
                        }}
                      >
                        <IconComp size={14} className="tree-dropdown-item-icon" />
                        <span className="tree-dropdown-item-label">{opt.label}</span>
                        {isActive && <Check size={13} className="tree-dropdown-item-check" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Quick Action Buttons */}
          <button
            className="tree-btn tree-btn-primary"
            onClick={handleAddIndividualNode}
            title="Add Individual Node (Free-form)"
          >
            <Plus size={14} />
            <span>Add Node</span>
          </button>

          <button
            className="tree-btn tree-btn-success"
            onClick={() => handleAddChild(activeNode ? activeNode.id : null)}
            title="Add Child Branch (Tab)"
          >
            <Plus size={14} />
            <span>Add Branch</span>
          </button>

          <button
            className="tree-btn"
            onClick={() => handleAddSibling(activeNode ? activeNode.id : null)}
            title="Add Sibling Node (Enter)"
          >
            <CornerDownRight size={14} />
            <span>Add Sibling</span>
          </button>

          <button
            className="tree-btn"
            onClick={handleResetPositions}
            title="Format diagram into strict Level Order (Reset custom drag positions)"
          >
            <RotateCcw size={14} />
            <span>Level Order</span>
          </button>

          <button
            className="tree-btn"
            onClick={() => saveTreeData(setAllNodesExpanded(rootData, true))}
            title="Expand All Branches"
          >
            <ChevronDown size={14} />
            <span>Expand All</span>
          </button>

          <button
            className="tree-btn"
            onClick={() => saveTreeData(setAllNodesExpanded(rootData, false))}
            title="Collapse Sub-branches"
          >
            <ChevronRight size={14} />
            <span>Collapse</span>
          </button>
        </div>

        <div className="tree-toolbar-group">
          {/* Real-time Branch Search */}
          <div className="tree-search-wrapper">
            <Search size={14} className="tree-search-icon" />
            <input
              type="text"
              placeholder="Search branches..."
              className="tree-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <span className="tree-search-badge">{matchedNodeIds.size}</span>
            )}
          </div>

          {/* Tree Statistics Bar */}
          <div className="tree-stats-badge">
            <span className="tree-stats-item">
              <span>Nodes:</span>
              <strong>{treeStats.totalNodes}</strong>
            </span>
            <span className="tree-stats-item">
              <span>Depth:</span>
              <strong>{treeStats.maxDepth}</strong>
            </span>
            <span className="tree-stats-item">
              <span>Done:</span>
              <strong>{treeStats.percentComplete}%</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Focus Mode Banner */}
      {focusedBranchId && (
        <div className="tree-focus-banner">
          <span>Focused on branch: <strong>{effectiveRoot.title}</strong></span>
          <button onClick={() => setFocusedBranchId(null)}>
            Exit Focus Mode (Show Entire Tree)
          </button>
        </div>
      )}

      {/* Breadcrumb Path Bar */}
      <div className="tree-breadcrumb-bar glass">
        <span style={{ opacity: 0.6, fontSize: '0.74rem' }}>Path:</span>
        {breadcrumbPath.map((item, index) => (
          <React.Fragment key={item.id}>
            <span
              className={`tree-breadcrumb-item ${item.id === activeNode.id ? 'active' : ''}`}
              onClick={() => setSelectedNodeId(item.id)}
            >
              {item.title}
            </span>
            {index < breadcrumbPath.length - 1 && (
              <span className="tree-breadcrumb-separator">/</span>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Main Workspace Layout */}
      <div className={`tree-workspace-layout layout-${viewMode}`}>
        {/* Left / Top Canvas: Interactive Visual Map */}
        {viewMode !== 'outline-full' && (
          <div className="tree-map-card">
            <div
              className={`tree-map-canvas-container ${isPanning ? 'is-panning' : ''} ${connectingSource ? 'is-connecting-mode' : ''}`}
              ref={canvasCallbackRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              <svg
                ref={svgRef}
                className="tree-svg-viewport"
              >
                <defs>
                  {/* Subtle Glow Filters */}
                  <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#00d2ff" floodOpacity="0.5" />
                  </filter>
                  <filter id="glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#00fa9a" floodOpacity="0.5" />
                  </filter>

                  {/* Draw.io Style Connector Arrow Markers for All Colors */}
                  <marker id="arrow-default" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#ff2a85" />
                  </marker>
                  <marker id="arrow-cyan" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#00d2ff" />
                  </marker>
                  <marker id="arrow-emerald" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#00fa9a" />
                  </marker>
                  <marker id="arrow-purple" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#b388ff" />
                  </marker>
                  <marker id="arrow-amber" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#ffb300" />
                  </marker>
                  <marker id="arrow-rose" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#ff5252" />
                  </marker>
                  <marker id="arrow-sapphire" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#448aff" />
                  </marker>
                  <marker id="arrow-pink" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#ff2a85" />
                  </marker>
                </defs>

                {/* Transform group for infinite canvas panning and zooming without clipping */}
                <g
                  className="tree-canvas-transform-group"
                  transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
                >
                  {/* Render Tree Hierarchy Curved Connection Lines with Arrows */}
                  <g className="tree-connections-layer">
                    {computedLayout.connections.map(conn => {
                      const isParentSelected = activeNode && (activeNode.id === conn.parentId || activeNode.id === conn.childId);
                      const midX = conn.midX !== undefined ? conn.midX : (conn.x1 + conn.x2) / 2;
                      const midY = conn.midY !== undefined ? conn.midY : (conn.y1 + conn.y2) / 2;
                      const colorKey = conn.parentColor || 'cyan';

                      return (
                        <g key={conn.id} className="tree-connector-group">
                          <path
                            d={conn.path}
                            className={`tree-connector-path color-${colorKey} ${isParentSelected ? 'highlighted' : ''}`}
                            markerEnd={`url(#arrow-${colorKey})`}
                          />
                          {/* Wide invisible hit area for easy hover on thin curves */}
                          <path
                            d={conn.path}
                            className="tree-connector-hit-area"
                          />
                          {/* Cross delete badge shown on hover directly on the chain curve - disconnects without deleting child node */}
                          <g
                            className="tree-conn-delete-group"
                            transform={`translate(${midX}, ${midY})`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDisconnectHierarchy(conn.parentId, conn.childId);
                            }}
                          >
                            <title>Disconnect chain (keep node)</title>
                            <circle r="10" />
                            <line x1="-3.5" y1="-3.5" x2="3.5" y2="3.5" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
                            <line x1="3.5" y1="-3.5" x2="-3.5" y2="3.5" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
                          </g>
                        </g>
                      );
                    })}
                  </g>

                  {/* Render Draw.io Custom Port-to-Port Connections with Arrows */}
                  <g className="tree-custom-connections-layer">
                    {(currentTree.customConnections || []).map(conn => {
                      const fromNode = computedLayout.nodes.find(n => n.id === conn.fromId);
                      const toNode = computedLayout.nodes.find(n => n.id === conn.toId);
                      if (!fromNode || !toNode) return null;

                      const p1 = getPortPosition(fromNode, conn.fromPort || 'bottom');
                      const p2 = getPortPosition(toNode, conn.toPort || 'top');
                      const connData = computeConnectionPath(p1, p2, conn.fromPort || 'bottom', conn.toPort || 'top');
                      const isSelected = selectedConnId === conn.id;
                      const midX = connData.midX;
                      const midY = connData.midY;
                      const colorKey = conn.color || 'cyan';

                      return (
                        <g key={conn.id} className="tree-connector-group">
                          <path
                            d={connData.path}
                            className={`tree-custom-connector ${isSelected ? 'is-selected' : ''}`}
                            markerEnd={`url(#arrow-${colorKey})`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedConnId(conn.id);
                            }}
                          />
                          {/* Wide invisible hit area for easy hover on thin curves */}
                          <path
                            d={connData.path}
                            className="tree-connector-hit-area"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedConnId(conn.id);
                            }}
                          />
                          {/* Cross delete badge shown on hover directly on the chain curve */}
                          <g
                            className={`tree-conn-delete-group ${isSelected ? 'is-visible' : ''}`}
                            transform={`translate(${midX}, ${midY})`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCustomConnection(conn.id);
                            }}
                          >
                            <title>Delete custom connection</title>
                            <circle r="10" />
                            <line x1="-3.5" y1="-3.5" x2="3.5" y2="3.5" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
                            <line x1="3.5" y1="-3.5" x2="-3.5" y2="3.5" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
                          </g>
                        </g>
                      );
                    })}
                  </g>

                  {/* Render Live Rubberband Draft Connector when dragging from a port */}
                  {connectingSource && (
                    <path
                      d={computeDraftPath(
                        { x: connectingSource.startX, y: connectingSource.startY },
                        connectingCurrentPos,
                        connectingSource.port
                      )}
                      className="tree-connector-draft"
                      markerEnd="url(#arrow-emerald)"
                    />
                  )}

                  {/* Render Nodes as SVG ForeignObjects with 4 Connection Ports */}
                  <g className="tree-nodes-layer">
                    {computedLayout.nodes.map(node => {
                      const isSelected = activeNode && activeNode.id === node.id;
                      const isMatched = matchedNodeIds.has(node.id);
                      const isDragging = draggedNodeId === node.id;
                      const hasNote = Boolean(node.content && node.content.trim());
                      const isExpanded = node.isExpanded !== false;

                      return (
                        <foreignObject
                          key={node.id}
                          x={node.x}
                          y={node.y}
                          width={node.width}
                          height={node.height}
                          style={{ overflow: 'visible' }}
                        >
                          <div
                            className={`tree-node-card color-${node.color || 'default'} ${isSelected ? 'is-selected' : ''} ${isMatched ? 'is-matched-search' : ''} ${isDragging ? 'is-dragging' : ''}`}
                            onMouseDown={(e) => handleNodeDragStart(node.id, e)}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (connectingSourceRef.current && connectingSourceRef.current.nodeId !== node.id) {
                                handlePortEnd(node.id, 'left', e);
                              } else {
                                setSelectedNodeId(node.id);
                              }
                            }}
                            onMouseUp={(e) => {
                              if (connectingSourceRef.current && connectingSourceRef.current.nodeId !== node.id) {
                                handlePortEnd(node.id, 'left', e);
                              }
                            }}
                          >
                            {/* Draw.io 4 Connection Anchor Points (Top, Right, Bottom, Left) */}
                            {['top', 'right', 'bottom', 'left'].map(portName => (
                              <div
                                key={portName}
                                className={`tree-node-port port-${portName} ${connectingSource?.nodeId === node.id && connectingSource?.port === portName ? 'is-active' : ''}`}
                                title={`Connect from ${portName} (Click or Drag to connect)`}
                                onMouseDown={(e) => handlePortStart(node.id, portName, e)}
                                onMouseUp={(e) => handlePortEnd(node.id, portName, e)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!connectingSourceRef.current) {
                                    handlePortStart(node.id, portName, e);
                                  } else {
                                    handlePortEnd(node.id, portName, e);
                                  }
                                }}
                              />
                            ))}

                            {/* Floating Hover Action Menu */}
                            <div className="tree-node-hover-actions" onClick={(e) => e.stopPropagation()}>
                              <button
                                className="tree-node-action-btn btn-add"
                                title="Add Branch (Child)"
                                onClick={() => handleAddChild(node.id)}
                              >
                                <Plus size={12} />
                              </button>
                              <button
                                className="tree-node-action-btn"
                                title="Add Sibling"
                                onClick={() => handleAddSibling(node.id)}
                              >
                                <CornerDownRight size={12} />
                              </button>
                              <button
                                className="tree-node-action-btn"
                                title="Focus this Branch"
                                onClick={() => setFocusedBranchId(node.id)}
                              >
                                <Compass size={12} />
                              </button>
                              {node.id !== rootData.id && (
                                <button
                                  className="tree-node-action-btn btn-delete"
                                  title="Delete Node"
                                  onClick={() => handleDeleteNode(node.id)}
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>

                            {/* Node Header */}
                            <div className="tree-node-header">
                              <div
                                className={`tree-node-checkbox ${node.completed ? 'checked' : ''}`}
                                onClick={(e) => handleToggleCompleted(node.id, e)}
                                title="Toggle completed"
                              >
                                {node.completed && <Check size={11} strokeWidth={3} />}
                              </div>

                              <span className={`tree-node-title ${node.completed ? 'completed' : ''}`}>
                                {node.title}
                              </span>

                              {node.hasChildren && (
                                <button
                                  className="tree-node-expand-btn"
                                  onClick={(e) => handleToggleCollapse(node.id, e)}
                                  title={isExpanded ? 'Collapse branch' : 'Expand branch'}
                                >
                                  {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                                </button>
                              )}
                            </div>

                            {/* Node Footer */}
                            <div className="tree-node-footer">
                              <div className="tree-node-meta-left">
                                {node.hasChildren && (
                                  <span className="tree-branch-badge">
                                    +{node.childCount}
                                  </span>
                                )}
                                {hasNote && (
                                  <span className="tree-note-indicator" title="Has notes">
                                    <FileText size={11} />
                                  </span>
                                )}
                              </div>

                              {node.tags && node.tags.length > 0 && (
                                <span className="tree-branch-badge">
                                  #{node.tags[0]}
                                </span>
                              )}
                            </div>
                          </div>
                        </foreignObject>
                      );
                    })}
                  </g>
                </g>
              </svg>

              {/* Floating Canvas Controls */}
              <div className="tree-canvas-controls">
                <button
                  className="tree-canvas-btn"
                  onClick={() => handleZoomButton(1.2)}
                  title="Zoom In"
                >
                  <ZoomIn size={15} />
                </button>
                <span className="tree-canvas-zoom-label">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  className="tree-canvas-btn"
                  onClick={() => handleZoomButton(0.8)}
                  title="Zoom Out"
                >
                  <ZoomOut size={15} />
                </button>
                <button
                  className="tree-canvas-btn"
                  onClick={handleFitToView}
                  title="Fit to Screen"
                >
                  <Maximize2 size={15} />
                </button>
                <button
                  className="tree-canvas-btn"
                  onClick={handleResetView}
                  title="Reset Canvas View"
                >
                  <RotateCcw size={15} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Right / Bottom Panel: Note Editor & Subtree Details */}
        {viewMode !== 'map-full' && (
          <div className="tree-editor-panel">
            <div className="tree-editor-tabs">
              <span className="tree-editor-tab-title">
                <Edit3 size={16} />
                <span>Node Inspector & Notes</span>
              </span>

              <div className="tree-toolbar-group">
                <button
                  className={`tree-btn-group-item ${!editorPreviewMode ? 'active' : ''}`}
                  onClick={() => setEditorPreviewMode(false)}
                >
                  <Edit3 size={13} />
                  <span>Editor</span>
                </button>
                <button
                  className={`tree-btn-group-item ${editorPreviewMode ? 'active' : ''}`}
                  onClick={() => setEditorPreviewMode(true)}
                >
                  <Eye size={13} />
                  <span>Preview</span>
                </button>
              </div>
            </div>

            {viewMode === 'outline-full' ? (
              /* Full Hierarchical Outline View */
              <div className="tree-outline-full-view">
                {renderOutlineNode(effectiveRoot)}
                {!focusedBranchId && currentTree.floatingNodes && currentTree.floatingNodes.length > 0 && (
                  <div className="tree-outline-floating-section" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#00d2ff', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span>Independent Nodes ({currentTree.floatingNodes.length})</span>
                    </div>
                    {currentTree.floatingNodes.map(fNode => renderOutlineNode(fNode, 0))}
                  </div>
                )}
              </div>
            ) : (
              /* Split-View Detailed Editor */
              <div className="tree-editor-body">
                {/* Node Title & Color */}
                <div className="tree-detail-section">
                  <input
                    type="text"
                    className="tree-input-title"
                    value={activeNode ? activeNode.title : ''}
                    placeholder="Branch Title..."
                    onChange={(e) => handleUpdateActiveNode({ title: e.target.value })}
                  />

                  {/* Color Tag Swatches */}
                  <div className="tree-color-picker-row">
                    <span className="tree-color-picker-label">Accent Color:</span>
                    {NODE_COLORS.map(c => (
                      <button
                        key={c.id}
                        className={`tree-color-swatch ${activeNode && (activeNode.color === c.id || (!activeNode.color && c.id === 'default')) ? 'active' : ''}`}
                        style={{ background: c.hex }}
                        onClick={() => handleUpdateActiveNode({ color: c.id })}
                        title={c.name}
                      />
                    ))}
                  </div>

                  {/* Tag Manager */}
                  <div className="tree-tags-row">
                    <Tag size={13} style={{ opacity: 0.7 }} />
                    {(activeNode.tags || []).map(tag => (
                      <span key={tag} className="tree-tag-chip">
                        #{tag}
                        <span
                          className="tree-tag-remove"
                          onClick={() => handleRemoveTag(tag)}
                        >
                          <X size={11} />
                        </span>
                      </span>
                    ))}
                    <input
                      type="text"
                      placeholder="+ tag"
                      className="tree-tag-input"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddTag(e.target.value);
                          e.target.value = '';
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Markdown Note Content */}
                <div className="tree-markdown-editor-wrapper">
                  <div className="tree-editor-toolbar">
                    <span>Notes (Markdown supported)</span>
                    <span>{((activeNode.content || '').split(/\s+/).filter(Boolean).length)} words</span>
                  </div>

                  {!editorPreviewMode ? (
                    <textarea
                      className="tree-markdown-textarea"
                      placeholder="Write notes, code snippets, architecture thoughts, or lists here..."
                      value={activeNode ? (activeNode.content || '') : ''}
                      onChange={(e) => handleUpdateActiveNode({ content: e.target.value })}
                    />
                  ) : (
                    <div className="tree-markdown-preview">
                      {activeNode && activeNode.content ? (
                        activeNode.content.split('\n').map((line, idx) => {
                          if (line.startsWith('# ')) return <h1 key={idx}>{line.substring(2)}</h1>;
                          if (line.startsWith('## ')) return <h2 key={idx}>{line.substring(3)}</h2>;
                          if (line.startsWith('### ')) return <h3 key={idx}>{line.substring(4)}</h3>;
                          if (line.startsWith('- ')) return <li key={idx}>{line.substring(2)}</li>;
                          return <p key={idx}>{line}</p>;
                        })
                      ) : (
                        <p style={{ opacity: 0.5, fontStyle: 'italic' }}>No notes written for this branch yet.</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Sub-branches List & Quick Ordering */}
                <div className="tree-subbranches-section">
                  <div className="tree-subbranches-header">
                    <span>Sub-branches ({activeNode.children ? activeNode.children.length : 0})</span>
                    <button
                      className="tree-btn tree-btn-success"
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                      onClick={() => handleAddChild(activeNode.id)}
                    >
                      <Plus size={12} />
                      <span>New Branch</span>
                    </button>
                  </div>

                  <div className="tree-subbranches-list">
                    {activeNode.children && activeNode.children.length > 0 ? (
                      activeNode.children.map((child, index) => (
                        <div
                          key={child.id}
                          className="tree-subbranch-item"
                          onClick={() => setSelectedNodeId(child.id)}
                        >
                          <div className="tree-subbranch-left">
                            <div
                              className={`tree-node-checkbox ${child.completed ? 'checked' : ''}`}
                              onClick={(e) => handleToggleCompleted(child.id, e)}
                            >
                              {child.completed && <Check size={11} strokeWidth={3} />}
                            </div>
                            <span className="tree-subbranch-title">{child.title}</span>
                          </div>

                          <div className="tree-subbranch-actions">
                            <button
                              className="tree-subbranch-btn"
                              title="Move Up"
                              disabled={index === 0}
                              onClick={(e) => { e.stopPropagation(); handleMoveNode(child.id, 'up'); }}
                            >
                              <ArrowUp size={12} />
                            </button>
                            <button
                              className="tree-subbranch-btn"
                              title="Move Down"
                              disabled={index === activeNode.children.length - 1}
                              onClick={(e) => { e.stopPropagation(); handleMoveNode(child.id, 'down'); }}
                            >
                              <ArrowDown size={12} />
                            </button>
                            <button
                              className="tree-subbranch-btn"
                              title="Duplicate"
                              onClick={(e) => { e.stopPropagation(); handleDuplicateNode(child.id); }}
                            >
                              <Copy size={12} />
                            </button>
                            <button
                              className="tree-subbranch-btn"
                              title="Delete Branch"
                              onClick={(e) => { e.stopPropagation(); handleDeleteNode(child.id); }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', padding: '0.4rem 0' }}>
                        No child branches. Click "+ New Branch" or press Tab to create one.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ==========================================================================
          Modals: Import, Export, Shortcuts, New Tree
          ========================================================================== */}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="tree-modal-backdrop" onClick={() => setIsImportModalOpen(false)}>
          <div className="tree-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="tree-modal-header">
              <h2>
                <Upload size={20} />
                <span>Import Tree Notes</span>
              </h2>
              <button className="icon-btn" onClick={() => setIsImportModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="tree-modal-body">
              <div className="tree-btn-group">
                <button
                  className={`tree-btn-group-item ${importTab === 'file' ? 'active' : ''}`}
                  onClick={() => setImportTab('file')}
                >
                  <FileText size={14} />
                  <span>File Dropzone</span>
                </button>
                <button
                  className={`tree-btn-group-item ${importTab === 'paste' ? 'active' : ''}`}
                  onClick={() => setImportTab('paste')}
                >
                  <FileCode size={14} />
                  <span>Paste Text</span>
                </button>
                <button
                  className={`tree-btn-group-item ${importTab === 'preset' ? 'active' : ''}`}
                  onClick={() => setImportTab('preset')}
                >
                  <LayoutGrid size={14} />
                  <span>Presets Library</span>
                </button>
              </div>

              {importError && (
                <div style={{ color: '#ff5252', fontSize: '0.82rem', background: 'rgba(255,82,82,0.1)', padding: '0.5rem 0.8rem', borderRadius: '0.5rem' }}>
                  {importError}
                </div>
              )}

              {importTab === 'file' && (
                <div
                  className={`tree-dropzone ${isDragOver ? 'is-dragover' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileUpload(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.json,.md,.markdown,.txt,.opml';
                    input.onchange = (e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    };
                    input.click();
                  }}
                >
                  <Upload size={36} className="tree-dropzone-icon" />
                  <div className="tree-dropzone-text">
                    <h4>Click or drag files here to import</h4>
                    <p>Supports JSON (.json), Markdown (.md), OPML (.opml), and Indented Outlines (.txt)</p>
                  </div>
                </div>
              )}

              {importTab === 'paste' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Format:</span>
                    <select
                      className="tree-select-box"
                      value={importPasteFormat}
                      onChange={(e) => setImportPasteFormat(e.target.value)}
                      style={{ minWidth: 120, padding: '0.3rem 0.6rem' }}
                    >
                      <option value="markdown">Markdown (# or - list)</option>
                      <option value="json">JSON Tree Format</option>
                      <option value="opml">OPML XML Outline</option>
                    </select>
                  </div>
                  <textarea
                    className="tree-markdown-textarea"
                    style={{ minHeight: 180 }}
                    placeholder={
                      importPasteFormat === 'markdown'
                        ? "# Project Root\n## Architecture\n- [ ] Database\n- [x] API Gateway\n## Product Goals\n- Feature V1"
                        : "Paste JSON or OPML content here..."
                    }
                    value={importPasteText}
                    onChange={(e) => setImportPasteText(e.target.value)}
                  />
                  <button
                    className="tree-btn tree-btn-primary"
                    onClick={() => handleProcessImportContent(importPasteText, importPasteFormat)}
                    disabled={!importPasteText.trim()}
                  >
                    <span>Parse & Import Tree</span>
                  </button>
                </div>
              )}

              {importTab === 'preset' && (
                <div className="tree-template-grid">
                  {PRESET_TREES.map(preset => (
                    <div
                      key={preset.id}
                      className="tree-template-card"
                      onClick={() => {
                        const newPreset = JSON.parse(JSON.stringify(preset));
                        newPreset.id = 'tree_' + Date.now().toString(36);
                        newPreset.title = preset.title + ' (Imported)';
                        setTreeList(prev => [newPreset, ...prev]);
                        setActiveTreeId(newPreset.id);
                        setSelectedNodeId(newPreset.root.id);
                        setIsImportModalOpen(false);
                      }}
                    >
                      <h4>{preset.title}</h4>
                      <p>{preset.root.content || 'Rich branching tree template'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {isExportModalOpen && (
        <div className="tree-modal-backdrop" onClick={() => setIsExportModalOpen(false)}>
          <div className="tree-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="tree-modal-header">
              <h2>
                <Download size={20} />
                <span>Export Tree Notes</span>
              </h2>
              <button className="icon-btn" onClick={() => setIsExportModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="tree-modal-body">
              <div className="tree-export-grid">
                <div
                  className={`tree-export-card ${exportFormat === 'markdown' ? 'active' : ''}`}
                  onClick={() => setExportFormat('markdown')}
                >
                  <FileText size={20} style={{ color: '#00d2ff' }} />
                  <h4>Markdown (.md)</h4>
                  <p>Formatted headers, bullet points, and task checkboxes</p>
                </div>

                <div
                  className={`tree-export-card ${exportFormat === 'json' ? 'active' : ''}`}
                  onClick={() => setExportFormat('json')}
                >
                  <FileCode size={20} style={{ color: '#00fa9a' }} />
                  <h4>JSON (.json)</h4>
                  <p>Complete data structure with metadata & tags</p>
                </div>

                <div
                  className={`tree-export-card ${exportFormat === 'png' ? 'active' : ''}`}
                  onClick={() => setExportFormat('png')}
                >
                  <Share2 size={20} style={{ color: '#ffb300' }} />
                  <h4>PNG Image</h4>
                  <p>High-resolution rendered visual diagram</p>
                </div>

                <div
                  className={`tree-export-card ${exportFormat === 'svg' ? 'active' : ''}`}
                  onClick={() => setExportFormat('svg')}
                >
                  <Network size={20} style={{ color: '#ff5252' }} />
                  <h4>Vector SVG (.svg)</h4>
                  <p>Scalable vector graphic of mind map graph</p>
                </div>

                <div
                  className={`tree-export-card ${exportFormat === 'opml' ? 'active' : ''}`}
                  onClick={() => setExportFormat('opml')}
                >
                  <FolderTree size={20} style={{ color: '#b388ff' }} />
                  <h4>OPML (.opml)</h4>
                  <p>Standard outliner format for XMind, MindNode</p>
                </div>

                <div
                  className={`tree-export-card ${exportFormat === 'text' ? 'active' : ''}`}
                  onClick={() => setExportFormat('text')}
                >
                  <ListTree size={20} style={{ color: '#448aff' }} />
                  <h4>Plain Outline (.txt)</h4>
                  <p>Simple tab-indented text hierarchy</p>
                </div>
              </div>

              {['markdown', 'json', 'opml', 'text'].includes(exportFormat) && (
                <div className="tree-export-preview">
                  {getExportTextContent()}
                </div>
              )}
            </div>

            <div className="tree-modal-footer">
              {['markdown', 'json', 'opml', 'text'].includes(exportFormat) && (
                <button className="tree-btn" onClick={handleCopyExportText}>
                  <Copy size={15} />
                  <span>{exportCopied ? 'Copied to Clipboard' : 'Copy Text'}</span>
                </button>
              )}
              <button className="tree-btn tree-btn-primary" onClick={handleDownloadExport}>
                <Download size={15} />
                <span>Download File</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Tree Modal */}
      {isNewMapModalOpen && (
        <div className="tree-modal-backdrop" onClick={() => setIsNewMapModalOpen(false)}>
          <div className="tree-modal-container" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="tree-modal-header">
              <h2>
                <Plus size={20} />
                <span>Create New Tree Workspace</span>
              </h2>
              <button className="icon-btn" onClick={() => setIsNewMapModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="tree-modal-body">
              <input
                id="new-tree-title-input"
                type="text"
                placeholder="Workspace Title (e.g. Project Mind Map)..."
                className="tree-input-title"
                defaultValue="My Tree Notes"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateNewTree(e.target.value);
                  }
                }}
              />
            </div>

            <div className="tree-modal-footer">
              <button className="tree-btn" onClick={() => setIsNewMapModalOpen(false)}>
                Cancel
              </button>
              <button
                className="tree-btn tree-btn-primary"
                onClick={() => {
                  const val = document.getElementById('new-tree-title-input')?.value;
                  handleCreateNewTree(val);
                }}
              >
                Create Workspace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {isShortcutsModalOpen && (
        <div className="tree-modal-backdrop" onClick={() => setIsShortcutsModalOpen(false)}>
          <div className="tree-modal-container" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
            <div className="tree-modal-header">
              <h2>
                <HelpCircle size={20} />
                <span>Keyboard Shortcuts & Workflow</span>
              </h2>
              <button className="icon-btn" onClick={() => setIsShortcutsModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="tree-modal-body">
              <div className="tree-shortcuts-list">
                <div className="tree-shortcut-row">
                  <span>Add Child Branch</span>
                  <div className="tree-shortcut-keys">
                    <span className="tree-shortcut-key">Tab</span>
                  </div>
                </div>
                <div className="tree-shortcut-row">
                  <span>Add Sibling Branch</span>
                  <div className="tree-shortcut-keys">
                    <span className="tree-shortcut-key">Enter</span>
                  </div>
                </div>
                <div className="tree-shortcut-row">
                  <span>Delete Selected Branch</span>
                  <div className="tree-shortcut-keys">
                    <span className="tree-shortcut-key">Delete</span>
                    <span>or</span>
                    <span className="tree-shortcut-key">Backspace</span>
                  </div>
                </div>
                <div className="tree-shortcut-row">
                  <span>Undo / Redo</span>
                  <div className="tree-shortcut-keys">
                    <span className="tree-shortcut-key">Ctrl/Cmd + Z</span>
                    <span>/</span>
                    <span className="tree-shortcut-key">Ctrl/Cmd + Y</span>
                  </div>
                </div>
                <div className="tree-shortcut-row">
                  <span>Pan Canvas</span>
                  <div className="tree-shortcut-keys">
                    <span className="tree-shortcut-key">Drag Mouse</span>
                  </div>
                </div>
                <div className="tree-shortcut-row">
                  <span>Zoom In / Out</span>
                  <div className="tree-shortcut-keys">
                    <span className="tree-shortcut-key">Scroll Wheel</span>
                  </div>
                </div>
                <div className="tree-shortcut-row">
                  <span>Exit Focus Mode</span>
                  <div className="tree-shortcut-keys">
                    <span className="tree-shortcut-key">Escape</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
