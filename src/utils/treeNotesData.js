// Tree Notes & Mind Map Data Utilities, Layout Engines, and Import/Export Handlers

export const generateId = () => {
  return 'node_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
};

export const NODE_COLORS = [
  { id: 'default', name: 'Default', hex: 'var(--accent-1)', bg: 'rgba(255, 42, 133, 0.12)', border: 'rgba(255, 42, 133, 0.4)' },
  { id: 'cyan', name: 'Cyan', hex: '#00d2ff', bg: 'rgba(0, 210, 255, 0.12)', border: 'rgba(0, 210, 255, 0.4)' },
  { id: 'emerald', name: 'Emerald', hex: '#00fa9a', bg: 'rgba(0, 250, 154, 0.12)', border: 'rgba(0, 250, 154, 0.4)' },
  { id: 'purple', name: 'Purple', hex: '#b388ff', bg: 'rgba(179, 136, 255, 0.12)', border: 'rgba(179, 136, 255, 0.4)' },
  { id: 'amber', name: 'Amber', hex: '#ffb300', bg: 'rgba(255, 179, 0, 0.12)', border: 'rgba(255, 179, 0, 0.4)' },
  { id: 'rose', name: 'Rose', hex: '#ff5252', bg: 'rgba(255, 82, 82, 0.12)', border: 'rgba(255, 82, 82, 0.4)' },
  { id: 'sapphire', name: 'Sapphire', hex: '#448aff', bg: 'rgba(68, 138, 255, 0.12)', border: 'rgba(68, 138, 255, 0.4)' }
];

export const PRESET_TREES = [
  {
    id: 'preset-system-architecture',
    title: 'System Architecture & Services',
    updatedAt: new Date().toISOString(),
    root: {
      id: 'root-sys',
      title: 'Cloud Platform Architecture',
      content: 'Core architecture overview of our distributed cloud platform and microservices.',
      color: 'cyan',
      completed: false,
      tags: ['architecture', 'v2', 'cloud'],
      isExpanded: true,
      children: [
        {
          id: 'sys-frontend',
          title: 'Frontend Client Layer',
          content: 'Next-generation single-page client built with modern web technologies.',
          color: 'cyan',
          completed: true,
          tags: ['react', 'ui'],
          isExpanded: true,
          children: [
            {
              id: 'sys-fe-state',
              title: 'Global State & Cache',
              content: 'Optimistic local cache with offline persistence and reactive streams.',
              color: 'emerald',
              completed: true,
              tags: ['cache'],
              isExpanded: true,
              children: []
            },
            {
              id: 'sys-fe-ui',
              title: 'Design System & Micro-Animations',
              content: 'Custom glassmorphic components, fluid themes, and high-performance SVG canvas rendering.',
              color: 'emerald',
              completed: true,
              tags: ['styles'],
              isExpanded: true,
              children: []
            }
          ]
        },
        {
          id: 'sys-backend',
          title: 'API Gateway & Services',
          content: 'High-throughput microservices cluster with rate limiting and secure session tokens.',
          color: 'amber',
          completed: false,
          tags: ['backend', 'api'],
          isExpanded: true,
          children: [
            {
              id: 'sys-be-auth',
              title: 'Zero-Knowledge Auth & Tokens',
              content: 'Timing-safe crypto validation with PBKDF2 key derivation and rate limit guards.',
              color: 'rose',
              completed: true,
              tags: ['security'],
              isExpanded: true,
              children: []
            },
            {
              id: 'sys-be-stream',
              title: 'Real-Time Streaming Engine',
              content: 'Zero-disk memory buffered streaming for live speedtests and real-time node syncing.',
              color: 'amber',
              completed: false,
              tags: ['stream', 'perf'],
              isExpanded: true,
              children: []
            }
          ]
        },
        {
          id: 'sys-database',
          title: 'Data & Persistence Layer',
          content: 'Multi-region distributed database with automatic fallback to local memory cache.',
          color: 'purple',
          completed: false,
          tags: ['database', 'storage'],
          isExpanded: true,
          children: [
            {
              id: 'sys-db-nosql',
              title: 'Cloud Document Store',
              content: 'Real-time document synchronization with sub-50ms query latency.',
              color: 'purple',
              completed: true,
              tags: ['nosql'],
              isExpanded: true,
              children: []
            },
            {
              id: 'sys-db-backup',
              title: 'Automated Snapshots & Export',
              content: 'Encrypted daily snapshots with JSON and Markdown file schema export.',
              color: 'sapphire',
              completed: false,
              tags: ['backup'],
              isExpanded: true,
              children: []
            }
          ]
        }
      ]
    }
  },
  {
    id: 'preset-mind-map-storm',
    title: 'Product Brainstorm & Roadmapping',
    updatedAt: new Date().toISOString(),
    root: {
      id: 'root-brainstorm',
      title: 'Next-Gen Developer Tool',
      content: 'Ideation tree for launching an ultra-fast suite of offline-first browser utilities.',
      color: 'default',
      completed: false,
      tags: ['ideation', 'roadmap'],
      isExpanded: true,
      children: [
        {
          id: 'bm-core',
          title: 'Core Differentiators',
          content: 'What makes this tool 10x better than existing alternatives.',
          color: 'cyan',
          completed: false,
          tags: ['strategy'],
          isExpanded: true,
          children: [
            {
              id: 'bm-speed',
              title: 'Zero Latency Offline Operation',
              content: 'Runs 100% locally in browser without requiring network connectivity.',
              color: 'emerald',
              completed: true,
              tags: ['pwa'],
              isExpanded: true,
              children: []
            },
            {
              id: 'bm-visual',
              title: 'Visual Tree & Branch Graph',
              content: 'Switch between hierarchical text outline and interactive Mind Map canvas.',
              color: 'emerald',
              completed: true,
              tags: ['visual'],
              isExpanded: true,
              children: []
            }
          ]
        },
        {
          id: 'bm-growth',
          title: 'Growth & Distribution',
          content: 'Channels to reach engineers, designers, and knowledge workers.',
          color: 'amber',
          completed: false,
          tags: ['marketing'],
          isExpanded: true,
          children: [
            {
              id: 'bm-export',
              title: 'Frictionless Import & Export',
              content: 'Support Markdown, JSON, OPML, and high-res PNG visual diagrams.',
              color: 'amber',
              completed: true,
              tags: ['viral'],
              isExpanded: true,
              children: []
            },
            {
              id: 'bm-community',
              title: 'Open Template Library',
              content: 'Prebuilt mind maps for learning, system design, meeting notes, and sprint planning.',
              color: 'purple',
              completed: false,
              tags: ['community'],
              isExpanded: true,
              children: []
            }
          ]
        }
      ]
    }
  },
  {
    id: 'preset-learning-syllabus',
    title: 'Computer Science Study Syllabus',
    updatedAt: new Date().toISOString(),
    root: {
      id: 'root-syllabus',
      title: 'Computer Science Mastery',
      content: 'Structured knowledge tree covering foundational and advanced software engineering topics.',
      color: 'sapphire',
      completed: false,
      tags: ['study', 'syllabus'],
      isExpanded: true,
      children: [
        {
          id: 'learn-dsa',
          title: 'Data Structures & Algorithms',
          content: 'Core algorithmic patterns, time/space complexities, and graph traversals.',
          color: 'cyan',
          completed: true,
          tags: ['algorithms'],
          isExpanded: true,
          children: [
            {
              id: 'learn-trees',
              title: 'Trees & Mind Maps',
              content: 'Binary Search Trees, Red-Black Trees, Tries, and N-ary Tree visualization.',
              color: 'emerald',
              completed: true,
              tags: ['theory'],
              isExpanded: true,
              children: []
            },
            {
              id: 'learn-graphs',
              title: 'Graph Theory & Shortest Path',
              content: 'Dijkstra, A* pathfinding, BFS, DFS, and topological sorting.',
              color: 'emerald',
              completed: true,
              tags: ['theory'],
              isExpanded: true,
              children: []
            }
          ]
        },
        {
          id: 'learn-systems',
          title: 'Distributed Systems',
          content: 'Consensus protocols, CAP theorem, replication strategies, and caching.',
          color: 'purple',
          completed: false,
          tags: ['systems'],
          isExpanded: true,
          children: [
            {
              id: 'learn-concurrency',
              title: 'Concurrency & Locks',
              content: 'Mutexes, semaphores, atomics, thread pools, and asynchronous event loops.',
              color: 'amber',
              completed: false,
              tags: ['multithreading'],
              isExpanded: true,
              children: []
            }
          ]
        }
      ]
    }
  }
];

