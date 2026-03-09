import { useEffect, useRef } from 'react';
import useStore from '../store';

const POLL_INTERVAL = 10000; // 10 seconds

export default function useGitStatus() {
  const nodes = useStore((s) => s.nodes);
  const nodeMetadata = useStore((s) => s.nodeMetadata);
  const setGitStatus = useStore((s) => s.setGitStatus);
  const intervalRef = useRef(null);

  useEffect(() => {
    async function pollGitStatus() {
      if (!window.electronAPI?.git?.statusBatch) return;

      const items = [];
      for (const node of nodes) {
        const meta = nodeMetadata[node.id];
        if (meta?.directory) {
          items.push({ nodeId: node.id, dir: meta.directory });
        }
      }

      if (items.length === 0) return;

      try {
        const results = await window.electronAPI.git.statusBatch(items);
        setGitStatus(results);
      } catch (err) {
        // Silently ignore — git status is best-effort
      }
    }

    // Poll immediately on mount / when nodes change
    pollGitStatus();

    // Then poll every 10 seconds
    intervalRef.current = setInterval(pollGitStatus, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [nodes, nodeMetadata, setGitStatus]);
}
