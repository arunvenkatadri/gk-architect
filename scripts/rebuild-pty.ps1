# Rebuild node-pty for the current Electron version
Write-Host "Rebuilding node-pty for Electron..."
npx electron-rebuild -f -w node-pty
Write-Host "Done! node-pty rebuilt for Electron."
