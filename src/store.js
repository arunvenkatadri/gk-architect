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

const ML_NODE_TYPES = {
  input: { label: 'Input', color: '#06b6d4', icon: 'In', category: 'io' },
  output: { label: 'Output', color: '#06b6d4', icon: 'Out', category: 'io' },
  dense: { label: 'Dense', color: '#8b5cf6', icon: 'D', category: 'core' },
  conv1d: { label: 'Conv1D', color: '#3b82f6', icon: 'C1', category: 'conv' },
  conv2d: { label: 'Conv2D', color: '#3b82f6', icon: 'C2', category: 'conv' },
  conv3d: { label: 'Conv3D', color: '#3b82f6', icon: 'C3', category: 'conv' },
  lstm: { label: 'LSTM', color: '#ec4899', icon: 'LS', category: 'recurrent' },
  gru: { label: 'GRU', color: '#ec4899', icon: 'GR', category: 'recurrent' },
  bidirectional: { label: 'Bidirectional', color: '#ec4899', icon: 'Bi', category: 'recurrent' },
  embedding: { label: 'Embedding', color: '#f59e0b', icon: 'Em', category: 'core' },
  multihead_attention: { label: 'MultiHead Attention', color: '#ef4444', icon: 'MH', category: 'transformer' },
  transformer_encoder: { label: 'Transformer Encoder', color: '#ef4444', icon: 'TE', category: 'transformer' },
  transformer_decoder: { label: 'Transformer Decoder', color: '#ef4444', icon: 'TD', category: 'transformer' },
  layer_norm: { label: 'LayerNorm', color: '#14b8a6', icon: 'LN', category: 'norm' },
  batch_norm: { label: 'BatchNorm', color: '#14b8a6', icon: 'BN', category: 'norm' },
  rms_norm: { label: 'RMSNorm', color: '#14b8a6', icon: 'RM', category: 'norm' },
  dropout: { label: 'Dropout', color: '#6b7280', icon: 'Dr', category: 'reg' },
  max_pool: { label: 'MaxPool', color: '#a855f7', icon: 'MP', category: 'pool' },
  avg_pool: { label: 'AvgPool', color: '#a855f7', icon: 'AP', category: 'pool' },
  global_avg_pool: { label: 'GlobalAvgPool', color: '#a855f7', icon: 'GA', category: 'pool' },
  flatten: { label: 'Flatten', color: '#78716c', icon: 'Fl', category: 'reshape' },
  reshape: { label: 'Reshape', color: '#78716c', icon: 'Rs', category: 'reshape' },
  concatenate: { label: 'Concatenate', color: '#78716c', icon: 'Ct', category: 'merge' },
  add: { label: 'Add', color: '#78716c', icon: '+', category: 'merge' },
  multiply: { label: 'Multiply', color: '#78716c', icon: '×', category: 'merge' },
  activation: { label: 'Activation', color: '#22c55e', icon: 'σ', category: 'core' },
  softmax: { label: 'Softmax', color: '#22c55e', icon: 'SM', category: 'core' },
  residual: { label: 'Residual Block', color: '#f97316', icon: 'Res', category: 'block' },
  ffn: { label: 'Feed Forward', color: '#f97316', icon: 'FF', category: 'block' },
  positional_encoding: { label: 'Positional Encoding', color: '#f59e0b', icon: 'PE', category: 'transformer' },
};

