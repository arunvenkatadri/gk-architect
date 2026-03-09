import React, { useEffect, useState, useCallback } from 'react';
import { MarkerType } from '@xyflow/react';
import useStore, { NODE_TYPES } from '../store';

const TYPE_COLORS = {
  service: '#6366f1',
  ui: '#06b6d4',
  database: '#f59e0b',
  api: '#10b981',
  queue: '#8b5cf6',
  infra: '#f97316',
  generic: '#6b7280',
};

export default function ProjectScanner() {
  const projectDir = useStore((s) => s.projectDir);
  const projectName = useStore((s) => s.projectName);
  const addNode = useStore((s) => s.addNode);
  const updateNodeLabel = useStore((s) => s.updateNodeLabel);
  const updateNodeMetadata = useStore((s) => s.updateNodeMetadata);
  const setEdges = useStore((s) => s.setEdges);
  const nodes = useStore((s) => s.nodes);

  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Scanning project...');
  const [selected, setSelected] = useState(new Set());
  const [scanMode, setScanMode] = useState('quick'); // 'quick' or 'ai'
  const [hasScanned, setHasScanned] = useState(false);

  const runScan = useCallback(async (mode) => {
    if (!projectDir || !window.electronAPI) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setScanResult(null);
    setHasScanned(true);

    if (mode === 'ai') {
      setLoadingMessage('Analyzing with Claude...');
      try {
        const aiResult = await window.electronAPI.project.aiScan(projectDir);
        if (aiResult) {
          setScanResult(aiResult);
          setSelected(new Set(aiResult.detected.map((_, i) => i)));
          setLoading(false);
          return;
        }
      } catch {}
      // AI scan failed or returned null - fall back to quick scan
      setLoadingMessage('AI scan unavailable, falling back to quick scan...');
    } else {
      setLoadingMessage('Scanning project...');
    }

    const result = await window.electronAPI.project.scan(projectDir);
    setScanResult(result);
    setSelected(new Set(result.detected.map((_, i) => i)));
    setLoading(false);
  }, [projectDir]);

  useEffect(() => {
    runScan(scanMode);
  }, [projectDir]); // only re-run on projectDir change, not scanMode

  const toggleSelected = useCallback((idx) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const handleScaffold = useCallback(() => {
    if (!scanResult) return;

    const selectedIndices = [...selected].sort((a, b) => a - b);
    const origToNodeId = {};

    // Build container -> component mapping from scan results
    const containerChildren = {}; // containerName -> [origIdx]
    const childOfContainer = {}; // origIdx -> containerName

    if (scanResult.containers) {
      for (const c of scanResult.containers) {
        if (c.mapsTo >= 0 && selected.has(c.mapsTo)) {
          if (!containerChildren[c.name]) containerChildren[c.name] = [];
          containerChildren[c.name].push(c.mapsTo);
          childOfContainer[c.mapsTo] = c.name;
        }
      }
    }

    // Create container group nodes first (must come before children in nodes array)
    const containerNodeIds = {}; // containerName -> { id }
    const containerGap = 60;
    let containerX = 80;
    let containerY = 60;
    const maxRowWidth = 1200;
    let rowMaxHeight = 0;

    if (scanResult.containers) {
      for (const c of scanResult.containers) {
        const children = containerChildren[c.name] || [];
        if (children.length === 0) continue;

        const containerW = Math.max(300, children.length * 240 + 40);
        const containerH = 240;

        if (containerX + containerW > maxRowWidth && containerX > 80) {
          containerX = 80;
          containerY += rowMaxHeight + containerGap;
          rowMaxHeight = 0;
        }

        const id = addNode('infra', { x: containerX, y: containerY }, {
          rfType: 'containerNode',
          label: c.name,
          style: { width: containerW, height: containerH },
        });

        updateNodeMetadata(id, {
          description: `Docker container: ${c.image || 'builds from ' + (c.build || '.')}`,
          container: {
            image: c.image || '',
            build: c.build || '',
            ports: c.ports || [],
            volumes: c.volumes || [],
            env: c.env || [],
            dependsOn: c.dependsOn || [],
          },
          status: 'built',
        });

        containerNodeIds[c.name] = { id };
        containerX += containerW + containerGap;
        rowMaxHeight = Math.max(rowMaxHeight, containerH);
      }
    }

    // Layout for standalone nodes (those not inside a container)
    const hasContainers = Object.keys(containerNodeIds).length > 0;
    const standaloneStartY = hasContainers ? containerY + rowMaxHeight + 80 : 80;
    let standaloneIdx = 0;
    const cols = 3;
    const spacing = 280;

    // Create component nodes
    selectedIndices.forEach((origIdx) => {
      const item = scanResult.detected[origIdx];
      const parentContainerName = childOfContainer[origIdx];

      let x, y, parentId;
      if (parentContainerName && containerNodeIds[parentContainerName]) {
        const parent = containerNodeIds[parentContainerName];
        const childIdx = (containerChildren[parentContainerName] || []).indexOf(origIdx);
        x = 20 + childIdx * 240;
        y = 50;
        parentId = parent.id;
      } else {
        const col = standaloneIdx % cols;
        const row = Math.floor(standaloneIdx / cols);
        x = 100 + col * spacing;
        y = standaloneStartY + row * 200;
        standaloneIdx++;
      }

      const nodeOptions = parentId ? { parentId } : {};
      const id = addNode(item.type, { x, y }, nodeOptions);
      updateNodeLabel(id, item.name);
      updateNodeMetadata(id, {
        directory: item.dir,
        description: item.description || item.reason,
        status: 'built',
      });

      // Attach container metadata to components detected from docker (e.g., databases)
      if (item.container) {
        const c = scanResult.containers?.find((ct) => ct.name === item.container);
        if (c) {
          updateNodeMetadata(id, {
            container: {
              image: c.image || '',
              build: c.build || '',
              ports: c.ports || [],
              volumes: c.volumes || [],
              env: c.env || [],
              dependsOn: c.dependsOn || [],
            },
          });
        }
      }

      origToNodeId[origIdx] = id;
    });

    // Create edges from detected connections (only for selected nodes)
    if (scanResult.connections && scanResult.connections.length > 0) {
      const newEdges = [];
      for (const conn of scanResult.connections) {
        const sourceId = origToNodeId[conn.from];
        const targetId = origToNodeId[conn.to];
        if (sourceId && targetId) {
          newEdges.push({
            id: `edge-${sourceId}-${targetId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            source: sourceId,
            target: targetId,
            label: conn.label || 'imports',
            type: 'default',
            animated: true,
            style: { stroke: '#e94560', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#e94560' },
            data: { label: conn.label || 'imports' },
          });
        }
      }
      if (newEdges.length > 0) {
        setEdges(newEdges);
      }
    }
  }, [scanResult, selected, addNode, updateNodeLabel, updateNodeMetadata, setEdges]);

  // Don't show if nodes already exist
  if (nodes.length > 0) return null;

  if (loading) {
    return (
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 10,
        pointerEvents: 'none',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#6b7280', fontSize: 14 }}>{loadingMessage}</div>
          {scanMode === 'ai' && (
            <div style={{ color: '#4a5568', fontSize: 11, marginTop: 6 }}>
              This may take up to 30 seconds
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!scanResult || scanResult.detected.length === 0) {
    return (
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 10,
        pointerEvents: 'auto',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#e2e8f0', marginBottom: 8 }}>
            {projectName}
          </div>
          <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 16 }}>
            No familiar project structure detected.
            <br />
            {scanMode === 'quick' ? (
              <span>
                Try{' '}
                <button
                  onClick={() => { setScanMode('ai'); runScan('ai'); }}
                  style={{
                    background: 'none', border: 'none', color: '#6366f1',
                    cursor: 'pointer', textDecoration: 'underline', fontSize: 13,
                    padding: 0,
                  }}
                >
                  AI Scan
                </button>
                {' '}for deeper analysis, or use the toolbar above.
              </span>
            ) : (
              <span>Use the toolbar above to add architecture components.</span>
            )}
          </div>
          {scanResult && scanResult.topLevel.length > 0 && (
            <div style={{
              textAlign: 'left', background: 'rgba(22, 33, 62, 0.7)',
              borderRadius: 8, padding: 12, border: '1px solid var(--color-surface)',
              pointerEvents: 'auto',
            }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>Project contents:</div>
              {scanResult.topLevel.slice(0, 12).map((item) => (
                <div key={item.path} style={{ fontSize: 12, color: item.isDirectory ? '#e2e8f0' : '#6b7280', padding: '2px 0' }}>
                  {item.isDirectory ? '> ' : '  '}{item.name}
                  {item.isDirectory && item.childCount > 0 && (
                    <span style={{ color: '#4a5568', marginLeft: 6, fontSize: 10 }}>({item.childCount} items)</span>
                  )}
                </div>
              ))}
              {scanResult.topLevel.length > 12 && (
                <div style={{ fontSize: 10, color: '#4a5568', marginTop: 4 }}>
                  +{scanResult.topLevel.length - 12} more...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Count connections that apply to the current selection
  const activeConnections = (scanResult.connections || []).filter(
    (c) => selected.has(c.from) && selected.has(c.to)
  );

  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 10,
    }}>
      <div style={{
        background: 'rgba(22, 33, 62, 0.95)',
        borderRadius: 12,
        padding: 32,
        border: '1px solid var(--color-surface)',
        maxWidth: 520,
        width: '90%',
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>
            {projectName}
          </div>
          {/* Scan mode toggle */}
          <div style={{
            display: 'flex', gap: 0, borderRadius: 6, overflow: 'hidden',
            border: '1px solid var(--color-surface)',
          }}>
            <button
              onClick={() => { if (scanMode !== 'quick') { setScanMode('quick'); runScan('quick'); } }}
              style={{
                padding: '4px 10px', fontSize: 10, fontWeight: 600, border: 'none', cursor: 'pointer',
                background: scanMode === 'quick' ? 'var(--color-surface)' : 'transparent',
                color: scanMode === 'quick' ? '#e2e8f0' : '#6b7280',
              }}
            >
              Quick Scan
            </button>
            <button
              onClick={() => { if (scanMode !== 'ai') { setScanMode('ai'); runScan('ai'); } }}
              style={{
                padding: '4px 10px', fontSize: 10, fontWeight: 600, border: 'none', cursor: 'pointer',
                background: scanMode === 'ai' ? '#6366f1' : 'transparent',
                color: scanMode === 'ai' ? '#fff' : '#6b7280',
              }}
            >
              AI Scan
            </button>
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 20 }}>
          {scanResult.aiPowered && (
            <span style={{
              fontSize: 10, fontWeight: 600, color: '#a78bfa',
              background: 'rgba(99, 102, 241, 0.15)', padding: '2px 6px',
              borderRadius: 3, marginRight: 6,
            }}>
              AI-powered
            </span>
          )}
          Detected {scanResult.detected.length} component{scanResult.detected.length !== 1 ? 's' : ''}
          {activeConnections.length > 0 && (
            <span style={{ color: '#e94560' }}>
              {' '}and {activeConnections.length} connection{activeConnections.length !== 1 ? 's' : ''}
            </span>
          )}
          {scanResult.containers?.length > 0 && (
            <span style={{ color: '#f97316' }}>
              {' '}in {scanResult.containers.length} Docker container{scanResult.containers.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
          {scanResult.detected.map((item, i) => {
            const isSelected = selected.has(i);
            const color = TYPE_COLORS[item.type] || TYPE_COLORS.generic;
            // Count connections involving this item
            const connCount = (scanResult.connections || []).filter(
              (c) => (c.from === i || c.to === i) && selected.has(c.from) && selected.has(c.to)
            ).length;
            return (
              <button
                key={i}
                onClick={() => toggleSelected(i)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: `1px solid ${isSelected ? color : 'var(--color-surface)'}`,
                  background: isSelected ? color + '20' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{
                  width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                  border: `2px solid ${isSelected ? color : '#4a5568'}`,
                  background: isSelected ? color : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, color: '#fff', fontWeight: 700,
                }}>
                  {isSelected ? '\u2713' : ''}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 600, color,
                  background: color + '25', padding: '2px 6px',
                  borderRadius: 3, textTransform: 'uppercase',
                  flexShrink: 0,
                }}>
                  {NODE_TYPES[item.type]?.label || item.type}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500 }}>{item.name}</div>
                  <div style={{ fontSize: 10, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.reason}
                  </div>
                </div>
                {isSelected && connCount > 0 && (
                  <span style={{
                    fontSize: 9, color: '#e94560', background: 'rgba(233, 69, 96, 0.15)',
                    padding: '2px 5px', borderRadius: 3, flexShrink: 0,
                  }}>
                    {connCount} link{connCount !== 1 ? 's' : ''}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Connection preview */}
        {activeConnections.length > 0 && (
          <div style={{
            marginTop: 12, padding: 8, background: 'rgba(233, 69, 96, 0.08)',
            borderRadius: 6, border: '1px solid rgba(233, 69, 96, 0.2)',
          }}>
            <div style={{ fontSize: 10, color: '#e94560', marginBottom: 4, fontWeight: 600 }}>
              Detected connections:
            </div>
            {activeConnections.slice(0, 8).map((c, i) => (
              <div key={i} style={{ fontSize: 11, color: '#9ca3af', padding: '1px 0' }}>
                {scanResult.detected[c.from].name}
                <span style={{ color: '#e94560', margin: '0 4px' }}>&rarr;</span>
                {scanResult.detected[c.to].name}
                <span style={{ color: '#6b7280', marginLeft: 4 }}>({c.label})</span>
              </div>
            ))}
            {activeConnections.length > 8 && (
              <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
                +{activeConnections.length - 8} more...
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button
            onClick={handleScaffold}
            disabled={selected.size === 0}
            style={{
              flex: 1, padding: '12px 16px', borderRadius: 8, border: 'none',
              background: selected.size > 0 ? 'linear-gradient(135deg, var(--color-accent), var(--color-accent-hover))' : 'var(--color-bg)',
              color: selected.size > 0 ? '#fff' : '#4a5568',
              fontSize: 14, fontWeight: 600, cursor: selected.size > 0 ? 'pointer' : 'default',
            }}
          >
            Add {selected.size} Component{selected.size !== 1 ? 's' : ''}
            {activeConnections.length > 0 ? ` + ${activeConnections.length} Connection${activeConnections.length !== 1 ? 's' : ''}` : ''}
          </button>
          <button
            onClick={() => setScanResult(null)}
            style={{
              padding: '12px 16px', borderRadius: 8,
              border: '1px solid var(--color-surface)', background: 'transparent',
              color: '#6b7280', fontSize: 14, cursor: 'pointer',
            }}
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
