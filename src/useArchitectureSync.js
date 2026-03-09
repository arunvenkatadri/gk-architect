import { useEffect, useRef } from 'react';
import useStore from './store';

export default function useArchitectureSync() {
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const nodeMetadata = useStore((s) => s.nodeMetadata);
  const projectDir = useStore((s) => s.projectDir);
  const generateArchitectureMd = useStore((s) => s.generateArchitectureMd);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!projectDir || !window.electronAPI || nodes.length === 0) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      const content = generateArchitectureMd();
      const filePath = projectDir + '/ARCHITECTURE.md';
      window.electronAPI.fs.writeFile(filePath, content);
    }, 2000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [nodes, edges, nodeMetadata, projectDir, generateArchitectureMd]);
}
