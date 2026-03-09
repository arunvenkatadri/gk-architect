import React, { useState, useMemo } from 'react';
import useStore, { NODE_TYPES } from '../store';

export default function DeployPanel({ onClose, sendToTerminal }) {
  const nodes = useStore((s) => s.nodes);
  const nodeMetadata = useStore((s) => s.nodeMetadata);
  const servers = useStore((s) => s.servers);
  const getDeployContext = useStore((s) => s.getDeployContext);
  const getServiceDeployContext = useStore((s) => s.getServiceDeployContext);
  const updateNodeMetadata = useStore((s) => s.updateNodeMetadata);

  const [selectedServer, setSelectedServer] = useState(servers[0]?.id || null);
  const [showPreview, setShowPreview] = useState(false);

  const deployableNodes = useMemo(() =>
    nodes.filter(n => n.type !== 'containerNode'),
    [nodes]
  );

  const deployContext = useMemo(() => {
    if (!selectedServer) return '';
    return getDeployContext(selectedServer);
  }, [selectedServer, getDeployContext]);

  const handleDeployAll = () => {
    if (!selectedServer || !deployContext) return;
    sendToTerminal(deployContext);
    // Mark all as in_progress
    for (const n of deployableNodes) {
      updateNodeMetadata(n.id, { status: 'in_progress' });
    }
    onClose();
  };

  const handleDeployService = (nodeId) => {
    if (!selectedServer) return;
    const ctx = getServiceDeployContext(nodeId, selectedServer);
    if (ctx) {
      sendToTerminal(ctx);
      updateNodeMetadata(nodeId, { status: 'in_progress' });
      onClose();
    }
  };

  const server = servers.find(s => s.id === selectedServer);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="w-[600px] max-h-[85vh] rounded-xl overflow-hidden flex flex-col"
           style={{ backgroundColor: 'var(--color-panel)', border: '1px solid var(--color-surface)' }}
           onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-surface)' }}>
          <div>
            <h2 className="text-lg font-semibold text-primary">Deploy Architecture</h2>
            <p className="text-xs text-secondary mt-0.5">Claude will SSH into your server and deploy everything</p>
          </div>
          <button onClick={onClose} className="text-secondary hover:text-primary text-xl">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Server selection */}
          <div>
            <label className="text-xs text-secondary block mb-2">Target Server</label>
            {servers.length === 0 ? (
              <div className="bg-canvas/50 rounded-lg p-4 text-center border border-dashed border-surface">
                <p className="text-secondary text-sm">No servers configured.</p>
                <p className="text-muted text-xs mt-1">Add a server in Server Manager first.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {servers.map(s => (
                  <button key={s.id}
                    onClick={() => setSelectedServer(s.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                      selectedServer === s.id
                        ? 'border-accent bg-accent/10'
                        : 'border-surface bg-canvas/30 hover:border-accent/30'
                    }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-primary">{s.name}</span>
                      {selectedServer === s.id && <span className="text-accent text-xs">Selected</span>}
                    </div>
                    <div className="text-xs text-secondary font-mono mt-1">{s.user}@{s.host}:{s.port || 22}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Services list */}
          {selectedServer && (
            <div>
              <label className="text-xs text-secondary block mb-2">Services ({deployableNodes.length})</label>
              <div className="space-y-1.5">
                {deployableNodes.map(n => {
                  const meta = nodeMetadata[n.id] || {};
                  const ti = NODE_TYPES[n.data.nodeType] || NODE_TYPES.generic;
                  return (
                    <div key={n.id} className="flex items-center gap-3 bg-canvas/30 rounded-lg px-3 py-2.5 border border-surface">
                      <span className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ backgroundColor: ti.color + '33', color: ti.color }}>
                        {ti.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-primary truncate">{n.data.label}</div>
                        {meta.description && <div className="text-xs text-muted truncate">{meta.description}</div>}
                      </div>
                      <button onClick={() => handleDeployService(n.id)}
                        className="text-xs px-3 py-1.5 rounded bg-surface hover:bg-accent text-secondary hover:text-white transition-colors shrink-0">
                        Deploy
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Deploy context preview */}
          {selectedServer && (
            <div>
              <button onClick={() => setShowPreview(!showPreview)}
                className="text-xs text-secondary hover:text-accent transition-colors mb-2">
                {showPreview ? '\u25BC' : '\u25B6'} Preview Deploy Prompt
              </button>
              {showPreview && (
                <pre className="bg-canvas/50 rounded-lg p-3 text-xs text-secondary whitespace-pre-wrap max-h-48 overflow-y-auto border border-surface">
                  {deployContext}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedServer && (
          <div className="px-6 py-4" style={{ borderTop: '1px solid var(--color-surface)' }}>
            <button onClick={handleDeployAll}
              className="w-full px-4 py-3 rounded-lg text-sm font-semibold bg-accent hover:bg-accent-hover transition-all hover:scale-[1.02] active:scale-[0.98]">
              Deploy All to {server?.name}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
