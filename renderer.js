const fs = require('fs');
const path = require('path');
const { packItems } = require('./binpacker');
const { ipcRenderer } = require('electron');
const exporters = require('./exporters');

// UI elements
const leftLists = Array.from(document.querySelectorAll('.left-list'));
const statusText = document.getElementById('statusText') || null;
const dropPlaceholderClass = 'drop-placeholder';

let items = []; // {displayPath, size, absPath}
let currentBins = []; // Stores the current packed bins for export

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2) + ' ' + sizes[i];
}

const iconCache = new Map();

async function getFileIconUrl(absPath) {
  if (!absPath) return 'flac_icon.png';
  const ext = path.extname(absPath).toLowerCase();
  
  const cacheKey = (ext === '.exe' || ext === '.ico') ? absPath : ext;

  if (iconCache.has(cacheKey)) {
    return iconCache.get(cacheKey);
  }

  try {
    const dataUrl = await ipcRenderer.invoke('get-file-icon', absPath);
    if (dataUrl) {
      iconCache.set(cacheKey, dataUrl);
      return dataUrl;
    }
  } catch (err) {}
  
  return 'flac_icon.png';
}

async function createFileRow(displayPath, size, absPath) {
  const row = document.createElement('div');
  row.className = 'file-row';
  row.title = `Name: ${displayPath}\nPath: ${absPath}`;

  const colIcon = document.createElement('div');
  colIcon.className = 'file-col-icon';
  const iconSrc = await getFileIconUrl(absPath);
  colIcon.innerHTML = `<img src="${iconSrc}" width="32" height="32" onerror="this.style.display='none'; this.parentNode.textContent='📄';"/>`;

  const colDetails = document.createElement('div');
  colDetails.className = 'file-col-details';

  const colName = document.createElement('div');
  colName.className = 'file-col-name';
  colName.textContent = displayPath;

  const colPath = document.createElement('div');
  colPath.className = 'file-col-artist';
  colPath.textContent = absPath;

  const colSize = document.createElement('div');
  colSize.className = 'file-col-size';
  colSize.textContent = size;

  colDetails.appendChild(colName);
  colDetails.appendChild(colPath);
  colDetails.appendChild(colSize);

  row.appendChild(colIcon);
  row.appendChild(colDetails);

  return row;
}

function updateStatus() {
  const total = items.reduce((a, b) => a + b.size, 0);
  if (statusText) statusText.textContent = `${items.length} items — ${formatBytes(total)}`;
}

async function addRowToContainer(container, displayPath, size, absPath) {
  items.push({ displayPath, size, absPath });
  // Remove placeholder if present
  const placeholder = container.querySelector('.' + dropPlaceholderClass);
  if (placeholder) placeholder.remove();

  const row = await createFileRow(displayPath, size, absPath);
  row.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (confirm(`Remove ${displayPath} from list?`)) {
      const idx = items.findIndex(it => it.absPath === absPath);
      if (idx !== -1) {
        items.splice(idx, 1);
        row.remove();
        updateStatus();
        if (items.length === 0) {
          container.innerHTML = `<div class="drop-placeholder">Drag files or folders here</div>`;
        }
      }
    }
  });

  container.appendChild(row);
  updateStatus();
}

async function processFilePaths(container, droppedPaths) {
  for (const root of droppedPaths) {
    try {
      const stat = await fs.promises.lstat(root);
      if (stat.isDirectory()) {
        const rootParent = path.dirname(root);
        // Recursively enumerate files
        async function enumDir(dir) {
          let entries;
          try {
            entries = await fs.promises.readdir(dir, { withFileTypes: true });
          } catch (err) {
            console.error('Readdir error', err);
            return;
          }

          for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              await enumDir(full);
            } else if (entry.isFile()) {
              try {
                const st = await fs.promises.lstat(full);
                const displayPath = path.relative(rootParent, full);
                await addRowToContainer(container, displayPath, st.size, full);
              } catch (err) {
                console.error('Stat error', err);
              }
            }
          }
        }
        await enumDir(root);
      } else if (stat.isFile()) {
        const displayPath = path.basename(root);
        await addRowToContainer(container, displayPath, stat.size, root);
      }
    } catch (err) {
      console.error('Processing path error', err);
    }
  }
}

