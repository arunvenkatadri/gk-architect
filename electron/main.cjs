const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

// Set app name before anything else — controls dock, menu bar, About panel
app.setName('Extelligence GK Architect');

const windows = new Set();
const ptyProcesses = new Map(); // webContents.id -> pty instance
const fileWatchers = new Map(); // nodeId -> { watcher, senderIds }

function createWindow() {
  const win = new BrowserWindow({
    title: 'GK Architect',
    width: 1600,
    height: 1000,
    minWidth: 1024,
    minHeight: 700,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  windows.add(win);

  // Prevent the window title from changing to the URL
  win.on('page-title-updated', (e) => e.preventDefault());

  win.on('closed', () => {
    windows.delete(win);
    // Clean up pty for this window
    const senderId = win.webContents.id;
    const pty = ptyProcesses.get(senderId);
    if (pty) {
      pty.kill();
      ptyProcesses.delete(senderId);
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  return win;
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    // App menu (macOS only)
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    }] : []),
    // File menu
    {
      label: 'File',
      submenu: [
        {
          label: 'New Window',
          accelerator: isMac ? 'CmdOrCtrl+Shift+N' : 'Ctrl+Shift+N',
          click: () => createWindow(),
        },
        { type: 'separator' },
        {
          label: 'Close Window',
          accelerator: isMac ? 'CmdOrCtrl+W' : 'Ctrl+W',
          click: (menuItem, browserWindow) => {
            if (browserWindow) browserWindow.close();
          },
        },
      ],
    },
    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    // View menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    // Window menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' },
        ] : [
          { role: 'close' },
        ]),
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();

  app.on('activate', () => {
    if (windows.size === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // Clean up all remaining pty processes
  for (const [id, pty] of ptyProcesses) {
    pty.kill();
  }
  ptyProcesses.clear();
  if (process.platform !== 'darwin') app.quit();
});

// IPC handler to open a new window from the renderer
ipcMain.handle('window:new', () => {
  createWindow();
});

// Terminal management with node-pty (per-window)
ipcMain.handle('terminal:create', (event, { cols, rows, cwd }) => {
  try {
    const pty = require('node-pty');
    const shell = process.env.SHELL || '/bin/bash';
    const senderId = event.sender.id;

    // Kill existing pty for this window if any
    const existingPty = ptyProcesses.get(senderId);
    if (existingPty) {
      existingPty.kill();
      ptyProcesses.delete(senderId);
    }

    // Strip CLAUDECODE env vars so claude CLI can launch inside GK
    const cleanEnv = { ...process.env, TERM: 'xterm-256color' };
    delete cleanEnv.CLAUDECODE;
    delete cleanEnv.CLAUDE_CODE;
    // Remove any other claude-session env vars that block nesting
    for (const key of Object.keys(cleanEnv)) {
      if (key.startsWith('CLAUDECODE') || key.startsWith('CLAUDE_CODE_SESSION')) {
        delete cleanEnv[key];
      }
    }

    const ptyInstance = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: cols || 80,
      rows: rows || 24,
      cwd: cwd || process.cwd(),
      env: cleanEnv,
    });

    ptyProcesses.set(senderId, ptyInstance);

    ptyInstance.onData((data) => {
      const senderWin = BrowserWindow.fromId(
        [...windows].find(w => !w.isDestroyed() && w.webContents.id === senderId)?.id
      );
      if (senderWin && !senderWin.isDestroyed()) {
        senderWin.webContents.send('terminal:data', data);
      }
    });

    ptyInstance.onExit(({ exitCode }) => {
      const senderWin = BrowserWindow.fromId(
        [...windows].find(w => !w.isDestroyed() && w.webContents.id === senderId)?.id
      );
      if (senderWin && !senderWin.isDestroyed()) {
        senderWin.webContents.send('terminal:exit', exitCode);
      }
      ptyProcesses.delete(senderId);
    });

    return { success: true };
  } catch (err) {
    console.error('Failed to create terminal:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.on('terminal:write', (event, data) => {
  const pty = ptyProcesses.get(event.sender.id);
  if (pty) {
    pty.write(data);
  }
});

ipcMain.on('terminal:resize', (event, { cols, rows }) => {
  const pty = ptyProcesses.get(event.sender.id);
  if (pty) {
    try {
      pty.resize(cols, rows);
    } catch (e) {
      // ignore resize errors
    }
  }
});

ipcMain.handle('terminal:sendCommand', (event, command) => {
  const pty = ptyProcesses.get(event.sender.id);
  if (pty) {
    pty.write(command + '\r');
    return { success: true };
  }
  return { success: false, error: 'No terminal process' };
});

// File system operations
ipcMain.handle('fs:readDir', async (event, dirPath) => {
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    return entries.map((e) => ({
      name: e.name,
      isDirectory: e.isDirectory(),
      path: path.join(dirPath, e.name),
    }));
  } catch (err) {
    return [];
  }
});

ipcMain.handle('fs:selectDirectory', async (event) => {
  const senderWin = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(senderWin, {
    properties: ['openDirectory'],
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle('fs:selectFiles', async (event) => {
  const senderWin = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(senderWin, {
    properties: ['openFile', 'multiSelections'],
  });
  if (result.canceled) return [];
  return result.filePaths;
});

// Project save/load
ipcMain.handle('project:save', async (event, data) => {
  const senderWin = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showSaveDialog(senderWin, {
    defaultPath: 'architecture.gk.json',
    filters: [{ name: 'GK Architecture', extensions: ['gk.json'] }],
  });
  if (result.canceled) return false;
  await fs.promises.writeFile(result.filePath, JSON.stringify(data, null, 2));
  return true;
});

ipcMain.handle('project:load', async (event) => {
  const senderWin = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(senderWin, {
    filters: [{ name: 'GK Architecture', extensions: ['gk.json', 'json'] }],
    properties: ['openFile'],
  });
  if (result.canceled) return null;
  const content = await fs.promises.readFile(result.filePaths[0], 'utf-8');
  return JSON.parse(content);
});

ipcMain.handle('project:getCwd', () => {
  return process.cwd();
});

// Recent projects tracking - stored in ~/.gk-architect/recent-projects.json
const RECENT_PROJECTS_FILE = path.join(os.homedir(), '.gk-architect', 'recent-projects.json');

function loadRecentProjects() {
  try {
    return JSON.parse(fs.readFileSync(RECENT_PROJECTS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveRecentProjects(projects) {
  const dir = path.dirname(RECENT_PROJECTS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(RECENT_PROJECTS_FILE, JSON.stringify(projects, null, 2));
}

ipcMain.handle('projects:getRecent', () => {
  return loadRecentProjects();
});

ipcMain.handle('projects:track', (event, dirPath) => {
  const projects = loadRecentProjects();
  // Remove if already exists
  const filtered = projects.filter(p => p.path !== dirPath);
  // Add to front
  filtered.unshift({
    path: dirPath,
    name: path.basename(dirPath),
    lastOpened: Date.now(),
  });
  // Keep max 20
  saveRecentProjects(filtered.slice(0, 20));
});

ipcMain.handle('projects:remove', (event, dirPath) => {
  const projects = loadRecentProjects();
  saveRecentProjects(projects.filter(p => p.path !== dirPath));
});

ipcMain.handle('project:loadFrom', (event, filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
});

// --- Autosave for crash recovery ---
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

function getAutosaveDir() {
  return path.join(os.homedir(), '.gk-architect', 'autosave');
}

ipcMain.handle('autosave:write', async (event, data) => {
  try {
    const dir = getAutosaveDir();
    await fs.promises.mkdir(dir, { recursive: true });
    const projectDir = data.projectDir || '';
    const hash = simpleHash(projectDir);
    const filePath = path.join(dir, `${hash}.gk.json`);
    const payload = {
      timestamp: Date.now(),
      projectDir,
      data,
    };
    await fs.promises.writeFile(filePath, JSON.stringify(payload, null, 2));
    return { success: true };
  } catch (err) {
    console.error('Autosave write failed:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('autosave:check', async (event, projectDir) => {
  try {
    const dir = getAutosaveDir();
    const hash = simpleHash(projectDir || '');
    const filePath = path.join(dir, `${hash}.gk.json`);
    await fs.promises.access(filePath);
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const payload = JSON.parse(content);
    return {
      exists: true,
      timestamp: payload.timestamp,
      projectDir: payload.projectDir,
      data: payload.data,
    };
  } catch {
    return { exists: false };
  }
});

ipcMain.handle('autosave:clear', async (event, projectDir) => {
  try {
    const dir = getAutosaveDir();
    const hash = simpleHash(projectDir || '');
    const filePath = path.join(dir, `${hash}.gk.json`);
    await fs.promises.unlink(filePath);
    return { success: true };
  } catch {
    return { success: true }; // If file doesn't exist, that's fine
  }
});

// Git status for architecture nodes
ipcMain.handle('git:statusBatch', async (event, items) => {
  const results = {};
  for (const { nodeId, dir } of items) {
    try {
      const output = execSync('git status --porcelain', { cwd: dir, encoding: 'utf-8', timeout: 5000 });
      const lines = output.trim().split('\n').filter(l => l.trim());
      if (lines.length === 0) {
        results[nodeId] = { status: 'clean', changed: 0 };
      } else {
        const hasUntracked = lines.some(l => l.startsWith('??'));
        results[nodeId] = {
          status: hasUntracked ? 'untracked' : 'modified',
          changed: lines.length
        };
      }
    } catch {
      results[nodeId] = { status: 'unknown', changed: 0 };
    }
  }
  return results;
});

// Check if Claude CLI is installed
ipcMain.handle('claude:check', () => {
  const whichCmd = process.platform === 'win32' ? 'where claude' : 'which claude';
  try {
    const claudePath = execSync(whichCmd, { encoding: 'utf-8', timeout: 5000 }).trim();
    let version = null;
    try {
      version = execSync('claude --version', { encoding: 'utf-8', timeout: 5000 }).trim();
    } catch {}
    return { found: true, path: claudePath, version };
  } catch {
    return { found: false, path: null, version: null };
  }
});

// Auto-launch claude in the terminal
ipcMain.handle('terminal:launchClaude', (event, cwd) => {
  const senderId = event.sender.id;
  const pty = ptyProcesses.get(senderId);
  if (pty) {
    // Delay to let the shell initialize; re-check pty inside timeout
    setTimeout(() => {
      const currentPty = ptyProcesses.get(senderId);
      if (!currentPty) return;
      if (cwd) {
        currentPty.write(`cd ${JSON.stringify(cwd)} && claude\r`);
      } else {
        currentPty.write('claude\r');
      }
    }, 800);
    return { success: true };
  }
  return { success: false };
});

// File watcher - watch a directory for changes and notify the requesting window
ipcMain.handle('fs:watchDir', (event, { nodeId, dirPath }) => {
  try {
    // Stop existing watcher for this node
    if (fileWatchers.has(nodeId)) {
      fileWatchers.get(nodeId).close();
    }

    if (!fs.existsSync(dirPath)) {
      return { success: false, error: 'Directory does not exist' };
    }

    const senderId = event.sender.id;
    const watcher = fs.watch(dirPath, { recursive: true }, (eventType, filename) => {
      // Send to the window that requested the watch
      const senderWin = [...windows].find(w => !w.isDestroyed() && w.webContents.id === senderId);
      if (senderWin) {
        senderWin.webContents.send('fs:change', {
          nodeId,
          eventType,
          filename,
          dirPath,
        });
      }
    });

    fileWatchers.set(nodeId, watcher);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:unwatchDir', (event, nodeId) => {
  if (fileWatchers.has(nodeId)) {
    fileWatchers.get(nodeId).close();
    fileWatchers.delete(nodeId);
  }
  return { success: true };
});

// Count files in a directory (for status detection)
ipcMain.handle('fs:writeFile', async (event, { filePath, content }) => {
  try {
    await fs.promises.writeFile(filePath, content, 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:countFiles', async (event, dirPath) => {
  try {
    const entries = await fs.promises.readdir(dirPath, { recursive: true, withFileTypes: true });
    const files = entries.filter((e) => e.isFile() && !e.name.startsWith('.'));
    return { count: files.length };
  } catch (err) {
    return { count: 0 };
  }
});

// Scan a project directory and return its structure + connections
ipcMain.handle('project:scan', async (event, dirPath) => {
  try {
    const result = {
      name: path.basename(dirPath),
      path: dirPath,
      topLevel: [],
      detected: [],
      connections: [], // { from: idx, to: idx, label: string }
    };

    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '__pycache__' || entry.name === '.git') continue;
      const fullPath = path.join(dirPath, entry.name);
      const item = { name: entry.name, path: fullPath, isDirectory: entry.isDirectory() };
      if (entry.isDirectory()) {
        try {
          const sub = await fs.promises.readdir(fullPath);
          item.childCount = sub.filter(s => !s.startsWith('.')).length;
        } catch { item.childCount = 0; }
      }
      result.topLevel.push(item);
    }

    const dirNames = entries.filter(e => e.isDirectory()).map(e => e.name.toLowerCase());
    const fileNames = entries.filter(e => e.isFile()).map(e => e.name.toLowerCase());

    // --- Detect components ---
    const uiDirs = ['src/components', 'components', 'pages', 'views', 'app', 'frontend', 'client', 'ui'];
    for (const d of uiDirs) {
      const base = d.split('/')[0];
      if (dirNames.includes(base)) {
        const checkPath = path.join(dirPath, d);
        try {
          await fs.promises.access(checkPath);
          result.detected.push({ type: 'ui', name: d.charAt(0).toUpperCase() + d.slice(1), dir: checkPath, dirKey: d, reason: `Found ${d}/ directory` });
        } catch {
          if (d === base) result.detected.push({ type: 'ui', name: base.charAt(0).toUpperCase() + base.slice(1), dir: path.join(dirPath, base), dirKey: base, reason: `Found ${base}/ directory` });
        }
      }
    }

    const apiDirs = ['api', 'routes', 'endpoints', 'server', 'backend', 'controllers'];
    for (const d of apiDirs) {
      if (dirNames.includes(d)) {
        result.detected.push({ type: 'api', name: d.charAt(0).toUpperCase() + d.slice(1), dir: path.join(dirPath, d), dirKey: d, reason: `Found ${d}/ directory` });
      }
    }

    const svcDirs = ['services', 'lib', 'core', 'utils', 'helpers', 'middleware'];
    for (const d of svcDirs) {
      if (dirNames.includes(d)) {
        result.detected.push({ type: 'service', name: d.charAt(0).toUpperCase() + d.slice(1), dir: path.join(dirPath, d), dirKey: d, reason: `Found ${d}/ directory` });
      }
    }

    const dbDirs = ['models', 'schema', 'migrations', 'prisma', 'drizzle', 'db', 'database'];
    for (const d of dbDirs) {
      if (dirNames.includes(d)) {
        result.detected.push({ type: 'database', name: d.charAt(0).toUpperCase() + d.slice(1), dir: path.join(dirPath, d), dirKey: d, reason: `Found ${d}/ directory` });
      }
    }
    const dbFiles = ['schema.prisma', 'drizzle.config.ts', 'knexfile.js', 'ormconfig.json'];
    for (const f of dbFiles) {
      if (fileNames.includes(f)) {
        result.detected.push({ type: 'database', name: 'Database', dir: dirPath, dirKey: '_db_config', reason: `Found ${f}` });
        break;
      }
    }

    const queueDirs = ['workers', 'jobs', 'queues', 'tasks'];
    for (const d of queueDirs) {
      if (dirNames.includes(d)) {
        result.detected.push({ type: 'queue', name: d.charAt(0).toUpperCase() + d.slice(1), dir: path.join(dirPath, d), dirKey: d, reason: `Found ${d}/ directory` });
      }
    }

    // Only create infra node if there's a real infra/ or deploy/ directory
    if (dirNames.includes('infra')) {
      result.detected.push({ type: 'infra', name: 'Infra', dir: path.join(dirPath, 'infra'), dirKey: 'infra', reason: 'Infrastructure-as-code' });
    }
    if (dirNames.includes('deploy')) {
      result.detected.push({ type: 'infra', name: 'Deploy', dir: path.join(dirPath, 'deploy'), dirKey: 'deploy', reason: 'Deployment configs' });
    }

    // Parse docker-compose.yml into structured container data
    result.containers = []; // { name, image, build, ports, volumes, env, dependsOn, mapsTo (detected idx) }
    const composePath2 = path.join(dirPath, 'docker-compose.yml');
    try {
      const dcRaw = await fs.promises.readFile(composePath2, 'utf-8');
      // Simple YAML-ish parser for docker-compose services
      const lines = dcRaw.split('\n');
      let currentSvc = null;
      let currentField = null;
      const containers = {};

      for (const line of lines) {
        // Top-level service definition (2-space indent)
        const svcMatch = line.match(/^  (\w[\w-]*):\s*$/);
        if (svcMatch) {
          currentSvc = svcMatch[1];
          currentField = null;
          containers[currentSvc] = { name: currentSvc, image: '', build: '', ports: [], volumes: [], env: [], dependsOn: [] };
          continue;
        }
        if (!currentSvc || !containers[currentSvc]) continue;
        const c = containers[currentSvc];
        const trimmed = line.trim();

        // Simple key: value fields
        const kvMatch = line.match(/^\s{4}(\w[\w_-]*):\s*(.+)$/);
        if (kvMatch) {
          const [, key, val] = kvMatch;
          if (key === 'image') c.image = val.trim();
          if (key === 'context' || key === 'build') c.build = val.trim();
          currentField = key;
          continue;
        }

        // Block field starts (e.g. "    ports:")
        const blockMatch = line.match(/^\s{4}(\w[\w_-]*):\s*$/);
        if (blockMatch) {
          currentField = blockMatch[1];
          continue;
        }

        // List items under current field
        const listMatch = trimmed.match(/^-\s+(.+)$/);
        if (listMatch && currentField) {
          const val = listMatch[1].replace(/["']/g, '');
          if (currentField === 'ports') c.ports.push(val);
          else if (currentField === 'volumes') c.volumes.push(val);
          else if (currentField === 'environment') c.env.push(val);
          else if (currentField === 'depends_on') c.dependsOn.push(val);
        }

        // Environment as key=value under environment block
        const envKvMatch = trimmed.match(/^-\s*(\w+)=(.*)$/);
        if (envKvMatch && currentField === 'environment') {
          c.env.push(envKvMatch[1] + '=' + envKvMatch[2]);
        }
      }

      // Map containers to detected components and detect DB containers
      const dbImages = ['postgres', 'pgvector', 'mysql', 'mariadb', 'mongo', 'redis', 'dynamodb', 'sqlite', 'neo4j', 'elasticsearch'];
      const hasDbAlready = result.detected.some(d => d.type === 'database');

      for (const [name, c] of Object.entries(containers)) {
        // Check if this container runs a detected component (by build context)
        let mapsTo = -1;
        if (c.build) {
          const buildDir = c.build.replace(/^\.\//, '');
          for (let i = 0; i < result.detected.length; i++) {
            const relDir = path.relative(dirPath, result.detected[i].dir);
            if (relDir === buildDir || relDir.startsWith(buildDir + '/') || buildDir.startsWith(relDir)) {
              mapsTo = i;
              break;
            }
          }
        }
        c.mapsTo = mapsTo;

        // Is this a database container?
        const isDb = dbImages.some(db => (c.image || '').includes(db));
        if (isDb && !hasDbAlready) {
          const dbName = c.image ? c.image.split('/').pop().split(':')[0] : name;
          const prettyName = dbName.charAt(0).toUpperCase() + dbName.slice(1);
          const idx = result.detected.length;
          result.detected.push({
            type: 'database',
            name: prettyName,
            dir: dirPath,
            dirKey: '_db_' + name,
            reason: `Docker: ${c.image || name}`,
            container: name,
          });
          c.mapsTo = idx;
        }

        result.containers.push(c);
      }
    } catch {}

    // Deduplicate by dir
    const seen = new Set();
    result.detected = result.detected.filter(d => {
      if (seen.has(d.dir)) return false;
      seen.add(d.dir);
      return true;
    });

    // --- Generate real descriptions by reading key files ---
    async function summarizeComponent(comp) {
      const dir = comp.dir;
      const parts = [];

      // Check for package.json (JS/TS projects)
      try {
        const pkg = JSON.parse(await fs.promises.readFile(path.join(dir, 'package.json'), 'utf-8'));
        if (pkg.description) parts.push(pkg.description);
        const deps = Object.keys(pkg.dependencies || {});
        const frameworks = deps.filter(d => ['react','vue','svelte','angular','next','nuxt','express','fastify','hono','koa','nest'].some(f => d.includes(f)));
        if (frameworks.length > 0) parts.push('Uses ' + frameworks.join(', '));
        const notable = deps.filter(d => ['axios','prisma','drizzle','mongoose','sequelize','socket.io','graphql','trpc','tailwindcss','three'].includes(d));
        if (notable.length > 0 && notable.join(',') !== frameworks.join(',')) parts.push('With ' + notable.join(', '));
      } catch {}

      // Check for requirements.txt (Python)
      try {
        const reqs = (await fs.promises.readFile(path.join(dir, 'requirements.txt'), 'utf-8')).split('\n').filter(l => l.trim() && !l.startsWith('#'));
        const pyFrameworks = reqs.filter(r => ['fastapi','flask','django','celery','sqlalchemy','boto3','duckdb','pandas','numpy','torch','langchain','openai'].some(f => r.toLowerCase().includes(f)));
        if (pyFrameworks.length > 0) parts.push('Python: ' + pyFrameworks.slice(0, 5).map(r => r.split('==')[0].split('>=')[0].trim()).join(', '));
      } catch {}

      // Check for Dockerfile
      try {
        const df = await fs.promises.readFile(path.join(dir, 'Dockerfile'), 'utf-8');
        const fromMatch = df.match(/^FROM\s+(\S+)/m);
        if (fromMatch) parts.push('Docker: ' + fromMatch[1].split(':')[0]);
      } catch {}

      // Read README for first meaningful line
      for (const readmeName of ['README.md', 'readme.md', 'README']) {
        try {
          const readme = await fs.promises.readFile(path.join(dir, readmeName), 'utf-8');
          const lines = readme.split('\n').filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('![') && l.length > 10);
          if (lines[0]) { parts.push(lines[0].trim().substring(0, 120)); break; }
        } catch {}
      }

      // Read main entry point for context clues
      const entryFiles = ['main.py', 'app.py', 'index.js', 'index.ts', 'main.js', 'main.ts', 'main.jsx', 'main.tsx', 'App.jsx', 'App.tsx'];
      for (const ef of entryFiles) {
        try {
          // Check dir root and dir/src and dir/app
          for (const sub of ['', 'src', 'app']) {
            const ep = path.join(dir, sub, ef);
            const content = await fs.promises.readFile(ep, 'utf-8');
            // Look for title/name in the code
            const titleMatch = content.match(/title[=:]\s*["']([^"']+)["']/i);
            if (titleMatch) { parts.push('App: "' + titleMatch[1] + '"'); break; }
            // Look for route definitions
            const routes = content.match(/@app\.(get|post|put|delete|patch)\s*\(\s*["']([^"']+)["']/gi);
            if (routes) { parts.push(routes.length + ' API routes defined'); break; }
          }
        } catch {}
      }

      // Count files for context
      try {
        const CODE_EXTS = ['.js','.jsx','.ts','.tsx','.py','.go','.rs','.rb','.java','.vue','.svelte'];
        const allFiles = await fs.promises.readdir(dir, { recursive: true, withFileTypes: true });
        const codeFiles = allFiles.filter(f => f.isFile() && CODE_EXTS.some(e => f.name.endsWith(e)) && !f.name.includes('node_modules'));
        if (codeFiles.length > 0) parts.push(codeFiles.length + ' source files');
      } catch {}

      // List key subdirectories
      try {
        const subs = (await fs.promises.readdir(dir, { withFileTypes: true }))
          .filter(e => e.isDirectory() && !e.name.startsWith('.') && !['node_modules','__pycache__','dist','build','.venv','.cache'].includes(e.name))
          .map(e => e.name);
        if (subs.length > 0 && subs.length <= 8) parts.push('Contains: ' + subs.join(', '));
      } catch {}

      return parts.length > 0 ? parts.join('. ') : comp.reason;
    }

    // Generate descriptions in parallel
    await Promise.all(result.detected.map(async (comp) => {
      comp.description = await summarizeComponent(comp);
    }));

    // --- Detect connections ---
    const connectionSet = new Set();
    function addConn(from, to, label) {
      const key = `${from}->${to}`;
      if (from === to || connectionSet.has(key)) return;
      connectionSet.add(key);
      result.connections.push({ from, to, label });
    }

    // Build index by type and name
    const byType = {};
    const byName = {};
    result.detected.forEach((d, i) => {
      if (!byType[d.type]) byType[d.type] = [];
      byType[d.type].push(i);
      byName[path.basename(d.dir).toLowerCase()] = i;
      if (d.dirKey) byName[d.dirKey.toLowerCase()] = i;
    });

    // 1) docker-compose.yml: parse depends_on, volumes, links
    const composePath = path.join(dirPath, 'docker-compose.yml');
    try {
      const composeContent = await fs.promises.readFile(composePath, 'utf-8');
      // Find service names that match detected components
      const composeServices = {};
      const svcRegex = /^\s{2}(\w[\w-]*):/gm;
      let m;
      while ((m = svcRegex.exec(composeContent)) !== null) {
        const svcName = m[1].toLowerCase();
        // Match compose service to detected component
        for (let i = 0; i < result.detected.length; i++) {
          const dName = path.basename(result.detected[i].dir).toLowerCase();
          const dKey = (result.detected[i].dirKey || '').toLowerCase();
          if (svcName === dName || svcName === dKey || dName.includes(svcName) || svcName.includes(dName)) {
            composeServices[svcName] = i;
            break;
          }
        }
        // Also detect database services
        if (!composeServices[svcName]) {
          const dbImages = ['postgres', 'pgvector', 'mysql', 'mariadb', 'mongo', 'redis', 'dynamodb'];
          const svcBlock = composeContent.substring(m.index, composeContent.indexOf('\n  ', m.index + 10) > -1 ? composeContent.indexOf('\n  ', m.index + 10) + 500 : m.index + 500);
          for (const dbImg of dbImages) {
            if (svcBlock.includes(dbImg)) {
              // Find or create a database entry
              const dbIdx = (byType['database'] || [])[0];
              if (dbIdx !== undefined) {
                composeServices[svcName] = dbIdx;
              }
              break;
            }
          }
        }
      }
      // Parse depends_on
      const depsRegex = /^\s{2}(\w[\w-]*):[^]*?depends_on:\s*\n((?:\s+-\s+\w[\w-]*\n?)+)/gm;
      const simpleDepRegex = /^\s{2}(\w[\w-]*):[^]*?depends_on:\s*\n/gm;
      // Simpler: find "depends_on" blocks
      const lines = composeContent.split('\n');
      let currentSvc = null;
      let inDependsOn = false;
      for (const line of lines) {
        const svcMatch = line.match(/^  (\w[\w-]*):/);
        if (svcMatch && !line.startsWith('    ')) {
          currentSvc = svcMatch[1].toLowerCase();
          inDependsOn = false;
        }
        if (line.trim() === 'depends_on:') {
          inDependsOn = true;
          continue;
        }
        if (inDependsOn) {
          const depMatch = line.match(/^\s+-\s+(\w[\w-]*)/);
          if (depMatch) {
            const dep = depMatch[1].toLowerCase();
            const fromIdx = composeServices[currentSvc];
            const toIdx = composeServices[dep];
            if (fromIdx !== undefined && toIdx !== undefined) {
              addConn(fromIdx, toIdx, 'depends on');
            }
          } else if (line.trim() && !line.match(/^\s+-/)) {
            inDependsOn = false;
          }
        }
        // Also check volume mounts referencing other components
        if (currentSvc && line.includes('volumes:')) continue;
        if (currentSvc && line.match(/^\s+-\s+\.\//)) {
          const volMatch = line.match(/\.\/([\w-]+)/);
          if (volMatch) {
            const volDir = volMatch[1].toLowerCase();
            const fromIdx = composeServices[currentSvc];
            const toIdx = byName[volDir];
            if (fromIdx !== undefined && toIdx !== undefined && fromIdx !== toIdx) {
              addConn(fromIdx, toIdx, 'mounts');
            }
          }
        }
      }
    } catch {}

    // 2) Architectural heuristics based on types
    const uiIndices = byType['ui'] || [];
    const apiIndices = byType['api'] || [];
    const svcIndices = byType['service'] || [];
    const dbIndices = byType['database'] || [];
    const queueIndices = byType['queue'] || [];

    // Frontend -> API (if both exist, frontend almost always calls the API)
    for (const ui of uiIndices) {
      for (const api of apiIndices) { addConn(ui, api, 'HTTP requests'); }
      for (const svc of svcIndices) { addConn(ui, svc, 'API calls'); }
    }
    // API/Services -> Database
    for (const api of apiIndices) {
      for (const db of dbIndices) { addConn(api, db, 'queries'); }
    }
    for (const svc of svcIndices) {
      for (const db of dbIndices) { addConn(svc, db, 'queries'); }
    }
    // API -> Queue/Jobs
    for (const api of apiIndices) {
      for (const q of queueIndices) { addConn(api, q, 'dispatches jobs'); }
    }
    for (const svc of svcIndices) {
      for (const q of queueIndices) { addConn(svc, q, 'dispatches jobs'); }
    }
    // Jobs -> Database
    for (const q of queueIndices) {
      for (const db of dbIndices) { addConn(q, db, 'reads/writes data'); }
    }

    // 3) Source-level import scanning for same-language cross-references
    const CODE_EXTS = new Set(['.js', '.jsx', '.ts', '.tsx', '.py', '.rb', '.go', '.rs', '.java', '.mjs', '.cjs', '.vue', '.svelte']);
    const SKIP_DIRS = new Set(['node_modules', '.git', '__pycache__', '.next', 'dist', 'build', '.cache', 'vendor', '.venv']);

    async function collectSourceFiles(dir, maxDepth = 3) {
      const files = [];
      async function walk(d, depth) {
        if (depth > maxDepth) return;
        try {
          const ents = await fs.promises.readdir(d, { withFileTypes: true });
          for (const e of ents) {
            if (e.name.startsWith('.') || SKIP_DIRS.has(e.name)) continue;
            const full = path.join(d, e.name);
            if (e.isFile() && CODE_EXTS.has(path.extname(e.name).toLowerCase())) {
              files.push(full);
            } else if (e.isDirectory()) {
              await walk(full, depth + 1);
            }
          }
        } catch {}
      }
      await walk(dir, 0);
      return files;
    }

    const importRegex = /(?:from\s+['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s*\(\s*['"]([^'"]+)['"]\s*\)|from\s+(\S+)\s+import|import\s+(\S+))/g;

    for (let srcIdx = 0; srcIdx < result.detected.length; srcIdx++) {
      const comp = result.detected[srcIdx];
      if (comp.dirKey && comp.dirKey.startsWith('_')) continue;
      try {
        const sourceFiles = await collectSourceFiles(comp.dir);
        const filesToScan = sourceFiles.slice(0, 50);
        for (const file of filesToScan) {
          try {
            const content = await fs.promises.readFile(file, 'utf-8');
            let match;
            importRegex.lastIndex = 0;
            while ((match = importRegex.exec(content)) !== null) {
              const importPath = (match[1] || match[2] || match[3] || match[4] || match[5] || '').toLowerCase();
              if (!importPath) continue;
              for (let targetIdx = 0; targetIdx < result.detected.length; targetIdx++) {
                if (targetIdx === srcIdx) continue;
                const target = result.detected[targetIdx];
                const targetBase = path.basename(target.dir).toLowerCase();
                if (
                  importPath.includes('/' + targetBase + '/') || importPath.includes('/' + targetBase) ||
                  importPath.startsWith(targetBase + '/') || importPath.startsWith(targetBase + '.') ||
                  importPath === targetBase
                ) {
                  let label = 'imports';
                  if (target.type === 'database') label = 'queries';
                  else if (target.type === 'api') label = 'API calls';
                  else if (target.type === 'service') label = 'uses service';
                  else if (target.type === 'queue') label = 'enqueues jobs';
                  addConn(srcIdx, targetIdx, label);
                  break;
                }
              }
            }
          } catch {}
        }
      } catch {}
    }

    return result;
  } catch (err) {
    return { name: path.basename(dirPath), path: dirPath, topLevel: [], detected: [], connections: [], error: err.message };
  }
});

// AI-powered project scan using Claude CLI (non-interactive)
ipcMain.handle('project:aiScan', async (event, dirPath) => {
  try {
    // Build a project tree summary (3 levels deep, skip hidden/node_modules)
    async function buildTree(dir, depth = 0, maxDepth = 3) {
      if (depth > maxDepth) return '';
      let entries;
      try {
        entries = await fs.promises.readdir(dir, { withFileTypes: true });
      } catch {
        return '';
      }
      let tree = '';
      const filtered = entries.filter(e =>
        !e.name.startsWith('.') &&
        !['node_modules', '__pycache__', '.git', 'dist', 'build', '.next', '.cache', '.venv'].includes(e.name)
      );
      for (const e of filtered) {
        const indent = '  '.repeat(depth);
        tree += `${indent}${e.isDirectory() ? e.name + '/' : e.name}\n`;
        if (e.isDirectory()) {
          tree += await buildTree(path.join(dir, e.name), depth + 1, maxDepth);
        }
      }
      return tree;
    }

    const tree = await buildTree(dirPath);

    // Read key files for context
    let packageJson = '';
    try { packageJson = await fs.promises.readFile(path.join(dirPath, 'package.json'), 'utf-8'); } catch {}
    let dockerCompose = '';
    try { dockerCompose = await fs.promises.readFile(path.join(dirPath, 'docker-compose.yml'), 'utf-8'); } catch {}
    let readmeContent = '';
    for (const rn of ['README.md', 'readme.md', 'README']) {
      try { readmeContent = await fs.promises.readFile(path.join(dirPath, rn), 'utf-8'); break; } catch {}
    }

    const prompt = `Analyze this project and return ONLY a JSON object (no markdown, no explanation) with this structure:
{
  "components": [
    { "type": "ui|api|service|database|queue|infra", "name": "string", "dir": "relative/path", "description": "what it does" }
  ],
  "connections": [
    { "from": 0, "to": 1, "label": "relationship description" }
  ]
}

Where "from" and "to" are indices into the components array.

Project directory: ${path.basename(dirPath)}
Directory tree:
${tree}
${packageJson ? '\npackage.json:\n' + packageJson.substring(0, 2000) : ''}
${dockerCompose ? '\ndocker-compose.yml:\n' + dockerCompose.substring(0, 2000) : ''}
${readmeContent ? '\nREADME.md:\n' + readmeContent.substring(0, 2000) : ''}`;

    // Try claude --print
    const { execFile } = require('child_process');
    const result = await new Promise((resolve, reject) => {
      execFile('claude', ['--print', prompt], {
        timeout: 60000,
        maxBuffer: 1024 * 1024,
        cwd: dirPath,
      }, (err, stdout, stderr) => {
        if (err) reject(err);
        else resolve(stdout);
      });
    });

    // Parse JSON from response (handle potential markdown wrapping)
    let jsonStr = result.trim();
    // Strip markdown code fences if present
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(jsonStr);

    // Convert to the format expected by ProjectScanner
    const detected = (parsed.components || []).map(c => ({
      type: c.type || 'generic',
      name: c.name,
      dir: path.resolve(dirPath, c.dir || '.'),
      dirKey: c.dir || c.name.toLowerCase(),
      reason: 'AI analysis',
      description: c.description || '',
    }));

    return {
      name: path.basename(dirPath),
      path: dirPath,
      topLevel: [], // not needed for AI scan
      detected,
      connections: parsed.connections || [],
      containers: [], // AI scan doesn't parse docker separately
      aiPowered: true,
    };
  } catch (err) {
    console.error('AI scan failed, falling back to heuristic scan:', err.message);
    // null signals ProjectScanner to use regular scan
    return null;
  }
});
