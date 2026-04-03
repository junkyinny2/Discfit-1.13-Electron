const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Ensure directories exist
async function ensureDir(dirPath) {
  try {
    await fs.promises.mkdir(dirPath, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

async function exportToFolder(binItems, outputFolder, isMove = false, progressCallback) {
  let done = 0;
  const dirsToCheck = new Set();
  for (const item of binItems) {
    const src = item.absPath || item.itemPath;
    if (!src) continue;
    
    if (isMove) dirsToCheck.add(path.dirname(src));
    
    const relPath = item.displayPath || item.displayName || path.basename(src); 
    const dest = path.join(outputFolder, relPath);
    await ensureDir(path.dirname(dest));
    
    try {
      if (isMove) await fs.promises.rename(src, dest);
      else await fs.promises.copyFile(src, dest);
    } catch(e) {
      if (isMove && e.code === 'EXDEV') {
        try {
           await fs.promises.copyFile(src, dest);
           await fs.promises.unlink(src);
        } catch(ex) {}
      } else if (!isMove) {
         try { await fs.promises.copyFile(src, dest); } catch(ex){}
      }
    }
    
    if (progressCallback) {
       progressCallback(((++done / binItems.length) * 100).toFixed(1) + '%');
    }
  }

  if (isMove) {
    const sortedDirs = Array.from(dirsToCheck).sort((a, b) => b.length - a.length);
    for (const d of sortedDirs) {
       let current = d;
       while (current && current !== path.parse(current).root) {
         try {
           fs.rmdirSync(current);
           current = path.dirname(current);
         } catch(e) {
           break;
         }
       }
    }
  }
}

async function moveToFolder(binItems, outputFolder, progressCallback) {
  await exportToFolder(binItems, outputFolder, true, progressCallback);
}

// 2. Export to CDBurnerXP (.dxp)
async function exportToDXP(binItems, outputFile) {
  const root = { subDirs: {}, files: [] };

  for (const item of binItems) {
    const src = item.absPath || item.itemPath;
    const displayPath = item.displayPath || item.displayName || path.basename(src);
    const dirPath = path.dirname(displayPath);
    const name = path.basename(displayPath);

    let parts = [];
    if (dirPath !== '.' && dirPath !== '') {
      parts = dirPath.split(/[/\\]+/);
    }

    let current = root;
    for (const part of parts) {
      if (!part) continue;
      if (!current.subDirs[part]) current.subDirs[part] = { subDirs: {}, files: [] };
      current = current.subDirs[part];
    }
    
    try {
      const stat = await fs.promises.stat(src);
      if (stat.isDirectory()) {
         if (!current.subDirs[name]) current.subDirs[name] = { subDirs: {}, files: [] };
      } else {
         current.files.push({ name, path: src });
      }
    } catch(e) {
      current.files.push({ name, path: src });
    }
  }

  function escapeXML(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  function writeDirNode(name, node, indentLevel) {
    const indent = ' '.repeat(indentLevel * 2);
    let str = `${indent}<dir name="${escapeXML(name)}">\r\n`;
    for (const dirName of Object.keys(node.subDirs)) {
      str += writeDirNode(dirName, node.subDirs[dirName], indentLevel + 1);
    }
    for (const file of node.files) {
      str += `${indent}  <file name="${escapeXML(file.name)}" path="${escapeXML(file.path)}" />\r\n`;
    }
    str += `${indent}</dir>\r\n`;
    return str;
  }

  let xml = `<?xml version="1.0" encoding="utf-8" standalone="yes"?>\r\n`;
  xml += `<compilation name="${escapeXML(path.basename(outputFile, '.dxp'))}">\r\n`;
  xml += `  <layout>\r\n`;
  xml += writeDirNode('\\', root, 2);
  xml += `  </layout>\r\n`;
  xml += `</compilation>\r\n`;

  await fs.promises.writeFile(outputFile, xml, 'utf8');
}

// 3. Export to ImgBurn (.ibb)
async function exportToIBB(binItems, outputFile) {
  let txt = "IBB\r\n\r\n[START_BACKUP_OPTIONS]\r\n" +
"BuildInputMode=2\r\n" +
"BuildOutputMode=2\r\n" +
"Destination=\r\n" +
"DataType=0\r\n" +
"FileSystem=3\r\n" +
"UDFRevision=0\r\n" +
"PreserveFullPathnames=0\r\n" +
"RecurseSubdirectories=1\r\n" +
"IncludeHiddenFiles=0\r\n" +
"IncludeSystemFiles=0\r\n" +
"IncludeArchiveFilesOnly=0\r\n" +
"AddToWriteQueueWhenDone=0\r\n" +
"ClearArchiveAttribute=0\r\n" +
"Dates_FolderFileType=0\r\n" +
"[END_BACKUP_OPTIONS]\r\n\r\n" +
"[START_BACKUP_LIST]\r\n";

  for (const item of binItems) {
    const src = item.absPath || item.itemPath;
    const displayPath = item.displayPath || item.displayName || path.basename(src);
    const dirPath = path.dirname(displayPath);
    const name = path.basename(displayPath);

    let relPath = "\\";
    if (dirPath !== '.' && dirPath !== '') {
       relPath = "\\" + dirPath.replace(/\//g, '\\') + "\\";
    }

    txt += `F|${name}|${relPath}|${src}\r\n`;
  }

  txt += "[END_BACKUP_LIST]\r\n";
  await fs.promises.writeFile(outputFile, txt, 'utf8');
}

// 4. Export to Text
async function exportToText(binItems, outputFile) {
  let lines = '';
  for (const item of binItems) {
    lines += (item.absPath || item.itemPath) + '\r\n';
  }
  await fs.promises.writeFile(outputFile, lines, 'utf8');
}

// 5. Generate ISO via mkisofs
async function exportToISO(binItems, outputFile, progressCallback) {
  const isPackaged = __dirname.includes('app.asar');
  const binaryDir = isPackaged ? process.resourcesPath : __dirname;
  const mkisofsPath = path.join(binaryDir, 'mkisofs.exe');
  
  if (!fs.existsSync(mkisofsPath)) {
    throw new Error('mkisofs.exe not found. Please ensure the binary is bundled in ' + binaryDir);
  }

  const os = require('os');
  const uuid = Math.random().toString(36).substring(7);
  const graftFile = path.join(os.tmpdir(), `graft_points_${uuid}.txt`);
  let graftContent = '';
  for (const item of binItems) {
    const src = item.absPath || item.itemPath;
    const relPath = (item.displayPath || item.displayName || path.basename(src)).replace(/\\/g, '/');
    graftContent += `${relPath}=${src}\n`;
  }
  await fs.promises.writeFile(graftFile, graftContent, 'utf8');

  return new Promise((resolve, reject) => {
    const { spawn } = require('child_process');
    const child = spawn(mkisofsPath, ['-J', '-r', '-graft-points', '-path-list', graftFile, '-o', outputFile]);
    let errOutput = '';
    
    const cleanupTemp = () => {
      setTimeout(() => {
        try { fs.unlinkSync(graftFile); } catch(e) {}
      }, 500);
      setTimeout(() => {
        try { if(fs.existsSync(graftFile)) fs.unlinkSync(graftFile); } catch(e) {}
      }, 2000);
    };

    child.stderr.on('data', (data) => {
       const str = data.toString();
       errOutput += str;
       // Locate percentage match output from cdrtools like " 14.53% done"
       const pctMatch = str.match(/(\d+\.\d+)%\s+done/);
       if (pctMatch && progressCallback) {
          progressCallback(pctMatch[1] + '%');
       }
    });

    child.on('close', (code) => {
      cleanupTemp();
      if (code !== 0) {
         return reject(new Error('ISO Generation failed: ' + errOutput));
      }
      resolve();
    });
    
    child.on('error', (err) => {
      cleanupTemp();
      reject(new Error('Spawn failed: ' + err.message));
    });
  });
}

module.exports = { exportToFolder, moveToFolder, exportToDXP, exportToIBB, exportToText, exportToISO };
