/**
 * Fecha local en formato YYYY-MM-DD. No usar `toISOString().slice(0, 10)`:
 * eso da la fecha en UTC, y en Colombia (UTC-5) todo lo registrado después
 * de las 7 p. m. quedaría con la fecha del día siguiente.
 */
export function localDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Período cuyo rango de fechas contiene `date` (YYYY-MM-DD). Es el mismo criterio
 * que usa el backend para decidir a qué período afecta un registro de asistencia.
 */
export function periodForDate<T extends { start_date: string; end_date: string }>(
  periods: T[] | undefined,
  date: string
): T | undefined {
  return periods?.find((p) => p.start_date.slice(0, 10) <= date && date <= p.end_date.slice(0, 10))
}
