export function updateById<T extends { id: string }>(
  items: T[],
  id: string,
  patch: Partial<T> | ((item: T) => T),
): T[] {
  const apply = typeof patch === 'function' ? patch : (item: T) => ({ ...item, ...patch });
  return items.map((item) => (item.id === id ? apply(item) : item));
}

export function removeById<T extends { id: string }>(items: T[], id: string): T[] {
  return items.filter((item) => item.id !== id);
}
