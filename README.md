# DiscFit

## Features

DiscFit is a lightweight, modern Windows desktop application designed to solve the "Bin Packing" problem for physical storage media (CDs, DVDs, Blu-rays). It calculates how to optimally distribute a massive list of files across multiple discs to minimize wasted space.

### Core Features

- **Intelligent Bin Packing:** Utilizes the "Best Fit Descending" algorithm to mathematically calculate the most efficient way to group files onto discs.
- **Lightning Fast Performance:** The core engine executes precisely in $O(N)$ linear time, allowing you to feed it massive directories totaling tens of thousands of files and instantly compute the perfect packing configuration without hanging or memory-shifting wait times. Extension-based icon caching reduces thousands of shell calls to ~20-30 total, keeping icon loading virtually instant.
- **Native Dark Mode:** Fully supports an immersive Windows 11 Dark Mode toggle with near-instant switching even with hundreds of result sets open. Custom-engineered rendering handlers ensure that even notoriously stubborn legacy UI elements (like tabs, dropdown buttons, and scrollbars) display seamlessly without bright white borders or artifacts. The toggle label provides a consistent "Dark Mode" text regardless of activation state.
- **Media Size Selection:** Choose from standard pre-defined optical media sizes (CD-R 700MB, DVD±R 4.7GB, DVD±R DL 8.5GB, BD-R 25GB, BD-R DL 50GB) or type in a custom exact byte capacity.
- **Async Drag-and-Drop:** Drag and drop individual files or entire large folders (11GB+) directly into the application. File scanning runs on a background thread with real-time status bar progress updates (e.g., "Scanning... 4,500 files found"), keeping the UI fully responsive throughout.
- **64-Bit Standalone Portable Executable:** Upgraded to a 64-bit architecture to eliminate 32-bit memory limits when processing massive datasets. Distributed as a clean, single-file `.exe` with embedded debug symbols, requiring no messy dependency folders.
- **Modern Interface:** A clean, flat, Windows-native interface utilizing Segoe UI typography.
- **Detailed Analytics:**
  - Hover over any generated disc set tab (e.g., "Set 1") to instantly see its exact capacity in bytes via a ToolTip.
  - A dynamic status bar calculates and displays the total size of the currently active tab.
  - Items that physically cannot fit on the selected media type (e.g., a 10GB file trying to fit on a 4.7GB DVD) are automatically separated into an "Oversized" tab.
- **Live Status Bar Progress:** Real-time feedback during all major operations — file scanning, bin packing, and set building — with a final completion summary (e.g., "Packing complete — 3 sets").
- **Editable Result Sets:** After packing, modify the last result set on-the-fly by adding or removing files without re-running the entire packing algorithm.
- **Crash Logging:** Any unhandled errors are caught by a global exception handler, displayed to the user, and logged with full stack traces to `%TEMP%\DiscFit_crash.log` for easy diagnostics.

### Export & Burning Integrations

By right-clicking anywhere inside a generated Disc Set, you can access powerful export options:

- **Export to CDBurnerXP (.dxp):** Instantly generates an XML compilation file for the selected disc set. When opened in CDBurnerXP, it automatically loads your files and **perfectly preserves the original nested directory structure** of your files from your hard drive.
- **Copy Set to Folder:** Physically copies all the files from a specific disc set into a new destination folder on your hard drive, automatically rebuilding the nested directory structure. This acts as a perfect workaround for burning software like Nero Burning ROM that does not support dragging-and-dropping file lists while retaining folder structures. *Now fully integrated with the native Windows copy dialog API to show visual progress estimations.*
- **Export to Text (.txt):** Generates a simple, plain-text file listing the absolute file paths for every file slated to be burned to that specific disc (one path per line).
- **Export to ImgBurn (.ibb):** Generates an ImgBurn Build project file for the selected disc set, preserving the original nested directory structure. When opened in ImgBurn's Build mode, it automatically loads your files for direct burning.
- **Save Set as ISO (.iso):** Directly creates an ISO 9660 image (with Joliet long filename support) of an entire disc set in one click. Implemented using the native Windows IMAPI2 API — zero external dependencies required.
- **Native Drag-and-Drop:** Select files within a generated set and drag them directly out of the application into Windows Explorer or other compatible software.

## Changelog

### Version 1.13

