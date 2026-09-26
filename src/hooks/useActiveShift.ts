import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { groupSubjectsApi } from '@/services/api/groupSubjects'
import { scheduleApi } from '@/services/api/schedule'
import { academicStructureApi } from '@/services/api/academicStructure'
import { shiftsQueryKey } from '@/pages/institution/ShiftsPanel'
import { useCurrentInstitution } from '@/hooks/useCurrentInstitution'
import { useShiftStore } from '@/store/shiftStore'
import type { GroupSubject, Shift } from '@/types'
import type { ClassScheduleBlock } from '@/types/schedule'

function toMinutes(time: string) {
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))
}

/**
 * Jornada que corresponde al día y la hora, según el horario del docente:
 * 1. la de la clase en curso; 2. la de la próxima clase de hoy; 3. la de la
 * última clase de hoy (ya terminó la jornada, pero sigue siendo "la de hoy").
 * Si hoy no tiene clases en su horario, la jornada cuyos bloques cubren la hora
 * actual o empiezan después; si nada aplica, la primera.
 */
export function computeAutoShiftId(
  shifts: Shift[],
  entries: ClassScheduleBlock[],
  shiftOfCourse: Map<number, number>,
  now: Date
): number | null {
  if (shifts.length === 0) return null
  if (shifts.length === 1) return shifts[0].id

  const shiftIds = new Set(shifts.map((s) => s.id))
  const isoDay = now.getDay() === 0 ? 7 : now.getDay()
  const minutes = now.getHours() * 60 + now.getMinutes()

  const today = entries
    .map((e) => ({ entry: e, shiftId: shiftOfCourse.get(e.group_subject_id) }))
    .filter((x): x is { entry: ClassScheduleBlock; shiftId: number } => !!x.shiftId && shiftIds.has(x.shiftId))
    .filter((x) => x.entry.day_of_week === isoDay)
    .sort((a, b) => a.entry.start_time.localeCompare(b.entry.start_time))

  if (today.length > 0) {
    const current = today.find((x) => toMinutes(x.entry.start_time) <= minutes && minutes < toMinutes(x.entry.end_time))
    const next = today.find((x) => toMinutes(x.entry.start_time) > minutes)
    return (current ?? next ?? today[today.length - 1]).shiftId
  }

  const windows = shifts
    .map((s) => {
      const blocks = s.class_blocks ?? []
      if (blocks.length === 0) return null
      return {
        id: s.id,
        start: Math.min(...blocks.map((b) => toMinutes(b.start_time))),
        end: Math.max(...blocks.map((b) => toMinutes(b.end_time))),
      }
    })
    .filter((w): w is { id: number; start: number; end: number } => w !== null)
    .sort((a, b) => a.start - b.start)

  const inside = windows.find((w) => w.start <= minutes && minutes < w.end)
  const upcoming = windows.find((w) => w.start > minutes)
  return (inside ?? upcoming)?.id ?? shifts[0].id
}

/**
 * Jornada activa del docente. Sus jornadas salen de sus cursos (cada grupo tiene
 * jornada). Por defecto es la que corresponde al día y la hora; si el docente
 * elige otra, se respeta hasta que la automática cambie. Se reevalúa cada minuto.
 */
export function useActiveShift() {
  const { data: institution } = useCurrentInstitution()
  const { data: courses } = useQuery({ queryKey: ['group-subjects', 'mine'], queryFn: groupSubjectsApi.myCourses })
  const { data: allShifts } = useQuery({
    queryKey: shiftsQueryKey(institution?.id ?? 0),
    queryFn: () => academicStructureApi.shifts(institution!.id),
    enabled: !!institution,
    staleTime: 3 * 60 * 1000,
  })
  const { data: entries } = useQuery({ queryKey: ['schedule'], queryFn: () => scheduleApi.list() })
  const manual = useShiftStore((s) => s.manual)
  const chooseShift = useShiftStore((s) => s.chooseShift)
  const clearManualShift = useShiftStore((s) => s.clearManualShift)

  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])

  const shiftOfCourse = useMemo(() => {
    const map = new Map<number, number>()
    courses?.forEach((c) => {
      if (c.group?.shift_id) map.set(c.id, c.group.shift_id)
    })
    return map
  }, [courses])

  const teacherShifts = useMemo(() => {
    const ids = new Set(shiftOfCourse.values())
    return (allShifts ?? []).filter((s) => ids.has(s.id))
  }, [allShifts, shiftOfCourse])

  const autoShiftId = useMemo(
    () => computeAutoShiftId(teacherShifts, entries ?? [], shiftOfCourse, now),
    [teacherShifts, entries, shiftOfCourse, now]
  )

  const manualApplies =
    !!manual && manual.autoShiftId === autoShiftId && teacherShifts.some((s) => s.id === manual.shiftId)
  const activeShiftId = manual && manualApplies ? manual.shiftId : autoShiftId
  const activeShift = teacherShifts.find((s) => s.id === activeShiftId) ?? null

  // Cursos de la jornada activa. Los de grupos sin jornada se muestran siempre.
  const coursesInShift = useMemo<GroupSubject[] | undefined>(() => {
    if (!courses) return undefined
    if (teacherShifts.length <= 1 || activeShiftId === null) return courses
    return courses.filter((c) => !c.group?.shift_id || c.group.shift_id === activeShiftId)
  }, [courses, teacherShifts.length, activeShiftId])

  const setShift = useCallback(
    (shiftId: number) => {
      if (shiftId === autoShiftId) clearManualShift()
      else chooseShift(shiftId, autoShiftId)
    },
    [autoShiftId, chooseShift, clearManualShift]
  )

  return {
    teacherShifts,
    activeShift,
    activeShiftId,
    autoShiftId,
    isManual: !!manual && manualApplies && manual.shiftId !== autoShiftId,
    setShift,
    courses,
    coursesInShift,
    shiftOfCourse,
  }
}
