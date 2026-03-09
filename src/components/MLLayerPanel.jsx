import React, { useState, useCallback } from 'react';
import useStore, { ML_NODE_TYPES, ML_LAYER_PARAMS } from '../store';
import AgentProgramEditor from './AgentProgramEditor';

export default function MLLayerPanel() {
  const selectedNodeIds = useStore((s) => s.selectedNodeIds);
  const nodes = useStore((s) => s.nodes);
  const nodeMetadata = useStore((s) => s.nodeMetadata);
  const updateNodeMetadata = useStore((s) => s.updateNodeMetadata);
  const updateNodeLabel = useStore((s) => s.updateNodeLabel);
  const deleteNode = useStore((s) => s.deleteNode);
  const setPanelOpen = useStore((s) => s.setPanelOpen);
  const agentPrograms = useStore((s) => s.agentPrograms);

  const [showAgentEditor, setShowAgentEditor] = useState(false);

  const selectedNodeId = selectedNodeIds[0];
  const node = nodes.find(n => n.id === selectedNodeId);
  const meta = nodeMetadata[selectedNodeId] || {};

  if (!node) return null;

  const layerType = node.data.nodeType;
  const typeInfo = ML_NODE_TYPES[layerType];
  if (!typeInfo) return null; // Not an ML node

  const paramSchema = ML_LAYER_PARAMS[layerType] || {};
  const layerParams = meta.layerParams || {};

  const handleParamChange = useCallback((key, value) => {
    const newParams = { ...layerParams, [key]: value };
    updateNodeMetadata(selectedNodeId, { layerParams: newParams });
  }, [selectedNodeId, layerParams, updateNodeMetadata]);

  const handleLabelChange = useCallback((e) => {
    updateNodeLabel(selectedNodeId, e.target.value);
  }, [selectedNodeId, updateNodeLabel]);

  const handleDelete = useCallback(() => {
    deleteNode(selectedNodeId);
    setPanelOpen(false);
  }, [selectedNodeId, deleteNode, setPanelOpen]);

  return (
    <div className="w-80 bg-panel border-l border-surface flex flex-col overflow-hidden shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: typeInfo.color + '33', color: typeInfo.color }}>
            {typeInfo.icon}
          </span>
          <span className="text-sm font-medium text-primary">{typeInfo.label}</span>
        </div>
        <button onClick={() => setPanelOpen(false)}
          className="text-secondary hover:text-primary text-lg leading-none">&times;</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Layer name */}
        <div>
          <label className="text-xs text-secondary block mb-1">Layer Name</label>
          <input type="text" value={node.data.label}
            onChange={handleLabelChange}
            className="w-full bg-canvas border border-surface rounded px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent" />
        </div>

        {/* Layer parameters */}
        {Object.entries(paramSchema).length > 0 && (
          <div>
            <label className="text-xs text-secondary block mb-2">Parameters</label>
            <div className="space-y-3">
              {Object.entries(paramSchema).map(([key, schema]) => {
                const value = layerParams[key] !== undefined ? layerParams[key] : schema.default;

                if (schema.type === 'number') {
                  return (
                    <div key={key}>
                      <label className="text-xs text-muted block mb-1">{schema.label}</label>
                      <input type="number" value={value}
                        onChange={e => handleParamChange(key, parseFloat(e.target.value) || 0)}
                        step={value < 1 ? 0.01 : 1}
                        className="w-full bg-canvas border border-surface rounded px-3 py-1.5 text-sm text-primary focus:outline-none focus:border-accent" />
                    </div>
                  );
                }

                if (schema.type === 'text') {
                  return (
                    <div key={key}>
                      <label className="text-xs text-muted block mb-1">{schema.label}</label>
                      <input type="text" value={value}
                        onChange={e => handleParamChange(key, e.target.value)}
                        placeholder={schema.placeholder || ''}
                        className="w-full bg-canvas border border-surface rounded px-3 py-1.5 text-sm text-primary font-mono focus:outline-none focus:border-accent" />
                    </div>
                  );
                }

                if (schema.type === 'select') {
                  return (
                    <div key={key}>
                      <label className="text-xs text-muted block mb-1">{schema.label}</label>
                      <select value={value}
                        onChange={e => handleParamChange(key, e.target.value)}
                        className="w-full bg-canvas border border-surface rounded px-3 py-1.5 text-sm text-primary focus:outline-none focus:border-accent">
                        {schema.options.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  );
                }

                if (schema.type === 'boolean') {
                  return (
                    <div key={key} className="flex items-center justify-between">
                      <label className="text-xs text-muted">{schema.label}</label>
                      <button
                        onClick={() => handleParamChange(key, !value)}
                        className={`w-10 h-5 rounded-full transition-colors relative ${
                          value ? 'bg-accent' : 'bg-surface'
                        }`}>
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                          value ? 'translate-x-5' : 'translate-x-0.5'
                        }`} />
                      </button>
                    </div>
                  );
                }

                return null;
              })}
            </div>
          </div>
        )}

        {/* Tensor shape info */}
        <div>
          <label className="text-xs text-secondary block mb-1">Notes</label>
          <textarea
            value={meta.description || ''}
            onChange={e => updateNodeMetadata(selectedNodeId, { description: e.target.value })}
            rows={3}
            placeholder="Notes about this layer..."
            className="w-full bg-canvas border border-surface rounded px-3 py-2 text-sm text-primary placeholder-gray-600 focus:outline-none focus:border-accent resize-none" />
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
        <button onClick={handleDelete}
          className="w-full px-3 py-2 rounded text-xs bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors mt-4">
          Delete Layer
        </button>
      </div>

      {showAgentEditor && selectedNodeId && (
        <AgentProgramEditor
          nodeId={selectedNodeId}
          onClose={() => setShowAgentEditor(false)}
        />
      )}
    </div>
  );
}
