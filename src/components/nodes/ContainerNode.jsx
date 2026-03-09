import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import useStore from '../../store';

function ContainerNode({ id, data, selected }) {
  const meta = useStore((s) => s.nodeMetadata[id]);
  const container = meta?.container;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 12,
        border: `2px dashed ${selected ? '#f97316' : 'rgba(249, 115, 22, 0.5)'}`,
        backgroundColor: 'rgba(249, 115, 22, 0.04)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderBottom: '1px dashed rgba(249, 115, 22, 0.2)',
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: '#f97316',
            background: 'rgba(249, 115, 22, 0.15)',
            padding: '2px 6px',
            borderRadius: 4,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          container
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>
          {data.label}
        </span>
        {container?.image && (
          <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginLeft: 'auto' }}>
            {container.image}
          </span>
        )}
      </div>

      {/* Port badges */}
      {container?.ports?.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: -10,
            right: 12,
            display: 'flex',
            gap: 4,
          }}
        >
          {container.ports.map((p, i) => (
            <span
              key={i}
              style={{
                fontSize: 9,
                color: '#f97316',
                background: 'var(--color-bg)',
                border: '1px solid rgba(249, 115, 22, 0.3)',
                padding: '1px 5px',
                borderRadius: 3,
              }}
            >
              :{p.split(':')[0]}
            </span>
          ))}
        </div>
      )}

      {/* Depends-on badges */}
      {container?.dependsOn?.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 6,
            left: 12,
            display: 'flex',
            gap: 4,
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 9, color: 'var(--color-text-secondary)' }}>needs:</span>
          {container.dependsOn.map((d, i) => (
            <span
              key={i}
              style={{
                fontSize: 9,
                color: '#f97316',
                background: 'rgba(249, 115, 22, 0.1)',
                border: '1px solid rgba(249, 115, 22, 0.2)',
                padding: '1px 5px',
                borderRadius: 3,
              }}
            >
              {d}
            </span>
          ))}
        </div>
      )}

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !border-2 !border-white/50 !bg-canvas"
        style={{ backgroundColor: '#f97316' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !border-2 !border-white/50 !bg-canvas"
        style={{ backgroundColor: '#f97316' }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!w-3 !h-3 !border-2 !border-white/50 !bg-canvas"
        style={{ backgroundColor: '#f97316' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-3 !h-3 !border-2 !border-white/50 !bg-canvas"
        style={{ backgroundColor: '#f97316' }}
      />
    </div>
  );
}

export default memo(ContainerNode);
