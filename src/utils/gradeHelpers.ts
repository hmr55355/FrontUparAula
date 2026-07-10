export interface GradeColorResult {
  background: string
  text: string
}

/**
 * Centralized grade color-coding — use everywhere a score is rendered,
 * never hardcode grade colors inline (per UparAula design spec).
 */
export function getGradeColor(score: number | null | undefined, minPassing: number): GradeColorResult {
  if (score === null || score === undefined) {
    return { background: '#FFFFFF', text: '#9CA3AF' }
  }
  if (score < minPassing) {
    return { background: '#FFCDD2', text: '#C62828' }
  }
  if (score < minPassing + 1) {
    return { background: '#FFF9C4', text: '#F57C00' }
  }
  return { background: '#C8E6C9', text: '#2E7D32' }
}
