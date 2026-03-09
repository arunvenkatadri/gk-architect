import React, { useState, useEffect, useCallback, memo } from 'react';
import useStore from '../store';

const HIDDEN = new Set(['node_modules', '__pycache__', '.git', '.next', 'dist', '.cache', '.venv', '.DS_Store']);

const fileIcons = {
  js: 'JS', jsx: 'JX', ts: 'TS', tsx: 'TX',
  py: 'PY', go: 'GO', rs: 'RS', rb: 'RB',
  json: '{}', yaml: 'YL', yml: 'YL', toml: 'TM',
  md: 'MD', css: 'CS', html: 'HT', sql: 'SQ',
  cjs: 'CJ', mjs: 'MJ', vue: 'VU', svelte: 'SV',
};

function getIcon(name) {
  const ext = name.split('.').pop()?.toLowerCase();
  return fileIcons[ext] || '--';
}

const TreeNode = memo(function TreeNode({ entry, depth }) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState(null);
  const [loading, setLoading] = useState(false);

  const toggle = useCallback(async () => {
    if (!entry.isDirectory) return;
    const next = !expanded;
    setExpanded(next);
    if (next && children === null) {
      setLoading(true);
      const items = await window.electronAPI.fs.readDir(entry.path);
      setChildren(
        items
          .filter((e) => !e.name.startsWith('.') && !HIDDEN.has(e.name))
          .sort((a, b) => {
            if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
            return a.name.localeCompare(b.name);
          })
      );
      setLoading(false);
    }
  }, [entry, expanded, children]);

  return (
    <>
      <button
        onClick={toggle}
        className="w-full flex items-center gap-1 py-0.5 hover:bg-white/5 transition-colors text-left"
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        {entry.isDirectory ? (
          <span className="text-[10px] text-gray-500 w-3 text-center">
            {expanded ? 'v' : '>'}
          </span>
        ) : (
          <span className="text-[9px] font-mono text-gray-600 w-3 text-center">
            {getIcon(entry.name)}
          </span>
        )}
        <span
          className={`text-xs truncate ${
            entry.isDirectory ? 'text-gray-200' : 'text-gray-400'
          }`}
        >
          {entry.name}
        </span>
      </button>
      {expanded && loading && (
        <div className="text-[10px] text-gray-600" style={{ paddingLeft: 22 + depth * 14 }}>
          ...
        </div>
      )}
      {expanded &&
        children &&
        children.map((child) => (
          <TreeNode key={child.path} entry={child} depth={depth + 1} />
        ))}
    </>
  );
});

export default function FileTreeSidebar() {
  const projectDir = useStore((s) => s.projectDir);
  const projectName = useStore((s) => s.projectName);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectDir || !window.electronAPI) {
      setLoading(false);
      return;
    }
    setLoading(true);
    window.electronAPI.fs.readDir(projectDir).then((items) => {
      setEntries(
        items
          .filter((e) => !e.name.startsWith('.') && !HIDDEN.has(e.name))
          .sort((a, b) => {
            if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
            return a.name.localeCompare(b.name);
          })
      );
      setLoading(false);
    });
  }, [projectDir]);

  return (
    <div className="w-60 bg-panel border-r border-surface flex flex-col overflow-hidden shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-surface">
        <span className="text-xs font-medium text-gray-300 truncate">{projectName || 'Files'}</span>
        <button
          onClick={toggleSidebar}
          className="text-gray-500 hover:text-white text-sm leading-none"
          title="Hide sidebar"
        >
          &times;
        </button>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {loading ? (
          <div className="text-xs text-gray-600 p-3 text-center">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="text-xs text-gray-600 p-3 text-center">Empty</div>
        ) : (
          entries.map((entry) => (
            <TreeNode key={entry.path} entry={entry} depth={0} />
          ))
        )}
      </div>
    </div>
  );
}
