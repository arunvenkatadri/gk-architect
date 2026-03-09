import React, { useState, useEffect, useCallback } from 'react';
import useStore from '../store';
import TemplateModal from './TemplateModal';

export default function ProjectDashboard() {
  const setProjectDir = useStore((s) => s.setProjectDir);
  const deserialize = useStore((s) => s.deserialize);
  const [showTemplates, setShowTemplates] = useState(false);
  const [recentProjects, setRecentProjects] = useState([]);

  // Load recent projects on mount
  useEffect(() => {
    if (window.electronAPI?.projects) {
      window.electronAPI.projects.getRecent().then(setRecentProjects);
    }
  }, []);

  const handleOpenFolder = useCallback(async () => {
    if (window.electronAPI) {
      const dir = await window.electronAPI.fs.selectDirectory();
      if (dir) {
        setProjectDir(dir);
        // Track in recent projects
        if (window.electronAPI.projects) {
          window.electronAPI.projects.track(dir);
        }
      }
    }
  }, [setProjectDir]);

  const handleOpenRecent = useCallback((project) => {
    setProjectDir(project.path);
    if (project.architectureFile) {
      // Auto-load the architecture if saved
      if (window.electronAPI?.project) {
        window.electronAPI.project.loadFrom(project.architectureFile).then(data => {
          if (data) deserialize(data);
        });
      }
    }
  }, [setProjectDir, deserialize]);

  const handleRemoveRecent = useCallback(async (path, e) => {
    e.stopPropagation();
    if (window.electronAPI?.projects) {
      await window.electronAPI.projects.remove(path);
      const updated = await window.electronAPI.projects.getRecent();
      setRecentProjects(updated);
    }
  }, []);

  const handleLoadArchitecture = useCallback(async () => {
    if (window.electronAPI) {
      const data = await window.electronAPI.project.load();
      if (data) {
        deserialize(data);
        if (!data.projectDir) {
          const dir = await window.electronAPI.fs.selectDirectory();
          if (dir) setProjectDir(dir);
        }
      }
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,.gk.json';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const text = await file.text();
        const data = JSON.parse(text);
        deserialize(data);
      };
      input.click();
    }
  }, [deserialize, setProjectDir]);

  const handleNewWindow = useCallback(() => {
    if (window.electronAPI?.window) {
      window.electronAPI.window.new();
    }
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff/86400000)}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', paddingTop: 48, paddingBottom: 32 }}>
        <div style={{
          fontSize: 36,
          fontWeight: 700,
          letterSpacing: -1.5,
          marginBottom: 6,
          background: 'linear-gradient(135deg, #e94560, #6366f1)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          GK Architect
        </div>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
          Visual architecture builder for Claude Code
        </p>
      </div>

      {/* Action buttons row */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 32, padding: '0 32px' }}>
        <button onClick={handleOpenFolder}
          style={{
            padding: '10px 20px', borderRadius: 8, border: 'none',
            background: 'linear-gradient(135deg, #e94560, #c23152)',
            color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
          Open Project
        </button>
        <button onClick={() => setShowTemplates(true)}
          style={{
            padding: '10px 20px', borderRadius: 8,
            border: '1px solid var(--color-surface)',
            background: 'transparent', color: 'var(--color-text)',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}>
          From Template
        </button>
        <button onClick={handleLoadArchitecture}
          style={{
            padding: '10px 20px', borderRadius: 8,
            border: '1px solid var(--color-surface)',
            background: 'transparent', color: 'var(--color-text)',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}>
          Load Architecture
        </button>
        <button onClick={handleNewWindow}
          style={{
            padding: '10px 20px', borderRadius: 8,
            border: '1px solid var(--color-surface)',
            background: 'transparent', color: 'var(--color-text)',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}>
          New Window
        </button>
      </div>

      {/* Recent projects */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 48px 48px' }}>
        {recentProjects.length > 0 && (
          <>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 12, fontWeight: 500 }}>
              RECENT PROJECTS
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {recentProjects.map(project => (
                <div key={project.path}
                  onClick={() => handleOpenRecent(project)}
                  style={{
                    padding: 16, borderRadius: 10,
                    border: '1px solid var(--color-surface)',
                    background: 'var(--color-panel)',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s, transform 0.1s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = '#e94560'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--color-surface)'; e.currentTarget.style.transform = 'none'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
                      {project.name}
                    </div>
                    <button onClick={(e) => handleRemoveRecent(project.path, e)}
                      style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 14, padding: '0 4px' }}>
                      ×
                    </button>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'monospace', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {project.path}
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--color-text-secondary)' }}>
                    {project.nodeCount != null && <span>{project.nodeCount} components</span>}
                    {project.lastOpened && <span>{formatDate(project.lastOpened)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {recentProjects.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 48, color: 'var(--color-text-muted)', fontSize: 13 }}>
            No recent projects. Open a folder to get started.
          </div>
        )}
      </div>

      {showTemplates && <TemplateModal onClose={() => setShowTemplates(false)} />}
    </div>
  );
}
