import path from 'node:path';

import { app, BrowserWindow, shell } from 'electron';

import { registerIpc } from './ipc';
import { SettingsService } from './settings';
import { JsonStorage } from './storage';

const isSmokeTest = process.env.AVERO_SMOKE_TEST === '1';

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 720,
    minHeight: 480,
    title: 'avero',
    show: false,
    backgroundColor: '#14161a',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once('ready-to-show', async () => {
    win.show();
    if (isSmokeTest) {
      try {
        const ok = (await win.webContents.executeJavaScript(
          `(() => {
            const bridgeOk = typeof window.avero !== 'undefined';
            const shellOk = !!document.querySelector('.app-shell');
            return bridgeOk && shellOk;
          })()`,
        )) as boolean;
        console.log(ok ? 'AVERO_SMOKE_OK' : 'AVERO_SMOKE_FAIL_RENDER');
      } catch (err) {
        console.log(`AVERO_SMOKE_FAIL_EXEC ${err instanceof Error ? err.message : String(err)}`);
      }
      setTimeout(() => app.quit(), 300);
    }
  });

  win.webContents.on('did-fail-load', (_event, code, description) => {
    console.log(`AVERO_LOAD_FAIL ${code} ${description}`);
  });

  // 外部链接一律交给系统浏览器，不在应用内打开
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  return win;
}

void app.whenReady().then(() => {
  const dataDir = path.join(app.getPath('userData'), 'avero');
  const storage = new JsonStorage(path.join(dataDir, 'storage'));
  const settings = new SettingsService(path.join(dataDir, 'settings.json'));
  registerIpc({ storage, settings });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
