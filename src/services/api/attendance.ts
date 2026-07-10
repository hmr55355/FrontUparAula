import { api } from '@/services/api/client'
import type { AttendanceDayResponse, AttendanceRecord, AttendanceStatsRow, AttendanceStatus } from '@/types/attendance'

export interface AttendanceBulkRecord {
  student_id: number
  status: AttendanceStatus
  justification?: string
}

export const attendanceApi = {
  day: (groupSubjectId: number, date: string) =>
    api.get<AttendanceDayResponse>('/attendance', { params: { groupSubjectId, date } }).then((r) => r.data),

  range: (groupSubjectId: number, from: string, to: string) =>
    api
      .get<{ data: AttendanceRecord[] }>('/attendance', { params: { groupSubjectId, from, to } })
      .then((r) => r.data.data),

  bulkSave: (groupSubjectId: number, date: string, records: AttendanceBulkRecord[]) =>
    api
      .post<{ data: AttendanceRecord[]; count: number }>('/attendance/bulk', {
        group_subject_id: groupSubjectId,
        date,
        records,
      })
      .then((r) => r.data),

  stats: (groupSubjectId: number, periodId: number) =>
    api
      .get<{ data: AttendanceStatsRow[] }>('/attendance/stats', { params: { groupSubjectId, periodId } })
      .then((r) => r.data.data),
}
