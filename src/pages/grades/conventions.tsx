import { useLayoutEffect, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Settings2 } from 'lucide-react'

import { getConventionColor } from '@/utils/gradeHelpers'
import { conventionTitle, conventionValue } from '@/pages/grades/conventionHelpers'
import type { GradeConvention } from '@/types/grades'

/** Botones de convenciones (móvil y diálogos). onMouseDown evita que el input pierda el foco antes del clic. */
export function ConventionChips({
  conventions,
  onPick,
  disabled,
}: {
  conventions: GradeConvention[]
  onPick: (convention: GradeConvention) => void
  disabled?: boolean
}) {
  if (conventions.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {conventions.map((c) => (
        <button
          key={c.id}
          type="button"
          disabled={disabled}
          title={conventionTitle(c)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onPick(c)}
          className="min-w-[2.5rem] rounded-md border px-2 py-1 text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          {c.code}
        </button>
      ))}
    </div>
  )
}

/**
 * Menú flotante de convenciones bajo la celda que se está editando en la tabla.
 * Va en un portal con posición fija: dentro de la tabla (overflow-x-auto) quedaría
 * recortado en las últimas filas.
 */
export function ConventionPopover({
  anchorRef,
  conventions,
  onPick,
}: {
  anchorRef: RefObject<HTMLElement>
  conventions: GradeConvention[]
  onPick: (convention: GradeConvention) => void
}) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    const rect = anchorRef.current?.getBoundingClientRect()
    if (!rect) return
    const width = 224
    const estimatedHeight = Math.min(conventions.length * 32 + 8, 240)
    const below = rect.bottom + 4
    setPosition({
      top: below + estimatedHeight > window.innerHeight ? Math.max(8, rect.top - estimatedHeight - 4) : below,
      left: Math.min(rect.left, window.innerWidth - width - 8),
    })
  }, [anchorRef, conventions.length])

  if (conventions.length === 0 || !position) return null

  return createPortal(
    <div
      className="fixed z-50 max-h-60 w-56 overflow-y-auto rounded-md border bg-popover p-1 text-sm shadow-lg"
      style={{ top: position.top, left: position.left }}
    >
      {conventions.map((c) => {
        const value = conventionValue(c)
        return (
          <button
            key={c.id}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(c)}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-muted"
          >
            <span className="w-8 shrink-0 text-center font-semibold">{c.code}</span>
            <span className="flex-1 truncate">{c.label}</span>
            <span className="text-xs text-muted-foreground">{value !== null ? value.toFixed(1) : 'sin nota'}</span>
          </button>
        )
      })}
    </div>,
    document.body
  )
}

/** Leyenda sobre la planilla: cada convención con su significado y lo que vale. */
export function ConventionsLegend({
  conventions,
  minPassing,
  onManage,
}: {
  conventions: GradeConvention[]
  minPassing: number
  onManage?: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
      <span className="font-medium text-muted-foreground">Convenciones:</span>
      {conventions.length === 0 && (
        <span className="text-muted-foreground">ninguna todavía. Úsalas para marcar NP, NA, ✓…</span>
      )}
      {conventions.map((c) => {
        const value = conventionValue(c)
        const { background, text } = getConventionColor(value, minPassing)
        return (
          <span key={c.id} className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5">
            <span className="rounded px-1.5 font-semibold" style={{ backgroundColor: background, color: text }}>
              {c.code}
            </span>
            <span>{c.label}</span>
            <span className="text-xs text-muted-foreground">· {value !== null ? value.toFixed(1) : 'sin nota'}</span>
          </span>
        )
      })}
      {onManage && (
        <button
          type="button"
          onClick={onManage}
          className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-primary hover:bg-muted"
        >
          <Settings2 className="h-3.5 w-3.5" /> {conventions.length === 0 ? 'Configurar' : 'Editar'}
        </button>
      )}
    </div>
  )
}
