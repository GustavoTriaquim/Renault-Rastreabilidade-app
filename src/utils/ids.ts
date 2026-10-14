/** Próximo ID sequencial (`prefix-001`) a partir dos itens existentes. */
export function nextId(prefix: string, items: readonly { id: string }[]): string {
  let max = 0;
  for (const { id } of items) {
    if (!id.startsWith(`${prefix}-`)) continue;
    const suffix = Number(id.slice(prefix.length + 1));
    if (Number.isInteger(suffix) && suffix > max) max = suffix;
  }
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}