// Layer parameter schemas - defines what fields each ML layer type needs
const ML_LAYER_PARAMS = {
  input: { shape: { type: 'text', label: 'Shape', placeholder: '(None, 128)', default: '' }, dtype: { type: 'select', label: 'DType', options: ['float32', 'float16', 'int32', 'int64'], default: 'float32' } },
  output: { units: { type: 'number', label: 'Units', default: 10 }, activation: { type: 'select', label: 'Activation', options: ['softmax', 'sigmoid', 'linear', 'tanh'], default: 'softmax' } },
  dense: { units: { type: 'number', label: 'Units', default: 128 }, activation: { type: 'select', label: 'Activation', options: ['relu', 'gelu', 'swish', 'tanh', 'sigmoid', 'linear', 'selu', 'elu'], default: 'relu' }, use_bias: { type: 'boolean', label: 'Use Bias', default: true } },
  conv1d: { filters: { type: 'number', label: 'Filters', default: 64 }, kernel_size: { type: 'number', label: 'Kernel Size', default: 3 }, strides: { type: 'number', label: 'Strides', default: 1 }, padding: { type: 'select', label: 'Padding', options: ['valid', 'same', 'causal'], default: 'same' }, activation: { type: 'select', label: 'Activation', options: ['relu', 'gelu', 'swish', 'tanh', 'sigmoid', 'linear'], default: 'relu' } },
  conv2d: { filters: { type: 'number', label: 'Filters', default: 64 }, kernel_size: { type: 'number', label: 'Kernel Size', default: 3 }, strides: { type: 'number', label: 'Strides', default: 1 }, padding: { type: 'select', label: 'Padding', options: ['valid', 'same'], default: 'same' }, activation: { type: 'select', label: 'Activation', options: ['relu', 'gelu', 'swish', 'tanh', 'sigmoid', 'linear'], default: 'relu' } },
  conv3d: { filters: { type: 'number', label: 'Filters', default: 32 }, kernel_size: { type: 'number', label: 'Kernel Size', default: 3 }, strides: { type: 'number', label: 'Strides', default: 1 }, padding: { type: 'select', label: 'Padding', options: ['valid', 'same'], default: 'same' }, activation: { type: 'select', label: 'Activation', options: ['relu', 'gelu', 'linear'], default: 'relu' } },
  lstm: { units: { type: 'number', label: 'Units', default: 128 }, return_sequences: { type: 'boolean', label: 'Return Sequences', default: false }, dropout: { type: 'number', label: 'Dropout', default: 0.0 }, recurrent_dropout: { type: 'number', label: 'Recurrent Dropout', default: 0.0 } },
  gru: { units: { type: 'number', label: 'Units', default: 128 }, return_sequences: { type: 'boolean', label: 'Return Sequences', default: false }, dropout: { type: 'number', label: 'Dropout', default: 0.0 } },
  bidirectional: { layer_type: { type: 'select', label: 'Layer Type', options: ['LSTM', 'GRU'], default: 'LSTM' }, units: { type: 'number', label: 'Units', default: 128 }, return_sequences: { type: 'boolean', label: 'Return Sequences', default: false } },
  embedding: { input_dim: { type: 'number', label: 'Vocab Size', default: 10000 }, output_dim: { type: 'number', label: 'Embed Dim', default: 256 }, mask_zero: { type: 'boolean', label: 'Mask Zero', default: false } },
  multihead_attention: { num_heads: { type: 'number', label: 'Num Heads', default: 8 }, key_dim: { type: 'number', label: 'Key Dim', default: 64 }, value_dim: { type: 'number', label: 'Value Dim', default: 64 }, dropout: { type: 'number', label: 'Dropout', default: 0.0 } },
  transformer_encoder: { num_heads: { type: 'number', label: 'Num Heads', default: 8 }, key_dim: { type: 'number', label: 'Key Dim', default: 64 }, ff_dim: { type: 'number', label: 'FFN Dim', default: 2048 }, dropout: { type: 'number', label: 'Dropout', default: 0.1 }, num_layers: { type: 'number', label: 'Num Layers', default: 6 } },
  transformer_decoder: { num_heads: { type: 'number', label: 'Num Heads', default: 8 }, key_dim: { type: 'number', label: 'Key Dim', default: 64 }, ff_dim: { type: 'number', label: 'FFN Dim', default: 2048 }, dropout: { type: 'number', label: 'Dropout', default: 0.1 }, num_layers: { type: 'number', label: 'Num Layers', default: 6 } },
  layer_norm: { epsilon: { type: 'number', label: 'Epsilon', default: 0.00001 } },
  batch_norm: { momentum: { type: 'number', label: 'Momentum', default: 0.99 }, epsilon: { type: 'number', label: 'Epsilon', default: 0.001 } },
  rms_norm: { epsilon: { type: 'number', label: 'Epsilon', default: 0.00001 } },
  dropout: { rate: { type: 'number', label: 'Rate', default: 0.2 } },
  max_pool: { pool_size: { type: 'number', label: 'Pool Size', default: 2 }, strides: { type: 'number', label: 'Strides', default: 2 } },
  avg_pool: { pool_size: { type: 'number', label: 'Pool Size', default: 2 }, strides: { type: 'number', label: 'Strides', default: 2 } },
  global_avg_pool: {},
  flatten: {},
  reshape: { target_shape: { type: 'text', label: 'Target Shape', placeholder: '(16, 16, 64)', default: '' } },
  concatenate: { axis: { type: 'number', label: 'Axis', default: -1 } },
  add: {},
  multiply: {},
  activation: { function: { type: 'select', label: 'Function', options: ['relu', 'gelu', 'swish', 'tanh', 'sigmoid', 'softmax', 'elu', 'selu', 'leaky_relu'], default: 'relu' } },
  softmax: { axis: { type: 'number', label: 'Axis', default: -1 } },
  residual: { units: { type: 'number', label: 'Units', default: 256 }, activation: { type: 'select', label: 'Activation', options: ['relu', 'gelu', 'swish'], default: 'relu' }, dropout: { type: 'number', label: 'Dropout', default: 0.1 } },
  ffn: { dim: { type: 'number', label: 'Hidden Dim', default: 2048 }, activation: { type: 'select', label: 'Activation', options: ['relu', 'gelu', 'swish'], default: 'gelu' }, dropout: { type: 'number', label: 'Dropout', default: 0.1 } },
  positional_encoding: { max_len: { type: 'number', label: 'Max Length', default: 5000 }, d_model: { type: 'number', label: 'Model Dim', default: 512 } },
};

