/** Formatação para exibição no padrão brasileiro, sem depender de `Intl` do aparelho. */

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** `2026-10-14` → `14/10/2026`. */
export function formatDate(dateOnly: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : dateOnly;
}

/** Timestamp ISO 8601 → `14/10/2026 12:05` no horário local do aparelho. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
