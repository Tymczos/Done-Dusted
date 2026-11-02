export function moveShop<T extends { id: string; pinned: number }>(
  shops: T[],
  id: string,
  target: number,
): T[] {
  const from = shops.findIndex((s) => s.id === id);
  if (from < 0) return shops;
  const group = shops
    .map((s, i) => (s.pinned === shops[from]!.pinned ? i : -1))
    .filter((i) => i >= 0);
  const to = Math.max(group[0]!, Math.min(group[group.length - 1]!, target));
  const result = [...shops];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item!);
  return result;
}