// Helper: Find node by ID
export function findNodeById(root, id) {
  if (!root) return null;
  if (root.id === id) return root;
  if (root.children && root.children.length > 0) {
    for (const child of root.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
  }
  return null;
}

// Helper: Find parent of a node
export function findParentNode(root, id) {
  if (!root || !root.children) return null;
  for (const child of root.children) {
    if (child.id === id) return root;
    const found = findParentNode(child, id);
    if (found) return found;
  }
  return null;
}

// Helper: Get node path from root to node (breadcrumbs)
export function getNodePath(root, targetId, currentPath = []) {
  if (!root) return null;
  const path = [...currentPath, { id: root.id, title: root.title, color: root.color }];
  if (root.id === targetId) return path;
  if (root.children) {
    for (const child of root.children) {
      const res = getNodePath(child, targetId, path);
      if (res) return res;
    }
  }
  return null;
}

// Helper: Add child node to a parent
export function addChildNode(root, parentId, newNodeData = {}) {
  const clone = JSON.parse(JSON.stringify(root));
  const parent = findNodeById(clone, parentId);
  if (!parent) return clone;

  const newNode = {
    id: generateId(),
    title: newNodeData.title || 'New Branch',
    content: newNodeData.content || '',
    color: newNodeData.color || parent.color || 'default',
    completed: false,
    tags: newNodeData.tags || [],
    isExpanded: true,
    children: newNodeData.children || []
  };

  if (!parent.children) parent.children = [];
  parent.children.push(newNode);
  parent.isExpanded = true;
  return { updatedRoot: clone, newNodeId: newNode.id };
}

// Helper: Add sibling node next to specified node
export function addSiblingNode(root, targetId, newNodeData = {}) {
  const clone = JSON.parse(JSON.stringify(root));
  if (clone.id === targetId) {
    // Sibling of root is added as child of root
    return addChildNode(root, targetId, newNodeData);
  }

  const parent = findParentNode(clone, targetId);
  if (!parent || !parent.children) return { updatedRoot: clone, newNodeId: null };

  const targetIndex = parent.children.findIndex(c => c.id === targetId);
  const newNode = {
    id: generateId(),
    title: newNodeData.title || 'New Branch',
    content: newNodeData.content || '',
    color: newNodeData.color || parent.color || 'default',
    completed: false,
    tags: newNodeData.tags || [],
    isExpanded: true,
    children: []
  };

  parent.children.splice(targetIndex + 1, 0, newNode);
  return { updatedRoot: clone, newNodeId: newNode.id };
}

// Helper: Update node properties
export function updateNode(root, id, updates) {
  const clone = JSON.parse(JSON.stringify(root));
  const target = findNodeById(clone, id);
  if (target) {
    Object.assign(target, updates);
  }
  return clone;
}

// Helper: Delete node
export function deleteNode(root, id) {
  if (root.id === id) return null; // Cannot delete root directly
  const clone = JSON.parse(JSON.stringify(root));
  const parent = findParentNode(clone, id);
  if (parent && parent.children) {
    parent.children = parent.children.filter(c => c.id !== id);
  }
  return clone;
}

// Helper: Find node in either root tree or array of floating nodes
export function findNodeInTreeOrFloating(root, floatingNodes = [], id) {
  if (!id) return null;
  const inRoot = findNodeById(root, id);
  if (inRoot) return inRoot;
  for (const fn of floatingNodes) {
    const inFn = findNodeById(fn, id);
    if (inFn) return inFn;
  }
  return null;
}

// Helper: Find parent in either root tree or array of floating nodes
export function findParentInTreeOrFloating(root, floatingNodes = [], id) {
  if (!id) return null;
  const pInRoot = findParentNode(root, id);
  if (pInRoot) return pInRoot;
  for (const fn of floatingNodes) {
    const pInFn = findParentNode(fn, id);
    if (pInFn) return pInFn;
  }
  return null;
}

// Helper: Update node in either root tree or array of floating nodes
export function updateNodeInTreeOrFloating(root, floatingNodes = [], id, updates) {
  let newRoot = root;
  let newFloating = floatingNodes;

  if (findNodeById(root, id)) {
    newRoot = updateNode(root, id, updates);
  } else {
    newFloating = (floatingNodes || []).map(fn => {
      if (findNodeById(fn, id)) {
        return updateNode(fn, id, updates);
      }
      return fn;
    });
  }

  return { updatedRoot: newRoot, updatedFloating: newFloating };
}

// Helper: Delete node from either root tree or array of floating nodes
export function deleteNodeInTreeOrFloating(root, floatingNodes = [], id) {
  let newRoot = root;
  let newFloating = floatingNodes || [];

  if (root && root.id === id) {
    // Cannot delete main root
    return { updatedRoot: root, updatedFloating: newFloating };
  }

  if (findParentNode(root, id)) {
    newRoot = deleteNode(root, id);
  } else {
    // Check if it's a top-level floating node or a child inside a floating node
    const isTopLevelFloating = newFloating.some(fn => fn.id === id);
    if (isTopLevelFloating) {
      newFloating = newFloating.filter(fn => fn.id !== id);
    } else {
      newFloating = newFloating.map(fn => {
        if (findParentNode(fn, id)) {
          return deleteNode(fn, id);
        }
        return fn;
      });
    }
  }

  return { updatedRoot: newRoot, updatedFloating: newFloating };
}

// Helper: Duplicate node and subtree
export function duplicateNode(root, id) {
  if (root.id === id) return root;
  const clone = JSON.parse(JSON.stringify(root));
  const parent = findParentNode(clone, id);
  if (!parent || !parent.children) return clone;

  const target = findNodeById(clone, id);
  if (!target) return clone;

  // Deep clone and regenerate IDs
  const deepCloneWithNewIds = (node) => {
    return {
      ...node,
      id: generateId(),
      title: node.title + ' (Copy)',
      children: (node.children || []).map(deepCloneWithNewIds)
    };
  };

  const duplicated = deepCloneWithNewIds(target);
  const targetIndex = parent.children.findIndex(c => c.id === id);
  parent.children.splice(targetIndex + 1, 0, duplicated);

  return { updatedRoot: clone, newNodeId: duplicated.id };
}

// Helper: Move node up or down among siblings
export function moveNode(root, id, direction) {
  const clone = JSON.parse(JSON.stringify(root));
  const parent = findParentNode(clone, id);
  if (!parent || !parent.children || parent.children.length <= 1) return clone;

  const index = parent.children.findIndex(c => c.id === id);
  if (index === -1) return clone;

  if (direction === 'up' && index > 0) {
    const temp = parent.children[index];
    parent.children[index] = parent.children[index - 1];
    parent.children[index - 1] = temp;
  } else if (direction === 'down' && index < parent.children.length - 1) {
    const temp = parent.children[index];
    parent.children[index] = parent.children[index + 1];
    parent.children[index + 1] = temp;
  }

  return clone;
}

// Helper: Toggle expand/collapse
export function toggleNodeCollapse(root, id) {
  const clone = JSON.parse(JSON.stringify(root));
  const target = findNodeById(clone, id);
  if (target) {
    target.isExpanded = target.isExpanded === undefined ? false : !target.isExpanded;
  }
  return clone;
}

// Helper: Collapse or expand all
export function setAllNodesExpanded(root, isExpanded) {
  const clone = JSON.parse(JSON.stringify(root));
  const traverse = (node) => {
    node.isExpanded = isExpanded;
    if (node.children) {
      node.children.forEach(traverse);
    }
  };
  traverse(clone);
  return clone;
}

// Helper: Statistics
export function getTreeStats(root) {
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

    if (node.children && node.children.length > 0) {
      node.children.forEach(c => traverse(c, depth + 1));
    }
  };

  if (root) traverse(root, 1);

  const percentComplete = totalNodes > 0 ? Math.round((completedCount / totalNodes) * 100) : 0;
  return { totalNodes, maxDepth, completedCount, percentComplete, wordCount };
}

