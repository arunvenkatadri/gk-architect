import React, { useCallback, useEffect, useRef, useState } from 'react';
import ArchitectureCanvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import NodePanel from './components/NodePanel';
import MLLayerPanel from './components/MLLayerPanel';
import EdgePanel from './components/EdgePanel';
import Terminal from './components/Terminal';
import ProjectDashboard from './components/ProjectDashboard';
import FileTreeSidebar from './components/FileTreeSidebar';
import ErrorBoundary from './components/ErrorBoundary';
import Onboarding from './components/Onboarding';
import useStore from './store';
import useFileWatcher from './useFileWatcher';
import useArchitectureSync from './useArchitectureSync';
import useAutoSave from './useAutoSave';
import useGitStatus from './hooks/useGitStatus';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';

export default function App() {
  const projectDir = useStore((s) => s.projectDir);
  const projectName = useStore((s) => s.projectName);
  const terminalHeight = useStore((s) => s.terminalHeight);
  const setTerminalHeight = useStore((s) => s.setTerminalHeight);
  const panelOpen = useStore((s) => s.panelOpen);
  const panelMode = useStore((s) => s.panelMode);
  const terminalRef = useRef(null);
  const [isResizing, setIsResizing] = useState(false);

  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const theme = useStore((s) => s.theme);
  const workspaceMode = useStore((s) => s.workspaceMode);

  // Set data-theme on mount so CSS variables match the store
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useFileWatcher();
  useArchitectureSync();
  useGitStatus();

  const { hasRecovery, recoverFromAutoSave, dismissRecovery } = useAutoSave();

  const serialize = useStore((s) => s.serialize);

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

  useKeyboardShortcuts({ onSave: handleSave });

  const handleResizeStart = useCallback(
    (e) => {
      e.preventDefault();
      setIsResizing(true);
      const startY = e.clientY;
      const startHeight = terminalHeight;

      const onMouseMove = (e) => {
        const delta = startY - e.clientY;
        const newHeight = Math.min(Math.max(startHeight + delta, 100), window.innerHeight - 200);
        setTerminalHeight(newHeight);
      };

      const onMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [terminalHeight, setTerminalHeight]
  );

  const sendToTerminal = useCallback((command) => {
    if (terminalRef.current) {
      terminalRef.current.sendCommand(command);
    }
  }, []);

  // Track project in recent projects list
  useEffect(() => {
    if (projectDir && window.electronAPI?.projects) {
      window.electronAPI.projects.track(projectDir);
    }
  }, [projectDir]);

  if (!projectDir) {
    return <ProjectDashboard />;
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="drag-region h-8 bg-panel flex items-center px-4 shrink-0">
        <span className="no-drag text-xs text-secondary ml-16">
          Extelligence GK Architect
          <span className="text-muted ml-2">-</span>
          <span className="text-secondary ml-2">{projectName}</span>
          <span className="text-muted ml-2 text-[10px]">{projectDir}</span>
        </span>
      </div>

      {hasRecovery && (
        <div className="bg-amber-900/80 border-b border-amber-700 px-4 py-2 flex items-center gap-3 shrink-0">
          <span className="text-amber-200 text-xs flex-1">
            Unsaved changes recovered from a previous session.
          </span>
          <button
            onClick={recoverFromAutoSave}
            className="px-3 py-1 rounded text-xs bg-amber-600 hover:bg-amber-500 text-white font-medium transition-colors"
          >
            Restore
          </button>
          <button
            onClick={dismissRecovery}
            className="px-3 py-1 rounded text-xs bg-surface hover:bg-gray-600 text-gray-300 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      <Toolbar sendToTerminal={sendToTerminal} />

      <div className="flex flex-1 overflow-hidden min-h-0">
        {sidebarOpen && (
          <ErrorBoundary name="File Browser">
            <FileTreeSidebar />
          </ErrorBoundary>
        )}
        <div className="flex-1 relative">
          <ErrorBoundary name="Canvas">
            <ArchitectureCanvas />
          </ErrorBoundary>
        </div>

        <ErrorBoundary name="Panel">
          {panelOpen && panelMode === 'node' && workspaceMode === 'ml' && (
            <MLLayerPanel />
          )}
          {panelOpen && panelMode === 'node' && workspaceMode === 'infra' && (
            <NodePanel sendToTerminal={sendToTerminal} />
          )}
          {panelOpen && panelMode === 'edge' && (
            <EdgePanel sendToTerminal={sendToTerminal} />
          )}
        </ErrorBoundary>
      </div>

      <div className="resize-handle shrink-0" onMouseDown={handleResizeStart} />

      <div className="shrink-0 bg-black" style={{ height: terminalHeight }}>
        <ErrorBoundary name="Terminal">
          <Terminal ref={terminalRef} projectDir={projectDir} />
        </ErrorBoundary>
      </div>

      <Onboarding />
    </div>
  );
}
