import React, { useCallback, useState } from 'react';
import useStore, { ML_NODE_TYPES } from '../store';

const CATEGORIES = [
  { key: 'io', label: 'I/O' },
  { key: 'core', label: 'Core' },
  { key: 'conv', label: 'Conv' },
  { key: 'recurrent', label: 'RNN' },
  { key: 'transformer', label: 'Transformer' },
  { key: 'norm', label: 'Norm' },
  { key: 'reg', label: 'Reg' },
  { key: 'pool', label: 'Pool' },
  { key: 'reshape', label: 'Shape' },
  { key: 'merge', label: 'Merge' },
  { key: 'block', label: 'Blocks' },
];

export default function MLToolbar() {
  const addNode = useStore((s) => s.addNode);
  const [expandedCat, setExpandedCat] = useState(null);

  const handleAddNode = useCallback((type) => {
    const x = 200 + Math.random() * 400;
    const y = 100 + Math.random() * 300;
    addNode(type, { x, y });
  }, [addNode]);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {CATEGORIES.map(cat => {
        const types = Object.entries(ML_NODE_TYPES).filter(([, v]) => v.category === cat.key);
        if (types.length === 0) return null;
        return (
          <div key={cat.key} className="relative">
            <button
              onClick={() => setExpandedCat(expandedCat === cat.key ? null : cat.key)}
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                expandedCat === cat.key ? 'bg-accent text-white' : 'bg-surface text-secondary hover:text-white'
              }`}
            >
              {cat.label}
            </button>
            {expandedCat === cat.key && (
              <div className="absolute top-full left-0 mt-1 bg-panel border border-surface rounded-lg shadow-xl z-50 p-2 min-w-[160px]"
                   onMouseLeave={() => setExpandedCat(null)}>
                {types.map(([key, { label, color, icon }]) => (
                  <button
                    key={key}
                    onClick={() => { handleAddNode(key); setExpandedCat(null); }}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/gk-node-type', key);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    className="w-full text-left px-3 py-1.5 rounded text-xs hover:bg-surface transition-colors flex items-center gap-2 cursor-grab active:cursor-grabbing"
                  >
                    <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0"
                          style={{ backgroundColor: color + '33', color }}>
                      {icon}
                    </span>
                    <span className="text-primary">{label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
