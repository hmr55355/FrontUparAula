import { Link } from 'react-router-dom'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useEffectiveRole } from '@/hooks/useEffectiveRole'
import { AcademicYearSettings } from '@/pages/settings/AcademicYearSettings'
import { NotificationPreferences } from '@/pages/settings/NotificationPreferences'
import { ImportExport } from '@/pages/settings/ImportExport'
import { DangerZone } from '@/pages/settings/DangerZone'

export function Configuracion() {
  const isAdmin = useEffectiveRole() === 'admin'

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-xl font-semibold">Configuración</h1>

      <Tabs defaultValue="perfil">
        <TabsList className="h-auto flex-wrap gap-1">
          <TabsTrigger value="perfil">Perfil</TabsTrigger>
          {isAdmin && <TabsTrigger value="institucion">Institución</TabsTrigger>}
          {isAdmin && <TabsTrigger value="anio-escolar">Año escolar</TabsTrigger>}
          <TabsTrigger value="notificaciones">Notificaciones</TabsTrigger>
          {isAdmin && <TabsTrigger value="importar-exportar">Importar/Exportar</TabsTrigger>}
          <TabsTrigger value="zona-peligrosa">Zona peligrosa</TabsTrigger>
        </TabsList>

        <TabsContent value="perfil" className="flex flex-col gap-3">
          <Card>
            <CardHeader>
              <CardTitle>Mi perfil</CardTitle>
              <CardDescription>Nombre, foto y teléfono</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild>
                <Link to="/profile">Editar mi perfil →</Link>
              </Button>
            </CardContent>
          </Card>
          {!isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>Mi horario de clases</CardTitle>
                <CardDescription>Acceso directo al módulo de horario</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild>
                  <Link to="/schedule">Ver mi horario →</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="institucion">
            <Card>
              <CardHeader>
                <CardTitle>Institución, grupos y materias</CardTitle>
                <CardDescription>
                  Nombre, logo, escala de calificación, nota mínima, docentes, grupos y materias
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild>
                  <Link to="/institution/settings">Administrar institución →</Link>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="anio-escolar">
            <AcademicYearSettings />
          </TabsContent>
        )}

        <TabsContent value="notificaciones">
          <NotificationPreferences />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="importar-exportar">
            <ImportExport />
          </TabsContent>
        )}

        <TabsContent value="zona-peligrosa">
          <DangerZone />
        </TabsContent>
      </Tabs>
    </div>
  )
}
