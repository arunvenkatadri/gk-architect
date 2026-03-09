import React, { useState, useMemo } from 'react';
import useStore, { NODE_TYPES } from '../store';

export default function OpsPanel({ onClose, sendToTerminal }) {
  const nodes = useStore((s) => s.nodes);
  const nodeMetadata = useStore((s) => s.nodeMetadata);
  const servers = useStore((s) => s.servers);
  const serviceHealth = useStore((s) => s.serviceHealth);
  const getOpsContext = useStore((s) => s.getOpsContext);

  const [selectedServer, setSelectedServer] = useState(servers[0]?.id || null);
  const [activeTab, setActiveTab] = useState('status'); // 'status' | 'actions' | 'monitoring'

  const deployableNodes = useMemo(() =>
    nodes.filter(n => n.type !== 'containerNode'),
    [nodes]
  );

  const handleOpsAction = (action, nodeId) => {
    if (!selectedServer) return;
    const ctx = getOpsContext(action, nodeId, selectedServer);
    if (ctx) {
      sendToTerminal(ctx);
      onClose();
    }
  };

  const handleGlobalAction = (action) => {
    if (!selectedServer) return;
    // For health and setup-monitoring, nodeId doesn't matter much but we pass first node
    const ctx = getOpsContext(action, deployableNodes[0]?.id, selectedServer);
    if (ctx) {
      sendToTerminal(ctx);
      onClose();
    }
  };

  const server = servers.find(s => s.id === selectedServer);
  const tabs = ['status', 'actions', 'monitoring'];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="w-[650px] max-h-[85vh] rounded-xl overflow-hidden flex flex-col"
           style={{ backgroundColor: 'var(--color-panel)', border: '1px solid var(--color-surface)' }}
           onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-surface)' }}>
          <div>
            <h2 className="text-lg font-semibold text-primary">Operations</h2>
            <p className="text-xs text-secondary mt-0.5">Monitor and manage deployed services</p>
          </div>
          <button onClick={onClose} className="text-secondary hover:text-primary text-xl">&times;</button>
        </div>

        {/* Server selector */}
        <div className="px-6 py-3" style={{ borderBottom: '1px solid var(--color-surface)' }}>
          {servers.length === 0 ? (
            <div className="text-sm text-secondary">No servers configured. Add one via the Servers button first.</div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-secondary">Server:</span>
              <select
                value={selectedServer || ''}
                onChange={e => setSelectedServer(e.target.value)}
                className="bg-canvas border border-surface rounded px-3 py-1.5 text-sm text-primary focus:outline-none focus:border-accent flex-1"
              >
                {servers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.user}@{s.host})</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex" style={{ borderBottom: '1px solid var(--color-surface)' }}>
          {tabs.map(tab => (
            <button key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2.5 text-xs font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'text-accent border-b-2 border-accent'
                  : 'text-secondary hover:text-primary'
              }`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'status' && (
            <div className="space-y-4">
              {/* Check All Health button */}
              <button
                onClick={() => handleGlobalAction('health')}
                disabled={!selectedServer}
                className="w-full px-4 py-3 rounded-lg text-sm font-semibold bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                Check All Services Health
              </button>

              {/* Service list with health indicators */}
              <div className="space-y-2">
                {deployableNodes.map(n => {
                  const ti = NODE_TYPES[n.data.nodeType] || NODE_TYPES.generic;
                  const health = serviceHealth[n.id];
                  const statusColor = health === 'healthy' ? '#10b981'
                    : health === 'unhealthy' ? '#ef4444'
                    : health === 'degraded' ? '#f59e0b'
                    : '#6b7280';
                  const statusLabel = health || 'unknown';
                  return (
                    <div key={n.id} className="flex items-center gap-3 bg-canvas/30 rounded-lg px-4 py-3 border border-surface">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: statusColor }} />
                      <span className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ backgroundColor: ti.color + '33', color: ti.color }}>
                        {ti.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-primary">{n.data.label}</div>
                        <div className="text-xs text-muted capitalize">{statusLabel}</div>
                      </div>
                      <button
                        onClick={() => handleOpsAction('diagnose', n.id)}
                        disabled={!selectedServer}
                        className="text-xs px-2.5 py-1 rounded bg-surface hover:bg-accent text-secondary hover:text-white transition-colors disabled:opacity-40">
                        Diagnose
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'actions' && (
            <div className="space-y-3">
              {deployableNodes.map(n => {
                const ti = NODE_TYPES[n.data.nodeType] || NODE_TYPES.generic;
                return (
                  <div key={n.id} className="bg-canvas/30 rounded-lg p-4 border border-surface">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ backgroundColor: ti.color + '33', color: ti.color }}>
                        {ti.icon}
                      </span>
                      <span className="text-sm font-medium text-primary">{n.data.label}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { action: 'logs', label: 'View Logs', style: 'bg-surface hover:bg-accent text-secondary hover:text-white' },
                        { action: 'restart', label: 'Restart', style: 'bg-amber-900/30 text-amber-400 hover:bg-amber-900/50' },
                        { action: 'stop', label: 'Stop', style: 'bg-red-900/30 text-red-400 hover:bg-red-900/50' },
                        { action: 'scale', label: 'Scale', style: 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' },
                        { action: 'rollback', label: 'Rollback', style: 'bg-purple-900/30 text-purple-400 hover:bg-purple-900/50' },
                        { action: 'diagnose', label: 'Diagnose', style: 'bg-green-900/30 text-green-400 hover:bg-green-900/50' },
                      ].map(({ action, label, style }) => (
                        <button key={action}
                          onClick={() => handleOpsAction(action, n.id)}
                          disabled={!selectedServer}
                          className={`px-2.5 py-1.5 rounded text-xs transition-colors disabled:opacity-40 ${style}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'monitoring' && (
            <div className="space-y-4">
              <div className="bg-canvas/30 rounded-lg p-5 border border-surface text-center">
                <div className="text-2xl mb-3">📊</div>
                <h3 className="text-sm font-semibold text-primary mb-2">Setup Monitoring Stack</h3>
                <p className="text-xs text-secondary mb-4">
                  Claude will install Prometheus + Grafana on your server,
                  configure service scraping, dashboards, and alerts.
                </p>
                <button
                  onClick={() => handleGlobalAction('setup-monitoring')}
                  disabled={!selectedServer}
                  className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                  Setup Prometheus + Grafana
                </button>
              </div>

              <div className="bg-canvas/30 rounded-lg p-4 border border-surface">
                <h4 className="text-xs font-medium text-primary mb-2">What gets configured:</h4>
                <ul className="space-y-1.5 text-xs text-secondary">
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-0.5">•</span>
                    <span>Prometheus container with scrape configs for all {deployableNodes.length} services</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-0.5">•</span>
                    <span>Grafana with pre-built dashboards (CPU, memory, network, uptime)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-0.5">•</span>
                    <span>Alert rules for service-down, high CPU, high memory, disk usage</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-0.5">•</span>
                    <span>Container metrics via cAdvisor</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
