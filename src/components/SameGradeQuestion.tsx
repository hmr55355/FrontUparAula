export interface SameGradeOption {
  id: number
  label: string
  /** Si no se puede agregar ahí, el motivo (se muestra deshabilitado). */
  unavailable?: string
}

/**
 * Pregunta al guardar: "¿También en los otros cursos del grado?". Muestra cada curso
 * con su casilla; los que no se pueden elegir aparecen con el motivo.
 */
export function SameGradeQuestion({
  what,
  currentName,
  options,
  selected,
  onChange,
}: {
  /** "esta actividad", "este cobro"… */
  what: string
  currentName: string
  options: SameGradeOption[]
  selected: number[]
  onChange: (ids: number[]) => void
}) {
  const toggle = (id: number) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm">
        Se agregará en <strong>{currentName}</strong>. ¿Quieres agregar {what} también en tus otros cursos del mismo grado?
      </p>
      <div className="flex flex-col gap-1">
        {options.map((o) => (
          <label
            key={o.id}
            className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${o.unavailable ? 'opacity-60' : 'cursor-pointer hover:bg-muted'}`}
          >
            <input
              type="checkbox"
              className="h-4 w-4"
              disabled={!!o.unavailable}
              checked={selected.includes(o.id)}
              onChange={() => toggle(o.id)}
            />
            <span className="font-medium">{o.label}</span>
            {o.unavailable && <span className="text-xs text-muted-foreground">— {o.unavailable}</span>}
          </label>
        ))}
      </div>
    </div>
  )
}
