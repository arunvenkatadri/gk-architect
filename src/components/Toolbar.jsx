import React, { useCallback, useState } from 'react';
import useStore, { NODE_TYPES } from '../store';
import TemplateModal from './TemplateModal';
import ExportModal from './ExportModal';
import BuildOrchestrator from './BuildOrchestrator';
import ServerManager from './ServerManager';
import DeployPanel from './DeployPanel';
import OpsPanel from './OpsPanel';
import ExternalServiceModal from './ExternalServiceModal';

export default function Toolbar({ sendToTerminal }) {
  const [showTemplates, setShowTemplates] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showBuildAll, setShowBuildAll] = useState(false);
  const [showServers, setShowServers] = useState(false);
  const [showDeploy, setShowDeploy] = useState(false);
  const [showOps, setShowOps] = useState(false);
  const [showExternal, setShowExternal] = useState(false);
  const addNode = useStore((s) => s.addNode);
  const serialize = useStore((s) => s.serialize);
  const deserialize = useStore((s) => s.deserialize);
  const projectDir = useStore((s) => s.projectDir);
  const setProjectDir = useStore((s) => s.setProjectDir);
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);

  const handleAddNode = useCallback(
    (type) => {
      const x = 200 + Math.random() * 400;
      const y = 100 + Math.random() * 300;
      addNode(type, { x, y });
    },
    [addNode]
  );

  const handleSave = useCallback(async () => {
    if (window.electronAPI) {
      const data = serialize();
      const saved = await window.electronAPI.project.save(data);
      if (saved && window.electronAPI.autosave && projectDir) {
        window.electronAPI.autosave.clear(projectDir);
      }
    } else {
      const data = serialize();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'architecture.gk.json';
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [serialize, projectDir]);

  const handleLoad = useCallback(async () => {
    if (window.electronAPI) {
      const data = await window.electronAPI.project.load();
      if (data) deserialize(data);
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,.gk.json';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const text = await file.text();
        deserialize(JSON.parse(text));
      };
      input.click();
    }
  }, [deserialize]);

  const handleChangeProject = useCallback(() => {
    setProjectDir(null);
  }, [setProjectDir]);

  return (
    <div className="no-drag bg-panel border-b border-surface px-4 py-2 flex items-center gap-2 shrink-0">
      <button
        onClick={toggleSidebar}
        className={`px-2 py-1 rounded text-xs transition-colors mr-2 ${
          sidebarOpen ? 'bg-accent text-white' : 'bg-surface hover:bg-accent text-gray-400 hover:text-white'
        }`}
        title={sidebarOpen ? 'Hide files' : 'Show files'}
      >
        Files
      </button>

      {/* Node type buttons */}
      <div className="flex items-center gap-1 mr-4">
        <span className="text-xs text-secondary mr-2">Add:</span>
        {Object.entries(NODE_TYPES).map(([key, { label, color }]) => (
          <button
            key={key}
            onClick={() => handleAddNode(key)}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/gk-node-type', key);
              e.dataTransfer.effectAllowed = 'move';
            }}
            className="px-3 py-1 rounded text-xs font-medium transition-all hover:brightness-110 hover:scale-105 cursor-grab active:cursor-grabbing"
            style={{ backgroundColor: color + '33', color, border: `1px solid ${color}55` }}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => setShowExternal(true)}
          className="px-3 py-1 rounded text-xs font-medium transition-all hover:brightness-110 border border-dashed border-gray-500 text-gray-400 hover:border-accent hover:text-accent"
        >
          + External
        </button>
      </div>

      {/* Build All */}
      <button
        onClick={() => setShowBuildAll(true)}
        className="px-3 py-1 rounded text-xs font-semibold bg-accent/20 text-accent border border-accent/30 hover:bg-accent/30 transition-colors"
        title="Build all components in dependency order"
      >
        Build All
      </button>
      <button
        onClick={() => setShowServers(true)}
        className="px-3 py-1 rounded text-xs bg-surface hover:bg-accent transition-colors"
      >
        Servers
      </button>
      <button
        onClick={() => setShowDeploy(true)}
        className="px-3 py-1 rounded text-xs font-semibold bg-green-900/30 text-green-400 border border-green-800/50 hover:bg-green-900/50 transition-colors"
      >
        Deploy
      </button>
      <button
        onClick={() => setShowOps(true)}
        className="px-3 py-1 rounded text-xs font-semibold bg-blue-900/30 text-blue-400 border border-blue-800/50 hover:bg-blue-900/50 transition-colors"
      >
        Ops
      </button>

      <div className="flex-1" />

      {/* Project actions */}
      <button
        onClick={() => setShowTemplates(true)}
        className="px-3 py-1 rounded text-xs bg-surface hover:bg-accent transition-colors"
      >
        Templates
      </button>
      <button
        onClick={handleSave}
        className="px-3 py-1 rounded text-xs bg-surface hover:bg-accent transition-colors"
      >
        Save
      </button>
      <button
        onClick={handleLoad}
        className="px-3 py-1 rounded text-xs bg-surface hover:bg-accent transition-colors"
      >
        Load
      </button>
      <button
        onClick={() => setShowExport(true)}
        className="px-3 py-1 rounded text-xs bg-surface hover:bg-accent transition-colors"
      >
        Export
      </button>
      <button
        onClick={toggleTheme}
        className="px-2 py-1 rounded text-xs bg-surface hover:bg-accent transition-colors"
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? '☀' : '☽'}
      </button>
      <div className="w-px h-4 bg-surface mx-1" />
      <button
        onClick={handleChangeProject}
        className="px-3 py-1 rounded text-xs bg-surface hover:bg-accent transition-colors"
      >
        Switch Project
      </button>

      {showTemplates && (
        <TemplateModal onClose={() => setShowTemplates(false)} />
      )}
      {showExport && (
        <ExportModal onClose={() => setShowExport(false)} />
      )}
      {showBuildAll && (
        <BuildOrchestrator
          onClose={() => setShowBuildAll(false)}
          sendToTerminal={sendToTerminal}
        />
      )}
      {showServers && (
        <ServerManager onClose={() => setShowServers(false)} />
      )}
      {showDeploy && (
        <DeployPanel
          onClose={() => setShowDeploy(false)}
          sendToTerminal={sendToTerminal}
        />
      )}
      {showOps && (
        <OpsPanel
          onClose={() => setShowOps(false)}
          sendToTerminal={sendToTerminal}
        />
      )}
      {showExternal && (
        <ExternalServiceModal onClose={() => setShowExternal(false)} />
      )}
    </div>
  );
}