function bindDrop(container) {
  container.addEventListener('dragenter', (e) => {
    e.preventDefault();
    e.stopPropagation();
    container.classList.add('drag-over');
  });

  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    container.classList.add('drag-over');
  });

  container.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    container.classList.remove('drag-over');
  });

  container.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    container.classList.remove('drag-over');

    // Prefer DataTransfer.files (gives full system paths in Electron)
    const dtFiles = Array.from(e.dataTransfer.files || []);
    if (dtFiles.length > 0) {
      const paths = dtFiles.map(f => f.path).filter(Boolean);
      await processFilePaths(container, paths);
      return;
    }

    // Fallback: try DataTransfer.items + webkitGetAsEntry for directories
    const itemsList = Array.from(e.dataTransfer.items || []);
    if (itemsList.length > 0 && itemsList[0].webkitGetAsEntry) {
      console.warn('Drop contained items but no file paths. Try enabling drag with file system support.');
    }
  });
}

// Attach drop to all list containers
leftLists.forEach(container => bindDrop(container));

// Dark mode wiring
(function initDarkMode() {
  const darkToggle = document.getElementById('darkTheme');
  function applyDarkMode(enabled) {
    if (enabled) document.body.classList.add('dark');
    else document.body.classList.remove('dark');
  }

  try {
    if (darkToggle) {
      const saved = localStorage.getItem('discfit-dark');
      const isDark = saved === '1' ? true : (saved === '0' ? false : darkToggle.checked);
      darkToggle.checked = isDark;
      applyDarkMode(isDark);
      try { ipcRenderer.send('set-theme', isDark ? 'dark' : 'light'); } catch (e) { }

      darkToggle.addEventListener('change', () => {
        const val = darkToggle.checked;
        applyDarkMode(val);
        try { localStorage.setItem('discfit-dark', val ? '1' : '0'); } catch (e) { /* ignore */ }
        try { ipcRenderer.send('set-theme', val ? 'dark' : 'light'); } catch (e) { }
      });
    }
  } catch (e) { console.error('Theme init error', e); }
})();

// Expose a simple clear function in case UI wants it
window.discfit = {
  clearItems: function() {
    items = [];
    leftLists.forEach(container => {
      container.innerHTML = `<div class="drop-placeholder">Drag files or folders here</div>`;
    });
    updateStatus();
  }
};

// Pack button wiring
const packBtn = document.getElementById('pack');
const binsContainer = document.getElementById('bins');
const mediaSizeInput = document.getElementById('mediaSize');
const mediaTypeSelect = document.getElementById('mediaType');

// Wire media type -> media size behavior: set size for predefined media,
// and enable editing only when 'custom' is selected.
function applyMediaSelection() {
  if (!mediaTypeSelect || !mediaSizeInput) return;
  const val = mediaTypeSelect.value;
  if (val === 'custom') {
    mediaSizeInput.disabled = false;
    // keep current value
  } else {
    // option values are numeric bytes; apply them and disable manual edits
    mediaSizeInput.value = val;
    mediaSizeInput.disabled = true;
  }
}

try { if (mediaTypeSelect) { mediaTypeSelect.addEventListener('change', applyMediaSelection); applyMediaSelection(); } } catch (e) { console.warn('media init failed', e); }

