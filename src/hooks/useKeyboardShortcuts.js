import { useEffect, useCallback } from 'react';
import useStore from '../store';

/**
 * Global keyboard shortcuts for the application.
 *
 * Skips shortcuts when:
 * - The terminal (.xterm container) is focused
 * - An input or textarea element is focused
 *
 * @param {Object} options
 * @param {Function} options.onSave - callback to trigger save
 */
export default function useKeyboardShortcuts({ onSave } = {}) {
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const nodes = useStore((s) => s.nodes);
  const setSelectedNodeIds = useStore((s) => s.setSelectedNodeIds);
  const setSelectedEdgeId = useStore((s) => s.setSelectedEdgeId);
  const setPanelOpen = useStore((s) => s.setPanelOpen);
  const copySelection = useStore((s) => s.copySelection);
  const pasteClipboard = useStore((s) => s.pasteClipboard);
  const deleteSelectedNodes = useStore((s) => s.deleteSelectedNodes);
  const setNodes = useStore((s) => s.setNodes);

  const handler = useCallback(
    (e) => {
      const el = document.activeElement;

      // Skip when terminal is focused
      if (el && el.closest('.xterm')) return;

      // Skip when typing in input/textarea/contenteditable
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || el?.isContentEditable) {
        // Allow Escape even in inputs
        if (e.key !== 'Escape') return;
      }

      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      // Cmd/Ctrl+Z -> undo, Cmd/Ctrl+Shift+Z -> redo
      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      // Cmd/Ctrl+S -> save
      if (mod && key === 's') {
        e.preventDefault();
        if (onSave) onSave();
        return;
      }

      // Cmd/Ctrl+A -> select all nodes
      if (mod && key === 'a') {
        e.preventDefault();
        const allIds = nodes.map((n) => n.id);
        setSelectedNodeIds(allIds);
        // Also mark nodes as selected in React Flow state
        setNodes(nodes.map((n) => ({ ...n, selected: true })));
        return;
      }

      // Cmd/Ctrl+C -> copy selection
      if (mod && key === 'c') {
        e.preventDefault();
        copySelection();
        return;
      }

      // Cmd/Ctrl+V -> paste clipboard
      if (mod && key === 'v') {
        e.preventDefault();
        pasteClipboard();
        return;
      }

      // Delete/Backspace -> delete selected nodes
      if (key === 'delete' || key === 'backspace') {
        e.preventDefault();
        deleteSelectedNodes();
        return;
      }

      // Escape -> deselect all, close panel
      if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedNodeIds([]);
        setSelectedEdgeId(null);
        setPanelOpen(false);
        // Deselect nodes in React Flow state
        setNodes(nodes.map((n) => ({ ...n, selected: false })));
        return;
      }
    },
    [
      undo,
      redo,
      onSave,
      nodes,
      setSelectedNodeIds,
      setSelectedEdgeId,
      setPanelOpen,
      copySelection,
      pasteClipboard,
      deleteSelectedNodes,
      setNodes,
    ]
  );

  useEffect(() => {
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [handler]);
}
