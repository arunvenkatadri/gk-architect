import { MarkerType } from '@xyflow/react';

const restApi = {
  id: 'rest-api',
  name: 'REST API Stack',
  description: 'React frontend + Express API + PostgreSQL database',
  category: 'fullstack',
  nodes: [
    {
      id: 'node-1',
      type: 'architectureNode',
      position: { x: 100, y: 200 },
      data: {
        label: 'React Frontend',
        nodeType: 'ui',
        color: '#06b6d4',
        icon: 'U',
      },
    },
    {
      id: 'node-2',
      type: 'architectureNode',
      position: { x: 450, y: 200 },
      data: {
        label: 'Express API',
        nodeType: 'api',
        color: '#10b981',
        icon: 'A',
      },
    },
    {
      id: 'node-3',
      type: 'architectureNode',
      position: { x: 800, y: 200 },
      data: {
        label: 'PostgreSQL',
        nodeType: 'database',
        color: '#f59e0b',
        icon: 'D',
      },
    },
  ],
  edges: [
    {
      id: 'edge-1-2',
      source: 'node-1',
      target: 'node-2',
      label: 'HTTP requests',
      animated: true,
      style: { stroke: '#e94560', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#e94560' },
    },
    {
      id: 'edge-2-3',
      source: 'node-2',
      target: 'node-3',
      label: 'queries',
      animated: true,
      style: { stroke: '#e94560', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#e94560' },
    },
  ],
  nodeMetadata: {
    'node-1': {
      description: 'React single-page application with component-based UI, routing, and state management.',
      files: [],
      directory: '',
      status: 'not_started',
      buildPrompt: 'Create a React frontend with React Router for navigation, a clean component structure, and Axios for API calls. Include a responsive layout with a header, sidebar, and main content area.',
    },
    'node-2': {
      description: 'Express.js REST API server with structured routes, controllers, and middleware.',
      files: [],
      directory: '',
      status: 'not_started',
      buildPrompt: 'Create an Express.js API with RESTful routes, request validation, error handling middleware, and CORS configuration. Organize into routes/, controllers/, and middleware/ directories.',
    },
    'node-3': {
      description: 'PostgreSQL relational database for persistent data storage.',
      files: [],
      directory: '',
      status: 'not_started',
      buildPrompt: 'Set up PostgreSQL database connection with a migration system. Create initial schema with users table and proper indexes. Use pg or knex for the query builder.',
    },
  },
};

export default restApi;