function bindSetDrop(container, bin, max) {
  container.addEventListener('dragenter', (e) => { e.preventDefault(); e.stopPropagation(); container.classList.add('drag-over'); });
  container.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy'; container.classList.add('drag-over'); });
  container.addEventListener('dragleave', (e) => { e.preventDefault(); e.stopPropagation(); container.classList.remove('drag-over'); });
  container.addEventListener('drop', async (e) => {
    e.preventDefault(); e.stopPropagation(); container.classList.remove('drag-over');
    const dtFiles = Array.from(e.dataTransfer.files || []);
    if (dtFiles.length > 0) {
      const paths = dtFiles.map(f => f.path).filter(Boolean);
      for (const root of paths) {
        try {
           const stat = await fs.promises.lstat(root);
           let totalSize = bin.items.reduce((s, x) => s + (x.itemSize || x.size || 0), 0);
           
           if (stat.isDirectory()) {
             const rootParent = path.dirname(root);
             async function enumDir(dir) {
               const entries = await fs.promises.readdir(dir, { withFileTypes: true });
               for (const entry of entries) {
                 const full = path.join(dir, entry.name);
                 if (entry.isDirectory()) await enumDir(full);
                 else if (entry.isFile()) {
                   const st = await fs.promises.lstat(full);
                   if (max > 0 && totalSize + st.size > max && bin.tabBtn.textContent !== 'Oversized') throw new Error(`Adding '${entry.name}' exceeds the disc capacity!`);
                   const displayPath = path.relative(rootParent, full);
                   totalSize += st.size;
                   const itm = { displayPath, displayName: path.basename(full), itemPath: full, itemSize: st.size };
                   bin.items.push(itm);
                   const row = await createFileRow(displayPath, st.size, full);
                   container.appendChild(row);
                 }
               }
             }
             await enumDir(root).catch(e => alert(e.message));
           } else if (stat.isFile()) {
               if (max > 0 && totalSize + stat.size > max && bin.tabBtn.textContent !== 'Oversized') { alert(`Adding '${path.basename(root)}' exceeds the disc capacity!`); continue; }
               const displayPath = path.basename(root);
               totalSize += stat.size;
               const itm = { displayPath, displayName: path.basename(root), itemPath: root, itemSize: stat.size };
               bin.items.push(itm);
               const row = await createFileRow(displayPath, stat.size, root);
               container.appendChild(row);
           }
        } catch(e) { console.error(e); }
      }
      const newTotal = bin.items.reduce((s, x) => s + (x.itemSize || x.size || 0), 0);
      if (bin.tabBtn) bin.tabBtn.title = `Capacity: ${formatBytes(newTotal)}`;
      if (statusText) statusText.textContent = `Appended items. New Capacity: ${formatBytes(newTotal)}`;
    }
  });
}