// ==========================================================================
// Layout Algorithms for Interactive Visual Map
// ==========================================================================

/**
 * Horizontal Tree Layout (Left to Right)
 * Computes x, y coordinates and bounding box for each node and connection curve.
 */
export function computeHorizontalTreeLayout(root, options = {}) {
  if (!root) return { nodes: [], connections: [], bounds: { minX: 0, minY: 0, maxX: 800, maxY: 600, width: 800, height: 600 } };

  const nodeWidth = options.nodeWidth || 220;
  const nodeHeight = options.nodeHeight || 80;
  const gapX = options.gapX || 100;
  const gapY = options.gapY || 40;

  const nodesList = [];
  const connectionsList = [];

  // Step 1: Compute height required for each subtree
  function computeSubtreeHeight(node) {
    if (!node.children || node.children.length === 0 || node.isExpanded === false) {
      node._subtreeHeight = nodeHeight;
      return nodeHeight;
    }

    let totalChildrenHeight = 0;
    for (let i = 0; i < node.children.length; i++) {
      const childH = computeSubtreeHeight(node.children[i]);
      totalChildrenHeight += childH;
      if (i > 0) totalChildrenHeight += gapY;
    }
    node._subtreeHeight = Math.max(nodeHeight, totalChildrenHeight);
    return node._subtreeHeight;
  }

  computeSubtreeHeight(root);

  // Step 2: Assign coordinates recursively
  function assignCoordinates(node, depth, topOffset) {
    const totalH = node._subtreeHeight;
    const x = depth * (nodeWidth + gapX) + 40;
    const y = topOffset + (totalH / 2) - (nodeHeight / 2);

    const layoutNode = {
      ...node,
      depth,
      x,
      y,
      width: nodeWidth,
      height: nodeHeight,
      hasChildren: Boolean(node.children && node.children.length > 0),
      childCount: node.children ? node.children.length : 0
    };
    nodesList.push(layoutNode);

    if (node.children && node.children.length > 0 && node.isExpanded !== false) {
      let totalChildrenHeight = 0;
      for (let i = 0; i < node.children.length; i++) {
        totalChildrenHeight += node.children[i]._subtreeHeight;
        if (i > 0) totalChildrenHeight += gapY;
      }

      let currentChildTop = topOffset + (totalH - totalChildrenHeight) / 2;

      for (const child of node.children) {
        assignCoordinates(child, depth + 1, currentChildTop);

        const parentOutX = x + nodeWidth;
        const parentOutY = y + nodeHeight / 2;
        const childInX = (depth + 1) * (nodeWidth + gapX) + 40;
        const childInY = currentChildTop + (child._subtreeHeight / 2);

        const cp1x = parentOutX + (gapX * 0.45);
        const cp2x = childInX - (gapX * 0.45);
        const midX = 0.125 * parentOutX + 0.375 * cp1x + 0.375 * cp2x + 0.125 * childInX;
        const midY = (parentOutY + childInY) / 2;

        connectionsList.push({
          id: `conn_${node.id}_${child.id}`,
          parentId: node.id,
          childId: child.id,
          parentColor: node.color,
          childColor: child.color,
          x1: parentOutX,
          y1: parentOutY,
          x2: childInX,
          y2: childInY,
          midX,
          midY,
          path: `M ${parentOutX} ${parentOutY} C ${cp1x} ${parentOutY}, ${cp2x} ${childInY}, ${childInX} ${childInY}`
        });

        currentChildTop += child._subtreeHeight + gapY;
      }
    }
  }

  assignCoordinates(root, 0, 40);

  // Compute bounding box
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
      minX: minX - 40,
      minY: minY - 40,
      maxX: maxX + 60,
      maxY: maxY + 40,
      width: Math.max(800, (maxX - minX) + 100),
      height: Math.max(600, (maxY - minY) + 100)
    }
  };
}

