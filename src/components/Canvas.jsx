import React, { useCallback, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import useStore, { NODE_TYPES } from '../store';
import ArchitectureNode from './nodes/ArchitectureNode';
import ContainerNode from './nodes/ContainerNode';
import EdgeLabelModal from './EdgeLabelModal';
import ProjectScanner from './ProjectScanner';

const nodeTypes = { architectureNode: ArchitectureNode, containerNode: ContainerNode };

export default function ArchitectureCanvas() {
  const storeNodes = useStore((s) => s.nodes);
  const storeEdges = useStore((s) => s.edges);
  const setStoreNodes = useStore((s) => s.setNodes);
  const setStoreEdges = useStore((s) => s.setEdges);
  const setSelectedNodeIds = useStore((s) => s.setSelectedNodeIds);
  const setSelectedEdgeId = useStore((s) => s.setSelectedEdgeId);
  const setPanelOpen = useStore((s) => s.setPanelOpen);
  const addNode = useStore((s) => s.addNode);
  const beginBatch = useStore((s) => s.beginBatch);
  const endBatch = useStore((s) => s.endBatch);
  const theme = useStore((s) => s.theme);

  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges);
  const [edgeModal, setEdgeModal] = React.useState(null);
  const reactFlowRef = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  // Drag batching: coalesce all position changes during a drag into one undo step
  const onNodeDragStart = useCallback(() => {
    beginBatch();
  }, [beginBatch]);

  const onNodeDragStop = useCallback(() => {
    endBatch();
  }, [endBatch]);

  // Sync React Flow state back to store
  React.useEffect(() => {
    setNodes(storeNodes);
  }, [storeNodes, setNodes]);

  React.useEffect(() => {
    setEdges(storeEdges);
  }, [storeEdges, setEdges]);

  const handleNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
      // Sync position changes back to store
      const posChanges = changes.filter((c) => c.type === 'position' && c.position);
      if (posChanges.length > 0) {
        setStoreNodes(
          storeNodes.map((n) => {
            const change = posChanges.find((c) => c.id === n.id);
            return change ? { ...n, position: change.position } : n;
          })
        );
      }
      // Handle removal
      const removeChanges = changes.filter((c) => c.type === 'remove');
      if (removeChanges.length > 0) {
        setStoreNodes(storeNodes.filter((n) => !removeChanges.find((c) => c.id === n.id)));
      }
    },
    [onNodesChange, setStoreNodes, storeNodes]
  );

  const handleEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
      const removeChanges = changes.filter((c) => c.type === 'remove');
      if (removeChanges.length > 0) {
        setStoreEdges(storeEdges.filter((e) => !removeChanges.find((c) => c.id === e.id)));
      }
    },
    [onEdgesChange, setStoreEdges, storeEdges]
  );

  const onConnect = useCallback(
    (params) => {
      // Show modal to label the edge
      setEdgeModal(params);
    },
    []
  );

  const handleEdgeLabelSubmit = useCallback(
    (label) => {
      if (!edgeModal) return;
      const newEdge = {
        ...edgeModal,
        id: `edge-${edgeModal.source}-${edgeModal.target}-${Date.now()}`,
        label: label || '',
        type: 'default',
        animated: true,
        style: { stroke: '#e94560', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#e94560' },
        data: { label },
      };
      const updatedEdges = [...storeEdges, newEdge];
      setStoreEdges(updatedEdges);
      setEdges(updatedEdges);
      setEdgeModal(null);
    },
    [edgeModal, storeEdges, setStoreEdges, setEdges]
  );

  const onNodeClick = useCallback(
    (event, node) => {
      setSelectedNodeIds([node.id]);
      setSelectedEdgeId(null);
      setPanelOpen(true, 'node');
    },
    [setSelectedNodeIds, setSelectedEdgeId, setPanelOpen]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNodeIds([]);
    setSelectedEdgeId(null);
    setPanelOpen(false);
  }, [setSelectedNodeIds, setSelectedEdgeId, setPanelOpen]);

  const onEdgeClick = useCallback(
    (event, edge) => {
      setSelectedEdgeId(edge.id);
      setSelectedNodeIds([]);
      setPanelOpen(true, 'edge');
    },
    [setSelectedEdgeId, setSelectedNodeIds, setPanelOpen]
  );

  // Sync React Flow selection changes back to the store
  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }) => {
      const ids = selectedNodes.map((n) => n.id);
      setSelectedNodeIds(ids);
      if (ids.length > 0) {
        setSelectedEdgeId(null);
        setPanelOpen(true, 'node');
      }
    },
    [setSelectedNodeIds, setSelectedEdgeId, setPanelOpen]
  );

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/gk-node-type');
      if (!type || !reactFlowRef.current) return;

      const bounds = reactFlowRef.current.getBoundingClientRect();
      const position = {
        x: event.clientX - bounds.left - 80,
        y: event.clientY - bounds.top - 30,
      };
      addNode(type, position);
    },
    [addNode]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div className="w-full h-full" ref={reactFlowRef}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onEdgeClick={onEdgeClick}
        onSelectionChange={onSelectionChange}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onInit={setReactFlowInstance}
        nodeTypes={nodeTypes}
        fitView
        deleteKeyCode={null}
        multiSelectionKeyCode="Shift"
        selectionOnDrag
        snapToGrid
        snapGrid={[16, 16]}
        defaultEdgeOptions={{
          type: 'default',
          animated: true,
          style: { stroke: '#e94560', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#e94560' },
        }}
      >
        <Background color="var(--color-surface)" gap={16} size={1} />
        <Controls />
        <MiniMap
          nodeColor={(n) => n.data?.color || '#6b7280'}
          maskColor={theme === 'dark' ? 'rgba(26, 26, 46, 0.8)' : 'rgba(240, 240, 240, 0.8)'}
        />
        <Panel position="bottom-center">
          <div className="text-xs text-gray-500 bg-panel/80 px-3 py-1 rounded">
            Drag between handles to connect &middot; Double-click edges to label &middot; Backspace to delete
          </div>
        </Panel>
        <Panel position="top-right">
          <button
            onClick={() => reactFlowInstance?.fitView({ padding: 0.2 })}
            className="bg-panel/80 px-2 py-1 rounded text-xs text-gray-400 hover:text-white transition-colors"
          >
            Fit View
          </button>
        </Panel>
      </ReactFlow>

      {/* Project scanner overlay when canvas is empty */}
      <ProjectScanner />

      {edgeModal && (
        <EdgeLabelModal
          onSubmit={handleEdgeLabelSubmit}
          onCancel={() => setEdgeModal(null)}
        />
      )}
    </div>
  );
}
