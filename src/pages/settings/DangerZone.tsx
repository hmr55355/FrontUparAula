import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { authApi } from '@/services/api/auth'
import { useAuthStore } from '@/store/authStore'

export function DangerZone() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const [deleting, setDeleting] = useState(false)

  const deleteAccount = async () => {
    if (!window.confirm('¿Eliminar tu cuenta? Esta acción no se puede deshacer.')) return

    setDeleting(true)
    try {
      await authApi.deleteAccount()
      logout()
      navigate('/login')
      toast.success('Cuenta eliminada.')
    } catch {
      toast.error('No pudimos eliminar tu cuenta.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-destructive">Zona peligrosa</CardTitle>
        <CardDescription>Eliminar tu cuenta es permanente</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="destructive" onClick={deleteAccount} disabled={deleting}>
          {deleting ? 'Eliminando...' : 'Eliminar mi cuenta'}
        </Button>
      </CardContent>
    </Card>
  )
}