- **Feature: Editable Result Sets:** The last generated bin tab is now fully editable, allowing you to add/remove individual files without re-packing.
- **Feature: Drag-and-Drop Set Addition:** Drag files or folders directly onto any result set tab to add them on-the-fly. Full paths and folder sizes are preserved.
- **Feature: Context Menu Set Editing:** Right-click any result set to access "Add Selected Source Items" (from the source list) and "Remove Selected Items" options.
- **Feature: Max-Size Enforcement:** When adding items to a set, the app prevents exceeding the selected media capacity and displays a warning if overflow would occur.
- **Enhancement: File Icons on Addition:** Newly added items automatically load their system file icons, matching the look of the initial packing results.
- **Enhancement: Full Paths in Sets:** When adding files via drag-and-drop or context menu, full file/folder paths are displayed (not just filenames), improving clarity.
- **Architecture: Non-Self-Contained Executable:** Reduced `.exe` size from 146 MB to ~300 KB by removing bundled .NET runtime. Users without .NET 8 will see a system install dialog.

### Version 1.12

- **Feature: Native ISO Export:** Added a new context menu option "Save Set as ISO..." to export generated disc sets directly to ISO 9660 images with Joliet long filename support.
- **Architecture: Zero-Dependency Engine:** Implemented the ISO generator using the native Windows Image Mastering API v2 (IMAPI2), eliminating the need for external NuGet packages or DLLs.

### Version 1.11

- **Feature: Empty Folder Support:** Improved `listView1_DragDrop` and `Add Folder` logic to detect and include empty directories.
- **Bug Fix: Safe Copy Logic:** Prevented crashes in `CopyToFolder_Click` when attempting to copy zero-byte directory items; the engine now correctly creates the structure without a file-copy command.
- **Enhancement: Supported Exporters:** Updated DXP and ImgBurn exporters to natively support and preserve empty directory nodes.
- **Change: Removed InfraRecorder:** Deleted the InfraRecorder (.irproj) export functionality from the UI and core code to maintain a cleaner, more focused set of modern export options.

### Version 1.10

- **Feature: Export to ImgBurn (.ibb):** Added a new context menu option to generate an ImgBurn project file, mirroring the folder structure exactly like the CDBurnerXP export.
- **Feature: Export to InfraRecorder (.irproj):** Added a new context menu option to generate an InfraRecorder XML project file, ensuring nested directories and files are fully preserved.

### Version 1.9

- **Architecture Update:** Upgraded the application to a 64-bit (`x64`) executable to eliminate 32-bit memory limits and improve stability when processing massive datasets.

### Version 1.8

- **Optimization: Async Drag-and-Drop:** Completely rewrote the drag-and-drop handler to run file enumeration on a background thread. Dropping even the largest directories (11GB+, tens of thousands of files) no longer freezes the UI. The status bar shows real-time scanning progress (e.g., "Scanning... 4,500 files found").
- **Optimization: Extension-Based Icon Caching:** Replaced the per-file `SHGetFileInfo` icon loading (which made ~50,000 shell calls for large folders) with an intelligent extension-based cache that only calls the shell once per unique file type (~20-30 calls total). This eliminates the "stuck at loading icons" freeze.
- **Optimization: Fast Packing Results:** Applied the same extension-based icon caching to the Pack results rendering, making the set-building phase near-instant even with massive file lists.
- **Feature: Live Status Bar Progress:** The status bar now provides real-time feedback during all major operations: file scanning ("Scanning... X files found"), packing ("Packing..."), and set building ("Built X of Y sets..."), culminating in a completion summary ("Packing complete — X sets").
- **Bug Fix: Media Type Dropdown Crash:** Fixed a `NullReferenceException` crash triggered when clicking the Media Type dropdown, caused by the `MediaType` struct's non-public visibility preventing ComboBox data binding reflection from accessing its properties.
- **Enhancement: Global Error Logging:** Added a global unhandled exception handler in `Program.cs` that catches any crash, displays a user-friendly error dialog, and logs full stack trace details to `%TEMP%\DiscFit_crash.log` for diagnostics.
- **Optimization: Fast Dark Mode Toggle:** Consolidated the theme-switching loop from three separate tab-page iterations down to a single pass with `SuspendLayout`/`ResumeLayout`, eliminating the multi-second stall when toggling Dark Mode with many result sets open.
- **Bug Fix: Dark Scrollbars in Results:** Restored `SetWindowTheme("DarkMode_Explorer")` for result set ListViews to ensure scrollbars correctly render in dark mode.

### Version 1.7

