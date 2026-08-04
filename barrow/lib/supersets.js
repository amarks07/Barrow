// Shared logic for grouping exercises into supersets — used by both the
// workout entries list (grouped via a per-entry `supersetId`) and the
// template builder's picked-exercise list (grouped via `supersets: id[][]`,
// since template entries are plain exercise ids with no per-item object to
// tag). Both representations reorder and render the same way, so that logic
// lives here once.

// Moves every item whose id is in `groupIds` so they sit contiguously,
// starting at the position of whichever one currently sits first — everything
// else keeps its existing relative order. Requires 2+ matches to do anything.
export function groupContiguous(items, groupIds, getId) {
  const idSet = new Set(groupIds);
  const inGroup = items.filter((item) => idSet.has(getId(item)));
  if (inGroup.length < 2) return items;
  const remaining = items.filter((item) => !idSet.has(getId(item)));
  const firstIndex = items.findIndex((item) => idSet.has(getId(item)));
  const insertAt = items.slice(0, firstIndex).filter((item) => !idSet.has(getId(item))).length;
  return [...remaining.slice(0, insertAt), ...inGroup, ...remaining.slice(insertAt)];
}

// For each item, works out whether it belongs to a group and whether it's
// the first/last member of a contiguous run of that group — everything a
// row needs to draw its segment of the connecting line.
export function runInfo(items, getGroupKey) {
  return items.map((item, i) => {
    const key = getGroupKey(item);
    if (key === null || key === undefined) return { isGrouped: false, isFirst: false, isLast: false };
    const prevKey = i > 0 ? getGroupKey(items[i - 1]) : null;
    const nextKey = i < items.length - 1 ? getGroupKey(items[i + 1]) : null;
    return { isGrouped: true, isFirst: prevKey !== key, isLast: nextKey !== key };
  });
}

// Index of the group (if any) an id belongs to, for the template-builder's
// id-array-of-arrays representation.
export function groupIndexOf(groups, id) {
  return groups.findIndex((g) => g.includes(id));
}

// Drops ids no longer present and discards any group that's shrunk below 2
// members — for the template-builder's id-array-of-arrays representation.
export function pruneGroups(groups, keepIds) {
  const keepSet = new Set(keepIds);
  return groups.map((g) => g.filter((id) => keepSet.has(id))).filter((g) => g.length >= 2);
}

// Clears `supersetId` on any entry left as the sole remaining member of its
// group — for the workout entries' per-entry-tag representation.
export function clearSingletonGroups(entries) {
  const counts = {};
  entries.forEach((e) => {
    if (e.supersetId) counts[e.supersetId] = (counts[e.supersetId] || 0) + 1;
  });
  return entries.map((e) => (e.supersetId && counts[e.supersetId] < 2 ? { ...e, supersetId: undefined } : e));
}
