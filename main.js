const { app, BrowserWindow, Menu, ipcMain, nativeTheme } = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Remove default electron menu to avoid duplicate menu bar
  Menu.setApplicationMenu(null);
  mainWindow.loadFile('index.html');
}

ipcMain.handle('get-file-icon', async (event, filePath) => {
  try {
    const icon = await app.getFileIcon(filePath, { size: 'normal' });
    return icon.toDataURL();
  } catch (err) {
    return null;
  }
});

ipcMain.on('set-theme', (e, theme) => {
  nativeTheme.themeSource = theme;
});

ipcMain.on('ondragstart', (event, filePath) => {
  event.sender.startDrag({
    file: filePath,
    icon: path.join(__dirname, 'flac_icon.png')
  });
});

const { dialog } = require('electron');

ipcMain.on('show-set-context-menu', (event, setId) => {
  const template = [
    { label: 'Copy Set to Folder', click: () => event.sender.send('set-context-action', setId, 'copy_to_folder') },
    { label: 'Move Set to Folder', click: () => event.sender.send('set-context-action', setId, 'move_to_folder') },
    { type: 'separator' },
    { label: 'Export to CDBurnerXP (.dxp)', click: () => event.sender.send('set-context-action', setId, 'export_dxp') },
    { label: 'Export to ImgBurn (.ibb)', click: () => event.sender.send('set-context-action', setId, 'export_ibb') },
    { label: 'Export to Text (.txt)', click: () => event.sender.send('set-context-action', setId, 'export_txt') },
    { type: 'separator' },
    { label: 'Save Set as ISO (.iso)', click: () => event.sender.send('set-context-action', setId, 'export_iso') },
  ];
  const menu = Menu.buildFromTemplate(template);
  menu.popup(BrowserWindow.fromWebContents(event.sender));
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(BrowserWindow.fromWebContents(event.sender), options);
  return result;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender), options);
  return result;
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});