/**
 * Radial Mind Map Layout (Center outwards)
 * Allocates angular sectors proportionally based on subtree leaf weight,
 * with collision relaxation to guarantee zero overlap.
 */
export function computeRadialMindMapLayout(root, options = {}) {
  if (!root) return { nodes: [], connections: [], bounds: { minX: -400, minY: -300, maxX: 400, maxY: 300, width: 800, height: 600 } };

  const nodeWidth = options.nodeWidth || 220;
  const nodeHeight = options.nodeHeight || 80;
  const baseRadius = options.baseRadius || 320;
  const radiusStep = options.radiusStep || 300;

  const nodesList = [];
  const connectionsList = [];

  // Step 1: Compute leaf count for each node to allocate proportional angular sectors
  function countLeaves(node) {
    if (!node.children || node.children.length === 0 || node.isExpanded === false) {
      node._leafCount = 1;
      return 1;
    }
    let total = 0;
    for (const child of node.children) {
      total += countLeaves(child);
    }
    node._leafCount = Math.max(1, total);
    return node._leafCount;
  }

  const totalLeaves = countLeaves(root);

  // Step 2: Place root node at center (0, 0)
  const rootLayout = {
    ...root,
    depth: 0,
    x: -nodeWidth / 2,
    y: -nodeHeight / 2,
    width: nodeWidth,
    height: nodeHeight,
    hasChildren: Boolean(root.children && root.children.length > 0),
    childCount: root.children ? root.children.length : 0,
    nodeCenterX: 0,
    nodeCenterY: 0
  };
  nodesList.push(rootLayout);

  // Step 3: Distribute root's direct children around full 360 degrees
  if (root.children && root.children.length > 0 && root.isExpanded !== false) {
    let currentStartAngle = -Math.PI / 2; // Start from top
    const totalCircle = 2 * Math.PI;

    root.children.forEach((child) => {
      const fraction = child._leafCount / totalLeaves;
      const sectorSpan = fraction * totalCircle;
      const centerAngle = currentStartAngle + (sectorSpan / 2);

      assignRadialSubtree(
        child,
        1,
        centerAngle,
        currentStartAngle,
        currentStartAngle + sectorSpan,
        0,
        0,
        root.id,
        root.color
      );

      currentStartAngle += sectorSpan;
    });
  }

  function assignRadialSubtree(
    node,
    depth,
    centerAngle,
    sectorStart,
    sectorEnd,
    parentCenterX,
    parentCenterY,
    parentId,
    parentColor
  ) {
    const radius = baseRadius + (depth - 1) * radiusStep;
    const nodeCenterX = Math.cos(centerAngle) * radius;
    const nodeCenterY = Math.sin(centerAngle) * radius;

    const x = nodeCenterX - nodeWidth / 2;
    const y = nodeCenterY - nodeHeight / 2;

    const layoutNode = {
      ...node,
      depth,
      x,
      y,
      width: nodeWidth,
      height: nodeHeight,
      hasChildren: Boolean(node.children && node.children.length > 0),
      childCount: node.children ? node.children.length : 0,
      centerAngle,
      nodeCenterX,
      nodeCenterY
    };
    nodesList.push(layoutNode);

    // Connection curve
    const midX = (parentCenterX + nodeCenterX) / 2;
    const midY = (parentCenterY + nodeCenterY) / 2;
    connectionsList.push({
      id: `conn_${parentId}_${node.id}`,
      parentId,
      childId: node.id,
      parentColor,
      childColor: node.color,
      x1: parentCenterX,
      y1: parentCenterY,
      x2: nodeCenterX,
      y2: nodeCenterY,
      midX,
      midY,
      path: `M ${parentCenterX} ${parentCenterY} Q ${midX} ${midY}, ${nodeCenterX} ${nodeCenterY}`
    });

    if (node.children && node.children.length > 0 && node.isExpanded !== false) {
      let currentChildStart = sectorStart;
      const parentSectorSpan = sectorEnd - sectorStart;
      const childTotalLeaves = node._leafCount;

      node.children.forEach((child) => {
        const childFraction = child._leafCount / childTotalLeaves;
        const childSectorSpan = childFraction * parentSectorSpan;
        const childCenterAngle = currentChildStart + (childSectorSpan / 2);

        assignRadialSubtree(
          child,
          depth + 1,
          childCenterAngle,
          currentChildStart,
          currentChildStart + childSectorSpan,
          nodeCenterX,
          nodeCenterY,
          node.id,
          node.color
        );

        currentChildStart += childSectorSpan;
      });
    }
  }

  // Step 4: Collision detection & overlap relaxation pass
  const minGapX = 40;
  const minGapY = 32;
  for (let iter = 0; iter < 15; iter++) {
    let hadOverlap = false;
    for (let i = 0; i < nodesList.length; i++) {
      for (let j = i + 1; j < nodesList.length; j++) {
        const a = nodesList[i];
        const b = nodesList[j];
        if (a.id === root.id || b.id === root.id) continue;

        const aCenterX = a.x + a.width / 2;
        const aCenterY = a.y + a.height / 2;
        const bCenterX = b.x + b.width / 2;
        const bCenterY = b.y + b.height / 2;

        const dx = bCenterX - aCenterX;
        const dy = bCenterY - aCenterY;
        const overlapX = (a.width + minGapX) - Math.abs(dx);
        const overlapY = (a.height + minGapY) - Math.abs(dy);

        if (overlapX > 0 && overlapY > 0) {
          hadOverlap = true;
          let pushX = dx === 0 ? (Math.random() - 0.5) : dx;
          let pushY = dy === 0 ? (Math.random() - 0.5) : dy;
          const dist = Math.sqrt(pushX * pushX + pushY * pushY) || 1;
          const shiftAmount = Math.min(overlapX, overlapY) / 2 + 6;

          const sX = (pushX / dist) * shiftAmount;
          const sY = (pushY / dist) * shiftAmount;

          a.x -= sX;
          a.y -= sY;
          b.x += sX;
          b.y += sY;

          a.nodeCenterX = a.x + a.width / 2;
          a.nodeCenterY = a.y + a.height / 2;
          b.nodeCenterX = b.x + b.width / 2;
          b.nodeCenterY = b.y + b.height / 2;
        }
      }
    }
    if (!hadOverlap) break;
  }

  // Step 5: Update connector curve endpoints after overlap relaxation
  const nodeMap = new Map();
  nodesList.forEach(n => nodeMap.set(n.id, n));

  connectionsList.forEach(conn => {
    const parentNode = nodeMap.get(conn.parentId);
    const childNode = nodeMap.get(conn.childId);
    if (parentNode && childNode) {
      const pX = parentNode.nodeCenterX;
      const pY = parentNode.nodeCenterY;
      const cX = childNode.nodeCenterX;
      const cY = childNode.nodeCenterY;
      const midX = (pX + cX) / 2;
      const midY = (pY + cY) / 2;

      conn.x1 = pX;
      conn.y1 = pY;
      conn.x2 = cX;
      conn.y2 = cY;
      conn.midX = midX;
      conn.midY = midY;
      conn.path = `M ${pX} ${pY} Q ${midX} ${midY}, ${cX} ${cY}`;
    }
  });

  // Step 6: Compute overall layout bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  nodesList.forEach(n => {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.width);
    maxY = Math.max(maxY, n.y + n.height);
  });

  return {
    nodes: nodesList,
    connections: connectionsList,
    bounds: {
      minX: minX - 80,
      minY: minY - 80,
      maxX: maxX + 80,
      maxY: maxY + 80,
      width: Math.max(800, (maxX - minX) + 160),
      height: Math.max(600, (maxY - minY) + 160)
    }
  };
}

