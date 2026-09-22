import { useState } from 'react'
import { FileSpreadsheet, FileText, ClipboardList, Users, AlertTriangle, Receipt } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useEffectiveRole } from '@/hooks/useEffectiveRole'
import { GradeSheetReportDialog } from '@/pages/reports/GradeSheetReportDialog'
import { StudentBulletinReportDialog } from '@/pages/reports/StudentBulletinReportDialog'
import { AttendanceSheetReportDialog } from '@/pages/reports/AttendanceSheetReportDialog'
import { BehaviorCitationsReportDialog } from '@/pages/reports/BehaviorCitationsReportDialog'
import { AcademicRiskReportDialog } from '@/pages/reports/AcademicRiskReportDialog'
import { CopiesSummaryReportDialog } from '@/pages/reports/CopiesSummaryReportDialog'

type ReportCardKey = 'grade_sheet' | 'student_bulletin' | 'attendance_sheet' | 'behavior_citations' | 'academic_risk' | 'copies_summary'

// Qué reportes ve cada vista: los del aula en Docente, los institucionales en Administrador.
const CARDS: Array<{
  key: ReportCardKey
  title: string
  description: string
  icon: typeof FileSpreadsheet
  views: Array<'admin' | 'teacher'>
}> = [
  {
    key: 'grade_sheet',
    title: 'Planilla de calificaciones',
    description: 'Excel o PDF con todas las columnas, definitivas y color-coding del curso activo.',
    icon: FileSpreadsheet,
    views: ['teacher'],
  },
  {
    key: 'student_bulletin',
    title: 'Boletín individual',
    description: 'PDF con notas de todas las materias, asistencia, comportamiento y observaciones de un estudiante.',
    icon: FileText,
    views: ['admin', 'teacher'],
  },
  {
    key: 'attendance_sheet',
    title: 'Reporte de asistencia',
    description: 'Una columna por fecha, una fila por estudiante, del curso activo.',
    icon: ClipboardList,
    views: ['teacher'],
  },
  {
    key: 'behavior_citations',
    title: 'Comportamiento y citaciones',
    description: 'Listado de anotaciones y citaciones del grupo en un período.',
    icon: Users,
    views: ['admin', 'teacher'],
  },
  {
    key: 'academic_risk',
    title: 'Riesgo académico',
    description: 'Estudiantes de la institución con una definitiva por debajo de la nota mínima.',
    icon: AlertTriangle,
    views: ['admin'],
  },
  {
    key: 'copies_summary',
    title: 'Resumen general de copias',
    description: 'Tabla cruzada de todos los cobros del grupo/período con saldos por estudiante.',
    icon: Receipt,
    views: ['teacher'],
  },
]

export function Reports() {
  const [openDialog, setOpenDialog] = useState<ReportCardKey | null>(null)
  const view = useEffectiveRole() === 'admin' ? 'admin' : 'teacher'

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-xl font-semibold">Reportes</h1>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {CARDS.filter((card) => card.views.includes(view)).map(({ key, title, description, icon: Icon }) => (
          <Card key={key}>
            <CardContent className="flex flex-col gap-2 py-4">
              <Icon className="h-5 w-5 text-primary" />
              <span className="font-medium">{title}</span>
              <p className="text-sm text-muted-foreground">{description}</p>
              <Button size="sm" variant="outline" className="mt-1 w-fit" onClick={() => setOpenDialog(key)}>
                Generar
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <GradeSheetReportDialog open={openDialog === 'grade_sheet'} onOpenChange={(o) => setOpenDialog(o ? 'grade_sheet' : null)} />
      <StudentBulletinReportDialog
        open={openDialog === 'student_bulletin'}
        onOpenChange={(o) => setOpenDialog(o ? 'student_bulletin' : null)}
      />
      <AttendanceSheetReportDialog
        open={openDialog === 'attendance_sheet'}
        onOpenChange={(o) => setOpenDialog(o ? 'attendance_sheet' : null)}
      />
      <BehaviorCitationsReportDialog
        open={openDialog === 'behavior_citations'}
        onOpenChange={(o) => setOpenDialog(o ? 'behavior_citations' : null)}
      />
      <AcademicRiskReportDialog
        open={openDialog === 'academic_risk'}
        onOpenChange={(o) => setOpenDialog(o ? 'academic_risk' : null)}
      />
      <CopiesSummaryReportDialog
        open={openDialog === 'copies_summary'}
        onOpenChange={(o) => setOpenDialog(o ? 'copies_summary' : null)}
      />
    </div>
  )
}
