import React, { useState, useMemo } from 'react';
import useStore from '../store';

export default function AutoResearch({ onClose, sendToTerminal }) {
  const generateProgramMd = useStore((s) => s.generateProgramMd);
  const generateTrainScript = useStore((s) => s.generateTrainScript);
  const experiments = useStore((s) => s.experiments);
  const servers = useStore((s) => s.servers);
  const [selectedServer, setSelectedServer] = useState(servers[0]?.id || null);
  const [activeTab, setActiveTab] = useState('program');
  const [experimentMinutes, setExperimentMinutes] = useState(5);
  const [maxExperiments, setMaxExperiments] = useState(100);
  const [metric, setMetric] = useState('val_loss');
  const [metricDirection, setMetricDirection] = useState('minimize');

  const programMd = useMemo(() => generateProgramMd(), [generateProgramMd]);
  const trainScript = useMemo(() => generateTrainScript(), [generateTrainScript]);

  const handleStartResearch = () => {
    if (!sendToTerminal) return;
    const server = servers.find(s => s.id === selectedServer);

    let prompt = `Set up and run an automated ML research experiment loop.\n\n`;

    if (server) {
      prompt += `## Target Server\n`;
      prompt += `SSH into ${server.user}@${server.host}:${server.port || 22}\n`;
      if (server.keyPath) prompt += `SSH Key: ${server.keyPath}\n`;
      if (server.directory) prompt += `Working directory: ${server.directory}\n\n`;
    }

    prompt += `## Setup\n`;
    prompt += `1. Create the following files in the project directory:\n\n`;
    prompt += `### train.py\n\`\`\`python\n${trainScript}\n\`\`\`\n\n`;
    prompt += `### program.md\n\`\`\`markdown\n${programMd}\n\`\`\`\n\n`;

    prompt += `## Autoresearch Loop\n`;
    prompt += `Run an automated experiment loop following program.md:\n`;
    prompt += `1. Each experiment gets ${experimentMinutes} minutes max training time\n`;
    prompt += `2. Run up to ${maxExperiments} experiments\n`;
    prompt += `3. Evaluation metric: ${metric} (${metricDirection})\n`;
    prompt += `4. For each experiment:\n`;
    prompt += `   a. Make ONE modification to train.py based on the research directions in program.md\n`;
    prompt += `   b. Run training with the time budget\n`;
    prompt += `   c. Record the result (metric value)\n`;
    prompt += `   d. If improved: keep the change. If not: revert.\n`;
    prompt += `   e. Log what was tried and the result\n`;
    prompt += `5. After all experiments, report the best configuration found\n\n`;
    prompt += `Start the experiment loop now. Make train.py fully functional first (implement data loading, custom layers, etc.), then begin experiments.\n`;

    sendToTerminal(prompt);
    onClose();
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  const tabs = ['program', 'experiments', 'settings'];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="w-[700px] max-h-[85vh] rounded-xl overflow-hidden flex flex-col"
           style={{ backgroundColor: 'var(--color-panel)', border: '1px solid var(--color-surface)' }}
           onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-surface)' }}>
          <div>
            <h2 className="text-lg font-semibold text-primary">Auto Research</h2>
            <p className="text-xs text-secondary mt-0.5">Automated ML experiments powered by Claude</p>
          </div>
          <button onClick={onClose} className="text-secondary hover:text-primary text-xl">&times;</button>
        </div>

        {/* Tabs */}
        <div className="flex" style={{ borderBottom: '1px solid var(--color-surface)' }}>
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2.5 text-xs font-medium capitalize transition-colors ${
                activeTab === tab ? 'text-accent border-b-2 border-accent' : 'text-secondary hover:text-primary'
              }`}>
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'program' && (
            <div>
              {programMd ? (
                <>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs text-secondary">Generated from your architecture</span>
                    <button onClick={() => handleCopy(programMd)}
                      className="text-xs text-accent hover:text-accent-hover">Copy</button>
                  </div>
                  <pre className="bg-canvas/50 rounded-lg p-4 text-xs text-secondary font-mono whitespace-pre-wrap overflow-auto max-h-[50vh]">
                    {programMd}
                  </pre>
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-secondary text-sm">Draw an ML architecture first.</p>
                  <p className="text-muted text-xs mt-1">Switch to ML mode and add layers to the canvas.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'experiments' && (
            <div>
              {experiments.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-secondary text-sm">No experiments recorded yet.</p>
                  <p className="text-muted text-xs mt-1">Start a research session to begin tracking.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {experiments.map((exp, i) => (
                    <div key={exp.id} className="bg-canvas/30 rounded-lg p-3 border border-surface">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-primary">Experiment #{i + 1}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          exp.improved ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                        }`}>
                          {exp.improved ? 'Improved' : 'Reverted'}
                        </span>
                      </div>
                      {exp.description && <p className="text-xs text-secondary">{exp.description}</p>}
                      {exp.metric && <p className="text-xs text-muted mt-1">{metric}: {exp.metric}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-secondary block mb-1">Target Server (GPU)</label>
                {servers.length === 0 ? (
                  <p className="text-xs text-muted">No servers configured. Add one via Servers button. Or leave empty to run locally.</p>
                ) : (
                  <select value={selectedServer || ''} onChange={e => setSelectedServer(e.target.value)}
                    className="w-full bg-canvas border border-surface rounded px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent">
                    <option value="">Run locally</option>
                    {servers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.host})</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-secondary block mb-1">Minutes per Experiment</label>
                  <input type="number" value={experimentMinutes}
                    onChange={e => setExperimentMinutes(parseInt(e.target.value) || 5)}
                    className="w-full bg-canvas border border-surface rounded px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="text-xs text-secondary block mb-1">Max Experiments</label>
                  <input type="number" value={maxExperiments}
                    onChange={e => setMaxExperiments(parseInt(e.target.value) || 100)}
                    className="w-full bg-canvas border border-surface rounded px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-secondary block mb-1">Evaluation Metric</label>
                  <input type="text" value={metric}
                    onChange={e => setMetric(e.target.value)}
                    className="w-full bg-canvas border border-surface rounded px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="text-xs text-secondary block mb-1">Direction</label>
                  <select value={metricDirection} onChange={e => setMetricDirection(e.target.value)}
                    className="w-full bg-canvas border border-surface rounded px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent">
                    <option value="minimize">Minimize</option>
                    <option value="maximize">Maximize</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4" style={{ borderTop: '1px solid var(--color-surface)' }}>
          <button onClick={handleStartResearch}
            disabled={!programMd}
            className="w-full px-4 py-3 rounded-lg text-sm font-semibold bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98]">
            Start Autoresearch ({maxExperiments} experiments, {experimentMinutes}min each)
          </button>
        </div>
      </div>
    </div>
  );
}
