const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Terminal
  terminal: {
    create: (opts) => ipcRenderer.invoke('terminal:create', opts),
    write: (data) => ipcRenderer.send('terminal:write', data),
    resize: (size) => ipcRenderer.send('terminal:resize', size),
    sendCommand: (cmd) => ipcRenderer.invoke('terminal:sendCommand', cmd),
    launchClaude: (cwd) => ipcRenderer.invoke('terminal:launchClaude', cwd),
    onData: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on('terminal:data', handler);
      return () => ipcRenderer.removeListener('terminal:data', handler);
    },
    onExit: (callback) => {
      const handler = (event, code) => callback(code);
      ipcRenderer.on('terminal:exit', handler);
      return () => ipcRenderer.removeListener('terminal:exit', handler);
    },
  },

  // File system
  fs: {
    readDir: (path) => ipcRenderer.invoke('fs:readDir', path),
    selectDirectory: () => ipcRenderer.invoke('fs:selectDirectory'),
    selectFiles: () => ipcRenderer.invoke('fs:selectFiles'),
    watchDir: (nodeId, dirPath) => ipcRenderer.invoke('fs:watchDir', { nodeId, dirPath }),
    unwatchDir: (nodeId) => ipcRenderer.invoke('fs:unwatchDir', nodeId),
    countFiles: (dirPath) => ipcRenderer.invoke('fs:countFiles', dirPath),
    writeFile: (filePath, content) => ipcRenderer.invoke('fs:writeFile', { filePath, content }),
    onChange: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on('fs:change', handler);
      return () => ipcRenderer.removeListener('fs:change', handler);
    },
  },

  // Git
  git: {
    statusBatch: (items) => ipcRenderer.invoke('git:statusBatch', items),
  },

  // Claude CLI
  claude: {
    check: () => ipcRenderer.invoke('claude:check'),
  },

  // Project
  project: {
    save: (data) => ipcRenderer.invoke('project:save', data),
    load: () => ipcRenderer.invoke('project:load'),
    loadFrom: (filePath) => ipcRenderer.invoke('project:loadFrom', filePath),
    getCwd: () => ipcRenderer.invoke('project:getCwd'),
    scan: (dirPath) => ipcRenderer.invoke('project:scan', dirPath),
    aiScan: (dirPath) => ipcRenderer.invoke('project:aiScan', dirPath),
  },

  // Recent projects
  projects: {
    getRecent: () => ipcRenderer.invoke('projects:getRecent'),
    track: (dirPath) => ipcRenderer.invoke('projects:track', dirPath),
    remove: (dirPath) => ipcRenderer.invoke('projects:remove', dirPath),
  },

  // Autosave / crash recovery
  autosave: {
    write: (data) => ipcRenderer.invoke('autosave:write', data),
    check: (projectDir) => ipcRenderer.invoke('autosave:check', projectDir),
    clear: (projectDir) => ipcRenderer.invoke('autosave:clear', projectDir),
  },

  // Window management
  window: {
    new: () => ipcRenderer.invoke('window:new'),
  },
});
