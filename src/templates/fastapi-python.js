import { MarkerType } from '@xyflow/react';

const fastapiPython = {
  id: 'fastapi-python',
  name: 'FastAPI + Celery Stack',
  description: 'FastAPI with SQLAlchemy, Celery workers, Redis, and PostgreSQL',
  category: 'backend',
  nodes: [
    {
      id: 'node-1',
      type: 'architectureNode',
      position: { x: 100, y: 200 },
      data: {
        label: 'FastAPI',
        nodeType: 'api',
        color: '#10b981',
        icon: 'A',
      },
    },
    {
      id: 'node-2',
      type: 'architectureNode',
      position: { x: 450, y: 100 },
      data: {
        label: 'SQLAlchemy Models',
        nodeType: 'service',
        color: '#6366f1',
        icon: 'S',
      },
    },
    {
      id: 'node-3',
      type: 'architectureNode',
      position: { x: 450, y: 320 },
      data: {
        label: 'Celery Workers',
        nodeType: 'queue',
        color: '#8b5cf6',
        icon: 'Q',
      },
    },
    {
      id: 'node-4',
      type: 'architectureNode',
      position: { x: 800, y: 320 },
      data: {
        label: 'Redis',
        nodeType: 'queue',
        color: '#8b5cf6',
        icon: 'Q',
      },
    },
    {
      id: 'node-5',
      type: 'architectureNode',
      position: { x: 800, y: 100 },
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
      label: 'ORM operations',
      animated: true,
      style: { stroke: '#e94560', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#e94560' },
    },
    {
      id: 'edge-2-5',
      source: 'node-2',
      target: 'node-5',
      label: 'SQL queries',
      animated: true,
      style: { stroke: '#e94560', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#e94560' },
    },
    {
      id: 'edge-1-3',
      source: 'node-1',
      target: 'node-3',
      label: 'dispatch tasks',
      animated: true,
      style: { stroke: '#e94560', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#e94560' },
    },
    {
      id: 'edge-3-4',
      source: 'node-3',
      target: 'node-4',
      label: 'broker / result backend',
      animated: true,
      style: { stroke: '#e94560', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#e94560' },
    },
  ],
  nodeMetadata: {
    'node-1': {
      description: 'FastAPI application with automatic OpenAPI docs, request validation, and dependency injection.',
      files: [],
      directory: '',
      status: 'not_started',
      buildPrompt: 'Create a FastAPI application with structured routers in app/routers/. Include Pydantic models for request/response validation, dependency injection for database sessions, CORS middleware, and auto-generated OpenAPI documentation. Set up uvicorn as the ASGI server.',
    },
    'node-2': {
      description: 'SQLAlchemy ORM models defining the database schema with relationships and migrations via Alembic.',
      files: [],
      directory: '',
      status: 'not_started',
      buildPrompt: 'Set up SQLAlchemy with declarative models in app/models/. Define User, Item, and Order models with proper relationships. Create an Alembic migration environment with initial migration. Include a database session factory with async support.',
    },
    'node-3': {
      description: 'Celery worker processes for handling background tasks like email sending, report generation, and data processing.',
      files: [],
      directory: '',
      status: 'not_started',
      buildPrompt: 'Set up Celery with Redis as the broker. Create task modules in app/tasks/ for email sending, report generation, and data processing. Include task retry logic, error handling, and Celery Beat for periodic tasks.',
    },
    'node-4': {
      description: 'Redis server used as Celery message broker and result backend, plus optional caching layer.',
      files: [],
      directory: '',
      status: 'not_started',
      buildPrompt: 'Configure Redis connection for Celery broker and result backend. Set up a Redis caching utility for API response caching. Include connection pooling and health check endpoint.',
    },
    'node-5': {
      description: 'PostgreSQL database for persistent storage, accessed through SQLAlchemy ORM.',
      files: [],
      directory: '',
      status: 'not_started',
      buildPrompt: 'Configure PostgreSQL connection string with async support. Set up Alembic for database migrations. Create seed script for development data. Include database health check and connection pool configuration.',
    },
  },
};

export default fastapiPython;
