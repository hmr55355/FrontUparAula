import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { homeworksApi } from '@/services/api/homeworks'
import { DELIVERY_CYCLE, DELIVERY_LABELS } from '@/types/homeworks'
import type { DeliveryStatus } from '@/types/homeworks'

function deliveryColor(status: DeliveryStatus | null) {
  switch (status) {
    case 'entregado':
      return { background: '#C8E6C9', text: '#2E7D32' }
    case 'entregado_tarde':
      return { background: '#FFF9C4', text: '#F57C00' }
    case 'no_entregado':
      return { background: '#FFCDD2', text: '#C62828' }
    case 'excusado':
      return { background: '#DCEDC8', text: '#33691E' }
    default:
      return { background: '#FFFFFF', text: '#9CA3AF' }
  }
}

export function HomeworkDeliveries() {
  const { homeworkId } = useParams<{ homeworkId: string }>()
  const id = Number(homeworkId)
  const queryClient = useQueryClient()

  const [statuses, setStatuses] = useState<Record<number, DeliveryStatus | null>>({})
  const [scores, setScores] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['homework-deliveries', id],
    queryFn: () => homeworksApi.deliveries(id),
    enabled: !!id,
  })

  useEffect(() => {
    if (!data) return
    const initialStatuses: Record<number, DeliveryStatus | null> = {}
    const initialScores: Record<number, string> = {}
    data.students.forEach((s) => {
      const delivery = data.deliveries[s.id]
      initialStatuses[s.id] = delivery?.status ?? null
      initialScores[s.id] = delivery?.score !== null && delivery?.score !== undefined ? String(delivery.score) : ''
    })
    setStatuses(initialStatuses)
    setScores(initialScores)
  }, [data])

  const cycleStatus = (studentId: number) => {
    setStatuses((prev) => {
      const current = prev[studentId] ?? null
      const currentIndex = DELIVERY_CYCLE.indexOf(current)
      const next = DELIVERY_CYCLE[(currentIndex + 1) % DELIVERY_CYCLE.length]
      return { ...prev, [studentId]: next }
    })
  }

  const save = async () => {
    if (!data) return
    const deliveries = data.students
      .filter((s) => statuses[s.id] !== null && statuses[s.id] !== undefined)
      .map((s) => ({
        student_id: s.id,
        status: statuses[s.id] as DeliveryStatus,
        score: scores[s.id] ? Number(scores[s.id]) : null,
      }))

    if (deliveries.length === 0) {
      toast.error('Registra al menos un estudiante.')
      return
    }

    setSaving(true)
    try {
      await homeworksApi.bulkDeliveries(id, deliveries)
      toast.success(`Entregas guardadas (${deliveries.length} estudiantes).`)
      queryClient.invalidateQueries({ queryKey: ['homework-deliveries', id] })
    } catch {
      toast.error('No pudimos guardar las entregas.')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Cargando tarea...</p>
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <Link to="/homeworks" className="flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Volver a tareas
        </Link>
        <h1 className="mt-1 text-xl font-semibold">{data.homework.title}</h1>
        <p className="text-sm text-muted-foreground">
          Entrega: {data.homework.due_date.slice(0, 10)}
          {data.homework.is_graded && ` · Máximo ${data.homework.max_score}`}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {data.students.map((student) => {
          const status = statuses[student.id] ?? null
          const { background, text } = deliveryColor(status)
          return (
            <Card key={student.id}>
              <CardContent className="flex flex-col gap-2 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">
                    {student.last_name} {student.first_name}
                  </span>
                  <button
                    onClick={() => cycleStatus(student.id)}
                    className="min-w-[160px] rounded-md px-3 py-2 text-sm font-semibold"
                    style={{ backgroundColor: background, color: text }}
                  >
                    {status ? DELIVERY_LABELS[status] : '⚪ Sin registrar'}
                  </button>
                </div>
                {data.homework.is_graded && (
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Nota (opcional)"
                    value={scores[student.id] ?? ''}
                    onChange={(e) => setScores((prev) => ({ ...prev, [student.id]: e.target.value }))}
                  />
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Button size="lg" onClick={save} disabled={saving} className="w-full">
        {saving ? 'Guardando...' : 'Guardar entregas'}
      </Button>
    </div>
  )
}
