import React, { useState, useEffect, useCallback } from 'react';
import useStore, { NODE_TYPES } from '../store';
import FileBrowser from './FileBrowser';
import AgentProgramEditor from './AgentProgramEditor';

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started', color: '#6b7280' },
  { value: 'in_progress', label: 'In Progress', color: '#f59e0b' },
  { value: 'built', label: 'Built', color: '#10b981' },
];

export default function NodePanel({ sendToTerminal }) {
  const selectedNodeIds = useStore((s) => s.selectedNodeIds);
  const nodes = useStore((s) => s.nodes);
  const nodeMetadata = useStore((s) => s.nodeMetadata);
  const updateNodeLabel = useStore((s) => s.updateNodeLabel);
  const updateNodeMetadata = useStore((s) => s.updateNodeMetadata);
  const deleteNode = useStore((s) => s.deleteNode);
  const deleteSelectedNodes = useStore((s) => s.deleteSelectedNodes);
  const setPanelOpen = useStore((s) => s.setPanelOpen);
  const getBuildContext = useStore((s) => s.getBuildContext);
  const agentPrograms = useStore((s) => s.agentPrograms);

  const [showAgentEditor, setShowAgentEditor] = useState(false);

  const isMultiSelect = selectedNodeIds.length > 1;
  const selectedNodeId = selectedNodeIds[0] || null;
  const node = nodes.find((n) => n.id === selectedNodeId);
  const meta = nodeMetadata[selectedNodeId];

  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [buildPrompt, setBuildPrompt] = useState('');
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    if (node) {
      setLabel(node.data.label);
      setDescription(meta?.description || '');
      setBuildPrompt(meta?.buildPrompt || '');
    }
  }, [selectedNodeId, node, meta]);

  const handleLabelChange = useCallback(
    (e) => {
      setLabel(e.target.value);
      updateNodeLabel(selectedNodeId, e.target.value);
    },
    [selectedNodeId, updateNodeLabel]
  );

  const handleDescriptionChange = useCallback(
    (e) => {
      setDescription(e.target.value);
      updateNodeMetadata(selectedNodeId, { description: e.target.value });
    },
    [selectedNodeId, updateNodeMetadata]
  );

  const handleBuildPromptChange = useCallback(
    (e) => {
      setBuildPrompt(e.target.value);
      updateNodeMetadata(selectedNodeId, { buildPrompt: e.target.value });
    },
    [selectedNodeId, updateNodeMetadata]
  );

  const handleStatusChange = useCallback(
    (status) => {
      updateNodeMetadata(selectedNodeId, { status });
    },
    [selectedNodeId, updateNodeMetadata]
  );

  const handleBuild = useCallback(() => {
    const context = getBuildContext(selectedNodeId);
    if (context) {
      sendToTerminal(context);
      updateNodeMetadata(selectedNodeId, { status: 'in_progress' });
    }
  }, [selectedNodeId, getBuildContext, sendToTerminal, updateNodeMetadata]);

  const handleDelete = useCallback(() => {
    deleteNode(selectedNodeId);
    setPanelOpen(false);
  }, [selectedNodeId, deleteNode, setPanelOpen]);

  const handleAddFiles = useCallback(async () => {
    if (window.electronAPI) {
      const files = await window.electronAPI.fs.selectFiles();
      if (files.length > 0) {
        updateNodeMetadata(selectedNodeId, {
          files: [...(meta?.files || []), ...files],
        });
      }
    }
  }, [selectedNodeId, meta, updateNodeMetadata]);

  const handleSetDirectory = useCallback(async () => {
    if (window.electronAPI) {
      const dir = await window.electronAPI.fs.selectDirectory();
      if (dir) {
        updateNodeMetadata(selectedNodeId, { directory: dir });
      }
    }
  }, [selectedNodeId, updateNodeMetadata]);

  const handleRemoveFile = useCallback(
    (filePath) => {
      updateNodeMetadata(selectedNodeId, {
        files: (meta?.files || []).filter((f) => f !== filePath),
      });
    },
    [selectedNodeId, meta, updateNodeMetadata]
  );

  // Multi-select summary view
  if (isMultiSelect) {
    const selectedNodes = nodes.filter((n) => selectedNodeIds.includes(n.id));
    return (
      <div className="w-80 bg-panel border-l border-surface flex flex-col overflow-hidden shrink-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface">
          <span className="text-sm font-medium">{selectedNodeIds.length} nodes selected</span>
          <button
            onClick={() => setPanelOpen(false)}
            className="text-gray-400 hover:text-white text-lg leading-none"
          >
            &times;
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {selectedNodes.map((n) => {
            const ti = NODE_TYPES[n.data.nodeType] || NODE_TYPES.generic;
            return (
              <div key={n.id} className="flex items-center gap-2 bg-canvas/50 rounded px-3 py-2">
                <span
                  className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ backgroundColor: ti.color }}
                >
                  {ti.icon}
                </span>
                <span className="text-sm text-white truncate">{n.data.label}</span>
              </div>
            );
          })}
          <button
            onClick={() => {
              deleteSelectedNodes();
              setPanelOpen(false);
            }}
            className="w-full px-3 py-2 rounded text-xs bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors mt-4"
          >
            Delete {selectedNodeIds.length} Components
          </button>
        </div>
      </div>
    );
  }

  if (!node || !meta) return null;

  const typeInfo = NODE_TYPES[node.data.nodeType] || NODE_TYPES.generic;
  const hasContainer = !!meta?.container;
  const tabs = ['details', ...(hasContainer ? ['container'] : []), 'files', 'build'];

  return (
    <div className="w-80 bg-panel border-l border-surface flex flex-col overflow-hidden shrink-0">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface">
        <div className="flex items-center gap-2">
          <span
            className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold"
            style={{ backgroundColor: typeInfo.color }}
          >
            {typeInfo.icon}
          </span>
          <span className="text-sm font-medium">{typeInfo.label}</span>
        </div>
        <button
          onClick={() => setPanelOpen(false)}
          className="text-gray-400 hover:text-white text-lg leading-none"
        >
          &times;
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2 text-xs font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-accent border-b-2 border-accent'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'details' && (
          <>
            {/* Name */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">Name</label>
              <input
                type="text"
                value={label}
                onChange={handleLabelChange}
                className="w-full bg-canvas border border-surface rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">Description</label>
              <textarea
                value={description}
                onChange={handleDescriptionChange}
                rows={4}
                placeholder="Describe what this component does, its responsibilities, tech stack, etc..."
                className="w-full bg-canvas border border-surface rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent resize-none"
              />
            </div>

            {/* Status */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">Status</label>
              <div className="flex gap-1">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleStatusChange(opt.value)}
                    className={`flex-1 px-2 py-1.5 rounded text-xs transition-all ${
                      meta.status === opt.value
                        ? 'ring-1 ring-white/30 brightness-125'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: opt.color + '30', color: opt.color }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Agent Program */}
            <div>
              <button
                onClick={() => setShowAgentEditor(true)}
                className={`w-full px-3 py-2 rounded text-xs transition-colors ${
                  agentPrograms[selectedNodeId]
                    ? 'bg-purple-900/30 text-purple-400 border border-purple-800/50 hover:bg-purple-900/50'
                    : 'bg-surface text-gray-400 hover:bg-accent hover:text-white'
                }`}
              >
                {agentPrograms[selectedNodeId] ? `Agent: ${agentPrograms[selectedNodeId].name} (${agentPrograms[selectedNodeId].status})` : '+ Attach Agent Program'}
              </button>
            </div>

            {/* Delete */}
            <button
              onClick={handleDelete}
              className="w-full px-3 py-2 rounded text-xs bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors mt-4"
            >
              Delete Component
            </button>
          </>
        )}

        {activeTab === 'container' && meta.container && (
          <>
            {meta.container.image && (
              <div>
                <label className="text-xs text-gray-400 block mb-1">Image</label>
                <div className="bg-canvas/50 rounded px-3 py-2 text-sm text-white font-mono">
                  {meta.container.image}
                </div>
              </div>
            )}

            {meta.container.build && (
              <div>
                <label className="text-xs text-gray-400 block mb-1">Build Context</label>
                <div className="bg-canvas/50 rounded px-3 py-2 text-sm text-white font-mono">
                  {meta.container.build}
                </div>
              </div>
            )}

            {meta.container.ports?.length > 0 && (
              <div>
                <label className="text-xs text-gray-400 block mb-1">Ports</label>
                <div className="space-y-1">
                  {meta.container.ports.map((p, i) => (
                    <div key={i} className="bg-canvas/50 rounded px-3 py-1.5 text-xs font-mono" style={{ color: '#f97316' }}>
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {meta.container.volumes?.length > 0 && (
              <div>
                <label className="text-xs text-gray-400 block mb-1">Volumes</label>
                <div className="space-y-1">
                  {meta.container.volumes.map((v, i) => (
                    <div key={i} className="bg-canvas/50 rounded px-3 py-1.5 text-xs text-gray-300 font-mono truncate">
                      {v}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {meta.container.env?.length > 0 && (
              <div>
                <label className="text-xs text-gray-400 block mb-1">Environment Variables</label>
                <div className="space-y-1">
                  {meta.container.env.map((e, i) => (
                    <div key={i} className="bg-canvas/50 rounded px-3 py-1.5 text-xs text-gray-300 font-mono truncate">
                      {e}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {meta.container.dependsOn?.length > 0 && (
              <div>
                <label className="text-xs text-gray-400 block mb-1">Depends On</label>
                <div className="flex flex-wrap gap-1">
                  {meta.container.dependsOn.map((d, i) => (
                    <span key={i} className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'rgba(249, 115, 22, 0.15)', color: '#f97316' }}>
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'files' && (
          <>
            {/* Directory */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">Working Directory</label>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={meta.directory || ''}
                  onChange={(e) =>
                    updateNodeMetadata(selectedNodeId, { directory: e.target.value })
                  }
                  placeholder="/path/to/component"
                  className="flex-1 bg-canvas border border-surface rounded px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-accent"
                />
                <button
                  onClick={handleSetDirectory}
                  className="px-2 py-1.5 text-xs rounded bg-surface hover:bg-accent transition-colors"
                >
                  Browse
                </button>
              </div>
            </div>

            {/* Associated files */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-gray-400">Associated Files</label>
                <button
                  onClick={handleAddFiles}
                  className="text-xs text-accent hover:text-accent-hover"
                >
                  + Add Files
                </button>
              </div>

              {meta.files && meta.files.length > 0 ? (
                <div className="space-y-1">
                  {meta.files.map((file) => (
                    <div
                      key={file}
                      className="flex items-center gap-2 bg-canvas/50 rounded px-2 py-1.5 group"
                    >
                      <span className="text-xs text-gray-300 truncate flex-1">{file.split('/').pop()}</span>
                      <span className="text-[10px] text-gray-600 truncate max-w-[100px]">{file}</span>
                      <button
                        onClick={() => handleRemoveFile(file)}
                        className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 text-xs"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-gray-600 py-4 text-center">
                  No files associated yet
                </div>
              )}
            </div>

            {/* File browser */}
            {meta.directory && <FileBrowser directory={meta.directory} />}
          </>
        )}

        {activeTab === 'build' && (
          <>
            {/* Build prompt */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">
                Additional Build Instructions
              </label>
              <textarea
                value={buildPrompt}
                onChange={handleBuildPromptChange}
                rows={4}
                placeholder="Any extra instructions for Claude when building this component..."
                className="w-full bg-canvas border border-surface rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent resize-none"
              />
            </div>

            {/* Context preview */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">Build Context Preview</label>
              <pre className="bg-canvas/50 rounded p-3 text-xs text-gray-300 whitespace-pre-wrap max-h-40 overflow-y-auto">
                {getBuildContext(selectedNodeId) || 'No context generated yet. Add a description first.'}
              </pre>
            </div>

            {/* Build button */}
            <button
              onClick={handleBuild}
              className="w-full px-4 py-3 rounded-lg text-sm font-semibold bg-accent hover:bg-accent-hover transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Build with Claude
            </button>
          </>
        )}
      </div>

      {showAgentEditor && selectedNodeId && (
        <AgentProgramEditor
          nodeId={selectedNodeId}
          onClose={() => setShowAgentEditor(false)}
          sendToTerminal={sendToTerminal}
        />
      )}
    </div>
  );
}