function renderBins(result, targetSize) {
  binsContainer.innerHTML = '';

  if (!result || ((!result.bins || result.bins.length === 0) && (!result.oversized || result.oversized.length === 0))) {
    binsContainer.innerHTML = '<div class="drop-placeholder">No sets — add files and click Pack</div>';
    return;
  }

  // Create tab headers and content area
  const tabsDiv = document.createElement('div');
  tabsDiv.className = 'tabs';
  tabsDiv.style.overflowX = 'auto';
  tabsDiv.style.flex = '0 0 auto';
  const contentDiv = document.createElement('div');
  contentDiv.className = 'tab-content';
  contentDiv.style.flex = '1 1 auto';
  // make bins container a column flex so tabs and content share space
  binsContainer.style.display = 'flex';
  binsContainer.style.flexDirection = 'column';
  binsContainer.style.height = '100%';
  binsContainer.appendChild(tabsDiv);
  binsContainer.appendChild(contentDiv);

  function makeTabButton(title, pane, bin, targetSize) {
    const btn = document.createElement('button');
    btn.className = 'tab-btn';
    btn.textContent = title;
    
    const total = (bin.items || []).reduce((s, it) => s + (it.itemSize || it.size || 0), 0);
    btn.title = `Capacity: ${formatBytes(total)}${title !== 'Oversized' ? ' / ' + formatBytes(targetSize) : ''}`;

    btn.addEventListener('click', () => {
      tabsDiv.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      contentDiv.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      pane.classList.add('active');
      
      if (statusText) {
        if (title === 'Oversized') {
          statusText.innerHTML = `<strong>${title}</strong> - Total Size: ${formatBytes(total)} | Packed total: ${(result.bins || []).length} Sets`;
        } else {
          const limit = targetSize || 1;
          const pct = ((total / limit) * 100).toFixed(1);
          statusText.innerHTML = `<strong>${title}</strong> - Used: ${formatBytes(total)} / ${formatBytes(limit)} (${pct}%) | Packed total: ${(result.bins || []).length} Sets`;
        }
      }
    });
    return btn;
  }

  function createSetPane(bin) {
    const pane = document.createElement('div');
    pane.className = 'tab-pane';
    pane.style.flexDirection = 'column';
    pane.style.height = '100%';

    const listDiv = document.createElement('div');
    listDiv.className = 'list-view';
    listDiv.style.flex = '1';
    listDiv.style.border = 'none';

    // Hook up right-click export menu
    listDiv.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      // Use bin.idx assigned later
      if (bin.idx !== undefined) ipcRenderer.send('show-set-context-menu', bin.idx);
    });

    // populate rows
    Promise.all(bin.items.map(async (it, itemIdx) => {
      const srcPath = it.itemPath || it.absPath || '';
      const row = await createFileRow(it.displayName || it.displayPath || path.basename(srcPath), it.itemSize || it.size || 0, srcPath);
      
      row.tabIndex = 0; // Make focusable for Delete key
      row.style.outline = 'none';

      row.addEventListener('focus', () => { row.style.backgroundColor = document.body.classList.contains('dark') ? '#444' : '#cce8ff'; });
      row.addEventListener('blur', () => { row.style.backgroundColor = ''; });

      row.addEventListener('keydown', (e) => {
        if (e.key === 'Delete') {
          e.preventDefault();
          e.stopPropagation();
          row.remove();
          bin.items.splice(itemIdx, 1);
          // Update total on tab button
          const total = bin.items.reduce((s, x) => s + (x.itemSize || x.size || 0), 0);
          if (bin.tabBtn) {
            bin.tabBtn.title = `Capacity: ${formatBytes(total)}`;
          }
          if (statusText) statusText.textContent = `Deleted item. New Set Size: ${formatBytes(total)}`;
        }
      });

      // Implement drag out
      row.draggable = true;
      row.addEventListener('dragstart', (e) => {
        e.preventDefault();
        ipcRenderer.send('ondragstart', srcPath);
      });

      return row;
    })).then(rows => {
      rows.forEach(row => listDiv.appendChild(row));
    });

    pane.appendChild(listDiv);
    return pane;
  }

  currentBins = [];
  
  // Add bins as tabs
  (result.bins || []).forEach((bin, idx) => {
    bin.idx = idx; // Assign index for context menu
    currentBins.push(bin);
    const pane = createSetPane(bin);
    contentDiv.appendChild(pane);
    const btn = makeTabButton(`Set ${idx + 1}`, pane, bin, targetSize);
    bin.tabBtn = btn;
    tabsDiv.appendChild(btn);
    // Allow dragging precisely onto the final available set (matching C# feature)
    if (idx === (result.bins || []).length - 1) {
       bindSetDrop(pane.querySelector('.list-view'), bin, targetSize);
    }
  });

  // Oversized
  if (result.oversized && result.oversized.length > 0) {
    const szIdx = currentBins.length;
    const binOversized = { items: result.oversized, idx: szIdx };
    currentBins.push(binOversized);
    const pane = createSetPane(binOversized);
    contentDiv.appendChild(pane);
    const btn = makeTabButton('Oversized', pane, binOversized, targetSize);
    binOversized.tabBtn = btn;
    tabsDiv.appendChild(btn);
    
    // Oversized is effectively the 'last' logical set and unconstrained, making it droppable natively
    bindSetDrop(pane.querySelector('.list-view'), binOversized, targetSize);
  }

  // Activate first tab
  const firstBtn = tabsDiv.querySelector('.tab-btn');
  if (firstBtn) firstBtn.click();
}

