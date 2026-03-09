import React, { useState, useMemo, useCallback } from 'react';
import useStore, { NODE_TYPES } from '../store';
import { topoSort, hasCycle } from '../utils/topoSort';

const STATUS_ICONS = {
  pending: '\u25CB',    // empty circle
  building: '\u25D4',   // half circle
  done: '\u25CF',       // filled circle
  skipped: '\u2013',    // en dash
};

const STATUS_COLORS = {
  pending: '#6b7280',
  building: '#f59e0b',
  done: '#10b981',
  skipped: '#4b5563',
};

export default function BuildOrchestrator({ onClose, sendToTerminal }) {
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const nodeMetadata = useStore((s) => s.nodeMetadata);
  const getBuildContext = useStore((s) => s.getBuildContext);
  const updateNodeMetadata = useStore((s) => s.updateNodeMetadata);

  // Filter out container nodes, only build actual components
  const buildableNodes = useMemo(
    () => nodes.filter((n) => n.type !== 'containerNode'),
    [nodes]
  );

  // Compute build order using topological sort
  const buildOrder = useMemo(() => {
    const orderedIds = topoSort(buildableNodes, edges);
    return orderedIds
      .map((id) => buildableNodes.find((n) => n.id === id))
      .filter(Boolean);
  }, [buildableNodes, edges]);

  const cycleDetected = useMemo(
    () => hasCycle(buildableNodes, edges),
    [buildableNodes, edges]
  );

  // Track status of each component: pending | building | done | skipped
  const [componentStatus, setComponentStatus] = useState(() => {
    const initial = {};
    for (const node of buildOrder) {
      initial[node.id] = 'pending';
    }
    return initial;
  });

  const [currentIndex, setCurrentIndex] = useState(-1);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);

  const completedCount = Object.values(componentStatus).filter(
    (s) => s === 'done' || s === 'skipped'
  ).length;

  const progressPercent =
    buildOrder.length > 0 ? (completedCount / buildOrder.length) * 100 : 0;

  const sendBuildCommand = useCallback(
    (node) => {
      const context = getBuildContext(node.id);
      if (context) {
        sendToTerminal(context);
        updateNodeMetadata(node.id, { status: 'in_progress' });
      }
    },
    [getBuildContext, sendToTerminal, updateNodeMetadata]
  );

  const handleStart = useCallback(() => {
    if (buildOrder.length === 0) return;
    setStarted(true);
    setCurrentIndex(0);
    const firstNode = buildOrder[0];
    setComponentStatus((prev) => ({ ...prev, [firstNode.id]: 'building' }));
    sendBuildCommand(firstNode);
  }, [buildOrder, sendBuildCommand]);

  const handleNext = useCallback(() => {
    if (currentIndex < 0 || currentIndex >= buildOrder.length) return;

    // Mark current as done
    const currentNode = buildOrder[currentIndex];
    setComponentStatus((prev) => ({ ...prev, [currentNode.id]: 'done' }));
    updateNodeMetadata(currentNode.id, { status: 'built' });

    const nextIndex = currentIndex + 1;
    if (nextIndex >= buildOrder.length) {
      setCurrentIndex(nextIndex);
      setFinished(true);
      return;
    }

    // Advance to next
    setCurrentIndex(nextIndex);
    const nextNode = buildOrder[nextIndex];
    setComponentStatus((prev) => ({ ...prev, [nextNode.id]: 'building' }));
    sendBuildCommand(nextNode);
  }, [currentIndex, buildOrder, sendBuildCommand, updateNodeMetadata]);

  const handleSkip = useCallback(() => {
    if (currentIndex < 0 || currentIndex >= buildOrder.length) return;

    const currentNode = buildOrder[currentIndex];
    setComponentStatus((prev) => ({ ...prev, [currentNode.id]: 'skipped' }));

    const nextIndex = currentIndex + 1;
    if (nextIndex >= buildOrder.length) {
      setCurrentIndex(nextIndex);
      setFinished(true);
      return;
    }

    setCurrentIndex(nextIndex);
    const nextNode = buildOrder[nextIndex];
    setComponentStatus((prev) => ({ ...prev, [nextNode.id]: 'building' }));
    sendBuildCommand(nextNode);
  }, [currentIndex, buildOrder, sendBuildCommand]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-panel border border-surface rounded-xl shadow-2xl w-[480px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface">
          <h2 className="text-sm font-semibold text-white">Build All Components</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-lg leading-none"
          >
            &times;
          </button>
        </div>

        {/* Cycle warning */}
        {cycleDetected && (
          <div className="mx-5 mt-3 px-3 py-2 rounded bg-amber-900/40 border border-amber-700/50 text-xs text-amber-300">
            Cycle detected in dependencies. Build order may not be optimal.
          </div>
        )}

        {/* Progress bar */}
        {started && (
          <div className="px-5 pt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">
                {finished ? 'Complete' : `Building ${completedCount + 1} of ${buildOrder.length}`}
              </span>
              <span className="text-xs text-gray-500">
                {completedCount}/{buildOrder.length}
              </span>
            </div>
            <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Component list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1.5">
          {buildOrder.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-8">
              No components to build. Add nodes to your architecture first.
            </div>
          ) : (
            buildOrder.map((node, index) => {
              const typeInfo = NODE_TYPES[node.data.nodeType] || NODE_TYPES.generic;
              const status = componentStatus[node.id] || 'pending';
              const isCurrent = started && index === currentIndex;

              return (
                <div
                  key={node.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isCurrent
                      ? 'bg-accent/15 border border-accent/30'
                      : status === 'done'
                      ? 'bg-emerald-900/10 border border-emerald-900/20'
                      : status === 'skipped'
                      ? 'bg-surface/30 border border-transparent opacity-50'
                      : 'bg-surface/20 border border-transparent'
                  }`}
                >
                  {/* Order number */}
                  <span className="text-xs text-gray-600 w-4 text-right shrink-0">
                    {index + 1}
                  </span>

                  {/* Status indicator */}
                  <span
                    className="text-sm shrink-0"
                    style={{ color: STATUS_COLORS[status] }}
                  >
                    {STATUS_ICONS[status]}
                  </span>

                  {/* Type icon */}
                  <span
                    className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ backgroundColor: typeInfo.color, color: '#fff' }}
                  >
                    {typeInfo.icon}
                  </span>

                  {/* Name */}
                  <span
                    className={`text-sm truncate flex-1 ${
                      status === 'skipped' ? 'text-gray-500 line-through' : 'text-white'
                    }`}
                  >
                    {node.data.label}
                  </span>

                  {/* Type badge */}
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded shrink-0"
                    style={{
                      backgroundColor: typeInfo.color + '20',
                      color: typeInfo.color,
                    }}
                  >
                    {typeInfo.label}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-surface">
          {finished ? (
            <>
              <span className="text-xs text-emerald-400">
                Build complete: {Object.values(componentStatus).filter((s) => s === 'done').length} built,{' '}
                {Object.values(componentStatus).filter((s) => s === 'skipped').length} skipped
              </span>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-accent hover:bg-accent-hover transition-colors"
              >
                Done
              </button>
            </>
          ) : !started ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-surface hover:bg-gray-600 text-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStart}
                disabled={buildOrder.length === 0}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-accent hover:bg-accent-hover transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Start Build
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-surface hover:bg-gray-600 text-gray-300 transition-colors"
              >
                Cancel
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleSkip}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-surface hover:bg-gray-600 text-gray-400 transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={handleNext}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-accent hover:bg-accent-hover transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
