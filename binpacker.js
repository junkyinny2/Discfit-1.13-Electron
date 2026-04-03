// Simple bin-packing module (Best Fit Decreasing)
function packItems(items, binMaxSize) {
  // Normalize items
  const list = items.map(it => ({
    displayName: it.displayPath || it.displayName || it.displayName || '',
    itemPath: it.absPath || it.itemPath || '',
    itemSize: Number(it.size ?? it.itemSize ?? 0)
  }));

  const oversized = [];
  const working = [];

  for (const it of list) {
    if (it.itemSize > binMaxSize) oversized.push(it);
    else working.push(it);
  }

  // Sort descending by size
  working.sort((a, b) => b.itemSize - a.itemSize);

  const bins = [];

  for (const item of working) {
    let targetIdx = -1;
    let spaceRemain = binMaxSize + 1;

    for (let i = 0; i < bins.length; i++) {
      const current = bins[i];
      if (current.size + item.itemSize <= binMaxSize) {
        const left = binMaxSize - (current.size + item.itemSize);
        if (left < spaceRemain) {
          spaceRemain = left;
          targetIdx = i;
        }
      }
    }

    if (targetIdx >= 0) {
      bins[targetIdx].items.push(item);
      bins[targetIdx].size += item.itemSize;
    } else {
      bins.push({ size: item.itemSize, items: [item] });
    }
  }

  return { bins, oversized };
}

module.exports = { packItems };