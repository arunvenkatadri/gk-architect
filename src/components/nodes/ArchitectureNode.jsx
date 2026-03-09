import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import useStore from '../../store';

const statusColors = {
  not_started: '#6b7280',
  in_progress: '#f59e0b',
  built: '#10b981',
};

const statusLabels = {
  not_started: '',
  in_progress: 'Building...',
  built: 'Built',
};

const gitStatusColors = {
  clean: '#10b981',
  modified: '#f59e0b',
  untracked: '#ef4444',
  unknown: '#6b7280',
};

const gitStatusLabels = {
  clean: 'Clean',
  modified: 'Modified',
  untracked: 'Untracked files',
  unknown: 'Unknown',
};

function ArchitectureNode({ id, data, selected }) {
  const meta = useStore((s) => s.nodeMetadata[id]);
  const gitStatus = useStore((s) => s.gitStatus[id]);
  const status = meta?.status || 'not_started';
  const description = meta?.description || '';

  return (
    <div
      className={`rounded-lg border-2 transition-all duration-200 min-w-[160px] max-w-[240px] ${
        selected ? 'selected-node' : ''
      }`}
      style={{
        borderColor: data.color,
        backgroundColor: data.color + '15',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-t-md"
        style={{ backgroundColor: data.color + '30' }}
      >
        <span
          className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
          style={{ backgroundColor: data.color, color: '#fff' }}
        >
          {data.icon}
        </span>
        <span className="text-sm font-semibold text-primary truncate flex-1">{data.label}</span>
        {data.label.includes(' (') && (
          <span className="text-[9px] px-1 py-0.5 rounded ml-1" style={{ backgroundColor: 'rgba(99, 102, 241, 0.3)', color: '#818cf8' }}>
            EXT
          </span>
        )}
        {status !== 'not_started' && (
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: statusColors[status] }}
            title={statusLabels[status]}
          />
        )}
        {gitStatus && gitStatus.status !== 'unknown' && (
          <span className="relative flex items-center" title={`Git: ${gitStatusLabels[gitStatus.status]}${gitStatus.changed > 0 ? ` (${gitStatus.changed})` : ''}`}>
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: gitStatusColors[gitStatus.status] }}
            />
            {gitStatus.changed > 0 && (
              <span
                className="absolute -top-1.5 -right-2 text-[8px] font-bold leading-none px-0.5 rounded"
                style={{ color: gitStatusColors[gitStatus.status] }}
              >
                {gitStatus.changed}
              </span>
            )}
          </span>
        )}
      </div>

      {/* Description preview */}
      {description && (
        <div className="px-3 py-1.5 text-xs text-secondary line-clamp-2 border-t"
          style={{ borderColor: data.color + '30' }}>
          {description}
        </div>
      )}

      {/* File count badge */}
      {meta?.files?.length > 0 && (
        <div className="px-3 py-1 text-xs text-muted">
          {meta.files.length} file{meta.files.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !border-2 !border-white/50 !bg-canvas"
        style={{ backgroundColor: data.color }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !border-2 !border-white/50 !bg-canvas"
        style={{ backgroundColor: data.color }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!w-3 !h-3 !border-2 !border-white/50 !bg-canvas"
        style={{ backgroundColor: data.color }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-3 !h-3 !border-2 !border-white/50 !bg-canvas"
        style={{ backgroundColor: data.color }}
      />
    </div>
  );
}

export default memo(ArchitectureNode);
