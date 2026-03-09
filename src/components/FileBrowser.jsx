import React, { useEffect, useState, useCallback } from 'react';

const fileIcons = {
  js: 'JS', jsx: 'JX', ts: 'TS', tsx: 'TX',
  py: 'PY', go: 'GO', rs: 'RS', rb: 'RB',
  json: '{}', yaml: 'YL', yml: 'YL', toml: 'TM',
  md: 'MD', css: 'CS', html: 'HT', sql: 'SQ',
};

function getFileIcon(name) {
  const ext = name.split('.').pop()?.toLowerCase();
  return fileIcons[ext] || '--';
}

export default function FileBrowser({ directory }) {
  const [entries, setEntries] = useState([]);
  const [currentPath, setCurrentPath] = useState(directory);
  const [loading, setLoading] = useState(false);

  const loadDir = useCallback(async (path) => {
    if (!window.electronAPI) {
      setEntries([]);
      return;
    }
    setLoading(true);
    const items = await window.electronAPI.fs.readDir(path);
    setEntries(
      items
        .filter((e) => !e.name.startsWith('.'))
        .sort((a, b) => {
          if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
          return a.name.localeCompare(b.name);
        })
    );
    setCurrentPath(path);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDir(directory);
  }, [directory, loadDir]);

  const navigateUp = () => {
    const parent = currentPath.split('/').slice(0, -1).join('/');
    if (parent) loadDir(parent);
  };

  const navigateTo = (entry) => {
    if (entry.isDirectory) {
      loadDir(entry.path);
    }
  };

  return (
    <div>
      <label className="text-xs text-gray-400 block mb-1">File Browser</label>
      <div className="bg-canvas/50 rounded border border-surface overflow-hidden">
        {/* Path bar */}
        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-surface/50 text-[10px] text-gray-500">
          <button onClick={navigateUp} className="hover:text-white">
            ..
          </button>
          <span className="truncate">{currentPath}</span>
        </div>

        {/* File list */}
        <div className="max-h-48 overflow-y-auto">
          {loading ? (
            <div className="text-xs text-gray-600 p-3 text-center">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="text-xs text-gray-600 p-3 text-center">Empty directory</div>
          ) : (
            entries.map((entry) => (
              <button
                key={entry.path}
                onClick={() => navigateTo(entry)}
                className="w-full flex items-center gap-2 px-2 py-1 text-left hover:bg-surface/30 transition-colors"
              >
                <span
                  className={`text-[9px] font-mono w-5 text-center ${
                    entry.isDirectory ? 'text-accent' : 'text-gray-500'
                  }`}
                >
                  {entry.isDirectory ? '>' : getFileIcon(entry.name)}
                </span>
                <span
                  className={`text-xs truncate ${
                    entry.isDirectory ? 'text-white' : 'text-gray-400'
                  }`}
                >
                  {entry.name}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
