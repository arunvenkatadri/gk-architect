import { useEffect, useState, useCallback, useRef } from 'react';
import useStore from './store';

const AUTOSAVE_INTERVAL_MS = 30_000; // 30 seconds

export default function useAutoSave() {
  const projectDir = useStore((s) => s.projectDir);
  const serialize = useStore((s) => s.serialize);
  const deserialize = useStore((s) => s.deserialize);
  const nodes = useStore((s) => s.nodes);

  const [hasRecovery, setHasRecovery] = useState(false);
  const [recoveryData, setRecoveryData] = useState(null);

  // Keep a ref to projectDir so the interval callback always has the latest
  const projectDirRef = useRef(projectDir);
  projectDirRef.current = projectDir;

  const serializeRef = useRef(serialize);
  serializeRef.current = serialize;

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  // Check for recovery data on mount / when projectDir changes
  useEffect(() => {
    if (!projectDir || !window.electronAPI?.autosave) return;

    window.electronAPI.autosave.check(projectDir).then((result) => {
      if (result && result.exists && result.data) {
        setHasRecovery(true);
        setRecoveryData(result.data);
      } else {
        setHasRecovery(false);
        setRecoveryData(null);
      }
    });
  }, [projectDir]);

  // Autosave interval
  useEffect(() => {
    if (!window.electronAPI?.autosave) return;

    const intervalId = setInterval(() => {
      if (nodesRef.current.length > 0 && projectDirRef.current) {
        const data = serializeRef.current();
        window.electronAPI.autosave.write(data);
      }
    }, AUTOSAVE_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, []);

  const recoverFromAutoSave = useCallback(() => {
    if (recoveryData) {
      deserialize(recoveryData);
    }
    if (window.electronAPI?.autosave && projectDir) {
      window.electronAPI.autosave.clear(projectDir);
    }
    setHasRecovery(false);
    setRecoveryData(null);
  }, [recoveryData, deserialize, projectDir]);

  const dismissRecovery = useCallback(() => {
    if (window.electronAPI?.autosave && projectDir) {
      window.electronAPI.autosave.clear(projectDir);
    }
    setHasRecovery(false);
    setRecoveryData(null);
  }, [projectDir]);

  return { hasRecovery, recoveryData, recoverFromAutoSave, dismissRecovery };
}
