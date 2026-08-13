import { Component, type ErrorInfo, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  title?: string
}

interface State {
  hasError: boolean
}

/**
 * Red de seguridad para errores de render no capturados. Sin esto, cualquier
 * excepción en un componente deja a la app entera en pantalla en blanco — con
 * un docente en plena clase, eso es lo peor que puede pasar. "Recargar" y
 * "Volver al Dashboard" fuerzan una navegación real del navegador (no de
 * React Router) para garantizar que el árbol roto se descarte por completo.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary capturó un error:', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-lg font-semibold">{this.props.title ?? 'Algo salió mal'}</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Ocurrió un error inesperado en esta pantalla. Intenta recargar la página; si el problema sigue, contacta al
          soporte.
        </p>
        <div className="flex gap-2">
          <Button onClick={() => window.location.reload()}>Recargar página</Button>
          <Button variant="outline" onClick={() => (window.location.href = '/dashboard')}>
            Volver al Dashboard
          </Button>
        </div>
      </div>
    )
  }
}
