import {
  BookOpen,
  Building2,
  CalendarClock,
  ClipboardCheck,
  FileBarChart,
  Hand,
  UserCog,
  ListChecks,
  MessageSquareWarning,
  NotebookPen,
  NotebookText,
  PhoneCall,
  Settings,
  Wallet,
  LayoutDashboard,
  type LucideIcon,
} from 'lucide-react'

/** A quién se le muestra el módulo según la vista (Administrador / Docente). */
export type NavAudience = 'teacher' | 'admin' | 'both'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  audience: NavAudience
}

/**
 * Fuente única de los módulos de la app — usada por el sidebar (AppLayout.tsx)
 * y por los accesos rápidos del Dashboard, para no duplicar la lista.
 */
export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Inicio', icon: LayoutDashboard, audience: 'both' },
  { to: '/my-courses', label: 'Mis Cursos', icon: BookOpen, audience: 'teacher' },
  { to: '/schedule', label: 'Horario', icon: CalendarClock, audience: 'teacher' },
  { to: '/attendance', label: 'Asistencia', icon: ClipboardCheck, audience: 'teacher' },
  { to: '/participations', label: 'Participación', icon: Hand, audience: 'teacher' },
  { to: '/behavior', label: 'Comportamiento', icon: MessageSquareWarning, audience: 'teacher' },
  { to: '/citations', label: 'Citaciones', icon: PhoneCall, audience: 'teacher' },
  { to: '/observations', label: 'Observaciones', icon: NotebookText, audience: 'teacher' },
  { to: '/homeworks', label: 'Tareas', icon: ListChecks, audience: 'teacher' },
  { to: '/plans', label: 'Planeación', icon: NotebookPen, audience: 'teacher' },
  { to: '/copies', label: 'Copias', icon: Wallet, audience: 'teacher' },
  { to: '/monitors', label: 'Monitores', icon: UserCog, audience: 'teacher' },
  { to: '/reports', label: 'Reportes', icon: FileBarChart, audience: 'both' },
  { to: '/institution/settings', label: 'Institución', icon: Building2, audience: 'admin' },
  { to: '/settings', label: 'Configuración', icon: Settings, audience: 'both' },
]

/**
 * Separación total de vistas: en "Administrador" solo lo institucional, en
 * "Docente" solo lo del aula. Los módulos 'both' (Inicio, Reportes,
 * Configuración) muestran contenido distinto según la vista.
 */
export function navItemsFor(role: 'admin' | 'teacher' | undefined): NavItem[] {
  const view = role === 'admin' ? 'admin' : 'teacher'
  return NAV_ITEMS.filter((item) => item.audience === 'both' || item.audience === view)
}
