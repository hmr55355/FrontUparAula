import {
  BookOpen,
  Building2,
  CalendarClock,
  ClipboardCheck,
  FileBarChart,
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

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

/**
 * Fuente única de los módulos de la app — usada por el sidebar (AppLayout.tsx)
 * y por los accesos rápidos del Dashboard, para no duplicar la lista.
 */
export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/my-courses', label: 'Mis Cursos', icon: BookOpen },
  { to: '/schedule', label: 'Horario', icon: CalendarClock },
  { to: '/attendance', label: 'Asistencia', icon: ClipboardCheck },
  { to: '/behavior', label: 'Comportamiento', icon: MessageSquareWarning },
  { to: '/citations', label: 'Citaciones', icon: PhoneCall },
  { to: '/observations', label: 'Observaciones', icon: NotebookText },
  { to: '/homeworks', label: 'Tareas', icon: ListChecks },
  { to: '/plans', label: 'Planeación', icon: NotebookPen },
  { to: '/copies', label: 'Copias', icon: Wallet },
  { to: '/reports', label: 'Reportes', icon: FileBarChart },
  { to: '/institution/settings', label: 'Institución', icon: Building2 },
  { to: '/settings', label: 'Configuración', icon: Settings },
]
