# GK Architect

**Visual Architecture Builder for Claude Code**

GK Architect is a desktop application that lets you visually design software architectures and build them with Claude Code. Draw your system as a node graph, annotate each component with descriptions and file associations, define data flows between services, and click "Build" to send the full context to an embedded Claude Code terminal.

## Features

- **Visual architecture canvas** -- drag-and-drop nodes onto an infinite, pannable canvas powered by React Flow
- **Multiple component types** -- Service, UI, Database, API, Queue, and Infra nodes, each with a distinct icon and color
- **Data flow connections** -- draw edges between nodes and label them to describe how data moves through the system
- **Docker container visualization** -- group nodes inside Docker containers to represent deployment boundaries
- **Build with Claude** -- compose a rich prompt from selected node context and send it directly to an embedded Claude Code terminal
- **Architecture templates** -- start from pre-built templates for common patterns (microservices, monolith, JAMstack, etc.)
- **ARCHITECTURE.md auto-sync** -- automatically generate and keep an `ARCHITECTURE.md` file in sync with your diagram
- **File browser sidebar** -- browse your project directory and associate files with architecture nodes
- **Git status indicators** -- see at a glance which nodes have uncommitted changes
- **Undo / Redo** -- full undo and redo history for all canvas operations
- **Copy / Paste** -- duplicate nodes and groups with keyboard shortcuts
- **Keyboard shortcuts** -- common operations are just a keystroke away
- **Auto-save with recovery** -- your work is saved automatically; recover from crashes without data loss
- **Export** -- export your architecture as Mermaid diagrams or SVG images
- **Build orchestration** -- build components in dependency order across your entire architecture
- **Dark / Light theme** -- switch between dark and light themes to suit your preference

## Screenshots

Screenshots coming soon.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ and npm
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated

### Installation

```bash
# Clone the repository
git clone https://github.com/extelligence/gk.git
cd gk

# Install dependencies
npm install

# Rebuild native modules for Electron
npm run rebuild

# Start the app in development mode
npm run dev
```

## Usage

1. **Add nodes** -- use the toolbar or drag from the component palette to add services, databases, APIs, and other components to the canvas.
2. **Connect nodes** -- drag from one node's handle to another to create a data flow edge. Click the edge to add a label describing the connection.
3. **Configure nodes** -- select a node and use the right panel to set its description, associate project files, choose a directory, and write a build prompt.
4. **Build with Claude** -- click the "Build" button on a node or use the build orchestration panel to send the architecture context to Claude Code in the embedded terminal.
5. **Save and export** -- your work auto-saves. Use the toolbar to export as Mermaid or SVG, or sync to `ARCHITECTURE.md`.

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + Z` | Undo |
| `Cmd/Ctrl + Shift + Z` | Redo |
| `Cmd/Ctrl + S` | Save |
| `Cmd/Ctrl + C` | Copy |
| `Cmd/Ctrl + V` | Paste |
| `Cmd/Ctrl + A` | Select all |
| `Delete / Backspace` | Delete selected |
| `Escape` | Deselect all |

## Architecture

GK Architect is built with:

- **Electron** -- desktop shell with `node-pty` for the embedded terminal
- **React 18** + **Vite** -- fast renderer with hot module replacement
- **@xyflow/react** (React Flow v12) -- the architecture canvas
- **@xterm/xterm** + **node-pty** -- embedded terminal emulator backed by a real PTY
- **Zustand** -- lightweight state management
- **Tailwind CSS** -- utility-first styling

The main process runs in CJS (`.cjs` files) since `package.json` has `"type": "module"`. The renderer is a standard React SPA bundled by Vite.

## Building

```bash
# Build for current platform
npm run build

# Platform-specific builds
npm run build:mac      # macOS (.dmg)
npm run build:linux    # Linux (.AppImage)
npm run build:win      # Windows (.exe)

# Web-only build (no Electron)
npm run build:web
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

## License

[MIT](LICENSE) -- Copyright (c) 2026 Extelligence
