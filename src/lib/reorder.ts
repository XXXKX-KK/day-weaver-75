/**
 * Reorder a list of rows to match an explicit id order, stamping each row's
 * `position` with its new index. Rows whose id isn't in `orderedIds` keep their
 * relative order and are appended after. Shared by the tasks / routines / day
 * drag-and-drop reorder mutations for optimistic cache updates.
 */
export function reorderByIds<T extends { id: string; position: number | null }>(
  rows: T[],
  orderedIds: string[],
): T[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const out: T[] = [];
  orderedIds.forEach((id, index) => {
    const row = byId.get(id);
    if (row) {
      out.push({ ...row, position: index });
      byId.delete(id);
    }
  });
  // Anything not covered by orderedIds keeps its original order, after.
  for (const row of rows) {
    if (byId.has(row.id)) out.push(row);
  }
  return out;
}
