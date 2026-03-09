import React, { useState, useMemo } from 'react';
import useStore, { NODE_TYPES, ML_NODE_TYPES } from '../store';

export default function AgentDashboard({ onClose, sendToTerminal }) {
  const nodes = useStore((s) => s.nodes);
  const agentPrograms = useStore((s) => s.agentPrograms);
  const servers = useStore((s) => s.servers);
  const updateAgentProgram = useStore((s) => s.updateAgentProgram);
  const getAgentRunContext = useStore((s) => s.getAgentRunContext);

  const agents = useMemo(() => {
    return Object.values(agentPrograms).map(agent => {
      const node = nodes.find(n => n.id === agent.nodeId);
      const server = agent.serverId ? servers.find(s => s.id === agent.serverId) : null;
      return { ...agent, node, server };
    });
  }, [agentPrograms, nodes, servers]);

  const runningCount = agents.filter(a => a.status === 'running').length;
  const totalRuns = agents.reduce((sum, a) => sum + a.history.length, 0);

  const handleRunAgent = (nodeId) => {
    updateAgentProgram(nodeId, { status: 'running' });
    const ctx = getAgentRunContext(nodeId);
    if (ctx && sendToTerminal) {
      sendToTerminal(ctx);
    }
  };

  const handlePauseAgent = (nodeId) => {
    updateAgentProgram(nodeId, { status: 'paused' });
  };

  const handleStopAgent = (nodeId) => {
    updateAgentProgram(nodeId, { status: 'stopped' });
  };

  const statusColors = {
    running: '#10b981',
    paused: '#f59e0b',
    stopped: '#6b7280',
    error: '#ef4444',
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="w-[750px] max-h-[85vh] rounded-xl overflow-hidden flex flex-col"
           style={{ backgroundColor: 'var(--color-panel)', border: '1px solid var(--color-surface)' }}
           onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-surface)' }}>
          <div>
            <h2 className="text-lg font-semibold text-primary">Agent Dashboard</h2>
            <p className="text-xs text-secondary mt-0.5">
              {agents.length} agent{agents.length !== 1 ? 's' : ''} configured
              {runningCount > 0 && <span className="text-green-400 ml-2">({runningCount} running)</span>}
              {totalRuns > 0 && <span className="text-muted ml-2">· {totalRuns} total runs</span>}
            </p>
          </div>
          <button onClick={onClose} className="text-secondary hover:text-primary text-xl">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {agents.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-3xl mb-3">🤖</div>
              <h3 className="text-sm font-semibold text-primary mb-2">No Agents Configured</h3>
              <p className="text-xs text-secondary max-w-sm mx-auto">
                Select a node on the canvas, then click "Agent" in the panel to create
                a persistent agent program that continuously monitors and improves that component.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {agents.map(agent => {
                const allTypes = { ...NODE_TYPES, ...ML_NODE_TYPES };
                const ti = allTypes[agent.node?.data.nodeType] || NODE_TYPES.generic;
                return (
                  <div key={agent.id} className="bg-canvas/30 rounded-lg border border-surface overflow-hidden">
                    {/* Agent header */}
                    <div className="px-4 py-3 flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse"
                           style={{ backgroundColor: statusColors[agent.status], animationDuration: agent.status === 'running' ? '1.5s' : '0s' }} />
                      <span className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ backgroundColor: ti.color + '33', color: ti.color }}>
                        {ti.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-primary">{agent.name}</div>
                        <div className="text-xs text-muted truncate">{agent.goal}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs capitalize px-2 py-0.5 rounded"
                              style={{ backgroundColor: statusColors[agent.status] + '20', color: statusColors[agent.status] }}>
                          {agent.status}
                        </span>
                      </div>
                    </div>

                    {/* Agent details */}
                    <div className="px-4 py-2 flex items-center gap-4 text-xs text-secondary" style={{ borderTop: '1px solid var(--color-surface)' }}>
                      <span>Metric: <strong>{agent.metric}</strong> ({agent.metricDirection})</span>
                      <span>Schedule: {agent.schedule}</span>
                      {agent.server && <span>Server: {agent.server.name}</span>}
                      <span>{agent.history.length} runs</span>
                      {agent.lastRun && <span>Last: {new Date(agent.lastRun).toLocaleString()}</span>}
                    </div>

                    {/* Actions */}
                    <div className="px-4 py-2 flex gap-1.5" style={{ borderTop: '1px solid var(--color-surface)' }}>
                      {agent.status !== 'running' ? (
                        <button onClick={() => handleRunAgent(agent.nodeId)}
                          className="px-3 py-1.5 rounded text-xs bg-green-900/30 text-green-400 hover:bg-green-900/50 transition-colors">
                          Run
                        </button>
                      ) : (
                        <button onClick={() => handlePauseAgent(agent.nodeId)}
                          className="px-3 py-1.5 rounded text-xs bg-amber-900/30 text-amber-400 hover:bg-amber-900/50 transition-colors">
                          Pause
                        </button>
                      )}
                      <button onClick={() => handleStopAgent(agent.nodeId)}
                        className="px-3 py-1.5 rounded text-xs bg-surface text-secondary hover:text-white transition-colors">
                        Stop
                      </button>
                    </div>

                    {/* Recent history */}
                    {agent.history.length > 0 && (
                      <div className="px-4 py-2 max-h-24 overflow-y-auto" style={{ borderTop: '1px solid var(--color-surface)' }}>
                        {agent.history.slice(-3).reverse().map(h => (
                          <div key={h.id} className="text-xs text-muted py-0.5">
                            <span>{new Date(h.timestamp).toLocaleTimeString()}</span>
                            <span className="ml-2 text-secondary">{h.action}</span>
                            {h.result && <span className={`ml-1 ${h.improved ? 'text-green-400' : 'text-secondary'}`}>→ {h.result}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
