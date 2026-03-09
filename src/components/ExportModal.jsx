import React, { useState, useMemo, useCallback } from 'react';
import useStore from '../store';
import { generateMermaid } from '../utils/exportMermaid';

export default function ExportModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('mermaid');
  const [copied, setCopied] = useState(false);

  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const nodeMetadata = useStore((s) => s.nodeMetadata);

  const mermaidCode = useMemo(
    () => generateMermaid(nodes, edges, nodeMetadata),
    [nodes, edges, nodeMetadata]
  );

  const handleCopyMermaid = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(mermaidCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-secure contexts
      const textarea = document.createElement('textarea');
      textarea.value = mermaidCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [mermaidCode]);

  const handleDownloadMermaid = useCallback(() => {
    const blob = new Blob([mermaidCode], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'architecture.mermaid.md';
    a.click();
    URL.revokeObjectURL(url);
  }, [mermaidCode]);

  const handleCopySvg = useCallback(async () => {
    const viewport = document.querySelector('.react-flow__viewport');
    if (!viewport) return;
    const serializer = new XMLSerializer();
    // Clone the viewport SVG content into a standalone SVG
    const rfEl = document.querySelector('.react-flow');
    if (!rfEl) return;
    const { width, height } = rfEl.getBoundingClientRect();

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('style', 'background:var(--color-bg)');

    // Clone the viewport group into our SVG
    const clone = viewport.cloneNode(true);
    svg.appendChild(clone);

    const svgString = serializer.serializeToString(svg);

    try {
      await navigator.clipboard.writeText(svgString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = svgString;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  const handleDownloadSvg = useCallback(() => {
    const viewport = document.querySelector('.react-flow__viewport');
    if (!viewport) return;
    const serializer = new XMLSerializer();
    const rfEl = document.querySelector('.react-flow');
    if (!rfEl) return;
    const { width, height } = rfEl.getBoundingClientRect();

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('style', 'background:var(--color-bg)');

    const clone = viewport.cloneNode(true);
    svg.appendChild(clone);

    const svgString = serializer.serializeToString(svg);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'architecture.svg';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const tabs = [
    { id: 'mermaid', label: 'Mermaid' },
    { id: 'svg', label: 'SVG' },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--color-panel)',
          border: '1px solid var(--color-surface)',
          borderRadius: 12,
          width: '90%',
          maxWidth: 720,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid var(--color-surface)',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 700,
                color: 'var(--color-text)',
              }}
            >
              Export Diagram
            </h2>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: 13,
                color: 'var(--color-text-secondary)',
              }}
            >
              Export your architecture as Mermaid markdown or SVG
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              border: '1px solid var(--color-surface)',
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              fontSize: 18,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = '#e94560';
              e.currentTarget.style.color = '#e94560';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-surface)';
              e.currentTarget.style.color = '#9ca3af';
            }}
          >
            X
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 0,
            borderBottom: '1px solid var(--color-surface)',
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setCopied(false);
              }}
              style={{
                padding: '10px 24px',
                border: 'none',
                borderBottom:
                  activeTab === tab.id
                    ? '2px solid #e94560'
                    : '2px solid transparent',
                background: 'transparent',
                color: activeTab === tab.id ? '#ffffff' : '#6b7280',
                fontSize: 13,
                fontWeight: activeTab === tab.id ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          {activeTab === 'mermaid' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <pre
                style={{
                  backgroundColor: 'var(--color-bg)',
                  border: '1px solid var(--color-surface)',
                  borderRadius: 8,
                  padding: 16,
                  margin: 0,
                  fontSize: 12,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  color: 'var(--color-text)',
                  overflowX: 'auto',
                  maxHeight: 320,
                  overflowY: 'auto',
                  whiteSpace: 'pre',
                  lineHeight: 1.6,
                }}
              >
                {mermaidCode}
              </pre>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={handleCopyMermaid}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: 6,
                    border: 'none',
                    background: copied
                      ? 'linear-gradient(135deg, #10b981, #059669)'
                      : 'linear-gradient(135deg, #e94560, #c23152)',
                    color: 'white',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'transform 0.1s, box-shadow 0.2s',
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'scale(1.02)';
                    e.target.style.boxShadow =
                      '0 4px 16px rgba(233, 69, 96, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  {copied ? 'Copied!' : 'Copy to Clipboard'}
                </button>

                <button
                  onClick={handleDownloadMermaid}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: 6,
                    border: '1px solid var(--color-surface)',
                    background: 'transparent',
                    color: 'var(--color-text)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = '#e94560';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-surface)';
                    e.currentTarget.style.color = '#e2e8f0';
                  }}
                >
                  Download .md
                </button>
              </div>

              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.5,
                }}
              >
                Paste into any Mermaid-compatible renderer (GitHub, Notion,
                Mermaid Live Editor) to visualize the diagram.
              </p>
            </div>
          )}

          {activeTab === 'svg' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.5,
                }}
              >
                Export the current canvas viewport as an SVG image. The export
                captures exactly what is visible on the canvas.
              </p>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={handleCopySvg}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: 6,
                    border: 'none',
                    background: copied
                      ? 'linear-gradient(135deg, #10b981, #059669)'
                      : 'linear-gradient(135deg, #e94560, #c23152)',
                    color: 'white',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'transform 0.1s, box-shadow 0.2s',
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'scale(1.02)';
                    e.target.style.boxShadow =
                      '0 4px 16px rgba(233, 69, 96, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  {copied ? 'Copied!' : 'Copy SVG to Clipboard'}
                </button>

                <button
                  onClick={handleDownloadSvg}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: 6,
                    border: '1px solid var(--color-surface)',
                    background: 'transparent',
                    color: 'var(--color-text)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = '#e94560';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-surface)';
                    e.currentTarget.style.color = '#e2e8f0';
                  }}
                >
                  Download .svg
                </button>
              </div>

              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.5,
                }}
              >
                SVG files can be opened in any browser or imported into design
                tools like Figma.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