- **Build Optimization: Single-File Executable:** Configured the `.csproj` to support framework-dependent single-file publishing and embedded the `.pdb` debug symbols directly into the executable, ensuring clean, standalone `.exe` distributions.
- **Codebase Enhancement: Localization:** Translated all auto-generated Visual Studio boilerplate comments (e.g., in `Program.cs`, `AssemblyInfo.cs`) from Spanish to English, ensuring the entire source code is fully localized in English.
- **Enhancement: Native Windows Copy Dialog:** Overhauled the 'Copy Set to Folder' functionality to utilize the `SHFileOperation` Windows API instead of a silent background array of single-file copies. Copying large media sets will now intuitively trigger the familiar, native Windows copy progress dialog, replete with time estimations and identical overwrite prompting natively expected by users.
- **UI Enhancements: Dark Mode Text:** Fixed the Dark Mode visual theme toggle checkbox so its text remains a permanent, non-dynamic "Dark Mode" regardless of whether the theme is checked or unchecked.

### Version 1.6

- **Optimization: High-Speed Packing Engine:** Completely rewrote the core 'Best-Fit' bin packing algorithm, replacing an incredibly slow $O(N^2)$ array-shifting bottleneck with a modern $O(N)$ linear iteration. The engine can now compute configurations for over 50,000 files virtually instantaneously.
- **Bug Fix: Integer Underflow:** Patched a severe `ulong` unsigned integer arithmetic vulnerability inside the capacity calculation that triggered impossible negative capacities when processing massively oversized files.
- **Feature: Dark Mode Theme:** Implemented a system-native immersive Windows 11 Dark Mode theme toggle.
- **UI Enhancements: Stubborn Artifacts:** Engineered custom `DarkTabControl` and `DarkComboBox` rendering subclasses to manually intercept OS paint commands, effectively hiding and overwriting stubborn, unsupported Win32 visual style artifacts (like white 3D borders and light-dropdown boxes).
- **UI Enhancements: Centered Title Bar:** Integrated custom text alignment padding utilizing Non-Breaking Spaces (`\u00A0`) alongside scaling logic to perfectly center the application title natively, defying native Windows 11 DWM whitespace-trimming security behaviors.

### Version 1.5

- **Rebranding:** Globally renamed the project, source files, and namespaces from "BinPacking" to "DiscFit". 
- **Title Bar Update:** Updated the application title bar to display "DiscFit - Version 1.5".
- **UI Overhaul:** Implemented a modern, flat UI design. Removed outdated 3D borders, updated the color palette to a clean light-gray/white theme, styled the "Pack" button with a flat blue accent, and applied `Segoe UI` typography globally to seamlessly match modern Windows aesthetics.
- **Dynamic Analytics:** Added a dynamic Status Bar to the bottom right of the window that actively calculates and displays the total byte size of the currently selected disc tab.
- **Tab ToolTips:** Added ToolTips to the generated disc tabs. Hovering over a tab (e.g., "Set 1") now displays the exact total byte size of the files contained within that disc.

### Version 1.4

- **Feature: Copy Set to Folder:** Added a new context menu option that physically copies all files from a generated disc set into a user-selected destination directory. This perfectly reconstructs the original nested folder structure, serving as a native workaround for Nero Burning ROM's inability to retain folder structures via drag-and-drop.
- **Feature: Export to Text:** Added a new context menu option to generate a `.txt` file containing a raw list of absolute file paths for a selected disc set.

### Version 1.3

- **Enhancement: CDBurnerXP Directory Structures:** Completely rewrote the CDBurnerXP `.dxp` XML generator. The exporter now parses the absolute paths of the files and dynamically reconstructs the original nested XML directory tree, ensuring folders are perfectly preserved when the file is opened in CDBurnerXP.

### Version 1.2

- **Feature: Context Menus:** Added right-click context menus to the dynamically generated ListView controls for Disc Sets and the Oversized list.
- **Feature: Export to CDBurnerXP:** Added the foundational "Export to CDBurnerXP (.dxp)" functionality.
- **Bug Fix: Folder Drag-and-Drop:** Fixed a critical flaw where dragging a large folder into the application treated the entire folder as a single, indivisible object. Folders are now correctly recursively scanned, and their individual files are extracted and added to the list for proper mathematical bin packing.
- **Bug Fix: UI Path Display:** Fixed variable scoping bugs that caused the "Path" column in the ListViews to incorrectly display only the file name or drop the path entirely. 
- **Bug Fix: Icon Crash:** Resolved an unhandled `ArgumentException` crash that occurred when `SHGetFileInfo` failed to return a valid icon handle for certain files (e.g., missing files or paths that are too long). Implemented a system fallback icon to prevent crashes.
