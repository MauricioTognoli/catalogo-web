export type SelectAllState = boolean | "indeterminate";

export function selectedVisibleIds(
  selected: ReadonlySet<string>,
  visibleIds: readonly string[],
): string[] {
  return visibleIds.filter((id) => selected.has(id));
}

export function selectAllState(
  selected: ReadonlySet<string>,
  visibleIds: readonly string[],
): SelectAllState {
  const count = selectedVisibleIds(selected, visibleIds).length;
  if (count === 0) return false;
  return count === visibleIds.length ? true : "indeterminate";
}

export function toggleAllVisible(
  selected: ReadonlySet<string>,
  visibleIds: readonly string[],
): Set<string> {
  if (selectAllState(selected, visibleIds) === true) {
    return new Set();
  }
  return new Set(visibleIds);
}

export function toggleOne(
  selected: ReadonlySet<string>,
  id: string,
  checked: boolean,
): Set<string> {
  const next = new Set(selected);
  if (checked) next.add(id);
  else next.delete(id);
  return next;
}

export function selectionAfterDelete(failedIds: readonly string[]): Set<string> {
  return new Set(failedIds);
}