/**
 * Top-Down Vertical Tree Layout
 */
export function computeVerticalTreeLayout(root, options = {}) {
  if (!root) return { nodes: [], connections: [], bounds: { minX: 0, minY: 0, maxX: 800, maxY: 600, width: 800, height: 600 } };

  const nodeWidth = options.nodeWidth || 220;
  const nodeHeight = options.nodeHeight || 80;
  const gapX = options.gapX || 60;
  const gapY = options.gapY || 90;

  const nodesList = [];
  const connectionsList = [];

  function computeSubtreeWidth(node) {
    if (!node.children || node.children.length === 0 || node.isExpanded === false) {
      node._subtreeWidth = nodeWidth;
      return nodeWidth;
    }
    let totalChildrenWidth = 0;
    for (let i = 0; i < node.children.length; i++) {
      const childW = computeSubtreeWidth(node.children[i]);
      totalChildrenWidth += childW;
      if (i > 0) totalChildrenWidth += gapX;
    }
    node._subtreeWidth = Math.max(nodeWidth, totalChildrenWidth);
    return node._subtreeWidth;
  }

  computeSubtreeWidth(root);

  function assignVerticalCoordinates(node, depth, leftOffset) {
    const totalW = node._subtreeWidth;
    const x = leftOffset + (totalW / 2) - (nodeWidth / 2);
    const y = depth * (nodeHeight + gapY) + 40;

    nodesList.push({
      ...node,
      depth,
      x,
      y,
      width: nodeWidth,
      height: nodeHeight,
      hasChildren: Boolean(node.children && node.children.length > 0),
      childCount: node.children ? node.children.length : 0
    });

    if (node.children && node.children.length > 0 && node.isExpanded !== false) {
      let totalChildrenWidth = 0;
      for (let i = 0; i < node.children.length; i++) {
        totalChildrenWidth += node.children[i]._subtreeWidth;
        if (i > 0) totalChildrenWidth += gapX;
      }

      let currentChildLeft = leftOffset + (totalW - totalChildrenWidth) / 2;

      for (const child of node.children) {
        assignVerticalCoordinates(child, depth + 1, currentChildLeft);

        const parentOutX = x + nodeWidth / 2;
        const parentOutY = y + nodeHeight;
        const childInX = currentChildLeft + (child._subtreeWidth / 2);
        const childInY = (depth + 1) * (nodeHeight + gapY) + 40;

        const cp1y = parentOutY + (gapY * 0.45);
        const cp2y = childInY - (gapY * 0.45);
        const midX = (parentOutX + childInX) / 2;
        const midY = 0.125 * parentOutY + 0.375 * cp1y + 0.375 * cp2y + 0.125 * childInY;

        connectionsList.push({
          id: `conn_${node.id}_${child.id}`,
          parentId: node.id,
          childId: child.id,
          parentColor: node.color,
          childColor: child.color,
          x1: parentOutX,
          y1: parentOutY,
          x2: childInX,
          y2: childInY,
          midX,
          midY,
          path: `M ${parentOutX} ${parentOutY} C ${parentOutX} ${cp1y}, ${childInX} ${cp2y}, ${childInX} ${childInY}`
        });

        currentChildLeft += child._subtreeWidth + gapX;
      }
    }
  }

  assignVerticalCoordinates(root, 0, 40);

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  nodesList.forEach(n => {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.width);
    maxY = Math.max(maxY, n.y + n.height);
  });

  return {
    nodes: nodesList,
    connections: connectionsList,
    bounds: {
      minX: minX - 50,
      minY: minY - 40,
      maxX: maxX + 50,
      maxY: maxY + 40,
      width: Math.max(800, (maxX - minX) + 100),
      height: Math.max(600, (maxY - minY) + 80)
    }
  };
}

