export function topoSort(nodes, edges) {
  // Build adjacency list from edges (source -> target means target depends on source)
  // For build order, we want to build dependencies FIRST
  // So if A -> B (A sends data to B), build A before B
  const graph = {};
  const inDegree = {};

  for (const node of nodes) {
    graph[node.id] = [];
    inDegree[node.id] = 0;
  }

  for (const edge of edges) {
    if (graph[edge.source] && graph[edge.target] !== undefined) {
      graph[edge.source].push(edge.target);
      inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
    }
  }

  // Kahn's algorithm
  const queue = [];
  for (const id of Object.keys(inDegree)) {
    if (inDegree[id] === 0) queue.push(id);
  }

  const sorted = [];
  while (queue.length > 0) {
    const nodeId = queue.shift();
    sorted.push(nodeId);
    for (const neighbor of (graph[nodeId] || [])) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) queue.push(neighbor);
    }
  }

  // If sorted doesn't include all nodes, there's a cycle - append remaining
  const remaining = nodes.filter(n => !sorted.includes(n.id)).map(n => n.id);
  return [...sorted, ...remaining];
}

export function hasCycle(nodes, edges) {
  // Returns true if the graph has a cycle
  const graph = {};
  const inDegree = {};
  for (const node of nodes) {
    graph[node.id] = [];
    inDegree[node.id] = 0;
  }
  for (const edge of edges) {
    if (graph[edge.source]) {
      graph[edge.source].push(edge.target);
      inDegree[edge.target]++;
    }
  }
  const queue = Object.keys(inDegree).filter(id => inDegree[id] === 0);
  let count = 0;
  while (queue.length > 0) {
    const id = queue.shift();
    count++;
    for (const n of (graph[id] || [])) {
      inDegree[n]--;
      if (inDegree[n] === 0) queue.push(n);
    }
  }
  return count !== nodes.length;
}
