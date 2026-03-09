import React, { useState, useEffect, useCallback } from 'react';
import useStore from '../store';

export default function ExternalServiceModal({ onClose }) {
  const addNode = useStore((s) => s.addNode);
  const updateNodeMetadata = useStore((s) => s.updateNodeMetadata);
  const [recentProjects, setRecentProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectArchitecture, setProjectArchitecture] = useState(null);
  const [selectedServices, setSelectedServices] = useState(new Set());

  useEffect(() => {
    if (window.electronAPI?.projects) {
      window.electronAPI.projects.getRecent().then(setRecentProjects);
    }
  }, []);

  const handleSelectProject = useCallback(async (project) => {
    setSelectedProject(project);
    // Try to load the project's architecture file
    if (window.electronAPI) {
      // Look for architecture.gk.json in the project directory
      try {
        const data = await window.electronAPI.project.loadFrom(
          project.path + '/architecture.gk.json'
        );
        if (data) {
          setProjectArchitecture(data);
        } else {
          setProjectArchitecture(null);
        }
      } catch {
        setProjectArchitecture(null);
      }
    }
  }, []);

  const toggleService = (nodeId) => {
    setSelectedServices(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const handleImport = () => {
    if (!projectArchitecture || selectedServices.size === 0) return;
    const { nodes, nodeMetadata } = projectArchitecture;
    let offsetX = 600;
    let offsetY = 100;

    for (const nodeId of selectedServices) {
      const srcNode = nodes.find(n => n.id === nodeId);
      const srcMeta = nodeMetadata?.[nodeId] || {};
      if (!srcNode) continue;

      const newId = addNode(srcNode.data.nodeType || 'generic', { x: offsetX, y: offsetY });
      updateNodeMetadata(newId, {
        description: `[External: ${selectedProject.name}] ${srcMeta.description || ''}`,
        directory: srcMeta.directory || '',
        external: true,
        externalProject: selectedProject.path,
        externalProjectName: selectedProject.name,
        externalNodeId: nodeId,
        status: srcMeta.status || 'not_started',
        container: srcMeta.container || null,
      });

      // Update the node label to show it's external
      const store = useStore.getState();
      store.updateNodeLabel(newId, `${srcNode.data.label} (${selectedProject.name})`);

      offsetY += 100;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="w-[550px] max-h-[80vh] rounded-xl overflow-hidden flex flex-col"
           style={{ backgroundColor: 'var(--color-panel)', border: '1px solid var(--color-surface)' }}
           onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-surface)' }}>
          <div>
            <h2 className="text-lg font-semibold text-primary">Import External Service</h2>
            <p className="text-xs text-secondary mt-0.5">Reference services from other projects</p>
          </div>
          <button onClick={onClose} className="text-secondary hover:text-primary text-xl">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!selectedProject ? (
            // Project selection
            <>
              <label className="text-xs text-secondary block mb-2">Select a project:</label>
              {recentProjects.length === 0 ? (
                <div className="text-center py-8 text-secondary text-sm">
                  No other projects found. Open other projects first to reference their services.
                </div>
              ) : (
                <div className="space-y-2">
                  {recentProjects.map(p => (
                    <button key={p.path}
                      onClick={() => handleSelectProject(p)}
                      className="w-full text-left px-4 py-3 rounded-lg border border-surface bg-canvas/30 hover:border-accent/50 transition-colors">
                      <div className="text-sm font-medium text-primary">{p.name}</div>
                      <div className="text-xs text-muted font-mono mt-1 truncate">{p.path}</div>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : !projectArchitecture ? (
            // No architecture found
            <div className="text-center py-8">
              <p className="text-secondary text-sm mb-2">No architecture.gk.json found in {selectedProject.name}.</p>
              <p className="text-muted text-xs mb-4">Save the architecture in that project first.</p>
              <button onClick={() => { setSelectedProject(null); setProjectArchitecture(null); }}
                className="text-xs text-accent hover:text-accent-hover">
                ← Back to projects
              </button>
            </div>
          ) : (
            // Service selection
            <>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-primary">{selectedProject.name}</span>
                  <span className="text-xs text-muted ml-2">({projectArchitecture.nodes?.length || 0} components)</span>
                </div>
                <button onClick={() => { setSelectedProject(null); setProjectArchitecture(null); setSelectedServices(new Set()); }}
                  className="text-xs text-accent hover:text-accent-hover">
                  ← Back
                </button>
              </div>

              <div className="space-y-1.5">
                {(projectArchitecture.nodes || [])
                  .filter(n => n.type !== 'containerNode')
                  .map(n => {
                    const meta = projectArchitecture.nodeMetadata?.[n.id] || {};
                    const selected = selectedServices.has(n.id);
                    return (
                      <button key={n.id}
                        onClick={() => toggleService(n.id)}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                          selected ? 'border-accent bg-accent/10' : 'border-surface bg-canvas/30 hover:border-accent/30'
                        }`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded border ${selected ? 'bg-accent border-accent' : 'border-surface'} flex items-center justify-center`}>
                            {selected && <span className="text-white text-xs">✓</span>}
                          </div>
                          <span className="text-sm text-primary">{n.data.label}</span>
                          <span className="text-xs text-muted">({n.data.nodeType})</span>
                        </div>
                        {meta.description && (
                          <div className="text-xs text-secondary mt-1 ml-6 truncate">{meta.description}</div>
                        )}
                      </button>
                    );
                  })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {selectedProject && projectArchitecture && selectedServices.size > 0 && (
          <div className="px-6 py-4" style={{ borderTop: '1px solid var(--color-surface)' }}>
            <button onClick={handleImport}
              className="w-full px-4 py-3 rounded-lg text-sm font-semibold bg-accent hover:bg-accent-hover transition-all">
              Import {selectedServices.size} Service{selectedServices.size > 1 ? 's' : ''} as External Reference{selectedServices.size > 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