// ==========================================================================
// Import and Export Parsers
// ==========================================================================

/**
 * Export tree structure as formatted JSON
 */
export function exportToJson(treeMapData) {
  return JSON.stringify(treeMapData, null, 2);
}

/**
 * Export tree structure as clean, hierarchical Markdown
 */
export function exportToMarkdown(root) {
  if (!root) return '';
  const lines = [];

  function traverse(node, depth) {
    const headingPrefix = '#'.repeat(Math.min(depth + 1, 6));
    const statusPrefix = node.completed ? '[x] ' : '';
    const tagString = node.tags && node.tags.length > 0 ? ` #${node.tags.join(' #')}` : '';

    lines.push(`${headingPrefix} ${statusPrefix}${node.title}${tagString}`);

    if (node.content && node.content.trim()) {
      lines.push('');
      lines.push(node.content.trim());
      lines.push('');
    }

    if (node.children && node.children.length > 0) {
      node.children.forEach(child => traverse(child, depth + 1));
    }
  }

  traverse(root, 0);
  return lines.join('\n');
}

/**
 * Export tree structure as plain text outline
 */
export function exportToPlainText(root) {
  if (!root) return '';
  const lines = [];

  function traverse(node, depth) {
    const indent = '  '.repeat(depth);
    const bullet = depth === 0 ? '*' : '-';
    const status = node.completed ? '[x] ' : '[ ] ';
    lines.push(`${indent}${bullet} ${status}${node.title}`);
    if (node.content && node.content.trim()) {
      const contentIndent = '  '.repeat(depth + 1);
      node.content.trim().split('\n').forEach(cLine => {
        lines.push(`${contentIndent}> ${cLine}`);
      });
    }
    if (node.children) {
      node.children.forEach(child => traverse(child, depth + 1));
    }
  }

  traverse(root, 0);
  return lines.join('\n');
}

