#!/bin/bash
# Rebuild node-pty for the current Electron version
echo "Rebuilding node-pty for Electron..."
npx electron-rebuild -f -w node-pty
echo "Done! node-pty rebuilt for Electron."
