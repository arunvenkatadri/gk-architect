import { useEffect, useRef } from 'react';
import useStore from './store';

export default function useFileWatcher() {
  const nodeMetadata = useStore((s) => s.nodeMetadata);
  const updateNodeMetadata = useStore((s) => s.updateNodeMetadata);
  const watchedDirs = useRef(new Map()); // nodeId -> dirPath

  // Set up watchers whenever node directories change
  useEffect(() => {
    if (!window.electronAPI) return;

    for (const [nodeId, meta] of Object.entries(nodeMetadata)) {
      const dir = meta.directory;
      const currentWatched = watchedDirs.current.get(nodeId);

      if (dir && dir !== currentWatched) {
        // Start watching new directory
        window.electronAPI.fs.watchDir(nodeId, dir);
        watchedDirs.current.set(nodeId, dir);

        // Check initial file count to set status
        window.electronAPI.fs.countFiles(dir).then(({ count }) => {
          if (count > 0 && meta.status === 'not_started') {
            updateNodeMetadata(nodeId, { status: 'built' });
          }
        });
      } else if (!dir && currentWatched) {
        // Stop watching removed directory
        window.electronAPI.fs.unwatchDir(nodeId);
        watchedDirs.current.delete(nodeId);
      }
    }

    // Clean up watchers for deleted nodes
    for (const [nodeId] of watchedDirs.current) {
      if (!nodeMetadata[nodeId]) {
        window.electronAPI.fs.unwatchDir(nodeId);
        watchedDirs.current.delete(nodeId);
      }
    }
  }, [nodeMetadata, updateNodeMetadata]);

  // Listen for file change events from main process
  useEffect(() => {
    if (!window.electronAPI) return;

    const removeListener = window.electronAPI.fs.onChange(({ nodeId, eventType, filename }) => {
      const meta = useStore.getState().nodeMetadata[nodeId];
      if (!meta) return;

      // If files changed and node was "not_started", mark it as "in_progress"
      if (meta.status === 'not_started') {
        updateNodeMetadata(nodeId, { status: 'in_progress' });
      }

      // Refresh file count to potentially mark as "built"
      if (meta.directory) {
        window.electronAPI.fs.countFiles(meta.directory).then(({ count }) => {
          if (count > 0 && meta.status !== 'built') {
            // Don't auto-mark as built immediately — just ensure in_progress
            updateNodeMetadata(nodeId, { status: 'in_progress', fileCount: count });
          }
        });
      }
    });

    return removeListener;
  }, [updateNodeMetadata]);
}
