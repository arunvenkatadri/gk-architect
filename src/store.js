import { create } from 'zustand';
import { temporal } from './middleware/temporal';

const NODE_TYPES = {
  service: { label: 'Service', color: '#6366f1', icon: 'S' },
  ui: { label: 'UI', color: '#06b6d4', icon: 'U' },
  database: { label: 'Database', color: '#f59e0b', icon: 'D' },
  api: { label: 'API', color: '#10b981', icon: 'A' },
  queue: { label: 'Queue', color: '#8b5cf6', icon: 'Q' },
  infra: { label: 'Infra', color: '#f97316', icon: 'I' },
  generic: { label: 'Component', color: '#6b7280', icon: 'C' },
};

let nodeIdCounter = 1;

const useStore = create(temporal((set, get) => ({
  // Theme: 'dark' or 'light'
  theme: 'dark',
  toggleTheme: () => set((state) => {
    const next = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    return { theme: next };
  }),

  // Project directory — where Claude Code operates
  projectDir: null,
  projectName: null,
  setProjectDir: (dir) => {
    const name = dir ? dir.split('/').pop() : null;
    set({ projectDir: dir, projectName: name });
  },

  // Canvas state managed by React Flow
  nodes: [],
  edges: [],
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  // Selected nodes (multi-select)
  selectedNodeIds: [],
  setSelectedNodeIds: (ids) => set({ selectedNodeIds: ids }),
  // Convenience setter for single selection
  setSelectedNodeId: (id) => set({ selectedNodeIds: id ? [id] : [] }),
  getSelectedNodes: () => {
    const state = get();
    return state.nodes.filter((n) => state.selectedNodeIds.includes(n.id));
  },

  // Clipboard for copy/paste
  clipboard: null,
  copySelection: () => {
    const state = get();
    const ids = state.selectedNodeIds;
    if (ids.length === 0) return;
    const selectedNodes = state.nodes.filter((n) => ids.includes(n.id));
    const selectedEdges = state.edges.filter(
      (e) => ids.includes(e.source) && ids.includes(e.target)
    );
    const metadata = {};
    for (const id of ids) {
      if (state.nodeMetadata[id]) {
        metadata[id] = { ...state.nodeMetadata[id] };
      }
    }
    set({
      clipboard: {
        nodes: JSON.parse(JSON.stringify(selectedNodes)),
        edges: JSON.parse(JSON.stringify(selectedEdges)),
        metadata: JSON.parse(JSON.stringify(metadata)),
      },
    });
  },
  pasteClipboard: () => {
    const state = get();
    if (!state.clipboard) return;
    const { nodes: clipNodes, edges: clipEdges, metadata: clipMeta } = state.clipboard;
    const idMap = {};
    const newNodes = [];
    const newMetadata = {};
    // Create new nodes with new IDs and offset positions
    for (const cn of clipNodes) {
      const newId = `node-${nodeIdCounter++}`;
      idMap[cn.id] = newId;
      newNodes.push({
        ...cn,
        id: newId,
        position: { x: cn.position.x + 40, y: cn.position.y + 40 },
        selected: true,
        parentId: cn.parentId && idMap[cn.parentId] ? idMap[cn.parentId] : undefined,
        extent: cn.parentId && idMap[cn.parentId] ? cn.extent : undefined,
      });
      if (clipMeta[cn.id]) {
        newMetadata[newId] = { ...clipMeta[cn.id] };
      } else {
        newMetadata[newId] = {
          description: '',
          files: [],
          directory: '',
          status: 'not_started',
          buildPrompt: '',
        };
      }
    }
    // Recreate edges with remapped IDs
    const newEdges = clipEdges.map((ce) => ({
      ...ce,
      id: `edge-${idMap[ce.source]}-${idMap[ce.target]}-${Date.now()}`,
      source: idMap[ce.source],
      target: idMap[ce.target],
    }));
    const newNodeIds = newNodes.map((n) => n.id);
    // Deselect existing nodes
    const updatedExistingNodes = state.nodes.map((n) => ({ ...n, selected: false }));
    set({
      nodes: [...updatedExistingNodes, ...newNodes],
      edges: [...state.edges, ...newEdges],
      nodeMetadata: { ...state.nodeMetadata, ...newMetadata },
      selectedNodeIds: newNodeIds,
    });
  },

  // Node metadata (descriptions, files, status)
  nodeMetadata: {},
  updateNodeMetadata: (id, data) =>
    set((state) => ({
      nodeMetadata: {
        ...state.nodeMetadata,
        [id]: { ...state.nodeMetadata[id], ...data },
      },
    })),

  // Add a new node
  addNode: (type, position, options = {}) => {
    const id = `node-${nodeIdCounter++}`;
    const typeInfo = NODE_TYPES[type] || NODE_TYPES.generic;
    const newNode = {
      id,
      type: options.rfType || 'architectureNode',
      position,
      data: {
        label: options.label || `New ${typeInfo.label}`,
        nodeType: type,
        color: typeInfo.color,
        icon: typeInfo.icon,
      },
    };
    if (options.parentId) {
      newNode.parentId = options.parentId;
      newNode.extent = 'parent';
    }
    if (options.style) {
      newNode.style = options.style;
    }
    set((state) => ({
      nodes: [...state.nodes, newNode],
      nodeMetadata: {
        ...state.nodeMetadata,
        [id]: {
          description: '',
          files: [],
          directory: '',
          status: 'not_started',
          buildPrompt: '',
        },
      },
    }));
    return id;
  },

  // Delete a node (or multiple via deleteSelectedNodes)
  deleteNode: (id) => {
    // Stop file watcher if running
    if (window.electronAPI) {
      window.electronAPI.fs.unwatchDir(id);
    }
    set((state) => {
      const { [id]: removed, ...restMetadata } = state.nodeMetadata;
      // Unparent any child nodes so they become standalone
      const updatedNodes = state.nodes
        .filter((n) => n.id !== id)
        .map((n) => n.parentId === id ? { ...n, parentId: undefined, extent: undefined } : n);
      return {
        nodes: updatedNodes,
        edges: state.edges.filter((e) => e.source !== id && e.target !== id),
        nodeMetadata: restMetadata,
        selectedNodeIds: state.selectedNodeIds.filter((sid) => sid !== id),
      };
    });
  },

  // Delete all currently selected nodes
  deleteSelectedNodes: () => {
    const state = get();
    const ids = state.selectedNodeIds;
    if (ids.length === 0) return;
    // Stop file watchers
    if (window.electronAPI) {
      for (const id of ids) {
        window.electronAPI.fs.unwatchDir(id);
      }
    }
    const idsSet = new Set(ids);
    const restMetadata = { ...state.nodeMetadata };
    for (const id of ids) {
      delete restMetadata[id];
    }
    const updatedNodes = state.nodes
      .filter((n) => !idsSet.has(n.id))
      .map((n) => idsSet.has(n.parentId) ? { ...n, parentId: undefined, extent: undefined } : n);
    set({
      nodes: updatedNodes,
      edges: state.edges.filter((e) => !idsSet.has(e.source) && !idsSet.has(e.target)),
      nodeMetadata: restMetadata,
      selectedNodeIds: [],
    });
  },

  // Update node label
  updateNodeLabel: (id, label) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, label } } : n
      ),
    }));
  },

  // Update edge label
  updateEdgeLabel: (id, label) => {
    set((state) => ({
      edges: state.edges.map((e) =>
        e.id === id ? { ...e, label, data: { ...e.data, label } } : e
      ),
    }));
  },

  // Selected edge
  selectedEdgeId: null,
  setSelectedEdgeId: (id) => set({ selectedEdgeId: id }),

  // Delete edge
  deleteEdge: (id) => {
    set((state) => ({
      edges: state.edges.filter((e) => e.id !== id),
      selectedEdgeId: state.selectedEdgeId === id ? null : state.selectedEdgeId,
    }));
  },

  // Server profiles for deployment
  servers: [],
  addServer: (server) => set((state) => ({
    servers: [...state.servers, { id: `server-${Date.now()}`, ...server }],
  })),
  updateServer: (id, data) => set((state) => ({
    servers: state.servers.map((s) => s.id === id ? { ...s, ...data } : s),
  })),
  deleteServer: (id) => set((state) => ({
    servers: state.servers.filter((s) => s.id !== id),
  })),

  // Git status per node
  gitStatus: {},
  setGitStatus: (status) => set({ gitStatus: status }),

  // Terminal panel height
  terminalHeight: 300,
  setTerminalHeight: (h) => set({ terminalHeight: h }),

  // Panel visibility
  panelOpen: false,
  panelMode: 'node', // 'node' or 'edge'
  setPanelOpen: (open, mode) => set({ panelOpen: open, panelMode: mode || 'node' }),

  // Sidebar
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // Build context for Claude
  getBuildContext: (nodeId) => {
    const state = get();
    const node = state.nodes.find((n) => n.id === nodeId);
    const meta = state.nodeMetadata[nodeId];
    if (!node || !meta) return '';

    const incoming = state.edges
      .filter((e) => e.target === nodeId)
      .map((e) => {
        const sourceNode = state.nodes.find((n) => n.id === e.source);
        return `- Receives "${e.label || 'data'}" from "${sourceNode?.data.label || 'unknown'}"`;
      });

    const outgoing = state.edges
      .filter((e) => e.source === nodeId)
      .map((e) => {
        const targetNode = state.nodes.find((n) => n.id === e.target);
        return `- Sends "${e.label || 'data'}" to "${targetNode?.data.label || 'unknown'}"`;
      });

    let prompt = `Build the "${node.data.label}" ${node.data.nodeType} component.\n\n`;

    if (meta.description) {
      prompt += `Description: ${meta.description}\n\n`;
    }

    if (meta.buildPrompt) {
      prompt += `Additional instructions: ${meta.buildPrompt}\n\n`;
    }

    if (incoming.length > 0) {
      prompt += `Incoming data:\n${incoming.join('\n')}\n\n`;
    }

    if (outgoing.length > 0) {
      prompt += `Outgoing data:\n${outgoing.join('\n')}\n\n`;
    }

    if (meta.files && meta.files.length > 0) {
      prompt += `Related files: ${meta.files.join(', ')}\n\n`;
    }

    if (meta.directory) {
      prompt += `Working directory: ${meta.directory}\n\n`;
    }

    prompt += `See ARCHITECTURE.md in the project root for full system context.\n`;

    return prompt;
  },

  // Build context for an edge (connection between two nodes)
  getEdgeBuildContext: (edgeId) => {
    const state = get();
    const edge = state.edges.find(e => e.id === edgeId);
    if (!edge) return '';
    const srcNode = state.nodes.find(n => n.id === edge.source);
    const tgtNode = state.nodes.find(n => n.id === edge.target);
    const srcMeta = state.nodeMetadata[edge.source] || {};
    const tgtMeta = state.nodeMetadata[edge.target] || {};

    let prompt = `Wire up the connection between "${srcNode?.data.label}" and "${tgtNode?.data.label}".\n\n`;
    prompt += `Relationship: ${srcNode?.data.label} sends "${edge.label || 'data'}" to ${tgtNode?.data.label}\n\n`;
    if (srcMeta.description) prompt += `Source (${srcNode?.data.label}): ${srcMeta.description}\n`;
    if (tgtMeta.description) prompt += `Target (${tgtNode?.data.label}): ${tgtMeta.description}\n\n`;
    if (srcMeta.directory) prompt += `Source directory: ${srcMeta.directory}\n`;
    if (tgtMeta.directory) prompt += `Target directory: ${tgtMeta.directory}\n\n`;
    if (edge.data?.notes) prompt += `Notes: ${edge.data.notes}\n\n`;
    prompt += `Set up the integration: imports, API calls, event handlers, data serialization, etc.\n`;
    prompt += `See ARCHITECTURE.md in the project root for full system context.\n`;
    return prompt;
  },

  // Deploy context for full stack deployment to a server
  getDeployContext: (serverId) => {
    const state = get();
    const server = state.servers.find(s => s.id === serverId);
    if (!server) return '';

    const { nodes, edges, nodeMetadata } = state;

    let prompt = `Deploy the full application stack to the server.\n\n`;
    prompt += `## Target Server\n`;
    prompt += `- Host: ${server.host}\n`;
    prompt += `- User: ${server.user}\n`;
    prompt += `- Port: ${server.port || 22}\n`;
    if (server.keyPath) prompt += `- SSH Key: ${server.keyPath}\n`;
    if (server.directory) prompt += `- Deploy Directory: ${server.directory}\n`;
    prompt += `\n`;

    prompt += `## Services to Deploy\n\n`;

    for (const node of nodes) {
      if (node.type === 'containerNode') continue; // skip group containers
      const meta = nodeMetadata[node.id] || {};
      const typeLabel = node.data.nodeType || 'component';
      prompt += `### ${node.data.label} (${typeLabel})\n`;
      if (meta.description) prompt += `${meta.description}\n`;
      if (meta.directory) prompt += `- Source: ${meta.directory}\n`;

      // Docker info if available
      if (meta.container) {
        const c = meta.container;
        if (c.image) prompt += `- Image: ${c.image}\n`;
        if (c.build) prompt += `- Build: ${c.build}\n`;
        if (c.ports?.length) prompt += `- Ports: ${c.ports.join(', ')}\n`;
        if (c.volumes?.length) prompt += `- Volumes: ${c.volumes.join(', ')}\n`;
        if (c.env?.length) prompt += `- Env: ${c.env.join(', ')}\n`;
      }
      prompt += `\n`;
    }

    // Connections
    if (edges.length > 0) {
      prompt += `## Service Connections\n`;
      for (const e of edges) {
        const src = nodes.find(n => n.id === e.source);
        const tgt = nodes.find(n => n.id === e.target);
        prompt += `- ${src?.data.label} \u2192 ${tgt?.data.label}: ${e.label || 'data'}\n`;
      }
      prompt += `\n`;
    }

    prompt += `## Instructions\n`;
    prompt += `1. SSH into the server\n`;
    prompt += `2. Set up the deploy directory\n`;
    prompt += `3. Generate a docker-compose.yml from the services above\n`;
    prompt += `4. Configure networking between services\n`;
    prompt += `5. Set up environment variables\n`;
    prompt += `6. Pull/build images and start all services\n`;
    prompt += `7. Verify all services are running and connected\n\n`;
    prompt += `See ARCHITECTURE.md in the project root for full system context.\n`;

    return prompt;
  },

  // Deploy a single service to a server
  getServiceDeployContext: (nodeId, serverId) => {
    const state = get();
    const server = state.servers.find(s => s.id === serverId);
    const node = state.nodes.find(n => n.id === nodeId);
    const meta = state.nodeMetadata[nodeId] || {};
    if (!server || !node) return '';

    let prompt = `Deploy the "${node.data.label}" service to the server.\n\n`;
    prompt += `## Target Server\n`;
    prompt += `- Host: ${server.host}\n`;
    prompt += `- User: ${server.user}\n`;
    prompt += `- Port: ${server.port || 22}\n`;
    if (server.keyPath) prompt += `- SSH Key: ${server.keyPath}\n`;
    if (server.directory) prompt += `- Deploy Directory: ${server.directory}\n`;
    prompt += `\n`;

    prompt += `## Service: ${node.data.label} (${node.data.nodeType})\n`;
    if (meta.description) prompt += `${meta.description}\n`;
    if (meta.directory) prompt += `- Source: ${meta.directory}\n`;

    if (meta.container) {
      const c = meta.container;
      if (c.image) prompt += `- Image: ${c.image}\n`;
      if (c.build) prompt += `- Build: ${c.build}\n`;
      if (c.ports?.length) prompt += `- Ports: ${c.ports.join(', ')}\n`;
      if (c.volumes?.length) prompt += `- Volumes: ${c.volumes.join(', ')}\n`;
      if (c.env?.length) prompt += `- Env: ${c.env.join(', ')}\n`;
    }
    prompt += `\n`;

    // Related connections
    const related = state.edges.filter(e => e.source === nodeId || e.target === nodeId);
    if (related.length > 0) {
      prompt += `## Connections\n`;
      for (const e of related) {
        const other = state.nodes.find(n => n.id === (e.source === nodeId ? e.target : e.source));
        const dir = e.source === nodeId ? '\u2192' : '\u2190';
        prompt += `- ${dir} ${other?.data.label}: ${e.label || 'data'}\n`;
      }
      prompt += `\n`;
    }

    prompt += `SSH into the server, deploy/update this service, and verify it's running.\n`;
    prompt += `See ARCHITECTURE.md in the project root for full system context.\n`;

    return prompt;
  },

  // Service health status (populated by health checks)
  serviceHealth: {},
  setServiceHealth: (health) => set({ serviceHealth: health }),

  // Ops context generators - each returns a prompt string for Claude
  getOpsContext: (action, nodeId, serverId) => {
    const state = get();
    const server = state.servers.find(s => s.id === serverId);
    const node = state.nodes.find(n => n.id === nodeId);
    const meta = state.nodeMetadata[nodeId] || {};
    if (!server || !node) return '';

    const serverInfo = `Server: ${server.user}@${server.host}:${server.port || 22}` +
      (server.keyPath ? ` (key: ${server.keyPath})` : '') +
      (server.directory ? `\nDeploy directory: ${server.directory}` : '');

    const serviceName = node.data.label;
    const containerName = serviceName.toLowerCase().replace(/[^a-z0-9]/g, '-');

    switch (action) {
      case 'restart':
        return `SSH into the server and restart the "${serviceName}" service.\n\n${serverInfo}\n\nFind and restart the container/service for "${serviceName}" (likely named ${containerName} or similar). Verify it comes back up healthy.\n`;

      case 'stop':
        return `SSH into the server and stop the "${serviceName}" service.\n\n${serverInfo}\n\nStop the container/service for "${serviceName}". Confirm it has stopped.\n`;

      case 'logs':
        return `SSH into the server and show recent logs for the "${serviceName}" service.\n\n${serverInfo}\n\nShow the last 200 lines of logs for "${serviceName}" (try docker logs, journalctl, or log files). Highlight any errors or warnings.\n`;

      case 'scale':
        return `SSH into the server and scale the "${serviceName}" service.\n\n${serverInfo}\n\nScale "${serviceName}" - if using docker-compose, adjust replicas. Show the current and new state.\n`;

      case 'rollback':
        return `SSH into the server and rollback the "${serviceName}" service to its previous version.\n\n${serverInfo}\n\nRollback "${serviceName}" to the previous image/version. Check docker images or deployment history. Verify the rollback works.\n`;

      case 'diagnose':
        return `SSH into the server and diagnose issues with the "${serviceName}" service.\n\n${serverInfo}\n\nService: ${serviceName} (${node.data.nodeType})\n` +
          (meta.description ? `Description: ${meta.description}\n` : '') +
          (meta.container?.ports?.length ? `Expected ports: ${meta.container.ports.join(', ')}\n` : '') +
          `\nDiagnostic steps:\n1. Check if the container is running (docker ps)\n2. Check recent logs for errors (docker logs)\n3. Check resource usage (docker stats)\n4. Check network connectivity to dependent services\n5. Check disk space and memory\n6. Summarize findings and suggest fixes\n`;

      case 'health':
        return `SSH into the server and check the health status of ALL deployed services.\n\n${serverInfo}\n\nRun docker ps (or equivalent) to list all running containers. For each service, check:\n1. Is it running?\n2. How long has it been up?\n3. Are ports mapped correctly?\n4. Any restart loops?\n\nGive a summary table of service health.\n`;

      case 'setup-monitoring':
        return `SSH into the server and set up monitoring for the deployed stack.\n\n${serverInfo}\n\n## Services to Monitor\n` +
          state.nodes.filter(n => n.type !== 'containerNode').map(n => {
            const m = state.nodeMetadata[n.id] || {};
            let line = `- ${n.data.label} (${n.data.nodeType})`;
            if (m.container?.ports?.length) line += ` [ports: ${m.container.ports.join(', ')}]`;
            return line;
          }).join('\n') +
          `\n\n## Instructions\n1. Install Prometheus and Grafana using Docker\n2. Configure Prometheus to scrape metrics from all services\n3. Set up a Grafana dashboard with service health, CPU, memory, and network panels\n4. Configure basic alerting rules (service down, high CPU, high memory)\n5. Expose Grafana on a port and provide the access URL\n`;

      default:
        return '';
    }
  },

  // Generate ARCHITECTURE.md content from current state
  generateArchitectureMd: () => {
    const state = get();
    const { projectName, projectDir, nodes, edges, nodeMetadata } = state;

    const relPath = (absPath) => {
      if (!absPath || !projectDir) return absPath || '';
      return absPath.startsWith(projectDir) ? '.' + absPath.slice(projectDir.length) : absPath;
    };

    let md = `# Architecture: ${projectName || 'Untitled'}\n\n`;
    md += `> Auto-generated by GK Architect. Do not edit manually.\n\n`;

    // Components table
    const componentNodes = nodes.filter((n) => n.type !== 'containerNode');
    if (componentNodes.length > 0) {
      md += `## Components\n\n`;
      md += `| Component | Type | Status | Directory |\n`;
      md += `|-----------|------|--------|-----------|\n`;
      for (const n of componentNodes) {
        const meta = nodeMetadata[n.id] || {};
        const typeLabel = NODE_TYPES[n.data.nodeType]?.label || n.data.nodeType;
        const status = meta.status || 'not_started';
        const dir = relPath(meta.directory);
        md += `| ${n.data.label} | ${typeLabel} | ${status} | ${dir} |\n`;
      }
      md += `\n`;
    }

    // Connections table
    if (edges.length > 0) {
      md += `## Connections\n\n`;
      md += `| From | To | Relationship |\n`;
      md += `|------|----|-------------|\n`;
      for (const e of edges) {
        const src = nodes.find((n) => n.id === e.source);
        const tgt = nodes.find((n) => n.id === e.target);
        md += `| ${src?.data.label || '?'} | ${tgt?.data.label || '?'} | ${e.label || 'data'} |\n`;
      }
      md += `\n`;
    }

    // Docker containers
    const containerNodes = nodes.filter((n) => n.type === 'containerNode');
    const nodesWithContainerMeta = nodes.filter((n) => nodeMetadata[n.id]?.container);
    if (containerNodes.length > 0 || nodesWithContainerMeta.length > 0) {
      md += `## Docker Services\n\n`;
      const shown = new Set();
      for (const n of [...containerNodes, ...nodesWithContainerMeta]) {
        if (shown.has(n.id)) continue;
        shown.add(n.id);
        const meta = nodeMetadata[n.id];
        const c = meta?.container;
        if (!c) continue;
        md += `### ${n.data.label}\n`;
        if (c.image) md += `- **Image:** ${c.image}\n`;
        if (c.build) md += `- **Build:** ${c.build}\n`;
        if (c.ports?.length) md += `- **Ports:** ${c.ports.join(', ')}\n`;
        if (c.volumes?.length) md += `- **Volumes:** ${c.volumes.join(', ')}\n`;
        if (c.dependsOn?.length) md += `- **Depends on:** ${c.dependsOn.join(', ')}\n`;
        md += `\n`;
      }
    }

    // Component details
    if (componentNodes.length > 0) {
      md += `## Component Details\n\n`;
      for (const n of componentNodes) {
        const meta = nodeMetadata[n.id] || {};
        const typeLabel = NODE_TYPES[n.data.nodeType]?.label || n.data.nodeType;
        md += `### ${n.data.label} (${typeLabel})\n`;
        if (meta.description) md += `${meta.description}\n\n`;
        if (meta.directory) md += `- **Directory:** ${relPath(meta.directory)}\n`;
        if (meta.files?.length) md += `- **Files:** ${meta.files.map(relPath).join(', ')}\n`;
        if (meta.buildPrompt) md += `- **Build instructions:** ${meta.buildPrompt}\n`;
        md += `\n`;
      }
    }

    return md;
  },

  // Serialize for save
  serialize: () => {
    const state = get();
    return {
      projectDir: state.projectDir,
      nodes: state.nodes,
      edges: state.edges,
      nodeMetadata: state.nodeMetadata,
      servers: state.servers,
      serviceHealth: state.serviceHealth,
    };
  },

  // Load from file
  deserialize: (data) => {
    if (!data) return;
    const maxId = (data.nodes || []).reduce((max, n) => {
      const num = parseInt(n.id.replace('node-', ''), 10);
      return num > max ? num : max;
    }, 0);
    nodeIdCounter = maxId + 1;

    const name = data.projectDir ? data.projectDir.split('/').pop() : null;
    set({
      projectDir: data.projectDir || null,
      projectName: name,
      nodes: data.nodes || [],
      edges: data.edges || [],
      nodeMetadata: data.nodeMetadata || {},
      servers: data.servers || [],
      serviceHealth: data.serviceHealth || {},
      selectedNodeIds: [],
    });
  },
})));

export { NODE_TYPES };
export default useStore;
