import React, { useState, useEffect, useCallback, useMemo } from 'react';
import useStore from '../store';

export default function EdgePanel({ sendToTerminal }) {
  const selectedEdgeId = useStore((s) => s.selectedEdgeId);
  const edges = useStore((s) => s.edges);
  const nodes = useStore((s) => s.nodes);
  const nodeMetadata = useStore((s) => s.nodeMetadata);
  const setEdges = useStore((s) => s.setEdges);
  const deleteEdge = useStore((s) => s.deleteEdge);
  const setPanelOpen = useStore((s) => s.setPanelOpen);
  const getEdgeBuildContext = useStore((s) => s.getEdgeBuildContext);

  const edge = edges.find((e) => e.id === selectedEdgeId);
  const sourceNode = edge ? nodes.find((n) => n.id === edge.source) : null;
  const targetNode = edge ? nodes.find((n) => n.id === edge.target) : null;
  const sourceMeta = edge ? nodeMetadata[edge.source] : null;
  const targetMeta = edge ? nodeMetadata[edge.target] : null;

  const [label, setLabel] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (edge) {
      setLabel(edge.label || '');
      setNotes(edge.data?.notes || '');
    }
  }, [selectedEdgeId, edge]);

  const handleLabelChange = useCallback(
    (e) => {
      const val = e.target.value;
      setLabel(val);
      setEdges(
        edges.map((ed) =>
          ed.id === selectedEdgeId
            ? { ...ed, label: val, data: { ...ed.data, label: val } }
            : ed
        )
      );
    },
    [selectedEdgeId, edges, setEdges]
  );

  const handleNotesChange = useCallback(
    (e) => {
      const val = e.target.value;
      setNotes(val);
      setEdges(
        edges.map((ed) =>
          ed.id === selectedEdgeId
            ? { ...ed, data: { ...ed.data, notes: val } }
            : ed
        )
      );
    },
    [selectedEdgeId, edges, setEdges]
  );

  const handleDelete = useCallback(() => {
    deleteEdge(selectedEdgeId);
    setPanelOpen(false);
  }, [selectedEdgeId, deleteEdge, setPanelOpen]);

  if (!edge || !sourceNode || !targetNode) return null;

  return (
    <div className="w-80 bg-panel border-l border-surface flex flex-col overflow-hidden shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface">
        <div className="flex items-center gap-2">
          <span className="text-accent text-sm">&harr;</span>
          <span className="text-sm font-medium">Connection</span>
        </div>
        <button
          onClick={() => setPanelOpen(false)}
          className="text-gray-400 hover:text-white text-lg leading-none"
        >
          &times;
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Visual: Source -> Target */}
        <div className="bg-canvas/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span
              className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
              style={{ backgroundColor: sourceNode.data.color }}
            >
              {sourceNode.data.icon}
            </span>
            <span className="text-sm font-medium text-white">{sourceNode.data.label}</span>
          </div>
          {sourceMeta?.description && (
            <div className="text-[11px] text-gray-500 pl-7 line-clamp-2">{sourceMeta.description}</div>
          )}

          <div className="flex items-center gap-2 pl-2">
            <span className="text-accent text-xs">&darr;</span>
            <span className="text-xs text-accent font-medium">{label || 'data'}</span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
              style={{ backgroundColor: targetNode.data.color }}
            >
              {targetNode.data.icon}
            </span>
            <span className="text-sm font-medium text-white">{targetNode.data.label}</span>
          </div>
          {targetMeta?.description && (
            <div className="text-[11px] text-gray-500 pl-7 line-clamp-2">{targetMeta.description}</div>
          )}
        </div>

        {/* Data Label */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">Data / Relationship</label>
          <input
            type="text"
            value={label}
            onChange={handleLabelChange}
            placeholder="e.g., HTTP requests, event stream, queries..."
            className="w-full bg-canvas border border-surface rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={handleNotesChange}
            rows={4}
            placeholder="Describe the data format, protocol, auth, payload structure..."
            className="w-full bg-canvas border border-surface rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent resize-none"
          />
        </div>

        {/* Quick info */}
        <div className="bg-canvas/30 rounded p-3 space-y-1">
          <div className="text-xs text-gray-400 font-medium mb-2">Connection Details</div>
          <div className="text-xs text-gray-500">
            <span className="text-gray-400">Source:</span> {sourceNode.data.label} ({sourceNode.data.nodeType})
          </div>
          <div className="text-xs text-gray-500">
            <span className="text-gray-400">Target:</span> {targetNode.data.label} ({targetNode.data.nodeType})
          </div>
          {sourceMeta?.directory && (
            <div className="text-xs text-gray-600 truncate">
              <span className="text-gray-500">From:</span> {sourceMeta.directory}
            </div>
          )}
          {targetMeta?.directory && (
            <div className="text-xs text-gray-600 truncate">
              <span className="text-gray-500">To:</span> {targetMeta.directory}
            </div>
          )}
        </div>

        {/* Build Connection */}
        <div className="space-y-2">
          <div className="text-xs text-gray-400 font-medium">Build Context Preview</div>
          <pre className="text-[11px] text-gray-500 bg-canvas/50 rounded p-2 whitespace-pre-wrap max-h-40 overflow-y-auto font-mono">
            {selectedEdgeId ? getEdgeBuildContext(selectedEdgeId) : ''}
          </pre>
          <button
            onClick={() => {
              if (!selectedEdgeId || !sendToTerminal) return;
              const context = getEdgeBuildContext(selectedEdgeId);
              if (context) {
                sendToTerminal(context);
              }
            }}
            disabled={!sendToTerminal}
            className="w-full px-3 py-2 rounded text-xs bg-accent/20 text-accent hover:bg-accent/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
          >
            Build Connection
          </button>
        </div>

        {/* Delete */}
        <button
          onClick={handleDelete}
          className="w-full px-3 py-2 rounded text-xs bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors"
        >
          Delete Connection
        </button>
      </div>
    </div>
  );
}
