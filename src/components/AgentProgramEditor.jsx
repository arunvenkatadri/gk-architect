import React, { useState, useCallback } from 'react';
import useStore from '../store';

export default function AgentProgramEditor({ nodeId, onClose, sendToTerminal }) {
  const node = useStore((s) => s.nodes.find(n => n.id === nodeId));
  const agentPrograms = useStore((s) => s.agentPrograms);
  const servers = useStore((s) => s.servers);
  const createAgentProgram = useStore((s) => s.createAgentProgram);
  const updateAgentProgram = useStore((s) => s.updateAgentProgram);
  const removeAgentProgram = useStore((s) => s.removeAgentProgram);
  const getAgentRunContext = useStore((s) => s.getAgentRunContext);

  const existing = agentPrograms[nodeId];

  const [form, setForm] = useState({
    name: existing?.name || `${node?.data.label || 'Node'} Agent`,
    goal: existing?.goal || '',
    metric: existing?.metric || '',
    metricDirection: existing?.metricDirection || 'minimize',
    behavior: existing?.behavior || '',
    schedule: existing?.schedule || 'continuous',
    serverId: existing?.serverId || servers[0]?.id || '',
  });

  const [showPreview, setShowPreview] = useState(false);

  const handleSave = useCallback(() => {
    if (existing) {
      updateAgentProgram(nodeId, form);
    } else {
      createAgentProgram(nodeId, form);
    }
    onClose();
  }, [nodeId, form, existing, createAgentProgram, updateAgentProgram, onClose]);

  const handleRemove = useCallback(() => {
    removeAgentProgram(nodeId);
    onClose();
  }, [nodeId, removeAgentProgram, onClose]);

  const handleRun = useCallback(() => {
    // Save first if new
    if (!existing) {
      createAgentProgram(nodeId, form);
    } else {
      updateAgentProgram(nodeId, { ...form, status: 'running' });
    }
    const ctx = getAgentRunContext(nodeId);
    if (ctx && sendToTerminal) {
      sendToTerminal(ctx);
    }
    onClose();
  }, [nodeId, form, existing, createAgentProgram, updateAgentProgram, getAgentRunContext, sendToTerminal, onClose]);

  const previewCtx = showPreview ? getAgentRunContext(nodeId) : '';

  if (!node) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="w-[550px] max-h-[85vh] rounded-xl overflow-hidden flex flex-col"
           style={{ backgroundColor: 'var(--color-panel)', border: '1px solid var(--color-surface)' }}
           onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-surface)' }}>
          <div>
            <h2 className="text-lg font-semibold text-primary">
              {existing ? 'Edit' : 'Create'} Agent Program
            </h2>
            <p className="text-xs text-secondary mt-0.5">for {node.data.label}</p>
          </div>
          <button onClick={onClose} className="text-secondary hover:text-primary text-xl">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="text-xs text-secondary block mb-1">Agent Name</label>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              className="w-full bg-canvas border border-surface rounded px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent" />
          </div>

          <div>
            <label className="text-xs text-secondary block mb-1">Goal</label>
            <textarea value={form.goal} onChange={e => setForm({...form, goal: e.target.value})}
              rows={2}
              placeholder="e.g., Continuously improve model accuracy, Keep API latency under 200ms, Monitor and auto-fix errors..."
              className="w-full bg-canvas border border-surface rounded px-3 py-2 text-sm text-primary placeholder-gray-600 focus:outline-none focus:border-accent resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-secondary block mb-1">Metric</label>
              <input value={form.metric} onChange={e => setForm({...form, metric: e.target.value})}
                placeholder="val_loss, latency_p99, error_rate..."
                className="w-full bg-canvas border border-surface rounded px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="text-xs text-secondary block mb-1">Direction</label>
              <select value={form.metricDirection} onChange={e => setForm({...form, metricDirection: e.target.value})}
                className="w-full bg-canvas border border-surface rounded px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent">
                <option value="minimize">Minimize</option>
                <option value="maximize">Maximize</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-secondary block mb-1">Behavior Program</label>
            <textarea value={form.behavior} onChange={e => setForm({...form, behavior: e.target.value})}
              rows={5}
              placeholder={"Define what the agent should do each cycle:\n1. Check current state\n2. Analyze metrics\n3. Try one improvement\n4. Evaluate results\n5. Keep or revert"}
              className="w-full bg-canvas border border-surface rounded px-3 py-2 text-sm text-primary placeholder-gray-600 focus:outline-none focus:border-accent resize-none font-mono text-xs" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-secondary block mb-1">Schedule</label>
              <select value={form.schedule} onChange={e => setForm({...form, schedule: e.target.value})}
                className="w-full bg-canvas border border-surface rounded px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent">
                <option value="continuous">Continuous</option>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="on_error">On Error</option>
                <option value="manual">Manual Only</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-secondary block mb-1">Target Server</label>
              <select value={form.serverId} onChange={e => setForm({...form, serverId: e.target.value})}
                className="w-full bg-canvas border border-surface rounded px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent">
                <option value="">Local</option>
                {servers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Preview */}
          <div>
            <button onClick={() => setShowPreview(!showPreview)}
              className="text-xs text-secondary hover:text-accent transition-colors">
              {showPreview ? '▼' : '▶'} Preview Agent Prompt
            </button>
            {showPreview && previewCtx && (
              <pre className="mt-2 bg-canvas/50 rounded-lg p-3 text-xs text-secondary whitespace-pre-wrap max-h-48 overflow-y-auto border border-surface">
                {previewCtx}
              </pre>
            )}
          </div>

          {/* History */}
          {existing && existing.history.length > 0 && (
            <div>
              <label className="text-xs text-secondary block mb-2">Recent Activity</label>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {existing.history.slice(-10).reverse().map(h => (
                  <div key={h.id} className="text-xs bg-canvas/30 rounded px-3 py-1.5 border border-surface">
                    <span className="text-muted">{new Date(h.timestamp).toLocaleString()}</span>
                    <span className="text-secondary ml-2">{h.action}</span>
                    {h.result && <span className={`ml-2 ${h.improved ? 'text-green-400' : 'text-red-400'}`}>{h.result}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 flex gap-2" style={{ borderTop: '1px solid var(--color-surface)' }}>
          <button onClick={handleRun}
            disabled={!form.goal}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold bg-accent hover:bg-accent-hover disabled:opacity-40 transition-all">
            {existing ? 'Run Agent' : 'Create & Run'}
          </button>
          <button onClick={handleSave}
            disabled={!form.goal}
            className="px-4 py-2.5 rounded-lg text-sm bg-surface hover:bg-accent text-secondary hover:text-white transition-colors">
            Save
          </button>
          {existing && (
            <button onClick={handleRemove}
              className="px-4 py-2.5 rounded-lg text-sm bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors">
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
