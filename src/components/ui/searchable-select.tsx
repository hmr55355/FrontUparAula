import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface SearchableSelectOption {
  id: number
  label: string
}

/**
 * Selector con búsqueda para listas con muchas opciones (estudiantes de un
 * grupo, grupos de una institución, etc.) — un docente puede tener cientos de
 * estudiantes en total, y desplazarse por un <select> plano no escala. Mismo
 * patrón de dropdown manual ya usado en el proyecto (selector de curso del
 * encabezado en AppLayout.tsx, NotificationBell.tsx): useState abre/cierra +
 * backdrop de clic-afuera, sin librería nueva. Filtrado en el cliente — cada
 * selector sigue acotado a un solo grupo/institución, nunca a cientos de golpe.
 */
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Selecciona...',
  disabled = false,
  emptyMessage = 'Sin resultados.',
}: {
  value: number | ''
  onChange: (id: number) => void
  options: SearchableSelectOption[]
  placeholder?: string
  disabled?: boolean
  emptyMessage?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selected = options.find((o) => o.id === value)
  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex h-12 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={cn('truncate', !selected && 'text-muted-foreground')}>{selected?.label ?? placeholder}</span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </button>

      {open && !disabled && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar..."
              className="w-full border-b bg-transparent px-3 py-2 text-sm outline-none"
            />
            <div className="max-h-60 overflow-y-auto p-1">
              {filtered.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">{emptyMessage}</p>}
              {filtered.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    onChange(o.id)
                    setOpen(false)
                    setQuery('')
                  }}
                  className={cn(
                    'flex w-full items-center rounded px-3 py-2 text-left text-sm hover:bg-muted',
                    o.id === value && 'bg-primary/10 font-medium'
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
