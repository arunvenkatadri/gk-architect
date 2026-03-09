export function generateMermaid(nodes, edges, nodeMetadata) {
  let mermaid = 'graph LR\n';

  // Map node types to Mermaid shapes
  const shapes = {
    ui: { open: '([', close: '])' },       // stadium shape for UI
    api: { open: '{{', close: '}}' },      // hexagon for API
    database: { open: '[(', close: ')]' },  // cylinder for DB
    service: { open: '[', close: ']' },     // rectangle for service
    queue: { open: '>', close: ']' },       // asymmetric for queue
    infra: { open: '[/', close: '/]' },     // parallelogram for infra
    generic: { open: '[', close: ']' },
  };

  // Generate node definitions
  for (const node of nodes) {
    if (node.type === 'containerNode') continue; // skip container wrappers
    const shape = shapes[node.data.nodeType] || shapes.generic;
    const label = node.data.label.replace(/"/g, "'");
    const id = node.id.replace(/-/g, '_');
    mermaid += `    ${id}${shape.open}"${label}"${shape.close}\n`;
  }

  mermaid += '\n';

  // Generate edges
  for (const edge of edges) {
    const src = edge.source.replace(/-/g, '_');
    const tgt = edge.target.replace(/-/g, '_');
    const label = (edge.label || '').replace(/"/g, "'");
    if (label) {
      mermaid += `    ${src} -->|"${label}"| ${tgt}\n`;
    } else {
      mermaid += `    ${src} --> ${tgt}\n`;
    }
  }

  // Style nodes by type
  mermaid += '\n';
  const typeColors = {
    ui: '#06b6d4',
    api: '#10b981',
    database: '#f59e0b',
    service: '#6366f1',
    queue: '#8b5cf6',
    infra: '#f97316',
    generic: '#6b7280',
  };
  for (const [type, color] of Object.entries(typeColors)) {
    const typeNodes = nodes.filter(
      (n) => n.data.nodeType === type && n.type !== 'containerNode'
    );
    if (typeNodes.length > 0) {
      const ids = typeNodes.map((n) => n.id.replace(/-/g, '_')).join(',');
      mermaid += `    style ${ids} fill:${color},color:#fff\n`;
    }
  }

  return mermaid;
}
