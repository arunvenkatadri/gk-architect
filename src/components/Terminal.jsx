import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

const Terminal = forwardRef(function Terminal({ projectDir }, ref) {
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const [claudeRunning, setClaudeRunning] = useState(false);

  useImperativeHandle(ref, () => ({
    sendCommand: (command) => {
      if (window.electronAPI) {
        window.electronAPI.terminal.sendCommand(command);
      } else if (termRef.current) {
        termRef.current.writeln('\r\n' + command);
      }
    },
  }));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#0a0a1a',
        foreground: '#e2e8f0',
        cursor: '#e94560',
        cursorAccent: '#0a0a1a',
        selectionBackground: '#e9456040',
        black: '#1a1a2e',
        red: '#e94560',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#6366f1',
        magenta: '#8b5cf6',
        cyan: '#06b6d4',
        white: '#e2e8f0',
        brightBlack: '#4a5568',
        brightRed: '#ff6b81',
        brightGreen: '#34d399',
        brightYellow: '#fbbf24',
        brightBlue: '#818cf8',
        brightMagenta: '#a78bfa',
        brightCyan: '#22d3ee',
        brightWhite: '#f8fafc',
      },
      allowProposedApi: true,
      scrollback: 5000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(el);
    termRef.current = term;

    const fitTimer = setTimeout(() => {
      try {
        fitAddon.fit();
      } catch (e) {
        console.warn('fit failed:', e);
      }
      initPty(term);
    }, 100);

    let removeDataListener = null;
    let removeExitListener = null;

    function initPty(t) {
      if (window.electronAPI) {
        const { cols, rows } = t;

        window.electronAPI.terminal.create({ cols, rows, cwd: projectDir }).then(async (result) => {
          if (!result.success) {
            t.writeln(`\x1b[31mFailed to create terminal: ${result.error}\x1b[0m`);
            t.writeln('\x1b[33mRun: npx electron-rebuild -f -w node-pty\x1b[0m');
          } else {
            // Check if Claude CLI is installed before auto-launching
            const claudeStatus = await window.electronAPI.claude.check();
            if (claudeStatus.found) {
              window.electronAPI.terminal.launchClaude(projectDir);
              setClaudeRunning(true);
            } else {
              t.writeln('');
              t.writeln('\x1b[1;31m  Claude Code CLI not found\x1b[0m');
              t.writeln('');
              t.writeln('\x1b[33m  Install it with:\x1b[0m');
              t.writeln('\x1b[36m    npm install -g @anthropic-ai/claude-code\x1b[0m');
              t.writeln('');
              t.writeln('\x1b[90m  Then restart GK Architect or type \'claude\' in this terminal.\x1b[0m');
              t.writeln('');
            }
          }
        });

        t.onData((data) => {
          window.electronAPI.terminal.write(data);
        });

        // Track claude process state from terminal output
        let outputBuffer = '';
        removeDataListener = window.electronAPI.terminal.onData((data) => {
          t.write(data);
          // Detect if claude exited back to shell prompt
          outputBuffer += data;
          if (outputBuffer.length > 500) outputBuffer = outputBuffer.slice(-500);
          // If we see a bare shell prompt after claude was running, it exited
          if (claudeRunning && /\$\s*$/.test(outputBuffer) && !outputBuffer.includes('claude')) {
            setClaudeRunning(false);
          }
        });

        removeExitListener = window.electronAPI.terminal.onExit((code) => {
          setClaudeRunning(false);
          t.writeln(`\r\n\x1b[33mProcess exited (${code}). Press any key to restart.\x1b[0m`);
          const disposable = t.onKey(() => {
            disposable.dispose();
            window.electronAPI.terminal.create({ cols: t.cols, rows: t.rows, cwd: projectDir }).then(async (res) => {
              if (res.success) {
                const claudeStatus = await window.electronAPI.claude.check();
                if (claudeStatus.found) {
                  window.electronAPI.terminal.launchClaude(projectDir);
                  setClaudeRunning(true);
                }
              }
            });
          });
        });
      } else {
        t.writeln('\x1b[36m=== GK Architect Terminal ===\x1b[0m');
        t.writeln('\x1b[33mTerminal requires Electron. Run: npm run dev\x1b[0m');
        t.writeln('');
      }
    }

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        try {
          fitAddon.fit();
          if (window.electronAPI && term.cols && term.rows) {
            window.electronAPI.terminal.resize({ cols: term.cols, rows: term.rows });
          }
        } catch (e) {
          // ignore
        }
      });
    });
    resizeObserver.observe(el);

    return () => {
      clearTimeout(fitTimer);
      resizeObserver.disconnect();
      if (removeDataListener) removeDataListener();
      if (removeExitListener) removeExitListener();
      term.dispose();
      termRef.current = null;
    };
  }, []);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Terminal header with Claude Code status */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 12px',
        background: '#0d0d1a',
        borderBottom: '1px solid rgba(15, 52, 96, 0.5)',
        flexShrink: 0,
      }}>
        {/* Status dot */}
        <span style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: claudeRunning ? '#10b981' : '#6b7280',
          boxShadow: claudeRunning ? '0 0 6px #10b981' : 'none',
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          color: claudeRunning ? '#e2e8f0' : '#6b7280',
        }}>
          Claude Code
        </span>
        <span style={{
          fontSize: 10,
          color: claudeRunning ? '#10b981' : '#6b7280',
          padding: '1px 6px',
          borderRadius: 4,
          background: claudeRunning ? 'rgba(16, 185, 129, 0.15)' : 'rgba(107, 114, 128, 0.15)',
          border: `1px solid ${claudeRunning ? 'rgba(16, 185, 129, 0.3)' : 'rgba(107, 114, 128, 0.2)'}`,
        }}>
          {claudeRunning ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      <div
        ref={containerRef}
        style={{ flex: 1, overflow: 'hidden', background: '#0a0a1a', minHeight: 0 }}
      />
    </div>
  );
});

export default Terminal;
