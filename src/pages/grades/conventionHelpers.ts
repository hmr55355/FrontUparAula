import { getConventionColor, getGradeColor, type GradeColorResult } from '@/utils/gradeHelpers'
import type { Grade, GradeConvention } from '@/types/grades'

/** Lo que se guarda en una celda: una nota numérica o una convención (NP, ✓…). */
export interface GradeInput {
  score: number | null
  conventionId: number | null
}

export type ParsedGradeInput =
  | { kind: 'empty' }
  | { kind: 'score'; value: number }
  | { kind: 'convention'; convention: GradeConvention }
  | { kind: 'invalid' }

export function conventionValue(convention: GradeConvention): number | null {
  return convention.value === null ? null : Number(convention.value)
}

/**
 * Interpreta lo que el docente escribió en una celda: vacío, una nota (acepta
 * coma decimal) o la abreviatura de una convención. La abreviatura se busca
 * exacta y, si no, sin distinguir mayúsculas ("np" = "NP").
 */
export function parseGradeInput(text: string, conventions: GradeConvention[]): ParsedGradeInput {
  const trimmed = text.trim()
  if (trimmed === '') return { kind: 'empty' }

  const convention =
    conventions.find((c) => c.code === trimmed) ??
    conventions.find((c) => c.code.toLowerCase() === trimmed.toLowerCase())
  if (convention) return { kind: 'convention', convention }

  const value = Number(trimmed.replace(',', '.'))
  return Number.isNaN(value) ? { kind: 'invalid' } : { kind: 'score', value }
}

export function inputFromConvention(convention: GradeConvention): GradeInput {
  return { score: conventionValue(convention), conventionId: convention.id }
}

/** Texto y colores de una celda de nota, con o sin convención. */
export function gradeCellDisplay(
  grade: Pick<Grade, 'score' | 'convention_id'> | undefined,
  conventions: GradeConvention[],
  minPassing: number
): { content: string; numeric: number | null; convention?: GradeConvention; colors: GradeColorResult } {
  const numeric = grade?.score === null || grade?.score === undefined ? null : Number(grade.score)
  const convention = grade?.convention_id ? conventions.find((c) => c.id === grade.convention_id) : undefined

  if (convention) {
    return { content: convention.code, numeric, convention, colors: getConventionColor(numeric, minPassing) }
  }
  return {
    content: numeric !== null ? numeric.toFixed(1) : '—',
    numeric,
    colors: getGradeColor(numeric, minPassing),
  }
}

export function conventionTitle(convention: GradeConvention) {
  const value = conventionValue(convention)
  return `${convention.label} — ${value !== null ? `vale ${value.toFixed(1)}` : 'sin nota'}`
}
