import React from 'react';
import useStore from '../store';
import templates from '../templates';

const categoryColors = {
  fullstack: { bg: '#06b6d420', text: '#06b6d4', border: '#06b6d450' },
  backend: { bg: '#10b98120', text: '#10b981', border: '#10b98150' },
  frontend: { bg: '#f59e0b20', text: '#f59e0b', border: '#f59e0b50' },
};

export default function TemplateModal({ onClose }) {
  const deserialize = useStore((s) => s.deserialize);

  const handleUseTemplate = (template) => {
    deserialize({
      projectDir: null,
      nodes: template.nodes,
      edges: template.edges,
      nodeMetadata: template.nodeMetadata,
    });
    onClose();
  };

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
              Architecture Templates
            </h2>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: 13,
                color: 'var(--color-text-secondary)',
              }}
            >
              Start with a pre-built architecture and customize it
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

        {/* Template Grid */}
        <div
          style={{
            padding: 24,
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 16,
          }}
        >
          {templates.map((template) => {
            const catStyle = categoryColors[template.category] || categoryColors.backend;
            return (
              <div
                key={template.id}
                style={{
                  backgroundColor: 'var(--color-bg)',
                  border: '1px solid var(--color-surface)',
                  borderRadius: 10,
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  transition: 'border-color 0.2s, transform 0.15s',
                  cursor: 'default',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = '#e94560';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-surface)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Card header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 15,
                      fontWeight: 600,
                      color: 'var(--color-text)',
                    }}
                  >
                    {template.name}
                  </h3>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      padding: '2px 8px',
                      borderRadius: 4,
                      backgroundColor: catStyle.bg,
                      color: catStyle.text,
                      border: `1px solid ${catStyle.border}`,
                    }}
                  >
                    {template.category}
                  </span>
                </div>

                {/* Description */}
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.5,
                  }}
                >
                  {template.description}
                </p>

                {/* Stats */}
                <div
                  style={{
                    display: 'flex',
                    gap: 16,
                    fontSize: 12,
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  <span>{template.nodes.length} nodes</span>
                  <span>{template.edges.length} edges</span>
                </div>

                {/* Use Template button */}
                <button
                  onClick={() => handleUseTemplate(template)}
                  style={{
                    marginTop: 'auto',
                    padding: '10px 16px',
                    borderRadius: 6,
                    border: 'none',
                    background: 'linear-gradient(135deg, #e94560, #c23152)',
                    color: 'white',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'transform 0.1s, box-shadow 0.2s',
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'scale(1.02)';
                    e.target.style.boxShadow = '0 4px 16px rgba(233, 69, 96, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  Use Template
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
