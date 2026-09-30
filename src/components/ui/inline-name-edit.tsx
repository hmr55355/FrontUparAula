import { useState } from 'react'
import { Check, Pencil, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/** Nombre con lápiz para editarlo en el sitio (Enter guarda, Escape cancela). */
export function InlineNameEdit({
  value,
  onSave,
  disabled,
}: {
  value: string
  onSave: (value: string) => void
  disabled?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  if (!editing) {
    return (
      <span className="inline-flex items-center gap-1">
        {value}
        <button
          type="button"
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={() => {
            setDraft(value)
            setEditing(true)
          }}
          aria-label="Cambiar nombre"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </span>
    )
  }

  const save = () => {
    const name = draft.trim()
    setEditing(false)
    if (name && name !== value) onSave(name)
  }

  return (
    <span className="inline-flex items-center gap-1">
      <Input
        autoFocus
        className="h-8 w-28"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save()
          if (e.key === 'Escape') setEditing(false)
        }}
      />
      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={disabled || !draft.trim()} onClick={save} aria-label="Guardar nombre">
        <Check className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(false)} aria-label="Cancelar">
        <X className="h-4 w-4" />
      </Button>
    </span>
  )
}
