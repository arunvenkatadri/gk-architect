import { MarkerType } from '@xyflow/react';

const nextjsFullstack = {
  id: 'nextjs-fullstack',
  name: 'Next.js Fullstack',
  description: 'Next.js pages + API routes + Prisma ORM + PostgreSQL',
  category: 'fullstack',
  nodes: [
    {
      id: 'node-1',
      type: 'architectureNode',
      position: { x: 100, y: 200 },
      data: {
        label: 'Next.js Pages',
        nodeType: 'ui',
        color: '#06b6d4',
        icon: 'U',
      },
    },
    {
      id: 'node-2',
      type: 'architectureNode',
      position: { x: 400, y: 200 },
      data: {
        label: 'API Routes',
        nodeType: 'api',
        color: '#10b981',
        icon: 'A',
      },
    },
    {
      id: 'node-3',
      type: 'architectureNode',
      position: { x: 700, y: 200 },
      data: {
        label: 'Prisma ORM',
        nodeType: 'service',
        color: '#6366f1',
        icon: 'S',
      },
    },
    {
      id: 'node-4',
      type: 'architectureNode',
      position: { x: 1000, y: 200 },
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
      label: 'fetch / server actions',
      animated: true,
      style: { stroke: '#e94560', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#e94560' },
    },
    {
      id: 'edge-2-3',
      source: 'node-2',
      target: 'node-3',
      label: 'Prisma client calls',
      animated: true,
      style: { stroke: '#e94560', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#e94560' },
    },
    {
      id: 'edge-3-4',
      source: 'node-3',
      target: 'node-4',
      label: 'SQL queries',
      animated: true,
      style: { stroke: '#e94560', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#e94560' },
    },
  ],
  nodeMetadata: {
    'node-1': {
      description: 'Next.js pages with App Router, server and client components, layouts, and loading states.',
      files: [],
      directory: '',
      status: 'not_started',
      buildPrompt: 'Create Next.js 14 pages using the App Router. Include a root layout with navigation, a home page, and a dashboard page. Use server components by default, client components only where needed. Add Tailwind CSS for styling.',
    },
    'node-2': {
      description: 'Next.js API route handlers for backend logic, authentication, and data operations.',
      files: [],
      directory: '',
      status: 'not_started',
      buildPrompt: 'Create Next.js API route handlers in app/api/. Include routes for CRUD operations, authentication with NextAuth.js, and proper error handling. Use route handlers (GET, POST, PUT, DELETE exports).',
    },
    'node-3': {
      description: 'Prisma ORM for type-safe database access, schema definition, and migrations.',
      files: [],
      directory: '',
      status: 'not_started',
      buildPrompt: 'Set up Prisma ORM with a schema.prisma file. Define models for User, Post, and Comment with proper relations. Create a singleton Prisma client utility. Generate initial migration.',
    },
    'node-4': {
      description: 'PostgreSQL database for persistent data storage, accessed through Prisma.',
      files: [],
      directory: '',
      status: 'not_started',
      buildPrompt: 'Configure PostgreSQL connection in Prisma schema. Set up DATABASE_URL environment variable. Create seed script for initial data. Document database setup instructions.',
    },
  },
};

export default nextjsFullstack;
