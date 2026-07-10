import type { AttendanceStatus } from '@/types/attendance'

export interface AttendanceColorResult {
  background: string
  text: string
}

/**
 * Centralized color-coding for attendance status — mirrors the pattern of
 * getGradeColor() in gradeHelpers.ts. Never hardcode these colors inline.
 */
export function getAttendanceColor(status: AttendanceStatus | null): AttendanceColorResult {
  switch (status) {
    case 'presente':
      return { background: '#C8E6C9', text: '#2E7D32' }
    case 'ausente_injustificado':
      return { background: '#FFCDD2', text: '#C62828' }
    case 'tarde':
      return { background: '#FFF9C4', text: '#F57C00' }
    case 'ausente_justificado':
      return { background: '#DCEDC8', text: '#33691E' }
    case 'retirado_temprano':
      return { background: '#E1BEE7', text: '#6A1B9A' }
    default:
      return { background: '#FFFFFF', text: '#9CA3AF' }
  }
}