if (packBtn) {
  packBtn.addEventListener('click', () => {
    try {
      const max = Number(mediaSizeInput && mediaSizeInput.value ? mediaSizeInput.value : 0);
      if (!max || max <= 0) {
        alert('Please enter a valid media size.');
        return;
      }

      // Call binpacker
      const result = packItems(items, max);
      renderBins(result, max);
      if (statusText) statusText.textContent = `Packed into ${(result.bins || []).length} set(s) — ${(result.oversized || []).length} oversized`;
    } catch (err) {
      alert("Pack error: " + err.stack);
    }
  });
}

// Window control buttons (custom titlebar)
try {
  const btnMin = document.getElementById('btn-minimize');
  const btnMax = document.getElementById('btn-maximize');
  const btnClose = document.getElementById('btn-close');
  const titlebar = document.querySelector('.titlebar');

  if (btnMin) btnMin.addEventListener('click', () => ipcRenderer.send('window-minimize'));
  if (btnMax) btnMax.addEventListener('click', () => ipcRenderer.send('window-maximize'));
  if (btnClose) btnClose.addEventListener('click', () => ipcRenderer.send('window-close'));
  if (titlebar) titlebar.addEventListener('dblclick', () => ipcRenderer.send('window-maximize'));

  ipcRenderer.on('window-maximized', (e, isMax) => {
    if (btnMax) btnMax.textContent = isMax ? '❐' : '▢';
  });
} catch (e) { /* ignore */ }

// --- Menu and Add File/Folder Logic ---
(function initMenus() {
  const fileMenu = document.getElementById('fileMenu');
  const fileDropdown = document.getElementById('fileDropdown');
  const helpMenu = document.getElementById('helpMenu');
  const helpDropdown = document.getElementById('helpDropdown');

  function closeMenus() {
    if (fileDropdown) fileDropdown.classList.remove('show');
    if (helpDropdown) helpDropdown.classList.remove('show');
  }

  // Toggle Menus
  if (fileMenu) {
    fileMenu.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isShowing = fileDropdown.classList.contains('show');
      closeMenus();
      if (!isShowing) fileDropdown.classList.add('show');
    });
  }

  if (helpMenu) {
    helpMenu.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isShowing = helpDropdown.classList.contains('show');
      closeMenus();
      if (!isShowing) helpDropdown.classList.add('show');
    });
  }

  // Close menus when clicking outside
  document.addEventListener('click', closeMenus);

  // Menu Actions
  const btnNew = document.getElementById('menu-new');
  if (btnNew) btnNew.addEventListener('click', () => { window.discfit.clearItems(); closeMenus(); });

  const btnExit = document.getElementById('menu-exit');
  if (btnExit) btnExit.addEventListener('click', () => { ipcRenderer.send('window-close'); });

  const btnAbout = document.getElementById('menu-about');
  if (btnAbout) btnAbout.addEventListener('click', () => {
    alert('DiscFit Electron Version 1.13\nConverted from C#');
    closeMenus();
  });

  const btnAboutAuthor = document.getElementById('menu-about-author');
  if (btnAboutAuthor) btnAboutAuthor.addEventListener('click', () => {
    require('electron').shell.openExternal('https://github.com/PhiSYS');
    closeMenus();
  });

  // Adding Files and Folders
  const addFilesInput = document.getElementById('addFilesInput');
  const addFolderInput = document.getElementById('addFolderInput');
  const listContainer = document.querySelector('.left-list');

  const btnAddFiles = document.getElementById('menu-add-files');
  if (btnAddFiles) btnAddFiles.addEventListener('click', () => {
    closeMenus();
    if (addFilesInput) addFilesInput.click();
  });

  const btnAddFolder = document.getElementById('menu-add-folder');
  if (btnAddFolder) btnAddFolder.addEventListener('click', () => {
    closeMenus();
    if (addFolderInput) addFolderInput.click();
  });

  // Handle Input Changes
  if (addFilesInput) {
    addFilesInput.addEventListener('change', async () => {
      if (!addFilesInput.files || addFilesInput.files.length === 0) return;
      const paths = Array.from(addFilesInput.files).map(f => f.path).filter(Boolean);
      if (paths.length > 0 && listContainer) {
        await processFilePaths(listContainer, paths);
      }
      addFilesInput.value = ''; // Reset
    });
  }

  if (addFolderInput) {
    addFolderInput.addEventListener('change', async () => {
      if (!addFolderInput.files || addFolderInput.files.length === 0) return;
      // For webkitdirectory, the files array contains all nested files.
      // However, we can also extract the root folder path from the first file.
      // The `path` of the first file will be like "/root/folder/sub/file.txt".
      // Let's use the standard drop processing by extracting the top-level directory path.
      let rootPath = addFolderInput.files[0].path;
      const webkitPath = addFolderInput.files[0].webkitRelativePath;
      if (rootPath && webkitPath) {
        // e.g. rootPath = "D:\MyFolder\sub\file.txt", webkitPath = "MyFolder/sub/file.txt"
        // we want "D:\MyFolder"
        const relParts = webkitPath.split('/');
        const absParts = rootPath.split(path.sep);
        // Remove trailing parts
        absParts.splice(absParts.length - relParts.length + 1);
        const actualFolder = absParts.join(path.sep);
        
        if (actualFolder && listContainer) {
          await processFilePaths(listContainer, [actualFolder]);
        }
      }
      addFolderInput.value = ''; // Reset
    });
  }
})();

