import type { AttendanceStatus } from '@/types/attendance'

export interface AttendanceColorResult {
  background: string
  text: string
}

/**
 * Centralized color-coding for attendance status — mirrors the pattern of
 * getGradeColor() in gradeHelpers.ts. Never hardcode these colors inline.
 * Variables CSS definidas en index.css para claro y oscuro.
 */
export function getAttendanceColor(status: AttendanceStatus | null): AttendanceColorResult {
  switch (status) {
    case 'presente':
      return { background: 'var(--grade-pass-bg)', text: 'var(--grade-pass-text)' }
    case 'ausente_injustificado':
      return { background: 'var(--grade-fail-bg)', text: 'var(--grade-fail-text)' }
    case 'tarde':
      return { background: 'var(--grade-warn-bg)', text: 'var(--grade-warn-text)' }
    case 'ausente_justificado':
      return { background: 'var(--att-justified-bg)', text: 'var(--att-justified-text)' }
    case 'retirado_temprano':
      return { background: 'var(--att-early-bg)', text: 'var(--att-early-text)' }
    default:
      return { background: 'var(--grade-empty-bg)', text: 'var(--grade-empty-text)' }
  }
}
