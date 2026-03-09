# GK Architect

Visual Architecture Builder for Claude Code. An Electron + React desktop app.

## Tech Stack
- **Electron** - Desktop shell with node-pty for terminal
- **React 18** + **Vite** - Renderer
- **@xyflow/react** (React Flow v12) - Architecture canvas
- **@xterm/xterm** + **node-pty** - Embedded terminal
- **Zustand** - State management
- **Tailwind CSS** - Styling

## Project Structure
```
electron/main.cjs       - Electron main process (CJS), window + IPC + pty
electron/preload.cjs    - Context bridge for renderer
src/main.jsx            - React entry
src/App.jsx             - Layout: toolbar + canvas + panel + terminal
src/store.js            - Zustand store (nodes, edges, metadata)
src/components/
  Canvas.jsx            - React Flow canvas with drag/drop
  Toolbar.jsx           - Add nodes, save/load
  NodePanel.jsx         - Right panel: details, files, build tabs
  Terminal.jsx          - xterm.js terminal with pty integration
  FileBrowser.jsx       - Directory browser for node file associations
  EdgeLabelModal.jsx    - Modal for labeling connections
  nodes/
    ArchitectureNode.jsx - Custom React Flow node component
```

## Commands
- `npm run dev` - Start Vite + Electron (full app)
- `npm run dev:web` - Start Vite only (web preview, no terminal)
- `npm run build` - Production build

## Key Concepts
- Nodes have types: service, ui, database, api, queue, generic
- Each node has metadata: description, files, directory, status, buildPrompt
- Edges represent data flow and carry labels
- "Build with Claude" composes a prompt from node context and sends to terminal
- Electron main process uses CJS (.cjs) since package.json has "type": "module"