ipcRenderer.on('set-context-action', async (e, setId, action) => {
  const bin = currentBins[setId];
  if (!bin || !bin.items) return;

  try {
    if (action === 'copy_to_folder' || action === 'move_to_folder') {
      const os = require('os');
      const result = await ipcRenderer.invoke('show-open-dialog', {
        properties: ['openDirectory'],
        defaultPath: os.homedir(), // Mitigates explicit Windows 11 'moniker' COM errors
        title: action === 'move_to_folder' ? 'Select Destination to MOVE to' : 'Select Destination Folder'
      });
      if (!result.canceled && result.filePaths.length > 0) {
        if (statusText) statusText.textContent = action === 'move_to_folder' ? 'Moving files...' : 'Copying files...';
        
        // C# logic injected a subdirectory containing the set name
        const folderName = `Set ${setId + 1}`;
        const finalDest = path.join(result.filePaths[0], folderName);
        if (!fs.existsSync(finalDest)) fs.mkdirSync(finalDest, { recursive: true });

        if (action === 'copy_to_folder') {
          await exporters.exportToFolder(bin.items, finalDest);
        } else {
          await exporters.moveToFolder(bin.items, finalDest);
        }
        if (statusText) statusText.textContent = action === 'move_to_folder' ? 'Move complete.' : 'Copy complete.';
      }
    } else {
      let ext = '', name = '', method = null;
      if (action === 'export_dxp') { ext = 'dxp'; name = 'CDBurnerXP Project'; method = exporters.exportToDXP; }
      else if (action === 'export_ibb') { ext = 'ibb'; name = 'ImgBurn Project'; method = exporters.exportToIBB; }
      else if (action === 'export_txt') { ext = 'txt'; name = 'Text File'; method = exporters.exportToText; }
      else if (action === 'export_iso') { ext = 'iso'; name = 'ISO Image'; method = exporters.exportToISO; }

      if (!method) return;

      const result = await ipcRenderer.invoke('show-save-dialog', {
        title: `Save ${name}`,
        filters: [{ name: name, extensions: [ext] }],
        defaultPath: `Set_${setId + 1}.${ext}`
      });

      if (!result.canceled && result.filePath) {
        if (statusText) statusText.textContent = `Exporting ${name}...`;
        await method(bin.items, result.filePath, (prog) => {
           if (statusText) statusText.textContent = `Generating ${name}: ${prog}`;
        });
        if (statusText) statusText.textContent = 'Export complete.';
      }
    }
  } catch (err) {
    alert('Export failed: ' + err.message);
    if (statusText) statusText.textContent = 'Export failed.';
  }
});