let nodeIdCounter = 1;

function generateLayerCall(layerType, params) {
  switch (layerType) {
    case 'dense': return `layers.Dense(${params.units || 128}, activation="${params.activation || 'relu'}"${params.use_bias === false ? ', use_bias=False' : ''})`;
    case 'conv1d': return `layers.Conv1D(${params.filters || 64}, ${params.kernel_size || 3}, strides=${params.strides || 1}, padding="${params.padding || 'same'}", activation="${params.activation || 'relu'}")`;
    case 'conv2d': return `layers.Conv2D(${params.filters || 64}, ${params.kernel_size || 3}, strides=${params.strides || 1}, padding="${params.padding || 'same'}", activation="${params.activation || 'relu'}")`;
    case 'conv3d': return `layers.Conv3D(${params.filters || 32}, ${params.kernel_size || 3}, strides=${params.strides || 1}, padding="${params.padding || 'same'}", activation="${params.activation || 'relu'}")`;
    case 'lstm': return `layers.LSTM(${params.units || 128}${params.return_sequences ? ', return_sequences=True' : ''}${params.dropout ? `, dropout=${params.dropout}` : ''})`;
    case 'gru': return `layers.GRU(${params.units || 128}${params.return_sequences ? ', return_sequences=True' : ''}${params.dropout ? `, dropout=${params.dropout}` : ''})`;
    case 'bidirectional': return `layers.Bidirectional(layers.${params.layer_type || 'LSTM'}(${params.units || 128}${params.return_sequences ? ', return_sequences=True' : ''}))`;
    case 'embedding': return `layers.Embedding(${params.input_dim || 10000}, ${params.output_dim || 256}${params.mask_zero ? ', mask_zero=True' : ''})`;
    case 'multihead_attention': return `layers.MultiHeadAttention(num_heads=${params.num_heads || 8}, key_dim=${params.key_dim || 64}${params.dropout ? `, dropout=${params.dropout}` : ''})`;
    case 'layer_norm': return `layers.LayerNormalization(epsilon=${params.epsilon || 1e-5})`;
    case 'batch_norm': return `layers.BatchNormalization(momentum=${params.momentum || 0.99}, epsilon=${params.epsilon || 0.001})`;
    case 'rms_norm': return `layers.LayerNormalization(epsilon=${params.epsilon || 1e-5})  # RMSNorm`;
    case 'dropout': return `layers.Dropout(${params.rate || 0.2})`;
    case 'max_pool': return `layers.MaxPooling2D(pool_size=${params.pool_size || 2}, strides=${params.strides || 2})`;
    case 'avg_pool': return `layers.AveragePooling2D(pool_size=${params.pool_size || 2}, strides=${params.strides || 2})`;
    case 'global_avg_pool': return `layers.GlobalAveragePooling2D()`;
    case 'flatten': return `layers.Flatten()`;
    case 'reshape': return `layers.Reshape(${params.target_shape || '(-1,)'})`;
    case 'concatenate': return `layers.Concatenate(axis=${params.axis || -1})`;
    case 'add': return `layers.Add()`;
    case 'multiply': return `layers.Multiply()`;
    case 'activation': return `layers.Activation("${params.function || 'relu'}")`;
    case 'softmax': return `layers.Softmax(axis=${params.axis || -1})`;
    case 'output': return `layers.Dense(${params.units || 10}, activation="${params.activation || 'softmax'}")`;
    case 'positional_encoding': return `PositionalEncoding(max_len=${params.max_len || 5000}, d_model=${params.d_model || 512})`;
    case 'residual': return `ResidualBlock(${params.units || 256}, activation="${params.activation || 'relu'}", dropout=${params.dropout || 0.1})`;
    case 'ffn': return `FeedForward(${params.dim || 2048}, activation="${params.activation || 'gelu'}", dropout=${params.dropout || 0.1})`;
    default: return `layers.Layer()  # ${layerType}`;
  }
}

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
    const typeInfo = NODE_TYPES[type] || ML_NODE_TYPES[type] || NODE_TYPES.generic;
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

  // Workspace mode: 'infra' or 'ml'
  workspaceMode: 'infra',
  setWorkspaceMode: (mode) => set({ workspaceMode: mode }),

  // ML training configuration
  trainingConfig: {
    optimizer: 'adam',
    learning_rate: 0.001,
    loss: 'categorical_crossentropy',
    metrics: ['accuracy'],
    batch_size: 32,
    epochs: 100,
    early_stopping: true,
    patience: 10,
    checkpoint: true,
    dataset: '',
    validation_split: 0.2,
  },
  setTrainingConfig: (config) => set((state) => ({
    trainingConfig: { ...state.trainingConfig, ...config },
  })),

  // Experiment tracking
  experiments: [],
  addExperiment: (experiment) => set((state) => ({
    experiments: [...state.experiments, { id: `exp-${Date.now()}`, timestamp: Date.now(), ...experiment }],
  })),
  clearExperiments: () => set({ experiments: [] }),

  // Persistent Agent Programs
  agentPrograms: {},
  // Shape: { [nodeId]: { id, nodeId, name, goal, metric, metricDirection, behavior, schedule, serverId, status, history, createdAt, lastRun } }

  createAgentProgram: (nodeId, program) => set((state) => ({
    agentPrograms: {
      ...state.agentPrograms,
      [nodeId]: {
        id: `agent-${Date.now()}`,
        nodeId,
        name: program.name || 'Agent',
        goal: program.goal || '',
        metric: program.metric || '',
        metricDirection: program.metricDirection || 'minimize',
        behavior: program.behavior || '',
        schedule: program.schedule || 'continuous', // 'continuous', 'hourly', 'daily', 'on_error'
        serverId: program.serverId || null,
        status: 'stopped', // 'stopped', 'running', 'paused', 'error'
        history: [],
        createdAt: Date.now(),
        lastRun: null,
      },
    },
  })),

  updateAgentProgram: (nodeId, updates) => set((state) => ({
    agentPrograms: {
      ...state.agentPrograms,
      [nodeId]: { ...state.agentPrograms[nodeId], ...updates },
    },
  })),

  removeAgentProgram: (nodeId) => set((state) => {
    const { [nodeId]: removed, ...rest } = state.agentPrograms;
    return { agentPrograms: rest };
  }),

  addAgentHistoryEntry: (nodeId, entry) => set((state) => {
    const agent = state.agentPrograms[nodeId];
    if (!agent) return {};
    return {
      agentPrograms: {
        ...state.agentPrograms,
        [nodeId]: {
          ...agent,
          history: [...agent.history, { id: `entry-${Date.now()}`, timestamp: Date.now(), ...entry }].slice(-100),
          lastRun: Date.now(),
        },
      },
    };
  }),

  // Generate the prompt for an agent's execution cycle
  getAgentRunContext: (nodeId) => {
    const state = get();
    const agent = state.agentPrograms[nodeId];
    const node = state.nodes.find(n => n.id === nodeId);
    const meta = state.nodeMetadata[nodeId] || {};
    const server = agent?.serverId ? state.servers.find(s => s.id === agent.serverId) : null;
    if (!agent || !node) return '';

    let prompt = `You are an autonomous agent managing "${node.data.label}".\n\n`;
    prompt += `## Agent Program\n`;
    prompt += `- **Goal:** ${agent.goal}\n`;
    prompt += `- **Metric:** ${agent.metric} (${agent.metricDirection})\n`;
    prompt += `- **Schedule:** ${agent.schedule}\n\n`;

    if (agent.behavior) {
      prompt += `## Behavior Instructions\n${agent.behavior}\n\n`;
    }

    if (server) {
      prompt += `## Target Server\n`;
      prompt += `- Host: ${server.user}@${server.host}:${server.port || 22}\n`;
      if (server.keyPath) prompt += `- SSH Key: ${server.keyPath}\n`;
      if (server.directory) prompt += `- Directory: ${server.directory}\n`;
      prompt += `\n`;
    }

    prompt += `## Component Details\n`;
    prompt += `- Name: ${node.data.label}\n`;
    prompt += `- Type: ${node.data.nodeType}\n`;
    if (meta.description) prompt += `- Description: ${meta.description}\n`;
    if (meta.directory) prompt += `- Directory: ${meta.directory}\n`;

    // ML layer params if applicable
    if (meta.layerParams) {
      prompt += `- Layer params: ${JSON.stringify(meta.layerParams)}\n`;
    }

    // Container info if applicable
    if (meta.container) {
      const c = meta.container;
      if (c.image) prompt += `- Docker image: ${c.image}\n`;
      if (c.ports?.length) prompt += `- Ports: ${c.ports.join(', ')}\n`;
    }
    prompt += `\n`;

    // Related connections
    const related = state.edges.filter(e => e.source === nodeId || e.target === nodeId);
    if (related.length > 0) {
      prompt += `## Connected Services\n`;
      for (const e of related) {
        const other = state.nodes.find(n => n.id === (e.source === nodeId ? e.target : e.source));
        const dir = e.source === nodeId ? '→' : '←';
        prompt += `- ${dir} ${other?.data.label}: ${e.label || 'data'}\n`;
      }
      prompt += `\n`;
    }

    // Recent history
    if (agent.history.length > 0) {
      const recent = agent.history.slice(-5);
      prompt += `## Recent History\n`;
      for (const h of recent) {
        prompt += `- [${new Date(h.timestamp).toLocaleString()}] ${h.action}: ${h.result || 'pending'}\n`;
      }
      prompt += `\n`;
    }

    prompt += `## Instructions\n`;
    prompt += `1. Assess the current state of this component\n`;
    prompt += `2. Check the metric (${agent.metric})\n`;
    prompt += `3. Execute one improvement cycle based on your goal\n`;
    prompt += `4. Report what you did and the metric result\n`;
    prompt += `5. If the change improved the metric, keep it. Otherwise revert.\n\n`;
    prompt += `See ARCHITECTURE.md in the project root for full system context.\n`;

    return prompt;
  },

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

  // Generate Keras model code from the ML architecture diagram
  generateModelCode: () => {
    const state = get();
    const { nodes, edges, nodeMetadata } = state;
    const mlNodes = nodes.filter(n => ML_NODE_TYPES[n.data.nodeType]);
    if (mlNodes.length === 0) return '';

    let code = `import keras\nfrom keras import layers, Model\nimport numpy as np\n\n`;

    // Topological sort for layer ordering
    const inDegree = {};
    const adj = {};
    for (const n of mlNodes) { inDegree[n.id] = 0; adj[n.id] = []; }
    for (const e of edges) {
      if (adj[e.source] && inDegree[e.target] !== undefined) {
        adj[e.source].push(e.target);
        inDegree[e.target]++;
      }
    }
    const queue = Object.keys(inDegree).filter(id => inDegree[id] === 0);
    const sorted = [];
    while (queue.length > 0) {
      const id = queue.shift();
      sorted.push(id);
      for (const next of (adj[id] || [])) {
        inDegree[next]--;
        if (inDegree[next] === 0) queue.push(next);
      }
    }
    // Add any remaining (cycles)
    for (const n of mlNodes) {
      if (!sorted.includes(n.id)) sorted.push(n.id);
    }

    code += `def build_model():\n`;

    // Generate layer variables
    const varNames = {};
    let varCounter = 0;
    for (const id of sorted) {
      const node = mlNodes.find(n => n.id === id);
      const meta = nodeMetadata[id] || {};
      const params = meta.layerParams || {};
      const layerType = node.data.nodeType;
      const varName = `x_${varCounter++}`;
      varNames[id] = varName;

      // Find inputs
      const inputEdges = edges.filter(e => e.target === id);
      const inputVars = inputEdges.map(e => varNames[e.source]).filter(Boolean);

      if (layerType === 'input') {
        const shape = params.shape || '(None, 128)';
        code += `    ${varName} = layers.Input(shape=${shape}, dtype="${params.dtype || 'float32'}")\n`;
      } else {
        const inputExpr = inputVars.length > 1 ? `[${inputVars.join(', ')}]` : inputVars[0] || 'x_0';
        code += `    ${varName} = ${generateLayerCall(layerType, params)}(${inputExpr})\n`;
      }
    }

    // Find input and output nodes
    const inputIds = sorted.filter(id => { const n = mlNodes.find(nn => nn.id === id); return n?.data.nodeType === 'input'; });
    const outputIds = sorted.filter(id => { const n = mlNodes.find(nn => nn.id === id); return (adj[id] || []).length === 0 && n?.data.nodeType !== 'input'; });

    const inputVarStr = inputIds.length > 1 ? `[${inputIds.map(id => varNames[id]).join(', ')}]` : varNames[inputIds[0]] || 'x_0';
    const outputVarStr = outputIds.length > 1 ? `[${outputIds.map(id => varNames[id]).join(', ')}]` : varNames[outputIds[outputIds.length - 1]] || `x_${varCounter - 1}`;

    code += `\n    model = Model(inputs=${inputVarStr}, outputs=${outputVarStr})\n`;
    code += `    return model\n`;

    return code;
  },

  // Generate training script
  generateTrainScript: () => {
    const state = get();
    const modelCode = state.generateModelCode();
    const tc = state.trainingConfig;

    let script = modelCode + '\n\n';
    script += `# Training Configuration\n`;
    script += `model = build_model()\n`;
    script += `model.compile(\n`;
    script += `    optimizer=keras.optimizers.${tc.optimizer.charAt(0).toUpperCase() + tc.optimizer.slice(1)}(learning_rate=${tc.learning_rate}),\n`;
    script += `    loss="${tc.loss}",\n`;
    script += `    metrics=${JSON.stringify(tc.metrics)},\n`;
    script += `)\n\n`;
    script += `model.summary()\n\n`;

    script += `# Callbacks\ncallbacks = []\n`;
    if (tc.early_stopping) {
      script += `callbacks.append(keras.callbacks.EarlyStopping(monitor="val_loss", patience=${tc.patience}, restore_best_weights=True))\n`;
    }
    if (tc.checkpoint) {
      script += `callbacks.append(keras.callbacks.ModelCheckpoint("best_model.keras", monitor="val_loss", save_best_only=True))\n`;
    }
    script += `callbacks.append(keras.callbacks.TensorBoard(log_dir="./logs"))\n\n`;

    script += `# TODO: Load your dataset here\n`;
    script += `# x_train, y_train, x_val, y_val = load_data()\n\n`;

    script += `# Train\n`;
    script += `# model.fit(\n`;
    script += `#     x_train, y_train,\n`;
    script += `#     validation_data=(x_val, y_val),\n`;
    script += `#     batch_size=${tc.batch_size},\n`;
    script += `#     epochs=${tc.epochs},\n`;
    script += `#     callbacks=callbacks,\n`;
    script += `# )\n`;

    return script;
  },

  // Generate autoresearch program.md
  generateProgramMd: () => {
    const state = get();
    const { nodes, edges, nodeMetadata, trainingConfig: tc } = state;
    const mlNodes = nodes.filter(n => ML_NODE_TYPES[n.data.nodeType]);
    if (mlNodes.length === 0) return '';

    let md = `# Research Program\n\n`;
    md += `## Objective\n`;
    md += `Optimize the model architecture for best validation performance.\n\n`;

    md += `## Base Architecture\n`;
    for (const n of mlNodes) {
      const meta = nodeMetadata[n.id] || {};
      const params = meta.layerParams || {};
      const paramStr = Object.entries(params).map(([k, v]) => `${k}=${v}`).join(', ');
      md += `- ${n.data.label}: ${n.data.nodeType}${paramStr ? ` (${paramStr})` : ''}\n`;
    }
    md += `\n`;

    md += `## Connections\n`;
    for (const e of edges) {
      const src = nodes.find(n => n.id === e.source);
      const tgt = nodes.find(n => n.id === e.target);
      if (src && tgt && ML_NODE_TYPES[src.data.nodeType] && ML_NODE_TYPES[tgt.data.nodeType]) {
        md += `- ${src.data.label} → ${tgt.data.label}\n`;
      }
    }
    md += `\n`;

    md += `## Training Config\n`;
    md += `- Optimizer: ${tc.optimizer} (lr=${tc.learning_rate})\n`;
    md += `- Loss: ${tc.loss}\n`;
    md += `- Batch size: ${tc.batch_size}\n`;
    md += `- Max epochs: ${tc.epochs}\n`;
    md += `- Early stopping: patience=${tc.patience}\n\n`;

    md += `## Experiment Budget\n`;
    md += `- Max 5 minutes per experiment\n`;
    md += `- Evaluation metric: val_loss (lower is better)\n`;
    md += `- Keep changes only if they improve the metric\n\n`;

    md += `## Research Directions\n`;
    md += `Explore the following modifications (one at a time):\n`;
    md += `1. Vary hidden dimensions (0.5x, 2x current values)\n`;
    md += `2. Try different activation functions (relu, gelu, swish)\n`;
    md += `3. Adjust dropout rates (0.0, 0.1, 0.2, 0.3)\n`;
    md += `4. Modify number of layers/heads\n`;
    md += `5. Try different learning rates (1e-4, 3e-4, 1e-3, 3e-3)\n`;
    md += `6. Experiment with learning rate schedules (cosine, linear warmup)\n`;
    md += `7. Try different normalization (LayerNorm, RMSNorm, BatchNorm)\n`;
    md += `8. Vary attention head count and dimensions\n`;
    md += `9. Test weight decay values\n`;
    md += `10. Explore architectural changes (skip connections, wider/deeper)\n`;

    return md;
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
      workspaceMode: state.workspaceMode,
      trainingConfig: state.trainingConfig,
      experiments: state.experiments,
      agentPrograms: state.agentPrograms,
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
      workspaceMode: data.workspaceMode || 'infra',
      trainingConfig: data.trainingConfig || {
        optimizer: 'adam',
        learning_rate: 0.001,
        loss: 'categorical_crossentropy',
        metrics: ['accuracy'],
        batch_size: 32,
        epochs: 100,
        early_stopping: true,
        patience: 10,
        checkpoint: true,
        dataset: '',
        validation_split: 0.2,
      },
      experiments: data.experiments || [],
      agentPrograms: data.agentPrograms || {},
    });
  },
})));

export { NODE_TYPES, ML_NODE_TYPES, ML_LAYER_PARAMS };
export default useStore;
