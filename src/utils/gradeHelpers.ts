import type { PerformanceLevel } from '@/types'

export interface GradeColorResult {
  background: string
  text: string
}

/**
 * Escala de valoración de la institución activa. La fija AppLayout durante su
 * render (antes de pintar las páginas) a partir de `institutions/current`; así no
 * hay que pasarla a cada pantalla que colorea una nota.
 */
let currentScale: PerformanceLevel[] = []

export function setGradeScale(levels: PerformanceLevel[] | undefined) {
  currentScale = levels ?? []
}

export function getGradeScale(): PerformanceLevel[] {
  return currentScale
}

/** Nivel de la escala al que pertenece una nota (redondeada a un decimal, como se muestra). */
export function performanceLevelFor(
  score: number | null | undefined,
  levels: PerformanceLevel[] = currentScale
): PerformanceLevel | undefined {
  if (score === null || score === undefined) return undefined
  const rounded = Math.round(score * 10) / 10
  return levels.find((l) => rounded >= Number(l.min_score) && rounded <= Number(l.max_score))
}

/**
 * Fondo y texto a partir del color que la institución eligió para un nivel. Se
 * mezclan con variables del tema para que se lean en claro y en oscuro: fondo =
 * el color suave sobre la tarjeta; texto = el color oscurecido (claro) o aclarado
 * (oscuro).
 */
export function levelColors(color: string): GradeColorResult {
  return {
    background: `color-mix(in srgb, ${color} 22%, hsl(var(--card)))`,
    text: `color-mix(in srgb, ${color} 72%, var(--grade-level-text-mix))`,
  }
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
  // Con escala institucional configurada, el color es el de su nivel; si no, el
  // semáforo por nota mínima de siempre.
  const level = performanceLevelFor(score)
  if (level) {
    return levelColors(level.color)
  }
  if (score < minPassing) {
    return { background: 'var(--grade-fail-bg)', text: 'var(--grade-fail-text)' }
  }
  if (score < minPassing + 2) {
    return { background: 'var(--grade-warn-bg)', text: 'var(--grade-warn-text)' }
  }
  return { background: 'var(--grade-pass-bg)', text: 'var(--grade-pass-text)' }
}

/**
 * Color de una celda con convención. Si la convención vale nota, el del nivel de
 * esa nota. Si no tiene nota (no cuenta en el promedio), se ve como una celda
 * vacía, pero con el texto normal para que la abreviatura se lea bien.
 */
export function getConventionColor(value: number | null, minPassing: number): GradeColorResult {
  if (value === null) {
    return { background: 'var(--grade-empty-bg)', text: 'hsl(var(--foreground))' }
  }
  return getGradeColor(value, minPassing)
}