/**
 * Export tree structure as OPML format (Industry standard for mind maps and outliners)
 */
export function exportToOpml(root, mapTitle = 'Tree Notes') {
  if (!root) return '';

  function escapeXml(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function traverse(node) {
    const titleEsc = escapeXml(node.title);
    const contentEsc = escapeXml(node.content || '');
    const completedAttr = node.completed ? ' _status="completed"' : '';

    if (!node.children || node.children.length === 0) {
      return `      <outline text="${titleEsc}" _note="${contentEsc}"${completedAttr} />\n`;
    }

    let xml = `      <outline text="${titleEsc}" _note="${contentEsc}"${completedAttr}>\n`;
    node.children.forEach(child => {
      xml += traverse(child);
    });
    xml += `      </outline>\n`;
    return xml;
  }

  const dateStr = new Date().toUTCString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>${escapeXml(mapTitle)}</title>
    <dateCreated>${dateStr}</dateCreated>
  </head>
  <body>
${traverse(root)}  </body>
</opml>`;
}

/**
 * Intelligent Markdown / Outline Parser
 * Converts Markdown with `# Headings`, `- Bullets`, or tab-indented lists into a nested branch tree.
 */
export function parseMarkdownToTree(rawMarkdown) {
  if (!rawMarkdown || !rawMarkdown.trim()) {
    throw new Error('Markdown content is empty');
  }

  const lines = rawMarkdown.split(/\r?\n/);
  const root = {
    id: generateId(),
    title: 'Imported Tree Notes',
    content: '',
    color: 'cyan',
    completed: false,
    tags: ['imported'],
    isExpanded: true,
    children: []
  };

  // Check if file uses # heading structure or bullet/indent structure
  const hasHeadings = lines.some(l => /^#{1,6}\s+/.test(l.trim()));

  if (hasHeadings) {
    const stack = [{ node: root, level: 0 }];
    let currentNoteLines = [];
    let isFirstHeading = true;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);

      if (headingMatch) {
        // Save accumulated notes to current node
        if (currentNoteLines.length > 0 && stack.length > 0) {
          const active = stack[stack.length - 1].node;
          active.content = (active.content ? active.content + '\n' : '') + currentNoteLines.join('\n').trim();
          currentNoteLines = [];
        }

        const level = headingMatch[1].length;
        let headingText = headingMatch[2].trim();
        let completed = false;

        // Check if heading has [x] or [ ]
        if (headingText.startsWith('[x] ') || headingText.startsWith('[X] ')) {
          completed = true;
          headingText = headingText.substring(4);
        } else if (headingText.startsWith('[ ] ')) {
          completed = false;
          headingText = headingText.substring(4);
        }

        // Extract tags #tag
        const tags = [];
        const tagMatches = headingText.match(/#([a-zA-Z0-9_-]+)/g);
        if (tagMatches) {
          tagMatches.forEach(t => tags.push(t.substring(1)));
          headingText = headingText.replace(/#([a-zA-Z0-9_-]+)/g, '').trim();
        }

        if (isFirstHeading && level === 1) {
          root.title = headingText || 'Root Node';
          root.completed = completed;
          if (tags.length > 0) root.tags = tags;
          isFirstHeading = false;
          continue;
        }

        const newNode = {
          id: generateId(),
          title: headingText || 'Untitled Section',
          content: '',
          color: 'default',
          completed,
          tags,
          isExpanded: true,
          children: []
        };

        // Find correct parent level in stack
        while (stack.length > 1 && stack[stack.length - 1].level >= level) {
          stack.pop();
        }

        const parent = stack[stack.length - 1].node;
        if (!parent.children) parent.children = [];
        parent.children.push(newNode);
        stack.push({ node: newNode, level });
      } else {
        if (line) {
          currentNoteLines.push(rawLine);
        }
      }
    }

    // Flush any trailing note lines
    if (currentNoteLines.length > 0 && stack.length > 0) {
      const active = stack[stack.length - 1].node;
      active.content = (active.content ? active.content + '\n' : '') + currentNoteLines.join('\n').trim();
    }
  } else {
    // Indented bullet list parser
    const stack = [{ node: root, indent: -1 }];

    for (const rawLine of lines) {
      if (!rawLine.trim()) continue;

      // Count leading indentation (tabs = 2 spaces)
      const leadingSpaces = rawLine.match(/^[ \t]*/)[0].replace(/\t/g, '  ').length;
      const trimmed = rawLine.trim();

      // Check if it's a bullet item or a content line
      const bulletMatch = trimmed.match(/^[-*+]\s+(.*)$/) || trimmed.match(/^\d+\.\s+(.*)$/);

      if (bulletMatch) {
        let text = bulletMatch[1].trim();
        let completed = false;

        if (text.startsWith('[x] ') || text.startsWith('[X] ')) {
          completed = true;
          text = text.substring(4);
        } else if (text.startsWith('[ ] ')) {
          text = text.substring(4);
        }

        const newNode = {
          id: generateId(),
          title: text || 'Branch Note',
          content: '',
          color: 'default',
          completed,
          tags: [],
          isExpanded: true,
          children: []
        };

        while (stack.length > 1 && stack[stack.length - 1].indent >= leadingSpaces) {
          stack.pop();
        }

        const parent = stack[stack.length - 1].node;
        if (!parent.children) parent.children = [];
        parent.children.push(newNode);
        stack.push({ node: newNode, indent: leadingSpaces });
      } else if (stack.length > 0) {
        // Append text as note content to currently active node
        const active = stack[stack.length - 1].node;
        active.content = (active.content ? active.content + '\n' : '') + trimmed;
      }
    }
  }

  return root;
}

/**
 * OPML Parser
 */
export function parseOpmlToTree(opmlString) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(opmlString, 'text/xml');
  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    throw new Error('Invalid OPML XML format: ' + parserError.textContent);
  }

  const titleNode = xmlDoc.querySelector('head > title');
  const bodyNode = xmlDoc.querySelector('body');
  if (!bodyNode) {
    throw new Error('OPML structure missing <body> tag');
  }

  const firstOutline = bodyNode.querySelector('outline');
  if (!firstOutline) {
    throw new Error('OPML does not contain any <outline> items');
  }

  function parseOutlineNode(element) {
    const title = element.getAttribute('text') || element.getAttribute('title') || 'Branch';
    const content = element.getAttribute('_note') || element.getAttribute('note') || element.getAttribute('description') || '';
    const status = element.getAttribute('_status') || '';

    const children = [];
    for (let i = 0; i < element.children.length; i++) {
      const childEl = element.children[i];
      if (childEl.tagName.toLowerCase() === 'outline') {
        children.push(parseOutlineNode(childEl));
      }
    }

    return {
      id: generateId(),
      title,
      content,
      color: 'default',
      completed: status === 'completed',
      tags: [],
      isExpanded: true,
      children
    };
  }

  const root = parseOutlineNode(firstOutline);
  if (titleNode && titleNode.textContent) {
    root.title = titleNode.textContent.trim() || root.title;
  }
  return root;
}

/**
 * Browser file download helper
 */
export function downloadFile(content, filename, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
