# DiscFit - Features Overview

**DiscFit** is a sophisticated, Electron-based desktop application designed to optimally organize and pack massive collections of loose files into manageable sets corresponding perfectly to the capacities of various optical media or bounded file bins. Below is a comprehensive list of all current capabilities within the application.

## Core Packing & Logistics
* **Optimum Bin Packing Algorithm**: Analyzes an unstructured drop-list of files and optimally orchestrates them into discrete sets (bins) tailored mathematically to maximize space efficiency on the target disc/storage space while minimizing waste.
* **Predefined Media Profiles**: Out-of-the-box size constraints available via drop-down for:
  * CD-R 700 MB
  * CD-R 700 MB (Overburn)
  * DVD+R / DVD-R
  * DVD+R DL / DVD-R DL
  * BD-R (Blu-ray) / BD-R DL
* **Custom Media Profile**: Allows users to input exact target capacities down to individual bytes.
* **Oversized Media Handling**: Files that exceed the absolute maximum size of a single disc are automatically identified, sequestered, and allocated into a specialized "Oversized" tab for easy manual review.
* **Extensible Appending**: Allows users to dynamically drag additional sub-files strictly into the last available set or the oversized pool without having to completely rebuild the whole job.

## Workflow & Data Extraction
* **Deep Directory Parsing**: Allows users to drag-and-drop highly nested top-level folder structures. It seamlessly crawls all enclosed depths to extract and itemize every file while discarding invisible structural obstacles.
* **Relative Path Retention**: Preserves precise, relative parent-child directory representations throughout UI visuals and inside generated projects (omits arbitrary top-level system drive letters from exports).
* **Native OS System File-Icon Extraction**: Displays the real Windows-level system icon mapped to specific extensions inside the UI layout (cached locally to prevent OS thrashing).

## Rich Export Ecosystem
*Once a job finishes packing, right-clicking on a generated Set gives access to a robust exporter matrix.*

* **Copy to Folder**: Replicates the files assigned to the Set into a brand new directory. Will flawlessly reconstruct all relative nested sub-folder structures from scratch up the chain.
* **Move to Folder**: Moves files structurally from origin to destination. Features smart fallback copying and automatic bottom-up "source cleanup"—if an origin folder becomes totally empty during a cross-device or native move, it deletes the empty root folders left behind!
* **ImgBurn Project (.ibb)**: Generates an ImgBurn backup config mapping the precise relative architectures via text files.
* **CDBurnerXP Project (.dxp)**: Generates a serialized XML tree layout file for drag-and-drop loading into CDBurnerXP.
* **Plain Text List (.txt)**: Quick dump of all absolute file paths located inside a distinct Set.
* **Native ISO Generator (.iso)**: Includes an integrated invisible staging pipeline mapping direct to `mkisofs.exe`. Rapidly builds finalized, standard `.iso` images using memory-mapped point grafting, completely avoiding the sluggishness of system-level file-staging temp copies, with smart lock-free file cleanup post-assembly.
* **Live Export Progress Status**: Displays active percental parsing stats during disk-intensive IO tasks (like folder moves and ISO assembly) inside the bottom tracker status bar.

## Modern Application Interface
* **Pixel-Perfect Fluid Layout**: Implemented over Electron. Responsive flex-layout scaling logic, with custom boundary controls preventing UI clipping.
* **Custom OS Subtleties**: Contains an embedded, tailored native look-and-feel custom titlebar syncing perfectly to minimizing/maximizing capabilities.
* **First-Class Dark Theme**: Rich Dark Mode aesthetics. Fully customized CSS overrides ranging across every listview row, custom scroll bar thumb joints, modal edges, and tab-states. Saves the active theme user preference across restarts to `localStorage`.
* **Inline Edits / Visual Scannability**: 
  * Select files directly and strike the **[Delete]** key to toss them from Sets dynamically, forcing capacity auto-updates gracefully.
  * Drag items **Out** of the UI (native Chromium DataTransfer Outwards feature).
  * Clear visualization of Total File Counts vs Bytes and live fractional capacity tracking calculations inside the status readout.