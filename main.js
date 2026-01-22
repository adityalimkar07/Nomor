// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

const isDev = !app.isPackaged;

let mainWindow;
let runningApp = null;

function createWindow() {
  // Make sure preload path is relative to where main.js actually lives in asar.
  // When packaged, main.js should be in the app root (we'll ensure that via package.json files).
  const preloadPath = path.join(__dirname, 'preload.js');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const startUrl = isDev
    ? process.env.ELECTRON_START_URL || 'http://localhost:3000'
    : `file://${path.join(__dirname, 'build', 'index.html')}`;

  mainWindow.loadURL(startUrl).catch((err) => {
    console.error('Failed to load startUrl', startUrl, err);
    mainWindow.webContents.openDevTools();
  });

  if (isDev) mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC to spawn/kill external apps
ipcMain.handle('start-app', (event, { filePath }) => {
  console.log('Starting app:', filePath);
  if (!filePath) return;
  if (runningApp) {
    try { process.kill(-runningApp.pid); } catch {}
    runningApp = null;
  }
  runningApp = spawn(filePath, [], { detached: true, stdio: 'ignore' });
  runningApp.unref();
});

ipcMain.handle('stop-app', () => {
  console.log('Stopping app');
  if (runningApp) {
    try { process.kill(-runningApp.pid); } catch {}
    runningApp = null;
  }
});
