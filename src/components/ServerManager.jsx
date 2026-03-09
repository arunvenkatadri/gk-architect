import React, { useState, useCallback } from 'react';
import useStore from '../store';

export default function ServerManager({ onClose }) {
  const servers = useStore((s) => s.servers);
  const addServer = useStore((s) => s.addServer);
  const updateServer = useStore((s) => s.updateServer);
  const deleteServer = useStore((s) => s.deleteServer);
  const [editing, setEditing] = useState(null); // null = list view, 'new' or server id = form
  const [form, setForm] = useState({ name: '', host: '', user: 'root', port: '22', keyPath: '', directory: '/opt/app' });

  const handleEdit = (server) => {
    setEditing(server.id);
    setForm({ name: server.name, host: server.host, user: server.user, port: String(server.port || 22), keyPath: server.keyPath || '', directory: server.directory || '/opt/app' });
  };

  const handleNew = () => {
    setEditing('new');
    setForm({ name: '', host: '', user: 'root', port: '22', keyPath: '', directory: '/opt/app' });
  };

  const handleSave = () => {
    const data = { ...form, port: parseInt(form.port) || 22 };
    if (editing === 'new') {
      addServer(data);
    } else {
      updateServer(editing, data);
    }
    setEditing(null);
  };

  const handleDelete = (id) => {
    deleteServer(id);
    if (editing === id) setEditing(null);
  };

  // Full-screen modal overlay matching existing app modals
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="w-[500px] max-h-[80vh] rounded-xl overflow-hidden flex flex-col"
           style={{ backgroundColor: 'var(--color-panel)', border: '1px solid var(--color-surface)' }}
           onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-surface)' }}>
          <h2 className="text-lg font-semibold text-primary">Server Profiles</h2>
          <button onClick={onClose} className="text-secondary hover:text-primary text-xl">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {editing ? (
            // Form view
            <div className="space-y-4">
              <div>
                <label className="text-xs text-secondary block mb-1">Name</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="Production Server"
                  className="w-full bg-canvas border border-surface rounded px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-secondary block mb-1">Host</label>
                  <input value={form.host} onChange={e => setForm({...form, host: e.target.value})}
                    placeholder="192.168.1.100 or domain.com"
                    className="w-full bg-canvas border border-surface rounded px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="text-xs text-secondary block mb-1">Port</label>
                  <input value={form.port} onChange={e => setForm({...form, port: e.target.value})}
                    className="w-full bg-canvas border border-surface rounded px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-secondary block mb-1">User</label>
                  <input value={form.user} onChange={e => setForm({...form, user: e.target.value})}
                    className="w-full bg-canvas border border-surface rounded px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="text-xs text-secondary block mb-1">SSH Key Path</label>
                  <input value={form.keyPath} onChange={e => setForm({...form, keyPath: e.target.value})}
                    placeholder="~/.ssh/id_rsa"
                    className="w-full bg-canvas border border-surface rounded px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent" />
                </div>
              </div>
              <div>
                <label className="text-xs text-secondary block mb-1">Deploy Directory</label>
                <input value={form.directory} onChange={e => setForm({...form, directory: e.target.value})}
                  className="w-full bg-canvas border border-surface rounded px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={handleSave}
                  disabled={!form.name || !form.host}
                  className="flex-1 px-4 py-2 rounded text-sm font-semibold bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  {editing === 'new' ? 'Add Server' : 'Save Changes'}
                </button>
                <button onClick={() => setEditing(null)}
                  className="px-4 py-2 rounded text-sm bg-surface hover:bg-accent transition-colors text-secondary">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            // List view
            <div className="space-y-3">
              {servers.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-2xl mb-2">🖥</div>
                  <p className="text-secondary text-sm">No servers configured yet.</p>
                  <p className="text-muted text-xs mt-1">Add a server to deploy your architecture.</p>
                </div>
              ) : (
                servers.map(server => (
                  <div key={server.id} className="bg-canvas/50 rounded-lg p-4 border border-surface hover:border-accent/30 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm text-primary">{server.name}</span>
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(server)} className="text-xs text-secondary hover:text-accent px-2 py-1 rounded hover:bg-surface transition-colors">Edit</button>
                        <button onClick={() => handleDelete(server.id)} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-900/20 transition-colors">Delete</button>
                      </div>
                    </div>
                    <div className="text-xs text-secondary font-mono">{server.user}@{server.host}:{server.port || 22}</div>
                    {server.directory && <div className="text-xs text-muted mt-1">{server.directory}</div>}
                  </div>
                ))
              )}
              <button onClick={handleNew}
                className="w-full px-4 py-3 rounded-lg text-sm font-medium border border-dashed border-surface hover:border-accent text-secondary hover:text-accent transition-colors">
                + Add Server
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
