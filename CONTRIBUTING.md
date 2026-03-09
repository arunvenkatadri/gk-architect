# Contributing to GK Architect

Thank you for your interest in contributing to GK Architect! This guide will help you get set up and familiar with the project.

## Development Environment Setup

### Prerequisites

- Node.js 18+ and npm
- Git
- Claude Code CLI (for testing the "Build with Claude" feature)

### Getting Started

```bash
# Clone your fork
git clone https://github.com/<your-username>/gk.git
cd gk

# Install dependencies
npm install

# Rebuild native modules (node-pty) for Electron
npm run rebuild

# Start the app in development mode
npm run dev
```

> **Important:** You must run `npm run rebuild` after every `npm install`. The `node-pty` package includes native bindings that need to be compiled against Electron's version of Node.js. Without this step, the embedded terminal will not work.

### Running Without Electron

If you are working on UI-only changes and do not need the terminal or Electron features:

```bash
npm run dev:web
```

This starts the Vite dev server at `http://localhost:5173` without launching Electron.

## Project Structure

The project structure is documented in [CLAUDE.md](CLAUDE.md). Here is a quick overview:

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

Key points:

- **Electron files use `.cjs`** -- because `package.json` has `"type": "module"`, all Electron main-process files must use the `.cjs` extension for CommonJS.
- **State lives in Zustand** -- all shared application state (nodes, edges, UI state) is managed in `src/store.js`.
- **React Flow v12** -- the canvas uses `@xyflow/react`, which is the v12 package name.

## Code Style

- **React functional components** -- use function components with hooks. No class components.
- **Zustand for state** -- use the Zustand store for any state that needs to be shared across components. Local component state with `useState` is fine for UI-only concerns.
- **Tailwind CSS for styling** -- use Tailwind utility classes. Avoid writing custom CSS unless absolutely necessary.
- **No TypeScript** -- the project uses plain JavaScript (`.jsx` / `.js`). Type annotations via JSDoc are welcome but not required.

## Pull Request Guidelines

1. **One feature or fix per PR** -- keep pull requests focused. If you are fixing a bug and also want to add a feature, submit them as separate PRs.
2. **Write a clear description** -- explain what your PR does and why. Include screenshots or screen recordings for UI changes.
3. **Test your changes** -- run the app with `npm run dev` and verify your changes work as expected. Test both the full Electron app and the web-only mode (`npm run dev:web`) when relevant.
4. **Keep commits clean** -- use clear, descriptive commit messages. Squash fixup commits before requesting review.
5. **Follow existing patterns** -- look at how similar features are implemented in the codebase and follow the same approach.

## Building

```bash
# Full build (Vite + Electron)
npm run build

# Web-only build
npm run build:web

# Platform-specific Electron builds
npm run build:mac
npm run build:linux
npm run build:win
```

## Questions?

If you have questions about contributing, open an issue on GitHub and we will be happy to help.
