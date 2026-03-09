import React, { useCallback, useState } from 'react';
import useStore from '../store';
import TemplateModal from './TemplateModal';

export default function ProjectPicker() {
  const setProjectDir = useStore((s) => s.setProjectDir);
  const deserialize = useStore((s) => s.deserialize);
  const [showTemplates, setShowTemplates] = useState(false);

  const handleOpenFolder = useCallback(async () => {
    if (window.electronAPI) {
      const dir = await window.electronAPI.fs.selectDirectory();
      if (dir) setProjectDir(dir);
    }
  }, [setProjectDir]);

  const handleLoadArchitecture = useCallback(async () => {
    if (window.electronAPI) {
      const data = await window.electronAPI.project.load();
      if (data) {
        deserialize(data);
        // If loaded file had a projectDir, we're good. Otherwise prompt.
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

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg)',
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: 480,
        padding: 48,
      }}>
        {/* Logo / Title */}
        <div style={{
          fontSize: 48,
          fontWeight: 700,
          letterSpacing: -2,
          marginBottom: 8,
          background: 'linear-gradient(135deg, #e94560, #6366f1)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Extelligence GK Architect
        </div>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 48 }}>
          Visual architecture builder for Claude Code
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={handleOpenFolder}
            style={{
              padding: '14px 24px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-hover))',
              color: 'white',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'transform 0.1s, box-shadow 0.2s',
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'scale(1.02)';
              e.target.style.boxShadow = '0 4px 20px rgba(233, 69, 96, 0.4)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'scale(1)';
              e.target.style.boxShadow = 'none';
            }}
          >
            Open Project Folder
          </button>

          <button
            onClick={() => setShowTemplates(true)}
            style={{
              padding: '14px 24px',
              borderRadius: 8,
              border: '1px solid var(--color-surface)',
              background: 'transparent',
              color: 'var(--color-text)',
              fontSize: 15,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
            onMouseOver={(e) => e.target.style.borderColor = 'var(--color-accent)'}
            onMouseOut={(e) => e.target.style.borderColor = 'var(--color-surface)'}
          >
            Start from Template
          </button>

          <button
            onClick={handleLoadArchitecture}
            style={{
              padding: '14px 24px',
              borderRadius: 8,
              border: '1px solid var(--color-surface)',
              background: 'transparent',
              color: 'var(--color-text)',
              fontSize: 15,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
            onMouseOver={(e) => e.target.style.borderColor = 'var(--color-accent)'}
            onMouseOut={(e) => e.target.style.borderColor = 'var(--color-surface)'}
          >
            Load Existing Architecture
          </button>
        </div>

        <p style={{ color: 'var(--color-text-muted)', fontSize: 11, marginTop: 32 }}>
          Select the folder where you want Claude Code to operate.
          <br />
          Your architecture diagram and all code will live there.
        </p>
      </div>

      {showTemplates && (
        <TemplateModal onClose={() => setShowTemplates(false)} />
      )}
    </div>
  );
}
