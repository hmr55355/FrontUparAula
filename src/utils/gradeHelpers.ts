export interface GradeColorResult {
  background: string
  text: string
}

/**
 * Centralized grade color-coding — use everywhere a score is rendered,
 * never hardcode grade colors inline (per UparAula design spec).
 * Los colores son variables CSS (definidas en index.css para claro y oscuro),
 * así el semáforo se adapta al tema sin que cada pantalla lo maneje.
 * Rojo: por debajo de la nota mínima. Amarillo: desde la mínima hasta
 * mínima + 2 (6.0–7.9 con mínima 6). Verde: desde mínima + 2.
 */
export function getGradeColor(score: number | null | undefined, minPassing: number): GradeColorResult {
  if (score === null || score === undefined) {
    return { background: 'var(--grade-empty-bg)', text: 'var(--grade-empty-text)' }
  }
  if (score < minPassing) {
    return { background: 'var(--grade-fail-bg)', text: 'var(--grade-fail-text)' }
  }
  if (score < minPassing + 2) {
    return { background: 'var(--grade-warn-bg)', text: 'var(--grade-warn-text)' }
  }
  return { background: 'var(--grade-pass-bg)', text: 'var(--grade-pass-text)' }
}

/** Color de una celda con convención: si la convención vale nota, el semáforo; si no, un tono neutro propio. */
export function getConventionColor(value: number | null, minPassing: number): GradeColorResult {
  if (value === null) {
    return { background: 'var(--grade-convention-bg)', text: 'var(--grade-convention-text)' }
  }
  return getGradeColor(value, minPassing)
}
