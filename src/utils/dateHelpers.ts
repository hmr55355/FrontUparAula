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

/**
 * Fechas con hora que el docente escribe (p. ej. la de una citación) se guardan
 * como "hora de pared": el backend corre en UTC y devuelve "…T10:00:00.000000Z"
 * para lo que se escribió como 10:00. Pasarlas por `new Date()` las correría a
 * la hora de Colombia (5:00). Estas funciones leen los dígitos tal cual.
 */
export function wallClockInputValue(value: string | null | undefined): string {
  return value ? value.replace(' ', 'T').slice(0, 16) : ''
}

export function formatWallClock(value: string | null | undefined): string {
  const input = wallClockInputValue(value)
  if (!input) return ''
  const [date, time = '00:00'] = input.split('T')
  const [year, month, day] = date.split('-').map(Number)
  const [hours, minutes] = time.split(':').map(Number)
  return new Date(year, month - 1, day, hours, minutes).toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
